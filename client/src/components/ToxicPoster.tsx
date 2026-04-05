/**
 * ToxicPoster — Cartaz imprimível de alimentos tóxicos e proibidos
 * Para fixar na cozinha/área de preparo do criatório
 * Gerado com jsPDF para impressão A4
 */
import { useState } from "react";
import { jsPDF } from "jspdf";
import { toxicFoods, type ToxicFood } from "@/data/feeding";
import { Printer, AlertTriangle, Skull, AlertCircle, Ban, FileDown } from "lucide-react";
import { cn } from "@/lib/utils";

const LOGO_URL = "https://d2xsxph8kpxj0f.cloudfront.net/310519663426530649/GUVCZBcaMUVxbcauwK97Fr/logo-minas-bird-ybwqpfxhb7cjvhh7g5qm7g.webp";

export default function ToxicPoster() {
  const [generating, setGenerating] = useState(false);

  const fatal = toxicFoods.filter(f => f.severity === "Fatal");
  const grave = toxicFoods.filter(f => f.severity === "Grave");
  const inadequado = toxicFoods.filter(f => f.severity === "Inadequado");

  const generatePDF = async () => {
    setGenerating(true);
    try {
      const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const W = 210;
      const margin = 12;
      const contentW = W - margin * 2;
      let y = 10;

      // === HEADER com fundo vermelho ===
      doc.setFillColor(185, 28, 28); // red-700
      doc.rect(0, 0, W, 42, "F");

      // Skull icon (text-based)
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(28);
      doc.setFont("helvetica", "bold");
      doc.text("☠", margin, 22);

      // Title
      doc.setFontSize(22);
      doc.text("ALIMENTOS PROIBIDOS", margin + 14, 18);
      doc.setFontSize(12);
      doc.setFont("helvetica", "normal");
      doc.text("NUNCA oferecer às aves — Risco de morte ou dano grave", margin + 14, 27);

      // Criatório name
      doc.setFontSize(9);
      doc.text("Criatório Minas Bird — Manual Operacional", margin + 14, 35);
      doc.text(`Gerado em ${new Date().toLocaleDateString("pt-BR")}`, W - margin - 50, 35);

      y = 50;

      // === SEÇÃO FATAL ===
      doc.setFillColor(127, 29, 29); // red-900
      doc.rect(margin, y, contentW, 8, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.text(`☠  FATAIS — RISCO DE MORTE (${fatal.length} itens)`, margin + 3, y + 5.5);
      y += 11;

      doc.setFontSize(9);
      fatal.forEach((food, i) => {
        const isEven = i % 2 === 0;
        if (isEven) {
          doc.setFillColor(254, 226, 226); // red-100
          doc.rect(margin, y - 3.5, contentW, 12, "F");
        }

        doc.setTextColor(127, 29, 29);
        doc.setFont("helvetica", "bold");
        doc.text(`✕  ${food.name}`, margin + 3, y);

        doc.setTextColor(80, 80, 80);
        doc.setFont("helvetica", "normal");
        doc.text(`Substância: ${food.substance}`, margin + 6, y + 4.5);
        doc.text(`Efeito: ${food.effect}`, margin + 6, y + 8.5);

        y += 13;
      });

      y += 4;

      // === SEÇÃO GRAVE ===
      doc.setFillColor(194, 65, 12); // orange-700
      doc.rect(margin, y, contentW, 8, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.text(`⚠  GRAVES — RISCO SIGNIFICATIVO (${grave.length} itens)`, margin + 3, y + 5.5);
      y += 11;

      doc.setFontSize(9);
      grave.forEach((food, i) => {
        const isEven = i % 2 === 0;
        if (isEven) {
          doc.setFillColor(255, 237, 213); // orange-100
          doc.rect(margin, y - 3.5, contentW, 12, "F");
        }

        doc.setTextColor(154, 52, 18);
        doc.setFont("helvetica", "bold");
        doc.text(`⚠  ${food.name}`, margin + 3, y);

        doc.setTextColor(80, 80, 80);
        doc.setFont("helvetica", "normal");
        doc.text(`Substância: ${food.substance}`, margin + 6, y + 4.5);
        doc.text(`Efeito: ${food.effect}`, margin + 6, y + 8.5);

        y += 13;
      });

      y += 4;

      // === SEÇÃO INADEQUADO ===
      doc.setFillColor(161, 98, 7); // yellow-700
      doc.rect(margin, y, contentW, 8, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.text(`⊘  INADEQUADOS — EVITAR (${inadequado.length} itens)`, margin + 3, y + 5.5);
      y += 11;

      doc.setFontSize(9);
      inadequado.forEach((food, i) => {
        const isEven = i % 2 === 0;
        if (isEven) {
          doc.setFillColor(254, 249, 195); // yellow-100
          doc.rect(margin, y - 3.5, contentW, 12, "F");
        }

        doc.setTextColor(133, 77, 14);
        doc.setFont("helvetica", "bold");
        doc.text(`⊘  ${food.name}`, margin + 3, y);

        doc.setTextColor(80, 80, 80);
        doc.setFont("helvetica", "normal");
        doc.text(`Substância: ${food.substance}`, margin + 6, y + 4.5);
        doc.text(`Efeito: ${food.effect}`, margin + 6, y + 8.5);

        y += 13;
      });

      // === FOOTER ===
      y = Math.max(y + 5, 270);
      doc.setDrawColor(185, 28, 28);
      doc.setLineWidth(0.5);
      doc.line(margin, y, W - margin, y);
      y += 5;

      doc.setFillColor(254, 226, 226);
      doc.roundedRect(margin, y, contentW, 14, 2, 2, "F");
      doc.setTextColor(127, 29, 29);
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.text("EM CASO DE INGESTÃO ACIDENTAL:", margin + 3, y + 5);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.text("Contate IMEDIATAMENTE o veterinário. Não induza vômito. Identifique o alimento ingerido e a quantidade.", margin + 3, y + 10.5);

      doc.save("Cartaz_Alimentos_Toxicos_MinasBird.pdf");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-red-50 rounded-xl border-2 border-red-300 p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-600 rounded-lg flex items-center justify-center shadow-md">
              <Skull className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-red-900 text-lg">Cartaz de Alimentos Proibidos</h3>
              <p className="text-sm text-red-700">Para impressão e fixação na cozinha/área de preparo</p>
            </div>
          </div>
          <button
            onClick={generatePDF}
            disabled={generating}
            className={cn(
              "flex items-center gap-2 px-5 py-2.5 rounded-lg font-bold text-sm transition-all shadow-md",
              generating
                ? "bg-red-300 text-red-100 cursor-wait"
                : "bg-red-600 text-white hover:bg-red-700 hover:shadow-lg"
            )}
          >
            {generating ? (
              <>Gerando...</>
            ) : (
              <>
                <Printer className="w-4 h-4" />
                Gerar Cartaz PDF
              </>
            )}
          </button>
        </div>

        {/* Preview */}
        <div className="space-y-3">
          {/* Fatal */}
          <div className="bg-red-100 rounded-lg p-3 border border-red-300">
            <div className="flex items-center gap-2 mb-2">
              <Skull className="w-4 h-4 text-red-800" />
              <span className="font-bold text-red-900 text-sm">FATAIS — Risco de Morte ({fatal.length})</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              {fatal.map((f, i) => (
                <div key={i} className="flex items-start gap-2 bg-white/60 rounded px-2.5 py-1.5">
                  <span className="text-red-600 font-bold text-xs mt-0.5">✕</span>
                  <div>
                    <span className="text-sm font-bold text-red-900">{f.name}</span>
                    <p className="text-xs text-red-700">{f.substance} → {f.effect}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Grave */}
          <div className="bg-orange-100 rounded-lg p-3 border border-orange-300">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-4 h-4 text-orange-800" />
              <span className="font-bold text-orange-900 text-sm">GRAVES — Risco Significativo ({grave.length})</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              {grave.map((f, i) => (
                <div key={i} className="flex items-start gap-2 bg-white/60 rounded px-2.5 py-1.5">
                  <span className="text-orange-600 font-bold text-xs mt-0.5">⚠</span>
                  <div>
                    <span className="text-sm font-bold text-orange-900">{f.name}</span>
                    <p className="text-xs text-orange-700">{f.substance} → {f.effect}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Inadequado */}
          <div className="bg-yellow-100 rounded-lg p-3 border border-yellow-300">
            <div className="flex items-center gap-2 mb-2">
              <Ban className="w-4 h-4 text-yellow-800" />
              <span className="font-bold text-yellow-900 text-sm">INADEQUADOS — Evitar ({inadequado.length})</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              {inadequado.map((f, i) => (
                <div key={i} className="flex items-start gap-2 bg-white/60 rounded px-2.5 py-1.5">
                  <span className="text-yellow-600 font-bold text-xs mt-0.5">⊘</span>
                  <div>
                    <span className="text-sm font-bold text-yellow-900">{f.name}</span>
                    <p className="text-xs text-yellow-700">{f.substance} → {f.effect}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
