<#import "template.ftl" as layout>
<@layout.emailLayout>
<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;font-size:1px;line-height:1px;color:#ffffff;">
  Reset your Shahin-AI password — link valid for ${linkExpirationFormatter(linkExpiration)}.
</div>

<h1 style="margin:0 0 16px;font-family:-apple-system,'Segoe UI',Roboto,Arial,sans-serif;font-size:22px;font-weight:700;color:#161616;letter-spacing:-0.01em;">
  Reset your password
</h1>

<p style="margin:0 0 14px;">
  Hello<#if user.firstName??> ${user.firstName}</#if>,
</p>

<p style="margin:0 0 14px;">
  Someone asked to reset the password on your <strong>Shahin-AI</strong>
  account. If that was you, click below to choose a new password. Your
  current password stays active until you finish.
</p>

<@layout.ctaButton href=link label="Reset password" />

<p style="margin:14px 0 0;font-size:13.5px;color:#6f6f6f;">
  This link expires in <strong style="color:#262626;">${linkExpirationFormatter(linkExpiration)}</strong>.
  If you didn't request a reset, you can safely ignore this email — your
  password won't change.
</p>

<@layout.urlEcho href=link />
</@layout.emailLayout>
