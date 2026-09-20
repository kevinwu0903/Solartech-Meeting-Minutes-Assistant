import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { marked } from 'marked';

export interface ExportPdfOptions {
  title?: string;
  date?: string;
  recorder?: string;
  fileName?: string;
}

/**
 * 100% Robust PDF Exporter for Meeting Records.
 * Uses an isolated hidden iframe sandbox to completely shield html2canvas
 * from Tailwind v4 modern color functions (oklch/oklab), preventing parsing errors
 * and guaranteeing clean, non-blank, multi-page corporate PDF downloads.
 */
export async function exportMeetingToPdf(
  source: string | HTMLElement,
  options?: ExportPdfOptions
): Promise<void> {
  const meetingTitle = options?.title || '光洋科會議紀錄分析報告';
  const meetingDate = options?.date || new Date().toISOString().slice(0, 10).replace(/-/g, '/');
  const recorder = options?.recorder ? `記錄人: ${options.recorder}` : '';

  const cleanDate = meetingDate.replace(/[\/\-\.]/g, '') || new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const cleanTitle = meetingTitle.replace(/[\\/:*?"<>|]/g, '').trim() || '光洋科會議紀錄分析';
  const outFileName = options?.fileName || `${cleanTitle}_${cleanDate}.pdf`;

  // 1. Get raw markdown string
  let markdownText = '';
  if (typeof source === 'string') {
    markdownText = source;
  } else if (source instanceof HTMLElement) {
    markdownText = source.innerText || source.textContent || '';
  }

  // Convert markdown to clean HTML
  const contentHtml = await marked.parse(markdownText, { gfm: true, breaks: true });

  // 2. Create an isolated hidden iframe sandbox
  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.left = '-9999px';
  iframe.style.top = '0';
  iframe.style.width = '800px';
  iframe.style.height = '1200px';
  iframe.style.border = 'none';
  iframe.style.zIndex = '-99999';
  iframe.style.opacity = '1';
  iframe.style.visibility = 'visible';

  document.body.appendChild(iframe);

  const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
  if (!iframeDoc) {
    throw new Error('無法初始化 PDF 渲染沙盒視窗');
  }

  try {
    // 3. Populate iframe with isolated, standard CSS (only hex colors, zero Tailwind/oklab)
    iframeDoc.open();
    iframeDoc.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>${meetingTitle}</title>
          <style>
            * {
              box-sizing: border-box !important;
              -webkit-font-smoothing: antialiased !important;
              text-rendering: optimizeLegibility !important;
              margin: 0;
              padding: 0;
            }
            body {
              background-color: #ffffff !important;
              color: #0f172a !important;
              font-family: -apple-system, BlinkMacSystemFont, "PingFang TC", "Microsoft JhengHei", "Noto Sans TC", "Segoe UI", Roboto, sans-serif !important;
              margin: 0 !important;
              padding: 0 !important;
              width: 800px !important;
            }
            #pdf-root {
              width: 800px !important;
              background-color: #ffffff !important;
              padding: 36px 40px !important;
            }
            .doc-header {
              border-bottom: 2.5px solid #0f172a !important;
              padding-bottom: 12px !important;
              margin-bottom: 20px !important;
            }
            .doc-main-title {
              font-size: 22px !important;
              font-weight: 800 !important;
              color: #0f172a !important;
              margin-bottom: 6px !important;
              line-height: 1.3 !important;
            }
            .doc-meta {
              font-size: 12px !important;
              color: #475569 !important;
              font-weight: 500 !important;
              display: flex !important;
              justify-content: space-between !important;
            }
            .markdown-content {
              font-size: 13.5px !important;
              line-height: 1.7 !important;
              color: #1e293b !important;
              width: 100% !important;
            }
            h1 {
              font-size: 19px !important;
              font-weight: 800 !important;
              color: #0f172a !important;
              margin-top: 20px !important;
              margin-bottom: 10px !important;
              padding-bottom: 6px !important;
              border-bottom: 2px solid #cbd5e1 !important;
              line-height: 1.4 !important;
            }
            h2 {
              font-size: 16px !important;
              font-weight: 700 !important;
              color: #1e293b !important;
              margin-top: 18px !important;
              margin-bottom: 8px !important;
              padding-bottom: 4px !important;
              border-bottom: 1.5px solid #e2e8f0 !important;
              line-height: 1.4 !important;
            }
            h3 {
              font-size: 14.5px !important;
              font-weight: 700 !important;
              color: #1e293b !important;
              margin-top: 14px !important;
              margin-bottom: 6px !important;
              line-height: 1.4 !important;
            }
            p {
              margin-top: 0 !important;
              margin-bottom: 9px !important;
              line-height: 1.7 !important;
              color: #334155 !important;
              word-break: break-word !important;
            }
            ul, ol {
              margin-top: 0 !important;
              margin-bottom: 11px !important;
              padding-left: 22px !important;
            }
            li {
              margin-bottom: 4px !important;
              line-height: 1.6 !important;
              color: #334155 !important;
            }
            table {
              width: 100% !important;
              max-width: 100% !important;
              border-collapse: collapse !important;
              margin: 12px 0 16px 0 !important;
              table-layout: auto !important;
            }
            thead {
              background-color: #f1f5f9 !important;
            }
            th, td {
              min-width: 0 !important;
              max-width: none !important;
              box-sizing: border-box !important;
              word-break: break-word !important;
              overflow-wrap: break-word !important;
              white-space: normal !important;
              vertical-align: top !important;
            }
            th {
              background-color: #f1f5f9 !important;
              border: 1px solid #cbd5e1 !important;
              padding: 6px 8px !important;
              font-weight: 700 !important;
              color: #0f172a !important;
              font-size: 11px !important;
              line-height: 1.35 !important;
              text-align: left !important;
            }
            td {
              border: 1px solid #e2e8f0 !important;
              padding: 5.5px 7px !important;
              color: #334155 !important;
              font-size: 10.5px !important;
              line-height: 1.4 !important;
            }
            tr:nth-child(even) td {
              background-color: #f8fafc !important;
            }
            blockquote {
              border-left: 4px solid #3b82f6 !important;
              padding: 7px 12px !important;
              margin: 10px 0 !important;
              background-color: #eff6ff !important;
              color: #1e40af !important;
              border-radius: 0 4px 4px 0 !important;
            }
            hr {
              border: none !important;
              border-top: 1px solid #e2e8f0 !important;
              margin: 18px 0 !important;
            }
            strong {
              font-weight: 700 !important;
              color: #0f172a !important;
            }
          </style>
        </head>
        <body>
          <div id="pdf-root">
            <div class="doc-header">
              <div class="doc-main-title">${meetingTitle}</div>
              <div class="doc-meta">
                <span>光洋應用材料科技股份有限公司 (Solar Applied Materials Tech)</span>
                <span>${meetingDate} ${recorder ? `| ${recorder}` : ''}</span>
              </div>
            </div>
            <div class="markdown-content">
              ${contentHtml}
            </div>
          </div>
        </body>
      </html>
    `);
    iframeDoc.close();

    // Allow iframe layout engine to compute styles
    await new Promise((resolve) => setTimeout(resolve, 150));

    const rootElement = iframeDoc.getElementById('pdf-root');
    if (!rootElement) {
      throw new Error('無法取得 PDF 根節點');
    }

    // Optimize table column proportioning for tables with 6+ columns
    const tables = rootElement.querySelectorAll('table');
    tables.forEach((table) => {
      const headerCells = table.querySelectorAll('thead th, tr:first-child th, tr:first-child td');
      const colCount = headerCells.length;

      if (colCount >= 6) {
        headerCells.forEach((cell) => {
          const text = cell.textContent?.trim() || '';
          const thEl = cell as HTMLElement;
          if (/^(編號|序號|No|Action\s*ID|#)$/i.test(text)) {
            thEl.style.width = '7%';
          } else if (/^(優先級|Priority|等級)$/i.test(text)) {
            thEl.style.width = '8%';
          } else if (/^(狀態|Status)$/i.test(text)) {
            thEl.style.width = '8%';
          } else if (/^(Owner|負責人|負責人員|主責人)$/i.test(text)) {
            thEl.style.width = '11%';
          } else if (/^(Due\s*Date|完成日|預計完成日|期限|時間)$/i.test(text)) {
            thEl.style.width = '11%';
          } else if (/^(注意事項|依據來源|Notes|備註)$/i.test(text)) {
            thEl.style.width = '16%';
          } else if (/^(執行項目|Task|主要討論內容|討論內容|待釐清問題|風險項目)$/i.test(text)) {
            thEl.style.width = '24%';
          }
        });
      }
    });

    const elementWidth = 800;
    const elementHeight = Math.max(rootElement.scrollHeight, rootElement.offsetHeight, 600);
    iframe.style.height = `${elementHeight + 100}px`;

    // 4. High-resolution canvas rasterization inside isolated iframe context
    const fullCanvas = await html2canvas(rootElement, {
      scale: 2, // 2x high DPI rendering
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
      logging: false,
      scrollX: 0,
      scrollY: 0,
      width: elementWidth,
      height: elementHeight,
      windowWidth: elementWidth,
      windowHeight: elementHeight,
    });

    // 5. Mathematical Page Budget Calculation (A4: 210mm x 297mm)
    const pageCanvasWidth = elementWidth * 2; // 1600px
    const pageCanvasHeight = Math.round(pageCanvasWidth * (297 / 210)); // ~2263px

    const headerHeightPx = 36; // DOM px for top header area in multi-page mode
    const footerHeightPx = 36; // DOM px for bottom footer area in multi-page mode
    const maxSliceHeight = (pageCanvasHeight / 2) - headerHeightPx - footerHeightPx; // ~1050px in DOM units

    // 6. Extract atomic blocks to prevent slicing through text lines & table rows
    const blockElements = Array.from(
      rootElement.querySelectorAll(
        '.doc-header, h1, h2, h3, h4, h5, h6, p, tr, li, blockquote, pre, hr'
      )
    ) as HTMLElement[];

    const containerTop = rootElement.getBoundingClientRect().top;
    const items = blockElements
      .map((el) => {
        const rect = el.getBoundingClientRect();
        return {
          tag: el.tagName.toLowerCase(),
          top: rect.top - containerTop,
          bottom: rect.bottom - containerTop,
          height: rect.height,
        };
      })
      .filter((item) => item.height > 0);

    // 7. Intelligent Multi-Page Safe Cutpoint Detection
    const splitPoints: number[] = [0];
    let currentY = 0;

    while (currentY < elementHeight - 10) {
      const nextTargetY = currentY + maxSliceHeight;

      if (nextTargetY >= elementHeight) {
        splitPoints.push(elementHeight);
        break;
      }

      // Collect potential safe cut candidates within [currentY + 120, nextTargetY]
      const minPageY = currentY + 120;
      const candidates: { y: number; priority: number }[] = [];

      items.forEach((item) => {
        const beforeItem = item.top - 3;
        if (beforeItem >= minPageY && beforeItem <= nextTargetY) {
          const isHeading = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(item.tag);
          candidates.push({ y: beforeItem, priority: isHeading ? 3 : 2 });
        }

        const afterItem = item.bottom + 3;
        if (afterItem >= minPageY && afterItem <= nextTargetY) {
          const isHeading = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(item.tag);
          if (!isHeading) {
            candidates.push({ y: afterItem, priority: 1 });
          }
        }
      });

      candidates.sort((a, b) => b.y - a.y);

      let chosenCutY = nextTargetY;
      let foundSafeCut = false;

      for (const cand of candidates) {
        const intersects = items.some(
          (item) => cand.y > item.top + 2 && cand.y < item.bottom - 2
        );

        if (!intersects) {
          chosenCutY = cand.y;
          foundSafeCut = true;
          break;
        }
      }

      if (!foundSafeCut) {
        chosenCutY = nextTargetY;
      }

      if (chosenCutY <= currentY + 60) {
        chosenCutY = nextTargetY;
      }

      splitPoints.push(chosenCutY);
      currentY = chosenCutY;
    }

    const totalPages = Math.max(1, splitPoints.length - 1);
    const pdf = new jsPDF('p', 'mm', 'a4');

    // 8. Draw each page canvas with crisp header, content slice, and footer
    for (let pageIdx = 0; pageIdx < totalPages; pageIdx++) {
      if (pageIdx > 0) {
        pdf.addPage();
      }

      const yStart = splitPoints[pageIdx];
      const yEnd = splitPoints[pageIdx + 1] || elementHeight;
      const sliceHeight = yEnd - yStart;

      const pageCanvas = document.createElement('canvas');
      pageCanvas.width = pageCanvasWidth;
      pageCanvas.height = pageCanvasHeight;
      const ctx = pageCanvas.getContext('2d');

      if (ctx) {
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        // Page Background
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, pageCanvasWidth, pageCanvasHeight);

        // Header Bar (for page 2 onwards)
        const marginSide2x = 60;
        if (pageIdx > 0) {
          const headerTop2x = 46;
          ctx.fillStyle = '#475569';
          ctx.font = 'bold 18px -apple-system, BlinkMacSystemFont, "PingFang TC", "Microsoft JhengHei", sans-serif';
          ctx.textAlign = 'left';
          ctx.fillText(
            meetingTitle.length > 24 ? `${meetingTitle.slice(0, 23)}...` : meetingTitle,
            marginSide2x,
            headerTop2x
          );

          ctx.fillStyle = '#64748b';
          ctx.font = '16px -apple-system, BlinkMacSystemFont, "PingFang TC", "Microsoft JhengHei", sans-serif';
          ctx.textAlign = 'right';
          ctx.fillText(
            meetingDate,
            pageCanvasWidth - marginSide2x,
            headerTop2x
          );

          // Header Divider Line
          ctx.strokeStyle = '#cbd5e1';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(marginSide2x, headerTop2x + 14);
          ctx.lineTo(pageCanvasWidth - marginSide2x, headerTop2x + 14);
          ctx.stroke();
        }

        // Content Slice
        const sourceX = 0;
        const sourceY = Math.round(yStart * 2);
        const sourceWidth = fullCanvas.width;
        const sourceHeight = Math.round(sliceHeight * 2);
        const boundedSourceHeight = Math.min(sourceHeight, fullCanvas.height - sourceY);

        const destX = 0;
        const destY = pageIdx === 0 ? 0 : headerHeightPx * 2;
        const destWidth = pageCanvasWidth;
        const destHeight = Math.round(sliceHeight * 2);

        if (boundedSourceHeight > 0) {
          ctx.drawImage(
            fullCanvas,
            sourceX,
            sourceY,
            sourceWidth,
            boundedSourceHeight,
            destX,
            destY,
            destWidth,
            destHeight
          );
        }

        // Footer Bar
        const footerY2x = pageCanvasHeight - 55;

        // Footer Divider Line
        ctx.strokeStyle = '#e2e8f0';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(marginSide2x, footerY2x);
        ctx.lineTo(pageCanvasWidth - marginSide2x, footerY2x);
        ctx.stroke();

        ctx.fillStyle = '#64748b';
        ctx.font = '16px -apple-system, BlinkMacSystemFont, "PingFang TC", "Microsoft JhengHei", sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText('光洋應用材料科技 — 商業機密內部限定', marginSide2x, footerY2x + 30);

        ctx.textAlign = 'right';
        ctx.font = 'bold 16px -apple-system, BlinkMacSystemFont, "PingFang TC", "Microsoft JhengHei", sans-serif';
        ctx.fillText(`第 ${pageIdx + 1} 頁 / 共 ${totalPages} 頁`, pageCanvasWidth - marginSide2x, footerY2x + 30);
      }

      // Add full A4 page to PDF
      const pageDataUrl = pageCanvas.toDataURL('image/jpeg', 0.96);
      pdf.addImage(pageDataUrl, 'JPEG', 0, 0, 210, 297, undefined, 'FAST');
    }

    // 9. ROBUST BROWSER BLOB DOWNLOAD
    const pdfBuffer = pdf.output('arraybuffer');
    const pdfBlob = new Blob([pdfBuffer], { type: 'application/pdf' });
    const downloadUrl = window.URL.createObjectURL(pdfBlob);

    const anchor = document.createElement('a');
    anchor.style.display = 'none';
    anchor.href = downloadUrl;
    anchor.download = outFileName;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);

    // Revoke object URL after download
    setTimeout(() => {
      window.URL.revokeObjectURL(downloadUrl);
    }, 60000);

  } finally {
    // Cleanup iframe
    if (document.body.contains(iframe)) {
      document.body.removeChild(iframe);
    }
  }
}
