/**
 * Exportação de Dieta em PDF — Design Profissional
 * Identidade visual Criatório Minas Bird
 */
import { jsPDF } from "jspdf";
import type { SavedDiet } from "./dietStorage";

// Brand colors
const BRAND = {
  primary: [16, 185, 129] as [number, number, number],
  dark: [6, 78, 59] as [number, number, number],
  medium: [5, 150, 105] as [number, number, number],
  light: [209, 250, 229] as [number, number, number],
  bg: [240, 253, 244] as [number, number, number],
  text: [41, 37, 36] as [number, number, number],
  muted: [120, 113, 108] as [number, number, number],
  amber: [180, 83, 9] as [number, number, number],
  amberBg: [255, 251, 235] as [number, number, number],
  green: [21, 128, 61] as [number, number, number],
  greenBg: [240, 253, 244] as [number, number, number],
  red: [185, 28, 28] as [number, number, number],
  redBg: [254, 242, 242] as [number, number, number],
  yellow: [161, 98, 7] as [number, number, number],
  yellowBg: [254, 252, 232] as [number, number, number],
  blue: [29, 78, 216] as [number, number, number],
  blueBg: [239, 246, 255] as [number, number, number],
};

interface LifePeriodInfo {
  id: string;
  label: string;
}

interface EnclosureInfo {
  id: string;
  label: string;
}

function drawHeader(doc: jsPDF, pageW: number, title: string, subtitle: string): number {
  doc.setFillColor(...BRAND.dark);
  doc.rect(0, 0, pageW, 3, "F");

  doc.setFillColor(...BRAND.bg);
  doc.rect(0, 3, pageW, 20, "F");

  doc.setDrawColor(...BRAND.primary);
  doc.setLineWidth(0.3);
  doc.line(0, 23, pageW, 23);

  // Símbolo do criatório
  const logoX = 10;
  const logoY = 7;
  doc.setFillColor(...BRAND.primary);
  doc.circle(logoX + 4, logoY + 5, 4, "F");
  doc.setFillColor(255, 255, 255);
  doc.circle(logoX + 5.5, logoY + 4, 1.2, "F");
  doc.setFillColor(...BRAND.dark);
  doc.circle(logoX + 5.5, logoY + 4, 0.5, "F");
  doc.setFillColor(...BRAND.medium);
  doc.triangle(logoX + 8, logoY + 5, logoX + 10, logoY + 4.5, logoX + 8, logoY + 6, "F");

  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...BRAND.dark);
  doc.text("Criatório Minas Bird", logoX + 14, logoY + 4);

  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...BRAND.muted);
  doc.text("Manual Operacional de Alimentação", logoX + 14, logoY + 8);

  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...BRAND.text);
  doc.text(title, pageW - 10, logoY + 4, { align: "right" });

  doc.setFontSize(7.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...BRAND.muted);
  doc.text(subtitle, pageW - 10, logoY + 8, { align: "right" });

  return 28;
}

function drawFooter(doc: jsPDF, pageW: number, pageH: number): void {
  const footerY = pageH - 7;
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.2);
  doc.line(8, footerY - 2, pageW - 8, footerY - 2);

  const now = new Date();
  const dateStr = `${now.getDate().toString().padStart(2, "0")}/${(now.getMonth() + 1).toString().padStart(2, "0")}/${now.getFullYear()}`;
  const timeStr = `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`;

  doc.setFontSize(6);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...BRAND.muted);
  doc.text(`Publicado em ${dateStr} às ${timeStr}`, 8, footerY);

  doc.setFont("helvetica", "bold");
  doc.setTextColor(...BRAND.medium);
  doc.text("Criatório Minas Bird", pageW / 2, footerY, { align: "center" });
}

function fmtG(g: number): string {
  if (g >= 1000) {
    return (g / 1000).toLocaleString("pt-BR", { minimumFractionDigits: 3, maximumFractionDigits: 3 }) + " kg";
  }
  return Math.round(g) + " g";
}

export function exportDietPdf(
  diet: SavedDiet,
  lifePeriods: LifePeriodInfo[],
  enclosureTypes: EnclosureInfo[],
): void {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 12;
  const contentW = pageW - margin * 2;

  const phaseLabel = lifePeriods.find(p => p.id === diet.phaseId)?.label || diet.phaseId;
  const enclosureLabel = enclosureTypes.find(e => e.id === diet.enclosureId)?.label || diet.enclosureId;

  // Header
  let y = drawHeader(doc, pageW, diet.speciesName, `${phaseLabel} · ${enclosureLabel}`);

  // Diet name
  y += 4;
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...BRAND.text);
  // Parse name: Ave — Fase — Ambiente — Ração — obs
  const nameParts = diet.name.split(" \u2014 ");
  const racao = nameParts[3] || diet.racaoName || "";
  const obs = nameParts.length >= 5 ? nameParts.slice(4).join(" — ") : "";
  
  doc.text(`${phaseLabel} — ${enclosureLabel}`, margin, y);
  y += 5;
  
  if (racao) {
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...BRAND.amber);
    doc.text(`Ração: ${racao}`, margin, y);
    y += 4.5;
  }
  if (obs) {
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...BRAND.green);
    doc.text(`Obs: ${obs}`, margin, y);
    y += 4.5;
  }

  // Info boxes
  y += 2;
  const boxW = contentW / 4;
  const boxH = 12;
  const infoBoxes = [
    { label: "Peso", value: `${diet.weight}g` },
    { label: "Aves", value: `${diet.birdCount}` },
    { label: "MER", value: `${diet.mer.toFixed(1)} kcal/dia` },
    { label: "Total/ave", value: `${fmtG(diet.totalGrams)} · ${diet.totalKcal.toFixed(1)} kcal` },
  ];
  infoBoxes.forEach((box, i) => {
    const bx = margin + i * boxW;
    doc.setFillColor(...BRAND.bg);
    doc.roundedRect(bx + 1, y, boxW - 2, boxH, 1.5, 1.5, "F");
    doc.setFontSize(6);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...BRAND.muted);
    doc.text(box.label, bx + 3, y + 4);
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...BRAND.dark);
    doc.text(box.value, bx + 3, y + 9);
  });
  y += boxH + 6;

  // Notes
  if (diet.notes) {
    doc.setFillColor(...BRAND.amberBg);
    doc.roundedRect(margin, y, contentW, 8, 1.5, 1.5, "F");
    doc.setFontSize(7);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...BRAND.amber);
    doc.text(`Observações: ${diet.notes}`, margin + 3, y + 5);
    y += 12;
  }

  // Separator
  doc.setDrawColor(220, 220, 220);
  doc.setLineWidth(0.2);
  doc.line(margin, y, pageW - margin, y);
  y += 4;

  // Section title
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...BRAND.text);
  doc.text("COMPOSIÇÃO DA DIETA (por ave / dia)", margin, y);
  y += 5;

  // Helper to draw food items section
  const drawFoodSection = (
    title: string,
    items: typeof diet.items.racao,
    bgColor: [number, number, number],
    textColor: [number, number, number],
  ) => {
    if (items.length === 0) return;
    
    // Check if we need a new page
    if (y > pageH - 40) {
      drawFooter(doc, pageW, pageH);
      doc.addPage();
      y = drawHeader(doc, pageW, diet.speciesName, `${phaseLabel} · ${enclosureLabel}`);
      y += 4;
    }

    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...textColor);
    doc.text(title, margin, y);
    y += 4;

    items.forEach(item => {
      doc.setFillColor(...bgColor);
      doc.roundedRect(margin, y - 2.5, contentW, 5.5, 1, 1, "F");
      doc.setFontSize(7.5);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...BRAND.text);
      doc.text(item.foodName, margin + 2, y + 0.5);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...textColor);
      doc.text(`${fmtG(item.grams)}  (${item.kcal.toFixed(1)} kcal)`, pageW - margin - 2, y + 0.5, { align: "right" });
      y += 6.5;
    });
    y += 2;
  };

  drawFoodSection("RAÇÃO / ALIMENTO FORMULADO", diet.items.racao, BRAND.amberBg, BRAND.amber);
  drawFoodSection("VEGETAIS / HORTALIÇAS", diet.items.vegetais, BRAND.greenBg, BRAND.green);
  drawFoodSection("FRUTAS", diet.items.frutas, BRAND.redBg, BRAND.red);
  drawFoodSection("SEMENTES E PROTEICOS", diet.items.proteicos, BRAND.yellowBg, BRAND.yellow);

  // Total per bird
  if (y > pageH - 30) {
    drawFooter(doc, pageW, pageH);
    doc.addPage();
    y = drawHeader(doc, pageW, diet.speciesName, `${phaseLabel} · ${enclosureLabel}`);
    y += 4;
  }

  doc.setFillColor(...BRAND.light);
  doc.roundedRect(margin, y, contentW, 8, 1.5, 1.5, "F");
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...BRAND.dark);
  doc.text("Total por ave", margin + 3, y + 5.5);
  doc.text(`${fmtG(diet.totalGrams)}  ·  ${diet.totalKcal.toFixed(1)} kcal`, pageW - margin - 3, y + 5.5, { align: "right" });
  y += 12;

  // Total for all birds
  if (diet.birdCount > 1) {
    doc.setDrawColor(220, 220, 220);
    doc.setLineWidth(0.2);
    doc.line(margin, y, pageW - margin, y);
    y += 4;

    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...BRAND.text);
    doc.text(`TOTAL PARA ${diet.birdCount} AVES (diário)`, margin, y);
    y += 5;

    const drawTotalSection = (
      title: string,
      items: typeof diet.items.racao,
      bgColor: [number, number, number],
      textColor: [number, number, number],
    ) => {
      if (items.length === 0) return;
      if (y > pageH - 30) {
        drawFooter(doc, pageW, pageH);
        doc.addPage();
        y = drawHeader(doc, pageW, diet.speciesName, `${phaseLabel} · ${enclosureLabel}`);
        y += 4;
      }
      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...textColor);
      doc.text(title, margin, y);
      y += 4;
      items.forEach(item => {
        doc.setFillColor(...bgColor);
        doc.roundedRect(margin, y - 2.5, contentW, 5.5, 1, 1, "F");
        doc.setFontSize(7.5);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(...BRAND.text);
        doc.text(item.foodName, margin + 2, y + 0.5);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(...textColor);
        doc.text(fmtG(item.grams * diet.birdCount), pageW - margin - 2, y + 0.5, { align: "right" });
        y += 6.5;
      });
      y += 2;
    };

    drawTotalSection("RAÇÃO", diet.items.racao, BRAND.amberBg, BRAND.amber);
    drawTotalSection("VEGETAIS", diet.items.vegetais, BRAND.greenBg, BRAND.green);
    drawTotalSection("FRUTAS", diet.items.frutas, BRAND.redBg, BRAND.red);
    drawTotalSection("PROTEICOS", diet.items.proteicos, BRAND.yellowBg, BRAND.yellow);

    // Grand total
    doc.setFillColor(...BRAND.blueBg);
    doc.roundedRect(margin, y, contentW, 8, 1.5, 1.5, "F");
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...BRAND.blue);
    doc.text(`Total para ${diet.birdCount} aves`, margin + 3, y + 5.5);
    doc.text(
      `${fmtG(diet.totalGrams * diet.birdCount)}  ·  ${(diet.totalKcal * diet.birdCount).toFixed(1)} kcal`,
      pageW - margin - 3, y + 5.5, { align: "right" }
    );
  }

  drawFooter(doc, pageW, pageH);

  doc.save(`dieta-${diet.speciesName.toLowerCase().replace(/\s+/g, "-")}-${new Date().toISOString().slice(0, 10)}.pdf`);
}
