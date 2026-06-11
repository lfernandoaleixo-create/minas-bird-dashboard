/**
 * Home Page — Minas Bird
 * Professional layout with brand identity
 * Green criatório color, aviary background, large brand emphasis
 */
import FeedingModule from "@/components/FeedingModule";
import FeedingModuleTest from "@/components/FeedingModuleTest";
import ProgressMap from "@/components/ProgressMap";
import ClientsModule from "@/components/ClientsModule";
import PlantelModule from "@/components/PlantelModule";
import CaixaModule from "@/components/CaixaModule";
import PlantaModule from "@/components/PlantaModule";
import DocumentacaoModule from "@/components/DocumentacaoModule";
import { useState, useRef, useEffect } from "react";
import { Utensils, FlaskConical, Users, LayoutGrid, Bird, DollarSign, Map, FileText } from "lucide-react";
import { cn } from "@/lib/utils";

// Brand assets
const MB_SYMBOL = "https://d2xsxph8kpxj0f.cloudfront.net/310519663487476806/GbyPqTQ4WPAeZLRC6VPuta/mb-symbol_eba1d647.png";
const AVIARY_BG = "https://files.manuscdn.com/user_upload_by_module/session_file/310519663487476806/hxUogTsXUMSRebXV.png";

type TabId = "alimentacao" | "plantel" | "clientes" | "caixa" | "planta" | "documentacao" | "mapa";
type SubTab = "original" | "teste";

interface Tab {
  id: TabId;
  label: string;
  shortLabel: string;
  icon: typeof Utensils;
}

const tabs: Tab[] = [
  { id: "alimentacao", label: "Alimentação", shortLabel: "Aliment.", icon: Utensils },
  { id: "plantel", label: "Plantel", shortLabel: "Plantel", icon: Bird },
  { id: "clientes", label: "Clientes", shortLabel: "Clientes", icon: Users },
  { id: "caixa", label: "Caixa", shortLabel: "Caixa", icon: DollarSign },
  { id: "planta", label: "Planta", shortLabel: "Planta", icon: Map },
  { id: "documentacao", label: "Documentação", shortLabel: "Docs", icon: FileText },
  { id: "mapa", label: "Mapa de Progresso", shortLabel: "Progresso", icon: LayoutGrid },
];

export default function Home() {
  const [activeTab, setActiveTab] = useState<TabId>("alimentacao");
  const [feedingSubTab, setFeedingSubTab] = useState<SubTab>("original");
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (contentRef.current) {
      contentRef.current.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [activeTab]);

  return (
    <div className="min-h-screen bg-[#f5f3f0] flex flex-col">
      {/* Header — Green criatório with aviary background */}
      <header className="sticky top-0 z-30 shadow-xl">
        {/* Brand bar — large, green with aviary photo */}
        <div className="relative h-[6.5rem] overflow-hidden">
          {/* Background image */}
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url(${AVIARY_BG})` }}
          />
          {/* Green overlay */}
          <div className="absolute inset-0 bg-gradient-to-r from-[#1a4d2e]/95 via-[#1a4d2e]/88 to-[#1a4d2e]/80" />

          {/* Content */}
          <div className="relative h-full px-5 lg:px-10 flex items-center justify-between">
            {/* Logo + Brand name */}
            <div className="flex items-center gap-4">
              <img
                src={MB_SYMBOL}
                alt="Minas Bird"
                className="h-[5rem] w-auto object-contain relative z-10 mt-1"
              />
              <span className="text-white font-bold text-3xl lg:text-4xl tracking-[0.14em] leading-tight drop-shadow-sm">
                MINAS BIRD
              </span>
            </div>

            {/* Version badge */}
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/10 border border-white/15 backdrop-blur-sm">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-300 shadow-[0_0_4px_rgba(110,231,183,0.6)]" />
                <span className="text-[10px] text-white/70 font-mono">v1.1</span>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation tabs — darker green */}
        <div className="bg-[#143d24] px-2 lg:px-6 flex items-center overflow-x-auto scrollbar-hide border-t border-white/5">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "relative flex items-center gap-2 px-4 lg:px-5 py-3 text-[11px] lg:text-[13px] font-medium transition-all duration-200 whitespace-nowrap",
                  isActive
                    ? "text-emerald-200"
                    : "text-white/40 hover:text-white/70"
                )}
              >
                <Icon size={14} strokeWidth={isActive ? 2.2 : 1.8} />
                <span className="hidden sm:inline">{tab.label}</span>
                <span className="sm:hidden">{tab.shortLabel}</span>
                {/* Active indicator — emerald underline */}
                {isActive && (
                  <span className="absolute bottom-0 left-3 right-3 h-[2px] bg-gradient-to-r from-transparent via-emerald-300 to-transparent rounded-full" />
                )}
              </button>
            );
          })}
        </div>
      </header>

      {/* Content area */}
      <main ref={contentRef} className="flex-1 overflow-y-auto">
        <div className="px-4 lg:px-8 py-6 pb-16">
          {activeTab === "alimentacao" && (
            <div>
              {/* Sub-tab selector */}
              <div className="flex items-center gap-1 mb-5 bg-white rounded-lg border border-stone-200 shadow-sm p-1 w-fit">
                <button
                  onClick={() => setFeedingSubTab("original")}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all duration-200",
                    feedingSubTab === "original"
                      ? "bg-emerald-600 text-white shadow-sm"
                      : "text-stone-500 hover:text-stone-700 hover:bg-stone-50"
                  )}
                >
                  <Utensils size={14} />
                  Alimentação
                </button>
                <button
                  onClick={() => setFeedingSubTab("teste")}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all duration-200",
                    feedingSubTab === "teste"
                      ? "bg-amber-600 text-white shadow-sm"
                      : "text-stone-500 hover:text-stone-700 hover:bg-stone-50"
                  )}
                >
                  <FlaskConical size={14} />
                  Alimentação Teste
                </button>
              </div>
              {/* Content */}
              {feedingSubTab === "original" ? <FeedingModule /> : <FeedingModuleTest />}
            </div>
          )}
          {activeTab === "plantel" && <PlantelModule />}
          {activeTab === "clientes" && <ClientsModule />}
          {activeTab === "caixa" && <CaixaModule />}
          {activeTab === "planta" && <PlantaModule />}
          {activeTab === "documentacao" && <DocumentacaoModule />}
          {activeTab === "mapa" && <ProgressMap onNavigate={() => {}} />}
        </div>
      </main>

      {/* Footer — matching green */}
      <footer className="bg-[#143d24] border-t border-[#1a4d2e] py-2.5 px-6 flex items-center justify-center">
        <p className="text-[10px] text-white/30 font-medium tracking-[0.15em]">
          CRIATÓRIO MINAS BIRD · RIBEIRÃO VERMELHO — MG — 2026
        </p>
      </footer>
    </div>
  );
}
