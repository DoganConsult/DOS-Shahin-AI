# Module Patch MP-56 — MCP Module End-to-End

## 0. Patch Identity

### 0.1 Patch name
**Module Patch 56 — MCP Module End-to-End**

### 0.2 Patch class
This is a **Reusable Module Enforcement Patch**.

### 0.3 Patch purpose
This patch defines the full canonical target for the **MCP (Model Context Protocol) module** end to end. 

It tells an agent exactly how to:
- inspect tool registry management, agent orchestration, and MCP server interop
- compare the current implementation against the canonical MCP target
- know exactly what files, services, contracts, and security boundaries must exist
- ensure strict execution governance over LLM tool usage

### 0.4 Module identity
- Module code: `mcp`
- Layer: AI infrastructure surface
- Criticality: **P2 medium**
- Runtime role: MCP tool registry, dynamic agent capability bindings, execution governance and logging, MCP server lifecycle management
- Primary dependency domains: DOS foundation, DAuth control spine, ai, workflow, ai-governance

---

## 1. Cross-Patch Inheritance Map

This module patch inherits and applies:
- Patch 0 (Common Enforcement Standard)
- Patch 1 (Platform Full-Stack Core)
- Patch 3 (DAuth Access restriction for Agents)
- Patch 8 (Audit Integration for Executions)
- Patch 11 (Observability)

---

## 2. Module Purpose and Boundaries

### 2.1 What MCP owns directly
- MCP tool registry (registering what tools LLMs can call: e.g. "search_db", "create_incident")
- MCP agent registry (mapping specific agents to allowed subsets of tools)
- MCP prompt templates (standardizing system prompts)
- Execution logging (capturing the parameters and result of every single tool execution)
- Tool approval workflows (preventing unverified tools from being exposed to public agents)

### 2.2 What MCP consumes from DOS
- Foundation org structure
- Module registry (to identify what domain a tool belongs to)

### 2.3 What MCP consumes from DAuth
- Every tool executed by an agent MUST masquerade temporarily under a rigid service account or the contextual user's access token, explicitly authorized by DAuth.
- Separation of Duties (requester ≠ approver for tool registration)

### 2.4 What MCP consumes from adjacent modules
- **AI**: MCP provides the capabilities, the AI module invokes the LLM endpoint passing the MCP catalog.
- **Workflow**: For tool approval orchestration.
- **AI Governance**: Ensuring the active tools do not breach stated data classification policies.

### 2.5 What MCP must not implement
- Duplicate model provider abstractions (e.g. duplicating OpenAI integrations; that belongs in `modules/ai`).

---

## 3. Canonical Backend Structure

```text
backend/src/modules/mcp/
  controllers/
  routes/
  services/
  repositories/
  contracts/
  schemas/
  types/
  events/
  workflows/
  loaders/
  diagnostics/
  security/
  ports/
  index.ts
  mcp.module.ts
```

### 3.1 Required backend service families
- **Tool Registry Service**: DB catalog of all available operations
- **Agent Registry Service**: Grouping tools into capabilities
- **Server Management Service**: Bootstrapping connections to external MCP protocol servers
- **Execution Log Service**: Highly optimized logging for auditing inference runs
- **Approval Service**: Authorizing new beta tools

---

## 4. Canonical Frontend Structure

```text
frontend/src/app/features/mcp/
  pages/
  components/
  services/
  contracts/
  index.ts
```

Required surfaces:
- MCP Tool Browser
- Agent Capabilities Matrix
- Execution Log Inspector
- Tool Approval Queue

---

## 5. Data Model Requirements

MCP owns the following PostgreSQL tables:
- `mcp_tool_registry` — tool_id, name, description, parameters_schema_json, status, module_domain
- `mcp_agent_registry` — agent_id, name, model_binding, context_window
- `mcp_agent_tools` — agent_id, tool_id
- `mcp_execution_logs` — log_id, agent_id, tool_id, invoked_by_user_id, input_payload, output_result, latency_ms

---

## 6. API Surface Requirements

Required route groups:
- **Tool CRUD**: `/api/mcp/tools`
- **Agent CRUD**: `/api/mcp/agents`
- **Execution Logging**: `/api/mcp/logs`
- **Approval Workflow**: `/api/mcp/approvals`

Required contracts:
- `McpToolContract`
- `McpExecutionLogContract`

Zod schemas must be exhaustively strict regarding `parameters_schema_json`.

---

## 7. Workflow and DAuth Integration

- **DAuth**: Tool execution endpoint mapping to real API actions MUST invoke the DAuth middleware using the `invoked_by_user_id`. Agents are never superadmins.
- **Workflow**: Pushes draft tools through a security review.

---

## 8. AI Integration

MCP is the absolute backbone for AI Integration across the application. It acts as the gatekeeper between stochastic text and deterministic application state changes.

---

## 9. UI and Experience Requirements

The UI must provide:
- A clear developer-focused syntax view for tool inputs/outputs.
- Tabular logs that can filter by user or by AI agent.


### 9.1 Cross-Module UX and Interactivity
- **Agentic Delegation UX**: Users experience AI agents not as chat-bots, but as co-pilots executing actual GUI actions in real-time.
- **Transparent Execution Trace**: Instantly bridges any algorithmic decision directly to its underlying tool execution log for total observability.

---

## 10. Settings/Admin/Runtime Control

Required controls:
- Execution rate limiting per agent
- Global switch to disable all mutating tools across the platform in case of hallucination incidents.

---

## 11. Observability and Operations

Required diagnostics:
- Execution failure rates per tool (identifying tools the LLM struggles to parse).
- Stale tools (tools registered but never invoked).
- Server connection health for external MCP providers.

---

## 12. Required Tests

- Tool parameter JSON Schema validation tests.
- Execution logging ingestion tests.
- DAuth enforcement mapping tests (crucial security layer).

---

## 13. Exact Build Instructions

If MCP is missing:
- Build the registry tables.
- Implement the middleware interceptor that translates LLM JSON requests into valid internal Port calls.

---

## 14. Acceptance Criteria

Pass only if:
- Tools are safely registered in DB.
- Agents can retrieve their dynamic capabilities map.
- Every LLM execution writes an immutable trace to the log.
- DAuth actively blocks unauthorized agent commands.

---

## 15. Fail Conditions

FAIL if:
- Agents run with hard-coded root permissions.
- Tool schemas exist purely in text files without database registry governance.
- Mutating actions occur without executing DAuth evaluations.

---

## 16. Recommended Next Part

After this module patch, the next recommended module patch is:
**Module Patch 57 — Executive Module End-to-End**

---

## 17. One-Line Use Instruction

Use this patch to secure the AI infrastructure, guarantee DAuth gating, implement the tool registry, and finalize MCP architecture.
