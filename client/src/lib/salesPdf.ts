/**
 * Relatório de Vendas em PDF — Criatório Minas Bird
 * Resumo de vendas por período com clientes, aves vendidas, valores e parcelas.
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

interface SaleData {
  id: number;
  clientName: string;
  species: string;
  mutation: string | null;
  quantity: number;
  valueCents: number | null;
  paymentMethod: string | null;
  saleDate: string | Date;
  saleStatus: string | null;
  installmentsCount: number;
  parcelasPagas: number;
  parcelasPendentes: number;
  parcelasAtrasadas: number;
  totalPago: number;
  totalPendente: number;
}

function formatCurrency(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function getPaymentLabel(method: string | null): string {
  const map: Record<string, string> = {
    pix: "PIX",
    dinheiro: "Dinheiro",
    cartao_debito: "Cartão Débito",
    cartao_credito: "Cartão Crédito",
    boleto: "Boleto",
    transferencia: "Transferência",
    parcelado_informal: "Parcelado Informal",
  };
  return method ? map[method] || method : "N/I";
}

export async function generateSalesPdf(
  sales: SaleData[],
  periodLabel: string,
): Promise<void> {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = PDF_MARGIN.portrait;
  const contentW = pageW - margin * 2;

  const logoBase64 = await loadLogo();

  // Calculate totals
  let totalVendas = 0;
  let totalRecebido = 0;
  let totalPendente = 0;
  let totalAtrasado = 0;
  let avesVendidas = 0;

  for (const s of sales) {
    totalVendas += s.valueCents || 0;
    totalRecebido += s.totalPago;
    totalPendente += s.totalPendente;
    if (s.parcelasAtrasadas > 0) totalAtrasado += s.totalPendente;
    avesVendidas += s.quantity;
  }

  let pageNum = 1;

  // ===== PAGE 1: Overview =====
  let y = drawBrandHeader(doc, pageW, logoBase64, "Relatório de Vendas", periodLabel);

  // Summary box
  y += 2;
  doc.setFillColor(245, 247, 250);
  doc.roundedRect(margin, y, contentW, 28, 2, 2, "F");

  // Total vendas
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...BRAND.text);
  doc.text("TOTAL EM VENDAS", margin + 4, y + 6);
  doc.setFontSize(16);
  doc.setTextColor(...BRAND.green);
  doc.text(formatCurrency(totalVendas), margin + 4, y + 14);

  // Recebido / Pendente
  const col2x = margin + contentW * 0.4;
  const col3x = margin + contentW * 0.7;

  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...BRAND.muted);
  doc.text("RECEBIDO", col2x, y + 6);
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...BRAND.green);
  doc.text(formatCurrency(totalRecebido), col2x, y + 14);

  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...BRAND.muted);
  doc.text("PENDENTE", col3x, y + 6);
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  if (totalPendente > 0) {
    doc.setTextColor(...BRAND.amber);
  } else {
    doc.setTextColor(...BRAND.muted);
  }
  doc.text(formatCurrency(totalPendente), col3x, y + 14);

  // Info line
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...BRAND.muted);
  doc.text(`${sales.length} venda(s) · ${avesVendidas} ave(s) vendida(s)`, margin + 4, y + 24);
  doc.text(`Gerado em ${new Date().toLocaleDateString("pt-BR")}`, col3x, y + 24);

  y += 34;

  // ===== Sales Table =====
  doc.setFontSize(PDF_FONT.sectionTitle);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...BRAND.dark);
  doc.text("Detalhamento de Vendas", margin, y);
  y += 5;

  // Table header
  const colWidths = [
    contentW * 0.11, // Data
    contentW * 0.22, // Cliente
    contentW * 0.22, // Ave
    contentW * 0.14, // Pagamento
    contentW * 0.15, // Valor
    contentW * 0.16, // Status
  ];
  doc.setFillColor(...BRAND.headerBg);
  doc.rect(margin, y, contentW, 5.5, "F");
  doc.setFontSize(6.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...BRAND.dark);
  let tx = margin + 1.5;
  doc.text("Data", tx, y + 3.8); tx += colWidths[0];
  doc.text("Cliente", tx, y + 3.8); tx += colWidths[1];
  doc.text("Ave", tx, y + 3.8); tx += colWidths[2];
  doc.text("Pagamento", tx, y + 3.8); tx += colWidths[3];
  doc.text("Valor", tx, y + 3.8); tx += colWidths[4];
  doc.text("Status", tx, y + 3.8);
  y += 6.5;

  // Sort by date descending
  const sorted = [...sales].sort(
    (a, b) => new Date(b.saleDate).getTime() - new Date(a.saleDate).getTime()
  );

  for (let i = 0; i < sorted.length; i++) {
    if (y > pageH - 20) {
      drawBrandFooter(doc, pageW, pageH, pageNum, 0);
      doc.addPage();
      pageNum++;
      y = drawBrandHeader(doc, pageW, logoBase64, "Relatório de Vendas (cont.)", periodLabel);
      y += 2;
      // Repeat table header
      doc.setFillColor(...BRAND.headerBg);
      doc.rect(margin, y, contentW, 5.5, "F");
      doc.setFontSize(6.5);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...BRAND.dark);
      tx = margin + 1.5;
      doc.text("Data", tx, y + 3.8); tx += colWidths[0];
      doc.text("Cliente", tx, y + 3.8); tx += colWidths[1];
      doc.text("Ave", tx, y + 3.8); tx += colWidths[2];
      doc.text("Pagamento", tx, y + 3.8); tx += colWidths[3];
      doc.text("Valor", tx, y + 3.8); tx += colWidths[4];
      doc.text("Status", tx, y + 3.8);
      y += 6.5;
    }

    const s = sorted[i];

    if (i % 2 === 0) {
      doc.setFillColor(252, 252, 252);
      doc.rect(margin, y - 3, contentW, 5.5, "F");
    }

    doc.setFontSize(6.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...BRAND.text);

    tx = margin + 1.5;
    // Date
    doc.text(new Date(s.saleDate).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit" }), tx, y);
    tx += colWidths[0];

    // Client
    const clientText = s.clientName.length > 18 ? s.clientName.substring(0, 16) + "..." : s.clientName;
    doc.text(clientText, tx, y);
    tx += colWidths[1];

    // Ave
    const aveText = `${s.quantity}x ${s.species}${s.mutation ? ` (${s.mutation})` : ""}`;
    const aveTrunc = aveText.length > 18 ? aveText.substring(0, 16) + "..." : aveText;
    doc.text(aveTrunc, tx, y);
    tx += colWidths[2];

    // Payment
    const payLabel = getPaymentLabel(s.paymentMethod);
    const payTrunc = payLabel.length > 12 ? payLabel.substring(0, 10) + "..." : payLabel;
    doc.text(payTrunc, tx, y);
    tx += colWidths[3];

    // Value
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...BRAND.green);
    doc.text(s.valueCents ? formatCurrency(s.valueCents) : "N/I", tx, y);
    tx += colWidths[4];

    // Status
    doc.setFont("helvetica", "normal");
    if (s.parcelasAtrasadas > 0) {
      doc.setTextColor(...BRAND.red);
      doc.text("Atrasado", tx, y);
    } else if (s.saleStatus === "concluida") {
      doc.setTextColor(...BRAND.green);
      doc.text("Concluída", tx, y);
    } else if (s.saleStatus === "em_andamento") {
      doc.setTextColor(...BRAND.amber);
      doc.text("Em Andamento", tx, y);
    } else {
      doc.setTextColor(...BRAND.muted);
      doc.text(s.saleStatus || "—", tx, y);
    }

    y += 5.5;
  }

  // Draw footers on all pages
  const totalPages = pageNum;
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    drawBrandFooter(doc, pageW, pageH, p, totalPages);
  }

  // Save
  const now = new Date();
  const filename = `relatorio-vendas_${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}.pdf`;
  doc.save(filename);
}
