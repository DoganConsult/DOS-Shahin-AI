// @ts-nocheck
import { FSM_REGISTRY } from '../../../platform/dos/state-machine/entity-state-machine';

export const KNOWLEDGE_ARTICLE_STATE_MACHINE = FSM_REGISTRY.register('knowledge', 'knowledge_article', {
  schemaVersion: '1.0',
  defaultState: 'draft',
  states: ['draft', 'in_review', 'published', 'archived', 'retired'],
  transitions: [
    { from: 'draft', to: 'in_review', action: 'submit_for_review', permission: 'knowledge.article.write' },
    { from: 'in_review', to: 'published', action: 'publish', permission: 'knowledge.article.publish', authority_gate: true },
    { from: 'in_review', to: 'draft', action: 'reject', permission: 'knowledge.article.publish' },
    { from: 'published', to: 'archived', action: 'archive', permission: 'knowledge.article.archive' },
    { from: 'archived', to: 'published', action: 'restore', permission: 'knowledge.article.publish', authority_gate: true },
    { from: 'published', to: 'retired', action: 'retire', permission: 'knowledge.article.archive' },
    { from: 'archived', to: 'retired', action: 'retire', permission: 'knowledge.article.archive' },
  ],
});
