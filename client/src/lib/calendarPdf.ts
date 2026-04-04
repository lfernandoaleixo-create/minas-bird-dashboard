/**
 * Exportação do Calendário Anual em PDF
 * Gera um PDF com o calendário de todas as espécies ativas,
 * mostrando dietas atribuídas e feriados.
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

// Cores para dietas (versões para PDF - RGB)
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

interface CalendarPdfOptions {
  year: number;
  speciesName: string;
  speciesId: string;
  diets: SavedDiet[];
  calendar: Record<string, string>; // dayKey → dietId
}

export function exportCalendarPdf(options: CalendarPdfOptions): void {
  const { year, speciesName, diets, calendar } = options;

  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();

  // Título
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text(`Calendário Anual ${year} — ${speciesName}`, pageW / 2, 14, { align: "center" });

  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(120, 120, 120);
  doc.text(`Criatório Minas Bird — Gerado em ${new Date().toLocaleDateString("pt-BR")}`, pageW / 2, 19, { align: "center" });
  doc.setTextColor(0, 0, 0);

  // Mapa de cores por dieta
  const dietColorMap = new Map<string, [number, number, number]>();
  diets.forEach((d, i) => {
    dietColorMap.set(d.id, DIET_COLORS[i % DIET_COLORS.length]);
  });

  // Layout: 4 colunas x 3 linhas de meses
  const cols = 4;
  const rows = 3;
  const marginX = 8;
  const marginY = 22;
  const cellW = (pageW - marginX * 2) / cols;
  const cellH = (pageH - marginY - 8) / rows;

  for (let month = 1; month <= 12; month++) {
    const col = (month - 1) % cols;
    const row = Math.floor((month - 1) / cols);
    const x = marginX + col * cellW;
    const y = marginY + row * cellH;

    // Cabeçalho do mês
    doc.setFillColor(245, 245, 244);
    doc.roundedRect(x + 1, y, cellW - 2, 6, 1, 1, "F");
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(41, 37, 36);
    doc.text(MONTH_NAMES[month - 1], x + cellW / 2, y + 4.2, { align: "center" });

    // Dias da semana
    const dayHeaderY = y + 8;
    doc.setFontSize(5);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(120, 113, 108);
    const dayCellW = (cellW - 4) / 7;
    for (let d = 0; d < 7; d++) {
      doc.text(DAY_NAMES[d], x + 2 + d * dayCellW + dayCellW / 2, dayHeaderY, { align: "center" });
    }

    // Dias do mês
    const daysInMonth = new Date(year, month, 0).getDate();
    const firstDayOfWeek = new Date(year, month - 1, 1).getDay();
    const dayCellH = 4;
    let currentRow = 0;

    doc.setFontSize(5);
    doc.setFont("helvetica", "normal");

    for (let day = 1; day <= daysInMonth; day++) {
      const dayOfWeek = (firstDayOfWeek + day - 1) % 7;
      if (day > 1 && dayOfWeek === 0) currentRow++;

      const dx = x + 2 + dayOfWeek * dayCellW;
      const dy = dayHeaderY + 2 + currentRow * dayCellH;

      const dayKey = `${year}-${month}-${day}`;
      const legacyKey = `${month}-${day}`;
      const assignedDietId = calendar[dayKey] || calendar[legacyKey];
      const feriadoKey = `${month}-${day}`;
      const isFeriado = !!FERIADOS[feriadoKey];

      if (assignedDietId && dietColorMap.has(assignedDietId)) {
        const [r, g, b] = dietColorMap.get(assignedDietId)!;
        doc.setFillColor(r, g, b);
        doc.roundedRect(dx, dy, dayCellW - 0.5, dayCellH - 0.5, 0.5, 0.5, "F");
        doc.setTextColor(255, 255, 255);
      } else if (isFeriado) {
        doc.setFillColor(254, 226, 226);
        doc.roundedRect(dx, dy, dayCellW - 0.5, dayCellH - 0.5, 0.5, 0.5, "F");
        doc.setTextColor(220, 38, 38);
      } else {
        doc.setTextColor(87, 83, 78);
      }

      doc.text(String(day), dx + (dayCellW - 0.5) / 2, dy + 2.8, { align: "center" });
      doc.setTextColor(0, 0, 0);
    }

    // Feriados do mês no rodapé
    const feriadosDoMes: { day: number; name: string }[] = [];
    for (let d = 1; d <= daysInMonth; d++) {
      const fKey = `${month}-${d}`;
      if (FERIADOS[fKey]) feriadosDoMes.push({ day: d, name: FERIADOS[fKey] });
    }

    if (feriadosDoMes.length > 0) {
      const footerY = dayHeaderY + 2 + (currentRow + 1) * dayCellH + 1;
      doc.setFontSize(4);
      doc.setFont("helvetica", "italic");
      doc.setTextColor(220, 38, 38);
      feriadosDoMes.forEach((f, i) => {
        const text = `${f.day} — ${f.name}`;
        doc.text(text, x + 2, footerY + i * 2.5);
      });
      doc.setTextColor(0, 0, 0);
    }
  }

  // Legenda no rodapé da página
  const legendY = pageH - 6;
  doc.setFontSize(5.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(120, 113, 108);

  let legendX = marginX;
  diets.forEach(diet => {
    const color = dietColorMap.get(diet.id);
    if (color) {
      const [r, g, b] = color;
      doc.setFillColor(r, g, b);
      doc.roundedRect(legendX, legendY - 1.5, 3, 3, 0.5, 0.5, "F");
      legendX += 4;
      doc.text(diet.name, legendX, legendY + 0.5);
      legendX += doc.getTextWidth(diet.name) + 4;
    }
  });

  // Legenda de feriado
  doc.setFillColor(254, 226, 226);
  doc.roundedRect(legendX, legendY - 1.5, 3, 3, 0.5, 0.5, "F");
  legendX += 4;
  doc.setTextColor(220, 38, 38);
  doc.text("Feriado", legendX, legendY + 0.5);

  doc.setTextColor(0, 0, 0);

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
): void {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();

  const speciesWithDiets = speciesList.filter(sp => {
    const dietsForSp = allDiets.filter(d => d.speciesId === sp.id);
    const calForSp = allCalendars[sp.id] || {};
    return dietsForSp.length > 0 || Object.keys(calForSp).length > 0;
  });

  if (speciesWithDiets.length === 0) {
    // Página vazia com mensagem
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Nenhuma dieta ou calendário encontrado para exportar.", pageW / 2, pageH / 2, { align: "center" });
    doc.save(`Calendario_Completo_${year}.pdf`);
    return;
  }

  speciesWithDiets.forEach((sp, idx) => {
    if (idx > 0) doc.addPage();

    const dietsForSp = allDiets.filter(d => d.speciesId === sp.id);
    const calForSp = allCalendars[sp.id] || {};

    const dietColorMap = new Map<string, [number, number, number]>();
    dietsForSp.forEach((d, i) => {
      dietColorMap.set(d.id, DIET_COLORS[i % DIET_COLORS.length]);
    });

    // Título
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0, 0, 0);
    doc.text(`Calendário Anual ${year} — ${sp.commonName}`, pageW / 2, 14, { align: "center" });

    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(120, 120, 120);
    doc.text(`Criatório Minas Bird — Gerado em ${new Date().toLocaleDateString("pt-BR")}`, pageW / 2, 19, { align: "center" });
    doc.setTextColor(0, 0, 0);

    const cols = 4;
    const rows = 3;
    const marginX = 8;
    const marginY = 22;
    const cellW = (pageW - marginX * 2) / cols;
    const cellH = (pageH - marginY - 8) / rows;

    for (let month = 1; month <= 12; month++) {
      const col = (month - 1) % cols;
      const row = Math.floor((month - 1) / cols);
      const x = marginX + col * cellW;
      const y = marginY + row * cellH;

      doc.setFillColor(245, 245, 244);
      doc.roundedRect(x + 1, y, cellW - 2, 6, 1, 1, "F");
      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(41, 37, 36);
      doc.text(MONTH_NAMES[month - 1], x + cellW / 2, y + 4.2, { align: "center" });

      const dayHeaderY = y + 8;
      doc.setFontSize(5);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(120, 113, 108);
      const dayCellW = (cellW - 4) / 7;
      for (let d = 0; d < 7; d++) {
        doc.text(DAY_NAMES[d], x + 2 + d * dayCellW + dayCellW / 2, dayHeaderY, { align: "center" });
      }

      const daysInMonth = new Date(year, month, 0).getDate();
      const firstDayOfWeek = new Date(year, month - 1, 1).getDay();
      const dayCellH = 4;
      let currentRow = 0;

      doc.setFontSize(5);
      doc.setFont("helvetica", "normal");

      for (let day = 1; day <= daysInMonth; day++) {
        const dayOfWeek = (firstDayOfWeek + day - 1) % 7;
        if (day > 1 && dayOfWeek === 0) currentRow++;

        const dx = x + 2 + dayOfWeek * dayCellW;
        const dy = dayHeaderY + 2 + currentRow * dayCellH;

        const dayKey = `${year}-${month}-${day}`;
        const legacyKey = `${month}-${day}`;
        const assignedDietId = calForSp[dayKey] || calForSp[legacyKey];
        const feriadoKey = `${month}-${day}`;
        const isFeriado = !!FERIADOS[feriadoKey];

        if (assignedDietId && dietColorMap.has(assignedDietId)) {
          const [r, g, b] = dietColorMap.get(assignedDietId)!;
          doc.setFillColor(r, g, b);
          doc.roundedRect(dx, dy, dayCellW - 0.5, dayCellH - 0.5, 0.5, 0.5, "F");
          doc.setTextColor(255, 255, 255);
        } else if (isFeriado) {
          doc.setFillColor(254, 226, 226);
          doc.roundedRect(dx, dy, dayCellW - 0.5, dayCellH - 0.5, 0.5, 0.5, "F");
          doc.setTextColor(220, 38, 38);
        } else {
          doc.setTextColor(87, 83, 78);
        }

        doc.text(String(day), dx + (dayCellW - 0.5) / 2, dy + 2.8, { align: "center" });
        doc.setTextColor(0, 0, 0);
      }

      // Feriados no rodapé
      const feriadosDoMes: { day: number; name: string }[] = [];
      for (let d = 1; d <= daysInMonth; d++) {
        const fKey = `${month}-${d}`;
        if (FERIADOS[fKey]) feriadosDoMes.push({ day: d, name: FERIADOS[fKey] });
      }

      if (feriadosDoMes.length > 0) {
        const footerY = dayHeaderY + 2 + (currentRow + 1) * dayCellH + 1;
        doc.setFontSize(4);
        doc.setFont("helvetica", "italic");
        doc.setTextColor(220, 38, 38);
        feriadosDoMes.forEach((f, i) => {
          doc.text(`${f.day} — ${f.name}`, x + 2, footerY + i * 2.5);
        });
        doc.setTextColor(0, 0, 0);
      }
    }

    // Legenda
    const legendY = pageH - 6;
    doc.setFontSize(5.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(120, 113, 108);

    let legendX = 8;
    dietsForSp.forEach(diet => {
      const color = dietColorMap.get(diet.id);
      if (color) {
        const [r, g, b] = color;
        doc.setFillColor(r, g, b);
        doc.roundedRect(legendX, legendY - 1.5, 3, 3, 0.5, 0.5, "F");
        legendX += 4;
        doc.text(diet.name, legendX, legendY + 0.5);
        legendX += doc.getTextWidth(diet.name) + 4;
      }
    });

    doc.setFillColor(254, 226, 226);
    doc.roundedRect(legendX, legendY - 1.5, 3, 3, 0.5, 0.5, "F");
    legendX += 4;
    doc.setTextColor(220, 38, 38);
    doc.text("Feriado", legendX, legendY + 0.5);
    doc.setTextColor(0, 0, 0);
  });

  doc.save(`Calendario_Completo_${year}.pdf`);
}
