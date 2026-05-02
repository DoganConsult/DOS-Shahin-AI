"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setProductIdentity = setProductIdentity;
exports.setBrandingProvider = setBrandingProvider;
exports.getProductName = getProductName;
exports.getProductUrl = getProductUrl;
let _branding = null;
function setProductIdentity(identity) {
    if (_branding) {
        _branding.setProductIdentity(identity);
    }
    else {
        _defaultIdentity = identity;
    }
}
function setBrandingProvider(impl) {
    _branding = impl;
}
let _defaultIdentity = {
    name: process.env.PLATFORM_NAME || 'Shahin-AI',
    url: process.env.PLATFORM_URL || 'https://platform.local',
};
function getBranding() {
    if (!_branding) {
        return {
            getProductName: () => _defaultIdentity.displayName || _defaultIdentity.name,
            getProductUrl: () => _defaultIdentity.url || '',
            setProductIdentity: (id) => { _defaultIdentity = id; },
        };
    }
    return _branding;
}
function getProductName() {
    return getBranding().getProductName();
}
function getProductUrl() {
    return getBranding().getProductUrl();
}
//# sourceMappingURL=branding.js.map