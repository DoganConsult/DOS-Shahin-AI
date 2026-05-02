// Typed manifest helper — re-exports module.manifest.json with strong types.
// Resolves the `./manifest` subpath in package.json exports.
import manifest from './module.manifest.json';

export default manifest;
export { manifest };
export type FoundationManifest = typeof manifest;
