<#import "template.ftl" as layout>
<@layout.emailLayout>
<!-- Preheader (inbox preview, hidden visually) -->
<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;font-size:1px;line-height:1px;color:#ffffff;">
  Action required on your Shahin-AI account — update to continue.
</div>

<h1 style="margin:0 0 16px;font-family:-apple-system,'Segoe UI',Roboto,Arial,sans-serif;font-size:22px;font-weight:700;color:#161616;letter-spacing:-0.01em;">
  Update your account
</h1>

<p style="margin:0 0 14px;">
  Hello<#if user.firstName??> ${user.firstName}</#if>,
</p>

<p style="margin:0 0 14px;">
  Your administrator has asked you to update your
  <strong>Shahin-AI</strong> account. This is usually triggered by a
  security-policy change — password rotation, a new MFA factor, or
  profile completion.
</p>

<p style="margin:0 0 6px;"><strong>Required action<#if requiredActions?size != 1>s</#if>:</strong></p>
<ul style="margin:4px 0 18px;padding-inline-start:22px;color:#525252;">
  <#list requiredActions as requiredAction>
    <li style="margin:4px 0;">${msg("requiredAction.${requiredAction}")}</li>
  </#list>
</ul>

<@layout.ctaButton href=link label="Continue" />

<p style="margin:14px 0 0;font-size:13.5px;color:#6f6f6f;">
  This link is valid for <strong style="color:#262626;">${linkExpirationFormatter(linkExpiration)}</strong>.
  If you're not the one who started this, you can safely ignore this email.
</p>

<@layout.urlEcho href=link />
</@layout.emailLayout>
