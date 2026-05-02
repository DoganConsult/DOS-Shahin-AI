export { LocalKnowledgeModuleDashboardComponent as LocalKnowledgeDashboardComponent } from './dashboards/local-knowledge-dashboard.component';
export { LocalKnowledgeDiagnosticsComponent } from './diagnostics/local-knowledge-diagnostics.component';
export { LocalKnowledgeAdminComponent } from './admin/local-knowledge-admin.component';
export { LocalKnowledgeWidgetComponent } from './widgets/local-knowledge-widget.component';
export { LocalKnowledgeState } from './state/local-knowledge.state';
export { KNOWLEDGE_ARTICLE_STATES, KNOWLEDGE_ARTICLE_TRANSITIONS, isValidKnowledgeTransition, isKnowledgeTerminal } from './workflows/local-knowledge-lifecycle';
export type { KnowledgeArticleContract, KnowledgeIndexContract, KnowledgeCurationContract, LocalKnowledgeDiagnosticsContract, LocalKnowledgeDashboardContract, KnowledgeArticleStatus, KnowledgeCategory, KnowledgeAccessLevel } from './contracts/local-knowledge.contracts';
