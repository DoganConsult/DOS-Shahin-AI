import { Directive, ViewContainerRef } from '@angular/core';

@Directive({
  selector: '[appWidgetHost]',
  standalone: true,
})
export class WidgetHostDirective {
  constructor(public viewContainerRef: ViewContainerRef) {}
}
