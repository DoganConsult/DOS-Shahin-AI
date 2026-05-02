import { defineConfig } from 'vitest/config';
export default defineConfig({
  test: { include: ['modules/attestation/source/backend/attestation/events/attestation.foundation-position-assigned.test.ts'], environment: 'node' },
});
