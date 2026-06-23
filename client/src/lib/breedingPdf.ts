/**
 * PDF de Casais e Aves Solteiras — Criatório Minas Bird
 * Layout limpo e legível para uso na hora da separação.
 * Usa o padrão visual do criatório (pdfBrand.ts).
 */
import { jsPDF } from "jspdf";
import {
  BRAND,
  PDF_MARGIN,
  PDF_FONT,
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
 * Gera PDF dos casais — título com nome da espécie, layout limpo e legível
 * Agrupa por espécie com título grande
 */
export async function generateBreedingPdf(pairs: PairData[], speciesTitle?: string): Promise<void> {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = PDF_MARGIN.portrait;
  const contentW = pageW - margin * 2;

  const logoBase64 = await loadLogo();

  // Group pairs by species
  const speciesGroupsMap: Record<string, PairData[]> = {};
  for (const p of pairs) {
    const key = p.speciesName || "Sem esp\u00e9cie";
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

    // Title: "Casais [Espécie]"
    const title = speciesTitle || `Casais ${spName}`;
    let y = drawBrandHeader(doc, pageW, logoBase64, title, `${spPairs.length} casal(is) · ${new Date().toLocaleDateString("pt-BR")}`);
    y += 4;

    // Table columns: Gaiola | ♂ Código | ♂ Mutação | ♂ Anilha | ♀ Código | ♀ Mutação | ♀ Anilha
    const colWidths = [
      contentW * 0.12, // Gaiola
      contentW * 0.13, // ♂ Código
      contentW * 0.19, // ♂ Mutação
      contentW * 0.12, // ♂ Anilha
      contentW * 0.13, // ♀ Código
      contentW * 0.19, // ♀ Mutação
      contentW * 0.12, // ♀ Anilha
    ];

    const drawTableHeader = () => {
      doc.setFillColor(...BRAND.headerBg);
      doc.rect(margin, y, contentW, 8, "F");
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...BRAND.dark);
      let tx = margin + 2;
      doc.text("Gaiola", tx, y + 5.5); tx += colWidths[0];
      doc.setTextColor(...BRAND.blue);
      doc.text("\u2642 C\u00f3digo", tx, y + 5.5); tx += colWidths[1];
      doc.text("\u2642 Muta\u00e7\u00e3o", tx, y + 5.5); tx += colWidths[2];
      doc.text("\u2642 Anilha", tx, y + 5.5); tx += colWidths[3];
      doc.setTextColor(...BRAND.red);
      doc.text("\u2640 C\u00f3digo", tx, y + 5.5); tx += colWidths[4];
      doc.text("\u2640 Muta\u00e7\u00e3o", tx, y + 5.5); tx += colWidths[5];
      doc.text("\u2640 Anilha", tx, y + 5.5);
      y += 10;
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
        y += 4;
        drawTableHeader();
      }

      const p = sorted[i];
      const rowH = 9;

      // Alternating row background
      if (i % 2 === 0) {
        doc.setFillColor(248, 250, 248);
        doc.rect(margin, y - 1, contentW, rowH, "F");
      }

      // Row separator line
      doc.setDrawColor(230, 230, 230);
      doc.setLineWidth(0.2);
      doc.line(margin, y + rowH - 1.5, margin + contentW, y + rowH - 1.5);

      let tx = margin + 2;

      // Gaiola — bold, dark
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...BRAND.dark);
      doc.text(p.enclosure || "—", tx, y + 5);
      tx += colWidths[0];

      // ♂ Código — bold blue, big
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...BRAND.blue);
      doc.text(p.maleCode || "—", tx, y + 5);
      tx += colWidths[1];

      // ♂ Mutação — normal, dark
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...BRAND.text);
      doc.text(p.maleMutation || "—", tx, y + 5);
      tx += colWidths[2];

      // ♂ Anilha — bold, dark
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(80, 80, 80);
      doc.text(p.maleAnilha || "—", tx, y + 5);
      tx += colWidths[3];

      // ♀ Código — bold red, big
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...BRAND.red);
      doc.text(p.femaleCode || "—", tx, y + 5);
      tx += colWidths[4];

      // ♀ Mutação — normal, dark
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...BRAND.text);
      doc.text(p.femaleMutation || "—", tx, y + 5);
      tx += colWidths[5];

      // ♀ Anilha — bold, dark
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(80, 80, 80);
      doc.text(p.femaleAnilha || "—", tx, y + 5);

      y += rowH;
    }
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
 * Gera PDF das aves solteiras (não estão em casais ativos) separadas por machos e fêmeas
 */
export async function generateSinglesPdf(
  males: SingleBirdData[],
  females: SingleBirdData[],
): Promise<void> {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = PDF_MARGIN.portrait;
  const contentW = pageW - margin * 2;

  const logoBase64 = await loadLogo();

  let pageNum = 1;
  const totalBirds = males.length + females.length;
  let y = drawBrandHeader(doc, pageW, logoBase64, "Aves Solteiras", `${totalBirds} ave(s) · ${males.length} machos · ${females.length} fêmeas`);
  y += 4;

  // Summary box
  doc.setFillColor(245, 247, 250);
  doc.roundedRect(margin, y, contentW, 14, 2, 2, "F");
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...BRAND.blue);
  doc.text(`♂ ${males.length} Machos Solteiros`, margin + 8, y + 9);
  doc.setTextColor(...BRAND.red);
  doc.text(`♀ ${females.length} Fêmeas Solteiras`, margin + contentW * 0.5, y + 9);
  y += 18;

  // Column widths for singles table
  const sColWidths = [
    contentW * 0.15, // Código
    contentW * 0.22, // Espécie
    contentW * 0.25, // Mutação
    contentW * 0.18, // Anilha
    contentW * 0.20, // Gaiola
  ];

  function drawSinglesHeader() {
    doc.setFillColor(...BRAND.headerBg);
    doc.rect(margin, y, contentW, 7, "F");
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...BRAND.dark);
    let tx = margin + 2;
    doc.text("Código", tx, y + 5); tx += sColWidths[0];
    doc.text("Espécie", tx, y + 5); tx += sColWidths[1];
    doc.text("Mutação", tx, y + 5); tx += sColWidths[2];
    doc.text("Anilha", tx, y + 5); tx += sColWidths[3];
    doc.text("Gaiola", tx, y + 5);
    y += 8;
  }

  function drawBirdRows(birdList: SingleBirdData[]) {
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
        y = drawBrandHeader(doc, pageW, logoBase64, "Aves Solteiras (cont.)", "");
        y += 4;
        drawSinglesHeader();
      }

      const b = sorted[i];
      const rowH = 7;

      if (i % 2 === 0) {
        doc.setFillColor(248, 250, 248);
        doc.rect(margin, y - 1, contentW, rowH, "F");
      }

      let tx = margin + 2;

      // Código — bold
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...BRAND.text);
      doc.text(b.ringNumber || "—", tx, y + 4);
      tx += sColWidths[0];

      // Espécie
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...BRAND.text);
      doc.text(b.speciesName || "—", tx, y + 4);
      tx += sColWidths[1];

      // Mutação
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...BRAND.dark);
      doc.text(b.mutation || "—", tx, y + 4);
      tx += sColWidths[2];

      // Anilha
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(80, 80, 80);
      doc.text(b.anilha || "—", tx, y + 4);
      tx += sColWidths[3];

      // Gaiola
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...BRAND.muted);
      doc.text(b.enclosure || "—", tx, y + 4);

      y += rowH;
    }
  }

  // ===== MACHOS =====
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...BRAND.blue);
  doc.text(`♂ Machos Solteiros (${males.length})`, margin, y);
  y += 6;
  drawSinglesHeader();
  drawBirdRows(males);

  // ===== FÊMEAS =====
  y += 8;
  if (y > pageH - 30) {
    drawBrandFooter(doc, pageW, pageH, pageNum, 0);
    doc.addPage();
    pageNum++;
    y = drawBrandHeader(doc, pageW, logoBase64, "Aves Solteiras (cont.)", "");
    y += 4;
  }
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...BRAND.red);
  doc.text(`♀ Fêmeas Solteiras (${females.length})`, margin, y);
  y += 6;
  drawSinglesHeader();
  drawBirdRows(females);

  // Draw footers on all pages
  const totalPages = pageNum;
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    drawBrandFooter(doc, pageW, pageH, p, totalPages);
  }

  const now = new Date();
  const filename = `aves-solteiras_${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}.pdf`;
  doc.save(filename);
}
