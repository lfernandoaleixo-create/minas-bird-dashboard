/**
 * PDF Export — Calendário de Alimentos Mensal
 * Gera uma tabela Alimentos × Dias com as marcações feitas.
 * Quando reimprimir no meio do mês, os dias passados mantêm suas marcações
 * e alimentos novos aparecem sem marcações nos dias anteriores.
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
}

const CATEGORY_DOT_COLORS: Record<string, [number, number, number]> = {
  vegetais: [22, 163, 74],   // green-600
  frutas: [249, 115, 22],    // orange-500
  proteicos: [180, 83, 9],   // amber-700
};

const CATEGORY_LABELS: Record<string, string> = {
  vegetais: "Vegetais / Hortaliças",
  frutas: "Frutas",
  proteicos: "Sementes e Proteicos",
};

const MONTHS = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

export async function exportFoodCalendarPdf(
  foods: FoodEntry[],
  checks: Record<string, boolean>,
  year: number,
  month: number, // 0-indexed
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
  const startY = drawBrandHeader(
    doc, pageW, logoBase64,
    "Calendário de Alimentos",
    `${MONTHS[month]} ${year} — Controle Diário`,
  );

  // Table dimensions
  const tableStartY = startY + 2;
  const footerReserve = 12;
  const availableH = pageH - tableStartY - footerReserve;
  const availableW = pageW - margin * 2;

  // Column widths
  const nameColW = 42; // food name column
  const totalColW = 12; // total column
  const dayColW = (availableW - nameColW - totalColW) / totalDays;
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

  // Day numbers
  doc.setFontSize(6.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...BRAND.muted);
  for (let d = 1; d <= totalDays; d++) {
    const dx = tableX + nameColW + (d - 1) * dayColW;
    doc.text(String(d), dx + dayColW / 2, y + rowH * 0.65, { align: "center" });
  }

  // "Total" header
  doc.text("TOTAL", tableX + nameColW + totalDays * dayColW + totalColW / 2, y + rowH * 0.65, { align: "center" });

  y += rowH;

  // Draw grid lines (vertical)
  doc.setDrawColor(...BRAND.gridLine);
  doc.setLineWidth(0.2);

  // Horizontal line after header
  doc.line(tableX, y, tableX + availableW, y);

  // Food rows
  foods.forEach((food, idx) => {
    const isEven = idx % 2 === 0;
    if (isEven) {
      doc.setFillColor(250, 250, 250);
      doc.rect(tableX, y, availableW, rowH, "F");
    }

    // Category dot
    const dotColor = CATEGORY_DOT_COLORS[food.category] || [100, 100, 100];
    doc.setFillColor(...dotColor);
    doc.circle(tableX + 3, y + rowH / 2, 1.2, "F");

    // Food name
    doc.setFontSize(6.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...BRAND.text);
    const truncName = food.name.length > 22 ? food.name.slice(0, 21) + "…" : food.name;
    doc.text(truncName, tableX + 6, y + rowH * 0.65);

    // Check marks for each day
    let totalChecked = 0;
    for (let d = 1; d <= totalDays; d++) {
      const key = `${monthKey}|${food.name}|${d}`;
      const checked = !!checks[key];
      if (checked) {
        totalChecked++;
        const cx = tableX + nameColW + (d - 1) * dayColW + dayColW / 2;
        const cy = y + rowH / 2;

        // Draw filled check box
        doc.setFillColor(...dotColor);
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
        const cx = tableX + nameColW + (d - 1) * dayColW + dayColW / 2;
        const cy = y + rowH / 2;
        doc.setDrawColor(200, 200, 200);
        doc.roundedRect(cx - 2, cy - 2, 4, 4, 0.5, 0.5, "S");
        doc.setDrawColor(...BRAND.gridLine);
      }
    }

    // Total count
    doc.setFontSize(7);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...(totalChecked > 0 ? dotColor : [180, 180, 180] as [number, number, number]));
    doc.text(
      String(totalChecked),
      tableX + nameColW + totalDays * dayColW + totalColW / 2,
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
  // Name column separator
  doc.line(tableX + nameColW, tableStartY, tableX + nameColW, y);
  // Total column separator
  doc.line(tableX + nameColW + totalDays * dayColW, tableStartY, tableX + nameColW + totalDays * dayColW, y);

  // Legend at bottom
  const legendY = y + 4;
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  let legendX = tableX;
  const usedCategories = Array.from(new Set(foods.map(f => f.category)));
  usedCategories.forEach(cat => {
    const color = CATEGORY_DOT_COLORS[cat] || [100, 100, 100];
    const label = CATEGORY_LABELS[cat] || cat;
    const count = foods.filter(f => f.category === cat).length;

    doc.setFillColor(...color);
    doc.circle(legendX + 1.5, legendY, 1.2, "F");
    doc.setTextColor(...BRAND.text);
    doc.text(`${label} (${count})`, legendX + 4, legendY + 0.5);
    legendX += doc.getTextWidth(`${label} (${count})`) + 10;
  });

  // Total alimentos
  doc.setTextColor(...BRAND.muted);
  doc.text(`${foods.length} alimento${foods.length !== 1 ? "s" : ""} na tabela`, pageW - margin, legendY + 0.5, { align: "right" });

  // Footer
  drawBrandFooter(doc, pageW, pageH, 1, 1);

  // Save
  doc.save(`calendario-alimentos-${MONTHS[month].toLowerCase()}-${year}.pdf`);
}
