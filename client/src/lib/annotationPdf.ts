/**
 * annotationPdf.ts — Gera PDF "Anotação" por espécie
 * 
 * Conteúdo:
 * - Cabeçalho: nome da espécie, fase, fator do recinto, ração selecionada
 * - Tabela com as 6 situações de % (50, 60, 70, 80, 90, 100%) mostrando ração e salada em gramas
 * - Área de anotação: tabela com 30 dias para tratadores preencherem na prática
 *
 * Segue padrão visual do criatório (pdfBrand).
 */
import { jsPDF } from "jspdf";
import {
  BRAND,
  loadLogo,
  drawBrandHeader,
  drawBrandFooter,
  PDF_MARGIN,
  PDF_FONT,
} from "./pdfBrand";
import {
  racoes,
  getPetBirdData,
  calculateMER,
  kcalToGrams,
  lifePeriods,
  enclosureTypes,
} from "@/data/petbird";
import { species } from "@/data/feeding";

const RACAO_PCT_OPTIONS = [50, 60, 70, 80, 90, 100];
const AVG_SALADA_KCAL = 450;

interface AnnotationPdfParams {
  speciesId: string;
  phaseId: string;
  enclosureMultiplier: number;
  racaoId: string;
}

export async function generateAnnotationPdf(params: AnnotationPdfParams): Promise<void> {
  const { speciesId, phaseId, enclosureMultiplier, racaoId } = params;

  const sp = species.find(s => s.id === speciesId);
  const birdData = getPetBirdData(speciesId);
  const phase = lifePeriods.find(p => p.id === phaseId) || lifePeriods[0];
  const racao = racoes.find(r => r.id === racaoId);

  if (!sp || !birdData || !racao) return;

  const weight = birdData.weight || (sp.weightRange.min + sp.weightRange.max) / 2;
  const baseMer = calculateMER(weight, birdData.metabolism, phase.multiplier, "viveiro-voo-interno");
  const mer = baseMer * enclosureMultiplier;

  const logo = await loadLogo();

  // Create PDF — portrait A4
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = PDF_MARGIN.portrait;

  // Header
  let y = drawBrandHeader(doc, pageW, logo, "Anotação", `${sp.commonName} (${sp.scientificName})`);

  // Info section
  y += 2;
  doc.setFontSize(PDF_FONT.body);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...BRAND.text);

  // Info grid
  const col1X = margin;
  const col2X = pageW / 2 + 5;
  const lineH = 5;

  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text("Fase:", col1X, y);
  doc.setFont("helvetica", "normal");
  doc.text(`${phase.label} (×${phase.multiplier})`, col1X + 14, y);

  doc.setFont("helvetica", "bold");
  doc.text("Fator Recinto:", col2X, y);
  doc.setFont("helvetica", "normal");
  doc.text(`×${enclosureMultiplier.toFixed(2)}`, col2X + 28, y);

  y += lineH;
  doc.setFont("helvetica", "bold");
  doc.text("Ração:", col1X, y);
  doc.setFont("helvetica", "normal");
  const racaoName = racao.name.length > 35 ? racao.name.substring(0, 35) + "..." : racao.name;
  doc.text(`${racaoName} (${racao.energyKcal} kcal/kg)`, col1X + 14, y);

  y += lineH;
  doc.setFont("helvetica", "bold");
  doc.text("Peso:", col1X, y);
  doc.setFont("helvetica", "normal");
  doc.text(`${weight}g`, col1X + 14, y);

  doc.setFont("helvetica", "bold");
  doc.text("MER:", col2X, y);
  doc.setFont("helvetica", "normal");
  doc.text(`${mer.toFixed(1)} kcal/dia`, col2X + 12, y);

  doc.setFont("helvetica", "bold");
  doc.text("Plantel:", col2X + 50, y);
  doc.setFont("helvetica", "normal");
  doc.text(`${sp.currentCount} aves`, col2X + 66, y);

  y += lineH + 3;

  // ===== TABLE: 6 situations =====
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...BRAND.dark);
  doc.text("Tabela de Proporções — Ração vs Salada", col1X, y);
  y += 5;

  // Table header
  const tableX = margin;
  const tableW = pageW - margin * 2;
  const colWidths = [22, 26, 26, 26, 26, 30]; // % | Ração(g) | Salada(g) | Total(g) | Plantel Ração | Plantel Salada
  const headers = ["% Ração", "Ração (g)", "Salada (g)", "Total (g)", `Plantel\nRação (g)`, `Plantel\nSalada (g)`];
  const rowH = 7;
  const headerH = 9;

  // Draw header bg
  doc.setFillColor(...BRAND.headerBg);
  doc.rect(tableX, y, tableW, headerH, "F");

  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...BRAND.headerText);

  let cx = tableX;
  headers.forEach((h, i) => {
    const lines = h.split("\n");
    if (lines.length === 1) {
      doc.text(h, cx + colWidths[i] / 2, y + headerH / 2 + 1, { align: "center" });
    } else {
      doc.text(lines[0], cx + colWidths[i] / 2, y + 3.5, { align: "center" });
      doc.text(lines[1], cx + colWidths[i] / 2, y + 7, { align: "center" });
    }
    cx += colWidths[i];
  });

  y += headerH;

  // Table rows
  RACAO_PCT_OPTIONS.forEach((pct, idx) => {
    const racaoKcal = mer * pct / 100;
    const saladaKcal = mer * (100 - pct) / 100;
    const racaoGrams = kcalToGrams(racaoKcal, racao.energyKcal);
    const saladaGrams = kcalToGrams(saladaKcal, AVG_SALADA_KCAL);
    const totalGrams = racaoGrams + saladaGrams;
    const plantelRacao = racaoGrams * sp.currentCount;
    const plantelSalada = saladaGrams * sp.currentCount;

    // Alternate row bg
    if (idx % 2 === 0) {
      doc.setFillColor(248, 250, 252);
      doc.rect(tableX, y, tableW, rowH, "F");
    }

    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...BRAND.text);

    const values = [
      `${pct}%`,
      `${racaoGrams.toFixed(1)}`,
      `${saladaGrams.toFixed(1)}`,
      `${totalGrams.toFixed(1)}`,
      `${plantelRacao.toFixed(0)}`,
      `${plantelSalada.toFixed(0)}`,
    ];

    let rx = tableX;
    values.forEach((v, i) => {
      if (i === 0) {
        doc.setFont("helvetica", "bold");
      } else {
        doc.setFont("helvetica", "normal");
      }
      doc.text(v, rx + colWidths[i] / 2, y + rowH / 2 + 1.2, { align: "center" });
      rx += colWidths[i];
    });

    y += rowH;
  });

  // Table border
  doc.setDrawColor(...BRAND.gridLine);
  doc.setLineWidth(0.3);
  doc.rect(tableX, y - (RACAO_PCT_OPTIONS.length * rowH + headerH), tableW, RACAO_PCT_OPTIONS.length * rowH + headerH);

  // Vertical lines
  let lx = tableX;
  colWidths.forEach((w, i) => {
    if (i < colWidths.length - 1) {
      lx += w;
      doc.line(lx, y - (RACAO_PCT_OPTIONS.length * rowH + headerH), lx, y);
    }
  });

  y += 8;

  // ===== ANNOTATION AREA: 30 days =====
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...BRAND.dark);

  const now = new Date();
  const monthNames = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
  const currentMonth = monthNames[now.getMonth()];
  const currentYear = now.getFullYear();

  doc.text(`Anotações — ${currentMonth} ${currentYear}`, col1X, y);
  y += 5;

  // Annotation table: Day | % Usada | Ração (g) | Salada (g) | Observações
  const annColWidths = [12, 18, 22, 22, 0]; // last column fills remaining
  annColWidths[4] = tableW - annColWidths[0] - annColWidths[1] - annColWidths[2] - annColWidths[3];
  const annHeaders = ["Dia", "% Usada", "Ração (g)", "Salada (g)", "Observações"];
  const annRowH = 5.5;
  const annHeaderH = 7;

  // How many days fit on this page?
  const remainingSpace = pageH - y - 15; // 15mm for footer
  const daysPerPage = Math.floor((remainingSpace - annHeaderH) / annRowH);
  const totalDays = 30;

  let daysPrinted = 0;
  let pageNum = 1;

  function drawAnnotationHeader() {
    doc.setFillColor(...BRAND.headerBg);
    doc.rect(tableX, y, tableW, annHeaderH, "F");

    doc.setFontSize(7.5);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...BRAND.headerText);

    let hx = tableX;
    annHeaders.forEach((h, i) => {
      doc.text(h, hx + annColWidths[i] / 2, y + annHeaderH / 2 + 1, { align: "center" });
      hx += annColWidths[i];
    });
    y += annHeaderH;
  }

  function drawAnnotationRows(startDay: number, count: number) {
    for (let d = startDay; d < startDay + count && d <= totalDays; d++) {
      if (d % 2 === 0) {
        doc.setFillColor(248, 250, 252);
        doc.rect(tableX, y, tableW, annRowH, "F");
      }

      // Day number
      doc.setFontSize(7.5);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...BRAND.text);
      doc.text(`${d}`, tableX + annColWidths[0] / 2, y + annRowH / 2 + 1, { align: "center" });

      // Empty cells (for manual fill)
      // Draw light dotted lines for writing guidance
      doc.setDrawColor(200, 200, 200);
      doc.setLineWidth(0.15);
      const dotY = y + annRowH - 1.5;
      let dx = tableX + annColWidths[0];
      for (let i = 1; i < annColWidths.length; i++) {
        const lineStart = dx + 2;
        const lineEnd = dx + annColWidths[i] - 2;
        doc.line(lineStart, dotY, lineEnd, dotY);
        dx += annColWidths[i];
      }

      y += annRowH;
      daysPrinted++;
    }
  }

  // First page annotation
  drawAnnotationHeader();
  const firstPageDays = Math.min(daysPerPage, totalDays);
  drawAnnotationRows(1, firstPageDays);

  // Border around annotation table
  doc.setDrawColor(...BRAND.gridLine);
  doc.setLineWidth(0.3);
  doc.rect(tableX, y - (firstPageDays * annRowH + annHeaderH), tableW, firstPageDays * annRowH + annHeaderH);

  // Vertical lines for annotation table
  let alx = tableX;
  annColWidths.forEach((w, i) => {
    if (i < annColWidths.length - 1) {
      alx += w;
      doc.line(alx, y - (firstPageDays * annRowH + annHeaderH), alx, y);
    }
  });

  // Footer page 1
  drawBrandFooter(doc, pageW, pageH, pageNum, daysPrinted >= totalDays ? 1 : 2);

  // If more days needed, add page 2
  if (daysPrinted < totalDays) {
    doc.addPage();
    pageNum++;
    y = drawBrandHeader(doc, pageW, logo, "Anotação (cont.)", `${sp.commonName} — ${currentMonth} ${currentYear}`);
    y += 3;

    drawAnnotationHeader();
    const remainingDays = totalDays - daysPrinted;
    drawAnnotationRows(daysPrinted + 1, remainingDays);

    // Border
    doc.setDrawColor(...BRAND.gridLine);
    doc.setLineWidth(0.3);
    doc.rect(tableX, y - (remainingDays * annRowH + annHeaderH), tableW, remainingDays * annRowH + annHeaderH);

    // Vertical lines
    let alx2 = tableX;
    annColWidths.forEach((w, i) => {
      if (i < annColWidths.length - 1) {
        alx2 += w;
        doc.line(alx2, y - (remainingDays * annRowH + annHeaderH), alx2, y);
      }
    });

    drawBrandFooter(doc, pageW, pageH, pageNum, pageNum);
  }

  // Save
  const filename = `anotacao-${sp.commonName.toLowerCase().replace(/\s+/g, "-")}-${currentMonth.toLowerCase()}-${currentYear}.pdf`;
  doc.save(filename);
}
