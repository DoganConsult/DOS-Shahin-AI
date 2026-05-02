import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock all external dependencies before imports
vi.mock('../../../../config/database', () => ({
  safeQuery: vi.fn(),
  tenantSchema: vi.fn((tid: string) => `tenant_${tid}`),
}));
vi.mock('../../../../utils/db-utils', () => ({
  getFirstRow: vi.fn((r: any) => r?.rows?.[0] ?? null),
}));
vi.mock('../../../platform/services/misc/logger.service', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));
vi.mock('../../../platform/services/event/event-bus.service', () => ({
  eventBus: { publish: vi.fn(), subscribe: vi.fn() },
}));
vi.mock('../../../../platform/dos/workflows', () => ({
  startWorkflowExecution: vi.fn(),
  advanceStep: vi.fn(),
  completeStep: vi.fn(),
  cancelExecution: vi.fn(),
  getInstanceStatus: vi.fn(),
  createProcessTask: vi.fn(),
  executeNotificationStep: vi.fn(),
  executeApiCallNode: vi.fn(),
  executeSendEmailNode: vi.fn(),
  executeWebhookNode: vi.fn(),
  emitWorkflowEvent: vi.fn(),
}));
vi.mock('../../../../utils/http-error.util', () => ({
  toErrorMessage: vi.fn((e: unknown) => e instanceof Error ? e.message : String(e)),
}));
vi.mock('../../../../utils/resilient-catch', () => ({
  swallow: vi.fn(),
  EC: { EVENT_BUS: 'EVENT_BUS' },
  catchHandler: vi.fn(() => () => {}),
}));
vi.mock('@shahin/shared-workflow-types', () => ({
  isExecutedNodeType: vi.fn(() => true),
  isExecutableActionSubType: vi.fn(() => false),
}));
vi.mock('../../../../platform/dos/constants/system-actors', () => ({
  SYSTEM_JOB_ACTOR: 'system',
}));

import {
  normalizeEdges,
  findNextEdge,
  findAllOutgoingEdges,
  inDegree,
  evaluateCondition,
  normalizeNodes,
  executeWorkflow,
  getPathFirstBranch,
  findJoinNode,
} from './workflow-execution.service';
import { safeQuery } from '../../ports/database.port';

// MOCKED DYNAMICALLY TO ALIGN PORT ABSTRACTION
vi.mock('../../ports/database.port', () => ({
  safeQuery: vi.fn().mockResolvedValue({ rows: [] }),
  withTransaction: vi.fn().mockImplementation(async (cb) => cb({ query: vi.fn().mockResolvedValue({ rows: [] }) })),
  query: vi.fn().mockResolvedValue({ rows: [] })
}));
import { startWorkflowExecution as dosStart } from '../../ports/lifecycle.port';


// MOCKED DYNAMICALLY TO ALIGN PORT ABSTRACTION
vi.mock('../../ports/database.port', () => ({
  safeQuery: vi.fn().mockResolvedValue({ rows: [] }),
  withTransaction: vi.fn().mockImplementation(async (cb) => cb({ query: vi.fn().mockResolvedValue({ rows: [] }) })),
  query: vi.fn().mockResolvedValue({ rows: [] })
}));
describe('Workflow Execution Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('normalizeEdges', () => {
    it('should normalize edges with source/target fields', () => {
      const edges = [{ id: 'e1', source: 'a', target: 'b' }];
      const result = normalizeEdges(edges);
      expect(result).toEqual([{ id: 'e1', source: 'a', target: 'b', label: undefined, condition: undefined }]);
    });

    it('should normalize edges with from/to fields', () => {
      const edges = [{ from: 'a', to: 'b', label: 'next' }];
      const result = normalizeEdges(edges);
      expect(result[0].source).toBe('a');
      expect(result[0].target).toBe('b');
      expect(result[0].label).toBe('next');
    });

    it('should generate edge IDs when missing', () => {
      const edges = [{ source: 'a', target: 'b' }, { source: 'b', target: 'c' }];
      const result = normalizeEdges(edges);
      expect(result[0].id).toBe('e0');
      expect(result[1].id).toBe('e1');
    });
  });

  describe('findNextEdge', () => {
    const edges = [
      { source: 'a', target: 'b', label: 'approved', condition: 'approved' },
      { source: 'a', target: 'c', label: 'rejected', condition: 'rejected' },
    ];

    it('should find edge matching condition label', () => {
      const result = findNextEdge(edges, 'a', 'approved');
      expect(result?.target).toBe('b');
    });

    it('should find edge by condition', () => {
      const result = findNextEdge(edges, 'a', 'rejected');
      expect(result?.target).toBe('c');
    });

    it('should fall back to first edge when no condition matches', () => {
      const result = findNextEdge(edges, 'a', 'unknown');
      expect(result?.target).toBe('b');
    });

    it('should return undefined when no edges from node', () => {
      const result = findNextEdge(edges, 'z');
      expect(result).toBeUndefined();
    });
  });

  describe('findAllOutgoingEdges', () => {
    it('should return all outgoing edges from a node', () => {
      const edges = [
        { source: 'a', target: 'b' },
        { source: 'a', target: 'c' },
        { source: 'b', target: 'c' },
      ];
      const result = findAllOutgoingEdges(edges, 'a');
      expect(result).toHaveLength(2);
      expect(result.map(e => e.target)).toEqual(['b', 'c']);
    });
  });

  describe('inDegree', () => {
    it('should count incoming edges to a node', () => {
      const edges = [
        { source: 'a', target: 'c' },
        { source: 'b', target: 'c' },
        { source: 'c', target: 'd' },
      ];
      expect(inDegree(edges, 'c')).toBe(2);
      expect(inDegree(edges, 'a')).toBe(0);
    });
  });

  describe('evaluateCondition', () => {
    it('should return true when no field specified', () => {
      expect(evaluateCondition({}, {})).toBe(true);
    });

    it('should evaluate equality operator', () => {
      expect(evaluateCondition({ field: 'status', operator: 'eq', value: 'active' }, { status: 'active' })).toBe(true);
      expect(evaluateCondition({ field: 'status', operator: '===', value: 'active' }, { status: 'inactive' })).toBe(false);
    });

    it('should evaluate inequality operator', () => {
      expect(evaluateCondition({ field: 'x', operator: 'neq', value: 5 }, { x: 10 })).toBe(true);
    });

    it('should evaluate comparison operators', () => {
      expect(evaluateCondition({ field: 'score', operator: 'gt', value: 50 }, { score: 75 })).toBe(true);
      expect(evaluateCondition({ field: 'score', operator: 'lte', value: 50 }, { score: 50 })).toBe(true);
    });

    it('should evaluate "in" operator', () => {
      expect(evaluateCondition({ field: 'role', operator: 'in', value: ['admin', 'manager'] }, { role: 'admin' })).toBe(true);
      expect(evaluateCondition({ field: 'role', operator: 'in', value: ['admin'] }, { role: 'user' })).toBe(false);
    });
  });

  describe('normalizeNodes', () => {
    it('should return nodes directly if present', () => {
      const def = { nodes: [{ id: 'n1', type: 'trigger', subType: 'manual', config: {}, position: { x: 0, y: 0 } }] };
      const result = normalizeNodes(def);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('n1');
    });

    it('should generate nodes from steps when no nodes exist', () => {
      const def = {
        nodes: [],
        steps: [
          { type: 'task', role: 'reviewer' },
          { type: 'approval', role: 'manager' },
        ],
      };
      const result = normalizeNodes(def);
      // trigger + 2 steps + end = 4
      expect(result).toHaveLength(4);
      expect(result[0].type).toBe('trigger');
      expect(result[result.length - 1].type).toBe('end');
    });
  });

  describe('executeWorkflow', () => {
    it('should throw when workflow not found', async () => {
      (safeQuery as any).mockResolvedValueOnce({ rows: [] });
      await expect(executeWorkflow('t1', 'wf1', { type: 'manual' })).rejects.toThrow('Workflow not found');
    });

    it('should delegate to DOS engine when possible', async () => {
      (safeQuery as any).mockResolvedValueOnce({
        rows: [{ workflow_id: 'wf1', definition: { nodes: [], steps: [] } }],
      });
      (dosStart as any).mockResolvedValueOnce({ instanceId: 'inst-1', status: 'running' });

      const result = await executeWorkflow('t1', 'wf1', { type: 'manual' });
      expect(result.execution_id).toBe('inst-1');
      expect(result.status).toBe('running');
    });

    it('should deny execution when department-scoped and user lacks access', async () => {
      (safeQuery as any).mockResolvedValueOnce({
        rows: [{ workflow_id: 'wf1', department_id: 'dept-1', definition: {} }],
      });

      await expect(
        executeWorkflow('t1', 'wf1', { type: 'manual' }, { departmentId: 'dept-2', isTenantWideRole: false } as any),
      ).rejects.toThrow('department-scoped');
    });
  });

  describe('getPathFirstBranch', () => {
    it('should trace a linear path', () => {
      const edges = [
        { source: 'a', target: 'b' },
        { source: 'b', target: 'c' },
      ];
      expect(getPathFirstBranch(edges, 'a')).toEqual(['a', 'b', 'c']);
    });

    it('should stop on missing target', () => {
      const edges = [{ source: 'a', target: 'b' }];
      expect(getPathFirstBranch(edges, 'a')).toEqual(['a', 'b']);
    });
  });

  describe('findJoinNode', () => {
    it('should find the join node where branches converge', () => {
      const edges = [
        { source: 'b', target: 'c' },
        { source: 'c', target: 'd' },
        { source: 'x', target: 'd' },
      ];
      const result = findJoinNode(edges, ['b', 'x']);
      expect(result).toBe('d');
    });

    it('should return null for empty branch targets', () => {
      expect(findJoinNode([], [])).toBeNull();
    });
  });
});
