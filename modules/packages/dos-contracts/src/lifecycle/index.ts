export interface LifecycleDefinition {
  entityType: string;
  moduleCode: string;
  states: string[];
  initialState: string;
  terminalStates: string[];
  transitions: LifecycleTransition[];
}

export interface LifecycleTransition {
  from: string;
  to: string;
  permission: string;
  requiresApproval?: boolean;
  requiresEvidence?: boolean;
  slaHours?: number;
  autoTransition?: boolean;
  conditions?: TransitionCondition[];
}

export interface TransitionCondition {
  type: 'field_required' | 'role_required' | 'custom';
  field?: string;
  role?: string;
  evaluator?: string;
}

export interface LifecycleState {
  entityType: string;
  entityId: string;
  currentState: string;
  previousState?: string;
  transitionedAt: string;
  transitionedBy: string;
  history: LifecycleHistoryEntry[];
}

export interface LifecycleHistoryEntry {
  from: string;
  to: string;
  at: string;
  by: string;
  reason?: string;
}
