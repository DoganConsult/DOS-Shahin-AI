import { Injectable } from '@angular/core';
import { WidgetManifest } from '../../widgets/widget-core/core/models/widget-manifest.model';

@Injectable({ providedIn: 'root' })
export class WidgetRegistryService {
  private readonly registry = new Map<string, WidgetManifest>();
  private readonly keyIndex = new Map<string, string>();
  private readonly legacyIdMap = new Map<string, string>();

  register(manifest: WidgetManifest): void {
    this.registry.set(manifest.id, manifest);
    this.keyIndex.set(manifest.key, manifest.id);
  }

  registerMany(manifests: WidgetManifest[]): void {
    for (const manifest of manifests) {
      this.register(manifest);
    }
  }

  registerLegacyId(legacyId: string, canonicalId: string): void {
    this.legacyIdMap.set(legacyId, canonicalId);
  }

  get(widgetId: string): WidgetManifest | undefined {
    return this.registry.get(this.resolveId(widgetId));
  }

  getByKey(widgetKey: string): WidgetManifest | undefined {
    const canonicalId = this.keyIndex.get(widgetKey);
    return canonicalId ? this.registry.get(canonicalId) : this.get(widgetKey);
  }

  list(): WidgetManifest[] {
    return Array.from(this.registry.values());
  }

  getAll(): WidgetManifest[] {
    return this.list();
  }

  has(widgetId: string): boolean {
    return this.registry.has(this.resolveId(widgetId));
  }

  getByCategory(category: string): WidgetManifest[] {
    return this.list().filter(widget => widget.category === category);
  }

  private resolveId(widgetId: string): string {
    return this.legacyIdMap.get(widgetId) ?? widgetId;
  }
}
