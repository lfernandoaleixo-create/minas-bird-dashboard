/**
 * Home Page — Minas Bird
 * Professional-grade top navigation layout
 * Dark header with strong identity, clear hierarchy, proper contrast
 */
import FeedingModule from "@/components/FeedingModule";
import FeedingModuleTest from "@/components/FeedingModuleTest";
import ProgressMap from "@/components/ProgressMap";
import { useState, useRef, useEffect } from "react";
import { Utensils, FlaskConical, Users, LayoutGrid, Feather } from "lucide-react";
import { cn } from "@/lib/utils";

const LOGO_URL = "https://d2xsxph8kpxj0f.cloudfront.net/310519663426530649/GUVCZBcaMUVxbcauwK97Fr/logo3d_d58b8c94.png";

type TabId = "alimentacao" | "alimentacao_teste" | "clientes" | "mapa";

interface Tab {
  id: TabId;
  label: string;
  shortLabel: string;
  icon: typeof Utensils;
}

const tabs: Tab[] = [
  { id: "alimentacao", label: "Alimentação", shortLabel: "Alimentação", icon: Utensils },
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
    <div className="min-h-screen bg-stone-100 flex flex-col">
      {/* Professional Header — Dark with strong identity */}
      <header className="sticky top-0 z-30">
        {/* Top brand bar — dark green */}
        <div className="bg-[#1a3a2a] px-5 lg:px-8 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg overflow-hidden border border-white/20 shadow-lg">
              <img
                src={LOGO_URL}
                alt="Minas Bird"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-white font-bold text-sm tracking-wide">
                MINAS BIRD
              </span>
              <span className="text-emerald-300/60 text-[10px] font-medium tracking-wider hidden sm:inline">
                MANUAL OPERACIONAL
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-emerald-300/50 text-[10px] font-mono">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.5)]" />
              <span>v1.1</span>
            </div>
          </div>
        </div>

        {/* Navigation bar — slightly lighter dark */}
        <div className="bg-[#223d30] px-3 lg:px-6 flex items-center gap-0.5 overflow-x-auto scrollbar-hide shadow-md">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "relative flex items-center gap-2 px-4 lg:px-5 py-3 text-xs lg:text-sm font-medium transition-all duration-150 whitespace-nowrap border-b-2",
                  isActive
                    ? "text-white bg-white/10 border-emerald-400"
                    : "text-white/50 border-transparent hover:text-white/80 hover:bg-white/5"
                )}
              >
                <Icon size={15} />
                <span className="hidden sm:inline">{tab.label}</span>
                <span className="sm:hidden">{tab.shortLabel}</span>
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
                <div className="w-14 h-14 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center mx-auto mb-4">
                  <Users className="w-6 h-6 text-blue-600" />
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

      {/* Footer — minimal */}
      <footer className="bg-[#1a3a2a] py-2.5 px-6 flex items-center justify-center gap-2">
        <Feather size={11} className="text-emerald-400/40" />
        <p className="text-[10px] text-white/30 font-medium tracking-wider">
          CRIATÓRIO MINAS BIRD · RIBEIRÃO VERMELHO — MG — 2026
        </p>
      </footer>
    </div>
  );
}
