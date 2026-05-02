"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.computeRetryDelay = computeRetryDelay;
exports.setSearchProvider = setSearchProvider;
exports.search = search;
exports.recordSearch = recordSearch;
exports.getRecentSearches = getRecentSearches;
exports.saveSearch = saveSearch;
exports.getSavedSearches = getSavedSearches;
exports.deleteSavedSearch = deleteSavedSearch;
function computeRetryDelay(attempt, baseMs = 1000) {
    return Math.min(baseMs * Math.pow(2, attempt), 30000);
}
let _search = null;
function setSearchProvider(impl) {
    _search = impl;
}
function getSearch() {
    if (!_search) {
        throw new Error('PlatformSearch not initialized. Call setSearchProvider() first.');
    }
    return _search;
}
function search(opts) {
    return getSearch().search(opts);
}
function recordSearch(tenantId, userId, query) {
    return getSearch().recordSearch(tenantId, userId, query);
}
function getRecentSearches(tenantId, userId, limit) {
    return getSearch().getRecentSearches(tenantId, userId, limit);
}
function saveSearch(tenantId, userId, name, opts) {
    return getSearch().saveSearch(tenantId, userId, name, opts);
}
function getSavedSearches(tenantId, userId) {
    return getSearch().getSavedSearches(tenantId, userId);
}
function deleteSavedSearch(tenantId, userId, searchId) {
    return getSearch().deleteSavedSearch(tenantId, userId, searchId);
}
//# sourceMappingURL=search.js.map