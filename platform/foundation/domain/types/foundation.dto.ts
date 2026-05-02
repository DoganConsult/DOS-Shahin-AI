/**
 * Backend internal Foundation DTOs.
 *
 * Canonical definitions live in `modules/foundation/source/contracts/foundation.dto.ts`.
 * Re-exported here so internal code keeps importing from `./types/...`.
 * Cross-module consumers MUST import from `@dos/module-foundation/contracts`.
 */
export type {
  FoundationNodeCreateDTO,
  FoundationNodeUpdateDTO,
  FoundationNodeResponseDTO,
  FoundationTreeResponseDTO,
  FoundationListQueryDTO,
  FoundationListResponseDTO,
  FoundationDiagnosticsDTO,
} from '../../contracts/foundation.dto';
