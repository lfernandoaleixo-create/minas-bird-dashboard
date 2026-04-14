/**
 * ProgressMap — 9 module cards in a 3x3 grid
 * Each card shows the module name + topic groups listed directly
 * Clicking a topic group expands to show its description and topics
 */
import { sectors } from "@/data/sectors";
import type { Sector, TopicGroup } from "@/data/sectors";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Utensils,
  ChevronDown,
  ChevronRight,
  Circle,
} from "lucide-react";

interface ProgressMapProps {
  onNavigate: (moduleId: string) => void;
}

const FEEDING_ID = "__alimentacao__";

// Alimentação module (special — not in sectors data)
const FEEDING_GROUPS = [
  { id: "dietas", title: "Dietas por Espécie", description: "Criação e gerenciamento de dietas balanceadas para cada espécie do criatório." },
  { id: "calendario", title: "Calendário Alimentar", description: "Planejamento semanal/mensal de alimentação com sistema de cores." },
  { id: "calculadora", title: "Calculadora Nutricional", description: "Cálculo automático de quantidades por número de aves e peso." },
  { id: "pdfs", title: "PDFs Operacionais", description: "Geração de fichas impressas: rotina, lista de compras, guia de preparo." },
  { id: "cores", title: "Sistema de Cores", description: "Cores unificadas entre calendário e fichas de dieta para fácil identificação." },
];

interface ModuleCardData {
  id: string;
  number: number;
  title: string;
  icon: typeof Utensils;
  color: string;
  groups: { id: string; title: string; description: string; topicCount?: number }[];
  isActive: boolean;
}

function buildModules(): ModuleCardData[] {
  const feedingModule: ModuleCardData = {
    id: FEEDING_ID,
    number: 1,
    title: "Alimentação",
    icon: Utensils,
    color: "emerald",
    groups: FEEDING_GROUPS,
    isActive: true,
  };

  const sectorModules: ModuleCardData[] = sectors.map((s: Sector) => ({
    id: s.id,
    number: s.number,
    title: s.title,
    icon: s.icon,
    color: s.color,
    groups: s.topicGroups.map((g: TopicGroup) => ({
      id: g.id,
      title: g.title,
      description: g.description,
      topicCount: g.topics.length,
    })),
    isActive: false,
  }));

  return [feedingModule, ...sectorModules];
}

// Color map for module accent
const MODULE_COLORS: Record<string, { bg: string; border: string; text: string; dot: string; headerBg: string }> = {
  emerald:  { bg: "bg-emerald-50",  border: "border-emerald-200",  text: "text-emerald-700",  dot: "bg-emerald-400", headerBg: "bg-emerald-600" },
  sky:      { bg: "bg-sky-50",      border: "border-sky-200",      text: "text-sky-700",      dot: "bg-sky-400",     headerBg: "bg-sky-600" },
  amber:    { bg: "bg-amber-50",    border: "border-amber-200",    text: "text-amber-700",    dot: "bg-amber-400",   headerBg: "bg-amber-600" },
  rose:     { bg: "bg-rose-50",     border: "border-rose-200",     text: "text-rose-700",     dot: "bg-rose-400",    headerBg: "bg-rose-600" },
  violet:   { bg: "bg-violet-50",   border: "border-violet-200",   text: "text-violet-700",   dot: "bg-violet-400",  headerBg: "bg-violet-600" },
  orange:   { bg: "bg-orange-50",   border: "border-orange-200",   text: "text-orange-700",   dot: "bg-orange-400",  headerBg: "bg-orange-600" },
  cyan:     { bg: "bg-cyan-50",     border: "border-cyan-200",     text: "text-cyan-700",     dot: "bg-cyan-400",    headerBg: "bg-cyan-600" },
  slate:    { bg: "bg-slate-50",    border: "border-slate-200",    text: "text-slate-700",    dot: "bg-slate-400",   headerBg: "bg-slate-600" },
  teal:     { bg: "bg-teal-50",     border: "border-teal-200",     text: "text-teal-700",     dot: "bg-teal-400",    headerBg: "bg-teal-600" },
  stone:    { bg: "bg-stone-50",    border: "border-stone-200",    text: "text-stone-700",    dot: "bg-stone-400",   headerBg: "bg-stone-600" },
};

function getColors(color: string) {
  return MODULE_COLORS[color] || MODULE_COLORS.stone;
}

export default function ProgressMap({ onNavigate }: ProgressMapProps) {
  const modules = buildModules();
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  const toggleGroup = (groupKey: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(groupKey)) {
        next.delete(groupKey);
      } else {
        next.add(groupKey);
      }
      return next;
    });
  };

  return (
    <div className="max-w-7xl mx-auto">
      {/* Grid 3x3 */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {modules.map((mod, idx) => {
          const colors = getColors(mod.color);
          const Icon = mod.icon;

          return (
            <motion.div
              key={mod.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05, duration: 0.35 }}
              className={`rounded-xl border bg-white shadow-sm overflow-hidden flex flex-col ${
                mod.isActive ? `${colors.border} border-2` : "border-stone-200/70"
              }`}
            >
              {/* Card Header */}
              <div
                className={`px-4 py-3 flex items-center gap-3 cursor-pointer hover:opacity-90 transition-opacity ${
                  mod.isActive ? colors.headerBg : "bg-stone-500"
                }`}
                onClick={() => onNavigate(mod.id)}
              >
                <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center flex-shrink-0">
                  <Icon size={16} className="text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-white truncate">
                      {mod.title}
                    </h3>
                    {mod.isActive && (
                      <span className="text-[8px] font-bold bg-white/25 text-white px-1.5 py-0.5 rounded-full uppercase tracking-wider">
                        Ativo
                      </span>
                    )}
                  </div>
                </div>
                <span className="text-[10px] font-bold text-white/60">
                  {mod.groups.length}
                </span>
              </div>

              {/* Topic Groups List */}
              <div className="flex-1 px-3 py-2 space-y-0.5 max-h-[320px] overflow-y-auto">
                {mod.groups.map((group) => {
                  const groupKey = `${mod.id}::${group.id}`;
                  const isExpanded = expandedGroups.has(groupKey);

                  return (
                    <div key={group.id}>
                      <button
                        onClick={() => toggleGroup(groupKey)}
                        className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left transition-all duration-150 hover:bg-stone-50 ${
                          isExpanded ? "bg-stone-50" : ""
                        }`}
                      >
                        <span className="flex-shrink-0">
                          {isExpanded ? (
                            <ChevronDown size={12} className="text-stone-400" />
                          ) : (
                            <ChevronRight size={12} className="text-stone-300" />
                          )}
                        </span>
                        <Circle size={5} className={`flex-shrink-0 ${mod.isActive ? colors.text : "text-stone-300"} fill-current`} />
                        <span className={`text-xs font-medium truncate ${
                          isExpanded ? "text-stone-800" : "text-stone-600"
                        }`}>
                          {group.title}
                        </span>
                        {group.topicCount !== undefined && group.topicCount > 0 && (
                          <span className="text-[9px] text-stone-400 ml-auto flex-shrink-0">
                            {group.topicCount}
                          </span>
                        )}
                      </button>

                      {/* Expanded description */}
                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden"
                          >
                            <div className="ml-7 mr-2 mb-2 px-3 py-2 bg-stone-50 rounded-lg border border-stone-100">
                              <p className="text-[11px] text-stone-500 leading-relaxed">
                                {group.description}
                              </p>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
