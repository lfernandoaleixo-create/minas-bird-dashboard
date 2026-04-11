/**
 * Exportação do Calendário Anual em PDF — Design Profissional v3
 * - Logo e título GRANDES
 * - Dias MUITO maiores (2 páginas: 6 meses por página)
 * - Rodapé com letras maiores
 * - Sem indicador de "Dia Atual"
 * - Feriados com BORDA VERMELHA ao redor do dia
 * - Legenda grande na última página
 */
import { jsPDF } from "jspdf";
import type { SavedDiet } from "./dietStorage";

const MONTH_NAMES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

const DAY_NAMES = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

// Feriados nacionais brasileiros (fixos)
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

// Cores para dietas (RGB) — vibrantes e distinguíveis
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

// Brand colors
const B = {
  primary: [16, 185, 129] as [number, number, number],
  dark: [6, 78, 59] as [number, number, number],
  medium: [5, 150, 105] as [number, number, number],
  light: [209, 250, 229] as [number, number, number],
  bg: [240, 253, 244] as [number, number, number],
  text: [41, 37, 36] as [number, number, number],
  muted: [120, 113, 108] as [number, number, number],
  feriado: [220, 38, 38] as [number, number, number],
  feriadoBg: [254, 226, 226] as [number, number, number],
  white: [255, 255, 255] as [number, number, number],
  gridLine: [229, 231, 235] as [number, number, number],
};

const LOGO_URL = "https://d2xsxph8kpxj0f.cloudfront.net/310519663426530649/GUVCZBcaMUVxbcauwK97Fr/logo3d_d58b8c94.png";

/** Load logo as base64 data URL */
async function loadLogoBase64(): Promise<string | null> {
  try {
    const resp = await fetch(LOGO_URL);
    const blob = await resp.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

/** Get diet display name: "Fase — Ambiente" */
function getDietDisplayName(diet: SavedDiet, lifePeriods: { id: string; label: string }[], enclosureTypes: { id: string; label: string }[]): string {
  const phase = lifePeriods.find(p => p.id === diet.phaseId)?.label || diet.phaseId;
  const enc = enclosureTypes.find(e => e.id === diet.enclosureId)?.label || diet.enclosureId;
  return `${phase} — ${enc}`;
}

/** Get diet ingredients string */
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
    let name = item.foodName;
    // Strip all trailing comma-separated suffixes: "Maça, com casca, Crua" → "Maça"
    const suffixPattern = /[,;]\s*(?:Crua?|Cozid[ao]|Assad[ao]|com\s+[Cc]asca|sem\s+[Cc]asca|Fresc[ao]|Sec[ao]|Inteira?o?|Madur[ao]|Verde|Natural|em\s+Pó|Desidratad[ao]|Moíd[ao]|Triturad[ao]|Ralad[ao]|Picad[ao]|Fatiado|em\s+Flocos|em\s+Grãos|em\s+Pedaços)\s*$/gi;
    // Apply repeatedly to strip multiple suffixes
    let prev = "";
    while (prev !== name) {
      prev = name;
      name = name.replace(suffixPattern, "").trim();
    }
    name = name.replace(/\s*[-–]\s*(?:Crua?|Cozid[ao]|Assad[ao]|com\s+[Cc]asca|sem\s+[Cc]asca|Fresc[ao]|Sec[ao]|Inteira?o?|Madur[ao]|Verde|Natural|em\s+Pó|Desidratad[ao]|Moíd[ao]|Triturad[ao]|Ralad[ao]|Picad[ao]|Fatiado|em\s+Flocos|em\s+Grãos|em\s+Pedaços)/gi, "").trim();
    // Fix common misspellings
    name = name.replace(/^Maça$/i, "Maçã");
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
// HEADER — Logo e título GRANDES
// =============================================
function drawHeader(
  doc: jsPDF,
  pageW: number,
  title: string,
  subtitle: string,
  logoBase64: string | null,
): number {
  const headerH = 32;

  // Dark green top bar
  doc.setFillColor(...B.dark);
  doc.rect(0, 0, pageW, headerH, "F");

  // Logo — GRANDE (28x28)
  if (logoBase64) {
    try {
      doc.addImage(logoBase64, "PNG", 8, 2, 28, 28);
    } catch {
      doc.setFillColor(...B.primary);
      doc.circle(22, 16, 12, "F");
    }
  } else {
    doc.setFillColor(...B.primary);
    doc.circle(22, 16, 12, "F");
  }

  // Criatório name — GRANDE
  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(255, 255, 255);
  doc.text("Criatório Minas Bird", 42, 14);

  // Subtitle
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(200, 230, 210);
  doc.text("Manual Operacional de Alimentação", 42, 22);

  // Right side: title — GRANDE
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(255, 255, 255);
  doc.text(title, pageW - 10, 14, { align: "right" });

  // Right side: subtitle — GRANDE
  doc.setFontSize(14);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(200, 230, 210);
  doc.text(subtitle, pageW - 10, 23, { align: "right" });

  // Accent line
  doc.setFillColor(...B.primary);
  doc.rect(0, headerH, pageW, 2, "F");

  return headerH + 4;
}

// =============================================
// FOOTER — Letras MAIORES
// =============================================
function drawFooter(doc: jsPDF, pageW: number, pageH: number, pageNum?: number, totalPages?: number): void {
  const footerY = pageH - 8;

  doc.setDrawColor(...B.medium);
  doc.setLineWidth(0.5);
  doc.line(10, footerY - 3, pageW - 10, footerY - 3);

  const now = new Date();
  const dateStr = `${now.getDate().toString().padStart(2, "0")}/${(now.getMonth() + 1).toString().padStart(2, "0")}/${now.getFullYear()}`;

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...B.muted);
  doc.text(`Publicado em ${dateStr}`, 10, footerY);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...B.dark);
  doc.text("Criatório Minas Bird — Ribeirão Vermelho, MG", pageW / 2, footerY, { align: "center" });

  if (pageNum !== undefined && totalPages !== undefined) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(...B.muted);
    doc.text(`Página ${pageNum} de ${totalPages}`, pageW - 10, footerY, { align: "right" });
  }
}

// =============================================
// MONTH GRID — Dias MUITO maiores
// =============================================
function drawMonthGrid(
  doc: jsPDF,
  x: number,
  y: number,
  cellW: number,
  cellH: number,
  year: number,
  month: number,
  calendar: Record<string, string>,
  dietColorMap: Map<string, [number, number, number]>,
): void {
  const pad = 2; // internal padding

  // Month header bar
  doc.setFillColor(...B.dark);
  doc.roundedRect(x + pad, y, cellW - pad * 2, 10, 2, 2, "F");
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(255, 255, 255);
  doc.text(MONTH_NAMES[month - 1], x + cellW / 2, y + 7.2, { align: "center" });

  // Day names header
  const dayHeaderY = y + 14;
  const dayCellW = (cellW - pad * 2) / 7;
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  for (let d = 0; d < 7; d++) {
    const color = d === 0 ? B.feriado : B.dark;
    doc.setTextColor(...color);
    doc.text(DAY_NAMES[d], x + pad + d * dayCellW + dayCellW / 2, dayHeaderY, { align: "center" });
  }

  // Separator
  doc.setDrawColor(...B.gridLine);
  doc.setLineWidth(0.4);
  doc.line(x + pad, dayHeaderY + 2.5, x + cellW - pad, dayHeaderY + 2.5);

  // Calculate day cell height to fill available space
  const daysInMonth = new Date(year, month, 0).getDate();
  const firstDayOfWeek = new Date(year, month - 1, 1).getDay();
  const totalRows = Math.ceil((daysInMonth + firstDayOfWeek) / 7);
  const gridStartY = dayHeaderY + 4;
  const availableGridH = cellH - (gridStartY - y) - 4; // leave 4mm at bottom for feriado text
  const dayCellH = availableGridH / Math.max(totalRows, 5);

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

    const rectX = dx + 0.5;
    const rectY = dy;
    const rectW = dayCellW - 1;
    const rectH = dayCellH - 1;

    // Draw diet color fill
    if (assignedDietId && dietColorMap.has(assignedDietId)) {
      const [r, g, b] = dietColorMap.get(assignedDietId)!;
      doc.setFillColor(r, g, b);
      doc.roundedRect(rectX, rectY, rectW, rectH, 1.5, 1.5, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(255, 255, 255);
    } else if (dayOfWeek === 0) {
      // Sunday without diet — light bg
      doc.setFillColor(254, 242, 242);
      doc.roundedRect(rectX, rectY, rectW, rectH, 1.5, 1.5, "F");
      doc.setFont("helvetica", "normal");
      doc.setFontSize(11);
      doc.setTextColor(180, 80, 80);
    } else {
      // Normal day without diet
      doc.setFillColor(250, 250, 249);
      doc.roundedRect(rectX, rectY, rectW, rectH, 1.5, 1.5, "F");
      doc.setFont("helvetica", "normal");
      doc.setFontSize(11);
      doc.setTextColor(...B.text);
    }

    // Day number — centered
    doc.text(String(day), dx + dayCellW / 2, dy + rectH / 2 + 2, { align: "center" });

    // Feriado: red border around the day
    if (isFeriado) {
      doc.setDrawColor(...B.feriado);
      doc.setLineWidth(1.2);
      doc.roundedRect(rectX - 0.3, rectY - 0.3, rectW + 0.6, rectH + 0.6, 2, 2, "S");
    }

    doc.setTextColor(0, 0, 0);
  }

  // Feriados text at bottom of month
  const feriadosDoMes: { day: number; name: string }[] = [];
  for (let d = 1; d <= daysInMonth; d++) {
    const fKey = `${month}-${d}`;
    if (FERIADOS[fKey]) feriadosDoMes.push({ day: d, name: FERIADOS[fKey] });
  }

  if (feriadosDoMes.length > 0) {
    const footerY = gridStartY + totalRows * dayCellH + 1;
    doc.setFontSize(6.5);
    doc.setFont("helvetica", "italic");
    doc.setTextColor(...B.feriado);
    feriadosDoMes.forEach((f, i) => {
      doc.text(`${f.day} — ${f.name}`, x + pad + 1, footerY + i * 3.5);
    });
    doc.setTextColor(0, 0, 0);
  }
}

// =============================================
// LEGEND — Grande e visível
// =============================================
function drawLegend(
  doc: jsPDF,
  pageW: number,
  legendStartY: number,
  maxY: number,
  diets: SavedDiet[],
  dietColorMap: Map<string, [number, number, number]>,
  lifePeriods?: { id: string; label: string }[],
  enclosureTypes?: { id: string; label: string }[],
): void {
  const margin = 10;
  const legendW = pageW - margin * 2;

  // Legend background
  doc.setFillColor(250, 250, 249);
  doc.roundedRect(margin, legendStartY, legendW, maxY - legendStartY, 4, 4, "F");
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.4);
  doc.roundedRect(margin, legendStartY, legendW, maxY - legendStartY, 4, 4, "S");

  // Legend title
  let ly = legendStartY + 8;
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...B.dark);
  doc.text("LEGENDA DAS DIETAS", margin + 8, ly);
  ly += 8;

  // Diet items
  diets.forEach(diet => {
    const color = dietColorMap.get(diet.id);
    if (!color) return;

    const [r, g, b] = color;

    // Color swatch — bigger
    doc.setFillColor(r, g, b);
    doc.roundedRect(margin + 8, ly - 3.5, 8, 8, 1.5, 1.5, "F");

    // Diet display name
    let displayName: string;
    if (lifePeriods && enclosureTypes) {
      displayName = getDietDisplayName(diet, lifePeriods, enclosureTypes);
    } else {
      const parts = diet.name.split(" — ");
      displayName = parts.length >= 3 ? `${parts[1]} — ${parts[2]}` : diet.name;
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(...B.text);
    doc.text(displayName, margin + 20, ly + 1);

    // Ingredients
    const nameWidth = doc.getTextWidth(displayName);
    const ingredientsX = margin + 20 + nameWidth + 4;
    const maxIngredientsW = legendW - (ingredientsX - margin) - 8;

    if (lifePeriods && enclosureTypes) {
      const ingredients = getDietIngredients(diet);
      if (ingredients) {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        doc.setTextColor(...B.muted);
        let displayIngredients = ingredients;
        while (doc.getTextWidth(displayIngredients) > maxIngredientsW && displayIngredients.length > 10) {
          const lastDot = displayIngredients.lastIndexOf(" · ");
          if (lastDot <= 0) break;
          displayIngredients = displayIngredients.substring(0, lastDot) + " …";
        }
        doc.text(displayIngredients, ingredientsX, ly + 1);
      }
    }

    ly += 10;
  });

  // Feriado legend — red border swatch
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(margin + 8, ly - 3.5, 8, 8, 1.5, 1.5, "F");
  doc.setDrawColor(...B.feriado);
  doc.setLineWidth(1.2);
  doc.roundedRect(margin + 8, ly - 3.5, 8, 8, 1.5, 1.5, "S");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...B.feriado);
  doc.text("Feriado Nacional", margin + 20, ly + 1);

  doc.setTextColor(0, 0, 0);
}

// =============================================
// SINGLE SPECIES EXPORT — 2 pages (6 months each) + legend
// =============================================
export async function exportCalendarPdf(options: CalendarPdfOptions): Promise<void> {
  const { year, speciesName, diets, calendar, lifePeriods: lp, enclosureTypes: et } = options;

  const logoBase64 = await loadLogoBase64();

  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();

  // Diet color map
  const dietColorMap = new Map<string, [number, number, number]>();
  diets.forEach((d, i) => {
    dietColorMap.set(d.id, DIET_COLORS[i % DIET_COLORS.length]);
  });

  const totalPages = 3; // 2 calendar pages + 1 legend page
  const monthsPerPage = 6;
  const cols = 3;
  const rows = 2;
  const marginX = 8;

  for (let page = 0; page < 2; page++) {
    if (page > 0) doc.addPage();

    const startMonth = page * monthsPerPage + 1;
    const pageLabel = page === 0 ? "Janeiro – Junho" : "Julho – Dezembro";

    // Header
    const contentStartY = drawHeader(doc, pageW, `Calendário ${year}`, `${speciesName} · ${pageLabel}`, logoBase64);

    // Footer
    drawFooter(doc, pageW, pageH, page + 1, totalPages);

    const footerReserve = 14;
    const availableH = pageH - contentStartY - footerReserve;
    const cellW = (pageW - marginX * 2) / cols;
    const cellH = availableH / rows;

    for (let mi = 0; mi < monthsPerPage; mi++) {
      const month = startMonth + mi;
      const col = mi % cols;
      const row = Math.floor(mi / cols);
      const x = marginX + col * cellW;
      const y = contentStartY + row * cellH;

      drawMonthGrid(doc, x, y, cellW, cellH, year, month, calendar, dietColorMap);
    }
  }

  // Page 3: Legend
  doc.addPage();
  const legendHeaderY = drawHeader(doc, pageW, `Legenda`, speciesName, logoBase64);
  drawFooter(doc, pageW, pageH, totalPages, totalPages);
  drawLegend(doc, pageW, legendHeaderY + 4, pageH - 14, diets, dietColorMap, lp, et);

  doc.save(`Calendario_${speciesName.replace(/\s+/g, "_")}_${year}.pdf`);
}

// =============================================
// ALL SPECIES EXPORT — 2 pages per species + shared legend
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

  const logoBase64 = await loadLogoBase64();

  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();

  const speciesWithDiets = speciesList.filter(sp => {
    const dietsForSp = allDiets.filter(d => d.speciesId === sp.id);
    const calForSp = allCalendars[sp.id] || {};
    return dietsForSp.length > 0 || Object.keys(calForSp).length > 0;
  });

  if (speciesWithDiets.length === 0) {
    const contentY = drawHeader(doc, pageW, "Calendário Anual", "Nenhuma espécie encontrada", logoBase64);
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...B.muted);
    doc.text("Nenhuma dieta ou calendário encontrado para exportar.", pageW / 2, contentY + 40, { align: "center" });
    drawFooter(doc, pageW, pageH);
    doc.save(`Calendario_Completo_${year}.pdf`);
    return;
  }

  let pageCounter = 0;

  // For full year: 2 pages per species
  const isFullYear = activeMonths.length === 12;

  speciesWithDiets.forEach((sp, spIdx) => {
    const dietsForSp = allDiets.filter(d => d.speciesId === sp.id);
    const calForSp = allCalendars[sp.id] || {};

    const dietColorMap = new Map<string, [number, number, number]>();
    dietsForSp.forEach((d, i) => {
      dietColorMap.set(d.id, DIET_COLORS[i % DIET_COLORS.length]);
    });

    if (isFullYear) {
      // 2 pages: 6 months each
      for (let half = 0; half < 2; half++) {
        if (pageCounter > 0) doc.addPage();
        pageCounter++;

        const startMonth = half * 6 + 1;
        const pageLabel = half === 0 ? "Janeiro – Junho" : "Julho – Dezembro";

        const contentStartY = drawHeader(doc, pageW, `Calendário ${year}`, `${sp.commonName} · ${pageLabel}`, logoBase64);
        drawFooter(doc, pageW, pageH);

        const cols = 3;
        const rows = 2;
        const marginX = 8;
        const footerReserve = 14;
        const availableH = pageH - contentStartY - footerReserve;
        const cellW = (pageW - marginX * 2) / cols;
        const cellH = availableH / rows;

        for (let mi = 0; mi < 6; mi++) {
          const month = startMonth + mi;
          const col = mi % cols;
          const row = Math.floor(mi / cols);
          const x = marginX + col * cellW;
          const y = contentStartY + row * cellH;

          drawMonthGrid(doc, x, y, cellW, cellH, year, month, calForSp, dietColorMap);
        }
      }
    } else {
      // Fewer months: fit on 1 page
      if (pageCounter > 0) doc.addPage();
      pageCounter++;

      const monthCount = activeMonths.length;
      const cols = monthCount <= 2 ? 2 : monthCount <= 3 ? 3 : 3;
      const rows = Math.ceil(monthCount / cols);
      const marginX = 8;

      const contentStartY = drawHeader(doc, pageW, `Calendário ${year}`, sp.commonName, logoBase64);
      drawFooter(doc, pageW, pageH);

      const footerReserve = 14;
      const availableH = pageH - contentStartY - footerReserve;
      const cellW = (pageW - marginX * 2) / cols;
      const cellH = availableH / Math.max(rows, 1);

      for (let mi = 0; mi < activeMonths.length; mi++) {
        const month = activeMonths[mi];
        const col = mi % cols;
        const row = Math.floor(mi / cols);
        const x = marginX + col * cellW;
        const y = contentStartY + row * cellH;

        drawMonthGrid(doc, x, y, cellW, cellH, year, month, calForSp, dietColorMap);
      }
    }

    // Legend page for this species (only if it has diets)
    if (dietsForSp.length > 0) {
      doc.addPage();
      pageCounter++;
      const legendHeaderY = drawHeader(doc, pageW, `Legenda`, sp.commonName, logoBase64);
      drawFooter(doc, pageW, pageH);
      drawLegend(doc, pageW, legendHeaderY + 4, pageH - 14, dietsForSp, dietColorMap, lifePeriods, enclosureTypes);
    }
  });

  doc.save(`Calendario_Completo_${year}.pdf`);
}
