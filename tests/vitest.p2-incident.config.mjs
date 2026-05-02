import { defineConfig } from 'vitest/config';
export default defineConfig({
  test: {
    include: ['modules/incident/source/backend/incident/events/incident.foundation-manager-changed.test.ts'],
    environment: 'node',
  },
});
