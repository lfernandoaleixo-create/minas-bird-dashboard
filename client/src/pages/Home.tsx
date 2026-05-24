/**
 * Home Page — Minas Bird
 * Professional layout with brand identity
 * Uses the criatório's actual logo (gold MB with bird) on dark background
 */
import FeedingModule from "@/components/FeedingModule";
import FeedingModuleTest from "@/components/FeedingModuleTest";
import ProgressMap from "@/components/ProgressMap";
import { useState, useRef, useEffect } from "react";
import { Utensils, FlaskConical, Users, LayoutGrid } from "lucide-react";
import { cn } from "@/lib/utils";

// Brand assets
const LOGO_FULL = "https://d2xsxph8kpxj0f.cloudfront.net/310519663426530649/GUVCZBcaMUVxbcauwK97Fr/logo3d_d58b8c94.png";
const MB_SYMBOL = "https://d2xsxph8kpxj0f.cloudfront.net/310519663487476806/GbyPqTQ4WPAeZLRC6VPuta/mb-symbol_eba1d647.png";

type TabId = "alimentacao" | "alimentacao_teste" | "clientes" | "mapa";

interface Tab {
  id: TabId;
  label: string;
  shortLabel: string;
  icon: typeof Utensils;
}

const tabs: Tab[] = [
  { id: "alimentacao", label: "Alimentação", shortLabel: "Aliment.", icon: Utensils },
  { id: "alimentacao_teste", label: "Alimentação Teste", shortLabel: "Teste", icon: FlaskConical },
  { id: "clientes", label: "Clientes", shortLabel: "Clientes", icon: Users },
  { id: "mapa", label: "Mapa de Progresso", shortLabel: "Progresso", icon: LayoutGrid },
];

export default function Home() {
  const [activeTab, setActiveTab] = useState<TabId>("alimentacao");
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (contentRef.current) {
      contentRef.current.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [activeTab]);

  return (
    <div className="min-h-screen bg-[#f5f3f0] flex flex-col">
      {/* Header — Premium dark with gold brand */}
      <header className="sticky top-0 z-30 shadow-lg">
        {/* Brand bar */}
        <div className="bg-gradient-to-r from-[#1a1a1a] via-[#252525] to-[#1a1a1a] px-4 lg:px-8 py-3.5 flex items-center justify-between border-b border-[#3a3a3a]">
          {/* Logo + Brand name */}
          <div className="flex items-center gap-3.5">
            <img
              src={MB_SYMBOL}
              alt="Minas Bird"
              className="h-9 w-auto drop-shadow-[0_2px_4px_rgba(197,165,90,0.3)]"
            />
            <div className="flex flex-col">
              <span className="text-[#c5a55a] font-bold text-[13px] tracking-[0.15em] leading-tight">
                MINAS BIRD
              </span>
              <span className="text-[#888] text-[9px] font-medium tracking-[0.2em] leading-tight">
                MANUAL OPERACIONAL
              </span>
            </div>
          </div>

          {/* Version badge */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#2a2a2a] border border-[#3a3a3a]">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_4px_rgba(16,185,129,0.6)]" />
              <span className="text-[10px] text-[#999] font-mono">v1.1</span>
            </div>
          </div>
        </div>

        {/* Navigation tabs */}
        <div className="bg-[#1f1f1f] px-2 lg:px-6 flex items-center overflow-x-auto scrollbar-hide">
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
                    ? "text-[#c5a55a]"
                    : "text-[#777] hover:text-[#bbb]"
                )}
              >
                <Icon size={14} strokeWidth={isActive ? 2.2 : 1.8} />
                <span className="hidden sm:inline">{tab.label}</span>
                <span className="sm:hidden">{tab.shortLabel}</span>
                {/* Active indicator — gold underline */}
                {isActive && (
                  <span className="absolute bottom-0 left-3 right-3 h-[2px] bg-gradient-to-r from-transparent via-[#c5a55a] to-transparent rounded-full" />
                )}
              </button>
            );
          })}
        </div>
      </header>

      {/* Content area */}
      <main ref={contentRef} className="flex-1 overflow-y-auto">
        <div className="px-4 lg:px-8 py-6 pb-16">
          {activeTab === "alimentacao" && <FeedingModule />}
          {activeTab === "alimentacao_teste" && <FeedingModuleTest />}
          {activeTab === "clientes" && (
            <div className="max-w-4xl mx-auto mt-8">
              <div className="bg-white rounded-xl border border-stone-200 shadow-sm p-10 text-center">
                <div className="w-14 h-14 rounded-full bg-amber-50 border border-amber-200/50 flex items-center justify-center mx-auto mb-4">
                  <Users className="w-6 h-6 text-amber-700" />
                </div>
                <h2 className="text-lg font-bold text-stone-800 mb-2">
                  Clientes
                </h2>
                <p className="text-stone-500 text-sm max-w-md mx-auto">
                  Módulo em desenvolvimento. Em breve você poderá gerenciar seus clientes aqui.
                </p>
              </div>
            </div>
          )}
          {activeTab === "mapa" && <ProgressMap onNavigate={() => {}} />}
        </div>
      </main>

      {/* Footer — matching dark */}
      <footer className="bg-[#1a1a1a] border-t border-[#2a2a2a] py-2.5 px-6 flex items-center justify-center">
        <p className="text-[10px] text-[#555] font-medium tracking-[0.15em]">
          CRIATÓRIO MINAS BIRD · RIBEIRÃO VERMELHO — MG — 2026
        </p>
      </footer>
    </div>
  );
}
