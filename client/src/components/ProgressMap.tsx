/**
 * ProgressMap — 9 module cards in a 3x3 grid
 * All topics visible immediately, vibrant colors per module
 * Clicking a topic opens a detail panel below the grid (no scroll needed)
 * Larger fonts for readability
 */
import { sectors } from "@/data/sectors";
import type { Sector, TopicGroup } from "@/data/sectors";
import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Utensils, ChevronRight, X } from "lucide-react";

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
  { header: "#059669", headerText: "#ffffff", dot: "#34d399", accent: "#d1fae5", border: "#6ee7b7", expandBg: "#ecfdf5" },
  { header: "#2563eb", headerText: "#ffffff", dot: "#60a5fa", accent: "#dbeafe", border: "#93c5fd", expandBg: "#eff6ff" },
  { header: "#d97706", headerText: "#ffffff", dot: "#fbbf24", accent: "#fef3c7", border: "#fcd34d", expandBg: "#fffbeb" },
  { header: "#dc2626", headerText: "#ffffff", dot: "#f87171", accent: "#fee2e2", border: "#fca5a5", expandBg: "#fef2f2" },
  { header: "#7c3aed", headerText: "#ffffff", dot: "#a78bfa", accent: "#ede9fe", border: "#c4b5fd", expandBg: "#f5f3ff" },
  { header: "#ea580c", headerText: "#ffffff", dot: "#fb923c", accent: "#fff7ed", border: "#fdba74", expandBg: "#fff7ed" },
  { header: "#0891b2", headerText: "#ffffff", dot: "#22d3ee", accent: "#cffafe", border: "#67e8f9", expandBg: "#ecfeff" },
  { header: "#4f46e5", headerText: "#ffffff", dot: "#818cf8", accent: "#e0e7ff", border: "#a5b4fc", expandBg: "#eef2ff" },
  { header: "#be185d", headerText: "#ffffff", dot: "#f472b6", accent: "#fce7f3", border: "#f9a8d4", expandBg: "#fdf2f8" },
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
  // Track which topic is expanded: "moduleId::topicIdx" or null
  const [expandedTopic, setExpandedTopic] = useState<string | null>(null);
  const detailRef = useRef<HTMLDivElement>(null);

  const toggleTopic = (key: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedTopic(prev => prev === key ? null : key);
  };

  // Scroll detail panel into view when it opens
  useEffect(() => {
    if (expandedTopic && detailRef.current) {
      setTimeout(() => {
        detailRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }, 100);
    }
  }, [expandedTopic]);

  // Parse expanded topic info
  const expandedInfo = expandedTopic ? (() => {
    const [modId, tIdxStr] = expandedTopic.split("::");
    const mod = modules.find(m => m.id === modId);
    if (!mod) return null;
    const tIdx = parseInt(tIdxStr, 10);
    const topic = mod.topics[tIdx];
    if (!topic) return null;
    const color = VIBRANT_COLORS[mod.colorIdx % VIBRANT_COLORS.length];
    return { mod, topic, color, tIdx };
  })() : null;

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
                className="px-5 py-3.5 flex items-center gap-3 cursor-pointer hover:opacity-90 transition-opacity"
                style={{ backgroundColor: color.header }}
                onClick={() => onNavigate(mod.id)}
              >
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: "rgba(255,255,255,0.2)" }}
                >
                  <Icon size={20} style={{ color: color.headerText }} />
                </div>
                <h3
                  className="text-base font-bold flex-1 truncate"
                  style={{ color: color.headerText }}
                >
                  {mod.title}
                </h3>
                <span
                  className="text-xs font-bold px-2.5 py-1 rounded-full"
                  style={{ backgroundColor: "rgba(255,255,255,0.25)", color: color.headerText }}
                >
                  {mod.topics.length}
                </span>
              </div>

              {/* Topics — clickable to expand description */}
              <div className="px-3 py-3 flex-1">
                <ul className="space-y-0.5">
                  {mod.topics.map((topic, tIdx) => {
                    const topicKey = `${mod.id}::${tIdx}`;
                    const isExpanded = expandedTopic === topicKey;

                    return (
                      <li key={tIdx}>
                        <button
                          onClick={(e) => toggleTopic(topicKey, e)}
                          className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left transition-all duration-150 ${
                            isExpanded
                              ? "ring-2 shadow-sm"
                              : "hover:bg-stone-50"
                          }`}
                          style={isExpanded ? {
                            backgroundColor: color.expandBg,
                            boxShadow: `0 0 0 2px ${color.border}`,
                          } : undefined}
                        >
                          <span className="flex-shrink-0 transition-transform duration-200" style={{ transform: isExpanded ? "rotate(90deg)" : "rotate(0deg)" }}>
                            <ChevronRight size={14} style={{ color: isExpanded ? color.header : color.dot }} />
                          </span>
                          <span
                            className="w-2 h-2 rounded-full flex-shrink-0"
                            style={{ backgroundColor: color.dot }}
                          />
                          <span className={`text-sm leading-snug transition-colors ${isExpanded ? "text-stone-900 font-semibold" : "text-stone-700"}`}>
                            {topic.title}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Detail panel — opens below the grid, full width, no scroll needed */}
      <AnimatePresence>
        {expandedInfo && (
          <motion.div
            ref={detailRef}
            initial={{ opacity: 0, y: 20, height: 0 }}
            animate={{ opacity: 1, y: 0, height: "auto" }}
            exit={{ opacity: 0, y: 10, height: 0 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="overflow-hidden mt-5"
          >
            <div
              className="rounded-2xl border-2 shadow-lg overflow-hidden"
              style={{ borderColor: expandedInfo.color.border }}
            >
              {/* Detail header */}
              <div
                className="px-6 py-4 flex items-center gap-4"
                style={{ backgroundColor: expandedInfo.color.header }}
              >
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: "rgba(255,255,255,0.2)" }}
                >
                  <expandedInfo.mod.icon size={20} style={{ color: expandedInfo.color.headerText }} />
                </div>
                <div className="flex-1">
                  <p className="text-xs font-medium opacity-70" style={{ color: expandedInfo.color.headerText }}>
                    {expandedInfo.mod.title}
                  </p>
                  <h3 className="text-lg font-bold" style={{ color: expandedInfo.color.headerText }}>
                    {expandedInfo.topic.title}
                  </h3>
                </div>
                <button
                  onClick={() => setExpandedTopic(null)}
                  className="w-9 h-9 rounded-lg flex items-center justify-center hover:bg-white/20 transition-colors"
                >
                  <X size={20} style={{ color: expandedInfo.color.headerText }} />
                </button>
              </div>

              {/* Detail content */}
              <div
                className="px-6 py-5"
                style={{ backgroundColor: expandedInfo.color.expandBg }}
              >
                <p className="text-base text-stone-700 leading-relaxed">
                  {expandedInfo.topic.description}
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
