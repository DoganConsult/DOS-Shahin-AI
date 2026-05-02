import { EventEmitter } from '@angular/core';
export interface DosCarbonTreeNode {
    id: string;
    label: string;
    children?: DosCarbonTreeNode[];
    expanded?: boolean;
    selected?: boolean;
    disabled?: boolean;
    icon?: string;
}
/**
 * Carbon-backed tree view. Hierarchical navigation / explorer.
 */
export declare class DosCarbonTreeviewComponent {
    nodes: DosCarbonTreeNode[];
    label: string;
    hideLabel: boolean;
    multiselect: boolean;
    /** Carbon tree-view supports 'xs' | 'sm' only. */
    size: 'xs' | 'sm';
    select: EventEmitter<DosCarbonTreeNode | DosCarbonTreeNode[]>;
    toggle: EventEmitter<DosCarbonTreeNode>;
}
