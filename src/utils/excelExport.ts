import ExcelJS from 'exceljs';

export interface MeetingMeta {
  title: string;
  date: string;
  attendees: string;
  recorder: string;
}

export interface MeetingTrackingItem {
  id: number;
  date: string;
  summary: string;
  owner: string;
  estimatedDate: string;
  trackingStatus: string;
  isCompleted: string; // 'V' or ''
  isFollowUp: string;  // 'V' or ''
}

export interface FormattedMeetingData {
  meta: MeetingMeta;
  items: MeetingTrackingItem[];
  clarificationItems: MeetingTrackingItem[];
  riskItems: MeetingTrackingItem[];
}

/**
 * Clean markdown text formatting (remove **, *, __, `, etc.)
 */
export function cleanMarkdownText(text: string): string {
  if (!text) return '';
  return text
    .replace(/\*\*(.*?)\*\*/g, '$1') // bold
    .replace(/\*(.*?)\*/g, '$1')     // italic
    .replace(/__(.*?)__/g, '$1')     // bold
    .replace(/_(.*?)_/g, '$1')       // italic
    .replace(/`(.*?)`/g, '$1')       // inline code
    .replace(/\[(.*?)\]\(.*?\)/g, '$1') // links
    .trim();
}

/**
 * Parses markdown meeting analysis report into structured metadata and tracking items
 */
export function parseMeetingData(markdown: string): FormattedMeetingData {
  const lines = markdown.split('\n');

  let title = '';
  let date = '';
  let attendees = '';
  let recorder = '俊傑'; // Default as in official template

  // 1. Extract Meta
  for (const line of lines) {
    const trimmed = line.trim();
    const clean = cleanMarkdownText(trimmed);

    // Title match
    if (!title) {
      if (/^#+\s+(.+)/.test(trimmed)) {
        const match = trimmed.match(/^#+\s+(.+)/);
        if (match && match[1]) {
          title = cleanMarkdownText(match[1]).replace(/[\\/:*?"<>|]/g, '').trim();
        }
      } else if (/(?:會議主題|會議名稱|主題)\s*[:：]\s*(.+)/i.test(clean)) {
        const match = clean.match(/(?:會議主題|會議名稱|主題)\s*[:：]\s*(.+)/i);
        if (match && match[1]) {
          title = match[1].trim();
        }
      }
    }

    // Date match
    if (!date) {
      if (/(?:會議日期|日期|時間)\s*[:：]\s*([0-9\/\-\.年\s月\s日]+)/i.test(clean)) {
        const match = clean.match(/(?:會議日期|日期|時間)\s*[:：]\s*([0-9\/\-\.年\s月\s日]+)/i);
        if (match && match[1]) {
          date = match[1].trim();
        }
      } else {
        const dateMatch = clean.match(/(\d{4}[\/\-\.]\d{1,2}[\/\-\.]\d{1,2})/);
        if (dateMatch && dateMatch[1]) {
          date = dateMatch[1].replace(/-/g, '/');
        }
      }
    }

    // Attendees match
    if (!attendees) {
      if (/(?:出席人員|與會者|參與者|出席者|成員)\s*[:：]\s*(.+)/i.test(clean)) {
        const match = clean.match(/(?:出席人員|與會者|參與者|出席者|成員)\s*[:：]\s*(.+)/i);
        if (match && match[1]) {
          attendees = match[1].trim();
        }
      }
    }

    // Recorder match
    if (/(?:會議記錄|會議紀錄|紀錄|記錄人員|記錄)\s*[:：]\s*(.+)/i.test(clean)) {
      const match = clean.match(/(?:會議記錄|會議紀錄|紀錄|記錄人員|記錄)\s*[:：]\s*(.+)/i);
      if (match && match[1] && !match[1].includes('重點') && !match[1].includes('建議')) {
        const rec = match[1].trim();
        if (rec.length <= 15) {
          recorder = rec;
        }
      }
    }
  }

  // Fallback defaults
  if (!title) {
    title = '專案進度會議';
  }
  if (!date) {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    date = `${yyyy}/${mm}/${dd}`;
  }

  // 2. Parse Markdown Tables
  const parseTableFromSection = (sectionKeywords: RegExp[]): string[][] => {
    let isInSection = false;
    const tableLines: string[] = [];

    for (const line of lines) {
      const trimmed = line.trim();

      if (trimmed.startsWith('#') || /^([一二三四五六七八九十0-9]+[、.])/i.test(trimmed)) {
        if (sectionKeywords.some(re => re.test(trimmed))) {
          isInSection = true;
          continue;
        } else if (isInSection && trimmed.startsWith('#')) {
          break; // Next major section reached
        }
      }

      if (isInSection) {
        if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
          // Check if separator
          if (!/^\|[\s\-:]+(\|[\s\-:]+)+\|$/.test(trimmed)) {
            const cells = trimmed
              .slice(1, -1)
              .split('|')
              .map(c => cleanMarkdownText(c));
            tableLines.push(JSON.stringify(cells));
          }
        }
      }
    }

    if (tableLines.length <= 1) return [];
    // First row is headers, remaining are data rows
    return tableLines.slice(1).map(s => JSON.parse(s));
  };

  // Extract Action items
  const actionItemRows = parseTableFromSection([/執行項目/i, /Action Item/i, /任務總表/i, /Task/i]);
  const clarificationRows = parseTableFromSection([/待釐清/i, /釐清問題/i, /待確認/i]);
  const riskRows = parseTableFromSection([/風險/i, /阻礙/i, /Risk/i]);

  const items: MeetingTrackingItem[] = [];

  if (actionItemRows.length > 0) {
    actionItemRows.forEach((row, idx) => {
      // Normal Gemini columns: [編號, 執行項目, Owner, Due Date, 優先級, 狀態, 注意事項, 依據來源]
      const summary = row[1] || row[0] || '';
      const owner = row[2] || '';
      const estimatedDate = row[3] || '';
      const status = row[5] || '';
      const notes = row[6] || '';
      
      const trackingStatus = [status, notes].filter(Boolean).join(' - ') || '進行中';
      const isCompleted = /已完成|完成|done|resolved/i.test(status) ? 'V' : '';
      const isFollowUp = isCompleted === 'V' ? '' : 'V';

      if (summary) {
        items.push({
          id: idx + 1,
          date: date,
          summary,
          owner,
          estimatedDate,
          trackingStatus,
          isCompleted,
          isFollowUp,
        });
      }
    });
  }

  // If no action items found, extract from decisions or create a placeholder row
  if (items.length === 0) {
    items.push({
      id: 1,
      date: date,
      summary: '確認專案工作項目與排程規劃',
      owner: attendees ? attendees.split(/[,、\s]/)[0] || '專案負責人' : '負責人員',
      estimatedDate: '會議後一週內',
      trackingStatus: '持續追蹤進度',
      isCompleted: '',
      isFollowUp: 'V',
    });
  }

  // Clarifications
  const clarificationItems: MeetingTrackingItem[] = clarificationRows.map((row, idx) => ({
    id: idx + 1,
    date: date,
    summary: `【待釐清】${row[1] || row[0] || ''}`,
    owner: row[3] || '',
    estimatedDate: '待確認',
    trackingStatus: [row[2] ? `影響範圍: ${row[2]}` : '', row[4] ? `建議處理: ${row[4]}` : ''].filter(Boolean).join('；'),
    isCompleted: '',
    isFollowUp: 'V',
  }));

  // Risks
  const riskItems: MeetingTrackingItem[] = riskRows.map((row, idx) => ({
    id: idx + 1,
    date: date,
    summary: `【風險阻礙】${row[1] || row[0] || ''}`,
    owner: '專案團隊',
    estimatedDate: '持續評估',
    trackingStatus: [row[2] ? `說明: ${row[2]}` : '', row[4] ? `因應對策: ${row[4]}` : '', row[5] ? `等級: ${row[5]}` : ''].filter(Boolean).join('；'),
    isCompleted: '',
    isFollowUp: 'V',
  }));

  return {
    meta: {
      title,
      date,
      attendees,
      recorder,
    },
    items,
    clarificationItems,
    riskItems,
  };
}

/**
 * Applies professional corporate Excel styling matching the uploaded image:
 * - Row 1: Merged Title (會議名稱＋會議記錄)
 * - Row 2: 出席人員 (Cols A-F) & 會議紀錄 : 記錄者 (Cols G-H, Blue text)
 * - Row 3: Blue Headers (項次, 日期, 會議摘要, 負責人員, 預計, 追蹤情形, 決議完成, 持續追蹤)
 * - Row 4+: Data rows with borders, centered alignments, and wrap text
 */
function applyMeetingTableToWorksheet(
  worksheet: ExcelJS.Worksheet,
  meta: MeetingMeta,
  items: MeetingTrackingItem[],
  customHeaderTitle?: string
) {
  // 1. Setup Column Definitions
  worksheet.columns = [
    { key: 'col1', width: 9 },   // 項次
    { key: 'col2', width: 16 },  // 日期
    { key: 'col3', width: 44 },  // 會議摘要
    { key: 'col4', width: 16 },  // 負責人員
    { key: 'col5', width: 18 },  // 預計
    { key: 'col6', width: 34 },  // 追蹤情形
    { key: 'col7', width: 14 },  // 決議完成
    { key: 'col8', width: 14 },  // 持續追蹤
  ];

  const thinBorder: Partial<ExcelJS.Borders> = {
    top: { style: 'thin', color: { argb: 'FF000000' } },
    left: { style: 'thin', color: { argb: 'FF000000' } },
    bottom: { style: 'thin', color: { argb: 'FF000000' } },
    right: { style: 'thin', color: { argb: 'FF000000' } },
  };

  // Row 1: Top Title Bar (Merged A1:H1)
  const fullTitle = customHeaderTitle || (meta.title.includes('會議記錄') || meta.title.includes('會議紀錄') 
    ? meta.title 
    : `${meta.title}＋會議記錄`);

  worksheet.mergeCells('A1:H1');
  const titleRow = worksheet.getRow(1);
  titleRow.height = 36;
  const titleCell = worksheet.getCell('A1');
  titleCell.value = fullTitle;
  titleCell.font = {
    name: 'Microsoft JhengHei',
    size: 16,
    bold: true,
    color: { argb: 'FF000000' },
  };
  titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
  
  // Set borders for row 1 merged range
  for (let c = 1; c <= 8; c++) {
    titleRow.getCell(c).border = thinBorder;
  }

  // Row 2: Metadata row (出席人員 & 會議紀錄)
  const row2 = worksheet.getRow(2);
  row2.height = 26;

  // A2: 出席人員:
  const cellA2 = row2.getCell(1);
  cellA2.value = '出席人員:';
  cellA2.font = { name: 'Microsoft JhengHei', size: 10.5, color: { argb: 'FF000000' } };
  cellA2.alignment = { vertical: 'middle', horizontal: 'left' };
  cellA2.border = thinBorder;

  // B2:F2 Merged for attendees list
  worksheet.mergeCells('B2:F2');
  const cellB2 = row2.getCell(2);
  cellB2.value = meta.attendees || '（全員出席）';
  cellB2.font = { name: 'Microsoft JhengHei', size: 10.5, color: { argb: 'FF000000' } };
  cellB2.alignment = { vertical: 'middle', horizontal: 'left' };

  for (let c = 2; c <= 6; c++) {
    row2.getCell(c).border = thinBorder;
  }

  // G2:H2 Merged for 會議紀錄 : 俊傑 (Blue text)
  worksheet.mergeCells('G2:H2');
  const cellG2 = row2.getCell(7);
  cellG2.value = `會議紀錄 : ${meta.recorder || '俊傑'}`;
  cellG2.font = {
    name: 'Microsoft JhengHei',
    size: 11,
    bold: false,
    color: { argb: 'FF0000FF' }, // Blue color like in screenshot
  };
  cellG2.alignment = { vertical: 'middle', horizontal: 'left' };

  for (let c = 7; c <= 8; c++) {
    row2.getCell(c).border = thinBorder;
  }

  // Row 3: Column Headers (Blue background, White text)
  const headers = ['項次', '日期', '會議摘要', '負責人員', '預計', '追蹤情形', '決議完成', '持續追蹤'];
  const row3 = worksheet.getRow(3);
  row3.height = 28;

  headers.forEach((headerText, index) => {
    const cell = row3.getCell(index + 1);
    cell.value = headerText;
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF2B6CB0' }, // Classic corporate blue matching template
    };
    cell.font = {
      name: 'Microsoft JhengHei',
      size: 11,
      bold: true,
      color: { argb: 'FFFFFFFF' },
    };
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    cell.border = thinBorder;
  });

  // Row 4+: Data Rows
  items.forEach((item, index) => {
    const rowNum = index + 4;
    const dataRow = worksheet.getRow(rowNum);
    dataRow.height = 30;

    const rowValues = [
      item.id,
      item.date,
      item.summary,
      item.owner,
      item.estimatedDate,
      item.trackingStatus,
      item.isCompleted,
      item.isFollowUp,
    ];

    rowValues.forEach((val, colIdx) => {
      const cell = dataRow.getCell(colIdx + 1);
      cell.value = val;
      cell.font = {
        name: 'Microsoft JhengHei',
        size: 10.5,
        color: { argb: 'FF000000' },
      };
      
      // Center items: 项次, 日期, 负责人, 预计, 决议完成, 持续追踪
      // Left items: 会议摘要, 追踪情形
      const isLeftAlign = colIdx === 2 || colIdx === 5;
      cell.alignment = {
        vertical: 'middle',
        horizontal: isLeftAlign ? 'left' : 'center',
        wrapText: true,
      };
      cell.border = thinBorder;
    });
  });
}

export interface ExportMeetingOptions extends Partial<MeetingMeta> {
  includeTrackingTable?: boolean;
  includeClarificationTable?: boolean;
  includeRiskTable?: boolean;
  customItems?: MeetingTrackingItem[];
  customClarificationItems?: MeetingTrackingItem[];
  customRiskItems?: MeetingTrackingItem[];
}

/**
 * Export meeting report to Excel file (.xlsx) strictly adhering to the corporate template.
 */
export async function exportMeetingTablesToExcel(
  markdownOrData: string | FormattedMeetingData,
  options?: ExportMeetingOptions
): Promise<void> {
  const parsedData = typeof markdownOrData === 'string' 
    ? parseMeetingData(markdownOrData) 
    : { ...markdownOrData };
  
  if (options) {
    if (options.title) parsedData.meta.title = options.title;
    if (options.date) parsedData.meta.date = options.date;
    if (options.attendees) parsedData.meta.attendees = options.attendees;
    if (options.recorder) parsedData.meta.recorder = options.recorder;
  }

  const itemsToExport = options?.customItems !== undefined ? options.customItems : parsedData.items;
  const clarificationItemsToExport = options?.customClarificationItems !== undefined ? options.customClarificationItems : parsedData.clarificationItems;
  const riskItemsToExport = options?.customRiskItems !== undefined ? options.customRiskItems : parsedData.riskItems;

  const shouldIncludeTracking = options?.includeTrackingTable !== undefined ? options.includeTrackingTable : true;
  const shouldIncludeClarification = options?.includeClarificationTable !== undefined ? options.includeClarificationTable : (clarificationItemsToExport.length > 0);
  const shouldIncludeRisk = options?.includeRiskTable !== undefined ? options.includeRiskTable : (riskItemsToExport.length > 0);

  const workbook = new ExcelJS.Workbook();
  workbook.creator = '光洋科會議紀錄分析助手';
  workbook.lastModifiedBy = parsedData.meta.recorder || '俊傑';
  workbook.created = new Date();
  workbook.modified = new Date();

  let sheetsCreated = 0;

  // Sheet 1: Main Meeting Tracking Sheet (會議記錄追蹤表)
  if (shouldIncludeTracking && itemsToExport.length > 0) {
    const sheet1 = workbook.addWorksheet('會議記錄追蹤表', {
      views: [{ showGridLines: true }],
    });
    applyMeetingTableToWorksheet(sheet1, parsedData.meta, itemsToExport);
    sheetsCreated++;
  }

  // Sheet 2: Clarification Items Sheet (待釐清問題追蹤)
  if (shouldIncludeClarification && clarificationItemsToExport.length > 0) {
    const sheet2 = workbook.addWorksheet('待釐清問題追蹤', {
      views: [{ showGridLines: true }],
    });
    applyMeetingTableToWorksheet(
      sheet2, 
      parsedData.meta, 
      clarificationItemsToExport,
      `${parsedData.meta.title}＋待釐清問題追蹤表`
    );
    sheetsCreated++;
  }

  // Sheet 3: Risk Items Sheet (風險與阻礙追蹤)
  if (shouldIncludeRisk && riskItemsToExport.length > 0) {
    const sheet3 = workbook.addWorksheet('風險與阻礙追蹤', {
      views: [{ showGridLines: true }],
    });
    applyMeetingTableToWorksheet(
      sheet3, 
      parsedData.meta, 
      riskItemsToExport,
      `${parsedData.meta.title}＋風險與阻礙追蹤表`
    );
    sheetsCreated++;
  }

  // If user excluded everything or no rows, fallback to at least 1 sheet
  if (sheetsCreated === 0) {
    const sheetFallback = workbook.addWorksheet('會議記錄追蹤表', {
      views: [{ showGridLines: true }],
    });
    applyMeetingTableToWorksheet(sheetFallback, parsedData.meta, itemsToExport.length > 0 ? itemsToExport : parsedData.items);
  }

  // Generate buffer and trigger browser download
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });

  const dateStr = parsedData.meta.date.replace(/[\/\-\.]/g, '') || new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const cleanTitle = parsedData.meta.title.replace(/[\\/:*?"<>|]/g, '').trim() || '會議紀錄';
  const fileName = `${cleanTitle}_會議記錄_${dateStr}.xlsx`;

  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  window.URL.revokeObjectURL(url);
}

// Backward compatibility export
export function extractMeetingTables(markdown: string) {
  return parseMeetingData(markdown);
}
