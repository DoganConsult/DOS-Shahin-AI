import { describe, expect, it } from 'vitest';
import { SIGNATURE_WIDGET_CATALOG } from '@dynamic-ui-module/ui';
import { WIDGET_KEY_MAP, resolveWidgetComponent } from './widget-key-map';

describe('widget-key-map', () => {
  it('covers every canonical signature widget from the Dynamic UI module', () => {
    const missing = SIGNATURE_WIDGET_CATALOG
      .map(widget => widget.widgetKey)
      .filter(widgetKey => !(widgetKey in WIDGET_KEY_MAP));

    expect(missing).toEqual([]);
  });

  it('resolves a loader for every canonical signature widget', () => {
    for (const widget of SIGNATURE_WIDGET_CATALOG) {
      expect(resolveWidgetComponent(widget.widgetKey)).toBeTypeOf('function');
    }
  });
});