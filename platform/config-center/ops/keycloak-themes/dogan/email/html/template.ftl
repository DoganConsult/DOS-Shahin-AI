<#--
  Shahin-AI email layout. Single-slot macro (FreeMarker convention used
  by Keycloak's own email theme). The calling template injects everything
  via a single <#nested>; the preheader, page heading, body copy, and CTA
  are all part of that one block.

  The visual language mirrors the login page hero — navy gradient header,
  Carbon Blue primary CTA, Inter / IBM Plex Sans typography — so the email
  and the page the user is about to land on feel like one surface.

  Email clients ignore most modern CSS, so the layout is table-based
  with styles inlined and capped at 600px. Tested against Outlook 2016+,
  Gmail (web/iOS/Android), Apple Mail, Outlook.com.
-->
<#macro emailLayout>
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html lang="${locale.language}" dir="${(ltr)?then('ltr','rtl')}" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="x-apple-disable-message-reformatting" />
  <meta name="color-scheme" content="light" />
  <title>${msg("brandName","Shahin-AI")}</title>
  <!--[if mso]>
  <style type="text/css">table { border-collapse: collapse; } td { mso-line-height-rule: exactly; }</style>
  <![endif]-->
</head>
<body style="margin:0;padding:0;background-color:#f4f4f4;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;color:#161616;-webkit-text-size-adjust:100%;">

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#f4f4f4" style="background-color:#f4f4f4;">
  <tr>
    <td align="center" style="padding:32px 16px;">

      <!-- Outer card -->
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0"
             style="max-width:600px;width:100%;background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 8px 30px rgba(0,0,0,0.08);">

        <!-- Navy hero header — matches login page hero. Falcon is attached
             inline as a CID image by the Graph SPI (see INLINE_IMAGES in
             GraphEmailSenderProvider.java). CID-attached images render
             reliably in Outlook, Gmail, and Apple Mail without the
             "load remote content?" prompt that blocks hosted logos. -->
        <tr>
          <td align="center"
              style="background-color:#001d6c;background-image:linear-gradient(160deg,#041225 0%,#002d9c 30%,#0043ce 60%,#0f62fe 100%);padding:40px 32px 32px;text-align:center;">
            <img src="cid:shahin-falcon@shahin-ai.com"
                 alt="Shahin-AI"
                 width="84" height="84"
                 style="display:block;margin:0 auto 14px;border:0;outline:none;text-decoration:none;border-radius:50%;" />
            <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;font-size:28px;font-weight:700;color:#ffffff;letter-spacing:-0.02em;line-height:1.1;">
              Shahin<span style="color:#7dd3fc;">-AI</span>
            </div>
            <div style="font-family:-apple-system,'Segoe UI',Roboto,Arial,sans-serif;font-size:12px;font-weight:500;color:rgba(255,255,255,0.72);letter-spacing:0.08em;text-transform:uppercase;margin-top:6px;">
              AI-powered governance, risk &amp; compliance
            </div>
          </td>
        </tr>

        <!-- Body (injected) -->
        <tr>
          <td style="padding:36px 40px 24px;font-family:-apple-system,'Segoe UI',Roboto,Arial,sans-serif;font-size:15px;line-height:1.65;color:#262626;">
            <#nested>
          </td>
        </tr>

        <!-- Security note -->
        <tr>
          <td style="padding:8px 40px 18px;">
            <div style="border-top:1px solid #e0e0e0;font-size:0;line-height:0;">&nbsp;</div>
          </td>
        </tr>
        <tr>
          <td style="padding:0 40px 6px;font-family:-apple-system,'Segoe UI',Roboto,Arial,sans-serif;font-size:12.5px;line-height:1.6;color:#6f6f6f;">
            <strong style="color:#262626;">Security tip:</strong>
            Shahin-AI will never ask for your password by email.
            If you did not expect this message, ignore it — no action is needed.
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="padding:16px 40px 28px;text-align:center;font-family:-apple-system,'Segoe UI',Roboto,Arial,sans-serif;font-size:12px;color:#8d8d8d;">
            <a href="${properties.brandTermsUrl!'https://shahin-ai.com/legal/terms'}"
               style="color:#6f6f6f;text-decoration:none;font-weight:600;">Terms</a>
            &nbsp;&middot;&nbsp;
            <a href="${properties.brandPrivacyUrl!'https://shahin-ai.com/legal/privacy'}"
               style="color:#6f6f6f;text-decoration:none;font-weight:600;">Privacy</a>
            &nbsp;&middot;&nbsp;
            <a href="${properties.brandHomeUrl!'https://shahin-ai.com'}"
               style="color:#6f6f6f;text-decoration:none;font-weight:600;">Shahin-AI</a>
            <br/><br/>
            <span style="color:#a8a8a8;">
              Need help?
              <a href="mailto:${properties.brandSupport!'info@shahin-ai.com'}"
                 style="color:#0043ce;text-decoration:none;">${properties.brandSupport!'info@shahin-ai.com'}</a>
            </span>
          </td>
        </tr>
      </table>

      <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0"
             style="max-width:600px;width:100%;margin-top:18px;">
        <tr>
          <td align="center" style="font-family:-apple-system,'Segoe UI',Roboto,Arial,sans-serif;font-size:11px;color:#a8a8a8;line-height:1.6;">
            © ${.now?string("yyyy")} Shahin-AI. All rights reserved.
          </td>
        </tr>
      </table>

    </td>
  </tr>
</table>
</body>
</html>
</#macro>

<#--
  Reusable bulletproof CTA button — table-based so Outlook renders it.
-->
<#macro ctaButton href label>
<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:24px 0;">
  <tr>
    <td align="center" bgcolor="#0f62fe"
        style="border-radius:8px;background-color:#0f62fe;box-shadow:0 2px 8px rgba(15,98,254,0.3);">
      <a href="${href}" target="_blank"
         style="display:inline-block;padding:14px 32px;font-family:-apple-system,'Segoe UI',Roboto,Arial,sans-serif;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:8px;line-height:1;letter-spacing:0.01em;">
        ${label}
      </a>
    </td>
  </tr>
</table>
</#macro>

<#--
  Raw URL echo — some clients disable CTA buttons in untrusted mail.
-->
<#macro urlEcho href>
<p style="margin:16px 0 0;font-family:-apple-system,'Segoe UI',Roboto,Arial,sans-serif;font-size:12px;color:#6f6f6f;line-height:1.5;word-break:break-all;">
  If the button above doesn't work, copy &amp; paste this link into your browser:<br/>
  <a href="${href}" target="_blank" style="color:#0043ce;text-decoration:underline;">${href}</a>
</p>
</#macro>
