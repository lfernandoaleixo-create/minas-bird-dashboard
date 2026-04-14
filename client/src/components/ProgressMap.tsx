/**
 * ProgressMap — 9 module cards in a 3x3 grid
 * All topics visible immediately, vibrant colors per module
 * Clicking a topic expands to show description/suggestion
 */
import { sectors } from "@/data/sectors";
import type { Sector, TopicGroup } from "@/data/sectors";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Utensils, ChevronRight } from "lucide-react";

interface ProgressMapProps {
  onNavigate: (moduleId: string) => void;
}

const FEEDING_ID = "__alimentacao__";

// Alimentação topics with descriptions
const FEEDING_TOPICS: TopicItem[] = [
  {
    title: "Dietas por Espécie",
    description: "Criação e gerenciamento de dietas balanceadas para cada espécie. Inclui seleção de ração base, vegetais, frutas e sementes/proteicos. Cada dieta é vinculada a uma fase (manutenção, reprodução, filhotes, muda) e tem cor de referência para o calendário.",
  },
  {
    title: "Calendário Alimentar",
    description: "Planejamento semanal e mensal de alimentação por espécie. Permite pintar cada dia da semana com a dieta correspondente usando o sistema de cores. Gera PDF para impressão e fixação na cozinha do criatório.",
  },
  {
    title: "Calculadora Nutricional",
    description: "Cálculo automático de quantidades de alimento por número de aves e peso médio da espécie. Ajusta proporções de ração, vegetais, frutas e suplementos conforme a fase da ave.",
  },
  {
    title: "PDFs Operacionais",
    description: "Geração de fichas impressas padronizadas: rotina do tratador, lista de compras semanal, guia de preparo de alimentos e ficha individual de dieta. Todos otimizados para impressão com economia de tinta.",
  },
  {
    title: "Sistema de Cores",
    description: "Cores unificadas entre calendário e fichas de dieta impressas. O tratador identifica a cor no calendário na parede e pega a ficha de dieta correspondente. Cada dieta tem uma cor única escolhida ao salvar.",
  },
];

interface TopicItem {
  title: string;
  description: string;
}

interface ModuleCardData {
  id: string;
  title: string;
  icon: typeof Utensils;
  topics: TopicItem[];
  colorIdx: number;
}

// Vibrant color palette — one per module
const VIBRANT_COLORS = [
  { header: "#059669", headerText: "#ffffff", dot: "#34d399", accent: "#d1fae5", border: "#6ee7b7", expandBg: "#ecfdf5" },  // Emerald
  { header: "#2563eb", headerText: "#ffffff", dot: "#60a5fa", accent: "#dbeafe", border: "#93c5fd", expandBg: "#eff6ff" },  // Blue
  { header: "#d97706", headerText: "#ffffff", dot: "#fbbf24", accent: "#fef3c7", border: "#fcd34d", expandBg: "#fffbeb" },  // Amber
  { header: "#dc2626", headerText: "#ffffff", dot: "#f87171", accent: "#fee2e2", border: "#fca5a5", expandBg: "#fef2f2" },  // Red
  { header: "#7c3aed", headerText: "#ffffff", dot: "#a78bfa", accent: "#ede9fe", border: "#c4b5fd", expandBg: "#f5f3ff" },  // Violet
  { header: "#ea580c", headerText: "#ffffff", dot: "#fb923c", accent: "#fff7ed", border: "#fdba74", expandBg: "#fff7ed" },  // Orange
  { header: "#0891b2", headerText: "#ffffff", dot: "#22d3ee", accent: "#cffafe", border: "#67e8f9", expandBg: "#ecfeff" },  // Cyan
  { header: "#4f46e5", headerText: "#ffffff", dot: "#818cf8", accent: "#e0e7ff", border: "#a5b4fc", expandBg: "#eef2ff" },  // Indigo
  { header: "#be185d", headerText: "#ffffff", dot: "#f472b6", accent: "#fce7f3", border: "#f9a8d4", expandBg: "#fdf2f8" },  // Pink
];

function buildModules(): ModuleCardData[] {
  const feedingModule: ModuleCardData = {
    id: FEEDING_ID,
    title: "Alimentação",
    icon: Utensils,
    topics: FEEDING_TOPICS,
    colorIdx: 0,
  };

  const sectorModules: ModuleCardData[] = sectors.map((s: Sector, i: number) => {
    // Flatten all topics from all groups, keeping descriptions
    const allTopics: TopicItem[] = [];
    s.topicGroups.forEach((g: TopicGroup) => {
      g.topics.forEach(t => allTopics.push({
        title: t.title,
        description: t.description,
      }));
    });
    return {
      id: s.id,
      title: s.title,
      icon: s.icon,
      topics: allTopics,
      colorIdx: i + 1,
    };
  });

  return [feedingModule, ...sectorModules];
}

export default function ProgressMap({ onNavigate }: ProgressMapProps) {
  const modules = buildModules();
  const [expandedTopics, setExpandedTopics] = useState<Set<string>>(new Set());

  const toggleTopic = (key: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedTopics(prev => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  return (
    <div className="max-w-7xl mx-auto">
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {modules.map((mod, idx) => {
          const color = VIBRANT_COLORS[mod.colorIdx % VIBRANT_COLORS.length];
          const Icon = mod.icon;

          return (
            <motion.div
              key={mod.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.04, duration: 0.3 }}
              className="rounded-2xl bg-white shadow-md overflow-hidden flex flex-col"
              style={{ borderLeft: `4px solid ${color.header}` }}
            >
              {/* Card Header — clickable to navigate */}
              <div
                className="px-4 py-3 flex items-center gap-3 cursor-pointer hover:opacity-90 transition-opacity"
                style={{ backgroundColor: color.header }}
                onClick={() => onNavigate(mod.id)}
              >
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: "rgba(255,255,255,0.2)" }}
                >
                  <Icon size={18} style={{ color: color.headerText }} />
                </div>
                <h3
                  className="text-sm font-bold flex-1 truncate"
                  style={{ color: color.headerText }}
                >
                  {mod.title}
                </h3>
                <span
                  className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                  style={{ backgroundColor: "rgba(255,255,255,0.25)", color: color.headerText }}
                >
                  {mod.topics.length}
                </span>
              </div>

              {/* Topics — clickable to expand description */}
              <div className="px-3 py-2 flex-1 max-h-[400px] overflow-y-auto">
                <ul className="space-y-0.5">
                  {mod.topics.map((topic, tIdx) => {
                    const topicKey = `${mod.id}::${tIdx}`;
                    const isExpanded = expandedTopics.has(topicKey);

                    return (
                      <li key={tIdx}>
                        <button
                          onClick={(e) => toggleTopic(topicKey, e)}
                          className="w-full flex items-start gap-2 px-2 py-1.5 rounded-lg text-left transition-all duration-150 hover:bg-stone-50"
                        >
                          <span className="flex-shrink-0 mt-[3px] transition-transform duration-200" style={{ transform: isExpanded ? "rotate(90deg)" : "rotate(0deg)" }}>
                            <ChevronRight size={11} style={{ color: color.dot }} />
                          </span>
                          <span
                            className="w-1.5 h-1.5 rounded-full flex-shrink-0 mt-[5px]"
                            style={{ backgroundColor: color.dot }}
                          />
                          <span className={`text-[11px] leading-snug transition-colors ${isExpanded ? "text-stone-900 font-medium" : "text-stone-600"}`}>
                            {topic.title}
                          </span>
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
                              <div
                                className="ml-7 mr-1 mb-1.5 px-3 py-2.5 rounded-lg border"
                                style={{
                                  backgroundColor: color.expandBg,
                                  borderColor: color.border,
                                }}
                              >
                                <p className="text-[11px] text-stone-600 leading-relaxed">
                                  {topic.description}
                                </p>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
