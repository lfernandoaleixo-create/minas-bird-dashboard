/**
 * Exportação do Calendário Anual em PDF — Design Profissional v2
 * Identidade visual Criatório Minas Bird com logo real, layout full-page,
 * legenda grande e visível, tipografia legível.
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
  headerBg: [250, 250, 249] as [number, number, number],
  amber: [180, 83, 9] as [number, number, number],
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
    // Clean food name: remove suffixes like "Crua", "com Casca", etc.
    let name = item.foodName;
    // Remove suffixes after comma or dash: "Beterraba, Crua" → "Beterraba"
    name = name.replace(/[,\s]+(?:Crua?|Cozid[ao]|Assad[ao]|com [Cc]asca|sem [Cc]asca|Fresc[ao]|Sec[ao]|Inteira?o?|Madur[ao]|Verde|Natural|em Pó|Desidratad[ao]|Moíd[ao]|Triturad[ao]|Ralad[ao]|Picad[ao]|Fatiado|em Flocos|em Grãos|em Pedaços)$/gi, "").trim();
    name = name.replace(/\s*[-–]\s*(?:Crua?|Cozid[ao]|Assad[ao]|com [Cc]asca|sem [Cc]asca|Fresc[ao]|Sec[ao]|Inteira?o?|Madur[ao]|Verde|Natural|em Pó|Desidratad[ao]|Moíd[ao]|Triturad[ao]|Ralad[ao]|Picad[ao]|Fatiado|em Flocos|em Grãos|em Pedaços)/gi, "").trim();
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

/** Draw professional header with real logo */
function drawHeader(
  doc: jsPDF,
  pageW: number,
  title: string,
  subtitle: string,
  logoBase64: string | null,
): number {
  const headerH = 24;

  // Dark green top bar
  doc.setFillColor(...B.dark);
  doc.rect(0, 0, pageW, headerH, "F");

  // Logo
  if (logoBase64) {
    try {
      doc.addImage(logoBase64, "PNG", 6, 2, 20, 20);
    } catch {
      // Fallback: draw circle
      doc.setFillColor(...B.primary);
      doc.circle(16, 12, 8, "F");
    }
  } else {
    doc.setFillColor(...B.primary);
    doc.circle(16, 12, 8, "F");
  }

  // Criatório name
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(255, 255, 255);
  doc.text("Criatório Minas Bird", 30, 10);

  // Subtitle
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(200, 230, 210);
  doc.text("Manual Operacional de Alimentação", 30, 16);

  // Right side: title
  doc.setFontSize(15);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(255, 255, 255);
  doc.text(title, pageW - 8, 10, { align: "right" });

  // Right side: subtitle
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(200, 230, 210);
  doc.text(subtitle, pageW - 8, 17, { align: "right" });

  // Thin accent line at bottom of header
  doc.setFillColor(...B.primary);
  doc.rect(0, headerH, pageW, 1.5, "F");

  return headerH + 3;
}

/** Draw footer */
function drawFooter(doc: jsPDF, pageW: number, pageH: number, pageNum?: number, totalPages?: number): void {
  const footerY = pageH - 6;

  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.3);
  doc.line(8, footerY - 2, pageW - 8, footerY - 2);

  const now = new Date();
  const dateStr = `${now.getDate().toString().padStart(2, "0")}/${(now.getMonth() + 1).toString().padStart(2, "0")}/${now.getFullYear()}`;

  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...B.muted);
  doc.text(`Publicado em ${dateStr}`, 8, footerY);

  doc.setFont("helvetica", "bold");
  doc.setTextColor(...B.medium);
  doc.text("Criatório Minas Bird — Ribeirão Vermelho, MG", pageW / 2, footerY, { align: "center" });

  if (pageNum !== undefined && totalPages !== undefined) {
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...B.muted);
    doc.text(`Página ${pageNum} de ${totalPages}`, pageW - 8, footerY, { align: "right" });
  }
}

/** Render month grid — bigger, more readable */
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
  // Month header with rounded rect
  doc.setFillColor(...B.dark);
  doc.roundedRect(x + 1, y, cellW - 2, 8, 2, 2, "F");
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(255, 255, 255);
  doc.text(MONTH_NAMES[month - 1], x + cellW / 2, y + 5.8, { align: "center" });

  // Day names header
  const dayHeaderY = y + 11;
  doc.setFontSize(6.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...B.dark);
  const dayCellW = (cellW - 4) / 7;
  for (let d = 0; d < 7; d++) {
    const color = d === 0 ? B.feriado : B.dark;
    doc.setTextColor(...color);
    doc.text(DAY_NAMES[d], x + 2 + d * dayCellW + dayCellW / 2, dayHeaderY, { align: "center" });
  }

  // Separator
  doc.setDrawColor(...B.light);
  doc.setLineWidth(0.3);
  doc.line(x + 2, dayHeaderY + 2, x + cellW - 2, dayHeaderY + 2);

  // Days
  const daysInMonth = new Date(year, month, 0).getDate();
  const firstDayOfWeek = new Date(year, month - 1, 1).getDay();
  const dayCellH = 5.5;
  let currentRow = 0;

  for (let day = 1; day <= daysInMonth; day++) {
    const dayOfWeek = (firstDayOfWeek + day - 1) % 7;
    if (day > 1 && dayOfWeek === 0) currentRow++;

    const dx = x + 2 + dayOfWeek * dayCellW;
    const dy = dayHeaderY + 4 + currentRow * dayCellH;

    const dayKey = `${year}-${month}-${day}`;
    const legacyKey = `${month}-${day}`;
    const assignedDietId = calendar[dayKey] || calendar[legacyKey];
    const feriadoKey = `${month}-${day}`;
    const isFeriado = !!FERIADOS[feriadoKey];

    // Today highlight
    const today = new Date();
    const isToday = today.getFullYear() === year && today.getMonth() + 1 === month && today.getDate() === day;

    if (assignedDietId && dietColorMap.has(assignedDietId)) {
      const [r, g, b] = dietColorMap.get(assignedDietId)!;
      doc.setFillColor(r, g, b);
      doc.roundedRect(dx + 0.3, dy - 0.5, dayCellW - 0.8, dayCellH - 1, 1, 1, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7.5);
      doc.setTextColor(255, 255, 255);
    } else if (isFeriado) {
      doc.setFillColor(...B.feriadoBg);
      doc.roundedRect(dx + 0.3, dy - 0.5, dayCellW - 0.8, dayCellH - 1, 1, 1, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7.5);
      doc.setTextColor(...B.feriado);
    } else if (dayOfWeek === 0) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(200, 100, 100);
    } else {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(...B.text);
    }

    doc.text(String(day), dx + (dayCellW - 0.5) / 2, dy + 3, { align: "center" });

    // Today ring
    if (isToday) {
      doc.setDrawColor(...B.primary);
      doc.setLineWidth(0.6);
      doc.roundedRect(dx + 0.1, dy - 0.7, dayCellW - 0.4, dayCellH - 0.6, 1.2, 1.2, "S");
    }

    doc.setTextColor(0, 0, 0);
  }

  // Feriados do mês no rodapé do card
  const feriadosDoMes: { day: number; name: string }[] = [];
  for (let d = 1; d <= daysInMonth; d++) {
    const fKey = `${month}-${d}`;
    if (FERIADOS[fKey]) feriadosDoMes.push({ day: d, name: FERIADOS[fKey] });
  }

  if (feriadosDoMes.length > 0) {
    const footerY = dayHeaderY + 4 + (currentRow + 1) * dayCellH + 1;
    doc.setFontSize(5);
    doc.setFont("helvetica", "italic");
    doc.setTextColor(...B.feriado);
    feriadosDoMes.forEach((f, i) => {
      doc.text(`${f.day} — ${f.name}`, x + 3, footerY + i * 3);
    });
    doc.setTextColor(0, 0, 0);
  }
}

/** Draw large, visible legend */
function drawLegend(
  doc: jsPDF,
  pageW: number,
  legendStartY: number,
  pageH: number,
  diets: SavedDiet[],
  dietColorMap: Map<string, [number, number, number]>,
  lifePeriods?: { id: string; label: string }[],
  enclosureTypes?: { id: string; label: string }[],
): void {
  const margin = 8;
  const legendW = pageW - margin * 2;

  // Legend background
  doc.setFillColor(250, 250, 249);
  doc.roundedRect(margin, legendStartY, legendW, pageH - legendStartY - 10, 3, 3, "F");
  doc.setDrawColor(220, 220, 220);
  doc.setLineWidth(0.3);
  doc.roundedRect(margin, legendStartY, legendW, pageH - legendStartY - 10, 3, 3, "S");

  // Legend title
  let ly = legendStartY + 5;
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...B.dark);
  doc.text("LEGENDA DAS DIETAS", margin + 5, ly);
  ly += 5;

  // Diet items — each on its own row with color swatch, name and ingredients
  doc.setFontSize(8);
  diets.forEach(diet => {
    const color = dietColorMap.get(diet.id);
    if (!color) return;

    const [r, g, b] = color;

    // Color swatch
    doc.setFillColor(r, g, b);
    doc.roundedRect(margin + 5, ly - 2.5, 5, 5, 1, 1, "F");

    // Diet display name
    let displayName: string;
    if (lifePeriods && enclosureTypes) {
      displayName = getDietDisplayName(diet, lifePeriods, enclosureTypes);
    } else {
      // Fallback: parse from diet.name
      const parts = diet.name.split(" — ");
      displayName = parts.length >= 3 ? `${parts[1]} — ${parts[2]}` : diet.name;
    }

    doc.setFont("helvetica", "bold");
    doc.setTextColor(...B.text);
    doc.text(displayName, margin + 13, ly + 0.5);

    // Ingredients on same line or next
    const nameWidth = doc.getTextWidth(displayName);
    const ingredientsX = margin + 13 + nameWidth + 3;
    const maxIngredientsW = legendW - (ingredientsX - margin) - 5;

    if (lifePeriods && enclosureTypes) {
      const ingredients = getDietIngredients(diet);
      if (ingredients) {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(7);
        doc.setTextColor(...B.muted);
        // Truncate if too long
        let displayIngredients = ingredients;
        while (doc.getTextWidth(displayIngredients) > maxIngredientsW && displayIngredients.length > 10) {
          displayIngredients = displayIngredients.substring(0, displayIngredients.lastIndexOf(" · ")) + " …";
        }
        doc.text(displayIngredients, ingredientsX, ly + 0.5);
        doc.setFontSize(8);
      }
    }

    ly += 7;
  });

  // Feriado legend
  doc.setFillColor(...B.feriadoBg);
  doc.roundedRect(margin + 5, ly - 2.5, 5, 5, 1, 1, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(...B.feriado);
  doc.text("Feriado Nacional", margin + 13, ly + 0.5);
  ly += 7;

  // Today legend
  doc.setDrawColor(...B.primary);
  doc.setLineWidth(0.6);
  doc.roundedRect(margin + 5, ly - 2.5, 5, 5, 1, 1, "S");
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...B.primary);
  doc.text("Dia Atual", margin + 13, ly + 0.5);

  doc.setTextColor(0, 0, 0);
}

export async function exportCalendarPdf(options: CalendarPdfOptions): Promise<void> {
  const { year, speciesName, diets, calendar, lifePeriods: lp, enclosureTypes: et } = options;

  const logoBase64 = await loadLogoBase64();

  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();

  // Header
  const contentStartY = drawHeader(doc, pageW, `Calendário Anual ${year}`, speciesName, logoBase64);

  // Diet color map
  const dietColorMap = new Map<string, [number, number, number]>();
  diets.forEach((d, i) => {
    dietColorMap.set(d.id, DIET_COLORS[i % DIET_COLORS.length]);
  });

  // Layout: 4 cols x 3 rows — fill the page
  const cols = 4;
  const rows = 3;
  const marginX = 6;
  const legendHeight = 10 + diets.length * 7 + 18; // dynamic based on diet count
  const availableH = pageH - contentStartY - legendHeight - 8;
  const cellW = (pageW - marginX * 2) / cols;
  const cellH = availableH / rows;

  for (let month = 1; month <= 12; month++) {
    const col = (month - 1) % cols;
    const row = Math.floor((month - 1) / cols);
    const x = marginX + col * cellW;
    const y = contentStartY + row * cellH;

    drawMonthGrid(doc, x, y, cellW, cellH, year, month, calendar, dietColorMap);
  }

  // Legend — large and visible at bottom
  const legendY = contentStartY + rows * cellH + 2;
  drawLegend(doc, pageW, legendY, pageH, diets, dietColorMap, lp, et);

  // Footer
  drawFooter(doc, pageW, pageH);

  doc.save(`Calendario_${speciesName.replace(/\s+/g, "_")}_${year}.pdf`);
}

/**
 * Export all species calendars in a single multi-page PDF
 */
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
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...B.muted);
    doc.text("Nenhuma dieta ou calendário encontrado para exportar.", pageW / 2, contentY + 30, { align: "center" });
    drawFooter(doc, pageW, pageH);
    doc.save(`Calendario_Completo_${year}.pdf`);
    return;
  }

  const totalPages = speciesWithDiets.length;

  speciesWithDiets.forEach((sp, idx) => {
    if (idx > 0) doc.addPage();

    const dietsForSp = allDiets.filter(d => d.speciesId === sp.id);
    const calForSp = allCalendars[sp.id] || {};

    const dietColorMap = new Map<string, [number, number, number]>();
    dietsForSp.forEach((d, i) => {
      dietColorMap.set(d.id, DIET_COLORS[i % DIET_COLORS.length]);
    });

    // Header
    const contentStartY = drawHeader(doc, pageW, `Calendário Anual ${year}`, sp.commonName, logoBase64);

    const monthCount = activeMonths.length;
    const cols = monthCount <= 1 ? 1 : monthCount <= 4 ? 2 : monthCount <= 6 ? 3 : 4;
    const rows = Math.ceil(monthCount / cols);
    const marginX = 6;
    const legendHeight = 10 + dietsForSp.length * 7 + 18;
    const availableH = pageH - contentStartY - legendHeight - 8;
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

    // Legend
    const legendY = contentStartY + rows * cellH + 2;
    drawLegend(doc, pageW, legendY, pageH, dietsForSp, dietColorMap, lifePeriods, enclosureTypes);

    // Footer with pagination
    drawFooter(doc, pageW, pageH, idx + 1, totalPages);
  });

  doc.save(`Calendario_Completo_${year}.pdf`);
}
