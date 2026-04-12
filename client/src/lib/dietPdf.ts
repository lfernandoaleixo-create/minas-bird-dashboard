/**
 * Exportação de Dieta em PDF — Design Profissional
 * Identidade visual Criatório Minas Bird (usando módulo compartilhado)
 */
import { jsPDF } from "jspdf";
import type { SavedDiet } from "./dietStorage";
import { BRAND, loadLogo, drawBrandHeader, drawBrandFooter, fmtWeight, PDF_FONT } from "./pdfBrand";

interface LifePeriodInfo {
  id: string;
  label: string;
}

interface EnclosureInfo {
  id: string;
  label: string;
}

export async function exportDietPdf(
  diet: SavedDiet,
  lifePeriods: LifePeriodInfo[],
  enclosureTypes: EnclosureInfo[],
): Promise<void> {
  const logo = await loadLogo();
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 12; // margem padrão portrait
  const contentW = pageW - margin * 2;

  const phaseLabel = lifePeriods.find(p => p.id === diet.phaseId)?.label || diet.phaseId;
  const enclosureLabel = enclosureTypes.find(e => e.id === diet.enclosureId)?.label || diet.enclosureId;

  // Header using shared brand
  let y = drawBrandHeader(doc, pageW, logo, diet.speciesName, `${phaseLabel} · ${enclosureLabel}`);

  // Diet name
  y += 2;
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...BRAND.text);
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
    { label: "Total/ave", value: `${fmtWeight(diet.totalGrams)} · ${diet.totalKcal.toFixed(1)} kcal` },
  ];
  infoBoxes.forEach((box, i) => {
    const bx = margin + i * boxW;
    doc.setFillColor(...BRAND.bg);
    doc.roundedRect(bx + 1, y, boxW - 2, boxH, 1.5, 1.5, "F");
    doc.setFontSize(7);
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

  const drawFoodSection = (
    title: string,
    items: typeof diet.items.racao,
    bgColor: [number, number, number],
    textColor: [number, number, number],
  ) => {
    if (items.length === 0) return;
    if (y > pageH - 40) {
      drawBrandFooter(doc, pageW, pageH);
      doc.addPage();
      y = drawBrandHeader(doc, pageW, logo, diet.speciesName, `${phaseLabel} · ${enclosureLabel}`);
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
      doc.text(`${fmtWeight(item.grams)}  (${item.kcal.toFixed(1)} kcal)`, pageW - margin - 2, y + 0.5, { align: "right" });
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
    drawBrandFooter(doc, pageW, pageH);
    doc.addPage();
    y = drawBrandHeader(doc, pageW, logo, diet.speciesName, `${phaseLabel} · ${enclosureLabel}`);
    y += 4;
  }

  doc.setFillColor(...BRAND.light);
  doc.roundedRect(margin, y, contentW, 8, 1.5, 1.5, "F");
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...BRAND.dark);
  doc.text("Total por ave", margin + 3, y + 5.5);
  doc.text(`${fmtWeight(diet.totalGrams)}  ·  ${diet.totalKcal.toFixed(1)} kcal`, pageW - margin - 3, y + 5.5, { align: "right" });
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
        drawBrandFooter(doc, pageW, pageH);
        doc.addPage();
        y = drawBrandHeader(doc, pageW, logo, diet.speciesName, `${phaseLabel} · ${enclosureLabel}`);
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
        doc.text(fmtWeight(item.grams * diet.birdCount), pageW - margin - 2, y + 0.5, { align: "right" });
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
      `${fmtWeight(diet.totalGrams * diet.birdCount)}  ·  ${(diet.totalKcal * diet.birdCount).toFixed(1)} kcal`,
      pageW - margin - 3, y + 5.5, { align: "right" }
    );
  }

  drawBrandFooter(doc, pageW, pageH);

  doc.save(`dieta-${diet.speciesName.toLowerCase().replace(/\s+/g, "-")}-${new Date().toISOString().slice(0, 10)}.pdf`);
}
