export const environment = {
  production: false,
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
    enabled: false,
    errorReportingUrl: '' as string,
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
