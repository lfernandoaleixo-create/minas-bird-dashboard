/**
 * annotationPdf.ts — Gera PDF "Anotação" por espécie (1 PÁGINA APENAS)
 * 
 * Conteúdo:
 * - Cabeçalho: nome da espécie BEM GRANDE, fase, fator do recinto, ração
 * - Campo "Dia 1 = ___/___/___" para o funcionário preencher
 * - Tabela compacta com as 6 situações de % (50-100%)
 * - Área de anotação: 30 linhas compactas para tratadores
 *
 * TUDO EM 1 PÁGINA A4 PORTRAIT.
 */
import { jsPDF } from "jspdf";
import {
  BRAND,
  loadLogo,
  drawBrandFooter,
  PDF_FONT,
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

  // Create PDF — portrait A4
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 8; // margens reduzidas para caber tudo

  let y = 4;

  // ===== HEADER: Logo + Species name GRANDE =====
  // MB logo small
  if (logo) {
    try { doc.addImage(logo, "PNG", margin, y, 10, 10); } catch { /* skip */ }
  }

  // Species name — BEM GRANDE
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...BRAND.dark);
  doc.text(sp.commonName.toUpperCase(), margin + 13, y + 5);

  // Scientific name below
  doc.setFontSize(9);
  doc.setFont("helvetica", "italic");
  doc.setTextColor(...BRAND.muted);
  doc.text(sp.scientificName, margin + 13, y + 10);

  // Right side: "ANOTAÇÃO"
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...BRAND.medium);
  doc.text("ANOTAÇÃO", pageW - margin, y + 5, { align: "right" });

  y += 14;

  // Accent line
  doc.setFillColor(...BRAND.headerAccent);
  doc.rect(margin, y, pageW - margin * 2, 0.8, "F");
  y += 3;

  // ===== INFO ROW: Fase | Recinto | Ração | Peso | MER | Plantel =====
  doc.setFontSize(7.5);
  const infoItems = [
    `Fase: ${phase.label} (×${phase.multiplier})`,
    `Recinto: ×${enclosureMultiplier.toFixed(2)}`,
    `Peso: ${weight}g`,
    `MER: ${mer.toFixed(1)} kcal`,
    `Plantel: ${sp.currentCount} aves`,
  ];
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...BRAND.text);
  doc.text(infoItems.join("   |   "), margin, y);
  y += 4;

  // Ração name (full, on its own line)
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.text(`Ração: ${racao.name}`, margin, y);
  doc.setFont("helvetica", "normal");
  doc.text(`(${racao.energyKcal} kcal/kg · Prot ${racao.proteinG}% · Gord ${racao.fatG}%)`, margin + doc.getTextWidth(`Ração: ${racao.name}`) + 2, y);
  y += 5;

  // ===== CAMPO: Dia 1 = ___/___/___ =====
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...BRAND.dark);
  doc.text("Dia 1 corresponde a:", margin, y);
  doc.setFont("helvetica", "normal");
  doc.setDrawColor(...BRAND.gridLine);
  doc.setLineWidth(0.4);
  const fieldX = margin + doc.getTextWidth("Dia 1 corresponde a:") + 3;
  doc.line(fieldX, y, fieldX + 25, y); // underline for date
  doc.text("/", fieldX + 8, y);
  doc.text("/", fieldX + 16, y);
  y += 5;

  // ===== TABELA DE PROPORÇÕES (compacta, horizontal) =====
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...BRAND.dark);
  doc.text("PROPORÇÕES — RAÇÃO vs SALADA (por ave/dia)", margin, y);
  y += 3.5;

  const tableW = pageW - margin * 2;
  const numCols = 7; // header + 6 values
  const colW = tableW / numCols;
  const rowH = 5;

  // Header row
  doc.setFillColor(...BRAND.headerBg);
  doc.rect(margin, y, tableW, rowH, "F");
  doc.setFontSize(6.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...BRAND.headerText);

  const colHeaders = ["", "50%", "60%", "70%", "80%", "90%", "100%"];
  colHeaders.forEach((h, i) => {
    doc.text(h, margin + colW * i + colW / 2, y + rowH / 2 + 1, { align: "center" });
  });
  y += rowH;

  // Calculate values for each %
  const calcRow = (label: string, fn: (pct: number) => string) => {
    doc.setFontSize(6.5);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...BRAND.text);
    doc.text(label, margin + colW / 2, y + rowH / 2 + 1, { align: "center" });
    doc.setFont("helvetica", "normal");
    RACAO_PCT_OPTIONS.forEach((pct, i) => {
      doc.text(fn(pct), margin + colW * (i + 1) + colW / 2, y + rowH / 2 + 1, { align: "center" });
    });
    y += rowH;
  };

  // Ração (g)
  calcRow("Ração (g)", (pct) => {
    const g = kcalToGrams(mer * pct / 100, racao.energyKcal);
    return g.toFixed(1);
  });

  // Salada (g)
  doc.setFillColor(248, 250, 252);
  doc.rect(margin, y, tableW, rowH, "F");
  calcRow("Salada (g)", (pct) => {
    const g = kcalToGrams(mer * (100 - pct) / 100, AVG_SALADA_KCAL);
    return g.toFixed(1);
  });

  // Total (g)
  calcRow("Total (g)", (pct) => {
    const rG = kcalToGrams(mer * pct / 100, racao.energyKcal);
    const sG = kcalToGrams(mer * (100 - pct) / 100, AVG_SALADA_KCAL);
    return (rG + sG).toFixed(1);
  });

  // Plantel Ração
  if (sp.currentCount > 1) {
    doc.setFillColor(248, 250, 252);
    doc.rect(margin, y, tableW, rowH, "F");
    calcRow(`Plantel R (${sp.currentCount})`, (pct) => {
      const g = kcalToGrams(mer * pct / 100, racao.energyKcal) * sp.currentCount;
      return `${g.toFixed(0)}`;
    });

    // Plantel Salada
    calcRow(`Plantel S (${sp.currentCount})`, (pct) => {
      const g = kcalToGrams(mer * (100 - pct) / 100, AVG_SALADA_KCAL) * sp.currentCount;
      return `${g.toFixed(0)}`;
    });
  }

  // Table border
  const tableRows = sp.currentCount > 1 ? 5 : 3;
  const tableStartY = y - (tableRows * rowH + rowH); // rows + header
  doc.setDrawColor(...BRAND.gridLine);
  doc.setLineWidth(0.25);
  doc.rect(margin, tableStartY, tableW, (tableRows + 1) * rowH);

  // Vertical lines
  for (let i = 1; i < numCols; i++) {
    doc.line(margin + colW * i, tableStartY, margin + colW * i, y);
  }
  // Horizontal lines
  for (let r = 1; r <= tableRows; r++) {
    doc.line(margin, tableStartY + rowH * r, margin + tableW, tableStartY + rowH * r);
  }

  y += 4;

  // ===== ANOTAÇÃO: 30 DIAS (compacta) =====
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...BRAND.dark);
  doc.text("ANOTAÇÕES DIÁRIAS", margin, y);
  y += 3;

  // Calculate available space for 30 rows
  const footerReserve = 9;
  const availableH = pageH - y - footerReserve;
  const annHeaderH = 4.5;
  const annRowH = Math.min((availableH - annHeaderH) / 30, 5); // max 5mm per row

  // Columns: Dia(8) | % Usada(14) | Ração g(16) | Salada g(16) | Observações(rest)
  const annCols = [8, 14, 16, 16, 0];
  annCols[4] = tableW - annCols[0] - annCols[1] - annCols[2] - annCols[3];
  const annHeaders = ["Dia", "%", "Ração", "Salada", "Observações"];

  // Header
  doc.setFillColor(...BRAND.headerBg);
  doc.rect(margin, y, tableW, annHeaderH, "F");
  doc.setFontSize(6);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...BRAND.headerText);

  let hx = margin;
  annHeaders.forEach((h, i) => {
    doc.text(h, hx + annCols[i] / 2, y + annHeaderH / 2 + 0.8, { align: "center" });
    hx += annCols[i];
  });
  y += annHeaderH;

  // 30 rows
  doc.setFontSize(6);
  for (let d = 1; d <= 30; d++) {
    if (d % 2 === 0) {
      doc.setFillColor(250, 251, 252);
      doc.rect(margin, y, tableW, annRowH, "F");
    }

    // Day number
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...BRAND.text);
    doc.text(`${d}`, margin + annCols[0] / 2, y + annRowH / 2 + 0.7, { align: "center" });

    y += annRowH;
  }

  // Table border and lines
  const annTableStart = y - (30 * annRowH + annHeaderH);
  doc.setDrawColor(...BRAND.gridLine);
  doc.setLineWidth(0.2);
  doc.rect(margin, annTableStart, tableW, 30 * annRowH + annHeaderH);

  // Vertical lines
  let vx = margin;
  annCols.forEach((w, i) => {
    if (i < annCols.length - 1) {
      vx += w;
      doc.line(vx, annTableStart, vx, y);
    }
  });

  // Footer
  drawBrandFooter(doc, pageW, pageH);

  // Save
  const now = new Date();
  const monthNames = ["janeiro", "fevereiro", "marco", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
  const filename = `anotacao-${sp.commonName.toLowerCase().replace(/\s+/g, "-")}-${monthNames[now.getMonth()]}-${now.getFullYear()}.pdf`;
  doc.save(filename);
}
