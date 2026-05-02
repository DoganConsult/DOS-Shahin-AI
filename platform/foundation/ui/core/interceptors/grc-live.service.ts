// Re-export through Foundation's own port interface so consuming pages
// never reach into the product-layer @app/* path.
export {
  FOUNDATION_GRC_LIVE as GrcLiveService,
  NoopFoundationGrcLive as GrcEntity,
  type FoundationGrcLive,
  type FoundationGrcEntity,
} from '../ports/grc-live.port';
