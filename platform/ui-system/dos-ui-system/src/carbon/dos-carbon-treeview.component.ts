import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TreeviewModule } from 'carbon-components-angular';

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
@Component({
  selector: 'dos-carbon-treeview',
  standalone: true,
  imports: [CommonModule, TreeviewModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <cds-tree-view
      [tree]="nodes"
      [size]="size"
      [label]="label"
      [hideLabel]="hideLabel"
      [isMultiSelect]="multiselect"
      (select)="select.emit($event)"
      (toggle)="toggle.emit($event)"
    ></cds-tree-view>
  `,
})
export class DosCarbonTreeviewComponent {
  @Input() nodes: DosCarbonTreeNode[] = [];
  @Input() label = '';
  @Input() hideLabel = false;
  @Input() multiselect = false;
  /** Carbon tree-view supports 'xs' | 'sm' only. */
  @Input() size: 'xs' | 'sm' = 'sm';
  @Output() select = new EventEmitter<DosCarbonTreeNode | DosCarbonTreeNode[]>();
  @Output() toggle = new EventEmitter<DosCarbonTreeNode>();
}
