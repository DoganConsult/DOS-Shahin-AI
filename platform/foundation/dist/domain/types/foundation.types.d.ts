/**
 * Backend internal Foundation types.
 *
 * Public types live in `modules/foundation/source/contracts/foundation.types.ts`
 * and are re-exported here so internal code keeps importing from `./types/...`
 * without changing call sites. Cross-module consumers MUST import from
 * `@dos/module-foundation/contracts` instead of this file.
 */
export type { FoundationEntityType, FoundationStatus, FoundationNode, FoundationEventPayload, } from '../../contracts/foundation.types';
