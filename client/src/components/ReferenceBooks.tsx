/**
 * ReferenceBooks — Seção de referência bibliográfica com os 5 volumes
 * Card expansível com capas originais dos livros e visualizador de PDF
 */
import { useState } from "react";
import { BookOpen, ChevronDown, ChevronRight, X, ExternalLink, ZoomIn } from "lucide-react";

interface Volume {
  id: number;
  title: string;
  subtitle: string;
  cover: string;
  pdfUrl: string;
}

const volumes: Volume[] = [
  {
    id: 1,
    title: "Volume 1",
    subtitle: "Fundamentos do Sistema de Cálculo",
    cover: "https://d2xsxph8kpxj0f.cloudfront.net/310519663487476806/GbyPqTQ4WPAeZLRC6VPuta/nutricao-vol1-cover_7e1f85bb.png",
    pdfUrl: "https://d2xsxph8kpxj0f.cloudfront.net/310519663487476806/GbyPqTQ4WPAeZLRC6VPuta/vol1_b67db984.pdf",
  },
  {
    id: 2,
    title: "Volume 2",
    subtitle: "Catálogo Completo de Espécies",
    cover: "https://d2xsxph8kpxj0f.cloudfront.net/310519663487476806/GbyPqTQ4WPAeZLRC6VPuta/nutricao-vol2-cover_13ecdc24.png",
    pdfUrl: "https://d2xsxph8kpxj0f.cloudfront.net/310519663487476806/GbyPqTQ4WPAeZLRC6VPuta/vol2_de3929ed.pdf",
  },
  {
    id: 3,
    title: "Volume 3",
    subtitle: "Alimentos e Composição Nutricional",
    cover: "https://d2xsxph8kpxj0f.cloudfront.net/310519663487476806/GbyPqTQ4WPAeZLRC6VPuta/nutricao-vol3-cover_60598be9.png",
    pdfUrl: "https://d2xsxph8kpxj0f.cloudfront.net/310519663487476806/GbyPqTQ4WPAeZLRC6VPuta/vol3_915128d6.pdf",
  },
  {
    id: 4,
    title: "Volume 4",
    subtitle: "Tabelas e Dados de Referência",
    cover: "https://d2xsxph8kpxj0f.cloudfront.net/310519663487476806/GbyPqTQ4WPAeZLRC6VPuta/nutricao-vol4-cover_c5911141.png",
    pdfUrl: "https://d2xsxph8kpxj0f.cloudfront.net/310519663487476806/GbyPqTQ4WPAeZLRC6VPuta/vol4_0c6bf81e.pdf",
  },
  {
    id: 5,
    title: "Volume 5",
    subtitle: "Guia Alimentar por Espécie",
    cover: "https://d2xsxph8kpxj0f.cloudfront.net/310519663487476806/GbyPqTQ4WPAeZLRC6VPuta/nutricao-vol5-cover_e026c6ec.png",
    pdfUrl: "https://d2xsxph8kpxj0f.cloudfront.net/310519663487476806/GbyPqTQ4WPAeZLRC6VPuta/vol5_e1d6f24c.pdf",
  },
];

export default function ReferenceBooks() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [viewingPdf, setViewingPdf] = useState<Volume | null>(null);

  return (
    <>
      <div className="bg-white rounded-xl border border-stone-200 shadow-sm overflow-hidden">
        {/* Header expansível */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full flex items-center gap-3 px-5 py-3.5 text-left hover:bg-stone-50 transition-colors"
        >
          <div className="w-8 h-8 rounded-full bg-emerald-800 flex items-center justify-center flex-shrink-0">
            <BookOpen className="w-4 h-4 text-amber-300" />
          </div>
          <h3 className="font-bold text-stone-800">Referência Bibliográfica</h3>
          <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-emerald-50 text-emerald-700">
            5 volumes
          </span>
          <span className="ml-auto flex-shrink-0">
            {isExpanded
              ? <ChevronDown className="w-5 h-5 text-stone-400" />
              : <ChevronRight className="w-5 h-5 text-stone-400" />}
          </span>
        </button>

        {isExpanded && (
          <div className="px-5 pb-5">
            <p className="text-sm text-stone-500 mb-4">
              Manual de Nutrição para Psitacídeos — Criatório Minas Bird. Clique em um volume para abrir e pesquisar.
            </p>

            {/* Grid de livros */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
              {volumes.map((vol) => (
                <button
                  key={vol.id}
                  onClick={() => setViewingPdf(vol)}
                  className="group flex flex-col items-center text-center hover:scale-105 transition-transform cursor-pointer"
                  title={`Abrir ${vol.title}: ${vol.subtitle}`}
                >
                  <div className="relative w-full aspect-[3/4.2] rounded-lg overflow-hidden shadow-md border border-stone-200 group-hover:shadow-xl group-hover:border-emerald-400 transition-all">
                    <img
                      src={vol.cover}
                      alt={`${vol.title} - ${vol.subtitle}`}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                      <ZoomIn className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-lg" />
                    </div>
                  </div>
                  <span className="mt-2 text-xs font-bold text-stone-700 group-hover:text-emerald-700 transition-colors">
                    {vol.title}
                  </span>
                  <span className="text-[10px] text-stone-500 leading-tight mt-0.5 line-clamp-2">
                    {vol.subtitle}
                  </span>
                </button>
              ))}
            </div>

            <p className="text-[10px] text-stone-400 mt-4 text-center">
              Criatório Minas Bird — Ribeirão Vermelho, MG — 2025
            </p>
          </div>
        )}
      </div>

      {/* PDF Viewer Modal */}
      {viewingPdf && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === e.currentTarget) setViewingPdf(null);
          }}
        >
          <div className="bg-white rounded-2xl shadow-2xl w-[95vw] h-[92vh] max-w-6xl flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-stone-200 bg-emerald-800">
              <div className="flex items-center gap-3">
                <BookOpen className="w-5 h-5 text-amber-300" />
                <div>
                  <h3 className="font-bold text-white text-sm">{viewingPdf.title}</h3>
                  <p className="text-xs text-emerald-200">{viewingPdf.subtitle}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={viewingPdf.pdfUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-100 hover:text-white hover:bg-emerald-700 rounded-lg transition-colors"
                  title="Abrir PDF em nova aba"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Abrir em nova aba
                </a>
                <button
                  onClick={() => setViewingPdf(null)}
                  className="p-1.5 rounded-lg hover:bg-emerald-700 transition-colors"
                  title="Fechar visualizador"
                >
                  <X className="w-5 h-5 text-white" />
                </button>
              </div>
            </div>

            {/* PDF Embed */}
            <div className="flex-1 bg-stone-100">
              <iframe
                src={`${viewingPdf.pdfUrl}#toolbar=1&navpanes=1&scrollbar=1`}
                className="w-full h-full border-0"
                title={`${viewingPdf.title} - ${viewingPdf.subtitle}`}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
