import { EnvironmentProviders, makeEnvironmentProviders, APP_INITIALIZER } from '@angular/core';
import { WidgetRegistryService } from '@app/shared/widgets/widget-core/widget-infra/widget-registry.service';
import { ALL_WIDGET_MANIFESTS, LEGACY_ID_MAP } from '@app/shared/widgets/catalog';

function initializeWidgets(registry: WidgetRegistryService): () => void {
  return () => {
    registry.registerMany(ALL_WIDGET_MANIFESTS);
    for (const [legacyId, newId] of Object.entries(LEGACY_ID_MAP)) {
      registry.registerLegacyId(legacyId, newId);
    }
  };
}

export function provideWidgetRegistry(): EnvironmentProviders {
  return makeEnvironmentProviders([
    {
      provide: APP_INITIALIZER,
      multi: true,
      useFactory: initializeWidgets,
      deps: [WidgetRegistryService],
    },
  ]);
}
