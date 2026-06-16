/**
 * PDF Checklist de Fiscalização — Criatório Minas Bird
 * Gera PDF imprimível com todos os documentos numerados,
 * status (OK/Vencido), e quadrado para marcar com caneta.
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

// Documentos obrigatórios para fiscalização IBAMA/IMA
const REQUIRED_DOCS = [
  { key: "processo de legalização", label: "Processo de Legalização do Criatório (SEI)", category: "Legalização / Licenças" },
  { key: "certificado de regularidade (cr)", label: "Certificado de Regularidade (CR) IBAMA", category: "IBAMA / SISPASS" },
  { key: "ctf/aida", label: "Certificado de Regularidade CTF/AIDA", category: "IBAMA / SISPASS" },
  { key: "comprovante de inscrição ctf", label: "Comprovante de Inscrição CTF IBAMA", category: "IBAMA / SISPASS" },
  { key: "autorização prévia ibama", label: "Autorização Prévia IBAMA (Criação Amadora)", category: "IBAMA / SISPASS" },
  { key: "alvará sanitário", label: "Alvará Sanitário (Vigilância Sanitária)", category: "Alvará / Prefeitura" },
  { key: "alvará de funcionamento", label: "Alvará de Funcionamento Municipal", category: "Alvará / Prefeitura" },
  { key: "uso e ocupação", label: "Certidão de Uso e Ocupação do Solo", category: "Alvará / Prefeitura" },
  { key: "cadastro no ima", label: "Cadastro no IMA - Ficha Sanitária Animal", category: "Cadastros / Registros" },
  { key: "declaração do médico veterinário", label: "Declaração do Médico Veterinário", category: "Responsabilidade Técnica" },
  { key: "art do biólogo", label: "ART do Biólogo Responsável Técnico", category: "Responsabilidade Técnica" },
  { key: "contrato de arrendamento", label: "Contrato de Arrendamento Rural", category: "Contratos" },
];

type DocStatus = "ok" | "vencido" | "pendente" | "a_vencer";

function getDocStatus(doc: any): DocStatus {
  if (!doc) return "pendente";
  if (doc.status === "vencido") return "vencido";
  if (doc.expirationDate) {
    const expDate = new Date(doc.expirationDate);
    const now = new Date();
    const daysLeft = Math.ceil((expDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (daysLeft < 0) return "vencido";
    if (daysLeft <= 30) return "a_vencer";
  }
  if (doc.status === "vigente" || doc.status === "em_andamento") return "ok";
  return "pendente";
}

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "—";
  return `${d.getDate().toString().padStart(2, "0")}/${(d.getMonth() + 1).toString().padStart(2, "0")}/${d.getFullYear()}`;
}

export async function generateChecklistPdf(documents: any[]) {
  const logo = await loadLogo();
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = PDF_MARGIN.portrait;
  const contentW = pageW - margin * 2;

  // Match documents to required list
  const checklistItems = REQUIRED_DOCS.map((req) => {
    const found = documents.find((d: any) =>
      d.title.toLowerCase().includes(req.key)
    );
    const status = getDocStatus(found);
    return {
      ...req,
      doc: found,
      status,
      expirationDate: found?.expirationDate || null,
      vigenciaDate: found?.vigenciaDate || null,
      documentDate: found?.documentDate || null,
    };
  });

  // Count statuses
  const okCount = checklistItems.filter((i) => i.status === "ok").length;
  const vencidoCount = checklistItems.filter((i) => i.status === "vencido" || i.status === "a_vencer").length;
  const pendenteCount = checklistItems.filter((i) => i.status === "pendente").length;

  // Header
  let y = drawBrandHeader(doc, pageW, logo, "Checklist de Fiscalização", "Criatório Minas Bird — Documentos Obrigatórios");

  // Summary box
  y += 2;
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin, y, contentW, 18, 2, 2, "FD");

  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...BRAND.text);
  doc.text("RESUMO:", margin + 4, y + 7);

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  
  // OK
  doc.setTextColor(...BRAND.green);
  doc.text(`${okCount} OK`, margin + 28, y + 7);
  
  // Vencido
  doc.setTextColor(...BRAND.red);
  doc.text(`${vencidoCount} VENCIDO${vencidoCount !== 1 ? "S" : ""}`, margin + 46, y + 7);
  
  // Pendente
  doc.setTextColor(...BRAND.muted);
  doc.text(`${pendenteCount} PENDENTE${pendenteCount !== 1 ? "S" : ""}`, margin + 82, y + 7);

  // Date
  const today = new Date();
  const todayStr = `${today.getDate().toString().padStart(2, "0")}/${(today.getMonth() + 1).toString().padStart(2, "0")}/${today.getFullYear()}`;
  doc.setTextColor(...BRAND.text);
  doc.setFont("helvetica", "bold");
  doc.text(`Data: ${todayStr}`, pageW - margin - 4, y + 7, { align: "right" });

  // Instruction
  doc.setFontSize(7);
  doc.setFont("helvetica", "italic");
  doc.setTextColor(...BRAND.muted);
  doc.text("Marque com X no quadrado quando a pendência for resolvida. Imprima e leve na fiscalização.", margin + 4, y + 14);

  y += 24;

  // Table header
  const colX = {
    checkbox: margin,
    num: margin + 8,
    doc: margin + 16,
    vencimento: pageW - margin - 70,
    status: pageW - margin - 30,
  };

  const drawTableHeader = () => {
    doc.setFillColor(241, 245, 249);
    doc.rect(margin, y, contentW, 8, "F");
    doc.setDrawColor(203, 213, 225);
    doc.line(margin, y + 8, margin + contentW, y + 8);

    doc.setFontSize(7);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...BRAND.muted);
    doc.text("✓", colX.checkbox + 3.5, y + 5.5, { align: "center" });
    doc.text("Nº", colX.num + 2, y + 5.5);
    doc.text("DOCUMENTO", colX.doc, y + 5.5);
    doc.text("VENCIMENTO", colX.vencimento, y + 5.5);
    doc.text("STATUS", colX.status, y + 5.5);
    y += 10;
  };

  drawTableHeader();

  // Table rows
  const rowH = 12;

  checklistItems.forEach((item, idx) => {
    // Check if we need a new page
    if (y + rowH > pageH - 20) {
      drawBrandFooter(doc, pageW, pageH);
      doc.addPage();
      y = drawBrandHeader(doc, pageW, logo, "Checklist de Fiscalização", "Criatório Minas Bird — Documentos Obrigatórios");
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

    // Checkbox square (for pen marking)
    const cbX = colX.checkbox + 1;
    const cbY = y + 2.5;
    const cbSize = 6;
    doc.setDrawColor(148, 163, 184);
    doc.setLineWidth(0.4);
    doc.rect(cbX, cbY, cbSize, cbSize);

    // If OK, draw a subtle checkmark inside
    if (item.status === "ok") {
      doc.setDrawColor(...BRAND.green);
      doc.setLineWidth(0.6);
      doc.line(cbX + 1.2, cbY + 3.2, cbX + 2.5, cbY + 4.8);
      doc.line(cbX + 2.5, cbY + 4.8, cbX + 5, cbY + 1.5);
    }

    // Number
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...BRAND.text);
    doc.text(`${(idx + 1).toString().padStart(2, "0")}`, colX.num + 2, y + 6);

    // Document name
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...BRAND.text);
    const docName = item.label;
    const maxDocWidth = colX.vencimento - colX.doc - 4;
    const truncatedName = doc.splitTextToSize(docName, maxDocWidth)[0];
    doc.text(truncatedName, colX.doc, y + 5.5);

    // Category (smaller, below)
    doc.setFontSize(6.5);
    doc.setTextColor(...BRAND.muted);
    doc.text(item.category, colX.doc, y + 9.5);

    // Vencimento date
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    if (item.status === "vencido" || item.status === "a_vencer") {
      doc.setTextColor(...BRAND.red);
    } else {
      doc.setTextColor(...BRAND.text);
    }
    doc.text(formatDate(item.expirationDate), colX.vencimento, y + 6);

    // Status label
    doc.setFontSize(7);
    doc.setFont("helvetica", "bold");
    let statusLabel = "";
    let statusColor: [number, number, number] = BRAND.muted;
    switch (item.status) {
      case "ok":
        statusLabel = "OK";
        statusColor = BRAND.green;
        break;
      case "vencido":
        statusLabel = "VENCIDO";
        statusColor = BRAND.red;
        break;
      case "a_vencer":
        statusLabel = "A VENCER";
        statusColor = BRAND.amber;
        break;
      case "pendente":
        statusLabel = "PENDENTE";
        statusColor = BRAND.muted;
        break;
    }
    doc.setTextColor(...statusColor);
    doc.text(statusLabel, colX.status, y + 6);

    y += rowH;
  });

  // Footer
  drawBrandFooter(doc, pageW, pageH, 1, 1);

  doc.save("checklist-fiscalizacao-minas-bird.pdf");
}

/**
 * PDF de Revisão — Checklist em branco (sem nenhum ticado)
 * Para o funcionário usar em campo para revisar todos os documentos
 */
export async function generateReviewChecklistPdf() {
  const logo = await loadLogo();
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = PDF_MARGIN.portrait;
  const contentW = pageW - margin * 2;

  // Header
  let y = drawBrandHeader(doc, pageW, logo, "Revisão de Documentos", "Criatório Minas Bird — Checklist de Revisão Completa");

  // Instruction box
  y += 2;
  doc.setFillColor(255, 251, 235);
  doc.setDrawColor(217, 169, 56);
  doc.setLineWidth(0.4);
  doc.roundedRect(margin, y, contentW, 14, 2, 2, "FD");

  const today = new Date();
  const todayStr = `${today.getDate().toString().padStart(2, "0")}/${(today.getMonth() + 1).toString().padStart(2, "0")}/${today.getFullYear()}`;

  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(146, 64, 14);
  doc.text(`Data: ${todayStr}`, margin + 4, y + 5.5);

  doc.setFontSize(7);
  doc.setFont("helvetica", "italic");
  doc.setTextColor(146, 64, 14);
  doc.text("Marque com X cada documento após conferir. Use este checklist para revisão periódica de toda documentação.", margin + 4, y + 10.5);

  y += 20;

  // Table header
  const colX = {
    checkbox: margin,
    num: margin + 8,
    doc: margin + 16,
    category: pageW - margin - 55,
  };

  const drawTableHeader = () => {
    doc.setFillColor(241, 245, 249);
    doc.rect(margin, y, contentW, 8, "F");
    doc.setDrawColor(203, 213, 225);
    doc.line(margin, y + 8, margin + contentW, y + 8);

    doc.setFontSize(7);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...BRAND.muted);
    doc.text("✓", colX.checkbox + 3.5, y + 5.5, { align: "center" });
    doc.text("Nº", colX.num + 2, y + 5.5);
    doc.text("DOCUMENTO", colX.doc, y + 5.5);
    doc.text("CATEGORIA", colX.category, y + 5.5);
    y += 10;
  };

  drawTableHeader();

  // Table rows — all blank (no status marked)
  const rowH = 12;

  REQUIRED_DOCS.forEach((item, idx) => {
    if (y + rowH > pageH - 20) {
      drawBrandFooter(doc, pageW, pageH);
      doc.addPage();
      y = drawBrandHeader(doc, pageW, logo, "Revisão de Documentos", "(continuação)");
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

    // Empty checkbox square (for pen marking)
    const cbX = colX.checkbox + 1;
    const cbY = y + 2.5;
    const cbSize = 6;
    doc.setDrawColor(148, 163, 184);
    doc.setLineWidth(0.4);
    doc.rect(cbX, cbY, cbSize, cbSize);

    // Number
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...BRAND.text);
    doc.text(`${(idx + 1).toString().padStart(2, "0")}`, colX.num + 2, y + 6);

    // Document name
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...BRAND.text);
    const maxDocWidth = colX.category - colX.doc - 4;
    const truncatedName = doc.splitTextToSize(item.label, maxDocWidth)[0];
    doc.text(truncatedName, colX.doc, y + 5.5);

    // Category
    doc.setFontSize(6.5);
    doc.setTextColor(...BRAND.muted);
    doc.text(item.category, colX.doc, y + 9.5);

    // Category column
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...BRAND.muted);
    const catMaxW = pageW - margin - colX.category - 2;
    const truncCat = doc.splitTextToSize(item.category, catMaxW)[0];
    doc.text(truncCat, colX.category, y + 6);

    y += rowH;
  });

  // Footer
  drawBrandFooter(doc, pageW, pageH, 1, 1);

  doc.save("revisao-documentos-minas-bird.pdf");
}
