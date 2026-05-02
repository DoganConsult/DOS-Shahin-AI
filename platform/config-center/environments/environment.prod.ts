/**
 * Production (Keycloak OIDC + SPA):
 * - `apiUrl` must reach the gateway so the browser can call `/api/session/bootstrap`,
 *   `/api/auth/oidc/start`, `/api/auth/oidc/session`, and `/api/auth/refresh`.
 * - Cookie `Domain` and the site host must match (apex vs `www`) so httpOnly session
 *   cookies are sent after the Keycloak redirect.
 * - Public `/login` and `/register` redirect to Keycloak via `AuthRedirectComponent`, not the legacy email/password page.
 */
export const environment = {
  production: true,
  apiUrl: '/api',
  appName: 'Shahin-AI GRC',
  author: 'Dogan Consult',
  uiPolicyEngine: false,

  mobile: {
    biometricEnabled: true,
    pushNotifications: true,
    offlineSyncEnabled: true,
    cameraEvidence: true,
    hapticFeedback: true,
    deepLinkScheme: 'shahingrc',
    deepLinkDomain: 'grc.shahin-grc.sa',
  },

  observability: {
    enabled: true,
    errorReportingUrl: '/api/platform/client-errors',
  },

  features: {
    bpmnModeler: true,
    dmnModeler: true,
    formBuilder: true,
    graphExplorer: true,
    richTextEditor: true,
    markdownRenderer: true,
    mathRenderer: true,
    processAutoLayout: true,
  },
};
