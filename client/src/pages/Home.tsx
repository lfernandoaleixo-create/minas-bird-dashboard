/**
 * Home Page — Minas Bird Dashboard
 * Premium design matching the landing page quality
 * Refined header, elegant navigation, polished content areas
 */
import FeedingModule from "@/components/FeedingModule";
import FeedingModuleTest from "@/components/FeedingModuleTest";
import ProgressMap from "@/components/ProgressMap";
import ClientsModule from "@/components/ClientsModule";
import PlantelModule from "@/components/PlantelModule";
import CaixaModule from "@/components/CaixaModule";
import PlantaModule from "@/components/PlantaModule";
import DocumentacaoModule from "@/components/DocumentacaoModule";
import { useState, useRef, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import { Utensils, FlaskConical, Users, LayoutGrid, Bird, DollarSign, Map, FileText, Home as HomeIcon } from "lucide-react";
import { cn } from "@/lib/utils";

// Brand assets
const MB_SYMBOL = "https://d2xsxph8kpxj0f.cloudfront.net/310519663487476806/GbyPqTQ4WPAeZLRC6VPuta/mb-symbol_eba1d647.png";

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

const INACTIVITY_TIMEOUT = 5 * 60 * 1000; // 5 minutes

export default function Home() {
  const [activeTab, setActiveTab] = useState<TabId>("alimentacao");
  const [feedingSubTab, setFeedingSubTab] = useState<SubTab>("original");
  const contentRef = useRef<HTMLDivElement>(null);
  const [, navigate] = useLocation();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const resetTimer = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      navigate("/");
    }, INACTIVITY_TIMEOUT);
  }, [navigate]);

  useEffect(() => {
    const events = ["mousedown", "mousemove", "keydown", "scroll", "touchstart", "click"];
    const handler = () => resetTimer();
    events.forEach((e) => window.addEventListener(e, handler));
    resetTimer();
    return () => {
      events.forEach((e) => window.removeEventListener(e, handler));
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [resetTimer]);

  useEffect(() => {
    if (contentRef.current) {
      contentRef.current.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [activeTab]);

  const activeTabData = tabs.find((t) => t.id === activeTab);

  return (
    <div className="min-h-screen bg-[#1e5438] flex flex-col">
      {/* Header — Sleek dark green with glass effect */}
      <header className="sticky top-0 z-30">
        {/* Top brand bar */}
        <div className="relative bg-gradient-to-r from-[#1e5438] via-[#2a6b4e] to-[#1e5438] border-b border-emerald-600/30">
          <div className="px-5 lg:px-10 py-2.5 flex items-center justify-between">
            {/* Logo + Brand */}
            <div className="flex items-center gap-3">
              <img
                src={MB_SYMBOL}
                alt="Minas Bird"
                className="h-10 lg:h-12 w-auto object-contain"
              />
              <div>
                <h1 className="text-white font-bold text-xl lg:text-2xl tracking-[0.14em] leading-none">
                  MINAS BIRD
                </h1>
                <p className="text-emerald-400/50 text-[9px] lg:text-[10px] tracking-[0.2em] font-light mt-1">
                  MANUAL OPERACIONAL
                </p>
              </div>
            </div>

            {/* Right side — Home button + status */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate("/")}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-900/30 border border-emerald-800/30 text-emerald-300/70 hover:text-emerald-200 hover:bg-emerald-900/50 transition-all text-xs"
              >
                <HomeIcon size={13} />
                <span className="hidden sm:inline">Início</span>
              </button>
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-900/20 border border-emerald-800/20">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.5)] animate-pulse" />
                <span className="text-[10px] text-emerald-300/50 font-mono">v1.1</span>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation tabs — refined glass style */}
        <div className="bg-[#1b4a35]/95 backdrop-blur-xl border-b border-emerald-600/20">
          <div className="px-3 lg:px-8 flex items-center overflow-x-auto scrollbar-hide">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id;
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "relative flex items-center gap-2.5 px-4 lg:px-5 py-3.5 text-[11px] lg:text-[12px] font-medium transition-all duration-300 whitespace-nowrap",
                    isActive
                      ? "text-emerald-300"
                      : "text-white/35 hover:text-white/60"
                  )}
                >
                  <Icon
                    size={15}
                    strokeWidth={isActive ? 2.2 : 1.6}
                    className={cn(
                      "transition-all duration-300",
                      isActive && "drop-shadow-[0_0_4px_rgba(110,231,183,0.4)]"
                    )}
                  />
                  <span className="hidden sm:inline tracking-wide">{tab.label}</span>
                  <span className="sm:hidden tracking-wide">{tab.shortLabel}</span>
                  {/* Active indicator */}
                  {isActive && (
                    <span className="absolute bottom-0 left-4 right-4 h-[2px] bg-gradient-to-r from-transparent via-emerald-400 to-transparent rounded-full shadow-[0_0_8px_rgba(52,211,153,0.3)]" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </header>

      {/* Content area */}
      <main ref={contentRef} className="flex-1 overflow-y-auto bg-[#f7f5f2]">
        {/* Content header breadcrumb */}
        <div className="bg-white/80 backdrop-blur-sm border-b border-stone-200/60 px-5 lg:px-10 py-3">
          <div className="flex items-center gap-2.5">
            {activeTabData && (
              <>
                <activeTabData.icon size={14} className="text-emerald-700/60" />
                <span className="text-sm font-medium text-stone-700 tracking-wide">
                  {activeTabData.label}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Main content */}
        <div className="px-4 lg:px-8 py-6 pb-16">
          {activeTab === "alimentacao" && (
            <div>
              {/* Sub-tab selector */}
              <div className="flex items-center gap-1 mb-6 bg-white rounded-xl border border-stone-200/80 shadow-sm p-1.5 w-fit">
                <button
                  onClick={() => setFeedingSubTab("original")}
                  className={cn(
                    "flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                    feedingSubTab === "original"
                      ? "bg-emerald-600 text-white shadow-md shadow-emerald-900/20"
                      : "text-stone-500 hover:text-stone-700 hover:bg-stone-50"
                  )}
                >
                  <Utensils size={14} />
                  Alimentação
                </button>
                <button
                  onClick={() => setFeedingSubTab("teste")}
                  className={cn(
                    "flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                    feedingSubTab === "teste"
                      ? "bg-amber-600 text-white shadow-md shadow-amber-900/20"
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

      {/* Footer — elegant dark */}
      <footer className="bg-[#1a4832] border-t border-emerald-600/20 py-3 px-6 flex items-center justify-center">
        <p className="text-[10px] text-emerald-300/40 font-medium tracking-[0.18em]">
          CRIATÓRIO MINAS BIRD · RIBEIRÃO VERMELHO — MG — 2026
        </p>
      </footer>
    </div>
  );
}
