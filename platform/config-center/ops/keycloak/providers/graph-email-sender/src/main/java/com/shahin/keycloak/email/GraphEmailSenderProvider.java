/*
 * Shahin-AI — Keycloak EmailSenderProvider that sends via Microsoft Graph.
 *
 * Replaces Keycloak's built-in SMTP sender. All outbound realm mail
 * (verify-email, reset-password, executeActionsEmail, etc.) is delivered
 * via Microsoft Graph /users/{from}/sendMail using OAuth2 client-credentials
 * against the Shahin Azure AD app registration.
 *
 * No SMTP client, no SMTP bridge, no SMTP credentials anywhere.
 *
 * Configuration — read from process environment (set in /etc/keycloak/keycloak.env):
 *   AZURE_TENANT_ID           Azure AD tenant GUID
 *   AZURE_CLIENT_ID           App registration client id
 *   AZURE_CLIENT_SECRET       App registration client secret (Mail.Send granted)
 *   GRAPH_API_ENDPOINT        (optional) default https://graph.microsoft.com/v1.0
 *   SHAHIN_GRAPH_SENDER       (optional) default info@shahin-ai.com
 *
 * The realm's SMTP "from" field, if set, wins over SHAHIN_GRAPH_SENDER —
 * but the sender mailbox must be on the allow-list. Any other value is
 * silently pinned to SHAHIN_GRAPH_SENDER, preventing a misconfigured
 * realm from impersonating an arbitrary tenant user.
 */
package com.shahin.keycloak.email;

import java.io.InputStream;
import java.io.IOException;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.Base64;
import java.util.Map;
import java.util.Set;
import java.util.logging.Level;
import java.util.logging.Logger;

import org.keycloak.email.EmailException;
import org.keycloak.email.EmailSenderProvider;

public class GraphEmailSenderProvider implements EmailSenderProvider {

    private static final Logger LOG = Logger.getLogger(GraphEmailSenderProvider.class.getName());

    private static final Set<String> ALLOWED_SENDERS = Set.of(
        "info@shahin-ai.com",
        "info@doganconsult.com"
    );

    private static final String DEFAULT_SENDER = envOrDefault("SHAHIN_GRAPH_SENDER", "info@shahin-ai.com");
    private static final String GRAPH_ENDPOINT = envOrDefault("GRAPH_API_ENDPOINT", "https://graph.microsoft.com/v1.0");
    private static final String TENANT_ID      = System.getenv("AZURE_TENANT_ID");
    private static final String CLIENT_ID      = System.getenv("AZURE_CLIENT_ID");
    private static final String CLIENT_SECRET  = System.getenv("AZURE_CLIENT_SECRET");

    /** Short-lived token cache, shared across calls on the same instance. */
    private static volatile String cachedToken;
    private static volatile long   cachedTokenExpiresAtMs;

    /**
     * Known inline-image attachments that the email templates can reference
     * via `<img src="cid:<key>">`. If the HTML body references one of these,
     * the provider attaches it to the Graph sendMail call with isInline=true.
     * The image bytes are bundled inside the provider JAR under
     * `com/shahin/keycloak/email/<filename>`.
     */
    private static final Map<String, String[]> INLINE_IMAGES = Map.of(
        // key -> [filename in classpath, MIME type]
        "shahin-falcon@shahin-ai.com", new String[] { "shahin-falcon.png", "image/png" }
    );

    /** Base64-encoded image cache (one-time per JVM, images never change). */
    private static final java.util.concurrent.ConcurrentMap<String, String> IMAGE_B64_CACHE =
        new java.util.concurrent.ConcurrentHashMap<>();

    private final HttpClient http = HttpClient.newBuilder()
        .connectTimeout(Duration.ofSeconds(10))
        .version(HttpClient.Version.HTTP_2)
        .build();

    @Override
    public void validate(Map<String, String> config) throws EmailException {
        if (TENANT_ID == null || TENANT_ID.isBlank()
            || CLIENT_ID == null || CLIENT_ID.isBlank()
            || CLIENT_SECRET == null || CLIENT_SECRET.isBlank()) {
            throw new EmailException(
                "Graph email sender is missing AZURE_TENANT_ID / AZURE_CLIENT_ID / AZURE_CLIENT_SECRET"
                + " in the Keycloak process environment."
            );
        }
    }

    @Override
    public void send(Map<String, String> config,
                     String address,
                     String subject,
                     String textBody,
                     String htmlBody) throws EmailException {
        validate(config);

        final String fromRaw = config != null ? config.getOrDefault("from", DEFAULT_SENDER) : DEFAULT_SENDER;
        final String from = pickSender(fromRaw);
        final String replyTo = config != null ? config.getOrDefault("replyTo", null) : null;
        final String fromDisplay = config != null ? config.getOrDefault("fromDisplayName", null) : null;

        try {
            final String token = acquireToken();
            final String body = buildSendMailBody(from, fromDisplay, address, replyTo, subject, textBody, htmlBody);
            final String url = GRAPH_ENDPOINT + "/users/" + URLEncoder.encode(from, StandardCharsets.UTF_8) + "/sendMail";

            HttpRequest req = HttpRequest.newBuilder()
                .uri(URI.create(url))
                .timeout(Duration.ofSeconds(15))
                .header("Authorization", "Bearer " + token)
                .header("Content-Type", "application/json; charset=utf-8")
                .POST(HttpRequest.BodyPublishers.ofString(body, StandardCharsets.UTF_8))
                .build();

            HttpResponse<String> resp = http.send(req, HttpResponse.BodyHandlers.ofString());

            if (resp.statusCode() != 202 && (resp.statusCode() < 200 || resp.statusCode() >= 300)) {
                String snippet = resp.body() == null ? "" : resp.body().substring(0, Math.min(300, resp.body().length()));
                throw new EmailException(
                    "Graph sendMail HTTP " + resp.statusCode() + ": " + snippet
                );
            }

            LOG.log(Level.INFO, "[graph-email] sent to={0} subject=\"{1}\" from={2}",
                new Object[] { address, subject, from });

        } catch (EmailException e) {
            throw e;
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new EmailException("Interrupted while sending via Microsoft Graph", e);
        } catch (Exception e) {
            throw new EmailException("Graph sendMail failed: " + e.getMessage(), e);
        }
    }

    @Override
    public void close() {
        // HttpClient doesn't require explicit close.
    }

    // ── Internals ──────────────────────────────────────────────────────

    private static String pickSender(String proposed) {
        if (proposed == null) return DEFAULT_SENDER;
        String p = proposed.trim().toLowerCase();
        // Strip "Name <addr@x>" → "addr@x"
        int lt = p.indexOf('<');
        int gt = p.indexOf('>');
        if (lt >= 0 && gt > lt) p = p.substring(lt + 1, gt).trim();
        return ALLOWED_SENDERS.contains(p) ? p : DEFAULT_SENDER;
    }

    private synchronized String acquireToken() throws Exception {
        final long now = System.currentTimeMillis();
        if (cachedToken != null && now < cachedTokenExpiresAtMs - 60_000) {
            return cachedToken;
        }

        final String tokenUrl = "https://login.microsoftonline.com/" + TENANT_ID + "/oauth2/v2.0/token";
        final String body =
            "client_id=" + URLEncoder.encode(CLIENT_ID, StandardCharsets.UTF_8)
          + "&client_secret=" + URLEncoder.encode(CLIENT_SECRET, StandardCharsets.UTF_8)
          + "&scope=" + URLEncoder.encode("https://graph.microsoft.com/.default", StandardCharsets.UTF_8)
          + "&grant_type=client_credentials";

        HttpRequest req = HttpRequest.newBuilder()
            .uri(URI.create(tokenUrl))
            .timeout(Duration.ofSeconds(10))
            .header("Content-Type", "application/x-www-form-urlencoded")
            .POST(HttpRequest.BodyPublishers.ofString(body, StandardCharsets.UTF_8))
            .build();

        HttpResponse<String> resp = http.send(req, HttpResponse.BodyHandlers.ofString());
        if (resp.statusCode() < 200 || resp.statusCode() >= 300) {
            throw new IllegalStateException("Graph token HTTP " + resp.statusCode() + ": "
                + resp.body().substring(0, Math.min(200, resp.body().length())));
        }

        String respBody = resp.body();
        String token   = extractJsonString(respBody, "access_token");
        long  expiresIn = extractJsonLong(respBody, "expires_in", 3600);

        cachedToken = token;
        cachedTokenExpiresAtMs = System.currentTimeMillis() + (expiresIn * 1000L);
        LOG.log(Level.INFO, "[graph-email] token refreshed, expires in {0}s", expiresIn);
        return token;
    }

    /**
     * Build the Graph sendMail JSON payload.
     * Values are JSON-escaped inline without a JSON lib dependency so the
     * provider JAR stays self-contained.
     *
     * Inline images: if the HTML body references any `cid:<key>` where
     * `<key>` is a member of INLINE_IMAGES, the corresponding image is
     * attached as a Graph fileAttachment with isInline=true. Outlook,
     * Apple Mail, and Gmail all render `cid:` references against these
     * attachments reliably — unlike remote `https://` logos (blocked by
     * default) or base64 data URIs (blocked by Outlook desktop).
     */
    private static String buildSendMailBody(String from,
                                            String fromDisplay,
                                            String to,
                                            String replyTo,
                                            String subject,
                                            String textBody,
                                            String htmlBody) {
        String contentType = (htmlBody != null && !htmlBody.isEmpty()) ? "HTML" : "Text";
        String content     = (htmlBody != null && !htmlBody.isEmpty()) ? htmlBody
                           : (textBody != null ? textBody : "");
        StringBuilder sb = new StringBuilder(256 + content.length());
        sb.append('{').append("\"message\":{")
          .append("\"subject\":\"").append(jsonEscape(subject == null ? "" : subject)).append('"')
          .append(",\"body\":{")
          .append("\"contentType\":\"").append(contentType).append('"')
          .append(",\"content\":\"").append(jsonEscape(content)).append('"')
          .append('}')
          .append(",\"toRecipients\":[{\"emailAddress\":{\"address\":\"")
          .append(jsonEscape(to)).append("\"}}]")
          .append(",\"from\":{\"emailAddress\":{");
        if (fromDisplay != null && !fromDisplay.isEmpty()) {
            sb.append("\"name\":\"").append(jsonEscape(fromDisplay)).append("\",");
        }
        sb.append("\"address\":\"").append(jsonEscape(from)).append("\"}}");
        if (replyTo != null && !replyTo.isEmpty()) {
            sb.append(",\"replyTo\":[{\"emailAddress\":{\"address\":\"")
              .append(jsonEscape(replyTo)).append("\"}}]");
        }

        // Attach any bundled inline images referenced by the body.
        String attachments = buildInlineAttachments(content);
        if (!attachments.isEmpty()) {
            sb.append(",\"attachments\":[").append(attachments).append(']');
        }

        sb.append('}').append(",\"saveToSentItems\":true").append('}');
        return sb.toString();
    }

    /**
     * Scan the HTML body for `cid:<key>` references that match known
     * INLINE_IMAGES entries and emit the matching Graph fileAttachment
     * JSON. Returns an empty string if no matches — the caller omits the
     * `attachments` key entirely so the Graph payload stays minimal for
     * plain-text emails.
     */
    private static String buildInlineAttachments(String htmlBody) {
        if (htmlBody == null || htmlBody.isEmpty()) return "";
        StringBuilder out = new StringBuilder();
        boolean first = true;
        for (Map.Entry<String, String[]> e : INLINE_IMAGES.entrySet()) {
            String cid = e.getKey();
            if (!htmlBody.contains("cid:" + cid)) continue;
            String filename = e.getValue()[0];
            String mimeType = e.getValue()[1];
            String b64 = loadInlineImageBase64(filename);
            if (b64 == null) continue;
            if (!first) out.append(',');
            first = false;
            out.append('{')
               .append("\"@odata.type\":\"#microsoft.graph.fileAttachment\",")
               .append("\"name\":\"").append(jsonEscape(filename)).append("\",")
               .append("\"contentId\":\"").append(jsonEscape(cid)).append("\",")
               .append("\"contentType\":\"").append(mimeType).append("\",")
               .append("\"isInline\":true,")
               .append("\"contentBytes\":\"").append(b64).append('"')
               .append('}');
        }
        return out.toString();
    }

    private static String loadInlineImageBase64(String filename) {
        String cached = IMAGE_B64_CACHE.get(filename);
        if (cached != null) return cached;
        try (InputStream in = GraphEmailSenderProvider.class.getResourceAsStream(filename)) {
            if (in == null) {
                LOG.log(Level.WARNING, "[graph-email] inline image not found in classpath: {0}", filename);
                return null;
            }
            byte[] bytes = in.readAllBytes();
            String b64 = Base64.getEncoder().encodeToString(bytes);
            IMAGE_B64_CACHE.put(filename, b64);
            return b64;
        } catch (IOException ioe) {
            LOG.log(Level.WARNING, "[graph-email] failed to read inline image " + filename, ioe);
            return null;
        }
    }

    private static String jsonEscape(String s) {
        if (s == null) return "";
        StringBuilder out = new StringBuilder(s.length() + 8);
        for (int i = 0; i < s.length(); i++) {
            char c = s.charAt(i);
            switch (c) {
                case '"':  out.append("\\\""); break;
                case '\\': out.append("\\\\"); break;
                case '\b': out.append("\\b"); break;
                case '\f': out.append("\\f"); break;
                case '\n': out.append("\\n"); break;
                case '\r': out.append("\\r"); break;
                case '\t': out.append("\\t"); break;
                default:
                    if (c < 0x20) out.append(String.format("\\u%04x", (int) c));
                    else out.append(c);
            }
        }
        return out.toString();
    }

    // Minimal JSON scrapers — we only need two fields from the well-known
    // Azure token response shape, no need to pull in Jackson.
    private static String extractJsonString(String json, String key) {
        String needle = "\"" + key + "\"";
        int i = json.indexOf(needle);
        if (i < 0) throw new IllegalStateException("missing field: " + key);
        int colon = json.indexOf(':', i + needle.length());
        if (colon < 0) throw new IllegalStateException("malformed json for: " + key);
        int q1 = json.indexOf('"', colon + 1);
        if (q1 < 0) throw new IllegalStateException("missing string open for: " + key);
        StringBuilder sb = new StringBuilder();
        for (int p = q1 + 1; p < json.length(); p++) {
            char c = json.charAt(p);
            if (c == '\\' && p + 1 < json.length()) { sb.append(json.charAt(++p)); continue; }
            if (c == '"') return sb.toString();
            sb.append(c);
        }
        throw new IllegalStateException("unterminated string for: " + key);
    }

    private static long extractJsonLong(String json, String key, long fallback) {
        String needle = "\"" + key + "\"";
        int i = json.indexOf(needle);
        if (i < 0) return fallback;
        int colon = json.indexOf(':', i + needle.length());
        if (colon < 0) return fallback;
        int p = colon + 1;
        while (p < json.length() && Character.isWhitespace(json.charAt(p))) p++;
        int start = p;
        while (p < json.length() && (Character.isDigit(json.charAt(p)) || json.charAt(p) == '-')) p++;
        if (start == p) return fallback;
        try { return Long.parseLong(json.substring(start, p)); }
        catch (NumberFormatException e) { return fallback; }
    }

    private static String envOrDefault(String key, String fallback) {
        String v = System.getenv(key);
        return (v == null || v.isBlank()) ? fallback : v;
    }
}
