import type { ApprovedComponentKey } from './component-keys.js';
import type { ResponsiveContract } from './responsive-contract.js';
import type { ActionContract } from './action-contract.js';
export interface PageContract extends ResponsiveContract {
    pageCode: string;
    moduleCode: string;
    titleKey: string;
    descriptionKey?: string;
    /** Approved component keys this page is allowed to render. */
    componentKeys: ApprovedComponentKey[];
    /** Page-level command-bar / header actions. */
    actions?: ActionContract[];
    /** Permission codes required to open the page (dot-style only). */
    permissions?: string[];
}
