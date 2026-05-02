// @ts-nocheck — module-layer imports not yet extracted
// F10 — canonical env-var resolution: prefer OPENFGA_* (DAuth canonical)
// over legacy FGA_* so a single ops provisioning feeds both. All four
// cross-hub fga-client stubs resolve identically to avoid divergence.
import { OpenFgaClient } from '@openfga/sdk';

export const fgaClient = new OpenFgaClient({
  apiUrl: process.env.OPENFGA_API_URL || process.env.FGA_API_URL || 'http://localhost:8080',
  storeId: process.env.OPENFGA_STORE_ID || process.env.FGA_STORE_ID || 'default-store',
  authorizationModelId: process.env.OPENFGA_MODEL_ID || process.env.FGA_MODEL_ID,
});
