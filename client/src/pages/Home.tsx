/**
 * Home Page — Minas Bird Manual Operacional Dashboard
 * Tropical Craft Design: sidebar + content area with smooth transitions
 * Includes special Feeding module alongside sector-based tasks
 */
import SectorContent from "@/components/SectorContent";
import FeedingModule from "@/components/FeedingModule";
import FeedingModuleTest from "@/components/FeedingModuleTest";
import ProgressMap from "@/components/ProgressMap";
import Sidebar from "@/components/Sidebar";
import SettingsPanel from "@/components/SettingsPanel";
import { sectors } from "@/data/sectors";
import { useState, useEffect, useRef } from "react";
import { BookOpen, ChevronLeft, ChevronRight, Utensils, Settings, LayoutGrid } from "lucide-react";

// All navigable items: sectors + special modules
const HOME_ID = "__home__";
const FEEDING_ID = "__alimentacao__";
const FEEDING_TEST_ID = "__alimentacao_teste__";
const SETTINGS_ID = "__configuracoes__";

type NavItem = {
  id: string;
  title: string;
  subtitle: string;
  isSpecial?: boolean;
};

const allNavItems: NavItem[] = [
  { id: HOME_ID, title: "Mapa de Progresso", subtitle: "Visão geral de todos os módulos" },
  { id: FEEDING_ID, title: "Alimentação", subtitle: "39 espécies · Protocolos · Calculadora" },
  { id: FEEDING_TEST_ID, title: "Alimentação Teste", subtitle: "Versão de teste para mudanças" },
  ...sectors.map(s => ({ id: s.id, title: s.title, subtitle: s.subtitle })),
  { id: SETTINGS_ID, title: "Configurações", subtitle: "Equipe e acessos" },
];

export default function Home() {
  const [activeItem, setActiveItem] = useState(HOME_ID);
  const contentRef = useRef<HTMLDivElement>(null);

  const currentSector = sectors.find((s) => s.id === activeItem);
  const isHome = activeItem === HOME_ID;
  const isFeeding = activeItem === FEEDING_ID;
  const isFeedingTest = activeItem === FEEDING_TEST_ID;
  const isSettings = activeItem === SETTINGS_ID;
  const currentIndex = allNavItems.findIndex((item) => item.id === activeItem);
  const currentNav = allNavItems[currentIndex];

  useEffect(() => {
    if (contentRef.current) {
      contentRef.current.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [activeItem]);

  const goToPrev = () => {
    if (currentIndex > 0) {
      setActiveItem(allNavItems[currentIndex - 1].id);
    }
  };

  const goToNext = () => {
    if (currentIndex < allNavItems.length - 1) {
      setActiveItem(allNavItems[currentIndex + 1].id);
    }
  };

  return (
    <div className="min-h-screen flex bg-background">
      <Sidebar activeSector={activeItem} onSectorChange={setActiveItem} />

      {/* Main content */}
      <main
        ref={contentRef}
        className="flex-1 lg:ml-72 h-screen overflow-y-auto"
      >
        {/* Top bar */}
        <div className="sticky top-0 z-20 bg-background/85 backdrop-blur-lg border-b border-border/30">
          <div className="px-6 lg:px-10 py-3.5 flex items-center justify-between">
            <div className="flex items-center gap-3 ml-12 lg:ml-0">
              <div className="flex items-center gap-2">
                {isHome ? (
                  <LayoutGrid size={14} className="text-primary/50" />
                ) : isFeeding ? (
                  <Utensils size={14} className="text-primary/50" />
                ) : isSettings ? (
                  <Settings size={14} className="text-primary/50" />
                ) : (
                  <BookOpen size={14} className="text-primary/50" />
                )}
                <p className="text-sm font-semibold text-foreground/70">
                  {currentNav?.title || ""}
                </p>
              </div>
              <span className="text-muted-foreground/20 hidden sm:inline">|</span>
              <p className="text-xs text-muted-foreground/50 hidden sm:block">
                {currentNav?.subtitle || ""}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={goToPrev}
                disabled={currentIndex === 0}
                className="p-1.5 rounded-lg hover:bg-muted/50 disabled:opacity-20 disabled:cursor-not-allowed transition-all"
                aria-label="Anterior"
              >
                <ChevronLeft size={16} className="text-muted-foreground" />
              </button>
              <span className="text-[11px] text-muted-foreground/40 font-semibold tabular-nums min-w-[32px] text-center">
                {currentIndex + 1}/{allNavItems.length}
              </span>
              <button
                onClick={goToNext}
                disabled={currentIndex === allNavItems.length - 1}
                className="p-1.5 rounded-lg hover:bg-muted/50 disabled:opacity-20 disabled:cursor-not-allowed transition-all"
                aria-label="Próximo"
              >
                <ChevronRight size={16} className="text-muted-foreground" />
              </button>
              <div className="hidden sm:flex items-center gap-2 ml-3 pl-3 border-l border-border/30">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <p className="text-[10px] text-muted-foreground/40 font-medium">
                  v1.1
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="px-6 lg:px-10 py-8 pb-20">
          {isHome ? (
            <ProgressMap onNavigate={setActiveItem} />
          ) : isFeeding ? (
            <FeedingModule />
          ) : isFeedingTest ? (
            <FeedingModuleTest />
          ) : isSettings ? (
            <SettingsPanel />
          ) : currentSector ? (
            <SectorContent sector={currentSector} />
          ) : null}
        </div>

        {/* Bottom navigation for mobile */}
        <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-background/90 backdrop-blur-lg border-t border-border/30 px-4 py-3 flex items-center justify-between z-20">
          <button
            onClick={goToPrev}
            disabled={currentIndex === 0}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-muted/30 disabled:opacity-20 disabled:cursor-not-allowed transition-all text-sm text-muted-foreground"
          >
            <ChevronLeft size={14} />
            <span className="text-xs font-medium">Anterior</span>
          </button>
          <span className="text-[11px] text-muted-foreground/50 font-semibold">
            {currentIndex + 1} de {allNavItems.length}
          </span>
          <button
            onClick={goToNext}
            disabled={currentIndex === allNavItems.length - 1}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-muted/30 disabled:opacity-20 disabled:cursor-not-allowed transition-all text-sm text-muted-foreground"
          >
            <span className="text-xs font-medium">Próximo</span>
            <ChevronRight size={14} />
          </button>
        </div>
      </main>
    </div>
  );
}
