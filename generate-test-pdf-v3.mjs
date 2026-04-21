import { jsPDF } from "jspdf";
import fs from "fs";

// Simulate BRAND colors
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

function fmtWeight(g) {
  if (g >= 1000) return (g / 1000).toFixed(3).replace(".", ",") + " kg";
  return Math.round(g) + " g";
}

const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
const pageW = doc.internal.pageSize.getWidth();
const pageH = doc.internal.pageSize.getHeight();
const margin = 12;
const contentW = pageW - margin * 2;

// Simulate diet data
const diet = {
  speciesName: "Papagaio Ecletus",
  weight: 400,
  birdCount: 3,
  mer: 123.7,
  totalGrams: 217.5,
  totalKcal: 123.7,
  color: "#10b981",
  notes: "Servir frutas picadas em cubos pequenos. Ração deve ser ofertada pela manhã.",
  items: {
    racao: [
      { foodName: "Omega Power - Papagaio", grams: 36, kcal: 42.1 },
    ],
    vegetais: [
      { foodName: "Brócolis", grams: 25, kcal: 8.5 },
      { foodName: "Cenoura", grams: 20, kcal: 8.2 },
      { foodName: "Couve", grams: 15, kcal: 5.3 },
    ],
    frutas: [
      { foodName: "Maçã", grams: 40, kcal: 20.8 },
      { foodName: "Banana", grams: 30, kcal: 26.7 },
      { foodName: "Mamão", grams: 25, kcal: 9.8 },
    ],
    proteicos: [
      { foodName: "Ovo Cozido", grams: 15, kcal: 23.3 },
      { foodName: "Semente de Girassol", grams: 11.5, kcal: 7.0 },
    ],
  },
};

const phaseLabel = "Adulto";
const racao = "Omega Power";
const hasMultipleBirds = diet.birdCount > 1;

// Calculate totals
const racaoGrams = diet.items.racao.reduce((s, i) => s + i.grams, 0);
const racaoKcal = diet.items.racao.reduce((s, i) => s + i.kcal, 0);
const saladGrams = diet.items.vegetais.reduce((s, i) => s + i.grams, 0)
  + diet.items.frutas.reduce((s, i) => s + i.grams, 0)
  + diet.items.proteicos.reduce((s, i) => s + i.grams, 0);
const saladKcal = diet.items.vegetais.reduce((s, i) => s + i.kcal, 0)
  + diet.items.frutas.reduce((s, i) => s + i.kcal, 0)
  + diet.items.proteicos.reduce((s, i) => s + i.kcal, 0);

const totalItems = [
  ...diet.items.racao,
  ...diet.items.vegetais,
  ...diet.items.frutas,
  ...diet.items.proteicos,
].length;

// Adaptive sizing
const fixedBase = 97;
const fixedMultiBird = hasMultipleBirds ? 38 : 0;
const fixedNotes = diet.notes ? 9 : 0;
const activeSections = [
  diet.items.racao.length > 0,
  diet.items.vegetais.length > 0,
  diet.items.frutas.length > 0,
  diet.items.proteicos.length > 0,
].filter(Boolean).length;
const sectionOverhead = activeSections * 7;
const sectionOverheadTotal = sectionOverhead * (hasMultipleBirds ? 2 : 1);
const fixedSpace = fixedBase + fixedMultiBird + fixedNotes + sectionOverheadTotal;
const availableForRows = pageH - fixedSpace;
const itemSets = hasMultipleBirds ? 2 : 1;
const totalRows = totalItems * itemSets;
const rawItemH = totalRows > 0 ? availableForRows / totalRows : 6;
const itemH = Math.max(4.5, Math.min(6, rawItemH));
const baseFontSize = itemH >= 5.5 ? 7.5 : itemH >= 5 ? 7 : 6.5;
const sectionGap = itemH >= 5.5 ? 3 : 2;
const sectionHeaderH = 5;

console.log(`Items: ${totalItems}, Sets: ${itemSets}, Rows: ${totalRows}`);
console.log(`Available: ${availableForRows}mm, rawItemH: ${rawItemH.toFixed(1)}mm, itemH: ${itemH}mm`);
console.log(`fontSize: ${baseFontSize}, sectionGap: ${sectionGap}`);

// HEADER
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

// INFO LINE: Color square + label + phase
const cr = 16, cg = 185, cb = 129;
doc.setFillColor(cr, cg, cb);
doc.roundedRect(margin, y - 2.5, 5, 5, 1, 1, "F");
doc.setDrawColor(180, 180, 180);
doc.setLineWidth(0.2);
doc.roundedRect(margin, y - 2.5, 5, 5, 1, 1, "S");
doc.setFontSize(8);
doc.setFont("helvetica", "bold");
doc.setTextColor(cr, cg, cb);
doc.text("Cor da Dieta", margin + 7, y + 0.5);
doc.setFontSize(8);
doc.setFont("helvetica", "normal");
doc.setTextColor(...BRAND.muted);
doc.text(`${phaseLabel}  |  Racao: ${racao}`, pageW - margin, y + 0.5, { align: "right" });
y += 7;

// INFO BOXES
const boxW = contentW / 4;
const boxH = 11;
const infoBoxes = [
  { label: "Peso", value: `${diet.weight}g` },
  { label: "Aves", value: `${diet.birdCount}` },
  { label: "MER", value: `${diet.mer.toFixed(1)} kcal` },
  { label: "Total/ave", value: fmtWeight(diet.totalGrams) },
];
infoBoxes.forEach((box, i) => {
  const bx = margin + i * boxW;
  doc.setFillColor(...BRAND.bg);
  doc.roundedRect(bx + 0.5, y, boxW - 1, boxH, 1.5, 1.5, "F");
  doc.setFontSize(6.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...BRAND.muted);
  doc.text(box.label, bx + boxW / 2, y + 3.5, { align: "center" });
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...BRAND.dark);
  doc.text(box.value, bx + boxW / 2, y + 9, { align: "center" });
});
y += boxH + 3;

// SUMMARY BOXES
const summaryBoxW = (contentW - 4) / 2;
const summaryBoxH = 14;

doc.setFillColor(...BRAND.amberBg);
doc.roundedRect(margin, y, summaryBoxW, summaryBoxH, 2, 2, "F");
doc.setDrawColor(...BRAND.amber);
doc.setLineWidth(0.3);
doc.roundedRect(margin, y, summaryBoxW, summaryBoxH, 2, 2, "S");
doc.setFontSize(7.5);
doc.setFont("helvetica", "bold");
doc.setTextColor(...BRAND.amber);
doc.text("RACAO (por ave)", margin + 3, y + 5);
doc.setFontSize(12);
doc.text(fmtWeight(racaoGrams), margin + 3, y + 11.5);
doc.setFontSize(7);
doc.setFont("helvetica", "normal");
doc.setTextColor(...BRAND.muted);
doc.text(`${racaoKcal.toFixed(1)} kcal`, margin + summaryBoxW - 3, y + 11.5, { align: "right" });

const saladX = margin + summaryBoxW + 4;
doc.setFillColor(...BRAND.greenBg);
doc.roundedRect(saladX, y, summaryBoxW, summaryBoxH, 2, 2, "F");
doc.setDrawColor(...BRAND.green);
doc.setLineWidth(0.3);
doc.roundedRect(saladX, y, summaryBoxW, summaryBoxH, 2, 2, "S");
doc.setFontSize(7.5);
doc.setFont("helvetica", "bold");
doc.setTextColor(...BRAND.green);
doc.text("SALADA (por ave)", saladX + 3, y + 5);
doc.setFontSize(6.5);
doc.setFont("helvetica", "normal");
doc.setTextColor(...BRAND.muted);
doc.text("Veg + Frutas + Prot", saladX + summaryBoxW - 3, y + 5, { align: "right" });
doc.setFontSize(12);
doc.setFont("helvetica", "bold");
doc.setTextColor(...BRAND.green);
doc.text(fmtWeight(saladGrams), saladX + 3, y + 11.5);
doc.setFontSize(7);
doc.setFont("helvetica", "normal");
doc.setTextColor(...BRAND.muted);
doc.text(`${saladKcal.toFixed(1)} kcal`, saladX + summaryBoxW - 3, y + 11.5, { align: "right" });
y += summaryBoxH + 3;

// MULTI-BIRD BAR
if (hasMultipleBirds) {
  doc.setFillColor(245, 245, 245);
  doc.roundedRect(margin, y, contentW, 8, 1.5, 1.5, "F");
  doc.setDrawColor(215, 215, 215);
  doc.setLineWidth(0.2);
  doc.roundedRect(margin, y, contentW, 8, 1.5, 1.5, "S");
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...BRAND.dark);
  doc.text(`PARA ${diet.birdCount} AVES:`, margin + 3, y + 5.5);
  doc.setTextColor(...BRAND.amber);
  doc.text(`Racao: ${fmtWeight(racaoGrams * diet.birdCount)}`, margin + 40, y + 5.5);
  doc.setTextColor(...BRAND.green);
  doc.text(`Salada: ${fmtWeight(saladGrams * diet.birdCount)}`, margin + 85, y + 5.5);
  doc.setTextColor(...BRAND.blue);
  doc.text(`Total: ${fmtWeight(diet.totalGrams * diet.birdCount)}`, pageW - margin - 3, y + 5.5, { align: "right" });
  y += 11;
}

// NOTES
if (diet.notes) {
  doc.setFillColor(...BRAND.amberBg);
  doc.roundedRect(margin, y, contentW, 7, 1.5, 1.5, "F");
  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...BRAND.amber);
  doc.text(`Obs: ${diet.notes}`, margin + 3, y + 4.5);
  y += 9;
}

// COMPOSIÇÃO separator
doc.setDrawColor(210, 210, 210);
doc.setLineWidth(0.2);
doc.line(margin, y, pageW - margin, y);
y += 4;
doc.setFontSize(8.5);
doc.setFont("helvetica", "bold");
doc.setTextColor(...BRAND.text);
doc.text("COMPOSICAO DA DIETA (por ave / dia)", margin, y);
y += sectionHeaderH;

// Draw food sections
function drawFoodSection(title, items, bgColor, textColor, multiplier = 1) {
  if (!items || items.length === 0) return;
  doc.setFontSize(baseFontSize);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...textColor);
  doc.text(title, margin + 1, y);
  y += sectionHeaderH - 1;
  items.forEach(item => {
    const rowTop = y - itemH * 0.4;
    doc.setFillColor(...bgColor);
    doc.roundedRect(margin, rowTop, contentW, itemH - 0.5, 1, 1, "F");
    doc.setFontSize(baseFontSize);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...BRAND.text);
    doc.text(item.foodName, margin + 3, y + itemH * 0.05);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...textColor);
    const g = item.grams * multiplier;
    const k = item.kcal * multiplier;
    doc.text(`${fmtWeight(g)}  (${k.toFixed(1)} kcal)`, pageW - margin - 3, y + itemH * 0.05, { align: "right" });
    y += itemH;
  });
  y += sectionGap;
}

drawFoodSection("RACAO / ALIMENTO FORMULADO", diet.items.racao, BRAND.amberBg, BRAND.amber);
drawFoodSection("VEGETAIS / HORTALICAS", diet.items.vegetais, BRAND.greenBg, BRAND.green);
drawFoodSection("FRUTAS", diet.items.frutas, BRAND.redBg, BRAND.red);
drawFoodSection("SEMENTES E PROTEICOS", diet.items.proteicos, BRAND.yellowBg, BRAND.yellow);

// Subtotal Salada
doc.setFillColor(220, 245, 230);
doc.roundedRect(margin, y, contentW, 7.5, 1.5, 1.5, "F");
doc.setDrawColor(...BRAND.green);
doc.setLineWidth(0.3);
doc.roundedRect(margin, y, contentW, 7.5, 1.5, 1.5, "S");
doc.setFontSize(7.5);
doc.setFont("helvetica", "bold");
doc.setTextColor(...BRAND.green);
doc.text("Subtotal SALADA (Veg + Frutas + Prot)", margin + 3, y + 5);
doc.text(`${fmtWeight(saladGrams)}  |  ${saladKcal.toFixed(1)} kcal`, pageW - margin - 3, y + 5, { align: "right" });
y += 9;

// Total por ave
doc.setFillColor(...BRAND.light);
doc.roundedRect(margin, y, contentW, 7.5, 1.5, 1.5, "F");
doc.setFontSize(7.5);
doc.setFont("helvetica", "bold");
doc.setTextColor(...BRAND.dark);
doc.text("TOTAL POR AVE", margin + 3, y + 5);
doc.text(`${fmtWeight(diet.totalGrams)}  |  ${diet.totalKcal.toFixed(1)} kcal`, pageW - margin - 3, y + 5, { align: "right" });
y += 10;

// TOTAL PARA X AVES (detalhado)
if (hasMultipleBirds) {
  doc.setDrawColor(210, 210, 210);
  doc.setLineWidth(0.2);
  doc.line(margin, y, pageW - margin, y);
  y += 4;
  doc.setFontSize(8.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...BRAND.text);
  doc.text(`TOTAL PARA ${diet.birdCount} AVES (diario)`, margin, y);
  y += sectionHeaderH;

  drawFoodSection("RACAO", diet.items.racao, BRAND.amberBg, BRAND.amber, diet.birdCount);
  drawFoodSection("VEGETAIS", diet.items.vegetais, BRAND.greenBg, BRAND.green, diet.birdCount);
  drawFoodSection("FRUTAS", diet.items.frutas, BRAND.redBg, BRAND.red, diet.birdCount);
  drawFoodSection("PROTEICOS", diet.items.proteicos, BRAND.yellowBg, BRAND.yellow, diet.birdCount);

  // Subtotal Salada for all birds
  doc.setFillColor(220, 245, 230);
  doc.roundedRect(margin, y, contentW, 7.5, 1.5, 1.5, "F");
  doc.setDrawColor(...BRAND.green);
  doc.setLineWidth(0.3);
  doc.roundedRect(margin, y, contentW, 7.5, 1.5, 1.5, "S");
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...BRAND.green);
  doc.text(`Subtotal SALADA (${diet.birdCount} aves)`, margin + 3, y + 5);
  doc.text(`${fmtWeight(saladGrams * diet.birdCount)}  |  ${(saladKcal * diet.birdCount).toFixed(1)} kcal`, pageW - margin - 3, y + 5, { align: "right" });
  y += 9;

  // Grand total
  doc.setFillColor(...BRAND.blueBg);
  doc.roundedRect(margin, y, contentW, 7.5, 1.5, 1.5, "F");
  doc.setDrawColor(...BRAND.blue);
  doc.setLineWidth(0.3);
  doc.roundedRect(margin, y, contentW, 7.5, 1.5, 1.5, "S");
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...BRAND.blue);
  doc.text(`TOTAL PARA ${diet.birdCount} AVES`, margin + 3, y + 5);
  doc.text(
    `${fmtWeight(diet.totalGrams * diet.birdCount)}  |  ${(diet.totalKcal * diet.birdCount).toFixed(1)} kcal`,
    pageW - margin - 3, y + 5, { align: "right" }
  );
  y += 9;
}

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

console.log(`Final Y position: ${y.toFixed(1)}mm (page height: ${pageH}mm)`);
console.log(`Space remaining before footer: ${(fy - 2.5 - y).toFixed(1)}mm`);

const buf = Buffer.from(doc.output("arraybuffer"));
fs.writeFileSync("/home/ubuntu/test-diet-pdf-v3.pdf", buf);
console.log("PDF saved to /home/ubuntu/test-diet-pdf-v3.pdf");
