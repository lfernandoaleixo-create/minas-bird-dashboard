/**
 * Relatório de Linhagem — PDF para documentação oficial do criatório
 * Usa o padrão visual compartilhado (pdfBrand.ts)
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

interface BirdData {
  id: number;
  speciesId: string;
  speciesName: string;
  ringNumber: string | null;
  sex: string;
  birthDate: string | number | Date | null;
  mutation: string | null;
  origin: string;
  originBreeder: string | null;
  status: string;
  enclosure: string | null;
  notes: string | null;
  anilha?: string | null;
  fatherId?: number | null;
  motherId?: number | null;
  invoiceNumber?: string | null;
  createdAt: string | number | Date;
}

const SEX_LABELS: Record<string, string> = {
  macho: "Macho",
  femea: "Fêmea",
  indefinido: "Indefinido",
};

const STATUS_LABELS: Record<string, string> = {
  ativo: "Ativo",
  vendido: "Vendido",
  obito: "Óbito",
  doado: "Doado",
  emprestado: "Emprestado",
};

const ORIGIN_LABELS: Record<string, string> = {
  nascido_criadouro: "Nascido no Criatório",
  comprado: "Comprado",
  doado: "Doado",
  troca: "Troca",
};

function formatDate(d: string | number | Date | null, precision?: string): string {
  if (!d) return "—";
  const date = new Date(d);
  if (precision === "year_only") {
    return date.getUTCFullYear().toString();
  }
  return `${String(date.getUTCDate()).padStart(2, "0")}/${String(date.getUTCMonth() + 1).padStart(2, "0")}/${date.getUTCFullYear()}`;
}

function getParentNote(notes: string | null, field: "fatherNote" | "motherNote"): string {
  if (!notes) return "";
  try {
    const parsed = JSON.parse(notes);
    if (parsed && parsed._docMeta) return parsed._docMeta[field] || "";
  } catch { /* plain text */ }
  return "";
}

export async function generateLineagePdf(
  bird: BirdData,
  allBirds: BirdData[],
): Promise<void> {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = PDF_MARGIN.portrait;
  const contentW = pageW - margin * 2;

  const logo = await loadLogo();

  // Header
  let y = drawBrandHeader(doc, pageW, logo, "Relatório de Linhagem", bird.speciesName);

  // === IDENTIFICATION SECTION ===
  y += 2;
  doc.setFontSize(PDF_FONT.sectionTitle);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...BRAND.dark);
  doc.text("Identificação da Ave", margin, y);
  y += 5;

  // Info box
  doc.setFillColor(245, 250, 247);
  doc.roundedRect(margin, y, contentW, 32, 2, 2, "F");
  doc.setDrawColor(...BRAND.primary);
  doc.setLineWidth(0.3);
  doc.roundedRect(margin, y, contentW, 32, 2, 2, "S");

  const col1 = margin + 4;
  const col2 = margin + contentW / 2 + 4;
  let iy = y + 6;

  const drawField = (x: number, label: string, value: string, yPos: number) => {
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...BRAND.muted);
    doc.text(label, x, yPos);
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...BRAND.text);
    doc.text(value || "—", x, yPos + 4);
  };

  drawField(col1, "Código", bird.ringNumber || "—", iy);
  drawField(col2, "Anilha", bird.anilha || "—", iy);
  iy += 10;
  drawField(col1, "Sexo", SEX_LABELS[bird.sex] || bird.sex, iy);
  drawField(col2, "Data de Nascimento", formatDate(bird.birthDate, (bird as any).birthDatePrecision), iy);
  iy += 10;
  drawField(col1, "Mutação / Cor", bird.mutation || "—", iy);
  drawField(col2, "Status", STATUS_LABELS[bird.status] || bird.status, iy);

  y += 36;

  // === GENEALOGY SECTION ===
  y += 4;
  doc.setFontSize(PDF_FONT.sectionTitle);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...BRAND.dark);
  doc.text("Árvore Genealógica", margin, y);
  y += 5;

  // Resolve parents
  const father = bird.fatherId ? allBirds.find(b => b.id === bird.fatherId) : null;
  const mother = bird.motherId ? allBirds.find(b => b.id === bird.motherId) : null;
  const fatherNote = getParentNote(bird.notes, "fatherNote");
  const motherNote = getParentNote(bird.notes, "motherNote");

  // Resolve grandparents
  const paternalGF = father?.fatherId ? allBirds.find(b => b.id === father.fatherId) : null;
  const paternalGM = father?.motherId ? allBirds.find(b => b.id === father.motherId) : null;
  const maternalGF = mother?.fatherId ? allBirds.find(b => b.id === mother.fatherId) : null;
  const maternalGM = mother?.motherId ? allBirds.find(b => b.id === mother.motherId) : null;

  const drawParentCard = (x: number, yPos: number, w: number, h: number, label: string, name: string, details: string, color: [number, number, number], bgColor: [number, number, number]) => {
    doc.setFillColor(...bgColor);
    doc.roundedRect(x, yPos, w, h, 1.5, 1.5, "F");
    doc.setDrawColor(...color);
    doc.setLineWidth(0.3);
    doc.roundedRect(x, yPos, w, h, 1.5, 1.5, "S");

    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...color);
    doc.text(label, x + 3, yPos + 5);

    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...BRAND.text);
    const nameLines = doc.splitTextToSize(name, w - 6);
    doc.text(nameLines, x + 3, yPos + 10);

    if (details) {
      doc.setFontSize(7);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...BRAND.muted);
      const detLines = doc.splitTextToSize(details, w - 6);
      doc.text(detLines, x + 3, yPos + 15);
    }
  };

  const blueColor: [number, number, number] = [37, 99, 235];
  const blueBg: [number, number, number] = [239, 246, 255];
  const pinkColor: [number, number, number] = [219, 39, 119];
  const pinkBg: [number, number, number] = [253, 242, 248];

  const cardH = 20;
  const halfW = (contentW - 4) / 2;

  // Parents row
  const fatherName = father ? `${father.ringNumber || "?"} — ${father.mutation || father.speciesName}` : (fatherNote || "Não informado");
  const fatherDetails = father ? `${SEX_LABELS[father.sex]} · ${ORIGIN_LABELS[father.origin] || father.origin}` : (fatherNote ? "(Externo)" : "");
  drawParentCard(margin, y, halfW, cardH, "Pai", fatherName, fatherDetails, blueColor, blueBg);

  const motherName = mother ? `${mother.ringNumber || "?"} — ${mother.mutation || mother.speciesName}` : (motherNote || "Não informado");
  const motherDetails = mother ? `${SEX_LABELS[mother.sex]} · ${ORIGIN_LABELS[mother.origin] || mother.origin}` : (motherNote ? "(Externa)" : "");
  drawParentCard(margin + halfW + 4, y, halfW, cardH, "Mãe", motherName, motherDetails, pinkColor, pinkBg);

  y += cardH + 4;

  // Grandparents row
  const gpW = (contentW - 12) / 4;
  const gpH = 16;
  const gpData = [
    { label: "Avô Paterno", bird: paternalGF, color: blueColor, bg: blueBg },
    { label: "Avó Paterna", bird: paternalGM, color: pinkColor, bg: pinkBg },
    { label: "Avô Materno", bird: maternalGF, color: blueColor, bg: blueBg },
    { label: "Avó Materna", bird: maternalGM, color: pinkColor, bg: pinkBg },
  ];

  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...BRAND.muted);
  doc.text("Avós", margin, y + 3);
  y += 5;

  gpData.forEach((gp, i) => {
    const x = margin + i * (gpW + 4);
    const name = gp.bird ? (gp.bird.ringNumber || "?") : "—";
    const det = gp.bird ? (gp.bird.mutation || "") : "";
    drawParentCard(x, y, gpW, gpH, gp.label, name, det, gp.color, gp.bg);
  });

  y += gpH + 6;

  // === CONSANGUINITY CHECK ===
  const getAncestors = (birdId: number | null, depth: number): Set<number> => {
    const ancestors = new Set<number>();
    if (!birdId || depth === 0) return ancestors;
    const b = allBirds.find(x => x.id === birdId);
    if (!b) return ancestors;
    if (b.fatherId) { ancestors.add(b.fatherId); getAncestors(b.fatherId, depth - 1).forEach(a => ancestors.add(a)); }
    if (b.motherId) { ancestors.add(b.motherId); getAncestors(b.motherId, depth - 1).forEach(a => ancestors.add(a)); }
    return ancestors;
  };

  let consanguinityMsg = "";
  if (bird.fatherId && bird.motherId) {
    const fAncestors = getAncestors(bird.fatherId, 3);
    const mAncestors = getAncestors(bird.motherId, 3);
    if (fAncestors.has(bird.motherId) || mAncestors.has(bird.fatherId)) {
      consanguinityMsg = "ALERTA: Pai e Mãe possuem relação direta de parentesco.";
    } else {
      const shared: string[] = [];
      fAncestors.forEach(a => {
        if (mAncestors.has(a)) {
          const ab = allBirds.find(x => x.id === a);
          shared.push(ab ? (ab.ringNumber || ab.speciesName) : `#${a}`);
        }
      });
      if (shared.length > 0) {
        consanguinityMsg = `ALERTA: Ancestrais em comum: ${shared.join(", ")}`;
      }
    }
  }

  if (consanguinityMsg) {
    doc.setFillColor(254, 242, 242);
    doc.roundedRect(margin, y, contentW, 10, 1.5, 1.5, "F");
    doc.setDrawColor(220, 38, 38);
    doc.setLineWidth(0.4);
    doc.roundedRect(margin, y, contentW, 10, 1.5, 1.5, "S");
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(185, 28, 28);
    doc.text(consanguinityMsg, margin + 4, y + 6.5);
    y += 14;
  } else {
    // No consanguinity
    doc.setFillColor(240, 253, 244);
    doc.roundedRect(margin, y, contentW, 8, 1.5, 1.5, "F");
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(21, 128, 61);
    doc.text("Sem consanguinidade detectada (até 3 gerações)", margin + 4, y + 5.5);
    y += 12;
  }

  // === CHILDREN SECTION ===
  const children = allBirds.filter(b => b.fatherId === bird.id || b.motherId === bird.id);

  doc.setFontSize(PDF_FONT.sectionTitle);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...BRAND.dark);
  doc.text(`Filhos (${children.length})`, margin, y);
  y += 5;

  if (children.length === 0) {
    doc.setFontSize(8);
    doc.setFont("helvetica", "italic");
    doc.setTextColor(...BRAND.muted);
    doc.text("Nenhum filho registrado no plantel.", margin, y);
    y += 6;
  } else {
    // Table header
    doc.setFillColor(245, 250, 247);
    doc.rect(margin, y, contentW, 6, "F");
    doc.setFontSize(7);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...BRAND.dark);
    doc.text("Código", margin + 3, y + 4);
    doc.text("Mutação", margin + 35, y + 4);
    doc.text("Sexo", margin + 80, y + 4);
    doc.text("Nascimento", margin + 105, y + 4);
    doc.text("Status", margin + 140, y + 4);
    y += 7;

    children.forEach(child => {
      if (y > pageH - 25) {
        drawBrandFooter(doc, pageW, pageH, 1, 1);
        doc.addPage();
        y = drawBrandHeader(doc, pageW, logo, "Relatório de Linhagem", bird.speciesName);
      }
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...BRAND.text);
      doc.text(child.ringNumber || "—", margin + 3, y + 3);
      doc.text(child.mutation || "—", margin + 35, y + 3);
      doc.text(SEX_LABELS[child.sex] || child.sex, margin + 80, y + 3);
      doc.text(formatDate(child.birthDate, (child as any).birthDatePrecision), margin + 105, y + 3);
      doc.text(STATUS_LABELS[child.status] || child.status, margin + 140, y + 3);

      // Separator line
      doc.setDrawColor(...BRAND.gridLine);
      doc.setLineWidth(0.2);
      doc.line(margin, y + 5, margin + contentW, y + 5);
      y += 6;
    });
  }

  // === ORIGIN SECTION ===
  y += 4;
  if (y > pageH - 40) {
    drawBrandFooter(doc, pageW, pageH, 1, 1);
    doc.addPage();
    y = drawBrandHeader(doc, pageW, logo, "Relatório de Linhagem", bird.speciesName);
  }

  doc.setFontSize(PDF_FONT.sectionTitle);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...BRAND.dark);
  doc.text("Origem e Documentação", margin, y);
  y += 5;

  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...BRAND.text);
  doc.text(`Origem: ${ORIGIN_LABELS[bird.origin] || bird.origin}`, margin + 3, y + 3);
  y += 5;
  if (bird.originBreeder) {
    doc.text(`Criatório / Dono: ${bird.originBreeder}`, margin + 3, y + 3);
    y += 5;
  }
  if (bird.invoiceNumber) {
    doc.text(`Nota Fiscal: ${bird.invoiceNumber}`, margin + 3, y + 3);
    y += 5;
  }

  // Documents from notes
  try {
    const parsed = bird.notes ? JSON.parse(bird.notes) : null;
    if (parsed && parsed._docMeta) {
      const docs = parsed._docMeta.documents || [];
      if (docs.length > 0) {
        const docLabels: Record<string, string> = {
          nota_fiscal: "Nota Fiscal",
          certificado_origem: "Certificado de Origem",
          atestado_saude: "Atestado de Saúde",
          gta: "GTA",
          sexagem: "Sexagem",
          exame_sanidade: "Exame de Sanidade",
        };
        const docNames = docs.map((d: string) => docLabels[d] || d).join(", ");
        doc.text(`Documentos: ${docNames}`, margin + 3, y + 3);
        y += 5;
      }
      if (parsed._docMeta.otherDocuments) {
        doc.text(`Outros: ${parsed._docMeta.otherDocuments}`, margin + 3, y + 3);
        y += 5;
      }
    }
  } catch { /* plain text notes */ }

  // Footer
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    drawBrandFooter(doc, pageW, pageH, i, totalPages);
  }

  // Save
  const filename = `Linhagem_${bird.ringNumber || bird.speciesName}_${new Date().toISOString().split("T")[0]}.pdf`;
  doc.save(filename);
}
