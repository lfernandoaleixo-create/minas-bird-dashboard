/**
 * Gera PDF de uma espécie do plantel — lista de aves com informações do resumo
 * Formato: tabela com Código, Sexo, Anilha, Gaiola, Mutação, Status
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

interface BirdRow {
  ringNumber: string | null;
  sex: string;
  anilha: string | null;
  enclosure: string | null;
  mutation: string | null;
  status: string;
}

interface SpeciesPdfData {
  speciesName: string;
  prefix: string;
  birds: BirdRow[];
}

const SEX_MAP: Record<string, string> = {
  macho: "Macho",
  femea: "Fêmea",
  indefinido: "Indef.",
};

const STATUS_MAP: Record<string, string> = {
  ativo: "Ativo",
  obito: "Óbito",
  vendido: "Vendido",
  doado: "Doado",
  emprestado: "Emprestado",
};

export async function generateSpeciesPdf(data: SpeciesPdfData): Promise<void> {
  const logo = await loadLogo();
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = PDF_MARGIN.portrait;

  const activeCount = data.birds.filter(b => b.status === "ativo").length;
  const obitoCount = data.birds.filter(b => b.status === "obito").length;

  let y = drawBrandHeader(
    doc,
    pageW,
    logo,
    `Plantel — ${data.speciesName}`,
    `Prefixo: ${data.prefix} · ${activeCount} ativa${activeCount !== 1 ? "s" : ""}${obitoCount > 0 ? ` · ${obitoCount} óbito${obitoCount !== 1 ? "s" : ""}` : ""} · ${data.birds.length} total`,
  );

  // Table columns
  // Total usable width: pageW - 2*margin = 210 - 24 = 186mm
  // Distribute: Código(20) + Sexo(20) + Anilha(52) + Gaiola(18) + Mutação(52) + Status(24) = 186
  const usableW = pageW - margin * 2;
  const colDefs = [
    { label: "Código", width: 20 },
    { label: "Sexo", width: 20 },
    { label: "Anilha", width: 52 },
    { label: "Gaiola", width: 18 },
    { label: "Mutação", width: usableW - 20 - 20 - 52 - 18 - 24 },
    { label: "Status", width: 24 },
  ];

  const tableX = margin;
  const rowH = 7;
  const headerH = 8;

  function drawTableHeader(startY: number): number {
    // Header background
    doc.setFillColor(...BRAND.headerBg);
    doc.rect(tableX, startY, pageW - margin * 2, headerH, "F");

    // Header text
    doc.setFontSize(PDF_FONT.body);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...BRAND.dark);

    let cx = tableX + 2;
    for (let i = 0; i < colDefs.length; i++) {
      const col = colDefs[i];
      if (i === colDefs.length - 1) {
        // Status header aligned right
        doc.text(col.label, pageW - margin - 2, startY + headerH * 0.65, { align: "right" });
      } else {
        doc.text(col.label, cx, startY + headerH * 0.65);
      }
      cx += col.width;
    }

    return startY + headerH;
  }

  y = drawTableHeader(y);

  // Table rows
  doc.setFont("helvetica", "normal");
  doc.setFontSize(PDF_FONT.body);

  for (let i = 0; i < data.birds.length; i++) {
    // Check page break
    if (y + rowH > pageH - 18) {
      drawBrandFooter(doc, pageW, pageH, doc.getNumberOfPages(), 0); // placeholder
      doc.addPage();
      y = drawBrandHeader(doc, pageW, logo, `Plantel — ${data.speciesName}`, "(continuação)");
      y = drawTableHeader(y);
    }

    const bird = data.birds[i];

    // Alternating row bg
    if (i % 2 === 0) {
      doc.setFillColor(248, 250, 252);
      doc.rect(tableX, y, pageW - margin * 2, rowH, "F");
    }

    // Row border
    doc.setDrawColor(...BRAND.gridLine);
    doc.setLineWidth(0.2);
    doc.line(tableX, y + rowH, pageW - margin, y + rowH);

    doc.setTextColor(...BRAND.text);
    doc.setFontSize(PDF_FONT.body);

    let cx = tableX + 2;
    const textY = y + rowH * 0.65;

    // Código
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...BRAND.dark);
    doc.text(bird.ringNumber || "—", cx, textY);
    cx += colDefs[0].width;

    // Sexo
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...BRAND.text);
    doc.text(SEX_MAP[bird.sex] || bird.sex, cx, textY);
    cx += colDefs[1].width;

    // Anilha
    doc.setFont("helvetica", "normal");
    doc.text(bird.anilha || "—", cx, textY);
    cx += colDefs[2].width;

    // Gaiola
    doc.text(bird.enclosure || "—", cx, textY);
    cx += colDefs[3].width;

    // Mutação
    const mutText = bird.mutation || "—";
    const maxMutW = colDefs[4].width - 2;
    const truncMut = doc.getTextWidth(mutText) > maxMutW
      ? mutText.substring(0, Math.floor(mutText.length * maxMutW / doc.getTextWidth(mutText))) + "…"
      : mutText;
    doc.text(truncMut, cx, textY);
    cx += colDefs[4].width;

    // Status - aligned to right edge
    if (bird.status === "ativo") {
      doc.setTextColor(...BRAND.green);
    } else if (bird.status === "obito") {
      doc.setTextColor(...BRAND.muted);
    } else {
      doc.setTextColor(...BRAND.text);
    }
    doc.setFont("helvetica", "bold");
    doc.text(STATUS_MAP[bird.status] || bird.status, pageW - margin - 2, textY, { align: "right" });

    y += rowH;
  }

  // Footer on all pages
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    drawBrandFooter(doc, pageW, pageH, p, totalPages);
  }

  doc.save(`plantel-${data.prefix.toLowerCase()}-${data.speciesName.toLowerCase().replace(/\s+/g, "-")}.pdf`);
}
