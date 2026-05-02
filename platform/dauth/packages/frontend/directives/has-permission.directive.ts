import { Directive, Input, TemplateRef, ViewContainerRef, inject, OnInit } from '@angular/core';
import { AccessStore } from '../access/access.store';

@Directive({
  selector: '[appHasPermission]',
  standalone: true,
})
export class HasPermissionDirective implements OnInit {
  private templateRef = inject(TemplateRef<any>);
  private viewContainer = inject(ViewContainerRef);
  private accessStore = inject(AccessStore);
  private _shown = false;

  @Input('appHasPermission') permission = '';

  ngOnInit(): void {
    this.update();
  }

  private update(): void {
    const allowed = !this.permission || this.accessStore.hasPermission(this.permission);
    if (allowed && !this._shown) {
      this.viewContainer.createEmbeddedView(this.templateRef);
      this._shown = true;
    } else if (!allowed && this._shown) {
      this.viewContainer.clear();
      this._shown = false;
    }
  }
}
