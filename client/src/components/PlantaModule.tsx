/**
 * PlantaModule — Planta Baixa do Criatório
 * Exibe a planta baixa com zoom e pan interativo
 */
import { useState, useRef, useCallback } from "react";
import { ZoomIn, ZoomOut, Maximize2, RotateCcw } from "lucide-react";

const PLANTA_URL = "/manus-storage/planta-baixa-1_8e595f82.png";

export default function PlantaModule() {
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  const zoomIn = () => setScale((s) => Math.min(s + 0.25, 4));
  const zoomOut = () => setScale((s) => Math.max(s - 0.25, 0.5));
  const resetView = () => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  };
  const fitToScreen = () => {
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
    const delta = e.deltaY > 0 ? -0.15 : 0.15;
    setScale((s) => Math.min(Math.max(s + delta, 0.5), 4));
  }, []);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-stone-800">Planta Baixa</h2>
          <p className="text-xs text-stone-500">
            Criatório Minas Bird · Rodovia AMG 1650 · Zona Rural, MG
          </p>
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
            onClick={fitToScreen}
            className="p-2 rounded-lg border border-stone-200 text-stone-600 hover:bg-stone-50 transition-all"
            title="Ajustar à tela"
          >
            <Maximize2 size={16} />
          </button>
          <button
            onClick={resetView}
            className="p-2 rounded-lg border border-stone-200 text-stone-600 hover:bg-stone-50 transition-all"
            title="Resetar visualização"
          >
            <RotateCcw size={16} />
          </button>
        </div>
      </div>

      {/* Planta container */}
      <div
        ref={containerRef}
        className="relative bg-stone-100 rounded-xl border border-stone-200 overflow-hidden shadow-sm"
        style={{ height: "calc(100vh - 200px)", minHeight: "500px" }}
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
            src={PLANTA_URL}
            alt="Planta Baixa - Criatório Minas Bird"
            className="max-w-full max-h-full object-contain select-none"
            draggable={false}
            style={{
              transform: `scale(${scale}) translate(${position.x / scale}px, ${position.y / scale}px)`,
              transition: isDragging ? "none" : "transform 0.2s ease",
            }}
          />
        </div>

        {/* Zoom indicator */}
        {scale !== 1 && (
          <div className="absolute bottom-3 left-3 bg-white/90 backdrop-blur-sm rounded-lg px-2.5 py-1.5 border border-stone-200 shadow-sm">
            <p className="text-[10px] font-semibold text-stone-600">
              Zoom: {Math.round(scale * 100)}% · Arraste para mover
            </p>
          </div>
        )}

        {/* Legend */}
        <div className="absolute bottom-3 right-3 bg-white/90 backdrop-blur-sm rounded-lg px-3 py-2 border border-stone-200 shadow-sm">
          <p className="text-[10px] font-semibold text-stone-700 mb-1">Legenda</p>
          <div className="space-y-0.5">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-2 rounded-sm bg-[#4a4a4a]" />
              <span className="text-[9px] text-stone-600">Viveiros</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-2 rounded-sm bg-[#e8e4a0]" />
              <span className="text-[9px] text-stone-600">Área coberta</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-2 rounded-sm bg-[#c5b88a]" />
              <span className="text-[9px] text-stone-600">Área externa</span>
            </div>
          </div>
        </div>
      </div>

      {/* Info footer */}
      <div className="flex items-center justify-between text-[10px] text-stone-400">
        <p>Escala: Indicada · Data: 05/07/2023</p>
        <p>Resp. Técnico: Luiz Roberto Ramos das Neves · CREA 1217479024/1</p>
      </div>
    </div>
  );
}
