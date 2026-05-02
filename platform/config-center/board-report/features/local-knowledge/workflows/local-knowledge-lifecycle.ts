import type { KnowledgeArticleStatus } from '../contracts/local-knowledge.contracts';

export const KNOWLEDGE_ARTICLE_STATES: readonly KnowledgeArticleStatus[] = [
  'draft', 'in_review', 'published', 'outdated', 'archived',
] as const;

export const KNOWLEDGE_ARTICLE_TRANSITIONS: Record<KnowledgeArticleStatus, KnowledgeArticleStatus[]> = {
  draft: ['in_review', 'archived'],
  in_review: ['published', 'draft'],
  published: ['outdated', 'in_review', 'archived'],
  outdated: ['in_review', 'archived'],
  archived: [],
};

export const KNOWLEDGE_TERMINAL_STATES: readonly KnowledgeArticleStatus[] = ['archived'];

export function isValidKnowledgeTransition(from: KnowledgeArticleStatus, to: KnowledgeArticleStatus): boolean {
  return KNOWLEDGE_ARTICLE_TRANSITIONS[from]?.includes(to) ?? false;
}

export function isKnowledgeTerminal(state: KnowledgeArticleStatus): boolean {
  return KNOWLEDGE_TERMINAL_STATES.includes(state);
}
