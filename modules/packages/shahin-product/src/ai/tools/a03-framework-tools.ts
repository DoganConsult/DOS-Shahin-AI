// ================================================================
// A03 — Framework Mapping & Compliance Analysis
// Tools: list frameworks, detect unmapped controls, analyze cross-framework coverage
// ================================================================

import { tenantSchema } from '@dos/db';
import { AgentToolDefinition } from '@dos/module-sdk';
import { createProcessTask } from '@dos/platform-core/workflows';
import { safeRows } from '@dos/module-sdk';

export function buildA03Tools(): AgentToolDefinition[] {
  return [
    {
      name: 'list_frameworks_with_coverage',
      description: 'List all adopted frameworks with control mapping coverage percentages.',
      input_schema: { type: 'object', properties: {}, required: [] },
      handler: async (tenantId) => {
        const schema = tenantSchema(tenantId);
        const frameworks = await safeRows(`SELECT framework_id, name, status, controls_total, controls_compliant, controls_partial, controls_not_met FROM "${schema}".frameworks ORDER BY name`);
        return { frameworks, count: frameworks.length };
      },
    },
    {
      name: 'detect_gaps',
      description: 'Detect controls that are not mapped to any framework, or frameworks with low coverage.',
      input_schema: { type: 'object', properties: {}, required: [] },
      handler: async (tenantId) => {
        const schema = tenantSchema(tenantId);
        const unmapped = await safeRows(`SELECT control_id, code, title FROM "${schema}".ucf_controls WHERE mapped_frameworks IS NULL OR mapped_frameworks = '[]'::jsonb LIMIT 50`);
        const lowCoverage = await safeRows(`SELECT framework_id, name, controls_total, controls_compliant FROM "${schema}".frameworks WHERE controls_total > 0 AND (controls_compliant::float / controls_total::float) < 0.5`);
        return { unmappedControls: unmapped, unmappedCount: unmapped.length, lowCoverageFrameworks: lowCoverage };
      },
    },
    {
      name: 'compare_frameworks',
      description: 'Compare control overlap between two frameworks using crosswalk mappings.',
      input_schema: {
        type: 'object',
        properties: {
          framework1: { type: 'string', description: 'First framework ID or name' },
          framework2: { type: 'string', description: 'Second framework ID or name' },
        },
        required: ['framework1', 'framework2'],
      },
      handler: async (tenantId, input) => {
        const schema = tenantSchema(tenantId);
        const mappings = await safeRows(
          `SELECT source_control_id, target_requirement_id, relationship, confidence
           FROM "${schema}".crosswalk_mappings
           WHERE source_control_id IN (SELECT control_id FROM "${schema}".ucf_controls WHERE pack_id ILIKE $1)
           LIMIT 100`, [`%${input.framework1}%`]
        );
        return { mappings, count: mappings.length, framework1: input.framework1, framework2: input.framework2 };
      },
    },
    {
      name: 'create_mapping_task',
      description: 'Create a task to map unmapped controls to applicable frameworks.',
      input_schema: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          description: { type: 'string' },
          controlIds: { type: 'array', items: { type: 'string' }, description: 'List of control IDs to map' },
        },
        required: ['title', 'description'],
      },
      handler: async (tenantId, input) => {
        const task = await createProcessTask(tenantId, {
          title: `[A03] ${input.title}`,
          description: input.description,
          taskType: 'control_review',
          priority: 'medium',
          entityType: 'control',
          triggerSource: 'agent_A03',
          createdBy: 'agent-A03',
        });
        return { created: true, taskId: task.taskId };
      },
    },
  ];
}
