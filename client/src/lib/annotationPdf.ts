/**
 * annotationPdf.ts — Gera PDF "Anotação" por espécie
 * 
 * Layout ORIGINAL que o usuário aprovou:
 * - Header: barra verde com logo MB + "Anotação" + nome espécie
 * - Info: Fase, Ração, Peso, Fator Recinto, MER, Plantel
 * - Tabela de Proporções (vertical): % Ração | Ração (g) | Salada (g) | Total (g) | Plantel Ração | Plantel Salada
 * - Anotações: Dia | Data | % Usada | Ração (g) | Salada (g) | Sobra | Observações
 *
 * TUDO EM 1 PÁGINA A4 PORTRAIT.
 */
import { jsPDF } from "jspdf";
import {
  BRAND,
  loadLogo,
  drawBrandHeader,
  drawBrandFooter,
  PDF_FONT,
  PDF_MARGIN,
} from "./pdfBrand";
import {
  racoes,
  getPetBirdData,
  calculateMER,
  kcalToGrams,
  lifePeriods,
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

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 8;

  // ===== HEADER (barra verde) =====
  const now = new Date();
  const monthNames = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
  const monthYear = `${monthNames[now.getMonth()]} ${now.getFullYear()}`;

  let y = drawBrandHeader(doc, pageW, logo, "Anotação", `${sp.commonName} (${sp.scientificName})`);

  // ===== INFO SECTION =====
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...BRAND.text);

  // Row 1: Fase + Fator Recinto
  doc.text(`Fase:`, margin, y);
  doc.setFont("helvetica", "normal");
  doc.text(`${phase.label} (×${phase.multiplier})`, margin + doc.getTextWidth("Fase:") + 2, y);

  doc.setFont("helvetica", "bold");
  const recintoX = pageW / 2;
  doc.text(`Fator Recinto:`, recintoX, y);
  doc.setFont("helvetica", "normal");
  doc.text(`×${enclosureMultiplier.toFixed(2)}`, recintoX + doc.getTextWidth("Fator Recinto:") + 2, y);
  y += 5.5;

  // Row 2: Ração
  doc.setFont("helvetica", "bold");
  doc.text(`Ração:`, margin, y);
  doc.setFont("helvetica", "normal");
  doc.text(`${racao.name} (${racao.energyKcal} kcal/kg)`, margin + doc.getTextWidth("Ração:") + 2, y);
  y += 5.5;

  // Row 3: Peso + MER + Plantel
  doc.setFont("helvetica", "bold");
  doc.text(`Peso:`, margin, y);
  doc.setFont("helvetica", "normal");
  doc.text(`${weight}g`, margin + doc.getTextWidth("Peso:") + 2, y);

  doc.setFont("helvetica", "bold");
  const merX = margin + 40;
  doc.text(`MER:`, merX, y);
  doc.setFont("helvetica", "normal");
  doc.text(`${mer.toFixed(1)} kcal/dia`, merX + doc.getTextWidth("MER:") + 2, y);

  doc.setFont("helvetica", "bold");
  const plantelX = margin + 90;
  doc.text(`Plantel:`, plantelX, y);
  doc.setFont("helvetica", "normal");
  doc.text(`${sp.currentCount} aves`, plantelX + doc.getTextWidth("Plantel:") + 2, y);
  y += 6;

  // ===== TABELA DE PROPORÇÕES — Ração vs Salada =====
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...BRAND.dark);
  doc.text("Tabela de Proporções — Ração vs Salada", margin, y);
  y += 3;

  const tableW = pageW - margin * 2;
  const propCols = sp.currentCount > 1
    ? [18, 22, 22, 22, 30, 30] // % | Ração | Salada | Total | Plantel Ração | Plantel Salada
    : [22, 30, 30, 30, 0, 0];  // % | Ração | Salada | Total
  const propHeaders = sp.currentCount > 1
    ? ["% Ração", "Ração (g)", "Salada (g)", "Total (g)", "Plantel\nRação (g)", "Plantel\nSalada (g)"]
    : ["% Ração", "Ração (g)", "Salada (g)", "Total (g)"];
  const numPropCols = sp.currentCount > 1 ? 6 : 4;

  // Adjust column widths to fill tableW
  const totalColW = propCols.slice(0, numPropCols).reduce((a, b) => a + b, 0);
  const scale = tableW / totalColW;
  for (let i = 0; i < numPropCols; i++) propCols[i] *= scale;

  const propRowH = 4.5;

  // Header row
  doc.setFillColor(...BRAND.headerBg);
  doc.rect(margin, y, tableW, propRowH + 1, "F");
  doc.setFontSize(6.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...BRAND.headerText);

  let cx = margin;
  for (let i = 0; i < numPropCols; i++) {
    doc.text(propHeaders[i], cx + propCols[i] / 2, y + (propRowH + 1) / 2 + 0.8, { align: "center" });
    cx += propCols[i];
  }
  y += propRowH + 1;

  // Data rows (6 percentages)
  doc.setFontSize(7);
  for (let ri = 0; ri < RACAO_PCT_OPTIONS.length; ri++) {
    const pct = RACAO_PCT_OPTIONS[ri];
    const racaoG = kcalToGrams(mer * pct / 100, racao.energyKcal);
    const saladaG = kcalToGrams(mer * (100 - pct) / 100, AVG_SALADA_KCAL);
    const totalG = racaoG + saladaG;

    if (ri % 2 === 1) {
      doc.setFillColor(248, 250, 252);
      doc.rect(margin, y, tableW, propRowH, "F");
    }

    const vals = sp.currentCount > 1
      ? [`${pct}%`, racaoG.toFixed(1), saladaG.toFixed(1), totalG.toFixed(1), (racaoG * sp.currentCount).toFixed(0), (saladaG * sp.currentCount).toFixed(0)]
      : [`${pct}%`, racaoG.toFixed(1), saladaG.toFixed(1), totalG.toFixed(1)];

    doc.setFont("helvetica", "normal");
    doc.setTextColor(...BRAND.text);
    cx = margin;
    for (let i = 0; i < numPropCols; i++) {
      if (i === 0) doc.setFont("helvetica", "bold");
      else doc.setFont("helvetica", "normal");
      doc.text(vals[i], cx + propCols[i] / 2, y + propRowH / 2 + 1, { align: "center" });
      cx += propCols[i];
    }
    y += propRowH;
  }

  // Table border + lines
  const propTableStart = y - (6 * propRowH + propRowH + 1);
  doc.setDrawColor(...BRAND.gridLine);
  doc.setLineWidth(0.25);
  doc.rect(margin, propTableStart, tableW, 6 * propRowH + propRowH + 1);
  // Vertical lines
  cx = margin;
  for (let i = 0; i < numPropCols - 1; i++) {
    cx += propCols[i];
    doc.line(cx, propTableStart, cx, y);
  }
  // Horizontal lines
  const propHeaderEnd = propTableStart + propRowH + 1;
  doc.line(margin, propHeaderEnd, margin + tableW, propHeaderEnd);
  for (let r = 1; r < 6; r++) {
    doc.line(margin, propHeaderEnd + propRowH * r, margin + tableW, propHeaderEnd + propRowH * r);
  }

  y += 4;

  // ===== ANOTAÇÕES — Mês Ano =====
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...BRAND.dark);
  doc.text(`Anotações — ${monthYear}`, margin, y);
  y += 3;

  // Calculate available space for 30 rows — fill all remaining space
  const footerReserve = 9;
  const availableH = pageH - y - footerReserve;
  const annHeaderH = 4.5;
  const annRowH = (availableH - annHeaderH) / 30;

  // Columns: Dia(10) | Data/% Usada/Ração/Salada/Sobra (equal) | Observações (smaller)
  const equalColW = Math.floor((tableW - 10) / 7); // 6 equal cols + Observações slightly smaller
  const annCols = [10, equalColW, equalColW, equalColW, equalColW, equalColW, 0];
  annCols[6] = tableW - annCols[0] - annCols[1] - annCols[2] - annCols[3] - annCols[4] - annCols[5];
  const annHeaders = ["Dia", "Data", "% Usada", "Ração (g)", "Salada (g)", "Sobra", "Observações"];

  // Header
  doc.setFillColor(...BRAND.headerBg);
  doc.rect(margin, y, tableW, annHeaderH, "F");
  doc.setFontSize(6.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...BRAND.headerText);

  let hx = margin;
  annHeaders.forEach((h, i) => {
    doc.text(h, hx + annCols[i] / 2, y + annHeaderH / 2 + 0.8, { align: "center" });
    hx += annCols[i];
  });
  y += annHeaderH;

  // 30 rows
  for (let d = 1; d <= 30; d++) {
    if (d % 2 === 0) {
      doc.setFillColor(250, 251, 252);
      doc.rect(margin, y, tableW, annRowH, "F");
    }

    // Day number — larger font
    doc.setFontSize(7.5);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...BRAND.text);
    doc.text(`${d}`, margin + annCols[0] / 2, y + annRowH / 2 + 0.8, { align: "center" });

    y += annRowH;
  }

  // Table border and lines — thicker for better visibility
  const annTableStart = y - (30 * annRowH + annHeaderH);
  doc.setDrawColor(...BRAND.gridLine);
  doc.setLineWidth(0.4);
  doc.rect(margin, annTableStart, tableW, 30 * annRowH + annHeaderH);

  // Horizontal lines between rows
  doc.setLineWidth(0.3);
  for (let r = 1; r <= 30; r++) {
    doc.line(margin, annTableStart + annHeaderH + annRowH * r, margin + tableW, annTableStart + annHeaderH + annRowH * r);
  }
  // Header separator (thicker)
  doc.setLineWidth(0.5);
  doc.line(margin, annTableStart + annHeaderH, margin + tableW, annTableStart + annHeaderH);

  // Vertical lines
  doc.setLineWidth(0.3);
  let vx = margin;
  annCols.forEach((w, i) => {
    if (i < annCols.length - 1) {
      vx += w;
      doc.line(vx, annTableStart, vx, y);
    }
  });

  // Footer
  drawBrandFooter(doc, pageW, pageH, 1, 1);

  // Save
  const monthNamesLower = ["janeiro", "fevereiro", "marco", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
  const filename = `anotacao-${sp.commonName.toLowerCase().replace(/\s+/g, "-")}-${monthNamesLower[now.getMonth()]}-${now.getFullYear()}.pdf`;
  doc.save(filename);
}

/**
 * Generate annotation PDF for ALL active species in one file (one page per species).
 * Uses the same phaseId, enclosureMultiplier, and racaoId for all.
 */
export async function generateAllAnnotationPdfs(params: {
  phaseId: string;
  enclosureMultiplier: number;
  racaoId: string;
}): Promise<void> {
  const { phaseId, enclosureMultiplier, racaoId } = params;

  const activeSpecies = species.filter(s => s.inCurrentFlock);
  if (activeSpecies.length === 0) return;

  const logo = await loadLogo();
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 8;

  const now = new Date();
  const monthNames = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
  const monthYear = `${monthNames[now.getMonth()]} ${now.getFullYear()}`;

  let firstPage = true;
  let pageCount = 0;

  for (const sp of activeSpecies) {
    const birdData = getPetBirdData(sp.id);
    if (!birdData) continue;

    const phase = lifePeriods.find(p => p.id === phaseId) || lifePeriods[0];
    const racao = racoes.find(r => r.id === racaoId);
    if (!racao) continue;

    if (!firstPage) {
      doc.addPage();
    }
    firstPage = false;
    pageCount++;

    const weight = birdData.weight || (sp.weightRange.min + sp.weightRange.max) / 2;
    const baseMer = calculateMER(weight, birdData.metabolism, phase.multiplier, "viveiro-voo-interno");
    const mer = baseMer * enclosureMultiplier;

    // Header
    let y = drawBrandHeader(doc, pageW, logo, "Anotação", `${sp.commonName} (${sp.scientificName})`);

    // Info
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...BRAND.text);
    doc.text(`Fase:`, margin, y);
    doc.setFont("helvetica", "normal");
    doc.text(`${phase.label} (×${phase.multiplier})`, margin + doc.getTextWidth("Fase:") + 2, y);
    doc.setFont("helvetica", "bold");
    const recintoX = pageW / 2;
    doc.text(`Fator Recinto:`, recintoX, y);
    doc.setFont("helvetica", "normal");
    doc.text(`×${enclosureMultiplier.toFixed(2)}`, recintoX + doc.getTextWidth("Fator Recinto:") + 2, y);
    y += 5.5;

    doc.setFont("helvetica", "bold");
    doc.text(`Ração:`, margin, y);
    doc.setFont("helvetica", "normal");
    doc.text(`${racao.name} (${racao.energyKcal} kcal/kg)`, margin + doc.getTextWidth("Ração:") + 2, y);
    y += 5.5;

    doc.setFont("helvetica", "bold");
    doc.text(`Peso:`, margin, y);
    doc.setFont("helvetica", "normal");
    doc.text(`${weight}g`, margin + doc.getTextWidth("Peso:") + 2, y);
    doc.setFont("helvetica", "bold");
    const merX = margin + 40;
    doc.text(`MER:`, merX, y);
    doc.setFont("helvetica", "normal");
    doc.text(`${mer.toFixed(1)} kcal/dia`, merX + doc.getTextWidth("MER:") + 2, y);
    doc.setFont("helvetica", "bold");
    const plantelX = margin + 90;
    doc.text(`Plantel:`, plantelX, y);
    doc.setFont("helvetica", "normal");
    doc.text(`${sp.currentCount} aves`, plantelX + doc.getTextWidth("Plantel:") + 2, y);
    y += 6;

    // Proportions table
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...BRAND.dark);
    doc.text("Tabela de Proporções — Ração vs Salada", margin, y);
    y += 3;

    const tableW = pageW - margin * 2;
    const propCols = sp.currentCount > 1
      ? [18, 22, 22, 22, 30, 30]
      : [22, 30, 30, 30, 0, 0];
    const propHeaders = sp.currentCount > 1
      ? ["% Ração", "Ração (g)", "Salada (g)", "Total (g)", "Plantel\nRação (g)", "Plantel\nSalada (g)"]
      : ["% Ração", "Ração (g)", "Salada (g)", "Total (g)"];
    const numPropCols = sp.currentCount > 1 ? 6 : 4;

    const totalColW = propCols.slice(0, numPropCols).reduce((a, b) => a + b, 0);
    const scale = tableW / totalColW;
    for (let i = 0; i < numPropCols; i++) propCols[i] *= scale;

    const propRowH = 4.5;

    doc.setFillColor(...BRAND.headerBg);
    doc.rect(margin, y, tableW, propRowH + 1, "F");
    doc.setFontSize(6.5);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...BRAND.headerText);

    let cx = margin;
    for (let i = 0; i < numPropCols; i++) {
      doc.text(propHeaders[i], cx + propCols[i] / 2, y + (propRowH + 1) / 2 + 0.8, { align: "center" });
      cx += propCols[i];
    }
    y += propRowH + 1;

    doc.setFontSize(7);
    for (let ri = 0; ri < RACAO_PCT_OPTIONS.length; ri++) {
      const pct = RACAO_PCT_OPTIONS[ri];
      const racaoG = kcalToGrams(mer * pct / 100, racao.energyKcal);
      const saladaG = kcalToGrams(mer * (100 - pct) / 100, AVG_SALADA_KCAL);
      const totalG = racaoG + saladaG;

      if (ri % 2 === 1) {
        doc.setFillColor(248, 250, 252);
        doc.rect(margin, y, tableW, propRowH, "F");
      }

      const vals = sp.currentCount > 1
        ? [`${pct}%`, racaoG.toFixed(1), saladaG.toFixed(1), totalG.toFixed(1), (racaoG * sp.currentCount).toFixed(0), (saladaG * sp.currentCount).toFixed(0)]
        : [`${pct}%`, racaoG.toFixed(1), saladaG.toFixed(1), totalG.toFixed(1)];

      doc.setFont("helvetica", "normal");
      doc.setTextColor(...BRAND.text);
      cx = margin;
      for (let i = 0; i < numPropCols; i++) {
        if (i === 0) doc.setFont("helvetica", "bold");
        else doc.setFont("helvetica", "normal");
        doc.text(vals[i], cx + propCols[i] / 2, y + propRowH / 2 + 1, { align: "center" });
        cx += propCols[i];
      }
      y += propRowH;
    }

    const propTableStart = y - (6 * propRowH + propRowH + 1);
    doc.setDrawColor(...BRAND.gridLine);
    doc.setLineWidth(0.25);
    doc.rect(margin, propTableStart, tableW, 6 * propRowH + propRowH + 1);
    cx = margin;
    for (let i = 0; i < numPropCols - 1; i++) {
      cx += propCols[i];
      doc.line(cx, propTableStart, cx, y);
    }
    const propHeaderEnd = propTableStart + propRowH + 1;
    doc.line(margin, propHeaderEnd, margin + tableW, propHeaderEnd);
    for (let r = 1; r < 6; r++) {
      doc.line(margin, propHeaderEnd + propRowH * r, margin + tableW, propHeaderEnd + propRowH * r);
    }

    y += 4;

    // Annotation table
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...BRAND.dark);
    doc.text(`Anotações — ${monthYear}`, margin, y);
    y += 3;

    const footerReserve = 9;
    const availableH = pageH - y - footerReserve;
    const annHeaderH = 4.5;
    const annRowH = (availableH - annHeaderH) / 30;

    const equalColW = Math.floor((tableW - 10) / 7);
    const annCols = [10, equalColW, equalColW, equalColW, equalColW, equalColW, 0];
    annCols[6] = tableW - annCols[0] - annCols[1] - annCols[2] - annCols[3] - annCols[4] - annCols[5];
    const annHeaders = ["Dia", "Data", "% Usada", "Ração (g)", "Salada (g)", "Sobra", "Observações"];

    doc.setFillColor(...BRAND.headerBg);
    doc.rect(margin, y, tableW, annHeaderH, "F");
    doc.setFontSize(6.5);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...BRAND.headerText);

    let hx = margin;
    annHeaders.forEach((h, i) => {
      doc.text(h, hx + annCols[i] / 2, y + annHeaderH / 2 + 0.8, { align: "center" });
      hx += annCols[i];
    });
    y += annHeaderH;

    for (let d = 1; d <= 30; d++) {
      if (d % 2 === 0) {
        doc.setFillColor(250, 251, 252);
        doc.rect(margin, y, tableW, annRowH, "F");
      }
      doc.setFontSize(7.5);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...BRAND.text);
      doc.text(`${d}`, margin + annCols[0] / 2, y + annRowH / 2 + 0.8, { align: "center" });
      y += annRowH;
    }

    const annTableStart = y - (30 * annRowH + annHeaderH);
    doc.setDrawColor(...BRAND.gridLine);
    doc.setLineWidth(0.4);
    doc.rect(margin, annTableStart, tableW, 30 * annRowH + annHeaderH);

    doc.setLineWidth(0.3);
    for (let r = 1; r <= 30; r++) {
      doc.line(margin, annTableStart + annHeaderH + annRowH * r, margin + tableW, annTableStart + annHeaderH + annRowH * r);
    }
    doc.setLineWidth(0.5);
    doc.line(margin, annTableStart + annHeaderH, margin + tableW, annTableStart + annHeaderH);

    doc.setLineWidth(0.3);
    let vx = margin;
    annCols.forEach((w, i) => {
      if (i < annCols.length - 1) {
        vx += w;
        doc.line(vx, annTableStart, vx, y);
      }
    });

    drawBrandFooter(doc, pageW, pageH);
  }

  const monthNamesLower = ["janeiro", "fevereiro", "marco", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
  const filename = `anotacao-todas-especies-${monthNamesLower[now.getMonth()]}-${now.getFullYear()}.pdf`;
  doc.save(filename);
}
