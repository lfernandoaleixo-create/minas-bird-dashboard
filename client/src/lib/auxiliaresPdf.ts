/**
 * PDF Documentos Auxiliares — Criatório Minas Bird
 * Gera PDF imprimível com lista dos documentos auxiliares
 * e quadrado para ticar com caneta quando separado.
 */
import { jsPDF } from "jspdf";
import {
  BRAND,
  PDF_MARGIN,
  loadLogo,
  drawBrandHeader,
  drawBrandFooter,
} from "./pdfBrand";

interface AuxItem {
  title: string;
  emMaos: boolean;
}

export async function generateAuxiliaresPdf(items: AuxItem[]) {
  const logo = await loadLogo();
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = PDF_MARGIN.portrait;
  const contentW = pageW - margin * 2;

  // Header
  let y = drawBrandHeader(
    doc,
    pageW,
    logo,
    "Documentos Auxiliares — Fiscalização",
    "Criatório Minas Bird — Materiais de Apoio"
  );

  // Instruction box
  y += 2;
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin, y, contentW, 14, 2, 2, "FD");

  doc.setFontSize(8);
  doc.setFont("helvetica", "italic");
  doc.setTextColor(...BRAND.muted);
  doc.text(
    "Marque com X no quadrado quando o documento estiver separado e pronto para apresentar ao fiscal.",
    margin + 4,
    y + 6
  );

  const today = new Date();
  const todayStr = `${today.getDate().toString().padStart(2, "0")}/${(today.getMonth() + 1).toString().padStart(2, "0")}/${today.getFullYear()}`;
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...BRAND.text);
  doc.text(`Data: ${todayStr}`, pageW - margin - 4, y + 6, { align: "right" });

  const totalEmMaos = items.filter((i) => i.emMaos).length;
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...BRAND.muted);
  doc.text(
    `${totalEmMaos}/${items.length} documentos já separados`,
    margin + 4,
    y + 11
  );

  y += 20;

  // Table header
  const colX = {
    checkbox: margin,
    num: margin + 10,
    doc: margin + 20,
  };

  const drawTableHeader = () => {
    doc.setFillColor(241, 245, 249);
    doc.rect(margin, y, contentW, 8, "F");
    doc.setDrawColor(203, 213, 225);
    doc.line(margin, y + 8, margin + contentW, y + 8);

    doc.setFontSize(7);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...BRAND.muted);
    doc.text("✓", colX.checkbox + 4, y + 5.5, { align: "center" });
    doc.text("Nº", colX.num + 2, y + 5.5);
    doc.text("DOCUMENTO", colX.doc, y + 5.5);
    y += 10;
  };

  drawTableHeader();

  // Table rows
  const rowH = 14;

  items.forEach((item, idx) => {
    // Check if we need a new page
    if (y + rowH > pageH - 20) {
      drawBrandFooter(doc, pageW, pageH);
      doc.addPage();
      y = drawBrandHeader(
        doc,
        pageW,
        logo,
        "Documentos Auxiliares — Fiscalização",
        "Criatório Minas Bird — Materiais de Apoio"
      );
      y += 2;
      drawTableHeader();
    }

    // Alternating row background
    if (idx % 2 === 0) {
      doc.setFillColor(252, 252, 253);
      doc.rect(margin, y, contentW, rowH, "F");
    }

    // Row border bottom
    doc.setDrawColor(241, 245, 249);
    doc.line(margin, y + rowH, margin + contentW, y + rowH);

    // Checkbox square (large, for pen marking)
    const cbX = colX.checkbox + 1.5;
    const cbY = y + 3;
    const cbSize = 7;
    doc.setDrawColor(148, 163, 184);
    doc.setLineWidth(0.5);
    doc.rect(cbX, cbY, cbSize, cbSize);

    // If already "em mãos", draw a checkmark
    if (item.emMaos) {
      doc.setDrawColor(...BRAND.green);
      doc.setLineWidth(0.7);
      doc.line(cbX + 1.5, cbY + 3.8, cbX + 3, cbY + 5.5);
      doc.line(cbX + 3, cbY + 5.5, cbX + 5.8, cbY + 1.8);
    }

    // Number
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...BRAND.text);
    doc.text(`${(idx + 1).toString().padStart(2, "0")}`, colX.num + 2, y + 7.5);

    // Document name
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...BRAND.text);
    const maxDocWidth = contentW - (colX.doc - margin) - 4;
    const lines = doc.splitTextToSize(item.title, maxDocWidth);
    doc.text(lines[0], colX.doc, y + 7.5);
    if (lines[1]) {
      doc.setFontSize(7.5);
      doc.text(lines[1], colX.doc, y + 11.5);
    }

    y += rowH;
  });

  // Footer
  drawBrandFooter(doc, pageW, pageH, 1, 1);

  doc.save("auxiliares-fiscalizacao-minas-bird.pdf");
}
