import { InjectionToken } from '@angular/core';
import { WidgetManifest } from '../models/widget-manifest.model';
import { DashboardWidgetInstance } from '../models/widget-instance.model';
import { WidgetRenderContext } from '../models/widget-context.model';

export const WIDGET_MANIFEST = new InjectionToken<WidgetManifest>('WIDGET_MANIFEST');
export const WIDGET_INSTANCE = new InjectionToken<DashboardWidgetInstance>('WIDGET_INSTANCE');
export const WIDGET_CONTEXT = new InjectionToken<WidgetRenderContext>('WIDGET_CONTEXT');
