/**
 * Sidebar Navigation — Tropical Craft Design
 * DM Serif Display for titles, DM Sans for body
 * Deep forest-green sidebar with golden accents
 * Alimentação is the first module in the unified list
 */
import { sectors } from "@/data/sectors";
import type { Sector, TopicGroup } from "@/data/sectors";
import { cn } from "@/lib/utils";
import { Menu, X, Feather, BookOpen, Utensils } from "lucide-react";
import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface SidebarProps {
  activeSector: string;
  onSectorChange: (id: string) => void;
}

const LOGO_URL = "https://d2xsxph8kpxj0f.cloudfront.net/310519663426530649/GUVCZBcaMUVxbcauwK97Fr/logo3d_d58b8c94.png";
const FEEDING_ID = "__alimentacao__";

// Unified nav items: Alimentação first, then all sectors
type NavEntry = {
  id: string;
  title: string;
  subtitle: string;
  icon: typeof Utensils;
  count: number;
};

export default function Sidebar({ activeSector, onSectorChange }: SidebarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const navItems: NavEntry[] = useMemo(() => {
    const sectorItems = sectors.map((s: Sector) => ({
      id: s.id,
      title: s.title,
      subtitle: s.subtitle,
      icon: s.icon,
      count: s.topicGroups.reduce((sum: number, g: TopicGroup) => sum + g.topics.length, 0),
    }));

    const feedingItem: NavEntry = {
      id: FEEDING_ID,
      title: "Alimentação",
      subtitle: "39 espécies · Protocolos",
      icon: Utensils,
      count: 39,
    };

    return [feedingItem, ...sectorItems];
  }, []);

  const totalTopics = useMemo(
    () => navItems.reduce((sum, item) => sum + item.count, 0),
    [navItems]
  );

  const handleSelect = (id: string) => {
    onSectorChange(id);
    setMobileOpen(false);
  };

  const sidebarContent = (
    <aside className="h-full w-72 bg-sidebar flex flex-col">
      {/* Logo area */}
      <div className="px-6 pt-6 pb-5 border-b border-sidebar-border/50">
        <div className="flex items-center gap-3">
          <img
            src={LOGO_URL}
            alt="Minas Bird"
            className="w-12 h-12 rounded-xl object-contain bg-white/5 p-0.5 shadow-sm"
          />
          <div>
            <h1 className="font-serif text-lg text-sidebar-foreground leading-tight">
              Minas Bird
            </h1>
            <p className="text-[10px] text-sidebar-foreground/40 font-semibold tracking-[0.15em] uppercase mt-0.5">
              Manual Operacional
            </p>
          </div>
        </div>
        {/* Total stats */}
        <div className="mt-4 flex items-center gap-2 bg-sidebar-accent/40 rounded-lg px-3 py-2">
          <BookOpen size={13} className="text-sidebar-primary" />
          <span className="text-[11px] text-sidebar-foreground/60">
            <span className="font-bold text-sidebar-primary">{totalTopics}</span> tópicos em <span className="font-bold text-sidebar-primary">{navItems.length}</span> módulos
          </span>
        </div>
      </div>

      {/* Navigation — unified list */}
      <nav className="flex-1 overflow-y-auto py-5 px-3 scrollbar-thin">
        <p className="px-3 mb-3 text-[9px] font-bold tracking-[0.2em] uppercase text-sidebar-foreground/25">
          Módulos
        </p>
        <ul className="space-y-0.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeSector === item.id;
            return (
              <li key={item.id}>
                <button
                  onClick={() => handleSelect(item.id)}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all duration-200 relative",
                    isActive
                      ? "bg-sidebar-accent text-sidebar-accent-foreground"
                      : "text-sidebar-foreground/60 hover:bg-sidebar-accent/40 hover:text-sidebar-foreground/90"
                  )}
                >
                  {isActive && (
                    <motion.div
                      layoutId="activeIndicator"
                      className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-6 rounded-r-full bg-sidebar-primary"
                      transition={{ type: "spring", stiffness: 400, damping: 30 }}
                    />
                  )}
                  <span
                    className={cn(
                      "flex items-center justify-center w-8 h-8 rounded-lg text-sm transition-all duration-200",
                      isActive
                        ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-sm"
                        : "bg-sidebar-foreground/8 text-sidebar-foreground/40"
                    )}
                  >
                    <Icon size={15} />
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className={cn(
                      "text-[13px] truncate transition-all",
                      isActive ? "font-semibold" : "font-medium"
                    )}>
                      {item.title}
                    </p>
                    <p className={cn(
                      "text-[10px] truncate transition-opacity",
                      isActive ? "opacity-50" : "opacity-30"
                    )}>
                      {item.subtitle}
                    </p>
                  </div>
                  <span
                    className={cn(
                      "text-[10px] font-bold min-w-[22px] h-5 flex items-center justify-center rounded-md transition-all",
                      isActive
                        ? "bg-sidebar-primary/25 text-sidebar-primary"
                        : "text-sidebar-foreground/20"
                    )}
                  >
                    {item.count}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Footer */}
      <div className="px-6 py-4 border-t border-sidebar-border/30">
        <div className="flex items-center justify-center gap-1.5 text-sidebar-foreground/20">
          <Feather size={10} />
          <p className="text-[9px] font-medium tracking-wider uppercase">
            Criatório Minas Bird
          </p>
        </div>
        <p className="text-[9px] text-sidebar-foreground/15 text-center mt-1">
          Ribeirão Vermelho — MG — {new Date().getFullYear()}
        </p>
      </div>
    </aside>
  );

  return (
    <>
      {/* Mobile toggle */}
      <button
        onClick={() => setMobileOpen(!mobileOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 bg-sidebar text-sidebar-foreground p-2.5 rounded-xl shadow-lg border border-sidebar-border/30"
        aria-label="Menu"
      >
        {mobileOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Mobile overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="lg:hidden fixed inset-0 bg-black/50 backdrop-blur-sm z-30"
            onClick={() => setMobileOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Desktop sidebar */}
      <div className="hidden lg:block fixed top-0 left-0 h-full z-40 w-72">
        {sidebarContent}
      </div>

      {/* Mobile sidebar */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ type: "spring", stiffness: 350, damping: 35 }}
            className="lg:hidden fixed top-0 left-0 h-full z-40"
          >
            {sidebarContent}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
