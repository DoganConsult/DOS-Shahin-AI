export interface ProductIdentity {
  name: string;
  displayName?: string;
  url?: string;
  logoUrl?: string;
  supportEmail?: string;
}

export interface PlatformBranding {
  getProductName(): string;
  getProductUrl(): string;
  setProductIdentity(identity: ProductIdentity): void;
}

let _branding: PlatformBranding | null = null;

export function setProductIdentity(identity: ProductIdentity): void {
  if (_branding) {
    _branding.setProductIdentity(identity);
  } else {
    _defaultIdentity = identity;
  }
}

export function setBrandingProvider(impl: PlatformBranding): void {
  _branding = impl;
}

let _defaultIdentity: ProductIdentity = {
  name: process.env.PLATFORM_NAME || 'Shahin-AI',
  url: process.env.PLATFORM_URL || 'https://platform.local',
};

function getBranding(): PlatformBranding {
  if (!_branding) {
    return {
      getProductName: () => _defaultIdentity.displayName || _defaultIdentity.name,
      getProductUrl: () => _defaultIdentity.url || '',
      setProductIdentity: (id) => { _defaultIdentity = id; },
    };
  }
  return _branding;
}

export function getProductName(): string {
  return getBranding().getProductName();
}

export function getProductUrl(): string {
  return getBranding().getProductUrl();
}
