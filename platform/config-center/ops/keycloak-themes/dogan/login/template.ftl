<#--
  Shahin / Dogan Keycloak login template.

  Overrides only the page chrome (background, card, brand header,
  language switcher, footer). All form markup (login.ftl, register.ftl,
  login-reset-password.ftl, etc.) is inherited from the parent
  `keycloak` theme unless a per-page override exists alongside this
  file. That keeps us picking up upstream security and flow fixes for
  free.

  Keycloak is the source of truth. This template renders around it.
-->
<#macro registrationLayout displayInfo=false displayMessage=true displayRequiredFields=false showAnotherWayIfPresent=true>
<!DOCTYPE html>
<html lang="${locale.currentLanguageTag}" dir="${(locale.rtl)?then('rtl','ltr')}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
  <meta name="color-scheme" content="light">
  <meta name="robots" content="noindex, nofollow">
  <meta name="theme-color" content="#041225">
  <title>${msg("loginTitle","Shahin-AI")}</title>
  <#-- Browser-tab icon set. The .ico covers legacy browsers (and is
       what Chrome prefers for the tab strip when the tab is narrow),
       the PNG sizes cover modern browsers + iOS home-screen shortcuts.
       All derive from the Shahin falcon so every surface — tabs,
       bookmarks, app icons — carries the brand mark. -->
  <link rel="icon" type="image/x-icon" href="${url.resourcesPath}/img/favicon.ico">
  <link rel="icon" type="image/png" sizes="16x16"   href="${url.resourcesPath}/img/favicon-16.png">
  <link rel="icon" type="image/png" sizes="32x32"   href="${url.resourcesPath}/img/favicon-32.png">
  <link rel="icon" type="image/png" sizes="96x96"   href="${url.resourcesPath}/img/favicon-96.png">
  <link rel="icon" type="image/png" sizes="192x192" href="${url.resourcesPath}/img/favicon-192.png">
  <link rel="apple-touch-icon" sizes="180x180" href="${url.resourcesPath}/img/apple-touch-icon.png">
  <link rel="preload" as="image" href="${url.resourcesPath}/${properties.brandLogo!'img/shahin-falcon.png'}">
  <link rel="preconnect" href="https://fonts.googleapis.com" crossorigin>
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=IBM+Plex+Sans+Arabic:wght@400;500;600;700&display=swap">
  <#if properties.styles?has_content>
    <#list properties.styles?split(' ') as style>
      <link rel="stylesheet" href="${url.resourcesPath}/${style}">
    </#list>
  </#if>
  <#if properties.scripts?has_content>
    <#list properties.scripts?split(' ') as script>
      <script src="${url.resourcesPath}/${script}" type="text/javascript" defer></script>
    </#list>
  </#if>
  <#if scripts??>
    <#list scripts as script>
      <script src="${url.resourcesPath}/${script}" type="text/javascript" defer></script>
    </#list>
  </#if>
</head>
<body class="${properties.kcBodyClass!} dogan">
  <div class="shahin-page">

    <#if realm.internationalizationEnabled && locale.supported?size gt 1>
      <nav id="kc-locale" aria-label="${msg('localeLabel','Language')}">
        <ul>
          <#list locale.supported as l>
            <li>
              <a href="${l.url}" lang="${l.languageTag}"
                 <#if l.languageTag == locale.currentLanguageTag>aria-current="true"</#if>>
                ${l.label}
              </a>
            </li>
          </#list>
        </ul>
      </nav>
    </#if>

    <main class="${properties.kcFormCardClass!}" role="main">
      <header class="${properties.kcFormHeaderClass!}">
        <a href="${properties.brandHomeUrl!'https://shahin-ai.com'}"
           class="shahin-brand-link"
           aria-label="${msg('brandName','Shahin')}">
          <img src="${url.resourcesPath}/${properties.brandLogo!'img/shahin-falcon.png'}"
               alt="${msg('brandName','Shahin')}"
               width="88" height="88"
               class="shahin-brand-img">
        </a>

        <span class="shahin-wordmark">
          ${msg('brandName','Shahin')}<span class="shahin-wordmark-accent">-AI</span>
        </span>
        <#if properties.brandTagline?has_content>
          <span class="shahin-tagline">${properties.brandTagline}</span>
        </#if>

        <#if displayMessage && message?has_content && (message.type != 'warning' || !isAppInitiatedAction??)>
          <div class="alert alert-${message.type}" role="alert">
            <span>${kcSanitize(message.summary)?no_esc}</span>
          </div>
        </#if>

        <h1 id="kc-page-title">
          <#nested "header">
        </h1>
      </header>

      <section id="kc-content">
        <div id="kc-content-wrapper">
          <#nested "form">

          <#if displayRequiredFields>
            <p class="instruction">* ${msg('requiredFields','Required fields')}</p>
          </#if>

          <#if displayInfo>
            <aside id="kc-info">
              <div id="kc-info-wrapper">
                <#nested "info">
              </div>
            </aside>
          </#if>
        </div>
      </section>

      <footer class="shahin-footer">
        <p>
          <a href="${properties.brandTermsUrl!'https://shahin-ai.com/legal/terms'}" target="_blank" rel="noopener">${msg('termsLinkText','Terms')}</a>
          &nbsp;·&nbsp;
          <a href="${properties.brandPrivacyUrl!'https://shahin-ai.com/legal/privacy'}" target="_blank" rel="noopener">${msg('privacyLinkText','Privacy')}</a>
        </p>
        <p class="shahin-foot-meta">${msg('poweredByText','Secured by Shahin AI')}</p>
      </footer>
    </main>
  </div>
</body>
</html>
</#macro>
