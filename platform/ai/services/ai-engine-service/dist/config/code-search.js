import fs from 'node:fs';
import path from 'node:path';
function parseBoolean(value, fallback) {
    if (value === undefined)
        return fallback;
    return value === '1' || value.toLowerCase() === 'true' || value.toLowerCase() === 'yes';
}
function findRepoRoot() {
    let dir = process.cwd();
    for (let i = 0; i < 12; i++) {
        const marker = path.join(dir, 'pnpm-workspace.yaml');
        if (fs.existsSync(marker))
            return dir;
        const parent = path.dirname(dir);
        if (parent === dir)
            break;
        dir = parent;
    }
    return process.cwd();
}
export function getCodeSearchConfig() {
    const repoRoot = findRepoRoot();
    const localEnabled = parseBoolean(process.env.CODE_SEARCH_LOCAL_ENABLED, true);
    return {
        zoekt: {
            name: 'Zoekt',
            type: 'trigram',
            url: process.env.ZOEKT_URL || '',
            enabled: parseBoolean(process.env.ZOEKT_ENABLED, false),
            searchEndpoint: process.env.ZOEKT_SEARCH_ENDPOINT || '/search',
            healthEndpoint: process.env.ZOEKT_HEALTH_ENDPOINT || '/',
        },
        hound: {
            name: 'Hound',
            type: 'regex',
            url: process.env.HOUND_URL || '',
            enabled: parseBoolean(process.env.HOUND_ENABLED, false),
            searchEndpoint: process.env.HOUND_SEARCH_ENDPOINT || '/api/v1/search',
            healthEndpoint: process.env.HOUND_HEALTH_ENDPOINT || '/',
        },
        seagoat: {
            name: 'SeaGOAT',
            type: 'semantic',
            url: process.env.SEAGOAT_URL || '',
            enabled: parseBoolean(process.env.SEAGOAT_ENABLED, false),
            searchEndpoint: process.env.SEAGOAT_SEARCH_ENDPOINT || '/search',
            healthEndpoint: process.env.SEAGOAT_HEALTH_ENDPOINT || '/health',
        },
        opengrok: {
            name: 'OpenGrok',
            type: 'enterprise',
            url: process.env.OPENGROK_URL || '',
            enabled: parseBoolean(process.env.OPENGROK_ENABLED, false),
            searchEndpoint: process.env.OPENGROK_SEARCH_ENDPOINT || '/api/v1/search',
            healthEndpoint: process.env.OPENGROK_HEALTH_ENDPOINT || '/',
        },
        codesearch: {
            name: 'Code-Search',
            type: 'ui',
            url: `file://${repoRoot}`,
            enabled: localEnabled,
            searchEndpoint: 'local',
            healthEndpoint: 'local',
            indexedSurfaces: [
                'packages',
                'services',
                'modules',
                'frontend',
                'platform',
                'migration',
                'ops',
                'docs',
                'tests',
            ],
            config: {
                repoRoot,
                maxFiles: parseInt(process.env.CODE_SEARCH_LOCAL_MAX_FILES || '6000', 10),
                maxFileBytes: parseInt(process.env.CODE_SEARCH_LOCAL_MAX_FILE_BYTES || '200000', 10),
            },
        },
    };
}
export function getEnabledEngines() {
    const cfg = getCodeSearchConfig();
    return Object.keys(cfg)
        .filter((k) => cfg[k].enabled)
        .map((k) => ({ engine: k, ...cfg[k] }));
}
//# sourceMappingURL=code-search.js.map