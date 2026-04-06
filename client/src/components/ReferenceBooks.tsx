/**
 * ReferenceBooks — Seção de referência com os 5 volumes de nutrição
 * Exibido no rodapé da página de Alimentação
 */
import { BookOpen } from "lucide-react";

const volumes = [
  {
    id: 1,
    title: "Fundamentos do Cálculo Nutricional",
    cover: "https://d2xsxph8kpxj0f.cloudfront.net/310519663487476806/GbyPqTQ4WPAeZLRC6VPuta/vol1-cover-CgnMDhsqdsbn2vK9Rty46g.webp",
    color: "from-green-800 to-green-900",
  },
  {
    id: 2,
    title: "Perfil Nutricional por Espécie",
    cover: "https://d2xsxph8kpxj0f.cloudfront.net/310519663487476806/GbyPqTQ4WPAeZLRC6VPuta/vol2-cover-Qk5iAyUPB2TQ3LyEyrDbGe.webp",
    color: "from-blue-800 to-blue-900",
  },
  {
    id: 3,
    title: "Guia Completo de Alimentos",
    cover: "https://d2xsxph8kpxj0f.cloudfront.net/310519663487476806/GbyPqTQ4WPAeZLRC6VPuta/vol3-cover-KuTLRazpeBycDswNHXPZYZ.webp",
    color: "from-red-800 to-red-900",
  },
  {
    id: 4,
    title: "Tabelas Nutricionais Detalhadas",
    cover: "https://d2xsxph8kpxj0f.cloudfront.net/310519663487476806/GbyPqTQ4WPAeZLRC6VPuta/vol4-cover-jFhupT9TuRR6qhkTNT7deG.webp",
    color: "from-teal-800 to-teal-900",
  },
  {
    id: 5,
    title: "Guia Alimentar por Espécie",
    cover: "https://d2xsxph8kpxj0f.cloudfront.net/310519663487476806/GbyPqTQ4WPAeZLRC6VPuta/vol5-cover-T7YyN7uAT9WvpYc24iPqGJ.webp",
    color: "from-purple-800 to-purple-900",
  },
];

export default function ReferenceBooks() {
  return (
    <div className="mt-10 pt-8 border-t border-stone-200">
      <div className="flex items-center gap-2 mb-5">
        <BookOpen className="w-5 h-5 text-stone-500" />
        <h3 className="text-base font-bold text-stone-700">Referência Bibliográfica</h3>
        <span className="text-xs text-stone-400 ml-1">Criatório Minas Bird</span>
      </div>

      <div className="grid grid-cols-5 gap-3">
        {volumes.map((vol) => (
          <div
            key={vol.id}
            className="group flex flex-col items-center text-center"
          >
            <div className="relative w-full aspect-[3/4] rounded-lg overflow-hidden shadow-md group-hover:shadow-lg transition-shadow mb-2">
              <img
                src={vol.cover}
                alt={`Vol. ${vol.id} — ${vol.title}`}
                className="w-full h-full object-cover"
                loading="lazy"
              />
            </div>
            <p className="text-[11px] font-semibold text-stone-600 leading-tight">
              Vol. {vol.id}
            </p>
            <p className="text-[10px] text-stone-400 leading-tight mt-0.5">
              {vol.title}
            </p>
          </div>
        ))}
      </div>

      <p className="text-[10px] text-stone-400 text-center mt-4">
        Todos os dados nutricionais e recomendações alimentares são baseados nestes 5 volumes de referência do Criatório Minas Bird.
      </p>
    </div>
  );
}
