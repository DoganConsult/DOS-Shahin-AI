/**
 * Carbon-backed link wrapper. Visited / inline / disabled / size variants.
 */
export declare class DosCarbonLinkComponent {
    href: string;
    target: '_self' | '_blank' | '_parent' | '_top';
    rel: string;
    size: 'sm' | 'md' | 'lg';
    inline: boolean;
    disabled: boolean;
    visited: boolean;
}
