// ============================================
// F05-PPTX: PowerPoint Board Pack Generator
// Generates .pptx board presentations from
// board report data using pptxgenjs.
// Bridges gap 5.4 (Area 5 spec).
// ============================================

import PptxGenJS from 'pptxgenjs';
import { generateBoardReport } from './board-report-template.service';
import { safeQuery } from "@dos/db";

const BRAND_BLUE   = '1A3C6E';
const BRAND_ACCENT = '0EA5E9';
const BRAND_WHITE  = 'FFFFFF';
const BRAND_DARK   = '1E293B';
const BRAND_GRAY   = '64748B';

function _hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function addTitleSlide(pptx: PptxGenJS, title: string, period: string): void {
  const slide = pptx.addSlide();
  slide.background = { color: BRAND_BLUE };

  slide.addShape(pptx.ShapeType.rect, {
    x: 0, y: 4.5, w: 10, h: 1.0,
    fill: { color: BRAND_ACCENT },
    line: { color: BRAND_ACCENT },
  });

  slide.addText('AGRC-OS', {
    x: 0.5, y: 0.5, w: 9, h: 0.6,
    fontSize: 14, bold: false, color: BRAND_WHITE,
    fontFace: 'Calibri',
  });

  slide.addText(title, {
    x: 0.5, y: 1.5, w: 9, h: 1.5,
    fontSize: 32, bold: true, color: BRAND_WHITE,
    fontFace: 'Calibri', valign: 'middle',
  });

  slide.addText(`Period: ${period}`, {
    x: 0.5, y: 3.2, w: 9, h: 0.5,
    fontSize: 14, color: 'B0C4D8', fontFace: 'Calibri',
  });

  slide.addText(`Generated: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`, {
    x: 0.5, y: 4.6, w: 9, h: 0.5,
    fontSize: 12, color: BRAND_WHITE, fontFace: 'Calibri',
  });
}

function addSectionSlide(pptx: PptxGenJS, section: { title: string; type: string; data: unknown }): void {
  const slide = pptx.addSlide();
  slide.background = { color: BRAND_WHITE };

  slide.addShape(pptx.ShapeType.rect, {
    x: 0, y: 0, w: 10, h: 0.7,
    fill: { color: BRAND_BLUE },
    line: { color: BRAND_BLUE },
  });

  slide.addText(section.title, {
    x: 0.3, y: 0, w: 9.4, h: 0.7,
    fontSize: 18, bold: true, color: BRAND_WHITE,
    fontFace: 'Calibri', valign: 'middle',
  });

  slide.addShape(pptx.ShapeType.rect, {
    x: 0, y: 0.7, w: 0.05, h: 5.5,
    fill: { color: BRAND_ACCENT },
    line: { color: BRAND_ACCENT },
  });

  switch (section.type) {
    case 'kpi_summary':
      renderKpiSlide(slide, section.data);
      break;
    case 'table':
      renderTableSlide(pptx, slide, (section as any).data);
      break;
    case 'risk_heatmap':
      renderHeatmapSlide(slide, (section as any).data);
      break;
    case 'text':
      slide.addText(String(section.data), {
        x: 0.5, y: 1.0, w: 9, h: 4.5,
        fontSize: 14, color: BRAND_DARK, fontFace: 'Calibri',
        valign: 'top', wrap: true,
      });
      break;
    default:
      slide.addText('Data not renderable in this format.', {
        x: 0.5, y: 1.0, w: 9, h: 1,
        fontSize: 12, color: BRAND_GRAY, italic: true,
      });
  }
}

function renderKpiSlide(slide: PptxGenJS.Slide, data: unknown): void {
  const entries = Object.entries(data || {}).slice(0, 8);
  const colCount = Math.min(4, entries.length);
  const boxW = 2.1;
  const boxH = 1.5;
  const startX = 0.4;
  const startY = 1.0;

  entries.forEach(([key, val], i) => {
    const col = i % colCount;
    const row = Math.floor(i / colCount);
    const x = startX + col * (boxW + 0.2);
    const y = startY + row * (boxH + 0.3);

    slide.addShape('rect' as any, {
      x, y, w: boxW, h: boxH,
      fill: { color: 'F0F7FF' },
      line: { color: BRAND_ACCENT, pt: 1 },
      rectRadius: 0.05,
    });

    slide.addText(String(val ?? '-'), {
      x, y: y + 0.15, w: boxW, h: 0.7,
      fontSize: 24, bold: true, color: BRAND_BLUE,
      fontFace: 'Calibri', align: 'center',
    });

    slide.addText(key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()), {
      x, y: y + 0.9, w: boxW, h: 0.5,
      fontSize: 10, color: BRAND_GRAY,
      fontFace: 'Calibri', align: 'center',
    });
  });
}

function renderTableSlide(pptx: PptxGenJS, slide: PptxGenJS.Slide, rows: unknown[]): void {
  if (!rows?.length) {
    slide.addText('No data available.', {
      x: 0.5, y: 2.0, w: 9, h: 1,
      fontSize: 14, color: BRAND_GRAY, italic: true, align: 'center',
    });
    return;
  }

  const headers = Object.keys(rows[0]);
  const colW = Math.min(2.5, 9.2 / headers.length);
  const tableRows: PptxGenJS.TableRow[] = [
    headers.map(h => ({
      text: h.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
      options: {
        bold: true,
        color: BRAND_WHITE,
        fill: { color: BRAND_BLUE },
        align: 'center' as const,
        fontSize: 10,
      },
    })),
    ...rows.slice(0, 12).map((row, idx) =>
      headers.map(h => ({
        text: String(row[h] ?? '-'),
        options: {
          fill: { color: idx % 2 === 0 ? BRAND_WHITE : 'F8FAFC' },
          color: BRAND_DARK,
          align: 'center' as const,
          fontSize: 9,
        },
      })),
    ),
  ];

  slide.addTable(tableRows, {
    x: 0.4, y: 0.9, w: 9.2,
    border: { pt: 0.5, color: 'E2E8F0' },
    rowH: 0.35,
    colW: headers.map(() => colW),
  });
}

function renderHeatmapSlide(slide: PptxGenJS.Slide, cells: unknown[]): void {
  const cellSize = 0.8;
  const startX = 1.5;
  const startY = 1.0;
  const levels = [1, 2, 3, 4, 5];

  const COLORS: Record<number, string> = {
    2: 'D1FAE5', 4: 'FEF3C7', 6: 'FED7AA',
    8: 'FECACA', 10: 'EF4444',
    3: 'D1FAE5', 5: 'FEF3C7', 7: 'FED7AA',
    9: 'FECACA', 16: 'EF4444', 25: 'B91C1C',
  };

  const heatmap: Record<string, number> = {};
  cells.forEach(c => {

    const k = `${c.likelihood}-${c.impact}`;

    heatmap[k] = (heatmap[k] || 0) + (c.count || 0);
  });

  levels.forEach(lRow => {
    levels.forEach(lCol => {
      const score = lRow * lCol;
      const colorKey = Object.keys(COLORS).map(Number).sort((a, b) => Math.abs(a - score) - Math.abs(b - score))[0];
      const color = COLORS[colorKey] || 'E2E8F0';
      const count = heatmap[`${lRow}-${lCol}`] || 0;
      const x = startX + (lCol - 1) * (cellSize + 0.05);
      const y = startY + (5 - lRow) * (cellSize + 0.05);

      slide.addShape('rect' as any, {
        x, y, w: cellSize, h: cellSize,
        fill: { color },
        line: { color: 'CBD5E1', pt: 0.5 },
      });

      if (count > 0) {
        slide.addText(String(count), {
          x, y, w: cellSize, h: cellSize,
          fontSize: 16, bold: true, color: BRAND_DARK,
          align: 'center', valign: 'middle',
        });
      }
    });
  });

  slide.addText('Likelihood →', {
    x: startX, y: startY + 5 * (cellSize + 0.05) + 0.1, w: 5 * (cellSize + 0.05), h: 0.3,
    fontSize: 9, color: BRAND_GRAY, align: 'center',
  });

  slide.addText('↑ Impact', {
    x: startX - 1.1, y: startY, w: 0.3, h: 5 * (cellSize + 0.05),
    fontSize: 9, color: BRAND_GRAY, align: 'center', rotate: 270,
  });
}

function addAgendaSlide(pptx: PptxGenJS, sections: string[]): void {
  const slide = pptx.addSlide();
  slide.background = { color: BRAND_WHITE };

  slide.addShape(pptx.ShapeType.rect, {
    x: 0, y: 0, w: 10, h: 0.7,
    fill: { color: BRAND_BLUE },
    line: { color: BRAND_BLUE },
  });

  slide.addText('Agenda', {
    x: 0.3, y: 0, w: 9.4, h: 0.7,
    fontSize: 18, bold: true, color: BRAND_WHITE,
    fontFace: 'Calibri', valign: 'middle',
  });

  sections.forEach((s, i) => {
    slide.addText(`${i + 1}. ${s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}`, {
      x: 0.8, y: 1.0 + i * 0.45, w: 8.5, h: 0.4,
      fontSize: 14, color: BRAND_DARK, fontFace: 'Calibri',
    });
  });
}

export async function generatePptxBoardPack(
  tenantId: string,
  templateCode: string,
  period: string,
): Promise<Buffer> {
  const report = await generateBoardReport(tenantId, templateCode, period);

  const pptx = new PptxGenJS();
  pptx.layout = 'LAYOUT_WIDE';
  pptx.author  = 'AGRC-OS Platform';
  pptx.company = 'Shahin-Ai';
  pptx.subject = report.title;
  pptx.title   = report.title;

  addTitleSlide(pptx, report.title, period);
  addAgendaSlide(pptx, report.sections.map(s => s.title));

  for (const section of report.sections) {
    addSectionSlide(pptx, section);
  }

  const buffer = await pptx.write({ outputType: 'nodebuffer' }) as unknown as Buffer;
  return buffer;
}
