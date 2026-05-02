import { Component, ChangeDetectionStrategy, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GridModule } from 'carbon-components-angular';

/**
 * Carbon Grid system primitives. The Carbon Grid is a 16-column
 * responsive layout with five breakpoints (sm/md/lg/xl/max). All
 * column widths and offsets are declared via the `columnNumbers` /
 * `offsets` Records, e.g. `{ sm: 4, md: 8, lg: 12 }`.
 *
 * Subgrid lets a column inherit its parent grid's tracks — useful for
 * nested layouts that should align to the same gutter rhythm.
 */
@Component({
  selector: 'dos-carbon-grid',
  standalone: true,
  imports: [CommonModule, GridModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      cdsGrid
      [condensed]="condensed"
      [narrow]="narrow"
      [fullWidth]="fullWidth"
    ><ng-content></ng-content></div>
  `,
})
export class DosCarbonGridComponent {
  @Input() condensed = false;
  @Input() narrow = false;
  @Input() fullWidth = false;
}

@Component({
  selector: 'dos-carbon-row',
  standalone: true,
  imports: [CommonModule, GridModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<div cdsRow [condensed]="condensed" [narrow]="narrow"><ng-content></ng-content></div>`,
})
export class DosCarbonRowComponent {
  @Input() condensed = false;
  @Input() narrow = false;
}

/**
 * Carbon `cdsCol` wrapper. Both `columnNumbers` and `offsets` accept
 * breakpoint records. Example:
 *   <dos-carbon-col [columnNumbers]="{ sm: 4, md: 8, lg: 12 }"
 *                   [offsets]="{ md: 0, lg: 2 }">
 */
@Component({
  selector: 'dos-carbon-col',
  standalone: true,
  imports: [CommonModule, GridModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      cdsCol
      [columnNumbers]="columnNumbers"
      [offsets]="offsets"
    ><ng-content></ng-content></div>
  `,
})
export class DosCarbonColComponent {
  @Input() columnNumbers: Record<string, number> = {};
  @Input() offsets: Record<string, number> = {};
}

/**
 * Subgrid wrapper — a Carbon Grid that inherits column tracks from its
 * parent grid context. Carbon's class is `cds--subgrid`. Used for
 * nested layouts that should respect the outer gutter.
 */
@Component({
  selector: 'dos-carbon-subgrid',
  standalone: true,
  imports: [CommonModule, GridModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      cdsGrid
      class="cds--subgrid"
      [class.cds--subgrid--wide]="wide"
      [class.cds--subgrid--narrow]="narrow"
      [class.cds--subgrid--condensed]="condensed"
    ><ng-content></ng-content></div>
  `,
})
export class DosCarbonSubgridComponent {
  @Input() wide = false;
  @Input() narrow = false;
  @Input() condensed = false;
}
