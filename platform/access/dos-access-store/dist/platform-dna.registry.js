// Platform DNA registry — the modules under platform/<x>/ that surface
// in workspace nav via their L2 DNA nav contracts + health probes.
//
// Foundation is currently the only DNA module with:
//   (a) a registered nav contract loader (SHAHIN_DNA_NAV_LOADERS)
//   (b) a health endpoint returning status:'up'
//
// All other modules (dauth, dnoc, dsoc, dos, ai) now surface via L1
// (dos.dynamic_ui_routes) and have no L2 loader registered. Remove them
// from this list to stop 5 dead health probe requests on every load.
// Re-add when their health endpoints land and L2 loaders are re-registered.
export const DNA_MODULE_CODES = [
    'foundation',
];
//# sourceMappingURL=platform-dna.registry.js.map