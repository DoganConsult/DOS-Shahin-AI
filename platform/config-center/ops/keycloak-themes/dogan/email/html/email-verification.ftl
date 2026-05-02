<#import "template.ftl" as layout>
<@layout.emailLayout>
<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;font-size:1px;line-height:1px;color:#ffffff;">
  Verify your email to finish creating your Shahin-AI account.
</div>

<h1 style="margin:0 0 16px;font-family:-apple-system,'Segoe UI',Roboto,Arial,sans-serif;font-size:22px;font-weight:700;color:#161616;letter-spacing:-0.01em;">
  Verify your email
</h1>

<p style="margin:0 0 14px;">
  Welcome<#if user.firstName??> ${user.firstName}</#if> — one last step.
</p>

<p style="margin:0 0 14px;">
  Someone created a <strong>Shahin-AI</strong> account with this email
  address. If that was you, click below to confirm and activate your
  workspace.
</p>

<@layout.ctaButton href=link label="Verify my email" />

<p style="margin:14px 0 0;font-size:13.5px;color:#6f6f6f;">
  This link is valid for <strong style="color:#262626;">${linkExpirationFormatter(linkExpiration)}</strong>.
  If you didn't create this account, you can safely ignore this email.
</p>

<@layout.urlEcho href=link />
</@layout.emailLayout>
