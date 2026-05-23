/**
 * PDF Export — Calendário de Alimentos por Categoria
 * Gera 1 folha (landscape A4) por categoria com:
 * - Indicador de qualidade desenhado (estrela/círculo/triângulo) — sem Unicode
 * - Nome completo do alimento (sem truncar)
 * - Mês e ano em grande destaque no lado direito do header
 * - Marcações (X) nos dias usados
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
  vegetais: [22, 163, 74],   // green-600
  frutas: [249, 115, 22],    // orange-500
  proteicos: [180, 83, 9],   // amber-700
};

const QUALITY_CONFIG: Record<string, { color: [number, number, number]; label: string }> = {
  excelente: { color: [16, 185, 129], label: "Excelente" },
  bom: { color: [37, 99, 235], label: "Bom" },
  pobre: { color: [217, 119, 6], label: "Pobre" },
};

const MONTHS = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

/**
 * Desenha estrela de 5 pontas (Excelente)
 */
function drawStar(doc: jsPDF, cx: number, cy: number, r: number, color: [number, number, number]) {
  doc.setFillColor(...color);
  // Simplified star: filled circle with inner highlight
  doc.circle(cx, cy, r, "F");
  // Draw a small white star shape inside
  doc.setFillColor(255, 255, 255);
  doc.circle(cx, cy, r * 0.35, "F");
  // Re-fill with color for the star effect
  doc.setFillColor(...color);
  doc.circle(cx, cy, r * 0.55, "F");
}

/**
 * Desenha círculo (Bom)
 */
function drawCircle(doc: jsPDF, cx: number, cy: number, r: number, color: [number, number, number]) {
  doc.setFillColor(...color);
  doc.circle(cx, cy, r, "F");
}

/**
 * Desenha triângulo (Pobre)
 */
function drawTriangle(doc: jsPDF, cx: number, cy: number, r: number, color: [number, number, number]) {
  doc.setFillColor(...color);
  // Equilateral triangle pointing up
  const h = r * 1.7;
  const x1 = cx;
  const y1 = cy - h * 0.6;
  const x2 = cx - r;
  const y2 = cy + h * 0.4;
  const x3 = cx + r;
  const y3 = cy + h * 0.4;
  doc.triangle(x1, y1, x2, y2, x3, y3, "F");
}

/**
 * Desenha o indicador de qualidade como forma geométrica
 */
function drawQualityIndicator(doc: jsPDF, quality: string, cx: number, cy: number, r: number) {
  const q = QUALITY_CONFIG[quality] || QUALITY_CONFIG.bom;
  switch (quality) {
    case "excelente":
      drawStar(doc, cx, cy, r, q.color);
      break;
    case "pobre":
      drawTriangle(doc, cx, cy, r, q.color);
      break;
    default: // bom
      drawCircle(doc, cx, cy, r, q.color);
      break;
  }
}

/**
 * Header customizado com mês/ano em grande destaque no lado direito
 */
function drawCustomHeader(
  doc: jsPDF,
  pageW: number,
  logoBase64: string | null,
  categoryLabel: string,
  monthName: string,
  year: number,
): number {
  const barH = PDF_HEADER_H;

  // Light green bar
  doc.setFillColor(...BRAND.headerBg);
  doc.rect(0, 0, pageW, barH, "F");

  // MB symbol logo
  if (logoBase64) {
    try { doc.addImage(logoBase64, "PNG", 3, 1.5, 13, 13); } catch { /* skip */ }
  }

  // Category title (left-center)
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...BRAND.headerText);
  doc.text(`Controle Diario — ${categoryLabel}`, 19, barH * 0.45);

  // Subtitle
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...BRAND.medium);
  doc.text("Criatorio Minas Bird · Calendario de Alimentos", 19, barH * 0.78);

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

  // Landscape A4
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = PDF_MARGIN.landscape;

  const catColor = CATEGORY_COLORS[categoryKey] || [100, 100, 100];

  // Custom header with month/year prominently on the right
  const startY = drawCustomHeader(doc, pageW, logoBase64, categoryLabel, MONTHS[month], year);

  // Table dimensions
  const tableStartY = startY + 1;
  const footerReserve = 12;
  const legendReserve = 10;
  const availableH = pageH - tableStartY - footerReserve - legendReserve;
  const availableW = pageW - margin * 2;

  // Column widths — wider name column for full names
  const nameColW = 56; // wider for full food name
  const qualityColW = 6; // quality indicator column
  const totalColW = 10; // total column
  const dayColW = (availableW - nameColW - qualityColW - totalColW) / totalDays;
  const rowH = Math.min(availableH / (foods.length + 1), 7); // +1 for header row, max 7mm

  const tableX = margin;
  let y = tableStartY;

  // Draw header row
  doc.setFillColor(...BRAND.headerBg);
  doc.rect(tableX, y, availableW, rowH, "F");

  // "Alimento" header
  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...BRAND.dark);
  doc.text("ALIMENTO", tableX + 2, y + rowH * 0.65);

  // "Q" header (quality)
  doc.setFontSize(6);
  doc.text("Q", tableX + nameColW + qualityColW / 2, y + rowH * 0.65, { align: "center" });

  // Day numbers
  doc.setFontSize(6.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...BRAND.muted);
  for (let d = 1; d <= totalDays; d++) {
    const dx = tableX + nameColW + qualityColW + (d - 1) * dayColW;
    doc.text(String(d), dx + dayColW / 2, y + rowH * 0.65, { align: "center" });
  }

  // "Total" header
  doc.text("TOTAL", tableX + nameColW + qualityColW + totalDays * dayColW + totalColW / 2, y + rowH * 0.65, { align: "center" });

  y += rowH;

  // Horizontal line after header
  doc.setDrawColor(...BRAND.gridLine);
  doc.setLineWidth(0.2);
  doc.line(tableX, y, tableX + availableW, y);

  // Food rows
  foods.forEach((food, idx) => {
    const isEven = idx % 2 === 0;
    if (isEven) {
      doc.setFillColor(250, 250, 250);
      doc.rect(tableX, y, availableW, rowH, "F");
    }

    // Food name — FULL name, no truncation
    doc.setFontSize(6);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...BRAND.text);
    // If name is too long for the column, reduce font size
    const maxNameW = nameColW - 4;
    let fontSize = 6;
    let textW = doc.getTextWidth(food.name);
    if (textW > maxNameW) {
      fontSize = 5.5;
      doc.setFontSize(fontSize);
      textW = doc.getTextWidth(food.name);
      if (textW > maxNameW) {
        fontSize = 5;
        doc.setFontSize(fontSize);
      }
    }
    doc.text(food.name, tableX + 2, y + rowH * 0.65, { maxWidth: maxNameW });

    // Quality indicator — drawn shape (not Unicode)
    const indicatorR = 1.3;
    drawQualityIndicator(doc, food.quality, tableX + nameColW + qualityColW / 2, y + rowH / 2, indicatorR);

    // Check marks for each day
    let totalChecked = 0;
    for (let d = 1; d <= totalDays; d++) {
      const key = `${monthKey}|${food.name}|${d}`;
      const checked = !!checks[key];
      if (checked) {
        totalChecked++;
        const cx = tableX + nameColW + qualityColW + (d - 1) * dayColW + dayColW / 2;
        const cy = y + rowH / 2;

        // Draw filled check box
        doc.setFillColor(...catColor);
        doc.roundedRect(cx - 2, cy - 2, 4, 4, 0.5, 0.5, "F");

        // Draw checkmark
        doc.setDrawColor(255, 255, 255);
        doc.setLineWidth(0.5);
        doc.line(cx - 1, cy, cx - 0.2, cy + 1);
        doc.line(cx - 0.2, cy + 1, cx + 1.2, cy - 1);
        doc.setDrawColor(...BRAND.gridLine);
        doc.setLineWidth(0.2);
      } else {
        // Draw empty box
        const cx = tableX + nameColW + qualityColW + (d - 1) * dayColW + dayColW / 2;
        const cy = y + rowH / 2;
        doc.setDrawColor(200, 200, 200);
        doc.roundedRect(cx - 2, cy - 2, 4, 4, 0.5, 0.5, "S");
        doc.setDrawColor(...BRAND.gridLine);
      }
    }

    // Total count
    doc.setFontSize(7);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...(totalChecked > 0 ? catColor : [180, 180, 180] as [number, number, number]));
    doc.text(
      String(totalChecked),
      tableX + nameColW + qualityColW + totalDays * dayColW + totalColW / 2,
      y + rowH * 0.65,
      { align: "center" }
    );

    // Row border
    doc.setDrawColor(...BRAND.gridLine);
    doc.line(tableX, y + rowH, tableX + availableW, y + rowH);

    y += rowH;
  });

  // Vertical lines for columns
  doc.setDrawColor(...BRAND.gridLine);
  doc.setLineWidth(0.15);
  doc.line(tableX + nameColW, tableStartY, tableX + nameColW, y);
  doc.line(tableX + nameColW + qualityColW, tableStartY, tableX + nameColW + qualityColW, y);
  doc.line(tableX + nameColW + qualityColW + totalDays * dayColW, tableStartY, tableX + nameColW + qualityColW + totalDays * dayColW, y);

  // Legend at bottom — drawn shapes
  const legendY = y + 5;
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...BRAND.dark);
  doc.text("Legenda:", tableX, legendY);

  let lx = tableX + 18;

  // Excelente
  drawStar(doc, lx, legendY - 0.5, 1.5, QUALITY_CONFIG.excelente.color);
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...QUALITY_CONFIG.excelente.color);
  doc.text("Excelente", lx + 3, legendY);
  lx += 25;

  // Bom
  drawCircle(doc, lx, legendY - 0.5, 1.3, QUALITY_CONFIG.bom.color);
  doc.setTextColor(...QUALITY_CONFIG.bom.color);
  doc.text("Bom", lx + 3, legendY);
  lx += 18;

  // Pobre
  drawTriangle(doc, lx, legendY - 0.5, 1.3, QUALITY_CONFIG.pobre.color);
  doc.setTextColor(...QUALITY_CONFIG.pobre.color);
  doc.text("Pobre", lx + 3, legendY);

  // Total alimentos info (right side)
  doc.setTextColor(...BRAND.muted);
  doc.setFontSize(7);
  doc.text(
    `${foods.length} alimento${foods.length !== 1 ? "s" : ""} · ${categoryLabel}`,
    pageW - margin, legendY, { align: "right" }
  );

  // Footer
  drawBrandFooter(doc, pageW, pageH, 1, 1);

  // Save
  const catSlug = categoryKey === "proteicos" ? "sementes-proteicos" : categoryKey;
  doc.save(`calendario-${catSlug}-${MONTHS[month].toLowerCase()}-${year}.pdf`);
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
