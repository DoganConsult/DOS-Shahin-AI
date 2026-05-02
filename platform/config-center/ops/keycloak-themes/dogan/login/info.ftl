<#--
  Shahin-AI info page — used by Keycloak after a successful required-action
  (e.g. UPDATE_PASSWORD, VERIFY_EMAIL) finishes without a client context to
  hand the session back to. The stock KC template renders this as a
  dead-end with only the text "Your account has been updated"; we replace
  it with a proper "Continue to Shahin-AI" CTA so the user always has a
  one-click path back to the product.

  Priority for the Continue link:
    1. pageRedirectUri (set when the action token carried a redirect_uri)
    2. actionUri        (next-step URL inside KC, e.g. multi-action chains)
    3. client.baseUrl   (set when session has client context)
    4. brandHomeUrl     (theme property fallback — always https://shahin-ai.com)
-->
<#import "template.ftl" as layout>
<@layout.registrationLayout displayMessage=false; section>
  <#if section = "header">
    <#if messageHeader??>
      ${kcSanitize(msg("${messageHeader}"))?no_esc}
    <#else>
      ${message.summary}
    </#if>
  <#elseif section = "form">
    <div id="kc-info-message">
      <p class="instruction">
        ${message.summary}<#if requiredActions??><#list requiredActions>: <b><#items as reqActionItem>${kcSanitize(msg("requiredAction.${reqActionItem}"))?no_esc}<#sep>, </#items></b></#list></#list></#if>
      </p>

      <#-- Resolve the best "continue" target. Keycloak sets these context
           variables when available; fall back to the brand home URL so
           we never show a dead-end page. -->
      <#assign continueUrl = "">
      <#if pageRedirectUri?has_content>
        <#assign continueUrl = pageRedirectUri>
        <#assign continueLabel = msg("backToApplication")>
      <#elseif actionUri?has_content>
        <#assign continueUrl = actionUri>
        <#assign continueLabel = msg("proceedWithAction")>
      <#elseif (client.baseUrl)?has_content>
        <#assign continueUrl = client.baseUrl>
        <#assign continueLabel = msg("backToApplication")>
      <#else>
        <#assign continueUrl = (properties.brandHomeUrl)!'https://shahin-ai.com'>
        <#assign continueLabel = msg("continueToShahin","Continue to Shahin-AI")>
      </#if>

      <#if !skipLink?? && continueUrl?has_content>
        <div id="kc-form-buttons" style="margin-top:24px;">
          <a href="${continueUrl}" class="btn btn-primary pf-c-button pf-m-primary pf-m-block" style="display:inline-flex;align-items:center;justify-content:center;width:100%;height:48px;padding:0 22px;font-size:15px;font-weight:600;border-radius:8px;background:#0f62fe;color:#ffffff;text-decoration:none;border:1px solid #0f62fe;">
            ${continueLabel}
          </a>
        </div>
      </#if>
    </div>
  </#if>
</@layout.registrationLayout>
