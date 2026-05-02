// Auto-generated from legacy route extraction
// Source: 6 routes from modules: workflow, approval

export const WORKFLOW_ROUTES = [
  { method: "GET", path: "/diagnostics", permission: "workflow.record.read", auth: true, validation: null },
  { method: "GET", path: "/my-approvals", permission: "workflow.approval.read", auth: true, validation: null },
  { method: "GET", path: "/my-tasks", permission: "workflow.task.read", auth: true, validation: null },
  { method: "GET", path: "/preferences", permission: "workflow.instance.read", auth: true, validation: null },
  { method: "PUT", path: "/preferences", permission: "workflow.instance.write", auth: true, validation: "updatePreferencesBody" },
  { method: "GET", path: "/summary", permission: "workflow.instance.read", auth: true, validation: null },
] as const;
