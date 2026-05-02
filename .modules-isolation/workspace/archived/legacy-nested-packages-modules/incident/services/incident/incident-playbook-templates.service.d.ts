import type { ProcessTaskType } from '../../ports/lifecycle.port';
export interface PlaybookStep {
    order: number;
    titleEn: string;
    titleAr: string;
    descriptionEn: string;
    descriptionAr: string;
    taskType: ProcessTaskType;
    assigneeRole?: string;
    priority: 'critical' | 'high' | 'medium' | 'low';
    dueInHours: number;
    dependencies?: number[];
}
export interface IncidentPlaybookTemplate {
    category: string;
    nameEn: string;
    nameAr: string;
    descriptionEn: string;
    descriptionAr: string;
    steps: PlaybookStep[];
}
export declare const INCIDENT_PLAYBOOK_TEMPLATES: IncidentPlaybookTemplate[];
/**
 * Get playbook template for an incident category.
 * Returns null if no template matches.
 */
export declare function getPlaybookTemplateForCategory(category: string): IncidentPlaybookTemplate | null;
/**
 * Get all available playbook templates.
 */
export declare function getAllPlaybookTemplates(): IncidentPlaybookTemplate[];
