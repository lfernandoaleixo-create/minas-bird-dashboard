/**
 * PDF de Casais e Aves Solteiras — Criatório Minas Bird
 * Layout limpo, legível, pronto para imprimir e entregar.
 * Usa o padrão visual do criatório (pdfBrand.ts).
 */
import { jsPDF } from "jspdf";
import {
  BRAND,
  PDF_MARGIN,
  loadLogo,
  drawBrandHeader,
  drawBrandFooter,
} from "./pdfBrand";

export interface PairData {
  id: number;
  speciesName: string;
  pairName: string | null;
  enclosure: string | null;
  status: string;
  maleCode: string;
  maleMutation: string | null;
  maleAnilha: string | null;
  femaleCode: string;
  femaleMutation: string | null;
  femaleAnilha: string | null;
  startDate: string | null;
  notes: string | null;
}

export interface SingleBirdData {
  ringNumber: string | null;
  sex: string;
  speciesName: string;
  mutation: string | null;
  anilha: string | null;
  enclosure: string | null;
}

/**
 * Gera PDF dos casais — LANDSCAPE, colunas bem distribuídas, linhas separadas
 */
export async function generateBreedingPdf(pairs: PairData[], speciesTitle?: string): Promise<void> {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth(); // 297
  const pageH = doc.internal.pageSize.getHeight(); // 210
  const margin = PDF_MARGIN.landscape; // 8

  const logoBase64 = await loadLogo();

  // Group pairs by species
  const speciesGroupsMap: Record<string, PairData[]> = {};
  for (const p of pairs) {
    const key = p.speciesName || "Sem especie";
    if (!speciesGroupsMap[key]) speciesGroupsMap[key] = [];
    speciesGroupsMap[key].push(p);
  }
  const speciesEntries = Object.entries(speciesGroupsMap);

  let pageNum = 1;
  let isFirstGroup = true;

  for (const [spName, spPairs] of speciesEntries) {
    if (!isFirstGroup) {
      drawBrandFooter(doc, pageW, pageH, pageNum, 0);
      doc.addPage();
      pageNum++;
    }
    isFirstGroup = false;

    const title = speciesTitle || `Casais ${spName}`;
    let y = drawBrandHeader(doc, pageW, logoBase64, title, `${spPairs.length} casal(is) - ${new Date().toLocaleDateString("pt-BR")}`);
    y += 2;

    // Table layout — 7 columns, redistributed to use full width
    const contentW = pageW - margin * 2; // ~281mm
    // Redistribute: reduce Gaiola and Mutacao, maximize Anilha columns
    const colW = [
      24,   // Gaiola
      26,   // Macho Codigo
      48,   // Macho Mutacao
      43,   // Macho Anilha
      26,   // Femea Codigo
      46,   // Femea Mutacao
      68,   // Femea Anilha (maximized to prevent cutoff)
    ];

    // Section headers: MACHO / FEMEA
    const machoStart = margin + colW[0];
    const machoEnd = machoStart + colW[1] + colW[2] + colW[3];
    const femeaStart = machoEnd;

    // Draw section labels
    doc.setFillColor(239, 246, 255); // light blue bg
    doc.rect(machoStart, y, colW[1] + colW[2] + colW[3], 7, "F");
    doc.setFillColor(254, 242, 242); // light red bg
    doc.rect(femeaStart, y, colW[4] + colW[5] + colW[6], 7, "F");

    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...BRAND.blue);
    doc.text("MACHO", machoStart + (colW[1] + colW[2] + colW[3]) / 2, y + 5, { align: "center" });
    doc.setTextColor(...BRAND.red);
    doc.text("FEMEA", femeaStart + (colW[4] + colW[5] + colW[6]) / 2, y + 5, { align: "center" });
    y += 8;

    // Column headers
    const drawTableHeader = () => {
      doc.setFillColor(...BRAND.headerBg);
      doc.rect(margin, y, contentW, 7, "F");
      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...BRAND.dark);

      let tx = margin + 2;
      doc.text("Gaiola", tx, y + 5); tx += colW[0];
      doc.text("Codigo", tx, y + 5); tx += colW[1];
      doc.text("Mutacao", tx, y + 5); tx += colW[2];
      doc.text("Anilha", tx, y + 5); tx += colW[3];
      doc.text("Codigo", tx, y + 5); tx += colW[4];
      doc.text("Mutacao", tx, y + 5); tx += colW[5];
      doc.text("Anilha", tx, y + 5);
      y += 9;
    };

    drawTableHeader();

    // Sort by enclosure
    const sorted = [...spPairs].sort((a, b) => (a.enclosure || "").localeCompare(b.enclosure || ""));

    for (let i = 0; i < sorted.length; i++) {
      if (y > pageH - 20) {
        drawBrandFooter(doc, pageW, pageH, pageNum, 0);
        doc.addPage();
        pageNum++;
        y = drawBrandHeader(doc, pageW, logoBase64, `${title} (cont.)`, "");
        y += 2;

        // Re-draw section labels on new page
        doc.setFillColor(239, 246, 255);
        doc.rect(machoStart, y, colW[1] + colW[2] + colW[3], 7, "F");
        doc.setFillColor(254, 242, 242);
        doc.rect(femeaStart, y, colW[4] + colW[5] + colW[6], 7, "F");
        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(...BRAND.blue);
        doc.text("MACHO", machoStart + (colW[1] + colW[2] + colW[3]) / 2, y + 5, { align: "center" });
        doc.setTextColor(...BRAND.red);
        doc.text("FEMEA", femeaStart + (colW[4] + colW[5] + colW[6]) / 2, y + 5, { align: "center" });
        y += 8;

        drawTableHeader();
      }

      const p = sorted[i];
      const rowH = 9;

      // Alternating row background for readability
      if (i % 2 === 0) {
        doc.setFillColor(245, 248, 245);
        doc.rect(margin, y, contentW, rowH, "F");
      }

      // Draw horizontal line ABOVE each row (visible separator between pairs)
      doc.setDrawColor(180, 180, 180);
      doc.setLineWidth(0.3);
      doc.line(margin, y, margin + contentW, y);

      // Vertical separator between macho and femea (thicker, more visible)
      doc.setDrawColor(140, 140, 140);
      doc.setLineWidth(0.5);
      doc.line(femeaStart - 0.5, y, femeaStart - 0.5, y + rowH);

      let tx = margin + 2;

      // Gaiola
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...BRAND.dark);
      doc.text(p.enclosure || "-", tx, y + 6);
      tx += colW[0];

      // MACHO Codigo
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...BRAND.blue);
      doc.text(p.maleCode || "-", tx, y + 6);
      tx += colW[1];

      // MACHO Mutacao
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...BRAND.text);
      doc.text(truncate(p.maleMutation || "-", 24), tx, y + 6);
      tx += colW[2];

      // MACHO Anilha
      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(60, 60, 60);
      doc.text(truncate(p.maleAnilha || "-", 24), tx, y + 6);
      tx += colW[3];

      // FEMEA Codigo
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...BRAND.red);
      doc.text(p.femaleCode || "-", tx, y + 6);
      tx += colW[4];

      // FEMEA Mutacao
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...BRAND.text);
      doc.text(truncate(p.femaleMutation || "-", 22), tx, y + 6);
      tx += colW[5];

      // FEMEA Anilha
      doc.setFontSize(7);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(60, 60, 60);
      doc.text(p.femaleAnilha || "-", tx, y + 6);

      y += rowH;
    }

    // Draw bottom line of last row
    doc.setDrawColor(180, 180, 180);
    doc.setLineWidth(0.3);
    doc.line(margin, y, margin + contentW, y);
  }

  // Draw footers on all pages
  const totalPages = pageNum;
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    drawBrandFooter(doc, pageW, pageH, p, totalPages);
  }

  const now = new Date();
  const filename = `casais_${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}.pdf`;
  doc.save(filename);
}

/**
 * Gera PDF das aves solteiras separadas por machos e femeas
 * Aceita speciesFilter para filtrar por espécie específica
 */
export async function generateSinglesPdf(
  males: SingleBirdData[],
  females: SingleBirdData[],
  speciesFilter?: string,
): Promise<void> {
  // Apply species filter if provided
  const filteredMales = speciesFilter ? males.filter(b => b.speciesName === speciesFilter) : males;
  const filteredFemales = speciesFilter ? females.filter(b => b.speciesName === speciesFilter) : females;

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = PDF_MARGIN.portrait;
  const contentW = pageW - margin * 2;

  const logoBase64 = await loadLogo();

  let pageNum = 1;
  const totalBirds = filteredMales.length + filteredFemales.length;
  const titleText = speciesFilter ? `Aves Solteiras - ${speciesFilter}` : "Aves Solteiras";
  let y = drawBrandHeader(doc, pageW, logoBase64, titleText, `${totalBirds} ave(s) - ${filteredMales.length} machos - ${filteredFemales.length} femeas`);
  y += 4;

  // Summary box
  doc.setFillColor(239, 246, 255);
  doc.roundedRect(margin, y, contentW / 2 - 2, 12, 2, 2, "F");
  doc.setFillColor(254, 242, 242);
  doc.roundedRect(margin + contentW / 2 + 2, y, contentW / 2 - 2, 12, 2, 2, "F");
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...BRAND.blue);
  doc.text(`${filteredMales.length} Machos`, margin + contentW / 4 - 1, y + 8, { align: "center" });
  doc.setTextColor(...BRAND.red);
  doc.text(`${filteredFemales.length} Femeas`, margin + contentW * 3 / 4 + 1, y + 8, { align: "center" });
  y += 16;

  // Column widths for singles table — when species is filtered, redistribute space to Mutacao/Anilha
  const sColWidths = speciesFilter
    ? [
        contentW * 0.12, // Codigo
        0,               // Especie (hidden)
        contentW * 0.38, // Mutacao (much wider)
        contentW * 0.38, // Anilha (much wider)
        contentW * 0.12, // Gaiola
      ]
    : [
        contentW * 0.12, // Codigo
        contentW * 0.16, // Especie
        contentW * 0.32, // Mutacao
        contentW * 0.28, // Anilha
        contentW * 0.12, // Gaiola
      ];

  const drawSinglesHeader = () => {
    doc.setFillColor(...BRAND.headerBg);
    doc.rect(margin, y, contentW, 7, "F");
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...BRAND.dark);
    let tx = margin + 2;
    doc.text("Codigo", tx, y + 5); tx += sColWidths[0];
    if (!speciesFilter) {
      doc.text("Especie", tx, y + 5);
    }
    tx += sColWidths[1];
    doc.text("Mutacao", tx, y + 5); tx += sColWidths[2];
    doc.text("Anilha", tx, y + 5); tx += sColWidths[3];
    doc.text("Gaiola", tx, y + 5);
    y += 8;
  };

  const drawBirdRows = (birdList: SingleBirdData[]) => {
    const sorted = [...birdList].sort((a, b) => {
      const sp = (a.speciesName || "").localeCompare(b.speciesName || "");
      if (sp !== 0) return sp;
      return (a.ringNumber || "").localeCompare(b.ringNumber || "");
    });

    for (let i = 0; i < sorted.length; i++) {
      if (y > pageH - 18) {
        drawBrandFooter(doc, pageW, pageH, pageNum, 0);
        doc.addPage();
        pageNum++;
        y = drawBrandHeader(doc, pageW, logoBase64, `${titleText} (cont.)`, "");
        y += 4;
        drawSinglesHeader();
      }

      const b = sorted[i];
      const rowH = 7;

      if (i % 2 === 0) {
        doc.setFillColor(245, 248, 245);
        doc.rect(margin, y, contentW, rowH, "F");
      }

      // Row separator line
      doc.setDrawColor(200, 200, 200);
      doc.setLineWidth(0.2);
      doc.line(margin, y, margin + contentW, y);

      let tx = margin + 2;

      // Codigo
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...BRAND.text);
      doc.text(b.ringNumber || "-", tx, y + 5);
      tx += sColWidths[0];

      // Especie (skip if filtered by species)
      if (!speciesFilter) {
        doc.setFontSize(9);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(...BRAND.text);
        doc.text(truncate(b.speciesName || "-", 18), tx, y + 5);
      }
      tx += sColWidths[1];

      // Mutacao — sem truncamento
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...BRAND.dark);
      doc.text(b.mutation || "-", tx, y + 5);
      tx += sColWidths[2];

      // Anilha — sem truncamento
      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(60, 60, 60);
      doc.text(b.anilha || "-", tx, y + 5);
      tx += sColWidths[3];

      // Gaiola
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...BRAND.muted);
      doc.text(b.enclosure || "-", tx, y + 5);

      y += rowH;
    }
  };

  // ===== MACHOS =====
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...BRAND.blue);
  doc.text(`MACHOS SOLTEIROS (${filteredMales.length})`, margin, y);
  y += 6;
  drawSinglesHeader();
  drawBirdRows(filteredMales);

  // ===== FEMEAS =====
  y += 8;
  if (y > pageH - 30) {
    drawBrandFooter(doc, pageW, pageH, pageNum, 0);
    doc.addPage();
    pageNum++;
    y = drawBrandHeader(doc, pageW, logoBase64, `${titleText} (cont.)`, "");
    y += 4;
  }
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...BRAND.red);
  doc.text(`FEMEAS SOLTEIRAS (${filteredFemales.length})`, margin, y);
  y += 6;
  drawSinglesHeader();
  drawBirdRows(filteredFemales);

  // Draw footers on all pages
  const totalPages = pageNum;
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    drawBrandFooter(doc, pageW, pageH, p, totalPages);
  }

  const now = new Date();
  const filename = speciesFilter
    ? `aves-solteiras-${speciesFilter.toLowerCase().replace(/\s+/g, "-")}_${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}.pdf`
    : `aves-solteiras_${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}.pdf`;
  doc.save(filename);
}

function truncate(str: string, max: number): string {
  if (str.length <= max) return str;
  return str.slice(0, max - 1) + "...";
}
