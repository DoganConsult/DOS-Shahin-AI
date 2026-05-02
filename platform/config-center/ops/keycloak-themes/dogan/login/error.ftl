<#--
  Shahin-AI error page — used by Keycloak when an action token is invalid,
  expired, or the flow hit an unrecoverable state. Stock KC error page
  shows only a message; we add a branded "Back to sign in" / "Continue"
  CTA so the user isn't stranded.
-->
<#import "template.ftl" as layout>
<@layout.registrationLayout displayMessage=false; section>
  <#if section = "header">
    ${kcSanitize(msg("errorTitle"))?no_esc}
  <#elseif section = "form">
    <div id="kc-error-message">
      <p class="instruction">${kcSanitize(message.summary)?no_esc}</p>

      <#assign continueUrl = "">
      <#if client?? && client.baseUrl?has_content>
        <#assign continueUrl = client.baseUrl>
        <#assign continueLabel = msg("backToApplication")>
      <#elseif skipLink??>
        <#assign continueUrl = "">
      <#else>
        <#assign continueUrl = (properties.brandHomeUrl)!'https://shahin-ai.com'>
        <#assign continueLabel = msg("continueToShahin","Continue to Shahin-AI")>
      </#if>

      <#if continueUrl?has_content>
        <div id="kc-form-buttons" style="margin-top:24px;">
          <a href="${continueUrl}" class="btn btn-primary pf-c-button pf-m-primary pf-m-block" style="display:inline-flex;align-items:center;justify-content:center;width:100%;height:48px;padding:0 22px;font-size:15px;font-weight:600;border-radius:8px;background:#0f62fe;color:#ffffff;text-decoration:none;border:1px solid #0f62fe;">
            ${continueLabel}
          </a>
        </div>
      </#if>
    </div>
  </#if>
</@layout.registrationLayout>
