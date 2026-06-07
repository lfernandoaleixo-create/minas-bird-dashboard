/**
 * Relatório Financeiro em PDF — Criatório Minas Bird
 * Resumo mensal com entradas, saídas, saldo e detalhamento por categoria.
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

interface Transaction {
  id: number;
  type: string;
  category: string;
  description: string | null;
  valueCents: number;
  transactionDate: string | Date;
  paymentMethod: string | null;
  reference: string | null;
  notes: string | null;
  createdAt: string | Date;
}

function formatCurrency(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function getMonthLabel(date: Date): string {
  return date.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
}

interface MonthSummary {
  key: string;
  label: string;
  entradas: number;
  saidas: number;
  saldo: number;
  transactions: Transaction[];
}

function buildMonthlySummaries(transactions: Transaction[]): MonthSummary[] {
  const map = new Map<string, MonthSummary>();

  for (const t of transactions) {
    const d = new Date(t.transactionDate);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    if (!map.has(key)) {
      map.set(key, {
        key,
        label: getMonthLabel(d),
        entradas: 0,
        saidas: 0,
        saldo: 0,
        transactions: [],
      });
    }
    const m = map.get(key)!;
    if (t.type === "aporte" || t.type === "venda") {
      m.entradas += t.valueCents;
    } else {
      m.saidas += t.valueCents;
    }
    m.transactions.push(t);
  }

  // Calculate saldo
  const values = Array.from(map.values());
  for (const m of values) {
    m.saldo = m.entradas - m.saidas;
  }

  // Sort by key descending (most recent first)
  return Array.from(map.values()).sort((a, b) => b.key.localeCompare(a.key));
}

interface CategorySummary {
  category: string;
  total: number;
  count: number;
}

function buildCategorySummary(transactions: Transaction[], type: "entrada" | "saida"): CategorySummary[] {
  const map = new Map<string, CategorySummary>();
  for (const t of transactions) {
    const isEntry = t.type === "aporte" || t.type === "venda";
    if (type === "entrada" && !isEntry) continue;
    if (type === "saida" && isEntry) continue;
    if (!map.has(t.category)) {
      map.set(t.category, { category: t.category, total: 0, count: 0 });
    }
    const c = map.get(t.category)!;
    c.total += t.valueCents;
    c.count++;
  }
  return Array.from(map.values()).sort((a, b) => b.total - a.total);
}

export async function generateFinancialPdf(transactions: Transaction[]): Promise<void> {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = PDF_MARGIN.portrait;
  const contentW = pageW - margin * 2;

  const logoBase64 = await loadLogo();

  // Total stats
  let totalEntradas = 0;
  let totalSaidas = 0;
  for (const t of transactions) {
    if (t.type === "aporte" || t.type === "venda") {
      totalEntradas += t.valueCents;
    } else {
      totalSaidas += t.valueCents;
    }
  }
  const totalSaldo = totalEntradas - totalSaidas;

  // Monthly summaries
  const months = buildMonthlySummaries(transactions);
  const categoryEntradas = buildCategorySummary(transactions, "entrada");
  const categorySaidas = buildCategorySummary(transactions, "saida");

  let pageNum = 1;
  const pages: number[] = [];

  // ===== PAGE 1: Overview =====
  let y = drawBrandHeader(doc, pageW, logoBase64, "Relatório Financeiro", "Criatório Minas Bird");

  // Summary box
  y += 2;
  doc.setFillColor(245, 247, 250);
  doc.roundedRect(margin, y, contentW, 28, 2, 2, "F");

  // Saldo total
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...BRAND.text);
  doc.text("SALDO TOTAL", margin + 4, y + 6);
  doc.setFontSize(16);
  doc.setTextColor(totalSaldo >= 0 ? 5 : 185, totalSaldo >= 0 ? 150 : 28, totalSaldo >= 0 ? 105 : 28);
  doc.text(formatCurrency(totalSaldo), margin + 4, y + 14);

  // Entradas / Saídas
  const col2x = margin + contentW * 0.45;
  const col3x = margin + contentW * 0.72;

  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...BRAND.muted);
  doc.text("ENTRADAS", col2x, y + 6);
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...BRAND.green);
  doc.text(formatCurrency(totalEntradas), col2x, y + 14);

  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...BRAND.muted);
  doc.text("SAÍDAS", col3x, y + 6);
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...BRAND.red);
  doc.text(formatCurrency(totalSaidas), col3x, y + 14);

  // Period info
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...BRAND.muted);
  doc.text(`${transactions.length} lançamentos · ${months.length} meses`, margin + 4, y + 24);
  doc.text(`Gerado em ${new Date().toLocaleDateString("pt-BR")}`, col3x, y + 24);

  y += 34;

  // ===== Monthly table =====
  doc.setFontSize(PDF_FONT.sectionTitle);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...BRAND.dark);
  doc.text("Resumo Mensal", margin, y);
  y += 5;

  // Table header
  const colWidths = [contentW * 0.35, contentW * 0.2, contentW * 0.2, contentW * 0.25];
  doc.setFillColor(...BRAND.headerBg);
  doc.rect(margin, y, contentW, 6, "F");
  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...BRAND.dark);
  doc.text("Mês", margin + 2, y + 4);
  doc.text("Entradas", margin + colWidths[0] + 2, y + 4);
  doc.text("Saídas", margin + colWidths[0] + colWidths[1] + 2, y + 4);
  doc.text("Resultado", margin + colWidths[0] + colWidths[1] + colWidths[2] + 2, y + 4);
  y += 7;

  // Table rows
  for (let i = 0; i < months.length && y < pageH - 30; i++) {
    const m = months[i];
    if (i % 2 === 0) {
      doc.setFillColor(250, 250, 250);
      doc.rect(margin, y - 3, contentW, 5.5, "F");
    }
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...BRAND.text);
    doc.text(m.label.charAt(0).toUpperCase() + m.label.slice(1), margin + 2, y);
    doc.setTextColor(...BRAND.green);
    doc.text(formatCurrency(m.entradas), margin + colWidths[0] + 2, y);
    doc.setTextColor(...BRAND.red);
    doc.text(formatCurrency(m.saidas), margin + colWidths[0] + colWidths[1] + 2, y);
    doc.setTextColor(m.saldo >= 0 ? 5 : 185, m.saldo >= 0 ? 150 : 28, m.saldo >= 0 ? 105 : 28);
    doc.setFont("helvetica", "bold");
    doc.text(formatCurrency(m.saldo), margin + colWidths[0] + colWidths[1] + colWidths[2] + 2, y);
    y += 5.5;
  }

  y += 6;

  // ===== Category breakdown =====
  if (y < pageH - 60) {
    // Entradas by category
    doc.setFontSize(PDF_FONT.sectionTitle);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...BRAND.dark);
    doc.text("Entradas por Categoria", margin, y);
    y += 5;

    for (const cat of categoryEntradas) {
      if (y > pageH - 25) break;
      const pct = totalEntradas > 0 ? ((cat.total / totalEntradas) * 100).toFixed(1) : "0";
      doc.setFontSize(7);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...BRAND.text);
      doc.text(`${cat.category} (${cat.count}x)`, margin + 2, y);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...BRAND.green);
      doc.text(`${formatCurrency(cat.total)}  (${pct}%)`, margin + contentW * 0.55, y);
      // Progress bar
      const barW = contentW * 0.2;
      const barX = margin + contentW * 0.78;
      doc.setFillColor(229, 231, 235);
      doc.rect(barX, y - 2.5, barW, 3, "F");
      doc.setFillColor(...BRAND.primary);
      doc.rect(barX, y - 2.5, barW * (cat.total / totalEntradas), 3, "F");
      y += 5;
    }

    y += 4;

    // Saídas by category
    if (y < pageH - 30) {
      doc.setFontSize(PDF_FONT.sectionTitle);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...BRAND.dark);
      doc.text("Saídas por Categoria", margin, y);
      y += 5;

      for (const cat of categorySaidas) {
        if (y > pageH - 25) break;
        const pct = totalSaidas > 0 ? ((cat.total / totalSaidas) * 100).toFixed(1) : "0";
        doc.setFontSize(7);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(...BRAND.text);
        doc.text(`${cat.category} (${cat.count}x)`, margin + 2, y);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(...BRAND.red);
        doc.text(`${formatCurrency(cat.total)}  (${pct}%)`, margin + contentW * 0.55, y);
        // Progress bar
        const barW = contentW * 0.2;
        const barX = margin + contentW * 0.78;
        doc.setFillColor(229, 231, 235);
        doc.rect(barX, y - 2.5, barW, 3, "F");
        doc.setFillColor(...BRAND.red);
        doc.rect(barX, y - 2.5, barW * (cat.total / totalSaidas), 3, "F");
        y += 5;
      }
    }
  }

  pages.push(pageNum);

  // ===== PAGE 2+: Detailed monthly transactions =====
  for (const month of months) {
    doc.addPage();
    pageNum++;
    pages.push(pageNum);

    y = drawBrandHeader(doc, pageW, logoBase64, month.label.charAt(0).toUpperCase() + month.label.slice(1), `${month.transactions.length} lançamentos`);

    // Month summary bar
    y += 1;
    doc.setFillColor(245, 247, 250);
    doc.roundedRect(margin, y, contentW, 10, 2, 2, "F");
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...BRAND.green);
    doc.text(`Entradas: ${formatCurrency(month.entradas)}`, margin + 4, y + 6.5);
    doc.setTextColor(...BRAND.red);
    doc.text(`Saídas: ${formatCurrency(month.saidas)}`, margin + contentW * 0.35, y + 6.5);
    doc.setTextColor(month.saldo >= 0 ? 5 : 185, month.saldo >= 0 ? 150 : 28, month.saldo >= 0 ? 105 : 28);
    doc.text(`Resultado: ${formatCurrency(month.saldo)}`, margin + contentW * 0.65, y + 6.5);
    y += 14;

    // Transaction table header
    const tColW = [contentW * 0.12, contentW * 0.12, contentW * 0.28, contentW * 0.28, contentW * 0.20];
    doc.setFillColor(...BRAND.headerBg);
    doc.rect(margin, y, contentW, 5.5, "F");
    doc.setFontSize(6.5);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...BRAND.dark);
    let tx = margin + 1.5;
    doc.text("Data", tx, y + 3.8); tx += tColW[0];
    doc.text("Tipo", tx, y + 3.8); tx += tColW[1];
    doc.text("Categoria", tx, y + 3.8); tx += tColW[2];
    doc.text("Descrição", tx, y + 3.8); tx += tColW[3];
    doc.text("Valor", tx, y + 3.8);
    y += 6.5;

    // Sort transactions by date
    const sorted = [...month.transactions].sort(
      (a, b) => new Date(a.transactionDate).getTime() - new Date(b.transactionDate).getTime()
    );

    for (let i = 0; i < sorted.length; i++) {
      if (y > pageH - 20) {
        // New page
        drawBrandFooter(doc, pageW, pageH, pageNum, 0);
        doc.addPage();
        pageNum++;
        pages.push(pageNum);
        y = drawBrandHeader(doc, pageW, logoBase64, month.label.charAt(0).toUpperCase() + month.label.slice(1) + " (cont.)", "");
        y += 2;
      }

      const t = sorted[i];
      const isEntry = t.type === "aporte" || t.type === "venda";

      if (i % 2 === 0) {
        doc.setFillColor(252, 252, 252);
        doc.rect(margin, y - 3, contentW, 5, "F");
      }

      doc.setFontSize(6.5);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...BRAND.text);

      tx = margin + 1.5;
      doc.text(new Date(t.transactionDate).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }), tx, y);
      tx += tColW[0];

      // Type with color
      const typeLabel = t.type === "aporte" ? "Aporte" : t.type === "venda" ? "Venda" : "Despesa";
      doc.setTextColor(isEntry ? 5 : 185, isEntry ? 150 : 28, isEntry ? 105 : 28);
      doc.text(typeLabel, tx, y);
      tx += tColW[1];

      doc.setTextColor(...BRAND.text);
      const catText = t.category.length > 22 ? t.category.substring(0, 20) + "..." : t.category;
      doc.text(catText, tx, y);
      tx += tColW[2];

      const descText = (t.description || "—").length > 24 ? (t.description || "—").substring(0, 22) + "..." : (t.description || "—");
      doc.text(descText, tx, y);
      tx += tColW[3];

      doc.setFont("helvetica", "bold");
      doc.setTextColor(isEntry ? 5 : 185, isEntry ? 150 : 28, isEntry ? 105 : 28);
      doc.text(`${isEntry ? "+" : "−"} ${formatCurrency(t.valueCents)}`, tx, y);

      y += 5;
    }
  }

  // Draw footers on all pages
  const totalPages = pageNum;
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    drawBrandFooter(doc, pageW, pageH, p, totalPages);
  }

  // Save
  const now = new Date();
  const filename = `relatorio-financeiro_${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}.pdf`;
  doc.save(filename);
}
