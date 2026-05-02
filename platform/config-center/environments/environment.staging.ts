export const environment = {
  production: true,
  staging: true,
  apiUrl: '/api',
  wsUrl: '/ws',
  appName: 'AGRC-OS [STAGING]',
  author: 'Dogan Consult',
  uiPolicyEngine: false,

  observability: {
    enabled: true,
    errorReportingUrl: '' as string,
  },

  mobile: {
    biometricEnabled: true,
    pushNotifications: true,
    offlineSyncEnabled: true,
    cameraEvidence: true,
    hapticFeedback: true,
    deepLinkScheme: 'shahingrc',
    deepLinkDomain: 'staging-grc.shahin-grc.sa',
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
