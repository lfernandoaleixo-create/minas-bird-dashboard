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
  // REGRA PERMANENTE: nome = "Espécie — Fase — Ração" (sem recinto)
  const racao = diet.racaoName || "";

  // Header using shared brand
  let y = drawBrandHeader(doc, pageW, logo, diet.speciesName, `${phaseLabel}${racao ? ` \u00b7 ${racao}` : ""}`);

  // Color identification band — matches calendar color
  const dietHex = diet.color || "#10b981";
  const cr = parseInt(dietHex.slice(1, 3), 16);
  const cg = parseInt(dietHex.slice(3, 5), 16);
  const cb = parseInt(dietHex.slice(5, 7), 16);
  // Thick color stripe below header
  doc.setFillColor(cr, cg, cb);
  doc.rect(margin, y, contentW, 4, "F");
  // Light color band with label
  doc.setFillColor(cr, cg, cb);
  doc.rect(margin, y + 4, contentW, 7, "F");
  doc.setGState(new (doc as any).GState({ opacity: 0.2 }));
  doc.setFillColor(255, 255, 255);
  doc.rect(margin, y + 4, contentW, 7, "F");
  doc.setGState(new (doc as any).GState({ opacity: 1 }));
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(cr, cg, cb);
  doc.text("COR DE REFER\u00caNCIA DO CALEND\u00c1RIO", margin + 3, y + 9);
  // Small color swatch
  doc.setFillColor(cr, cg, cb);
  doc.roundedRect(pageW - margin - 14, y + 5, 12, 5, 1, 1, "F");
  y += 14;

  // Diet name
  y += 2;
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...BRAND.text);
  doc.text(phaseLabel, margin, y);
  y += 5;
  
  if (racao) {
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...BRAND.amber);
    doc.text(`Ração: ${racao}`, margin, y);
    y += 4.5;
  }

  // Info boxes
  y += 2;
  const boxW = contentW / 4;
  const boxH = 12;

  // Calculate salad totals (vegetais + frutas + proteicos)
  const saladGrams = (diet.items.vegetais?.reduce((s, i) => s + i.grams, 0) || 0)
    + (diet.items.frutas?.reduce((s, i) => s + i.grams, 0) || 0)
    + (diet.items.proteicos?.reduce((s, i) => s + i.grams, 0) || 0);
  const saladKcal = (diet.items.vegetais?.reduce((s, i) => s + i.kcal, 0) || 0)
    + (diet.items.frutas?.reduce((s, i) => s + i.kcal, 0) || 0)
    + (diet.items.proteicos?.reduce((s, i) => s + i.kcal, 0) || 0);
  const racaoGrams = diet.items.racao?.reduce((s, i) => s + i.grams, 0) || 0;
  const racaoKcal = diet.items.racao?.reduce((s, i) => s + i.kcal, 0) || 0;

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
  y += boxH + 4;

  // =============================================
  // RESUMO RÁPIDO: RAÇÃO vs SALADA (por ave)
  // =============================================
  const summaryBoxW = contentW / 2;
  const summaryBoxH = 14;

  // Ração box
  doc.setFillColor(...BRAND.amberBg);
  doc.roundedRect(margin, y, summaryBoxW - 2, summaryBoxH, 2, 2, "F");
  doc.setDrawColor(...BRAND.amber);
  doc.setLineWidth(0.5);
  doc.roundedRect(margin, y, summaryBoxW - 2, summaryBoxH, 2, 2, "S");
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...BRAND.amber);
  doc.text("RAÇÃO (por ave)", margin + 3, y + 5);
  doc.setFontSize(11);
  doc.text(fmtWeight(racaoGrams), margin + 3, y + 11.5);
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...BRAND.muted);
  doc.text(`${racaoKcal.toFixed(1)} kcal`, margin + summaryBoxW - 20, y + 11.5);

  // Salada box
  const saladX = margin + summaryBoxW;
  doc.setFillColor(...BRAND.greenBg);
  doc.roundedRect(saladX, y, summaryBoxW - 2, summaryBoxH, 2, 2, "F");
  doc.setDrawColor(...BRAND.green);
  doc.setLineWidth(0.5);
  doc.roundedRect(saladX, y, summaryBoxW - 2, summaryBoxH, 2, 2, "S");
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...BRAND.green);
  doc.text("SALADA (por ave)", saladX + 3, y + 5);
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...BRAND.muted);
  doc.text("Vegetais + Frutas + Proteicos", saladX + 3 + doc.getTextWidth("SALADA (por ave)") + 2, y + 5);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...BRAND.green);
  doc.text(saladGrams > 0 ? fmtWeight(saladGrams) : "—", saladX + 3, y + 11.5);
  if (saladGrams > 0) {
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...BRAND.muted);
    doc.text(`${saladKcal.toFixed(1)} kcal`, saladX + summaryBoxW - 20, y + 11.5);
  }

  y += summaryBoxH + 4;

  // If multiple birds, show total ração + salada for all birds
  if (diet.birdCount > 1) {
    const totalSummaryH = 10;
    doc.setFillColor(245, 245, 245);
    doc.roundedRect(margin, y, contentW, totalSummaryH, 2, 2, "F");
    doc.setFontSize(7.5);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...BRAND.dark);
    doc.text(`PARA ${diet.birdCount} AVES:`, margin + 3, y + 6.5);
    doc.setTextColor(...BRAND.amber);
    doc.text(`Ração: ${fmtWeight(racaoGrams * diet.birdCount)}`, margin + 40, y + 6.5);
    doc.setTextColor(...BRAND.green);
    doc.text(`Salada: ${saladGrams > 0 ? fmtWeight(saladGrams * diet.birdCount) : "—"}`, margin + 85, y + 6.5);
    doc.setTextColor(...BRAND.blue);
    doc.text(`Total: ${fmtWeight(diet.totalGrams * diet.birdCount)}`, margin + 135, y + 6.5);
    y += totalSummaryH + 2;
  }

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
      y = drawBrandHeader(doc, pageW, logo, diet.speciesName, `${phaseLabel}${racao ? ` · ${racao}` : ""}`);
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

  // =============================================
  // SUBTOTAL SALADA (vegetais + frutas + proteicos) por ave
  // =============================================
  if (saladGrams > 0) {
    if (y > pageH - 30) {
      drawBrandFooter(doc, pageW, pageH);
      doc.addPage();
      y = drawBrandHeader(doc, pageW, logo, diet.speciesName, `${phaseLabel}${racao ? ` · ${racao}` : ""}`);
      y += 4;
    }
    doc.setFillColor(220, 245, 230);
    doc.roundedRect(margin, y, contentW, 8, 1.5, 1.5, "F");
    doc.setDrawColor(...BRAND.green);
    doc.setLineWidth(0.4);
    doc.roundedRect(margin, y, contentW, 8, 1.5, 1.5, "S");
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...BRAND.green);
    doc.text("\u{1F957} Subtotal SALADA (Vegetais + Frutas + Proteicos)", margin + 3, y + 5.5);
    doc.text(`${fmtWeight(saladGrams)}  ·  ${saladKcal.toFixed(1)} kcal`, pageW - margin - 3, y + 5.5, { align: "right" });
    y += 12;
  }

  // Total per bird (Ração + Salada)
  if (y > pageH - 30) {
    drawBrandFooter(doc, pageW, pageH);
    doc.addPage();
    y = drawBrandHeader(doc, pageW, logo, diet.speciesName, `${phaseLabel}${racao ? ` · ${racao}` : ""}`);
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
        y = drawBrandHeader(doc, pageW, logo, diet.speciesName, `${phaseLabel}${racao ? ` · ${racao}` : ""}`);
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

    // Subtotal Salada for all birds
    if (saladGrams > 0) {
      if (y > pageH - 20) {
        drawBrandFooter(doc, pageW, pageH);
        doc.addPage();
        y = drawBrandHeader(doc, pageW, logo, diet.speciesName, `${phaseLabel}${racao ? ` · ${racao}` : ""}`);
        y += 4;
      }
      doc.setFillColor(220, 245, 230);
      doc.roundedRect(margin, y, contentW, 8, 1.5, 1.5, "F");
      doc.setDrawColor(...BRAND.green);
      doc.setLineWidth(0.4);
      doc.roundedRect(margin, y, contentW, 8, 1.5, 1.5, "S");
      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...BRAND.green);
      doc.text(`\u{1F957} Subtotal SALADA (${diet.birdCount} aves)`, margin + 3, y + 5.5);
      doc.text(`${fmtWeight(saladGrams * diet.birdCount)}  ·  ${(saladKcal * diet.birdCount).toFixed(1)} kcal`, pageW - margin - 3, y + 5.5, { align: "right" });
      y += 12;
    }

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
