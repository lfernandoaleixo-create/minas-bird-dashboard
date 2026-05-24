/**
 * Home Page — Minas Bird
 * Top navigation layout with 4 modules
 * Clean, refined, professional design
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
  icon: typeof Utensils;
  color: string;
  activeColor: string;
  activeBg: string;
}

const tabs: Tab[] = [
  {
    id: "alimentacao",
    label: "Alimentação",
    icon: Utensils,
    color: "text-stone-500",
    activeColor: "text-emerald-700",
    activeBg: "bg-emerald-50 border-emerald-600",
  },
  {
    id: "alimentacao_teste",
    label: "Alimentação Teste",
    icon: FlaskConical,
    color: "text-stone-500",
    activeColor: "text-amber-700",
    activeBg: "bg-amber-50 border-amber-600",
  },
  {
    id: "clientes",
    label: "Clientes",
    icon: Users,
    color: "text-stone-500",
    activeColor: "text-blue-700",
    activeBg: "bg-blue-50 border-blue-600",
  },
  {
    id: "mapa",
    label: "Mapa de Progresso",
    icon: LayoutGrid,
    color: "text-stone-500",
    activeColor: "text-violet-700",
    activeBg: "bg-violet-50 border-violet-600",
  },
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
    <div className="min-h-screen bg-stone-50 flex flex-col">
      {/* Header */}
      <header className="bg-white sticky top-0 z-30 shadow-sm">
        {/* Brand bar */}
        <div className="px-6 lg:px-10 py-3.5 flex items-center justify-between border-b border-stone-100">
          <div className="flex items-center gap-3.5">
            <img
              src={LOGO_URL}
              alt="Minas Bird"
              className="w-10 h-10 rounded-xl object-cover shadow-sm"
            />
            <div>
              <h1 className="text-lg font-bold text-stone-800 leading-tight" style={{ fontFamily: "'DM Serif Display', Georgia, serif" }}>
                Minas Bird
              </h1>
              <p className="text-[10px] text-stone-400 font-semibold uppercase tracking-[0.15em]">
                Manual Operacional
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 bg-stone-50 px-3 py-1.5 rounded-full">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] text-stone-500 font-semibold">v1.1</span>
          </div>
        </div>

        {/* Navigation tabs */}
        <nav className="px-4 lg:px-8 pt-1 flex gap-0.5 overflow-x-auto scrollbar-hide">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "relative flex items-center gap-2 px-5 py-3 text-sm font-medium transition-all duration-200 whitespace-nowrap rounded-t-xl",
                  isActive
                    ? `${tab.activeColor} ${tab.activeBg}`
                    : "text-stone-400 hover:text-stone-600 hover:bg-stone-50/70"
                )}
              >
                <Icon size={15} className={isActive ? "" : "opacity-70"} />
                <span>{tab.label}</span>
                {isActive && (
                  <span className="absolute bottom-0 left-3 right-3 h-[2.5px] rounded-full bg-current" />
                )}
              </button>
            );
          })}
        </nav>
      </header>

      {/* Content area */}
      <main ref={contentRef} className="flex-1 overflow-y-auto">
        <div className="px-4 lg:px-8 py-6 pb-20">
          {activeTab === "alimentacao" && <FeedingModule />}
          {activeTab === "alimentacao_teste" && <FeedingModuleTest />}
          {activeTab === "clientes" && (
            <div className="max-w-4xl mx-auto mt-8">
              <div className="bg-white rounded-xl border border-stone-200 shadow-sm p-10 text-center">
                <div className="w-16 h-16 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center mx-auto mb-5">
                  <Users className="w-7 h-7 text-blue-600" />
                </div>
                <h2 className="text-xl font-bold text-stone-800 mb-2" style={{ fontFamily: "'DM Serif Display', Georgia, serif" }}>
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

      {/* Footer */}
      <footer className="bg-white border-t border-stone-100 py-2.5 px-6 flex items-center justify-center gap-2">
        <Feather size={12} className="text-stone-300" />
        <p className="text-[10px] text-stone-400 font-medium tracking-wide">
          CRIATÓRIO MINAS BIRD · Ribeirão Vermelho — MG — 2026
        </p>
      </footer>
    </div>
  );
}
