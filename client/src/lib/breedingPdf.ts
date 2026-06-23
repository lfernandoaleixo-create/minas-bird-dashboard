/**
 * PDF de Casais e Aves Solteiras — Criatório Minas Bird
 * Gera relatório para orientar veterinário na separação de aves.
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
 * Gera PDF dos casais para orientar o veterinário
 */
export async function generateBreedingPdf(pairs: PairData[]): Promise<void> {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = PDF_MARGIN.landscape;
  const contentW = pageW - margin * 2;

  const logoBase64 = await loadLogo();

  let pageNum = 1;
  let y = drawBrandHeader(doc, pageW, logoBase64, "Casais — Orientação Veterinária", `${pairs.length} casal(is) · Gerado em ${new Date().toLocaleDateString("pt-BR")}`);
  y += 2;

  // Table header
  const colWidths = [
    contentW * 0.10, // Gaiola
    contentW * 0.12, // Espécie
    contentW * 0.10, // Status
    contentW * 0.12, // ♂ Código
    contentW * 0.14, // ♂ Mutação
    contentW * 0.10, // ♂ Anilha
    contentW * 0.12, // ♀ Código
    contentW * 0.14, // ♀ Mutação
    contentW * 0.06, // ♀ Anilha
  ];

  function drawTableHeader() {
    doc.setFillColor(...BRAND.headerBg);
    doc.rect(margin, y, contentW, 6, "F");
    doc.setFontSize(7);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...BRAND.dark);
    let tx = margin + 1.5;
    doc.text("Gaiola", tx, y + 4); tx += colWidths[0];
    doc.text("Espécie", tx, y + 4); tx += colWidths[1];
    doc.text("Status", tx, y + 4); tx += colWidths[2];
    doc.text("♂ Código", tx, y + 4); tx += colWidths[3];
    doc.text("♂ Mutação", tx, y + 4); tx += colWidths[4];
    doc.text("♂ Anilha", tx, y + 4); tx += colWidths[5];
    doc.text("♀ Código", tx, y + 4); tx += colWidths[6];
    doc.text("♀ Mutação", tx, y + 4); tx += colWidths[7];
    doc.text("♀ Anilha", tx, y + 4);
    y += 7;
  }

  drawTableHeader();

  // Sort by species then enclosure
  const sorted = [...pairs].sort((a, b) => {
    const sp = (a.speciesName || "").localeCompare(b.speciesName || "");
    if (sp !== 0) return sp;
    return (a.enclosure || "").localeCompare(b.enclosure || "");
  });

  for (let i = 0; i < sorted.length; i++) {
    if (y > pageH - 18) {
      drawBrandFooter(doc, pageW, pageH, pageNum, 0);
      doc.addPage();
      pageNum++;
      y = drawBrandHeader(doc, pageW, logoBase64, "Casais — Orientação Veterinária (cont.)", "");
      y += 2;
      drawTableHeader();
    }

    const p = sorted[i];

    if (i % 2 === 0) {
      doc.setFillColor(252, 252, 252);
      doc.rect(margin, y - 3.5, contentW, 6, "F");
    }

    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...BRAND.text);

    let tx = margin + 1.5;
    doc.setFont("helvetica", "bold");
    doc.text(p.enclosure || "—", tx, y); tx += colWidths[0];
    doc.setFont("helvetica", "normal");
    doc.text(truncate(p.speciesName, 16), tx, y); tx += colWidths[1];
    
    // Status with color
    const statusLabel = p.status === "ativo" ? "Ativo" : p.status === "em_descanso" ? "Descanso" : "Separado";
    if (p.status === "ativo") doc.setTextColor(...BRAND.green);
    else if (p.status === "em_descanso") doc.setTextColor(...BRAND.amber);
    else doc.setTextColor(...BRAND.muted);
    doc.text(statusLabel, tx, y); tx += colWidths[2];
    
    // Male
    doc.setTextColor(...BRAND.blue);
    doc.setFont("helvetica", "bold");
    doc.text(p.maleCode || "—", tx, y); tx += colWidths[3];
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...BRAND.text);
    doc.text(truncate(p.maleMutation || "—", 18), tx, y); tx += colWidths[4];
    doc.setTextColor(...BRAND.muted);
    doc.text(p.maleAnilha || "—", tx, y); tx += colWidths[5];
    
    // Female
    doc.setTextColor(...BRAND.red);
    doc.setFont("helvetica", "bold");
    doc.text(p.femaleCode || "—", tx, y); tx += colWidths[6];
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...BRAND.text);
    doc.text(truncate(p.femaleMutation || "—", 18), tx, y); tx += colWidths[7];
    doc.setTextColor(...BRAND.muted);
    doc.text(p.femaleAnilha || "—", tx, y);

    y += 6;
  }

  // Draw footers on all pages
  const totalPages = pageNum;
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    drawBrandFooter(doc, pageW, pageH, p, totalPages);
  }

  const now = new Date();
  const filename = `casais-veterinario_${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}.pdf`;
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
  y += 2;

  // Summary box
  doc.setFillColor(245, 247, 250);
  doc.roundedRect(margin, y, contentW, 16, 2, 2, "F");
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...BRAND.blue);
  doc.text(`♂ ${males.length} Machos Solteiros`, margin + 6, y + 7);
  doc.setTextColor(...BRAND.red);
  doc.text(`♀ ${females.length} Fêmeas Solteiras`, margin + contentW * 0.5, y + 7);
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...BRAND.muted);
  doc.text(`Gerado em ${new Date().toLocaleDateString("pt-BR")} — Aves ativas não vinculadas a casais ativos`, margin + 6, y + 13);
  y += 20;

  // Column widths for singles table
  const sColWidths = [
    contentW * 0.15, // Código
    contentW * 0.25, // Espécie
    contentW * 0.25, // Mutação
    contentW * 0.15, // Anilha
    contentW * 0.20, // Gaiola
  ];

  function drawSinglesHeader() {
    doc.setFillColor(...BRAND.headerBg);
    doc.rect(margin, y, contentW, 5.5, "F");
    doc.setFontSize(7);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...BRAND.dark);
    let tx = margin + 1.5;
    doc.text("Código", tx, y + 3.8); tx += sColWidths[0];
    doc.text("Espécie", tx, y + 3.8); tx += sColWidths[1];
    doc.text("Mutação", tx, y + 3.8); tx += sColWidths[2];
    doc.text("Anilha", tx, y + 3.8); tx += sColWidths[3];
    doc.text("Gaiola", tx, y + 3.8);
    y += 6.5;
  }

  function drawBirdRows(birdList: SingleBirdData[]) {
    // Sort by species then code
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
        y += 2;
        drawSinglesHeader();
      }

      const b = sorted[i];

      if (i % 2 === 0) {
        doc.setFillColor(252, 252, 252);
        doc.rect(margin, y - 3.2, contentW, 5.5, "F");
      }

      doc.setFontSize(7);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...BRAND.text);

      let tx = margin + 1.5;
      doc.setFont("helvetica", "bold");
      doc.text(b.ringNumber || "—", tx, y); tx += sColWidths[0];
      doc.setFont("helvetica", "normal");
      doc.text(truncate(b.speciesName, 22), tx, y); tx += sColWidths[1];
      doc.text(truncate(b.mutation || "—", 22), tx, y); tx += sColWidths[2];
      doc.setTextColor(...BRAND.muted);
      doc.text(b.anilha || "—", tx, y); tx += sColWidths[3];
      doc.text(b.enclosure || "—", tx, y);

      y += 5.5;
    }
  }

  // ===== MACHOS =====
  doc.setFontSize(PDF_FONT.sectionTitle);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...BRAND.blue);
  doc.text(`♂ Machos Solteiros (${males.length})`, margin, y);
  y += 5;
  drawSinglesHeader();
  drawBirdRows(males);

  // ===== FÊMEAS =====
  y += 6;
  if (y > pageH - 30) {
    drawBrandFooter(doc, pageW, pageH, pageNum, 0);
    doc.addPage();
    pageNum++;
    y = drawBrandHeader(doc, pageW, logoBase64, "Aves Solteiras (cont.)", "");
    y += 2;
  }
  doc.setFontSize(PDF_FONT.sectionTitle);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...BRAND.red);
  doc.text(`♀ Fêmeas Solteiras (${females.length})`, margin, y);
  y += 5;
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

function truncate(str: string, max: number): string {
  if (str.length <= max) return str;
  return str.slice(0, max - 1) + "…";
}
