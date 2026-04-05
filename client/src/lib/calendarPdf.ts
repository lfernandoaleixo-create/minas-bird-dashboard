/**
 * Exportação do Calendário Anual em PDF — Design Profissional
 * Identidade visual Criatório Minas Bird com logo, data de publicação,
 * fontes legíveis, cores vibrantes e layout intuitivo.
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

// Cores para dietas (versões para PDF - RGB) — mais vibrantes
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
const BRAND = {
  primary: [16, 185, 129] as [number, number, number],     // emerald-500
  dark: [6, 78, 59] as [number, number, number],           // emerald-900
  medium: [5, 150, 105] as [number, number, number],       // emerald-600
  light: [209, 250, 229] as [number, number, number],      // emerald-100
  bg: [240, 253, 244] as [number, number, number],         // emerald-50
  text: [41, 37, 36] as [number, number, number],          // stone-800
  muted: [120, 113, 108] as [number, number, number],      // stone-500
  feriado: [220, 38, 38] as [number, number, number],      // red-600
  feriadoBg: [254, 226, 226] as [number, number, number],  // red-100
};

interface CalendarPdfOptions {
  year: number;
  speciesName: string;
  speciesId: string;
  diets: SavedDiet[];
  calendar: Record<string, string>; // dayKey → dietId
}

/** Desenha o cabeçalho profissional com identidade visual */
function drawHeader(doc: jsPDF, pageW: number, title: string, subtitle: string): number {
  // Barra superior verde
  doc.setFillColor(...BRAND.dark);
  doc.rect(0, 0, pageW, 3, "F");

  // Faixa de cabeçalho
  doc.setFillColor(...BRAND.bg);
  doc.rect(0, 3, pageW, 20, "F");

  // Linha inferior da faixa
  doc.setDrawColor(...BRAND.primary);
  doc.setLineWidth(0.3);
  doc.line(0, 23, pageW, 23);

  // Símbolo do criatório (pássaro estilizado)
  const logoX = 10;
  const logoY = 7;
  doc.setFillColor(...BRAND.primary);
  doc.circle(logoX + 4, logoY + 5, 4, "F");
  doc.setFillColor(255, 255, 255);
  doc.circle(logoX + 5.5, logoY + 4, 1.2, "F");
  doc.setFillColor(...BRAND.dark);
  doc.circle(logoX + 5.5, logoY + 4, 0.5, "F");
  // Bico
  doc.setFillColor(...BRAND.medium);
  doc.triangle(logoX + 8, logoY + 5, logoX + 10, logoY + 4.5, logoX + 8, logoY + 6, "F");

  // Nome do criatório
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...BRAND.dark);
  doc.text("Criatório Minas Bird", logoX + 14, logoY + 4);

  // Subtítulo do criatório
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...BRAND.muted);
  doc.text("Manual Operacional de Alimentação", logoX + 14, logoY + 8);

  // Título principal (direita)
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...BRAND.text);
  doc.text(title, pageW - 10, logoY + 4, { align: "right" });

  // Subtítulo (direita)
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...BRAND.muted);
  doc.text(subtitle, pageW - 10, logoY + 8, { align: "right" });

  return 26; // Y onde começa o conteúdo
}

/** Desenha o rodapé com data de publicação */
function drawFooter(doc: jsPDF, pageW: number, pageH: number, pageNum?: number, totalPages?: number): void {
  const footerY = pageH - 7;

  // Linha separadora
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.2);
  doc.line(8, footerY - 2, pageW - 8, footerY - 2);

  // Data de publicação
  const now = new Date();
  const dateStr = `${now.getDate().toString().padStart(2, "0")}/${(now.getMonth() + 1).toString().padStart(2, "0")}/${now.getFullYear()}`;
  const timeStr = `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`;

  doc.setFontSize(6);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...BRAND.muted);
  doc.text(`Publicado em ${dateStr} às ${timeStr}`, 8, footerY);

  // Nome do criatório centralizado
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...BRAND.medium);
  doc.text("Criatório Minas Bird", pageW / 2, footerY, { align: "center" });

  // Paginação
  if (pageNum !== undefined && totalPages !== undefined) {
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...BRAND.muted);
    doc.text(`Página ${pageNum} de ${totalPages}`, pageW - 8, footerY, { align: "right" });
  }
}

/** Renderiza o grid de um mês */
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
  // Cabeçalho do mês com fundo colorido
  doc.setFillColor(...BRAND.dark);
  doc.roundedRect(x + 1, y, cellW - 2, 7, 1.5, 1.5, "F");
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(255, 255, 255);
  doc.text(MONTH_NAMES[month - 1], x + cellW / 2, y + 5, { align: "center" });

  // Dias da semana
  const dayHeaderY = y + 10;
  doc.setFontSize(5.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...BRAND.dark);
  const dayCellW = (cellW - 4) / 7;
  for (let d = 0; d < 7; d++) {
    doc.text(DAY_NAMES[d], x + 2 + d * dayCellW + dayCellW / 2, dayHeaderY, { align: "center" });
  }

  // Linha separadora abaixo dos dias da semana
  doc.setDrawColor(...BRAND.light);
  doc.setLineWidth(0.2);
  doc.line(x + 2, dayHeaderY + 1.2, x + cellW - 2, dayHeaderY + 1.2);

  // Dias do mês
  const daysInMonth = new Date(year, month, 0).getDate();
  const firstDayOfWeek = new Date(year, month - 1, 1).getDay();
  const dayCellH = 4.5;
  let currentRow = 0;

  doc.setFontSize(6);

  for (let day = 1; day <= daysInMonth; day++) {
    const dayOfWeek = (firstDayOfWeek + day - 1) % 7;
    if (day > 1 && dayOfWeek === 0) currentRow++;

    const dx = x + 2 + dayOfWeek * dayCellW;
    const dy = dayHeaderY + 3 + currentRow * dayCellH;

    const dayKey = `${year}-${month}-${day}`;
    const legacyKey = `${month}-${day}`;
    const assignedDietId = calendar[dayKey] || calendar[legacyKey];
    const feriadoKey = `${month}-${day}`;
    const isFeriado = !!FERIADOS[feriadoKey];

    if (assignedDietId && dietColorMap.has(assignedDietId)) {
      const [r, g, b] = dietColorMap.get(assignedDietId)!;
      doc.setFillColor(r, g, b);
      doc.roundedRect(dx + 0.3, dy, dayCellW - 1, dayCellH - 0.8, 0.7, 0.7, "F");
      doc.setFont("helvetica", "bold");
      doc.setTextColor(255, 255, 255);
    } else if (isFeriado) {
      doc.setFillColor(...BRAND.feriadoBg);
      doc.roundedRect(dx + 0.3, dy, dayCellW - 1, dayCellH - 0.8, 0.7, 0.7, "F");
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...BRAND.feriado);
    } else {
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...BRAND.text);
    }

    doc.text(String(day), dx + (dayCellW - 0.5) / 2, dy + 3, { align: "center" });
    doc.setTextColor(0, 0, 0);
  }

  // Feriados do mês no rodapé do card
  const feriadosDoMes: { day: number; name: string }[] = [];
  for (let d = 1; d <= daysInMonth; d++) {
    const fKey = `${month}-${d}`;
    if (FERIADOS[fKey]) feriadosDoMes.push({ day: d, name: FERIADOS[fKey] });
  }

  if (feriadosDoMes.length > 0) {
    const footerY = dayHeaderY + 3 + (currentRow + 1) * dayCellH + 1;
    doc.setFontSize(4.5);
    doc.setFont("helvetica", "italic");
    doc.setTextColor(...BRAND.feriado);
    feriadosDoMes.forEach((f, i) => {
      doc.text(`${f.day} — ${f.name}`, x + 2, footerY + i * 2.8);
    });
    doc.setTextColor(0, 0, 0);
  }
}

/** Desenha a legenda de dietas e feriados */
function drawLegend(
  doc: jsPDF,
  pageW: number,
  legendY: number,
  diets: SavedDiet[],
  dietColorMap: Map<string, [number, number, number]>,
): void {
  // Fundo da legenda
  doc.setFillColor(250, 250, 249);
  doc.roundedRect(8, legendY - 4, pageW - 16, 8, 1.5, 1.5, "F");
  doc.setDrawColor(230, 230, 230);
  doc.setLineWidth(0.2);
  doc.roundedRect(8, legendY - 4, pageW - 16, 8, 1.5, 1.5, "S");

  // Título da legenda
  doc.setFontSize(5.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...BRAND.dark);
  doc.text("LEGENDA:", 12, legendY);

  let legendX = 32;
  doc.setFontSize(5.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...BRAND.text);

  diets.forEach(diet => {
    const color = dietColorMap.get(diet.id);
    if (color) {
      const [r, g, b] = color;
      doc.setFillColor(r, g, b);
      doc.roundedRect(legendX, legendY - 1.8, 3.5, 3.5, 0.7, 0.7, "F");
      legendX += 4.5;
      doc.text(diet.name, legendX, legendY + 0.5);
      legendX += doc.getTextWidth(diet.name) + 5;
    }
  });

  // Legenda de feriado
  doc.setFillColor(...BRAND.feriadoBg);
  doc.roundedRect(legendX, legendY - 1.8, 3.5, 3.5, 0.7, 0.7, "F");
  legendX += 4.5;
  doc.setTextColor(...BRAND.feriado);
  doc.setFont("helvetica", "bold");
  doc.text("Feriado", legendX, legendY + 0.5);

  doc.setTextColor(0, 0, 0);
}

export function exportCalendarPdf(options: CalendarPdfOptions): void {
  const { year, speciesName, diets, calendar } = options;

  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();

  // Cabeçalho
  const contentStartY = drawHeader(
    doc,
    pageW,
    `Calendário Anual ${year}`,
    speciesName,
  );

  // Mapa de cores por dieta
  const dietColorMap = new Map<string, [number, number, number]>();
  diets.forEach((d, i) => {
    dietColorMap.set(d.id, DIET_COLORS[i % DIET_COLORS.length]);
  });

  // Layout: 4 colunas x 3 linhas de meses
  const cols = 4;
  const rows = 3;
  const marginX = 8;
  const marginY = contentStartY;
  const legendSpace = 16;
  const cellW = (pageW - marginX * 2) / cols;
  const cellH = (pageH - marginY - legendSpace) / rows;

  for (let month = 1; month <= 12; month++) {
    const col = (month - 1) % cols;
    const row = Math.floor((month - 1) / cols);
    const x = marginX + col * cellW;
    const y = marginY + row * cellH;

    drawMonthGrid(doc, x, y, cellW, cellH, year, month, calendar, dietColorMap);
  }

  // Legenda
  drawLegend(doc, pageW, pageH - 12, diets, dietColorMap);

  // Rodapé
  drawFooter(doc, pageW, pageH);

  // Salvar
  doc.save(`Calendario_${speciesName.replace(/\s+/g, "_")}_${year}.pdf`);
}

/**
 * Exportar calendário de todas as espécies em um único PDF multi-página
 */
export function exportAllCalendarsPdf(
  year: number,
  speciesList: { id: string; commonName: string }[],
  allDiets: SavedDiet[],
  allCalendars: Record<string, Record<string, string>>,
  months?: number[],
): void {
  const activeMonths = months && months.length > 0 ? months : Array.from({ length: 12 }, (_, i) => i + 1);
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();

  const speciesWithDiets = speciesList.filter(sp => {
    const dietsForSp = allDiets.filter(d => d.speciesId === sp.id);
    const calForSp = allCalendars[sp.id] || {};
    return dietsForSp.length > 0 || Object.keys(calForSp).length > 0;
  });

  if (speciesWithDiets.length === 0) {
    const contentY = drawHeader(doc, pageW, "Calendário Anual", "Nenhuma espécie encontrada");
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...BRAND.muted);
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

    // Cabeçalho
    const contentStartY = drawHeader(
      doc,
      pageW,
      `Calendário Anual ${year}`,
      sp.commonName,
    );

    const monthCount = activeMonths.length;
    const cols = monthCount <= 1 ? 1 : monthCount <= 4 ? 2 : monthCount <= 6 ? 3 : 4;
    const rows = Math.ceil(monthCount / cols);
    const marginX = 8;
    const marginY = contentStartY;
    const legendSpace = 16;
    const cellW = (pageW - marginX * 2) / cols;
    const cellH = (pageH - marginY - legendSpace) / Math.max(rows, 1);

    for (let mi = 0; mi < activeMonths.length; mi++) {
      const month = activeMonths[mi];
      const col = mi % cols;
      const row = Math.floor(mi / cols);
      const x = marginX + col * cellW;
      const y = marginY + row * cellH;

      drawMonthGrid(doc, x, y, cellW, cellH, year, month, calForSp, dietColorMap);
    }

    // Legenda
    drawLegend(doc, pageW, pageH - 12, dietsForSp, dietColorMap);

    // Rodapé com paginação
    drawFooter(doc, pageW, pageH, idx + 1, totalPages);
  });

  doc.save(`Calendario_Completo_${year}.pdf`);
}
