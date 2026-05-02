import { WidgetManifest } from '../models/widget-manifest.model';

/** Convert old defaultWidth (1-4) to grid cols (3/4/6/12). */
export function legacyWidthToCols(width: number): number {
  switch (width) {
    case 1: return 3;
    case 2: return 6;
    case 3: return 9;
    case 4: return 12;
    default: return 6;
  }
}

/** Convert old defaultHeight (1-3) to grid rows. */
export function legacyHeightToRows(height: number): number {
  return height;
}

/** Search manifests by text query across id, title, description, tags. */
export function searchManifests(manifests: WidgetManifest[], query: string): WidgetManifest[] {
  const q = query.toLowerCase();
  return manifests.filter(m =>
    m.id.toLowerCase().includes(q) ||
    m.title.toLowerCase().includes(q) ||
    m.key.toLowerCase().includes(q) ||
    m.description?.toLowerCase().includes(q) ||
    m.tags?.some(t => t.toLowerCase().includes(q))
  );
}
