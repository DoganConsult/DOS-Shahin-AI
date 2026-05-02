import { InjectionToken, Type } from '@angular/core';
import type {
  ModuleContentProviderContract,
  ModuleWidgetRegistration,
  ModuleFormRegistration,
  ModuleViewRegistration,
  ModuleActionRegistration,
  ModuleDetailRegistration,
} from '../../../shared/contracts/shell-engine.contracts';

export const MODULE_CONTENT_PROVIDERS = new InjectionToken<ModuleContentProvider[]>('MODULE_CONTENT_PROVIDERS');

export abstract class ModuleContentProvider implements ModuleContentProviderContract {
  abstract moduleCode: string;
  abstract widgets: ModuleWidgetRegistration[];
  abstract forms: ModuleFormRegistration[];
  abstract views: ModuleViewRegistration[];
  abstract actions: ModuleActionRegistration[];
  abstract detailComponents: ModuleDetailRegistration[];

  getWidget(widgetId: string): ModuleWidgetRegistration | undefined {
    return this.widgets.find(w => w.widgetId === widgetId);
  }

  getView(viewId: string): ModuleViewRegistration | undefined {
    return this.views.find(v => v.viewId === viewId);
  }

  getForm(formId: string): ModuleFormRegistration | undefined {
    return this.forms.find(f => f.formId === formId);
  }

  getAction(actionId: string): ModuleActionRegistration | undefined {
    return this.actions.find(a => a.actionId === actionId);
  }

  getDetail(detailId: string): ModuleDetailRegistration | undefined {
    return this.detailComponents.find(d => d.detailId === detailId);
  }

  getActionsForPosition(position: ModuleActionRegistration['position']): ModuleActionRegistration[] {
    return this.actions.filter(a => a.position === position);
  }

  getWidgetsForZone(zone: string): ModuleWidgetRegistration[] {
    return this.widgets.filter(w => w.defaultZone === zone);
  }
}

export class ContentProviderRegistry {
  private readonly providers = new Map<string, ModuleContentProvider>();

  register(provider: ModuleContentProvider): void {
    this.providers.set(provider.moduleCode, provider);
  }

  get(moduleCode: string): ModuleContentProvider | undefined {
    return this.providers.get(moduleCode);
  }

  getAll(): ModuleContentProvider[] {
    return Array.from(this.providers.values());
  }

  has(moduleCode: string): boolean {
    return this.providers.has(moduleCode);
  }
}

export const CONTENT_PROVIDER_REGISTRY = new InjectionToken<ContentProviderRegistry>('CONTENT_PROVIDER_REGISTRY', {
  providedIn: 'root',
  factory: () => new ContentProviderRegistry(),
});
