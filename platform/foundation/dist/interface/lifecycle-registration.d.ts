import { EntityStateMachine } from '../ports/lifecycle.port';
export declare const FOUNDATION_STATE_MACHINE: EntityStateMachine<"draft" | "in_review" | "approved" | "published" | "active" | "suspended" | "archived">;
