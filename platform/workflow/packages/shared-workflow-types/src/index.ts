/**
 * @shahin/shared-workflow-types — re-exports from @dos/types.
 *
 * This package exists for backward compatibility with 3 backend files that import from it.
 * All canonical types live in @dos/types. No new code should import from this package.
 * See LAUNCH_LOCKS.md Lock 9.
 */
export {
  WORKFLOW_NODE_TYPES_EXECUTED,
  WORKFLOW_NODE_TYPES_UI_ONLY,
  ALL_PALETTE_NODE_TYPES,
  WORKFLOW_ACTION_SUBTYPES_EXECUTED,
  isExecutedNodeType,
  isExecutableActionSubType,
  isTenantWideExecutionRole,
  type WorkflowNode,
  type WorkflowEdge,
  type WorkflowDefinition,
  type UiOnlyNodeType,
  type PaletteNodeType,
} from '@dos/types';
