/**
 * Exportação de Dieta em PDF — Design Profissional para Impressão
 * Identidade visual Criatório Minas Bird (usando módulo compartilhado)
 *
 * REGRAS DE IMPRESSÃO:
 * - NUNCA ultrapassa 1 página (REGRA PERMANENTE)
 * - Sem emojis (helvetica não suporta)
 * - Textos nunca sobrepostos
 * - Fonte mínima 6pt (comprime se necessário)
 */
import { jsPDF } from "jspdf";
import type { SavedDiet } from "./dietStorage";
import { BRAND, loadLogo, drawBrandHeader, drawBrandFooter, fmtWeight, PDF_FONT } from "./pdfBrand";

interface LifePeriodInfo { id: string; label: string; }
interface EnclosureInfo { id: string; label: string; }

export async function exportDietPdf(
  diet: SavedDiet,
  lifePeriods: LifePeriodInfo[],
  enclosureTypes: EnclosureInfo[],
): Promise<void> {
  const logo = await loadLogo();
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 10;
  const contentW = pageW - margin * 2;

  const phaseLabel = lifePeriods.find(p => p.id === diet.phaseId)?.label || diet.phaseId;
  const racao = diet.racaoName || "";

  // Count total items to determine scale factor
  const allItems = [
    ...(diet.items.racao || []),
    ...(diet.items.vegetais || []),
    ...(diet.items.frutas || []),
    ...(diet.items.proteicos || []),
  ];
  const totalItems = allItems.length;
  const hasMultipleBirds = diet.birdCount > 1;

  // Adaptive sizing: compress when many items
  // Base: header(17) + colorBar(10) + phase(8) + infoBoxes(14) + summaryBoxes(18) + multiBirdBar(11) + notes(10) + separator(6) + sectionTitle(6) + subtotalSalada(10) + totalPerBird(10) + footer(8) = ~128mm fixed
  // Each item row = itemH, each section header = 4mm
  // Available for items: 297 - 128 = ~169mm for "por ave" section
  // If multipleBirds, add ~(totalItems * itemH + 40) for "total" section
  const footerY = pageH - 8;
  const fixedOverhead = 128 + (hasMultipleBirds ? 30 : 0) + (diet.notes ? 10 : 0);
  const sectionHeaders = 4 * 4; // 4 sections x 4mm each
  const availableForItems = pageH - fixedOverhead - sectionHeaders;
  const itemSets = hasMultipleBirds ? 2 : 1; // items listed once or twice
  const totalItemRows = totalItems * itemSets;
  const maxItemH = totalItemRows > 0 ? availableForItems / totalItemRows : 5.5;
  const itemH = Math.max(4, Math.min(5.5, maxItemH));
  const fontSize = itemH >= 5 ? 7 : itemH >= 4.5 ? 6.5 : 6;
  const sectionGap = itemH >= 5 ? 2.5 : 1.5;
  const sectionHeaderH = itemH >= 5 ? 4 : 3;

  // Calculate salad totals
  const saladGrams = (diet.items.vegetais?.reduce((s, i) => s + i.grams, 0) || 0)
    + (diet.items.frutas?.reduce((s, i) => s + i.grams, 0) || 0)
    + (diet.items.proteicos?.reduce((s, i) => s + i.grams, 0) || 0);
  const saladKcal = (diet.items.vegetais?.reduce((s, i) => s + i.kcal, 0) || 0)
    + (diet.items.frutas?.reduce((s, i) => s + i.kcal, 0) || 0)
    + (diet.items.proteicos?.reduce((s, i) => s + i.kcal, 0) || 0);
  const racaoGrams = diet.items.racao?.reduce((s, i) => s + i.grams, 0) || 0;
  const racaoKcal = diet.items.racao?.reduce((s, i) => s + i.kcal, 0) || 0;

  // =============================================
  // HEADER
  // =============================================
  let y = drawBrandHeader(doc, pageW, logo, diet.speciesName, `${phaseLabel}${racao ? ` \u00b7 ${racao}` : ""}`);

  // Color identification band (compact)
  const dietHex = diet.color || "#10b981";
  const cr = parseInt(dietHex.slice(1, 3), 16);
  const cg = parseInt(dietHex.slice(3, 5), 16);
  const cb = parseInt(dietHex.slice(5, 7), 16);
  doc.setFillColor(cr, cg, cb);
  doc.rect(margin, y, contentW, 2.5, "F");
  doc.setFillColor(cr, cg, cb);
  doc.rect(margin, y + 2.5, contentW, 5.5, "F");
  doc.setGState(new (doc as any).GState({ opacity: 0.2 }));
  doc.setFillColor(255, 255, 255);
  doc.rect(margin, y + 2.5, contentW, 5.5, "F");
  doc.setGState(new (doc as any).GState({ opacity: 1 }));
  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(cr, cg, cb);
  doc.text("COR DE REFER\u00caNCIA", margin + 3, y + 6.5);
  doc.setFillColor(cr, cg, cb);
  doc.roundedRect(pageW - margin - 10, y + 3.5, 8, 3, 1, 1, "F");
  y += 10;

  // Phase + Ração inline
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...BRAND.text);
  doc.text(phaseLabel, margin, y);
  if (racao) {
    doc.setTextColor(...BRAND.amber);
    doc.text(` | Ra\u00e7\u00e3o: ${racao}`, margin + doc.getTextWidth(phaseLabel) + 2, y);
  }
  y += 5;

  // =============================================
  // INFO BOXES (Peso, Aves, MER, Total/ave) — compact
  // =============================================
  const boxW = contentW / 4;
  const boxH = 10;
  const infoBoxes = [
    { label: "Peso", value: `${diet.weight}g` },
    { label: "Aves", value: `${diet.birdCount}` },
    { label: "MER", value: `${diet.mer.toFixed(1)} kcal` },
    { label: "Total/ave", value: fmtWeight(diet.totalGrams) },
  ];
  infoBoxes.forEach((box, i) => {
    const bx = margin + i * boxW;
    doc.setFillColor(...BRAND.bg);
    doc.roundedRect(bx + 0.5, y, boxW - 1, boxH, 1.5, 1.5, "F");
    doc.setFontSize(6);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...BRAND.muted);
    doc.text(box.label, bx + 2, y + 3.5);
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...BRAND.dark);
    doc.text(box.value, bx + 2, y + 8);
  });
  y += boxH + 3;

  // =============================================
  // RESUMO: RAÇÃO vs SALADA (compact)
  // =============================================
  const summaryBoxW = (contentW - 3) / 2;
  const summaryBoxH = 13;

  // Ração box
  doc.setFillColor(...BRAND.amberBg);
  doc.roundedRect(margin, y, summaryBoxW, summaryBoxH, 2, 2, "F");
  doc.setDrawColor(...BRAND.amber);
  doc.setLineWidth(0.3);
  doc.roundedRect(margin, y, summaryBoxW, summaryBoxH, 2, 2, "S");
  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...BRAND.amber);
  doc.text("RA\u00c7\u00c3O (por ave)", margin + 2, y + 4.5);
  doc.setFontSize(11);
  doc.text(fmtWeight(racaoGrams), margin + 2, y + 10.5);
  doc.setFontSize(6.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...BRAND.muted);
  doc.text(`${racaoKcal.toFixed(1)} kcal`, margin + summaryBoxW - 2, y + 10.5, { align: "right" });

  // Salada box
  const saladX = margin + summaryBoxW + 3;
  doc.setFillColor(...BRAND.greenBg);
  doc.roundedRect(saladX, y, summaryBoxW, summaryBoxH, 2, 2, "F");
  doc.setDrawColor(...BRAND.green);
  doc.setLineWidth(0.3);
  doc.roundedRect(saladX, y, summaryBoxW, summaryBoxH, 2, 2, "S");
  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...BRAND.green);
  doc.text("SALADA (por ave)", saladX + 2, y + 4.5);
  doc.setFontSize(6);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...BRAND.muted);
  doc.text("Veg+Frutas+Prot", saladX + summaryBoxW - 2, y + 4.5, { align: "right" });
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...BRAND.green);
  doc.text(saladGrams > 0 ? fmtWeight(saladGrams) : "\u2014", saladX + 2, y + 10.5);
  if (saladGrams > 0) {
    doc.setFontSize(6.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...BRAND.muted);
    doc.text(`${saladKcal.toFixed(1)} kcal`, saladX + summaryBoxW - 2, y + 10.5, { align: "right" });
  }
  y += summaryBoxH + 2;

  // =============================================
  // TOTAL PARA X AVES (summary bar)
  // =============================================
  if (hasMultipleBirds) {
    doc.setFillColor(242, 242, 242);
    doc.roundedRect(margin, y, contentW, 7.5, 1.5, 1.5, "F");
    doc.setDrawColor(210, 210, 210);
    doc.setLineWidth(0.2);
    doc.roundedRect(margin, y, contentW, 7.5, 1.5, 1.5, "S");
    doc.setFontSize(7);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...BRAND.dark);
    doc.text(`PARA ${diet.birdCount} AVES:`, margin + 2, y + 5);
    doc.setTextColor(...BRAND.amber);
    doc.text(`Ra\u00e7\u00e3o: ${fmtWeight(racaoGrams * diet.birdCount)}`, margin + 38, y + 5);
    doc.setTextColor(...BRAND.green);
    doc.text(`Salada: ${saladGrams > 0 ? fmtWeight(saladGrams * diet.birdCount) : "\u2014"}`, margin + 82, y + 5);
    doc.setTextColor(...BRAND.blue);
    doc.text(`Total: ${fmtWeight(diet.totalGrams * diet.birdCount)}`, pageW - margin - 2, y + 5, { align: "right" });
    y += 10;
  }

  // =============================================
  // OBSERVAÇÕES
  // =============================================
  if (diet.notes) {
    doc.setFillColor(...BRAND.amberBg);
    doc.roundedRect(margin, y, contentW, 7, 1.5, 1.5, "F");
    doc.setFontSize(6.5);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...BRAND.amber);
    const notesText = diet.notes.length > 120 ? diet.notes.slice(0, 117) + "..." : diet.notes;
    doc.text(`Obs: ${notesText}`, margin + 2, y + 4.5);
    y += 9;
  }

  // =============================================
  // COMPOSIÇÃO DA DIETA (por ave / dia)
  // =============================================
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.15);
  doc.line(margin, y, pageW - margin, y);
  y += 3;

  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...BRAND.text);
  doc.text("COMPOSI\u00c7\u00c3O DA DIETA (por ave / dia)", margin, y);
  y += 4;

  const drawFoodSection = (
    title: string,
    items: typeof diet.items.racao,
    bgColor: [number, number, number],
    textColor: [number, number, number],
    multiplier = 1,
  ) => {
    if (!items || items.length === 0) return;
    doc.setFontSize(fontSize + 0.5);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...textColor);
    doc.text(title, margin, y);
    y += sectionHeaderH;

    items.forEach(item => {
      doc.setFillColor(...bgColor);
      doc.roundedRect(margin, y - itemH * 0.45, contentW, itemH, 0.8, 0.8, "F");
      doc.setFontSize(fontSize);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...BRAND.text);
      doc.text(item.foodName, margin + 2, y + itemH * 0.1);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...textColor);
      const g = item.grams * multiplier;
      const k = item.kcal * multiplier;
      doc.text(`${fmtWeight(g)}  (${k.toFixed(1)} kcal)`, pageW - margin - 2, y + itemH * 0.1, { align: "right" });
      y += itemH;
    });
    y += sectionGap;
  };

  drawFoodSection("RA\u00c7\u00c3O / ALIMENTO FORMULADO", diet.items.racao, BRAND.amberBg, BRAND.amber);
  drawFoodSection("VEGETAIS / HORTALICAS", diet.items.vegetais, BRAND.greenBg, BRAND.green);
  drawFoodSection("FRUTAS", diet.items.frutas, BRAND.redBg, BRAND.red);
  drawFoodSection("SEMENTES E PROTEICOS", diet.items.proteicos, BRAND.yellowBg, BRAND.yellow);

  // Subtotal Salada
  if (saladGrams > 0) {
    doc.setFillColor(220, 245, 230);
    doc.roundedRect(margin, y, contentW, 7, 1.5, 1.5, "F");
    doc.setDrawColor(...BRAND.green);
    doc.setLineWidth(0.3);
    doc.roundedRect(margin, y, contentW, 7, 1.5, 1.5, "S");
    doc.setFontSize(7);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...BRAND.green);
    doc.text("Subtotal SALADA (Veg + Frutas + Prot)", margin + 2, y + 4.5);
    doc.text(`${fmtWeight(saladGrams)}  |  ${saladKcal.toFixed(1)} kcal`, pageW - margin - 2, y + 4.5, { align: "right" });
    y += 9;
  }

  // Total por ave
  doc.setFillColor(...BRAND.light);
  doc.roundedRect(margin, y, contentW, 7, 1.5, 1.5, "F");
  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...BRAND.dark);
  doc.text("TOTAL POR AVE", margin + 2, y + 4.5);
  doc.text(`${fmtWeight(diet.totalGrams)}  |  ${diet.totalKcal.toFixed(1)} kcal`, pageW - margin - 2, y + 4.5, { align: "right" });
  y += 9;

  // =============================================
  // TOTAL PARA X AVES (detalhado) — only if multiple birds
  // =============================================
  if (hasMultipleBirds) {
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.15);
    doc.line(margin, y, pageW - margin, y);
    y += 3;

    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...BRAND.text);
    doc.text(`TOTAL PARA ${diet.birdCount} AVES (di\u00e1rio)`, margin, y);
    y += 4;

    drawFoodSection("RA\u00c7\u00c3O", diet.items.racao, BRAND.amberBg, BRAND.amber, diet.birdCount);
    drawFoodSection("VEGETAIS", diet.items.vegetais, BRAND.greenBg, BRAND.green, diet.birdCount);
    drawFoodSection("FRUTAS", diet.items.frutas, BRAND.redBg, BRAND.red, diet.birdCount);
    drawFoodSection("PROTEICOS", diet.items.proteicos, BRAND.yellowBg, BRAND.yellow, diet.birdCount);

    // Subtotal Salada for all birds
    if (saladGrams > 0) {
      doc.setFillColor(220, 245, 230);
      doc.roundedRect(margin, y, contentW, 7, 1.5, 1.5, "F");
      doc.setDrawColor(...BRAND.green);
      doc.setLineWidth(0.3);
      doc.roundedRect(margin, y, contentW, 7, 1.5, 1.5, "S");
      doc.setFontSize(7);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...BRAND.green);
      doc.text(`Subtotal SALADA (${diet.birdCount} aves)`, margin + 2, y + 4.5);
      doc.text(`${fmtWeight(saladGrams * diet.birdCount)}  |  ${(saladKcal * diet.birdCount).toFixed(1)} kcal`, pageW - margin - 2, y + 4.5, { align: "right" });
      y += 9;
    }

    // Grand total
    doc.setFillColor(...BRAND.blueBg);
    doc.roundedRect(margin, y, contentW, 7, 1.5, 1.5, "F");
    doc.setDrawColor(...BRAND.blue);
    doc.setLineWidth(0.3);
    doc.roundedRect(margin, y, contentW, 7, 1.5, 1.5, "S");
    doc.setFontSize(7);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...BRAND.blue);
    doc.text(`TOTAL PARA ${diet.birdCount} AVES`, margin + 2, y + 4.5);
    doc.text(
      `${fmtWeight(diet.totalGrams * diet.birdCount)}  |  ${(diet.totalKcal * diet.birdCount).toFixed(1)} kcal`,
      pageW - margin - 2, y + 4.5, { align: "right" }
    );
  }

  drawBrandFooter(doc, pageW, pageH);
  doc.save(`dieta-${diet.speciesName.toLowerCase().replace(/\s+/g, "-")}-${new Date().toISOString().slice(0, 10)}.pdf`);
}
