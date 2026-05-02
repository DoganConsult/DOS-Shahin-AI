// Local proxy — canonical file lives at backend/integrations/services/
// but consumers in backend/incident/services/incident/ expect the file one
// level shallower via `../../integrations/...`. This proxy bridges the
// path without duplicating the implementation.
export * from '../../../integrations/services/integration-config-resolver.service';
