/**
 * PDF Export — Calendário de Alimentos
 * Gera PDFs por categoria e por espécie com:
 * - Bolinha colorida simples para qualidade (verde=Excelente, azul=Bom, amarelo=Pobre)
 * - Nome completo do alimento
 * - Mês e ano em grande destaque no lado direito
 * - Marcações (X) nos dias usados
 * - Legenda simples e clean
 */
import { jsPDF } from "jspdf";
import {
  BRAND,
  drawBrandFooter,
  loadLogo,
  PDF_MARGIN,
  PDF_ACCENT_H,
  PDF_HEADER_H,
} from "./pdfBrand";

interface FoodEntry {
  name: string;
  category: string;
  quality: "excelente" | "bom" | "pobre";
}

const CATEGORY_COLORS: Record<string, [number, number, number]> = {
  racao: [180, 83, 9],       // amber-700
  vegetais: [22, 163, 74],   // green-600
  frutas: [220, 38, 38],     // red-600
  proteicos: [124, 58, 237], // purple-600
};

const QUALITY_COLORS: Record<string, { color: [number, number, number]; label: string; symbol: string }> = {
  excelente: { color: [16, 185, 129], label: "Excelente", symbol: "+" },
  bom: { color: [37, 99, 235], label: "Bom", symbol: "+/\u2212" },
  pobre: { color: [217, 119, 6], label: "Pobre", symbol: "\u2212" },
};

const CATEGORY_ROW_BG: Record<string, [number, number, number]> = {
  racoes: [255, 251, 235],    // amber-50
  vegetais: [240, 253, 244],  // green-50
  frutas: [254, 242, 242],    // red-50
  proteicos: [250, 245, 255], // purple-50
};

const MONTHS = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

/**
 * Desenha bolinha colorida de qualidade
 */
function drawQualityDot(doc: jsPDF, cx: number, cy: number, r: number, quality: string) {
  const q = QUALITY_COLORS[quality] || QUALITY_COLORS.bom;
  doc.setFillColor(...q.color);
  doc.circle(cx, cy, r, "F");
}

/**
 * Header customizado com mês/ano em grande destaque no lado direito
 */
function drawCustomHeader(
  doc: jsPDF,
  pageW: number,
  logoBase64: string | null,
  title: string,
  subtitle: string,
  monthName: string,
  year: number,
): number {
  const barH = PDF_HEADER_H;

  doc.setFillColor(...BRAND.headerBg);
  doc.rect(0, 0, pageW, barH, "F");

  if (logoBase64) {
    try { doc.addImage(logoBase64, "PNG", 3, 1.5, 13, 13); } catch { /* skip */ }
  }

  // Title (left)
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...BRAND.headerText);
  doc.text(title, 19, barH * 0.45);

  // Subtitle
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...BRAND.medium);
  doc.text(subtitle, 19, barH * 0.78);

  // MÊS e ANO em grande destaque no lado direito
  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...BRAND.dark);
  doc.text(monthName.toUpperCase(), pageW - 10, barH * 0.45, { align: "right" });

  doc.setFontSize(14);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...BRAND.medium);
  doc.text(String(year), pageW - 10, barH * 0.78, { align: "right" });

  // Accent line
  doc.setFillColor(...BRAND.headerAccent);
  doc.rect(0, barH, pageW, PDF_ACCENT_H, "F");

  return barH + PDF_ACCENT_H + 3;
}

/**
 * Exporta PDF de uma categoria específica
 */
export async function exportFoodCalendarCategoryPdf(
  foods: FoodEntry[],
  checks: Record<string, boolean>,
  year: number,
  month: number, // 0-indexed
  categoryKey: string,
  categoryLabel: string,
) {
  if (foods.length === 0) return;

  const totalDays = new Date(year, month + 1, 0).getDate();
  const monthKey = `${year}-${String(month + 1).padStart(2, "0")}`;
  const logoBase64 = await loadLogo();

  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = PDF_MARGIN.landscape;

  const catColor = CATEGORY_COLORS[categoryKey] || [100, 100, 100];

  const startY = drawCustomHeader(
    doc, pageW, logoBase64,
    `Controle Diario — ${categoryLabel}`,
    "Criatorio Minas Bird · Calendario de Alimentos",
    MONTHS[month], year
  );

  // Table dimensions
  const tableStartY = startY + 1;
  const footerReserve = 12;
  const legendReserve = 10;
  const availableH = pageH - tableStartY - footerReserve - legendReserve;
  const availableW = pageW - margin * 2;

  // Column widths — no separate Q column, dot is part of the name cell
  const nameColW = 60;
  const totalColW = 10;
  const dayColW = (availableW - nameColW - totalColW) / totalDays;
  const rowH = Math.min(availableH / (foods.length + 1), 7);

  const tableX = margin;
  let y = tableStartY;

  // Header row
  doc.setFillColor(...BRAND.headerBg);
  doc.rect(tableX, y, availableW, rowH, "F");
  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...BRAND.dark);
  doc.text("ALIMENTO", tableX + 5, y + rowH * 0.65);

  // Day numbers
  doc.setFontSize(6.5);
  doc.setTextColor(...BRAND.muted);
  for (let d = 1; d <= totalDays; d++) {
    const dx = tableX + nameColW + (d - 1) * dayColW;
    doc.text(String(d), dx + dayColW / 2, y + rowH * 0.65, { align: "center" });
  }

  // Total header
  doc.text("TOTAL", tableX + nameColW + totalDays * dayColW + totalColW / 2, y + rowH * 0.65, { align: "center" });

  y += rowH;
  doc.setDrawColor(...BRAND.gridLine);
  doc.setLineWidth(0.2);
  doc.line(tableX, y, tableX + availableW, y);

  // Food rows
  foods.forEach((food, idx) => {
    if (idx % 2 === 0) {
      doc.setFillColor(250, 250, 250);
      doc.rect(tableX, y, availableW, rowH, "F");
    }

    // Quality dot
    drawQualityDot(doc, tableX + 2.5, y + rowH / 2, 1.2, food.quality);

    // Food name
    doc.setFontSize(6);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...BRAND.text);
    const maxNameW = nameColW - 7;
    let fontSize = 6;
    let textW = doc.getTextWidth(food.name);
    if (textW > maxNameW) { fontSize = 5.5; doc.setFontSize(fontSize); textW = doc.getTextWidth(food.name); }
    if (textW > maxNameW) { fontSize = 5; doc.setFontSize(fontSize); }
    doc.text(food.name, tableX + 5, y + rowH * 0.65, { maxWidth: maxNameW });

    // Check marks
    let totalChecked = 0;
    for (let d = 1; d <= totalDays; d++) {
      const key = `${monthKey}|${food.name}|${d}`;
      const checked = !!checks[key];
      const cx = tableX + nameColW + (d - 1) * dayColW + dayColW / 2;
      const cy = y + rowH / 2;
      if (checked) {
        totalChecked++;
        doc.setFillColor(...catColor);
        doc.roundedRect(cx - 2, cy - 2, 4, 4, 0.5, 0.5, "F");
        doc.setDrawColor(255, 255, 255);
        doc.setLineWidth(0.5);
        doc.line(cx - 1, cy, cx - 0.2, cy + 1);
        doc.line(cx - 0.2, cy + 1, cx + 1.2, cy - 1);
        doc.setDrawColor(...BRAND.gridLine);
        doc.setLineWidth(0.2);
      } else {
        doc.setDrawColor(200, 200, 200);
        doc.roundedRect(cx - 2, cy - 2, 4, 4, 0.5, 0.5, "S");
        doc.setDrawColor(...BRAND.gridLine);
      }
    }

    // Total count
    doc.setFontSize(7);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...(totalChecked > 0 ? catColor : [180, 180, 180] as [number, number, number]));
    doc.text(String(totalChecked), tableX + nameColW + totalDays * dayColW + totalColW / 2, y + rowH * 0.65, { align: "center" });

    // Row border
    doc.setDrawColor(...BRAND.gridLine);
    doc.line(tableX, y + rowH, tableX + availableW, y + rowH);
    y += rowH;
  });

  // Vertical lines
  doc.setDrawColor(...BRAND.gridLine);
  doc.setLineWidth(0.15);
  doc.line(tableX + nameColW, tableStartY, tableX + nameColW, y);
  doc.line(tableX + nameColW + totalDays * dayColW, tableStartY, tableX + nameColW + totalDays * dayColW, y);

  // Legend — simple colored dots
  const legendY = y + 5;
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "normal");
  let lx = tableX;

  // Quality dots legend
  drawQualityDot(doc, lx + 1.5, legendY - 0.5, 1.5, "excelente");
  doc.setTextColor(...QUALITY_COLORS.excelente.color);
  doc.text("Excelente", lx + 4.5, legendY);
  lx += 24;

  drawQualityDot(doc, lx + 1.5, legendY - 0.5, 1.5, "bom");
  doc.setTextColor(...QUALITY_COLORS.bom.color);
  doc.text("Bom", lx + 4.5, legendY);
  lx += 16;

  drawQualityDot(doc, lx + 1.5, legendY - 0.5, 1.5, "pobre");
  doc.setTextColor(...QUALITY_COLORS.pobre.color);
  doc.text("Pobre", lx + 4.5, legendY);

  // Info (right side)
  doc.setTextColor(...BRAND.muted);
  doc.setFontSize(7);
  doc.text(
    `${foods.length} alimento${foods.length !== 1 ? "s" : ""} · ${categoryLabel}`,
    pageW - margin, legendY, { align: "right" }
  );

  // Footer
  drawBrandFooter(doc, pageW, pageH, 1, 1);

  const catSlug = categoryKey === "proteicos" ? "sementes-proteicos" : categoryKey;
  doc.save(`calendario-${catSlug}-${MONTHS[month].toLowerCase()}-${year}.pdf`);
}

/**
 * Exporta PDF de uma espécie específica
 * Inclui alimentos herdados (dos cards gerais) + exclusivos (da espécie)
 * Diferenciação: exclusivos têm * antes do nome
 */
export async function exportFoodCalendarSpeciesPdf(
  allFoods: { name: string; category: string; quality: string; inherited: boolean }[],
  generalChecks: Record<string, boolean>,
  speciesChecks: Record<string, boolean>,
  year: number,
  month: number, // 0-indexed
  speciesName: string,
  speciesId: string,
) {
  if (allFoods.length === 0) return;

  const totalDays = new Date(year, month + 1, 0).getDate();
  const monthKey = `${year}-${String(month + 1).padStart(2, "0")}`;
  const logoBase64 = await loadLogo();

  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = PDF_MARGIN.landscape;

  const startY = drawCustomHeader(
    doc, pageW, logoBase64,
    `Controle Diario — ${speciesName}`,
    "Criatorio Minas Bird · Calendario por Especie",
    MONTHS[month], year
  );

  // Table dimensions
  const tableStartY = startY + 1;
  const footerReserve = 12;
  const legendReserve = 10;
  const availableH = pageH - tableStartY - footerReserve - legendReserve;
  const availableW = pageW - margin * 2;

  // Column widths — no separate Q/T columns
  const nameColW = 60;
  const totalColW = 10;
  const dayColW = (availableW - nameColW - totalColW) / totalDays;
  const rowH = Math.min(availableH / (allFoods.length + 1), 7);

  const tableX = margin;
  let y = tableStartY;

  // Header row
  doc.setFillColor(...BRAND.headerBg);
  doc.rect(tableX, y, availableW, rowH, "F");
  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...BRAND.dark);
  doc.text("ALIMENTO", tableX + 5, y + rowH * 0.65);

  doc.setFontSize(6.5);
  doc.setTextColor(...BRAND.muted);
  for (let d = 1; d <= totalDays; d++) {
    const dx = tableX + nameColW + (d - 1) * dayColW;
    doc.text(String(d), dx + dayColW / 2, y + rowH * 0.65, { align: "center" });
  }
  doc.text("TOTAL", tableX + nameColW + totalDays * dayColW + totalColW / 2, y + rowH * 0.65, { align: "center" });

  y += rowH;
  doc.setDrawColor(...BRAND.gridLine);
  doc.setLineWidth(0.2);
  doc.line(tableX, y, tableX + availableW, y);

  // Food rows
  allFoods.forEach((food) => {
    // Category row background color
    const rowBg = CATEGORY_ROW_BG[food.category] || [250, 250, 250];
    doc.setFillColor(...rowBg);
    doc.rect(tableX, y, availableW, rowH, "F");

    // Quality symbol (skip for ração)
    let nameOffset = 3;
    if (food.category !== "racoes") {
      const q = QUALITY_COLORS[food.quality] || QUALITY_COLORS.bom;
      doc.setFontSize(7);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...q.color);
      doc.text(q.symbol, tableX + 2, y + rowH * 0.65);
      nameOffset = 3 + doc.getTextWidth(q.symbol) + 1;
    }

    // Food name — exclusive foods get * prefix
    const displayName = food.inherited ? food.name : `* ${food.name}`;
    doc.setFontSize(6);
    doc.setFont("helvetica", food.inherited ? "normal" : "bold");
    doc.setTextColor(...BRAND.text);
    const maxNameW = nameColW - nameOffset - 3;
    let fontSize = 6;
    let textW = doc.getTextWidth(displayName);
    if (textW > maxNameW) { fontSize = 5.5; doc.setFontSize(fontSize); textW = doc.getTextWidth(displayName); }
    if (textW > maxNameW) { fontSize = 5; doc.setFontSize(fontSize); }
    doc.text(displayName, tableX + nameOffset, y + rowH * 0.65, { maxWidth: maxNameW });

    // Check marks
    let totalChecked = 0;
    const catColor = CATEGORY_COLORS[food.category] || [100, 100, 100];
    for (let d = 1; d <= totalDays; d++) {
      const key = `${monthKey}|${food.name}|${d}`;
      const checked = food.inherited ? !!generalChecks[key] : !!speciesChecks[key];
      const cx = tableX + nameColW + (d - 1) * dayColW + dayColW / 2;
      const cy = y + rowH / 2;
      if (checked) {
        totalChecked++;
        doc.setFillColor(...catColor);
        doc.roundedRect(cx - 2, cy - 2, 4, 4, 0.5, 0.5, "F");
        doc.setDrawColor(255, 255, 255);
        doc.setLineWidth(0.5);
        doc.line(cx - 1, cy, cx - 0.2, cy + 1);
        doc.line(cx - 0.2, cy + 1, cx + 1.2, cy - 1);
        doc.setDrawColor(...BRAND.gridLine);
        doc.setLineWidth(0.2);
      } else {
        doc.setDrawColor(200, 200, 200);
        doc.roundedRect(cx - 2, cy - 2, 4, 4, 0.5, 0.5, "S");
        doc.setDrawColor(...BRAND.gridLine);
      }
    }

    // Total count
    doc.setFontSize(7);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...(totalChecked > 0 ? catColor : [180, 180, 180] as [number, number, number]));
    doc.text(String(totalChecked), tableX + nameColW + totalDays * dayColW + totalColW / 2, y + rowH * 0.65, { align: "center" });

    // Row border
    doc.setDrawColor(...BRAND.gridLine);
    doc.line(tableX, y + rowH, tableX + availableW, y + rowH);
    y += rowH;
  });

  // Vertical lines
  doc.setDrawColor(...BRAND.gridLine);
  doc.setLineWidth(0.15);
  doc.line(tableX + nameColW, tableStartY, tableX + nameColW, y);
  doc.line(tableX + nameColW + totalDays * dayColW, tableStartY, tableX + nameColW + totalDays * dayColW, y);

  // Legend — simple and clean
  const legendY = y + 5;
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "normal");
  let lx = tableX;

  // Quality symbols
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...QUALITY_COLORS.excelente.color);
  doc.text("+", lx, legendY);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...BRAND.text);
  doc.text("Excelente", lx + 4, legendY);
  lx += 24;

  doc.setFont("helvetica", "bold");
  doc.setTextColor(...QUALITY_COLORS.bom.color);
  doc.text("+/\u2212", lx, legendY);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...BRAND.text);
  doc.text("Bom", lx + 6, legendY);
  lx += 18;

  doc.setFont("helvetica", "bold");
  doc.setTextColor(...QUALITY_COLORS.pobre.color);
  doc.text("\u2212", lx, legendY);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...BRAND.text);
  doc.text("Pobre", lx + 4, legendY);
  lx += 18;

  // Exclusive indicator
  doc.setTextColor(...BRAND.muted);
  doc.text("* = exclusivo desta ave", lx, legendY);

  // Info (right side)
  doc.setTextColor(...BRAND.muted);
  doc.setFontSize(7);
  doc.text(
    `${allFoods.length} alimento${allFoods.length !== 1 ? "s" : ""} · ${speciesName}`,
    pageW - margin, legendY, { align: "right" }
  );

  // Footer
  drawBrandFooter(doc, pageW, pageH, 1, 1);

  const slug = speciesName.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
  doc.save(`calendario-${slug}-${MONTHS[month].toLowerCase()}-${year}.pdf`);
}

/**
 * Legacy: exporta todos os alimentos em um único PDF (mantido para compatibilidade)
 */
export async function exportFoodCalendarPdf(
  foods: FoodEntry[],
  checks: Record<string, boolean>,
  year: number,
  month: number,
) {
  const categories = Array.from(new Set(foods.map(f => f.category)));
  const LABELS: Record<string, string> = {
    vegetais: "Vegetais / Hortalicas",
    frutas: "Frutas",
    proteicos: "Sementes e Proteicos",
  };
  for (const cat of categories) {
    const catFoods = foods.filter(f => f.category === cat);
    await exportFoodCalendarCategoryPdf(catFoods, checks, year, month, cat, LABELS[cat] || cat);
  }
}
