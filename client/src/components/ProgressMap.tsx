/**
 * ProgressMap — 9 module cards in a 3x3 grid
 * All topics visible immediately, vibrant colors per module
 * Clicking a card expands it to show topic descriptions inline
 * Clicking a topic inside the expanded card shows its description
 */
import { sectors } from "@/data/sectors";
import type { Sector, TopicGroup } from "@/data/sectors";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Utensils, ChevronDown, ChevronRight } from "lucide-react";

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
  { header: "#059669", headerText: "#ffffff", dot: "#34d399", accent: "#d1fae5", border: "#6ee7b7", expandBg: "#ecfdf5", topicBg: "#f0fdf4" },
  { header: "#2563eb", headerText: "#ffffff", dot: "#60a5fa", accent: "#dbeafe", border: "#93c5fd", expandBg: "#eff6ff", topicBg: "#f0f7ff" },
  { header: "#d97706", headerText: "#ffffff", dot: "#fbbf24", accent: "#fef3c7", border: "#fcd34d", expandBg: "#fffbeb", topicBg: "#fefce8" },
  { header: "#dc2626", headerText: "#ffffff", dot: "#f87171", accent: "#fee2e2", border: "#fca5a5", expandBg: "#fef2f2", topicBg: "#fff5f5" },
  { header: "#7c3aed", headerText: "#ffffff", dot: "#a78bfa", accent: "#ede9fe", border: "#c4b5fd", expandBg: "#f5f3ff", topicBg: "#faf5ff" },
  { header: "#ea580c", headerText: "#ffffff", dot: "#fb923c", accent: "#fff7ed", border: "#fdba74", expandBg: "#fff7ed", topicBg: "#fffbf5" },
  { header: "#0891b2", headerText: "#ffffff", dot: "#22d3ee", accent: "#cffafe", border: "#67e8f9", expandBg: "#ecfeff", topicBg: "#f0fdfa" },
  { header: "#4f46e5", headerText: "#ffffff", dot: "#818cf8", accent: "#e0e7ff", border: "#a5b4fc", expandBg: "#eef2ff", topicBg: "#f5f7ff" },
  { header: "#be185d", headerText: "#ffffff", dot: "#f472b6", accent: "#fce7f3", border: "#f9a8d4", expandBg: "#fdf2f8", topicBg: "#fef1f7" },
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
  // Track which card is expanded
  const [expandedCard, setExpandedCard] = useState<string | null>(null);
  // Track which topic inside an expanded card is showing description
  const [expandedTopic, setExpandedTopic] = useState<string | null>(null);

  const toggleCard = (modId: string) => {
    if (expandedCard === modId) {
      setExpandedCard(null);
      setExpandedTopic(null);
    } else {
      setExpandedCard(modId);
      setExpandedTopic(null);
    }
  };

  const toggleTopic = (key: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedTopic(prev => prev === key ? null : key);
  };

  return (
    <div className="max-w-7xl mx-auto">
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {modules.map((mod, idx) => {
          const color = VIBRANT_COLORS[mod.colorIdx % VIBRANT_COLORS.length];
          const Icon = mod.icon;
          const isExpanded = expandedCard === mod.id;

          return (
            <motion.div
              key={mod.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.04, duration: 0.3 }}
              layout
              className={`rounded-2xl bg-white shadow-md overflow-hidden flex flex-col transition-shadow duration-200 ${
                isExpanded ? "shadow-xl ring-2 col-span-1 md:col-span-2 xl:col-span-3" : ""
              }`}
              style={{
                borderLeft: `4px solid ${color.header}`,
                ...(isExpanded ? { ringColor: color.border } : {}),
              }}
            >
              {/* Card Header — click to expand/collapse */}
              <div
                className="px-5 py-3.5 flex items-center gap-3 cursor-pointer hover:opacity-90 transition-opacity"
                style={{ backgroundColor: color.header }}
                onClick={() => toggleCard(mod.id)}
              >
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: "rgba(255,255,255,0.2)" }}
                >
                  <Icon size={20} style={{ color: color.headerText }} />
                </div>
                <h3
                  className="text-base font-bold flex-1"
                  style={{ color: color.headerText }}
                >
                  {mod.title}
                </h3>
                <span
                  className="text-xs font-bold px-2.5 py-1 rounded-full mr-2"
                  style={{ backgroundColor: "rgba(255,255,255,0.25)", color: color.headerText }}
                >
                  {mod.topics.length}
                </span>
                <motion.div
                  animate={{ rotate: isExpanded ? 180 : 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <ChevronDown size={20} style={{ color: color.headerText }} />
                </motion.div>
              </div>

              {/* Collapsed: show topic titles as compact list */}
              {!isExpanded && (
                <div className="px-3 py-3 flex-1">
                  <ul className="space-y-0.5">
                    {mod.topics.map((topic, tIdx) => (
                      <li key={tIdx}>
                        <div className="flex items-center gap-2.5 px-3 py-1.5">
                          <span
                            className="w-2 h-2 rounded-full flex-shrink-0"
                            style={{ backgroundColor: color.dot }}
                          />
                          <span className="text-sm text-stone-600 leading-snug">
                            {topic.title}
                          </span>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Expanded: show topics with clickable descriptions */}
              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.25, ease: "easeOut" }}
                    className="overflow-hidden"
                  >
                    <div
                      className="px-5 py-4"
                      style={{ backgroundColor: color.expandBg }}
                    >
                      {/* Action button to navigate to module */}
                      <div className="flex items-center justify-between mb-4">
                        <p className="text-sm font-medium text-stone-500">
                          Clique em um tópico para ver os detalhes
                        </p>
                        <button
                          onClick={(e) => { e.stopPropagation(); onNavigate(mod.id); }}
                          className="text-sm font-semibold px-4 py-2 rounded-lg transition-colors hover:opacity-80"
                          style={{ backgroundColor: color.header, color: color.headerText }}
                        >
                          Abrir Módulo
                        </button>
                      </div>

                      {/* Topics grid — 2 columns on expanded view */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {mod.topics.map((topic, tIdx) => {
                          const topicKey = `${mod.id}::${tIdx}`;
                          const isTopicOpen = expandedTopic === topicKey;

                          return (
                            <div
                              key={tIdx}
                              className={`rounded-xl transition-all duration-200 overflow-hidden ${
                                isTopicOpen ? "md:col-span-2" : ""
                              }`}
                              style={{
                                backgroundColor: isTopicOpen ? color.topicBg : "#ffffff",
                                border: `1.5px solid ${isTopicOpen ? color.border : "#e7e5e4"}`,
                                boxShadow: isTopicOpen ? `0 2px 8px ${color.border}40` : "none",
                              }}
                            >
                              <button
                                onClick={(e) => toggleTopic(topicKey, e)}
                                className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-stone-50/50 transition-colors"
                              >
                                <motion.div
                                  animate={{ rotate: isTopicOpen ? 90 : 0 }}
                                  transition={{ duration: 0.15 }}
                                  className="flex-shrink-0"
                                >
                                  <ChevronRight size={16} style={{ color: isTopicOpen ? color.header : "#a8a29e" }} />
                                </motion.div>
                                <span
                                  className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                                  style={{ backgroundColor: color.dot }}
                                />
                                <span className={`text-[15px] leading-snug transition-colors ${
                                  isTopicOpen ? "text-stone-900 font-semibold" : "text-stone-700"
                                }`}>
                                  {topic.title}
                                </span>
                              </button>

                              {/* Topic description */}
                              <AnimatePresence>
                                {isTopicOpen && (
                                  <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: "auto" }}
                                    exit={{ opacity: 0, height: 0 }}
                                    transition={{ duration: 0.2 }}
                                    className="overflow-hidden"
                                  >
                                    <div
                                      className="px-5 pb-4 pt-1 ml-9"
                                      style={{ borderTop: `1px solid ${color.border}40` }}
                                    >
                                      <p className="text-[15px] text-stone-600 leading-relaxed">
                                        {topic.description}
                                      </p>
                                    </div>
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
