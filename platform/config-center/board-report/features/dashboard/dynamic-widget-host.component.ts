import {
  Component,
  Input,
  OnChanges,
  SimpleChanges,
  Type,
  ViewChild,
  ViewContainerRef, ChangeDetectionStrategy} from '@angular/core';
import { CommonModule } from '@angular/common';
import { DASHBOARD_WIDGET_COMPONENTS } from '../../../../core/platform/widgets';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-dynamic-widget-host',
    imports: [CommonModule],
    template: `<ng-container #vc></ng-container>`
})
export class DynamicWidgetHostComponent implements OnChanges {
  @Input() componentKey!: string;
  @Input() config: Record<string, unknown> = {};

  @ViewChild('vc', { read: ViewContainerRef, static: true })
  vc!: ViewContainerRef;

  ngOnChanges(changes: SimpleChanges): void {
    this.render();
  }

  private render() {
    this.vc.clear();

    const component = DASHBOARD_WIDGET_COMPONENTS[this.componentKey];
    if (!component) return;

    const ref = this.vc.createComponent(component as Type<any>);
    if ('config' in ref.instance) {
      ref.instance.config = this.config;
    }
  }
}
