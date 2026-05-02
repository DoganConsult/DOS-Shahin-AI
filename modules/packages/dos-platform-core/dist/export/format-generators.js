"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.humanizeHeader = humanizeHeader;
exports.escapeXml = escapeXml;
exports.toCSV = toCSV;
exports.toJSON = toJSON;
exports.toXML = toXML;
exports.toXLSX = toXLSX;
exports.buildZipBuffer = buildZipBuffer;
exports.crc32 = crc32;
exports.toPDF = toPDF;
const zlib_1 = require("zlib");
function humanizeHeader(field) {
    return field
        .replace(/_/g, ' ')
        .replace(/\b\w/g, c => c.toUpperCase())
        .replace(/\bId\b/, 'ID')
        .trim();
}
function escapeXml(str) {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
// ── CSV ──────────────────────────────────────────────────────────────────
function toCSV(data, columns) {
    if (data.length === 0)
        return '';
    const headers = columns && columns.length > 0 ? columns : Object.keys(data[0]);
    const escapeCsvField = (val) => {
        if (val === null || val === undefined)
            return '';
        const str = String(val);
        if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
            return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
    };
    const rows = data.map(row => headers.map(col => escapeCsvField(row[col])).join(','));
    // UTF-8 BOM for Excel compatibility with Arabic/Unicode
    return '\uFEFF' + [headers.join(','), ...rows].join('\r\n');
}
// ── JSON ─────────────────────────────────────────────────────────────────
function toJSON(data) {
    return JSON.stringify({ data, exportedAt: new Date().toISOString(), totalRecords: data.length }, null, 2);
}
// ── XML ──────────────────────────────────────────────────────────────────
function toXML(data, moduleCode) {
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += `<export module="${escapeXml(moduleCode)}" exportedAt="${new Date().toISOString()}" totalRecords="${data.length}">\n`;
    for (const row of data) {
        xml += '  <record>\n';
        for (const [key, value] of Object.entries(row)) {
            xml += `    <${key}>${escapeXml(String(value ?? ''))}</${key}>\n`;
        }
        xml += '  </record>\n';
    }
    xml += '</export>';
    return xml;
}
// ── XLSX ─────────────────────────────────────────────────────────────────
function toXLSX(data, columns, sheetName = 'Export') {
    const headers = columns && columns.length > 0 ? columns : (data.length > 0 ? Object.keys(data[0]) : []);
    const headerLabels = headers.map(h => humanizeHeader(h));
    const sheetData = [headerLabels];
    for (const row of data) {
        sheetData.push(headers.map(col => {
            const val = row[col];
            if (val === null || val === undefined)
                return '';
            if (val instanceof Date)
                return val.toISOString();
            return String(val);
        }));
    }
    return buildXLSXBuffer(sheetData, sheetName);
}
function buildXLSXBuffer(rows, sheetName) {
    const sharedStrings = [];
    const ssMap = new Map();
    function addSharedString(s) {
        const existing = ssMap.get(s);
        if (existing !== undefined)
            return existing;
        const idx = sharedStrings.length;
        sharedStrings.push(s);
        ssMap.set(s, idx);
        return idx;
    }
    for (const row of rows) {
        for (const cell of row) {
            addSharedString(cell);
        }
    }
    function colRef(c) {
        let ref = '';
        let n = c;
        while (n >= 0) {
            ref = String.fromCharCode(65 + (n % 26)) + ref;
            n = Math.floor(n / 26) - 1;
        }
        return ref;
    }
    let sheetXml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n';
    sheetXml += '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">';
    // RTL sheet view support — detect Arabic content
    const hasArabic = rows.some(row => row.some(cell => /[\u0600-\u06FF]/.test(cell)));
    if (hasArabic) {
        sheetXml += '<sheetViews><sheetView rightToLeft="1" tabSelected="1" workbookViewId="0"/></sheetViews>';
    }
    sheetXml += `<sheetData>`;
    for (let r = 0; r < rows.length; r++) {
        sheetXml += `<row r="${r + 1}">`;
        for (let c = 0; c < rows[r].length; c++) {
            const ref = `${colRef(c)}${r + 1}`;
            const ssIdx = ssMap.get(rows[r][c]);
            if (r === 0) {
                sheetXml += `<c r="${ref}" t="s" s="1"><v>${ssIdx}</v></c>`;
            }
            else {
                const num = Number(rows[r][c]);
                if (rows[r][c] !== '' && !isNaN(num) && isFinite(num)) {
                    sheetXml += `<c r="${ref}"><v>${num}</v></c>`;
                }
                else {
                    sheetXml += `<c r="${ref}" t="s"><v>${ssIdx}</v></c>`;
                }
            }
        }
        sheetXml += '</row>';
    }
    sheetXml += '</sheetData></worksheet>';
    let ssXml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n';
    ssXml += `<sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" count="${sharedStrings.length}" uniqueCount="${sharedStrings.length}">`;
    for (const s of sharedStrings) {
        ssXml += `<si><t>${escapeXml(s)}</t></si>`;
    }
    ssXml += '</sst>';
    let stylesXml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n';
    stylesXml += '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">';
    stylesXml += '<fonts count="2"><font><sz val="11"/><name val="Calibri"/></font>';
    stylesXml += '<font><b/><sz val="11"/><name val="Calibri"/></font></fonts>';
    stylesXml += '<fills count="2"><fill><patternFill patternType="none"/></fill>';
    stylesXml += '<fill><patternFill patternType="gray125"/></fill></fills>';
    stylesXml += '<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>';
    stylesXml += '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>';
    stylesXml += '<cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>';
    stylesXml += '<xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/></cellXfs>';
    stylesXml += '</styleSheet>';
    const contentTypes = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n' +
        '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
        '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
        '<Default Extension="xml" ContentType="application/xml"/>' +
        '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' +
        '<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>' +
        '<Override PartName="/xl/sharedStrings.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sharedStrings+xml"/>' +
        '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>' +
        '</Types>';
    const rels = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n' +
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
        '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>' +
        '</Relationships>';
    const wbXml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n' +
        '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">' +
        `<sheets><sheet name="${escapeXml(sheetName)}" sheetId="1" r:id="rId1"/></sheets></workbook>`;
    const wbRels = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n' +
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
        '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>' +
        '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/sharedStrings" Target="sharedStrings.xml"/>' +
        '<Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>' +
        '</Relationships>';
    const files = {
        '[Content_Types].xml': contentTypes,
        '_rels/.rels': rels,
        'xl/workbook.xml': wbXml,
        'xl/_rels/workbook.xml.rels': wbRels,
        'xl/worksheets/sheet1.xml': sheetXml,
        'xl/sharedStrings.xml': ssXml,
        'xl/styles.xml': stylesXml,
    };
    return buildZipBuffer(files);
}
function buildZipBuffer(files) {
    const entries = [];
    for (const [name, content] of Object.entries(files)) {
        const data = Buffer.from(content, 'utf-8');
        const crc = crc32(data);
        const compressedData = (0, zlib_1.deflateRawSync)(data);
        entries.push({ name: Buffer.from(name, 'utf-8'), data, crc, compressedData });
    }
    const parts = [];
    const centralDir = [];
    let offset = 0;
    for (const entry of entries) {
        const localHeader = buildLocalFileHeader(entry.name, entry.data.length, entry.compressedData.length, entry.crc);
        parts.push(localHeader, entry.compressedData);
        const cdEntry = buildCentralDirEntry(entry.name, entry.data.length, entry.compressedData.length, entry.crc, offset);
        centralDir.push(cdEntry);
        offset += localHeader.length + entry.compressedData.length;
    }
    const cdStart = offset;
    for (const cd of centralDir) {
        parts.push(cd);
        offset += cd.length;
    }
    const cdSize = offset - cdStart;
    const eocd = buildEndOfCentralDir(entries.length, cdSize, cdStart);
    parts.push(eocd);
    return Buffer.concat(parts);
}
function buildLocalFileHeader(name, size, compSize, crc) {
    const buf = Buffer.alloc(30 + name.length);
    buf.writeUInt32LE(0x04034b50, 0);
    buf.writeUInt16LE(20, 4);
    buf.writeUInt16LE(0, 6);
    buf.writeUInt16LE(8, 8);
    buf.writeUInt16LE(0, 10);
    buf.writeUInt16LE(0, 12);
    buf.writeUInt32LE(crc, 14);
    buf.writeUInt32LE(compSize, 18);
    buf.writeUInt32LE(size, 22);
    buf.writeUInt16LE(name.length, 26);
    buf.writeUInt16LE(0, 28);
    name.copy(buf, 30);
    return buf;
}
function buildCentralDirEntry(name, size, compSize, crc, offset) {
    const buf = Buffer.alloc(46 + name.length);
    buf.writeUInt32LE(0x02014b50, 0);
    buf.writeUInt16LE(20, 4);
    buf.writeUInt16LE(20, 6);
    buf.writeUInt16LE(0, 8);
    buf.writeUInt16LE(8, 10);
    buf.writeUInt16LE(0, 12);
    buf.writeUInt16LE(0, 14);
    buf.writeUInt32LE(crc, 16);
    buf.writeUInt32LE(compSize, 20);
    buf.writeUInt32LE(size, 24);
    buf.writeUInt16LE(name.length, 28);
    buf.writeUInt16LE(0, 30);
    buf.writeUInt16LE(0, 32);
    buf.writeUInt16LE(0, 34);
    buf.writeUInt16LE(0, 36);
    buf.writeUInt32LE(0, 38);
    buf.writeUInt32LE(offset, 42);
    name.copy(buf, 46);
    return buf;
}
function buildEndOfCentralDir(count, cdSize, cdOffset) {
    const buf = Buffer.alloc(22);
    buf.writeUInt32LE(0x06054b50, 0);
    buf.writeUInt16LE(0, 4);
    buf.writeUInt16LE(0, 6);
    buf.writeUInt16LE(count, 8);
    buf.writeUInt16LE(count, 10);
    buf.writeUInt32LE(cdSize, 12);
    buf.writeUInt32LE(cdOffset, 16);
    buf.writeUInt16LE(0, 20);
    return buf;
}
function crc32(buf) {
    let crc = 0xFFFFFFFF;
    for (let i = 0; i < buf.length; i++) {
        crc ^= buf[i];
        for (let j = 0; j < 8; j++) {
            crc = (crc >>> 1) ^ ((crc & 1) ? 0xEDB88320 : 0);
        }
    }
    return (crc ^ 0xFFFFFFFF) >>> 0;
}
// ── PDF with Unicode/Arabic support ──────────────────────────────────────
function containsNonAscii(text) {
    return /[^\x00-\x7F]/.test(text);
}
function utf16BEEncode(str) {
    const buf = Buffer.alloc(str.length * 2);
    for (let i = 0; i < str.length; i++) {
        const code = str.charCodeAt(i);
        buf.writeUInt16BE(code, i * 2);
    }
    return buf;
}
function pdfStringLiteral(text) {
    if (!containsNonAscii(text)) {
        const escaped = text.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
        return `(${escaped})`;
    }
    // Use UTF-16BE with BOM for Unicode text
    const bom = Buffer.from([0xFE, 0xFF]);
    const encoded = utf16BEEncode(text);
    const full = Buffer.concat([bom, encoded]);
    return `<${full.toString('hex').toUpperCase()}>`;
}
function toPDF(data, title, columns, watermark) {
    const headers = columns && columns.length > 0 ? columns : (data.length > 0 ? Object.keys(data[0]) : []);
    const headerLabels = headers.map(h => humanizeHeader(h));
    const lines = [];
    lines.push(title);
    lines.push(`Generated: ${new Date().toISOString()}`);
    lines.push(`Total Records: ${data.length}`);
    if (watermark)
        lines.push(`[${watermark}]`);
    lines.push('');
    lines.push(headerLabels.join(' | '));
    lines.push('-'.repeat(Math.min(headerLabels.join(' | ').length, 120)));
    for (const row of data) {
        const vals = headers.map(col => {
            const val = row[col];
            if (val === null || val === undefined)
                return '';
            return String(val).substring(0, 50);
        });
        lines.push(vals.join(' | '));
    }
    const needsUnicode = lines.some(l => containsNonAscii(l));
    return needsUnicode ? buildUnicodePDFBuffer(lines, title) : buildPDFBuffer(lines, title);
}
function buildPDFBuffer(lines, title) {
    const fontSize = 10;
    const margin = 50;
    const pageWidth = 595;
    const pageHeight = 842;
    const lineHeight = fontSize * 1.4;
    const maxLinesPerPage = Math.floor((pageHeight - 2 * margin) / lineHeight);
    const pages = [];
    for (let i = 0; i < lines.length; i += maxLinesPerPage) {
        pages.push(lines.slice(i, i + maxLinesPerPage));
    }
    if (pages.length === 0)
        pages.push(['No data']);
    const objects = [];
    let objNum = 0;
    function addObj(content) {
        objNum++;
        objects.push(`${objNum} 0 obj\n${content}\nendobj`);
        return objNum;
    }
    const catalogId = addObj('<< /Type /Catalog /Pages 2 0 R >>');
    const pageObjIds = [];
    const contentObjIds = [];
    for (const page of pages) {
        let stream = `BT\n/F1 ${fontSize} Tf\n`;
        let y = pageHeight - margin;
        for (const line of page) {
            const escaped = line.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
            stream += `${margin} ${y} Td\n(${escaped}) Tj\n0 ${-lineHeight} Td\n`;
            y -= lineHeight;
        }
        stream += 'ET';
        const contentId = addObj(`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`);
        contentObjIds.push(contentId);
    }
    const fontId = addObj('<< /Type /Font /Subtype /Type1 /BaseFont /Courier >>');
    for (let i = 0; i < pages.length; i++) {
        const pageId = addObj(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] ` +
            `/Contents ${contentObjIds[i]} 0 R /Resources << /Font << /F1 ${fontId} 0 R >> >> >>`);
        pageObjIds.push(pageId);
    }
    const pagesKids = pageObjIds.map(id => `${id} 0 R`).join(' ');
    objects[1] = `2 0 obj\n<< /Type /Pages /Kids [${pagesKids}] /Count ${pageObjIds.length} >>\nendobj`;
    let pdf = '%PDF-1.4\n';
    const offsets = [];
    for (const obj of objects) {
        offsets.push(pdf.length);
        pdf += obj + '\n';
    }
    const xrefOffset = pdf.length;
    pdf += `xref\n0 ${objects.length + 1}\n`;
    pdf += '0000000000 65535 f \n';
    for (const off of offsets) {
        pdf += `${String(off).padStart(10, '0')} 00000 n \n`;
    }
    pdf += `trailer\n<< /Size ${objects.length + 1} /Root ${catalogId} 0 R >>\n`;
    pdf += `startxref\n${xrefOffset}\n%%EOF`;
    return Buffer.from(pdf, 'utf-8');
}
function buildUnicodePDFBuffer(lines, title) {
    const fontSize = 10;
    const margin = 50;
    const pageWidth = 595;
    const pageHeight = 842;
    const lineHeight = fontSize * 1.4;
    const maxLinesPerPage = Math.floor((pageHeight - 2 * margin) / lineHeight);
    const pages = [];
    for (let i = 0; i < lines.length; i += maxLinesPerPage) {
        pages.push(lines.slice(i, i + maxLinesPerPage));
    }
    if (pages.length === 0)
        pages.push(['No data']);
    // Collect all unique codepoints for the ToUnicode CMap
    const usedCodepoints = new Set();
    for (const line of lines) {
        for (let i = 0; i < line.length; i++) {
            usedCodepoints.add(line.charCodeAt(i));
        }
    }
    // Build a simple CIDFont setup with Identity-H encoding
    // This uses a Type0 composite font with CIDFontType2 descendant
    const objects = [];
    let objNum = 0;
    function addObj(content) {
        objNum++;
        objects.push(`${objNum} 0 obj\n${content}\nendobj`);
        return objNum;
    }
    const catalogId = addObj('<< /Type /Catalog /Pages 2 0 R >>');
    // placeholder for Pages — will be overwritten
    addObj('<< /Type /Pages /Kids [] /Count 0 >>');
    // Build ToUnicode CMap for the used codepoints
    const sortedCodes = Array.from(usedCodepoints).sort((a, b) => a - b);
    let cmapEntries = '';
    const batchSize = 100;
    for (let i = 0; i < sortedCodes.length; i += batchSize) {
        const batch = sortedCodes.slice(i, i + batchSize);
        cmapEntries += `${batch.length} beginbfchar\n`;
        for (const code of batch) {
            const hex4 = code.toString(16).toUpperCase().padStart(4, '0');
            cmapEntries += `<${hex4}> <${hex4}>\n`;
        }
        cmapEntries += 'endbfchar\n';
    }
    const cmapStream = '/CIDInit /ProcSet findresource begin\n' +
        '12 dict begin\n' +
        'begincmap\n' +
        '/CIDSystemInfo << /Registry (Adobe) /Ordering (UCS) /Supplement 0 >> def\n' +
        '/CMapName /Adobe-Identity-UCS def\n' +
        '/CMapType 2 def\n' +
        '1 begincodespacerange\n' +
        '<0000> <FFFF>\n' +
        'endcodespacerange\n' +
        cmapEntries +
        'endcmap\n' +
        'CMapName currentdict /CMap defineresource pop\n' +
        'end\n' +
        'end';
    const cmapObjId = addObj(`<< /Length ${cmapStream.length} >>\nstream\n${cmapStream}\nendstream`);
    // CIDFont descriptor — use Arial as a widely available font
    const descriptorId = addObj('<< /Type /FontDescriptor /FontName /ArialMT /Flags 32 ' +
        '/ItalicAngle 0 /Ascent 905 /Descent -212 /CapHeight 728 ' +
        '/StemV 80 /FontBBox [-665 -325 2000 1006] >>');
    // CIDFont
    const cidFontId = addObj(`<< /Type /Font /Subtype /CIDFontType2 /BaseFont /ArialMT ` +
        `/CIDSystemInfo << /Registry (Adobe) /Ordering (Identity) /Supplement 0 >> ` +
        `/FontDescriptor ${descriptorId} 0 R ` +
        `/DW 600 >>`);
    // Type0 font
    const fontId = addObj(`<< /Type /Font /Subtype /Type0 /BaseFont /ArialMT ` +
        `/Encoding /Identity-H ` +
        `/DescendantFonts [${cidFontId} 0 R] ` +
        `/ToUnicode ${cmapObjId} 0 R >>`);
    // Also define a fallback Type1 Courier for pure ASCII lines
    const fallbackFontId = addObj('<< /Type /Font /Subtype /Type1 /BaseFont /Courier >>');
    const pageObjIds = [];
    const contentObjIds = [];
    for (const page of pages) {
        let stream = 'BT\n';
        let y = pageHeight - margin;
        for (const line of page) {
            const isNonAscii = containsNonAscii(line);
            if (isNonAscii) {
                // Use CIDFont with hex-encoded UTF-16BE string
                const hexStr = utf16BEEncode(line).toString('hex').toUpperCase();
                stream += `/F2 ${fontSize} Tf\n`;
                stream += `${margin} ${y} Td\n<${hexStr}> Tj\n`;
            }
            else {
                const escaped = line.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
                stream += `/F1 ${fontSize} Tf\n`;
                stream += `${margin} ${y} Td\n(${escaped}) Tj\n`;
            }
            y -= lineHeight;
        }
        stream += 'ET';
        const contentId = addObj(`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`);
        contentObjIds.push(contentId);
    }
    for (let i = 0; i < pages.length; i++) {
        const pageId = addObj(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] ` +
            `/Contents ${contentObjIds[i]} 0 R ` +
            `/Resources << /Font << /F1 ${fallbackFontId} 0 R /F2 ${fontId} 0 R >> >> >>`);
        pageObjIds.push(pageId);
    }
    const pagesKids = pageObjIds.map(id => `${id} 0 R`).join(' ');
    objects[1] = `2 0 obj\n<< /Type /Pages /Kids [${pagesKids}] /Count ${pageObjIds.length} >>\nendobj`;
    let pdf = '%PDF-1.4\n%\xE2\xE3\xCF\xD3\n'; // high-byte comment marks it as binary
    const offsets = [];
    for (const obj of objects) {
        offsets.push(pdf.length);
        pdf += obj + '\n';
    }
    const xrefOffset = pdf.length;
    pdf += `xref\n0 ${objects.length + 1}\n`;
    pdf += '0000000000 65535 f \n';
    for (const off of offsets) {
        pdf += `${String(off).padStart(10, '0')} 00000 n \n`;
    }
    pdf += `trailer\n<< /Size ${objects.length + 1} /Root ${catalogId} 0 R >>\n`;
    pdf += `startxref\n${xrefOffset}\n%%EOF`;
    return Buffer.from(pdf, 'binary');
}
//# sourceMappingURL=format-generators.js.map