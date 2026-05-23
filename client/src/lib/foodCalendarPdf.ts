/**
 * PDF Export — Calendário de Alimentos por Categoria
 * Gera 1 folha (landscape A4) por categoria com:
 * - Indicador de qualidade (Excelente/Bom/Pobre) ao lado de cada alimento
 * - Marcações (X) nos dias usados
 * - Dias passados mantêm marcações; alimentos novos aparecem sem marcações nos dias anteriores
 */
import { jsPDF } from "jspdf";
import {
  BRAND,
  drawBrandHeader,
  drawBrandFooter,
  loadLogo,
  PDF_MARGIN,
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

const QUALITY_COLORS: Record<string, { color: [number, number, number]; label: string; symbol: string }> = {
  excelente: { color: [16, 185, 129], label: "Excelente", symbol: "★" },
  bom: { color: [37, 99, 235], label: "Bom", symbol: "●" },
  pobre: { color: [217, 119, 6], label: "Pobre", symbol: "▲" },
};

const MONTHS = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

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

  // Header
  const catColor = CATEGORY_COLORS[categoryKey] || [100, 100, 100];
  const startY = drawBrandHeader(
    doc, pageW, logoBase64,
    `Calendário — ${categoryLabel}`,
    `${MONTHS[month]} ${year} — Controle Diário de Alimentos`,
  );

  // Table dimensions
  const tableStartY = startY + 2;
  const footerReserve = 14;
  const legendReserve = 10;
  const availableH = pageH - tableStartY - footerReserve - legendReserve;
  const availableW = pageW - margin * 2;

  // Column widths
  const nameColW = 44; // food name column
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

    // Food name
    doc.setFontSize(6.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...BRAND.text);
    const truncName = food.name.length > 24 ? food.name.slice(0, 23) + "…" : food.name;
    doc.text(truncName, tableX + 2, y + rowH * 0.65);

    // Quality indicator
    const q = QUALITY_COLORS[food.quality] || QUALITY_COLORS.bom;
    doc.setFontSize(8);
    doc.setTextColor(...q.color);
    doc.text(q.symbol, tableX + nameColW + qualityColW / 2, y + rowH * 0.7, { align: "center" });

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

  // Legend at bottom
  const legendY = y + 5;
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...BRAND.dark);
  doc.text("Legenda de Qualidade:", tableX, legendY);

  doc.setFontSize(7.5);
  doc.setFont("helvetica", "normal");
  let lx = tableX + 35;

  Object.entries(QUALITY_COLORS).forEach(([_, val]) => {
    doc.setTextColor(...val.color);
    doc.text(`${val.symbol} ${val.label}`, lx, legendY);
    lx += 28;
  });

  // Total alimentos info
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
  // Agrupa por categoria e exporta cada um
  const categories = Array.from(new Set(foods.map(f => f.category)));
  const LABELS: Record<string, string> = {
    vegetais: "Vegetais / Hortaliças",
    frutas: "Frutas",
    proteicos: "Sementes e Proteicos",
  };
  for (const cat of categories) {
    const catFoods = foods.filter(f => f.category === cat);
    await exportFoodCalendarCategoryPdf(catFoods, checks, year, month, cat, LABELS[cat] || cat);
  }
}
