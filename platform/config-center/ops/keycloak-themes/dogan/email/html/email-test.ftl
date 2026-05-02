<#import "template.ftl" as layout>
<@layout.emailLayout>
<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;font-size:1px;line-height:1px;color:#ffffff;">
  Shahin-AI Microsoft Graph transport test.
</div>

<h1 style="margin:0 0 16px;font-family:-apple-system,'Segoe UI',Roboto,Arial,sans-serif;font-size:22px;font-weight:700;color:#161616;letter-spacing:-0.01em;">
  Test email received
</h1>
<p style="margin:0 0 14px;">
  This is a test from the <strong>Shahin-AI</strong> Keycloak realm,
  routed through Microsoft Graph. If you're reading this, the transport
  is configured correctly.
</p>
</@layout.emailLayout>
