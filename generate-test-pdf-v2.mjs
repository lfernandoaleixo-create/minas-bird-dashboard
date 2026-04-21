/**
 * Generate a complete test diet PDF v2 — with all aesthetic fixes
 */
import { jsPDF } from "jspdf";
import fs from "fs";

const BRAND = {
  primary: [16, 185, 129], dark: [6, 78, 59],
  headerBg: [220, 245, 230], headerText: [6, 78, 59],
  headerAccent: [16, 185, 129], medium: [5, 150, 105],
  light: [209, 250, 229], bg: [240, 253, 244],
  text: [41, 37, 36], muted: [120, 113, 108],
  amber: [180, 83, 9], amberBg: [255, 251, 235],
  green: [21, 128, 61], greenBg: [240, 253, 244],
  red: [185, 28, 28], redBg: [254, 242, 242],
  yellow: [161, 98, 7], yellowBg: [254, 252, 232],
  blue: [29, 78, 216], blueBg: [239, 246, 255],
};

const fmtWeight = (g) => {
  if (g >= 1000) return (g / 1000).toFixed(3).replace('.', ',') + " kg";
  return Math.round(g) + " g";
};

const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
const pageW = doc.internal.pageSize.getWidth();
const pageH = doc.internal.pageSize.getHeight();
const margin = 12;
const contentW = pageW - margin * 2;

const diet = {
  speciesName: "Papagaio Ecletus",
  weight: 400, birdCount: 9, mer: 123.7,
  totalGrams: 241, totalKcal: 205.6,
  color: "#10b981", racaoName: "Omega",
  notes: "Servir frutas picadas em cubos pequenos. Ovo cozido 2x por semana.",
  items: {
    racao: [{ foodName: "Omega", grams: 36, kcal: 123.7 }],
    vegetais: [
      { foodName: "Brócolis", grams: 45, kcal: 15.3 },
      { foodName: "Cenoura", grams: 35, kcal: 14.4 },
      { foodName: "Couve", grams: 30, kcal: 10.5 },
      { foodName: "Espinafre", grams: 25, kcal: 5.8 },
      { foodName: "Pimentão Vermelho", grams: 20, kcal: 6.2 },
    ],
    frutas: [
      { foodName: "Maçã (sem sementes)", grams: 25, kcal: 13.0 },
      { foodName: "Mamão Papaia", grams: 15, kcal: 6.5 },
      { foodName: "Banana", grams: 8, kcal: 7.1 },
    ],
    proteicos: [
      { foodName: "Ovo Cozido", grams: 2, kcal: 3.1 },
    ],
  },
};

const phaseLabel = "Manutenção";
const racao = diet.racaoName;

const saladGrams = diet.items.vegetais.reduce((s, i) => s + i.grams, 0)
  + diet.items.frutas.reduce((s, i) => s + i.grams, 0)
  + diet.items.proteicos.reduce((s, i) => s + i.grams, 0);
const saladKcal = diet.items.vegetais.reduce((s, i) => s + i.kcal, 0)
  + diet.items.frutas.reduce((s, i) => s + i.kcal, 0)
  + diet.items.proteicos.reduce((s, i) => s + i.kcal, 0);
const racaoGrams = diet.items.racao.reduce((s, i) => s + i.grams, 0);
const racaoKcal = diet.items.racao.reduce((s, i) => s + i.kcal, 0);

// ---- HEADER ----
const barH = 16;
doc.setFillColor(...BRAND.headerBg);
doc.rect(0, 0, pageW, barH, "F");
doc.setFontSize(14);
doc.setFont("helvetica", "bold");
doc.setTextColor(...BRAND.headerText);
doc.text(diet.speciesName, pageW / 2, barH * 0.42, { align: "center" });
doc.setFontSize(9);
doc.setFont("helvetica", "normal");
doc.setTextColor(...BRAND.medium);
doc.text(`${phaseLabel} · ${racao}`, pageW / 2, barH * 0.75, { align: "center" });
doc.setFillColor(...BRAND.headerAccent);
doc.rect(0, barH, pageW, 1.2, "F");

let y = barH + 1.2 + 4;

// Color stripe
const cr = 16, cg = 185, cb = 129;
doc.setFillColor(cr, cg, cb);
doc.rect(margin, y, contentW, 3.5, "F");
doc.setFillColor(cr, cg, cb);
doc.rect(margin, y + 3.5, contentW, 6.5, "F");
doc.setGState(new doc.GState({ opacity: 0.2 }));
doc.setFillColor(255, 255, 255);
doc.rect(margin, y + 3.5, contentW, 6.5, "F");
doc.setGState(new doc.GState({ opacity: 1 }));
doc.setFontSize(7.5);
doc.setFont("helvetica", "bold");
doc.setTextColor(cr, cg, cb);
doc.text("COR DE REFERÊNCIA DO CALENDÁRIO", margin + 3, y + 8);
doc.setFillColor(cr, cg, cb);
doc.roundedRect(pageW - margin - 12, y + 4.5, 10, 4, 1, 1, "F");
y += 12;

// Phase + Ração
y += 2;
doc.setFontSize(11);
doc.setFont("helvetica", "bold");
doc.setTextColor(...BRAND.text);
doc.text(phaseLabel, margin, y);
y += 5;
doc.setFontSize(9);
doc.setFont("helvetica", "bold");
doc.setTextColor(...BRAND.amber);
doc.text(`Ração: ${racao}`, margin, y);
y += 5;

// Info boxes
y += 1;
const boxW = contentW / 4;
const boxH = 12;
const infoBoxes = [
  { label: "Peso", value: `${diet.weight}g` },
  { label: "Aves", value: `${diet.birdCount}` },
  { label: "MER", value: `${diet.mer.toFixed(1)} kcal/dia` },
  { label: "Total/ave", value: `${fmtWeight(diet.totalGrams)}` },
];
infoBoxes.forEach((box, i) => {
  const bx = margin + i * boxW;
  doc.setFillColor(...BRAND.bg);
  doc.roundedRect(bx + 1, y, boxW - 2, boxH, 1.5, 1.5, "F");
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...BRAND.muted);
  doc.text(box.label, bx + 3, y + 4);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...BRAND.dark);
  doc.text(box.value, bx + 3, y + 9.5);
});
y += boxH + 5;

// Summary boxes — FIXED: proper gap, no text overlap
const summaryBoxW = (contentW - 4) / 2;
const summaryBoxH = 16;

// Ração box
doc.setFillColor(...BRAND.amberBg);
doc.roundedRect(margin, y, summaryBoxW, summaryBoxH, 2, 2, "F");
doc.setDrawColor(...BRAND.amber);
doc.setLineWidth(0.4);
doc.roundedRect(margin, y, summaryBoxW, summaryBoxH, 2, 2, "S");
doc.setFontSize(7.5);
doc.setFont("helvetica", "bold");
doc.setTextColor(...BRAND.amber);
doc.text("RAÇÃO (por ave)", margin + 3, y + 5);
doc.setFontSize(12);
doc.text(fmtWeight(racaoGrams), margin + 3, y + 12.5);
doc.setFontSize(7);
doc.setFont("helvetica", "normal");
doc.setTextColor(...BRAND.muted);
doc.text(`${racaoKcal.toFixed(1)} kcal`, margin + summaryBoxW - 3, y + 12.5, { align: "right" });

// Salada box — FIXED: subtitle right-aligned, no overlap
const saladX = margin + summaryBoxW + 4;
doc.setFillColor(...BRAND.greenBg);
doc.roundedRect(saladX, y, summaryBoxW, summaryBoxH, 2, 2, "F");
doc.setDrawColor(...BRAND.green);
doc.setLineWidth(0.4);
doc.roundedRect(saladX, y, summaryBoxW, summaryBoxH, 2, 2, "S");
doc.setFontSize(7.5);
doc.setFont("helvetica", "bold");
doc.setTextColor(...BRAND.green);
doc.text("SALADA (por ave)", saladX + 3, y + 5);
doc.setFontSize(6.5);
doc.setFont("helvetica", "normal");
doc.setTextColor(...BRAND.muted);
doc.text("Veg. + Frutas + Prot.", saladX + summaryBoxW - 3, y + 5, { align: "right" });
doc.setFontSize(12);
doc.setFont("helvetica", "bold");
doc.setTextColor(...BRAND.green);
doc.text(fmtWeight(saladGrams), saladX + 3, y + 12.5);
doc.setFontSize(7);
doc.setFont("helvetica", "normal");
doc.setTextColor(...BRAND.muted);
doc.text(`${saladKcal.toFixed(1)} kcal`, saladX + summaryBoxW - 3, y + 12.5, { align: "right" });
y += summaryBoxH + 4;

// Total for all birds bar — FIXED: right-aligned total
doc.setFillColor(242, 242, 242);
doc.roundedRect(margin, y, contentW, 9, 2, 2, "F");
doc.setDrawColor(210, 210, 210);
doc.setLineWidth(0.3);
doc.roundedRect(margin, y, contentW, 9, 2, 2, "S");
doc.setFontSize(7.5);
doc.setFont("helvetica", "bold");
doc.setTextColor(...BRAND.dark);
doc.text(`PARA ${diet.birdCount} AVES:`, margin + 3, y + 6);
doc.setTextColor(...BRAND.amber);
doc.text(`Ração: ${fmtWeight(racaoGrams * diet.birdCount)}`, margin + 45, y + 6);
doc.setTextColor(...BRAND.green);
doc.text(`Salada: ${fmtWeight(saladGrams * diet.birdCount)}`, margin + 95, y + 6);
doc.setTextColor(...BRAND.blue);
doc.text(`Total: ${fmtWeight(diet.totalGrams * diet.birdCount)}`, pageW - margin - 3, y + 6, { align: "right" });
y += 13;

// Notes
doc.setFillColor(...BRAND.amberBg);
doc.roundedRect(margin, y, contentW, 8, 1.5, 1.5, "F");
doc.setFontSize(7);
doc.setFont("helvetica", "bold");
doc.setTextColor(...BRAND.amber);
doc.text(`Observações: ${diet.notes}`, margin + 3, y + 5);
y += 12;

// Separator
doc.setDrawColor(200, 200, 200);
doc.setLineWidth(0.2);
doc.line(margin, y, pageW - margin, y);
y += 5;

// Section title
doc.setFontSize(9);
doc.setFont("helvetica", "bold");
doc.setTextColor(...BRAND.text);
doc.text("COMPOSIÇÃO DA DIETA (por ave / dia)", margin, y);
y += 6;

const drawSection = (title, items, bgColor, textColor) => {
  if (!items || items.length === 0) return;
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...textColor);
  doc.text(title, margin, y);
  y += 4.5;
  items.forEach(item => {
    doc.setFillColor(...bgColor);
    doc.roundedRect(margin, y - 2.5, contentW, 5.5, 1, 1, "F");
    doc.setFontSize(7.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...BRAND.text);
    doc.text(item.foodName, margin + 2, y + 0.5);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...textColor);
    doc.text(`${fmtWeight(item.grams)}  (${item.kcal.toFixed(1)} kcal)`, pageW - margin - 2, y + 0.5, { align: "right" });
    y += 6.5;
  });
  y += 3;
};

drawSection("RAÇÃO / ALIMENTO FORMULADO", diet.items.racao, BRAND.amberBg, BRAND.amber);
drawSection("VEGETAIS / HORTALIÇAS", diet.items.vegetais, BRAND.greenBg, BRAND.green);
drawSection("FRUTAS", diet.items.frutas, BRAND.redBg, BRAND.red);
drawSection("SEMENTES E PROTEICOS", diet.items.proteicos, BRAND.yellowBg, BRAND.yellow);

// Subtotal Salada — NO emoji
doc.setFillColor(220, 245, 230);
doc.roundedRect(margin, y, contentW, 8, 1.5, 1.5, "F");
doc.setDrawColor(...BRAND.green);
doc.setLineWidth(0.4);
doc.roundedRect(margin, y, contentW, 8, 1.5, 1.5, "S");
doc.setFontSize(8);
doc.setFont("helvetica", "bold");
doc.setTextColor(...BRAND.green);
doc.text("Subtotal SALADA (Vegetais + Frutas + Proteicos)", margin + 3, y + 5.5);
doc.text(`${fmtWeight(saladGrams)}  |  ${saladKcal.toFixed(1)} kcal`, pageW - margin - 3, y + 5.5, { align: "right" });
y += 12;

// Total por ave
doc.setFillColor(...BRAND.light);
doc.roundedRect(margin, y, contentW, 8, 1.5, 1.5, "F");
doc.setFontSize(8);
doc.setFont("helvetica", "bold");
doc.setTextColor(...BRAND.dark);
doc.text("TOTAL POR AVE", margin + 3, y + 5.5);
doc.text(`${fmtWeight(diet.totalGrams)}  |  ${diet.totalKcal.toFixed(1)} kcal`, pageW - margin - 3, y + 5.5, { align: "right" });
y += 12;

// Footer
const fy = pageH - 7;
doc.setDrawColor(...BRAND.medium);
doc.setLineWidth(0.3);
doc.line(margin, fy - 2.5, pageW - margin, fy - 2.5);
doc.setFontSize(7);
doc.setFont("helvetica", "normal");
doc.setTextColor(...BRAND.muted);
doc.text("Publicado em 21/04/2026", margin, fy);
doc.setFont("helvetica", "bold");
doc.setFontSize(8);
doc.setTextColor(...BRAND.dark);
doc.text("Criatório Minas Bird — Ribeirão Vermelho, MG", pageW / 2, fy, { align: "center" });

const buffer = doc.output("arraybuffer");
fs.writeFileSync("/home/ubuntu/test-diet-pdf-v2.pdf", Buffer.from(buffer));
console.log("PDF v2 saved to /home/ubuntu/test-diet-pdf-v2.pdf");
