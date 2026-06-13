/**
 * PlantaModule — Planta Baixa do Criatório
 * Layout: 6 cards pequenos (thumbnails) com nome do setor
 * Ao clicar, expande mostrando a planta do setor em detalhe com zoom
 */
import { useState, useRef, useCallback } from "react";
import { ZoomIn, ZoomOut, RotateCcw, X, Maximize2 } from "lucide-react";

// CDN URLs for sector images
const SECTORS = [
  {
    id: "geral",
    title: "Planta Geral",
    subtitle: "Visão completa do criatório",
    color: "#166534",
    image: "/manus-storage/planta-geral-labeled_eb98076c.png",
  },
  {
    id: "baias-1",
    title: "Setor Baias 1",
    subtitle: "Viveiros laterais (esquerda)",
    color: "#2563eb",
    image: "/manus-storage/setor-baias-1_8d46b58b.png",
  },
  {
    id: "baias-2",
    title: "Setor Baias 2",
    subtitle: "Viveiros inferiores",
    color: "#1a1a1a",
    image: "/manus-storage/setor-baias-2_7ff729d0.png",
  },
  {
    id: "matrizes-1",
    title: "Ala Matrizes - Setor 1",
    subtitle: "Quadras inferiores (área central)",
    color: "#db2777",
    image: "/manus-storage/ala-matrizes-1_30c87fa2.png",
  },
  {
    id: "matrizes-2",
    title: "Ala Matrizes - Setor 2",
    subtitle: "Quadras centrais (área central)",
    color: "#ea580c",
    image: "/manus-storage/ala-matrizes-2_babf350f.png",
  },
  {
    id: "matrizes-3",
    title: "Ala Matrizes - Setor 3",
    subtitle: "Quadras superiores (área central)",
    color: "#dc2626",
    image: "/manus-storage/ala-matrizes-3_4c1a3479.png",
  },
];

export default function PlantaModule() {
  const [selectedSector, setSelectedSector] = useState<string | null>(null);
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  const sector = SECTORS.find((s) => s.id === selectedSector);

  const zoomIn = () => setScale((s) => Math.min(s + 0.3, 5));
  const zoomOut = () => setScale((s) => Math.max(s - 0.3, 0.5));
  const resetView = () => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  };

  const closeSector = () => {
    setSelectedSector(null);
    setScale(1);
    setPosition({ x: 0, y: 0 });
  };

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (scale > 1) {
        setIsDragging(true);
        setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
      }
    },
    [scale, position]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (isDragging) {
        setPosition({
          x: e.clientX - dragStart.x,
          y: e.clientY - dragStart.y,
        });
      }
    },
    [isDragging, dragStart]
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.2 : 0.2;
    setScale((s) => Math.min(Math.max(s + delta, 0.5), 5));
  }, []);

  // Expanded detail view
  if (selectedSector && sector) {
    return (
      <div className="space-y-4">
        {/* Header with back button */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={closeSector}
              className="p-2 rounded-lg border border-stone-200 text-stone-600 hover:bg-stone-50 transition-all"
              title="Voltar"
            >
              <X size={16} />
            </button>
            <div>
              <h2 className="text-lg font-bold text-stone-800">{sector.title}</h2>
              <p className="text-xs text-stone-500">{sector.subtitle}</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={zoomOut}
              className="p-2 rounded-lg border border-stone-200 text-stone-600 hover:bg-stone-50 transition-all"
              title="Diminuir zoom"
            >
              <ZoomOut size={16} />
            </button>
            <span className="text-xs font-semibold text-stone-600 min-w-[40px] text-center">
              {Math.round(scale * 100)}%
            </span>
            <button
              onClick={zoomIn}
              className="p-2 rounded-lg border border-stone-200 text-stone-600 hover:bg-stone-50 transition-all"
              title="Aumentar zoom"
            >
              <ZoomIn size={16} />
            </button>
            <button
              onClick={resetView}
              className="p-2 rounded-lg border border-stone-200 text-stone-600 hover:bg-stone-50 transition-all"
              title="Resetar"
            >
              <RotateCcw size={16} />
            </button>
          </div>
        </div>

        {/* Image viewer */}
        <div
          ref={containerRef}
          className="relative bg-stone-50 rounded-xl border border-stone-200 overflow-hidden shadow-sm"
          style={{ height: "calc(100vh - 220px)", minHeight: "450px" }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onWheel={handleWheel}
        >
          <div
            className="w-full h-full flex items-center justify-center"
            style={{
              cursor: scale > 1 ? (isDragging ? "grabbing" : "grab") : "default",
            }}
          >
            <img
              src={sector.image}
              alt={sector.title}
              className="max-w-full max-h-full object-contain select-none"
              draggable={false}
              style={{
                transform: `scale(${scale}) translate(${position.x / scale}px, ${position.y / scale}px)`,
                transition: isDragging ? "none" : "transform 0.2s ease",
              }}
            />
          </div>

          {/* Sector color indicator */}
          <div
            className="absolute top-3 left-3 rounded-lg px-3 py-1.5 shadow-sm border"
            style={{
              backgroundColor: `${sector.color}15`,
              borderColor: sector.color,
            }}
          >
            <p className="text-xs font-bold" style={{ color: sector.color }}>
              {sector.title}
            </p>
          </div>

          {/* Zoom hint */}
          {scale !== 1 && (
            <div className="absolute bottom-3 left-3 bg-white/90 backdrop-blur-sm rounded-lg px-2.5 py-1.5 border border-stone-200 shadow-sm">
              <p className="text-[10px] font-semibold text-stone-600">
                Zoom: {Math.round(scale * 100)}% · Arraste para mover
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between text-[10px] text-stone-400">
          <p>Criatório Minas Bird · Rodovia AMG 1650 · Zona Rural, MG</p>
          <p>Resp. Técnico: Luiz Roberto Ramos das Neves · CREA 1217479024/1</p>
        </div>
      </div>
    );
  }

  // Grid view with 6 sector cards
  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h2 className="text-lg font-bold text-stone-800">Planta Baixa</h2>
        <p className="text-xs text-stone-500">
          Criatório Minas Bird · Rodovia AMG 1650 · Zona Rural, MG · Selecione um setor para ampliar
        </p>
      </div>

      {/* 6 cards grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {SECTORS.map((s) => (
          <button
            key={s.id}
            onClick={() => {
              setSelectedSector(s.id);
              setScale(1);
              setPosition({ x: 0, y: 0 });
            }}
            className="group relative bg-white rounded-2xl border border-stone-200/80 overflow-hidden shadow-sm hover:shadow-md hover:border-stone-300 transition-all text-left"
          >
            {/* Thumbnail */}
            <div className="relative h-36 md:h-44 bg-stone-100 overflow-hidden">
              <img
                src={s.image}
                alt={s.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
              {/* Color indicator bar */}
              <div
                className="absolute top-0 left-0 right-0 h-1"
                style={{ backgroundColor: s.color }}
              />
              {/* Expand icon */}
              <div className="absolute bottom-2 right-2 bg-white/90 backdrop-blur-sm rounded-lg p-1.5 opacity-0 group-hover:opacity-100 transition-opacity shadow-sm">
                <Maximize2 size={14} className="text-stone-600" />
              </div>
            </div>

            {/* Card info */}
            <div className="p-3">
              <div className="flex items-center gap-2">
                <div
                  className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: s.color }}
                />
                <h3 className="text-sm font-bold text-stone-800 truncate">
                  {s.title}
                </h3>
              </div>
              <p className="text-[11px] text-stone-500 mt-0.5 ml-[18px]">
                {s.subtitle}
              </p>
            </div>
          </button>
        ))}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between text-[10px] text-stone-400 pt-2 border-t border-stone-100">
        <p>Escala: Indicada · Data: 05/07/2023</p>
        <p>Resp. Técnico: Luiz Roberto Ramos das Neves · CREA 1217479024/1</p>
      </div>
    </div>
  );
}
