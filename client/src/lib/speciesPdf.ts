/**
 * Gera PDF de uma espécie do plantel — lista de aves com informações do resumo
 * Suporta filtros e colunas adicionais (NF, Origem, Nascimento)
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

export interface BirdRow {
  ringNumber: string | null;
  sex: string;
  anilha: string | null;
  enclosure: string | null;
  mutation: string | null;
  status: string;
  invoiceNumber?: string | null;
  origin?: string | null;
  originBreeder?: string | null;
  birthDate?: string | null;
  birthDatePrecision?: string | null;
  speciesName?: string | null;
}

export interface PdfFilters {
  sex?: string;         // "todos" | "macho" | "femea" | "indefinido"
  status?: string;      // "todos" | "ativo" | "obito"
  nf?: string;          // "todos" | "com_nf" | "sem_nf"
  enclosure?: string;   // "todos" | specific enclosure
  mutation?: string;    // "todos" | specific mutation
  origin?: string;      // "todos" | specific origin
}

export interface SpeciesPdfData {
  speciesName: string;
  prefix: string;
  birds: BirdRow[];
  filters?: PdfFilters;
  columns?: string[];   // which columns to include
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

const ORIGIN_MAP: Record<string, string> = {
  nascido_criadouro: "Nascido aqui",
  comprado: "Comprado",
  doado: "Doado",
  troca: "Troca",
};

function formatBirthDate(date: string | null | undefined, precision: string | null | undefined): string {
  if (!date) return "—";
  const d = new Date(date);
  if (precision === "year_only") {
    return String(d.getUTCFullYear());
  }
  const day = String(d.getUTCDate()).padStart(2, "0");
  const month = String(d.getUTCMonth() + 1).padStart(2, "0");
  const year = d.getUTCFullYear();
  return `${day}/${month}/${year}`;
}

function applyFilters(birds: BirdRow[], filters?: PdfFilters): BirdRow[] {
  if (!filters) return birds;
  return birds.filter(b => {
    if (filters.sex && filters.sex !== "todos" && b.sex !== filters.sex) return false;
    if (filters.status && filters.status !== "todos" && b.status !== filters.status) return false;
    if (filters.nf === "com_nf" && !b.invoiceNumber) return false;
    if (filters.nf === "sem_nf" && b.invoiceNumber) return false;
    if (filters.enclosure && filters.enclosure !== "todos" && b.enclosure !== filters.enclosure) return false;
    if (filters.mutation && filters.mutation !== "todos" && b.mutation !== filters.mutation) return false;
    if (filters.origin && filters.origin !== "todos" && b.origin !== filters.origin) return false;
    return true;
  });
}

function buildFilterSummary(filters?: PdfFilters): string {
  if (!filters) return "";
  const parts: string[] = [];
  if (filters.sex && filters.sex !== "todos") parts.push(`Sexo: ${SEX_MAP[filters.sex] || filters.sex}`);
  if (filters.status && filters.status !== "todos") parts.push(`Status: ${STATUS_MAP[filters.status] || filters.status}`);
  if (filters.nf === "com_nf") parts.push("Com NF");
  if (filters.nf === "sem_nf") parts.push("Sem NF");
  if (filters.enclosure && filters.enclosure !== "todos") parts.push(`Gaiola: ${filters.enclosure}`);
  if (filters.mutation && filters.mutation !== "todos") parts.push(`Mutação: ${filters.mutation}`);
  if (filters.origin && filters.origin !== "todos") parts.push(`Origem: ${ORIGIN_MAP[filters.origin] || filters.origin}`);
  return parts.length > 0 ? `Filtros: ${parts.join(" · ")}` : "";
}

// Default columns
const DEFAULT_COLUMNS = ["codigo", "sexo", "anilha", "gaiola", "mutacao", "status"];

interface ColDef {
  key: string;
  label: string;
  width: number;
  align?: "left" | "right";
}

function getColumnDefs(columns: string[], usableW: number): ColDef[] {
  const allCols: Record<string, { label: string; baseWidth: number; align?: "left" | "right" }> = {
    especie: { label: "Esp\u00e9cie", baseWidth: 36 },
    codigo: { label: "C\u00f3digo", baseWidth: 18 },
    sexo: { label: "Sexo", baseWidth: 16 },
    anilha: { label: "Anilha", baseWidth: 40 },
    gaiola: { label: "Gaiola", baseWidth: 16 },
    mutacao: { label: "Muta\u00e7\u00e3o", baseWidth: 44 },
    status: { label: "Status", baseWidth: 18, align: "right" },
    nf: { label: "NF", baseWidth: 30 },
    origem: { label: "Origem", baseWidth: 24 },
    nascimento: { label: "Nasc.", baseWidth: 22 },
  };

  const selected = columns.filter(c => allCols[c]).map(c => ({
    key: c,
    label: allCols[c].label,
    width: allCols[c].baseWidth,
    align: allCols[c].align,
  }));

  // Distribute remaining space proportionally
  const totalBase = selected.reduce((s, c) => s + c.width, 0);
  const scale = usableW / totalBase;
  return selected.map(c => ({ ...c, width: Math.floor(c.width * scale) }));
}

function getCellValue(bird: BirdRow, colKey: string): string {
  switch (colKey) {
    case "especie": return bird.speciesName || "—";
    case "codigo": return bird.ringNumber || "—";
    case "sexo": return SEX_MAP[bird.sex] || bird.sex;
    case "anilha": return bird.anilha || "—";
    case "gaiola": return bird.enclosure || "—";
    case "mutacao": return bird.mutation || "—";
    case "status": return STATUS_MAP[bird.status] || bird.status;
    case "nf": return bird.invoiceNumber || "—";
    case "origem": return ORIGIN_MAP[bird.origin || ""] || bird.origin || "—";
    case "nascimento": return formatBirthDate(bird.birthDate, bird.birthDatePrecision);
    default: return "—";
  }
}

export async function generateSpeciesPdf(data: SpeciesPdfData): Promise<void> {
  const logo = await loadLogo();
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = PDF_MARGIN.portrait;

  // Apply filters
  const filteredBirds = applyFilters(data.birds, data.filters);
  const columns = data.columns && data.columns.length > 0 ? data.columns : DEFAULT_COLUMNS;

  const activeCount = filteredBirds.filter(b => b.status === "ativo").length;
  const obitoCount = filteredBirds.filter(b => b.status === "obito").length;

  const filterSummary = buildFilterSummary(data.filters);
  const subtitle = `Prefixo: ${data.prefix} · ${activeCount} ativa${activeCount !== 1 ? "s" : ""}${obitoCount > 0 ? ` · ${obitoCount} óbito${obitoCount !== 1 ? "s" : ""}` : ""} · ${filteredBirds.length} total`;

  let y = drawBrandHeader(
    doc,
    pageW,
    logo,
    `Plantel — ${data.speciesName}`,
    subtitle,
  );

  // Draw filter summary as a highlighted box below the header
  if (filterSummary) {
    const filterBoxX = margin;
    const filterBoxW = pageW - margin * 2;
    const filterBoxH = 9;
    // Amber/yellow background for visibility
    doc.setFillColor(255, 251, 235);
    doc.setDrawColor(217, 169, 56);
    doc.setLineWidth(0.4);
    doc.roundedRect(filterBoxX, y, filterBoxW, filterBoxH, 1.5, 1.5, "FD");
    // Filter text — bold, larger, dark amber
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(146, 64, 14);
    doc.text(filterSummary, pageW / 2, y + filterBoxH * 0.62, { align: "center", maxWidth: filterBoxW - 8 });
    y += filterBoxH + 3;
  }

  // Table columns
  const usableW = pageW - margin * 2;
  const colDefs = getColumnDefs(columns, usableW);

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
      if (col.align === "right") {
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

  for (let i = 0; i < filteredBirds.length; i++) {
    // Check page break
    if (y + rowH > pageH - 18) {
      drawBrandFooter(doc, pageW, pageH, doc.getNumberOfPages(), 0);
      doc.addPage();
      y = drawBrandHeader(doc, pageW, logo, `Plantel — ${data.speciesName}`, "(continuação)");
      y = drawTableHeader(y);
    }

    const bird = filteredBirds[i];

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

    for (let j = 0; j < colDefs.length; j++) {
      const col = colDefs[j];
      const value = getCellValue(bird, col.key);

      // Style based on column
      if (col.key === "codigo") {
        doc.setFont("helvetica", "bold");
        doc.setTextColor(...BRAND.dark);
      } else if (col.key === "status") {
        if (bird.status === "ativo") {
          doc.setTextColor(...BRAND.green);
        } else if (bird.status === "obito") {
          doc.setTextColor(...BRAND.muted);
        } else {
          doc.setTextColor(...BRAND.text);
        }
        doc.setFont("helvetica", "bold");
      } else {
        doc.setFont("helvetica", "normal");
        doc.setTextColor(...BRAND.text);
      }

      // Truncate if too wide
      const maxW = col.width - 3;
      let displayText = value;
      if (doc.getTextWidth(displayText) > maxW) {
        while (doc.getTextWidth(displayText + "…") > maxW && displayText.length > 1) {
          displayText = displayText.slice(0, -1);
        }
        displayText += "…";
      }

      if (col.align === "right") {
        doc.text(displayText, pageW - margin - 2, textY, { align: "right" });
      } else {
        doc.text(displayText, cx, textY);
      }
      cx += col.width;
    }

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


// ===== MULTI-SPECIES PDF (all species in one document) =====

export interface MultiSpeciesPdfData {
  speciesGroups: {
    speciesId: string;
    speciesName: string;
    prefix: string;
    birds: BirdRow[];
  }[];
  filters?: PdfFilters;
  columns?: string[];
}

export async function generateAllSpeciesPdf(data: MultiSpeciesPdfData): Promise<void> {
  const logo = await loadLogo();
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = PDF_MARGIN.portrait;

  const columns = data.columns && data.columns.length > 0 ? data.columns : [...DEFAULT_COLUMNS];
  // Ensure "especie" column is included for multi-species
  if (!columns.includes("especie")) {
    columns.unshift("especie");
  }

  const filterSummary = buildFilterSummary(data.filters);

  // Collect all filtered birds across all species
  let allBirds: BirdRow[] = [];
  for (const group of data.speciesGroups) {
    const filtered = applyFilters(group.birds, data.filters);
    allBirds = allBirds.concat(filtered);
  }

  const activeCount = allBirds.filter(b => b.status === "ativo").length;
  const obitoCount = allBirds.filter(b => b.status === "obito").length;
  const speciesCount = data.speciesGroups.length;

  const subtitle = `${speciesCount} espécie${speciesCount !== 1 ? "s" : ""} · ${activeCount} ativa${activeCount !== 1 ? "s" : ""}${obitoCount > 0 ? ` · ${obitoCount} óbito${obitoCount !== 1 ? "s" : ""}` : ""} · ${allBirds.length} total`;

  let y = drawBrandHeader(doc, pageW, logo, "Plantel Completo — Todas as Espécies", subtitle);

  // Draw filter summary
  if (filterSummary) {
    const filterBoxX = margin;
    const filterBoxW = pageW - margin * 2;
    const filterBoxH = 9;
    doc.setFillColor(255, 251, 235);
    doc.setDrawColor(217, 169, 56);
    doc.setLineWidth(0.4);
    doc.roundedRect(filterBoxX, y, filterBoxW, filterBoxH, 1.5, 1.5, "FD");
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(146, 64, 14);
    doc.text(filterSummary, pageW / 2, y + filterBoxH * 0.62, { align: "center", maxWidth: filterBoxW - 8 });
    y += filterBoxH + 3;
  }

  // Table columns
  const usableW = pageW - margin * 2;
  const colDefs = getColumnDefs(columns, usableW);

  const tableX = margin;
  const rowH = 7;
  const headerH = 8;

  function drawTableHeader(startY: number): number {
    doc.setFillColor(...BRAND.headerBg);
    doc.rect(tableX, startY, pageW - margin * 2, headerH, "F");
    doc.setFontSize(PDF_FONT.body);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...BRAND.dark);

    let cx = tableX + 2;
    for (let i = 0; i < colDefs.length; i++) {
      const col = colDefs[i];
      if (col.align === "right") {
        doc.text(col.label, pageW - margin - 2, startY + headerH * 0.65, { align: "right" });
      } else {
        doc.text(col.label, cx, startY + headerH * 0.65);
      }
      cx += col.width;
    }
    return startY + headerH;
  }

  y = drawTableHeader(y);

  // Iterate species groups, adding a separator between species
  let rowIndex = 0;
  for (let g = 0; g < data.speciesGroups.length; g++) {
    const group = data.speciesGroups[g];
    const filteredBirds = applyFilters(group.birds, data.filters);
    if (filteredBirds.length === 0) continue;

    // Species separator row
    if (g > 0) {
      if (y + rowH + 4 > pageH - 18) {
        drawBrandFooter(doc, pageW, pageH, doc.getNumberOfPages(), 0);
        doc.addPage();
        y = drawBrandHeader(doc, pageW, logo, "Plantel Completo — Todas as Espécies", "(continuação)");
        y = drawTableHeader(y);
      }
      // Separator line
      y += 2;
      doc.setDrawColor(...BRAND.green);
      doc.setLineWidth(0.6);
      doc.line(tableX, y, pageW - margin, y);
      y += 2;
    }

    // Species sub-header
    if (y + rowH > pageH - 18) {
      drawBrandFooter(doc, pageW, pageH, doc.getNumberOfPages(), 0);
      doc.addPage();
      y = drawBrandHeader(doc, pageW, logo, "Plantel Completo — Todas as Espécies", "(continuação)");
      y = drawTableHeader(y);
    }
    doc.setFillColor(236, 253, 245); // emerald-50
    doc.rect(tableX, y, pageW - margin * 2, rowH, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(...BRAND.green);
    const groupActiveCount = filteredBirds.filter(b => b.status === "ativo").length;
    doc.text(`${group.speciesName} (${group.prefix}) — ${groupActiveCount} ativa${groupActiveCount !== 1 ? "s" : ""}, ${filteredBirds.length} total`, tableX + 3, y + rowH * 0.65);
    y += rowH;

    // Bird rows
    doc.setFont("helvetica", "normal");
    doc.setFontSize(PDF_FONT.body);

    for (let i = 0; i < filteredBirds.length; i++) {
      if (y + rowH > pageH - 18) {
        drawBrandFooter(doc, pageW, pageH, doc.getNumberOfPages(), 0);
        doc.addPage();
        y = drawBrandHeader(doc, pageW, logo, "Plantel Completo — Todas as Espécies", "(continuação)");
        y = drawTableHeader(y);
      }

      const bird = filteredBirds[i];

      // Alternating row bg
      if (rowIndex % 2 === 0) {
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

      for (let j = 0; j < colDefs.length; j++) {
        const col = colDefs[j];
        const value = getCellValue(bird, col.key);

        if (col.key === "codigo") {
          doc.setFont("helvetica", "bold");
          doc.setTextColor(...BRAND.dark);
        } else if (col.key === "status") {
          if (bird.status === "ativo") {
            doc.setTextColor(...BRAND.green);
          } else if (bird.status === "obito") {
            doc.setTextColor(...BRAND.muted);
          } else {
            doc.setTextColor(...BRAND.text);
          }
          doc.setFont("helvetica", "bold");
        } else {
          doc.setFont("helvetica", "normal");
          doc.setTextColor(...BRAND.text);
        }

        const maxW = col.width - 3;
        let displayText = value;
        if (doc.getTextWidth(displayText) > maxW) {
          while (doc.getTextWidth(displayText + "…") > maxW && displayText.length > 1) {
            displayText = displayText.slice(0, -1);
          }
          displayText += "…";
        }

        if (col.align === "right") {
          doc.text(displayText, pageW - margin - 2, textY, { align: "right" });
        } else {
          doc.text(displayText, cx, textY);
        }
        cx += col.width;
      }

      y += rowH;
      rowIndex++;
    }
  }

  // Footer on all pages
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    drawBrandFooter(doc, pageW, pageH, p, totalPages);
  }

  doc.save("plantel-completo-todas-especies.pdf");
}
