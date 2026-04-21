/**
 * Exportação de Dieta em PDF — Design Profissional para Impressão
 * Identidade visual Criatório Minas Bird (usando módulo compartilhado)
 *
 * REGRAS DE IMPRESSÃO:
 * - NUNCA ultrapassa 1 página (REGRA PERMANENTE)
 * - Sem emojis (helvetica não suporta)
 * - Textos nunca sobrepostos
 * - Espaçamento equilibrado — sem apertar em cima nem vazio embaixo
 * - Cor da dieta: texto + quadradinho colorido (sem faixa)
 */
import { jsPDF } from "jspdf";
import type { SavedDiet } from "./dietStorage";
import { BRAND, loadLogo, drawBrandHeader, drawBrandFooter, fmtWeight } from "./pdfBrand";

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
  const margin = 12;
  const contentW = pageW - margin * 2;

  const phaseLabel = lifePeriods.find(p => p.id === diet.phaseId)?.label || diet.phaseId;
  const racao = diet.racaoName || "";
  const hasMultipleBirds = diet.birdCount > 1;

  // Calculate totals
  const racaoGrams = diet.items.racao?.reduce((s, i) => s + i.grams, 0) || 0;
  const racaoKcal = diet.items.racao?.reduce((s, i) => s + i.kcal, 0) || 0;
  const saladGrams = (diet.items.vegetais?.reduce((s, i) => s + i.grams, 0) || 0)
    + (diet.items.frutas?.reduce((s, i) => s + i.grams, 0) || 0)
    + (diet.items.proteicos?.reduce((s, i) => s + i.grams, 0) || 0);
  const saladKcal = (diet.items.vegetais?.reduce((s, i) => s + i.kcal, 0) || 0)
    + (diet.items.frutas?.reduce((s, i) => s + i.kcal, 0) || 0)
    + (diet.items.proteicos?.reduce((s, i) => s + i.kcal, 0) || 0);

  // Count items for adaptive sizing
  const totalItems = [
    ...(diet.items.racao || []),
    ...(diet.items.vegetais || []),
    ...(diet.items.frutas || []),
    ...(diet.items.proteicos || []),
  ].length;

  // Calculate available space for adaptive layout
  // Fixed elements measured carefully:
  //   header(21.2) + infoLine(7) + infoBoxes(14) + summaryBoxes(17) + separator+title(9) + subtotalSalada(9) + totalPerBird(10) + footer(10) = ~97mm
  //   + multiBirdBar(11) + multiBirdSeparator+title(9) + multiBirdSubtotal(9) + grandTotal(9) = 38mm extra
  //   + notes(9) if present
  // Section headers: 4 sections * (sectionHeaderH-1 + sectionHeaderH) per set
  const fixedBase = 97;
  const fixedMultiBird = hasMultipleBirds ? 38 : 0;
  const fixedNotes = diet.notes ? 9 : 0;
  // Each section with items has a header (sectionHeaderH) + sectionGap after
  const activeSections = [
    (diet.items.racao?.length || 0) > 0,
    (diet.items.vegetais?.length || 0) > 0,
    (diet.items.frutas?.length || 0) > 0,
    (diet.items.proteicos?.length || 0) > 0,
  ].filter(Boolean).length;
  const sectionOverhead = activeSections * 7; // header + gap per section
  const sectionOverheadTotal = sectionOverhead * (hasMultipleBirds ? 2 : 1);
  const fixedSpace = fixedBase + fixedMultiBird + fixedNotes + sectionOverheadTotal;
  const availableForRows = pageH - fixedSpace;
  const itemSets = hasMultipleBirds ? 2 : 1;
  const totalRows = totalItems * itemSets;
  const rawItemH = totalRows > 0 ? availableForRows / totalRows : 6;
  const itemH = Math.max(4.5, Math.min(6, rawItemH));
  const baseFontSize = itemH >= 5.5 ? 7.5 : itemH >= 5 ? 7 : 6.5;
  const sectionGap = itemH >= 5.5 ? 3 : 2;
  const sectionHeaderH = 5;

  // =============================================
  // HEADER (brand header from pdfBrand)
  // =============================================
  let y = drawBrandHeader(doc, pageW, logo, diet.speciesName, `${phaseLabel}${racao ? ` \u00b7 ${racao}` : ""}`);

  // =============================================
  // INFO LINE: Cor da Dieta + Fase + Ração (clean, no ugly band)
  // =============================================
  const dietHex = diet.color || "#10b981";
  const cr = parseInt(dietHex.slice(1, 3), 16);
  const cg = parseInt(dietHex.slice(3, 5), 16);
  const cb = parseInt(dietHex.slice(5, 7), 16);

  // Color square + label
  doc.setFillColor(cr, cg, cb);
  doc.roundedRect(margin, y - 2.5, 5, 5, 1, 1, "F");
  doc.setDrawColor(180, 180, 180);
  doc.setLineWidth(0.2);
  doc.roundedRect(margin, y - 2.5, 5, 5, 1, 1, "S");

  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(cr, cg, cb);
  doc.text("Cor da Dieta", margin + 7, y + 0.5);

  // Phase + Ração on the right
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...BRAND.muted);
  const infoRight = racao ? `${phaseLabel}  |  Ra\u00e7\u00e3o: ${racao}` : phaseLabel;
  doc.text(infoRight, pageW - margin, y + 0.5, { align: "right" });
  y += 7;

  // =============================================
  // INFO BOXES (Peso, Aves, MER, Total/ave)
  // =============================================
  const boxW = contentW / 4;
  const boxH = 11;
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
    doc.setFontSize(6.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...BRAND.muted);
    doc.text(box.label, bx + boxW / 2, y + 3.5, { align: "center" });
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...BRAND.dark);
    doc.text(box.value, bx + boxW / 2, y + 9, { align: "center" });
  });
  y += boxH + 3;

  // =============================================
  // RESUMO: RAÇÃO vs SALADA
  // =============================================
  const summaryBoxW = (contentW - 4) / 2;
  const summaryBoxH = 14;

  // Ração box
  doc.setFillColor(...BRAND.amberBg);
  doc.roundedRect(margin, y, summaryBoxW, summaryBoxH, 2, 2, "F");
  doc.setDrawColor(...BRAND.amber);
  doc.setLineWidth(0.3);
  doc.roundedRect(margin, y, summaryBoxW, summaryBoxH, 2, 2, "S");
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...BRAND.amber);
  doc.text("RACAO (por ave)", margin + 3, y + 5);
  doc.setFontSize(12);
  doc.text(fmtWeight(racaoGrams), margin + 3, y + 11.5);
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...BRAND.muted);
  doc.text(`${racaoKcal.toFixed(1)} kcal`, margin + summaryBoxW - 3, y + 11.5, { align: "right" });

  // Salada box
  const saladX = margin + summaryBoxW + 4;
  doc.setFillColor(...BRAND.greenBg);
  doc.roundedRect(saladX, y, summaryBoxW, summaryBoxH, 2, 2, "F");
  doc.setDrawColor(...BRAND.green);
  doc.setLineWidth(0.3);
  doc.roundedRect(saladX, y, summaryBoxW, summaryBoxH, 2, 2, "S");
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...BRAND.green);
  doc.text("SALADA (por ave)", saladX + 3, y + 5);
  doc.setFontSize(6.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...BRAND.muted);
  doc.text("Veg + Frutas + Prot", saladX + summaryBoxW - 3, y + 5, { align: "right" });
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...BRAND.green);
  doc.text(saladGrams > 0 ? fmtWeight(saladGrams) : "\u2014", saladX + 3, y + 11.5);
  if (saladGrams > 0) {
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...BRAND.muted);
    doc.text(`${saladKcal.toFixed(1)} kcal`, saladX + summaryBoxW - 3, y + 11.5, { align: "right" });
  }
  y += summaryBoxH + 3;

  // =============================================
  // TOTAL PARA X AVES (summary bar — only if multiple birds)
  // =============================================
  if (hasMultipleBirds) {
    doc.setFillColor(245, 245, 245);
    doc.roundedRect(margin, y, contentW, 8, 1.5, 1.5, "F");
    doc.setDrawColor(215, 215, 215);
    doc.setLineWidth(0.2);
    doc.roundedRect(margin, y, contentW, 8, 1.5, 1.5, "S");
    doc.setFontSize(7.5);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...BRAND.dark);
    doc.text(`PARA ${diet.birdCount} AVES:`, margin + 3, y + 5.5);
    doc.setTextColor(...BRAND.amber);
    const racaoTotalText = `Racao: ${fmtWeight(racaoGrams * diet.birdCount)}`;
    doc.text(racaoTotalText, margin + 40, y + 5.5);
    doc.setTextColor(...BRAND.green);
    doc.text(`Salada: ${saladGrams > 0 ? fmtWeight(saladGrams * diet.birdCount) : "\u2014"}`, margin + 85, y + 5.5);
    doc.setTextColor(...BRAND.blue);
    doc.text(`Total: ${fmtWeight(diet.totalGrams * diet.birdCount)}`, pageW - margin - 3, y + 5.5, { align: "right" });
    y += 11;
  }

  // =============================================
  // OBSERVAÇÕES (if any)
  // =============================================
  if (diet.notes) {
    doc.setFillColor(...BRAND.amberBg);
    doc.roundedRect(margin, y, contentW, 7, 1.5, 1.5, "F");
    doc.setFontSize(7);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...BRAND.amber);
    const notesText = diet.notes.length > 120 ? diet.notes.slice(0, 117) + "..." : diet.notes;
    doc.text(`Obs: ${notesText}`, margin + 3, y + 4.5);
    y += 9;
  }

  // =============================================
  // COMPOSIÇÃO DA DIETA (por ave / dia)
  // =============================================
  doc.setDrawColor(210, 210, 210);
  doc.setLineWidth(0.2);
  doc.line(margin, y, pageW - margin, y);
  y += 4;

  doc.setFontSize(8.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...BRAND.text);
  doc.text("COMPOSICAO DA DIETA (por ave / dia)", margin, y);
  y += sectionHeaderH;

  // Reusable section drawer
  const drawFoodSection = (
    title: string,
    items: typeof diet.items.racao,
    bgColor: [number, number, number],
    textColor: [number, number, number],
    multiplier = 1,
  ) => {
    if (!items || items.length === 0) return;

    // Section header
    doc.setFontSize(baseFontSize);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...textColor);
    doc.text(title, margin + 1, y);
    y += sectionHeaderH - 1;

    // Items
    items.forEach(item => {
      const rowTop = y - itemH * 0.4;
      doc.setFillColor(...bgColor);
      doc.roundedRect(margin, rowTop, contentW, itemH - 0.5, 1, 1, "F");

      doc.setFontSize(baseFontSize);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...BRAND.text);
      doc.text(item.foodName, margin + 3, y + itemH * 0.05);

      doc.setFont("helvetica", "bold");
      doc.setTextColor(...textColor);
      const g = item.grams * multiplier;
      const k = item.kcal * multiplier;
      doc.text(`${fmtWeight(g)}  (${k.toFixed(1)} kcal)`, pageW - margin - 3, y + itemH * 0.05, { align: "right" });
      y += itemH;
    });
    y += sectionGap;
  };

  drawFoodSection("RACAO / ALIMENTO FORMULADO", diet.items.racao, BRAND.amberBg, BRAND.amber);
  drawFoodSection("VEGETAIS / HORTALICAS", diet.items.vegetais, BRAND.greenBg, BRAND.green);
  drawFoodSection("FRUTAS", diet.items.frutas, BRAND.redBg, BRAND.red);
  drawFoodSection("SEMENTES E PROTEICOS", diet.items.proteicos, BRAND.yellowBg, BRAND.yellow);

  // Subtotal Salada
  if (saladGrams > 0) {
    doc.setFillColor(220, 245, 230);
    doc.roundedRect(margin, y, contentW, 7.5, 1.5, 1.5, "F");
    doc.setDrawColor(...BRAND.green);
    doc.setLineWidth(0.3);
    doc.roundedRect(margin, y, contentW, 7.5, 1.5, 1.5, "S");
    doc.setFontSize(7.5);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...BRAND.green);
    doc.text("Subtotal SALADA (Veg + Frutas + Prot)", margin + 3, y + 5);
    doc.text(`${fmtWeight(saladGrams)}  |  ${saladKcal.toFixed(1)} kcal`, pageW - margin - 3, y + 5, { align: "right" });
    y += 9;
  }

  // Total por ave
  doc.setFillColor(...BRAND.light);
  doc.roundedRect(margin, y, contentW, 7.5, 1.5, 1.5, "F");
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...BRAND.dark);
  doc.text("TOTAL POR AVE", margin + 3, y + 5);
  doc.text(`${fmtWeight(diet.totalGrams)}  |  ${diet.totalKcal.toFixed(1)} kcal`, pageW - margin - 3, y + 5, { align: "right" });
  y += 10;

  // =============================================
  // TOTAL PARA X AVES (detalhado) — only if multiple birds
  // =============================================
  if (hasMultipleBirds) {
    doc.setDrawColor(210, 210, 210);
    doc.setLineWidth(0.2);
    doc.line(margin, y, pageW - margin, y);
    y += 4;

    doc.setFontSize(8.5);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...BRAND.text);
    doc.text(`TOTAL PARA ${diet.birdCount} AVES (diario)`, margin, y);
    y += sectionHeaderH;

    drawFoodSection("RACAO", diet.items.racao, BRAND.amberBg, BRAND.amber, diet.birdCount);
    drawFoodSection("VEGETAIS", diet.items.vegetais, BRAND.greenBg, BRAND.green, diet.birdCount);
    drawFoodSection("FRUTAS", diet.items.frutas, BRAND.redBg, BRAND.red, diet.birdCount);
    drawFoodSection("PROTEICOS", diet.items.proteicos, BRAND.yellowBg, BRAND.yellow, diet.birdCount);

    // Subtotal Salada for all birds
    if (saladGrams > 0) {
      doc.setFillColor(220, 245, 230);
      doc.roundedRect(margin, y, contentW, 7.5, 1.5, 1.5, "F");
      doc.setDrawColor(...BRAND.green);
      doc.setLineWidth(0.3);
      doc.roundedRect(margin, y, contentW, 7.5, 1.5, 1.5, "S");
      doc.setFontSize(7.5);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...BRAND.green);
      doc.text(`Subtotal SALADA (${diet.birdCount} aves)`, margin + 3, y + 5);
      doc.text(`${fmtWeight(saladGrams * diet.birdCount)}  |  ${(saladKcal * diet.birdCount).toFixed(1)} kcal`, pageW - margin - 3, y + 5, { align: "right" });
      y += 9;
    }

    // Grand total
    doc.setFillColor(...BRAND.blueBg);
    doc.roundedRect(margin, y, contentW, 7.5, 1.5, 1.5, "F");
    doc.setDrawColor(...BRAND.blue);
    doc.setLineWidth(0.3);
    doc.roundedRect(margin, y, contentW, 7.5, 1.5, 1.5, "S");
    doc.setFontSize(7.5);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...BRAND.blue);
    doc.text(`TOTAL PARA ${diet.birdCount} AVES`, margin + 3, y + 5);
    doc.text(
      `${fmtWeight(diet.totalGrams * diet.birdCount)}  |  ${(diet.totalKcal * diet.birdCount).toFixed(1)} kcal`,
      pageW - margin - 3, y + 5, { align: "right" }
    );
  }

  drawBrandFooter(doc, pageW, pageH);
  doc.save(`dieta-${diet.speciesName.toLowerCase().replace(/\s+/g, "-")}-${new Date().toISOString().slice(0, 10)}.pdf`);
}
