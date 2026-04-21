/**
 * Generate a test diet PDF to inspect layout visually
 * Uses the same jsPDF library as the app
 */
import { jsPDF } from "jspdf";
import fs from "fs";

// Simulate the BRAND colors
const BRAND = {
  primary: [16, 185, 129],
  dark: [6, 78, 59],
  headerBg: [220, 245, 230],
  headerText: [6, 78, 59],
  headerAccent: [16, 185, 129],
  medium: [5, 150, 105],
  light: [209, 250, 229],
  bg: [240, 253, 244],
  text: [41, 37, 36],
  muted: [120, 113, 108],
  amber: [180, 83, 9],
  amberBg: [255, 251, 235],
  green: [21, 128, 61],
  greenBg: [240, 253, 244],
  red: [185, 28, 28],
  redBg: [254, 242, 242],
  yellow: [161, 98, 7],
  yellowBg: [254, 252, 232],
  blue: [29, 78, 216],
  blueBg: [239, 246, 255],
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

// Simulate diet data
const diet = {
  speciesName: "Papagaio Ecletus",
  weight: 400,
  birdCount: 9,
  mer: 123.7,
  totalGrams: 218,
  totalKcal: 123.7,
  color: "#10b981",
  racaoName: "Omega",
  phaseId: "maintenance",
  notes: "",
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

// Calculate salad totals
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
const cr = parseInt(diet.color.slice(1, 3), 16);
const cg = parseInt(diet.color.slice(3, 5), 16);
const cb = parseInt(diet.color.slice(5, 7), 16);
doc.setFillColor(cr, cg, cb);
doc.rect(margin, y, contentW, 4, "F");
doc.setFillColor(cr, cg, cb);
doc.rect(margin, y + 4, contentW, 7, "F");
doc.setGState(new doc.GState({ opacity: 0.2 }));
doc.setFillColor(255, 255, 255);
doc.rect(margin, y + 4, contentW, 7, "F");
doc.setGState(new doc.GState({ opacity: 1 }));
doc.setFontSize(8);
doc.setFont("helvetica", "bold");
doc.setTextColor(cr, cg, cb);
doc.text("COR DE REFERÊNCIA DO CALENDÁRIO", margin + 3, y + 9);
doc.setFillColor(cr, cg, cb);
doc.roundedRect(pageW - margin - 14, y + 5, 12, 5, 1, 1, "F");
y += 14;

// Diet name
y += 2;
doc.setFontSize(11);
doc.setFont("helvetica", "bold");
doc.setTextColor(...BRAND.text);
doc.text(phaseLabel, margin, y);
y += 5;
doc.setFontSize(10);
doc.setFont("helvetica", "bold");
doc.setTextColor(...BRAND.amber);
doc.text(`Ração: ${racao}`, margin, y);
y += 4.5;

// Info boxes
y += 2;
const boxW = contentW / 4;
const boxH = 12;
const infoBoxes = [
  { label: "Peso", value: `${diet.weight}g` },
  { label: "Aves", value: `${diet.birdCount}` },
  { label: "MER", value: `${diet.mer.toFixed(1)} kcal/dia` },
  { label: "Total/ave", value: `${fmtWeight(diet.totalGrams)} · ${diet.totalKcal.toFixed(1)} kcal` },
];
infoBoxes.forEach((box, i) => {
  const bx = margin + i * boxW;
  doc.setFillColor(...BRAND.bg);
  doc.roundedRect(bx + 1, y, boxW - 2, boxH, 1.5, 1.5, "F");
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...BRAND.muted);
  doc.text(box.label, bx + 3, y + 4);
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...BRAND.dark);
  doc.text(box.value, bx + 3, y + 9);
});
y += boxH + 4;

// RESUMO RÁPIDO boxes
const summaryBoxW = contentW / 2;
const summaryBoxH = 14;

// Ração box
doc.setFillColor(...BRAND.amberBg);
doc.roundedRect(margin, y, summaryBoxW - 2, summaryBoxH, 2, 2, "F");
doc.setDrawColor(...BRAND.amber);
doc.setLineWidth(0.5);
doc.roundedRect(margin, y, summaryBoxW - 2, summaryBoxH, 2, 2, "S");
doc.setFontSize(8);
doc.setFont("helvetica", "bold");
doc.setTextColor(...BRAND.amber);
doc.text("RAÇÃO (por ave)", margin + 3, y + 5);
doc.setFontSize(11);
doc.text(fmtWeight(racaoGrams), margin + 3, y + 11.5);
doc.setFontSize(7);
doc.setFont("helvetica", "normal");
doc.setTextColor(...BRAND.muted);
doc.text(`${racaoKcal.toFixed(1)} kcal`, margin + summaryBoxW - 20, y + 11.5);

// Salada box
const saladX = margin + summaryBoxW;
doc.setFillColor(...BRAND.greenBg);
doc.roundedRect(saladX, y, summaryBoxW - 2, summaryBoxH, 2, 2, "F");
doc.setDrawColor(...BRAND.green);
doc.setLineWidth(0.5);
doc.roundedRect(saladX, y, summaryBoxW - 2, summaryBoxH, 2, 2, "S");
doc.setFontSize(8);
doc.setFont("helvetica", "bold");
doc.setTextColor(...BRAND.green);
doc.text("SALADA (por ave)", saladX + 3, y + 5);
doc.setFontSize(7);
doc.setFont("helvetica", "normal");
doc.setTextColor(...BRAND.muted);
doc.text("Vegetais + Frutas + Proteicos", saladX + 3 + doc.getTextWidth("SALADA (por ave)") + 2, y + 5);
doc.setFontSize(11);
doc.setFont("helvetica", "bold");
doc.setTextColor(...BRAND.green);
doc.text(fmtWeight(saladGrams), saladX + 3, y + 11.5);
doc.setFontSize(7);
doc.setFont("helvetica", "normal");
doc.setTextColor(...BRAND.muted);
doc.text(`${saladKcal.toFixed(1)} kcal`, saladX + summaryBoxW - 20, y + 11.5);

y += summaryBoxH + 4;

// Total for all birds summary
const totalSummaryH = 10;
doc.setFillColor(245, 245, 245);
doc.roundedRect(margin, y, contentW, totalSummaryH, 2, 2, "F");
doc.setFontSize(7.5);
doc.setFont("helvetica", "bold");
doc.setTextColor(...BRAND.dark);
doc.text(`PARA ${diet.birdCount} AVES:`, margin + 3, y + 6.5);
doc.setTextColor(...BRAND.amber);
doc.text(`Ração: ${fmtWeight(racaoGrams * diet.birdCount)}`, margin + 40, y + 6.5);
doc.setTextColor(...BRAND.green);
doc.text(`Salada: ${fmtWeight(saladGrams * diet.birdCount)}`, margin + 85, y + 6.5);
doc.setTextColor(...BRAND.blue);
doc.text(`Total: ${fmtWeight(diet.totalGrams * diet.birdCount)}`, margin + 135, y + 6.5);
y += totalSummaryH + 2;

// Save
const buffer = doc.output("arraybuffer");
fs.writeFileSync("/home/ubuntu/test-diet-pdf.pdf", Buffer.from(buffer));
console.log("PDF saved to /home/ubuntu/test-diet-pdf.pdf");
