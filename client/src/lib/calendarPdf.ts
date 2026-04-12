/**
 * Exportação do Calendário Anual em PDF — v5
 * - SEMPRE 1 página única (independente do período)
 * - Nome da espécie como TÍTULO GIGANTE
 * - Layout adaptativo: grid se ajusta para minimizar espaço em branco
 * - Legenda integrada na mesma página
 * - Feriados com borda vermelha
 * - Usa pdfBrand.ts para identidade visual padronizada
 *   (logo somente símbolo, sem texto "Criatório Minas Bird" ao lado)
 */
import { jsPDF } from "jspdf";
import type { SavedDiet } from "./dietStorage";
import {
  BRAND,
  loadLogo,
  drawBrandFooter,
  cleanFoodName,
  PDF_MARGIN,
  PDF_HEADER_H,
  PDF_ACCENT_H,
  PDF_FONT,
} from "./pdfBrand";

const MONTH_NAMES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

const DAY_NAMES_SHORT = ["D", "S", "T", "Q", "Q", "S", "S"];

const FERIADOS: Record<string, string> = {
  "1-1": "Confraternização Universal",
  "4-21": "Tiradentes",
  "5-1": "Dia do Trabalho",
  "9-7": "Independência do Brasil",
  "10-12": "N. Sra. Aparecida",
  "11-2": "Finados",
  "11-15": "Proclamação da República",
  "12-25": "Natal",
};

const DIET_COLORS: [number, number, number][] = [
  [16, 185, 129],   // emerald
  [59, 130, 246],   // blue
  [245, 158, 11],   // amber
  [168, 85, 247],   // purple
  [239, 68, 68],    // red
  [14, 165, 233],   // sky
  [249, 115, 22],   // orange
  [236, 72, 153],   // pink
];

function getDietDisplayName(diet: SavedDiet, lifePeriods: { id: string; label: string }[], enclosureTypes: { id: string; label: string }[]): string {
  const phase = lifePeriods.find(p => p.id === diet.phaseId)?.label || diet.phaseId;
  const enc = enclosureTypes.find(e => e.id === diet.enclosureId)?.label || diet.enclosureId;
  return `${phase} — ${enc}`;
}

function getDietIngredients(diet: SavedDiet): string {
  const items: string[] = [];
  if (diet.racaoName) items.push(diet.racaoName);
  const allFoods = [
    ...diet.items.racao,
    ...diet.items.vegetais,
    ...diet.items.frutas,
    ...diet.items.proteicos,
  ];
  allFoods.forEach(item => {
    const name = cleanFoodName(item.foodName);
    if (name.toLowerCase() !== diet.racaoName?.toLowerCase()) {
      items.push(name);
    }
  });
  return items.join(" · ");
}

interface CalendarPdfOptions {
  year: number;
  speciesName: string;
  speciesId: string;
  diets: SavedDiet[];
  calendar: Record<string, string>;
  lifePeriods?: { id: string; label: string }[];
  enclosureTypes?: { id: string; label: string }[];
}

// =============================================
// ADAPTIVE GRID CALCULATOR
// =============================================
function calcGrid(monthCount: number): { cols: number; rows: number } {
  if (monthCount <= 1) return { cols: 1, rows: 1 };
  if (monthCount <= 2) return { cols: 2, rows: 1 };
  if (monthCount <= 3) return { cols: 3, rows: 1 };
  if (monthCount <= 4) return { cols: 4, rows: 1 };
  if (monthCount <= 6) return { cols: 3, rows: 2 };
  if (monthCount <= 8) return { cols: 4, rows: 2 };
  if (monthCount <= 9) return { cols: 3, rows: 3 };
  return { cols: 4, rows: 3 }; // 10-12 months
}

// =============================================
// DRAW CALENDAR HEADER (custom for calendar — logo only, species name giant)
// =============================================
function drawCalendarHeader(
  doc: jsPDF,
  pageW: number,
  speciesName: string,
  year: number,
  logoBase64: string | null,
): number {
  const marginX = PDF_MARGIN.landscape;
  const barH = PDF_HEADER_H;

  // Dark green bar
  doc.setFillColor(...BRAND.dark);
  doc.rect(0, 0, pageW, barH, "F");

  // Logo — symbol only (no text beside it)
  if (logoBase64) {
    try { doc.addImage(logoBase64, "PNG", 4, 1, 14, 14); } catch { /* skip */ }
  }

  // "Calendário de Alimentação" — centered
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(255, 255, 255);
  doc.text("Calendário de Alimentação", pageW / 2, barH * 0.42, { align: "center" });

  // "Manual Operacional" — subtitle centered
  doc.setFontSize(PDF_FONT.subtitle);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(200, 230, 210);
  doc.text("Manual Operacional de Alimentação", pageW / 2, barH * 0.75, { align: "center" });

  // Year — right side
  doc.setFontSize(PDF_FONT.title);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(255, 255, 255);
  doc.text(`${year}`, pageW - marginX, barH * 0.55, { align: "right" });

  // Accent line
  doc.setFillColor(...BRAND.primary);
  doc.rect(0, barH, pageW, PDF_ACCENT_H, "F");

  // Species name — GIANT title below header
  const speciesTitleY = barH + PDF_ACCENT_H + 2;
  const speciesFontSize = 22;
  doc.setFontSize(speciesFontSize);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...BRAND.dark);
  doc.text(speciesName.toUpperCase(), pageW / 2, speciesTitleY + speciesFontSize * 0.35, { align: "center" });

  return speciesTitleY + speciesFontSize * 0.35 + 3;
}

// =============================================
// DRAW SINGLE PAGE with header, months, legend, footer
// =============================================
function drawPage(
  doc: jsPDF,
  pageW: number,
  pageH: number,
  speciesName: string,
  year: number,
  months: number[],
  calendar: Record<string, string>,
  diets: SavedDiet[],
  dietColorMap: Map<string, [number, number, number]>,
  logoBase64: string | null,
  lifePeriods?: { id: string; label: string }[],
  enclosureTypes?: { id: string; label: string }[],
): void {
  const marginX = PDF_MARGIN.landscape;
  const monthCount = months.length;
  const { cols, rows } = calcGrid(monthCount);

  // ---- HEADER ----
  const contentStartY = drawCalendarHeader(doc, pageW, speciesName, year, logoBase64);

  // ---- FOOTER (reserve space) ----
  drawBrandFooter(doc, pageW, pageH);

  // ---- LEGEND (calculate height to reserve space) ----
  const legendItemH = diets.length <= 4 ? 5 : 4;
  const legendTitleH = 5;
  const legendH = legendTitleH + diets.length * legendItemH + (diets.length > 0 ? legendItemH : 0) + 3;
  const footerReserve = 10; // space for footer
  const legendStartY = pageH - footerReserve - legendH - 1;

  // ---- MONTH GRID AREA ----
  const gridAreaTop = contentStartY;
  const gridAreaBottom = legendStartY - 1;
  const gridAreaH = gridAreaBottom - gridAreaTop;

  const cellW = (pageW - marginX * 2) / cols;
  const cellH = gridAreaH / rows;

  // Draw month grids
  for (let mi = 0; mi < monthCount; mi++) {
    const month = months[mi];
    const col = mi % cols;
    const row = Math.floor(mi / cols);
    const x = marginX + col * cellW;
    const y = gridAreaTop + row * cellH;

    drawMonthCompact(doc, x, y, cellW, cellH, year, month, calendar, dietColorMap, monthCount);
  }

  // ---- DRAW LEGEND ----
  drawLegendInline(doc, marginX, legendStartY, pageW - marginX * 2, diets, dietColorMap, lifePeriods, enclosureTypes);
}

// =============================================
// COMPACT MONTH GRID — adapts to available space
// =============================================
function drawMonthCompact(
  doc: jsPDF,
  x: number,
  y: number,
  cellW: number,
  cellH: number,
  year: number,
  month: number,
  calendar: Record<string, string>,
  dietColorMap: Map<string, [number, number, number]>,
  totalMonths: number,
): void {
  const pad = 1.5;
  const innerW = cellW - pad * 2;

  // Month header
  const headerH = totalMonths <= 4 ? 8 : totalMonths <= 6 ? 7 : 6;
  doc.setFillColor(...BRAND.dark);
  doc.roundedRect(x + pad, y, innerW, headerH, 1.5, 1.5, "F");

  const monthFontSize = totalMonths <= 4 ? 12 : totalMonths <= 6 ? 10 : 9;
  doc.setFontSize(monthFontSize);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(255, 255, 255);
  doc.text(MONTH_NAMES[month - 1], x + cellW / 2, y + headerH * 0.65, { align: "center" });

  // Day names — minimum 7pt
  const dayHeaderY = y + headerH + 2;
  const dayCellW = innerW / 7;
  const dayNameFontSize = Math.max(PDF_FONT.small, totalMonths <= 4 ? 9 : totalMonths <= 6 ? 8 : 7);
  doc.setFontSize(dayNameFontSize);
  doc.setFont("helvetica", "bold");
  for (let d = 0; d < 7; d++) {
    const color = d === 0 ? BRAND.feriado : BRAND.dark;
    doc.setTextColor(...color);
    doc.text(DAY_NAMES_SHORT[d], x + pad + d * dayCellW + dayCellW / 2, dayHeaderY, { align: "center" });
  }

  // Separator
  doc.setDrawColor(...BRAND.gridLine);
  doc.setLineWidth(0.3);
  doc.line(x + pad, dayHeaderY + 1.5, x + pad + innerW, dayHeaderY + 1.5);

  // Day cells
  const daysInMonth = new Date(year, month, 0).getDate();
  const firstDayOfWeek = new Date(year, month - 1, 1).getDay();
  const totalRows = Math.ceil((daysInMonth + firstDayOfWeek) / 7);
  const gridStartY = dayHeaderY + 2.5;
  const feriadoReserve = totalMonths <= 6 ? 6 : 5;
  const availableGridH = cellH - (gridStartY - y) - feriadoReserve;
  const dayCellH = (availableGridH / Math.max(totalRows, 5)) * 0.94;

  // Day number font — minimum 7pt
  const dayFontSize = Math.max(PDF_FONT.small, totalMonths <= 2 ? 12 : totalMonths <= 4 ? 10 : totalMonths <= 6 ? 9 : 7);

  let currentRow = 0;

  for (let day = 1; day <= daysInMonth; day++) {
    const dayOfWeek = (firstDayOfWeek + day - 1) % 7;
    if (day > 1 && dayOfWeek === 0) currentRow++;

    const dx = x + pad + dayOfWeek * dayCellW;
    const dy = gridStartY + currentRow * dayCellH;

    const dayKey = `${year}-${month}-${day}`;
    const legacyKey = `${month}-${day}`;
    const assignedDietId = calendar[dayKey] || calendar[legacyKey];
    const feriadoKey = `${month}-${day}`;
    const isFeriado = !!FERIADOS[feriadoKey];

    const rectX = dx + 0.6;
    const rectY = dy + 0.2;
    const rectW = dayCellW - 1.2;
    const rectH = dayCellH - 1.0;

    if (assignedDietId && dietColorMap.has(assignedDietId)) {
      const [r, g, b] = dietColorMap.get(assignedDietId)!;
      doc.setFillColor(r, g, b);
      doc.roundedRect(rectX, rectY, rectW, rectH, 1, 1, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(dayFontSize);
      doc.setTextColor(255, 255, 255);
    } else if (dayOfWeek === 0) {
      doc.setFillColor(254, 242, 242);
      doc.roundedRect(rectX, rectY, rectW, rectH, 1, 1, "F");
      doc.setFont("helvetica", "normal");
      doc.setFontSize(dayFontSize);
      doc.setTextColor(180, 80, 80);
    } else {
      doc.setFillColor(250, 250, 249);
      doc.roundedRect(rectX, rectY, rectW, rectH, 1, 1, "F");
      doc.setFont("helvetica", "normal");
      doc.setFontSize(dayFontSize);
      doc.setTextColor(...BRAND.text);
    }

    doc.text(String(day), dx + dayCellW / 2, dy + rectH / 2 + dayFontSize * 0.15, { align: "center" });

    if (isFeriado) {
      doc.setDrawColor(...BRAND.feriado);
      doc.setLineWidth(totalMonths <= 6 ? 1 : 0.8);
      doc.roundedRect(rectX - 0.2, rectY - 0.2, rectW + 0.4, rectH + 0.4, 1.2, 1.2, "S");
    }

    doc.setTextColor(0, 0, 0);
  }

  // Feriados text at bottom — minimum 7pt font
  const feriadosDoMes: { day: number; name: string }[] = [];
  for (let d = 1; d <= daysInMonth; d++) {
    const fKey = `${month}-${d}`;
    if (FERIADOS[fKey]) feriadosDoMes.push({ day: d, name: FERIADOS[fKey] });
  }

  if (feriadosDoMes.length > 0) {
    const ftY = gridStartY + totalRows * dayCellH + 0.5;
    // Ensure minimum 7pt for feriado text (was 4-5.5pt before)
    const ftFontSize = Math.max(PDF_FONT.small, totalMonths <= 4 ? 7 : totalMonths <= 6 ? 7 : 7);
    doc.setFontSize(ftFontSize);
    doc.setFont("helvetica", "italic");
    doc.setTextColor(...BRAND.feriado);
    // If multiple feriados, show abbreviated
    if (totalMonths >= 10 && feriadosDoMes.length > 1) {
      const text = feriadosDoMes.map(f => `${f.day}`).join(", ");
      doc.text(`Fer: ${text}`, x + pad + 0.5, ftY);
    } else {
      feriadosDoMes.forEach((f, i) => {
        doc.text(`${f.day} — ${f.name}`, x + pad + 0.5, ftY + i * (ftFontSize * 0.6));
      });
    }
    doc.setTextColor(0, 0, 0);
  }
}

// =============================================
// INLINE LEGEND — fits at bottom of same page
// =============================================
function drawLegendInline(
  doc: jsPDF,
  x: number,
  y: number,
  w: number,
  diets: SavedDiet[],
  dietColorMap: Map<string, [number, number, number]>,
  lifePeriods?: { id: string; label: string }[],
  enclosureTypes?: { id: string; label: string }[],
): void {
  doc.setFillColor(248, 248, 246);
  const itemH = diets.length <= 4 ? 5 : 4;
  const totalH = 5 + diets.length * itemH + itemH + 2;
  doc.roundedRect(x, y, w, totalH, 2, 2, "F");
  doc.setDrawColor(210, 210, 210);
  doc.setLineWidth(0.3);
  doc.roundedRect(x, y, w, totalH, 2, 2, "S");

  let ly = y + 4;

  // Title — minimum 8pt
  doc.setFontSize(PDF_FONT.body);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...BRAND.dark);
  doc.text("LEGENDA", x + 4, ly);
  ly += itemH;

  const swatchSize = diets.length <= 4 ? 4.5 : 4;
  // Font sizes — minimum 7pt
  const nameFontSize = Math.max(PDF_FONT.small, diets.length <= 4 ? 8 : 7);
  const ingredientsFontSize = Math.max(PDF_FONT.small, diets.length <= 4 ? 8 : 7);

  diets.forEach(diet => {
    const color = dietColorMap.get(diet.id);
    if (!color) return;
    const [r, g, b] = color;

    doc.setFillColor(r, g, b);
    doc.roundedRect(x + 4, ly - swatchSize / 2 - 0.5, swatchSize, swatchSize, 1, 1, "F");

    let displayName: string;
    if (lifePeriods && enclosureTypes) {
      displayName = getDietDisplayName(diet, lifePeriods, enclosureTypes);
    } else {
      const parts = diet.name.split(" — ");
      displayName = parts.length >= 3 ? `${parts[1]} — ${parts[2]}` : diet.name;
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(nameFontSize);
    doc.setTextColor(...BRAND.text);
    doc.text(displayName, x + 4 + swatchSize + 2, ly);

    // Ingredients
    if (lifePeriods && enclosureTypes) {
      const ingredients = getDietIngredients(diet);
      if (ingredients) {
        const nameW = doc.getTextWidth(displayName);
        const ingredientsX = x + 4 + swatchSize + 2 + nameW + 2;
        const maxW = w - (ingredientsX - x) - 4;
        doc.setFont("helvetica", "bold");
        doc.setFontSize(ingredientsFontSize);
        doc.setTextColor(80, 80, 80);
        let displayIngredients = ingredients;
        while (doc.getTextWidth(displayIngredients) > maxW && displayIngredients.length > 10) {
          const lastDot = displayIngredients.lastIndexOf(" · ");
          if (lastDot <= 0) break;
          displayIngredients = displayIngredients.substring(0, lastDot) + " …";
        }
        doc.text(displayIngredients, ingredientsX, ly);
      }
    }

    ly += itemH;
  });

  // Feriado legend
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(x + 4, ly - swatchSize / 2 - 0.5, swatchSize, swatchSize, 1, 1, "F");
  doc.setDrawColor(...BRAND.feriado);
  doc.setLineWidth(0.8);
  doc.roundedRect(x + 4, ly - swatchSize / 2 - 0.5, swatchSize, swatchSize, 1, 1, "S");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(nameFontSize);
  doc.setTextColor(...BRAND.feriado);
  doc.text("Feriado Nacional", x + 4 + swatchSize + 2, ly);

  doc.setTextColor(0, 0, 0);
}

// =============================================
// SINGLE SPECIES EXPORT — always 1 page
// =============================================
export async function exportCalendarPdf(options: CalendarPdfOptions): Promise<void> {
  const { year, speciesName, diets, calendar, lifePeriods: lp, enclosureTypes: et } = options;

  const logoBase64 = await loadLogo();

  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();

  const dietColorMap = new Map<string, [number, number, number]>();
  diets.forEach((d, i) => {
    dietColorMap.set(d.id, DIET_COLORS[i % DIET_COLORS.length]);
  });

  const months = Array.from({ length: 12 }, (_, i) => i + 1);

  drawPage(doc, pageW, pageH, speciesName, year, months, calendar, diets, dietColorMap, logoBase64, lp, et);

  doc.save(`Calendario_${speciesName.replace(/\s+/g, "_")}_${year}.pdf`);
}

// =============================================
// ALL SPECIES EXPORT — 1 page per species
// =============================================
export async function exportAllCalendarsPdf(
  year: number,
  speciesList: { id: string; commonName: string }[],
  allDiets: SavedDiet[],
  allCalendars: Record<string, Record<string, string>>,
  months?: number[],
  lifePeriods?: { id: string; label: string }[],
  enclosureTypes?: { id: string; label: string }[],
): Promise<void> {
  const activeMonths = months && months.length > 0 ? months : Array.from({ length: 12 }, (_, i) => i + 1);

  const logoBase64 = await loadLogo();

  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();

  const speciesWithDiets = speciesList.filter(sp => {
    const dietsForSp = allDiets.filter(d => d.speciesId === sp.id);
    const calForSp = allCalendars[sp.id] || {};
    return dietsForSp.length > 0 || Object.keys(calForSp).length > 0;
  });

  if (speciesWithDiets.length === 0) {
    doc.setFillColor(...BRAND.dark);
    doc.rect(0, 0, pageW, PDF_HEADER_H, "F");
    if (logoBase64) {
      try { doc.addImage(logoBase64, "PNG", 4, 1, 14, 14); } catch { /* skip */ }
    }
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...BRAND.muted);
    doc.text("Nenhuma dieta ou calendário encontrado para exportar.", pageW / 2, 60, { align: "center" });
    doc.save(`Calendario_Completo_${year}.pdf`);
    return;
  }

  speciesWithDiets.forEach((sp, spIdx) => {
    if (spIdx > 0) doc.addPage();

    const dietsForSp = allDiets.filter(d => d.speciesId === sp.id);
    const calForSp = allCalendars[sp.id] || {};

    const dietColorMap = new Map<string, [number, number, number]>();
    dietsForSp.forEach((d, i) => {
      dietColorMap.set(d.id, DIET_COLORS[i % DIET_COLORS.length]);
    });

    drawPage(doc, pageW, pageH, sp.commonName, year, activeMonths, calForSp, dietsForSp, dietColorMap, logoBase64, lifePeriods, enclosureTypes);
  });

  doc.save(`Calendario_Completo_${year}.pdf`);
}
