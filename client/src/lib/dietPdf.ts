/**
 * Exportação de Dieta em PDF — Design Profissional para Impressão
 * Identidade visual Criatório Minas Bird (usando módulo compartilhado)
 *
 * REGRAS DE IMPRESSÃO:
 * - Sem emojis (helvetica não suporta)
 * - Espaçamento generoso entre seções
 * - Textos nunca sobrepostos
 * - Fonte mínima 7pt
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

/** Helper: check page break and add new page if needed */
function checkPageBreak(
  doc: jsPDF,
  y: number,
  needed: number,
  pageW: number,
  pageH: number,
  logo: string | null,
  title: string,
  subtitle: string,
): number {
  if (y + needed > pageH - 15) {
    drawBrandFooter(doc, pageW, pageH);
    doc.addPage();
    return drawBrandHeader(doc, pageW, logo, title, subtitle) + 4;
  }
  return y;
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
  const margin = 12;
  const contentW = pageW - margin * 2;

  const phaseLabel = lifePeriods.find(p => p.id === diet.phaseId)?.label || diet.phaseId;
  const racao = diet.racaoName || "";
  const headerSubtitle = `${phaseLabel}${racao ? ` \u00b7 ${racao}` : ""}`;

  // Header
  let y = drawBrandHeader(doc, pageW, logo, diet.speciesName, headerSubtitle);

  // Color identification band
  const dietHex = diet.color || "#10b981";
  const cr = parseInt(dietHex.slice(1, 3), 16);
  const cg = parseInt(dietHex.slice(3, 5), 16);
  const cb = parseInt(dietHex.slice(5, 7), 16);

  doc.setFillColor(cr, cg, cb);
  doc.rect(margin, y, contentW, 3.5, "F");
  doc.setFillColor(cr, cg, cb);
  doc.rect(margin, y + 3.5, contentW, 6.5, "F");
  doc.setGState(new (doc as any).GState({ opacity: 0.2 }));
  doc.setFillColor(255, 255, 255);
  doc.rect(margin, y + 3.5, contentW, 6.5, "F");
  doc.setGState(new (doc as any).GState({ opacity: 1 }));
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(cr, cg, cb);
  doc.text("COR DE REFER\u00caNCIA DO CALEND\u00c1RIO", margin + 3, y + 8);
  doc.setFillColor(cr, cg, cb);
  doc.roundedRect(pageW - margin - 12, y + 4.5, 10, 4, 1, 1, "F");
  y += 12;

  // Phase + Ração labels
  y += 2;
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...BRAND.text);
  doc.text(phaseLabel, margin, y);
  y += 5;

  if (racao) {
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...BRAND.amber);
    doc.text(`Ra\u00e7\u00e3o: ${racao}`, margin, y);
    y += 5;
  }

  // =============================================
  // INFO BOXES (Peso, Aves, MER, Total/ave)
  // =============================================
  y += 1;
  const boxW = contentW / 4;
  const boxH = 12;

  // Calculate salad totals
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
    { label: "Total/ave", value: `${fmtWeight(diet.totalGrams)}` },
  ];
  infoBoxes.forEach((box, i) => {
    const bx = margin + i * boxW;
    doc.setFillColor(...BRAND.bg);
    doc.roundedRect(bx + 1, y, boxW - 2, boxH, 1.5, 1.5, "F");
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...BRAND.muted);
    doc.text(box.label, bx + 3, y + 4);
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...BRAND.dark);
    doc.text(box.value, bx + 3, y + 9.5);
  });
  y += boxH + 5;

  // =============================================
  // RESUMO: RAÇÃO vs SALADA (por ave) — two boxes side by side
  // =============================================
  const summaryBoxW = (contentW - 4) / 2; // 4mm gap between boxes
  const summaryBoxH = 16;

  // --- Ração box ---
  doc.setFillColor(...BRAND.amberBg);
  doc.roundedRect(margin, y, summaryBoxW, summaryBoxH, 2, 2, "F");
  doc.setDrawColor(...BRAND.amber);
  doc.setLineWidth(0.4);
  doc.roundedRect(margin, y, summaryBoxW, summaryBoxH, 2, 2, "S");
  // Title
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...BRAND.amber);
  doc.text("RA\u00c7\u00c3O (por ave)", margin + 3, y + 5);
  // Weight value — large
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...BRAND.amber);
  doc.text(fmtWeight(racaoGrams), margin + 3, y + 12.5);
  // Kcal — right aligned
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...BRAND.muted);
  doc.text(`${racaoKcal.toFixed(1)} kcal`, margin + summaryBoxW - 3, y + 12.5, { align: "right" });

  // --- Salada box ---
  const saladX = margin + summaryBoxW + 4;
  doc.setFillColor(...BRAND.greenBg);
  doc.roundedRect(saladX, y, summaryBoxW, summaryBoxH, 2, 2, "F");
  doc.setDrawColor(...BRAND.green);
  doc.setLineWidth(0.4);
  doc.roundedRect(saladX, y, summaryBoxW, summaryBoxH, 2, 2, "S");
  // Title
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...BRAND.green);
  doc.text("SALADA (por ave)", saladX + 3, y + 5);
  // Subtitle on same line but after title, with enough spacing
  doc.setFontSize(6.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...BRAND.muted);
  doc.text("Veg. + Frutas + Prot.", saladX + summaryBoxW - 3, y + 5, { align: "right" });
  // Weight value — large
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...BRAND.green);
  doc.text(saladGrams > 0 ? fmtWeight(saladGrams) : "\u2014", saladX + 3, y + 12.5);
  // Kcal — right aligned
  if (saladGrams > 0) {
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...BRAND.muted);
    doc.text(`${saladKcal.toFixed(1)} kcal`, saladX + summaryBoxW - 3, y + 12.5, { align: "right" });
  }

  y += summaryBoxH + 4;

  // =============================================
  // TOTAL PARA X AVES (summary bar)
  // =============================================
  if (diet.birdCount > 1) {
    doc.setFillColor(242, 242, 242);
    doc.roundedRect(margin, y, contentW, 9, 2, 2, "F");
    doc.setDrawColor(210, 210, 210);
    doc.setLineWidth(0.3);
    doc.roundedRect(margin, y, contentW, 9, 2, 2, "S");

    const labelX = margin + 3;
    const col1X = margin + 45;
    const col2X = margin + 95;
    const col3X = pageW - margin - 3;

    doc.setFontSize(7.5);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...BRAND.dark);
    doc.text(`PARA ${diet.birdCount} AVES:`, labelX, y + 6);

    doc.setTextColor(...BRAND.amber);
    doc.text(`Ra\u00e7\u00e3o: ${fmtWeight(racaoGrams * diet.birdCount)}`, col1X, y + 6);

    doc.setTextColor(...BRAND.green);
    doc.text(`Salada: ${saladGrams > 0 ? fmtWeight(saladGrams * diet.birdCount) : "\u2014"}`, col2X, y + 6);

    doc.setTextColor(...BRAND.blue);
    doc.text(`Total: ${fmtWeight(diet.totalGrams * diet.birdCount)}`, col3X, y + 6, { align: "right" });

    y += 13;
  }

  // =============================================
  // OBSERVAÇÕES
  // =============================================
  if (diet.notes) {
    y = checkPageBreak(doc, y, 12, pageW, pageH, logo, diet.speciesName, headerSubtitle);
    doc.setFillColor(...BRAND.amberBg);
    doc.roundedRect(margin, y, contentW, 8, 1.5, 1.5, "F");
    doc.setFontSize(7);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...BRAND.amber);
    doc.text(`Observa\u00e7\u00f5es: ${diet.notes}`, margin + 3, y + 5);
    y += 12;
  }

  // =============================================
  // COMPOSIÇÃO DA DIETA (por ave / dia)
  // =============================================
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.2);
  doc.line(margin, y, pageW - margin, y);
  y += 5;

  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...BRAND.text);
  doc.text("COMPOSI\u00c7\u00c3O DA DIETA (por ave / dia)", margin, y);
  y += 6;

  const drawFoodSection = (
    title: string,
    items: typeof diet.items.racao,
    bgColor: [number, number, number],
    textColor: [number, number, number],
  ) => {
    if (!items || items.length === 0) return;
    y = checkPageBreak(doc, y, 10 + items.length * 6.5, pageW, pageH, logo, diet.speciesName, headerSubtitle);

    // Section header
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...textColor);
    doc.text(title, margin, y);
    y += 4.5;

    // Items
    items.forEach(item => {
      y = checkPageBreak(doc, y, 7, pageW, pageH, logo, diet.speciesName, headerSubtitle);
      doc.setFillColor(...bgColor);
      doc.roundedRect(margin, y - 2.5, contentW, 5.5, 1, 1, "F");
      doc.setFontSize(7.5);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...BRAND.text);
      doc.text(item.foodName, margin + 2, y + 0.5);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...textColor);
      const valueText = `${fmtWeight(item.grams)}  (${item.kcal.toFixed(1)} kcal)`;
      doc.text(valueText, pageW - margin - 2, y + 0.5, { align: "right" });
      y += 6.5;
    });
    y += 3;
  };

  drawFoodSection("RA\u00c7\u00c3O / ALIMENTO FORMULADO", diet.items.racao, BRAND.amberBg, BRAND.amber);
  drawFoodSection("VEGETAIS / HORTALICAS", diet.items.vegetais, BRAND.greenBg, BRAND.green);
  drawFoodSection("FRUTAS", diet.items.frutas, BRAND.redBg, BRAND.red);
  drawFoodSection("SEMENTES E PROTEICOS", diet.items.proteicos, BRAND.yellowBg, BRAND.yellow);

  // =============================================
  // SUBTOTAL SALADA (por ave)
  // =============================================
  if (saladGrams > 0) {
    y = checkPageBreak(doc, y, 12, pageW, pageH, logo, diet.speciesName, headerSubtitle);
    doc.setFillColor(220, 245, 230);
    doc.roundedRect(margin, y, contentW, 8, 1.5, 1.5, "F");
    doc.setDrawColor(...BRAND.green);
    doc.setLineWidth(0.4);
    doc.roundedRect(margin, y, contentW, 8, 1.5, 1.5, "S");
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...BRAND.green);
    doc.text("Subtotal SALADA (Vegetais + Frutas + Proteicos)", margin + 3, y + 5.5);
    doc.text(`${fmtWeight(saladGrams)}  |  ${saladKcal.toFixed(1)} kcal`, pageW - margin - 3, y + 5.5, { align: "right" });
    y += 12;
  }

  // =============================================
  // TOTAL POR AVE
  // =============================================
  y = checkPageBreak(doc, y, 12, pageW, pageH, logo, diet.speciesName, headerSubtitle);
  doc.setFillColor(...BRAND.light);
  doc.roundedRect(margin, y, contentW, 8, 1.5, 1.5, "F");
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...BRAND.dark);
  doc.text("TOTAL POR AVE", margin + 3, y + 5.5);
  doc.text(`${fmtWeight(diet.totalGrams)}  |  ${diet.totalKcal.toFixed(1)} kcal`, pageW - margin - 3, y + 5.5, { align: "right" });
  y += 12;

  // =============================================
  // TOTAL PARA X AVES (detalhado)
  // =============================================
  if (diet.birdCount > 1) {
    y = checkPageBreak(doc, y, 20, pageW, pageH, logo, diet.speciesName, headerSubtitle);

    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.2);
    doc.line(margin, y, pageW - margin, y);
    y += 5;

    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...BRAND.text);
    doc.text(`TOTAL PARA ${diet.birdCount} AVES (di\u00e1rio)`, margin, y);
    y += 6;

    const drawTotalSection = (
      title: string,
      items: typeof diet.items.racao,
      bgColor: [number, number, number],
      textColor: [number, number, number],
    ) => {
      if (!items || items.length === 0) return;
      y = checkPageBreak(doc, y, 10 + items.length * 6.5, pageW, pageH, logo, diet.speciesName, headerSubtitle);

      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...textColor);
      doc.text(title, margin, y);
      y += 4.5;

      items.forEach(item => {
        y = checkPageBreak(doc, y, 7, pageW, pageH, logo, diet.speciesName, headerSubtitle);
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
      y += 3;
    };

    drawTotalSection("RA\u00c7\u00c3O", diet.items.racao, BRAND.amberBg, BRAND.amber);
    drawTotalSection("VEGETAIS", diet.items.vegetais, BRAND.greenBg, BRAND.green);
    drawTotalSection("FRUTAS", diet.items.frutas, BRAND.redBg, BRAND.red);
    drawTotalSection("PROTEICOS", diet.items.proteicos, BRAND.yellowBg, BRAND.yellow);

    // Subtotal Salada for all birds
    if (saladGrams > 0) {
      y = checkPageBreak(doc, y, 12, pageW, pageH, logo, diet.speciesName, headerSubtitle);
      doc.setFillColor(220, 245, 230);
      doc.roundedRect(margin, y, contentW, 8, 1.5, 1.5, "F");
      doc.setDrawColor(...BRAND.green);
      doc.setLineWidth(0.4);
      doc.roundedRect(margin, y, contentW, 8, 1.5, 1.5, "S");
      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...BRAND.green);
      doc.text(`Subtotal SALADA (${diet.birdCount} aves)`, margin + 3, y + 5.5);
      doc.text(`${fmtWeight(saladGrams * diet.birdCount)}  |  ${(saladKcal * diet.birdCount).toFixed(1)} kcal`, pageW - margin - 3, y + 5.5, { align: "right" });
      y += 12;
    }

    // Grand total
    y = checkPageBreak(doc, y, 12, pageW, pageH, logo, diet.speciesName, headerSubtitle);
    doc.setFillColor(...BRAND.blueBg);
    doc.roundedRect(margin, y, contentW, 8, 1.5, 1.5, "F");
    doc.setDrawColor(...BRAND.blue);
    doc.setLineWidth(0.4);
    doc.roundedRect(margin, y, contentW, 8, 1.5, 1.5, "S");
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...BRAND.blue);
    doc.text(`TOTAL PARA ${diet.birdCount} AVES`, margin + 3, y + 5.5);
    doc.text(
      `${fmtWeight(diet.totalGrams * diet.birdCount)}  |  ${(diet.totalKcal * diet.birdCount).toFixed(1)} kcal`,
      pageW - margin - 3, y + 5.5, { align: "right" }
    );
  }

  drawBrandFooter(doc, pageW, pageH);

  doc.save(`dieta-${diet.speciesName.toLowerCase().replace(/\s+/g, "-")}-${new Date().toISOString().slice(0, 10)}.pdf`);
}
