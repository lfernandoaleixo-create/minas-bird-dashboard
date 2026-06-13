/**
 * PlantaModule — Planta Baixa do Criatório
 * Mostra apenas a planta original sem marcações, com controles de zoom
 */
import { useState, useRef, useCallback } from "react";
import { ZoomIn, ZoomOut, RotateCcw } from "lucide-react";

const PLANTA_IMAGE = "/manus-storage/planta-original_99c13ab2.png";

export default function PlantaModule() {
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  const zoomIn = () => setScale((s) => Math.min(s + 0.3, 5));
  const zoomOut = () => setScale((s) => Math.max(s - 0.3, 0.5));
  const resetView = () => {
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

  // Touch support
  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (scale > 1 && e.touches.length === 1) {
        setIsDragging(true);
        setDragStart({
          x: e.touches[0].clientX - position.x,
          y: e.touches[0].clientY - position.y,
        });
      }
    },
    [scale, position]
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (isDragging && e.touches.length === 1) {
        setPosition({
          x: e.touches[0].clientX - dragStart.x,
          y: e.touches[0].clientY - dragStart.y,
        });
      }
    },
    [isDragging, dragStart]
  );

  const handleTouchEnd = useCallback(() => {
    setIsDragging(false);
  }, []);

  return (
    <div className="space-y-4">
      {/* Hero Banner */}
      <div className="relative h-44 rounded-2xl overflow-hidden shadow-lg shadow-emerald-900/10">
        <img src="/manus-storage/hero-planta_f47eeddc.jpg" alt="Planta" className="w-full h-full object-cover object-center" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/30 to-transparent flex items-end p-7">
          <div>
            <p className="text-emerald-300/80 text-[10px] font-bold tracking-[0.2em] uppercase mb-1">Módulo 5</p>
            <h1 className="text-white text-2xl lg:text-3xl font-bold tracking-tight">Planta Baixa</h1>
            <p className="text-white/70 text-sm mt-1.5 font-light">Layout e estrutura física do criatório</p>
          </div>
        </div>
      </div>
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
        className="relative bg-white rounded-2xl border border-stone-200/80 overflow-hidden shadow-md shadow-stone-200/30"
        style={{ height: "calc(100vh - 220px)", minHeight: "500px" }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div
          className="w-full h-full flex items-center justify-center p-4"
          style={{
            cursor: scale > 1 ? (isDragging ? "grabbing" : "grab") : "default",
          }}
        >
          <img
            src={PLANTA_IMAGE}
            alt="Planta Baixa - Criatório Minas Bird"
            className="max-w-full max-h-full object-contain select-none"
            draggable={false}
            style={{
              transform: `scale(${scale}) translate(${position.x / scale}px, ${position.y / scale}px)`,
              transition: isDragging ? "none" : "transform 0.2s ease",
            }}
          />
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
      <div className="flex items-center justify-between text-[10px] text-stone-400 pt-2 border-t border-stone-100">
        <p>Escala: Indicada · Data: 05/07/2023</p>
        <p>Resp. Técnico: Luiz Roberto Ramos das Neves · CREA 1217479024/1</p>
      </div>
    </div>
  );
}
