<#--
  Dogan / Shahin login template override.
  Inherits the parent keycloak/login/template.ftl and only customizes
  the page chrome (brand header, language switch, footer legal links).
  All form markup comes from the parent templates (login.ftl,
  register.ftl, login-reset-password.ftl, etc.) unchanged, so upstream
  Keycloak updates to the form logic are inherited without patching.
-->
<#macro registrationLayout displayInfo=false displayMessage=true displayRequiredFields=false showAnotherWayIfPresent=true>
<!DOCTYPE html>
<html lang="${locale.currentLanguageTag}" dir="${(locale.rtl)?then('rtl','ltr')}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="robots" content="noindex, nofollow">
  <title>${msg("loginTitle","Shahin")}</title>
  <link rel="icon" href="${url.resourcesPath}/img/favicon.svg" type="image/svg+xml">
  <#if properties.styles?has_content>
    <#list properties.styles?split(' ') as style>
      <link rel="stylesheet" href="${url.resourcesPath}/${style}">
    </#list>
  </#if>
  <#if scripts??>
    <#list scripts as script>
      <script src="${url.resourcesPath}/${script}" type="text/javascript"></script>
    </#list>
  </#if>
</head>
<body class="${properties.kcBodyClass!} dogan">
  <div class="${properties.kcLoginClass!}">
    <div class="${properties.kcContentWrapperClass!} dogan-page">
      <#if realm.internationalizationEnabled && locale.supported?size gt 1>
        <div id="kc-locale">
          <ul>
            <#list locale.supported as l>
              <li><a href="${l.url}" lang="${l.languageTag}">${l.label}</a></li>
            </#list>
          </ul>
        </div>
      </#if>

      <div class="${properties.kcFormCardClass!}">
        <header class="${properties.kcFormHeaderClass!}">
          <div class="login-pf-brand" role="img" aria-label="${properties.brandName!'Shahin'}">${properties.brandName!'Shahin'}</div>
        <#if displayMessage && message?has_content && (message.type != 'warning' || !isAppInitiatedAction??)>
          <div class="alert alert-${message.type}">
            <span>${kcSanitize(message.summary)?no_esc}</span>
          </div>
        </#if>
        <h1 id="kc-page-title">
          <#nested "header">
        </h1>
      </header>

      <div id="kc-content">
        <div id="kc-content-wrapper">
          <#nested "form">

          <#if displayRequiredFields>
            <p class="instruction">* ${msg('requiredFields')}</p>
          </#if>

          <#if displayInfo>
            <div id="kc-info">
              <div id="kc-info-wrapper">
                <#nested "info">
              </div>
            </div>
          </#if>
        </div>
      </div>

      <footer class="dogan-footer">
        <p>
          <a href="${properties.brandTermsUrl!'https://shahin-ai.com/legal/terms'}" target="_blank" rel="noopener">${msg('termsLinkText','Terms')}</a>
          &nbsp;·&nbsp;
          <a href="${properties.brandPrivacyUrl!'https://shahin-ai.com/legal/privacy'}" target="_blank" rel="noopener">${msg('privacyLinkText','Privacy')}</a>
        </p>
        <p class="dogan-foot-meta">${msg('poweredByText','Secured by Shahin Identity')}</p>
      </footer>
      </div>
    </div>
  </div>
</body>
</html>
</#macro>
