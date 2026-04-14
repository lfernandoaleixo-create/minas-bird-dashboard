/**
 * ProgressMap — 9 module cards in a 3x3 grid
 * All topics visible immediately, vibrant colors per module, no active/pending distinction
 */
import { sectors } from "@/data/sectors";
import type { Sector, TopicGroup } from "@/data/sectors";
import { motion } from "framer-motion";
import { Utensils } from "lucide-react";

interface ProgressMapProps {
  onNavigate: (moduleId: string) => void;
}

const FEEDING_ID = "__alimentacao__";

// Alimentação topics (special module — not in sectors data)
const FEEDING_TOPICS = [
  "Dietas por Espécie",
  "Calendário Alimentar",
  "Calculadora Nutricional",
  "PDFs Operacionais",
  "Sistema de Cores",
];

// Vibrant color palette — one per module
const VIBRANT_COLORS = [
  { header: "#059669", headerText: "#ffffff", dot: "#34d399", accent: "#d1fae5", border: "#6ee7b7" },  // Emerald
  { header: "#2563eb", headerText: "#ffffff", dot: "#60a5fa", accent: "#dbeafe", border: "#93c5fd" },  // Blue
  { header: "#d97706", headerText: "#ffffff", dot: "#fbbf24", accent: "#fef3c7", border: "#fcd34d" },  // Amber
  { header: "#dc2626", headerText: "#ffffff", dot: "#f87171", accent: "#fee2e2", border: "#fca5a5" },  // Red
  { header: "#7c3aed", headerText: "#ffffff", dot: "#a78bfa", accent: "#ede9fe", border: "#c4b5fd" },  // Violet
  { header: "#ea580c", headerText: "#ffffff", dot: "#fb923c", accent: "#fff7ed", border: "#fdba74" },  // Orange
  { header: "#0891b2", headerText: "#ffffff", dot: "#22d3ee", accent: "#cffafe", border: "#67e8f9" },  // Cyan
  { header: "#4f46e5", headerText: "#ffffff", dot: "#818cf8", accent: "#e0e7ff", border: "#a5b4fc" },  // Indigo
  { header: "#be185d", headerText: "#ffffff", dot: "#f472b6", accent: "#fce7f3", border: "#f9a8d4" },  // Pink
];

interface ModuleCardData {
  id: string;
  title: string;
  icon: typeof Utensils;
  topics: string[];
  colorIdx: number;
}

function buildModules(): ModuleCardData[] {
  const feedingModule: ModuleCardData = {
    id: FEEDING_ID,
    title: "Alimentação",
    icon: Utensils,
    topics: FEEDING_TOPICS,
    colorIdx: 0,
  };

  const sectorModules: ModuleCardData[] = sectors.map((s: Sector, i: number) => {
    // Flatten all topics from all groups
    const allTopics: string[] = [];
    s.topicGroups.forEach((g: TopicGroup) => {
      g.topics.forEach(t => allTopics.push(t.title));
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
              className="rounded-2xl bg-white shadow-md overflow-hidden flex flex-col cursor-pointer hover:shadow-lg transition-shadow duration-200"
              style={{ borderLeft: `4px solid ${color.header}` }}
              onClick={() => onNavigate(mod.id)}
            >
              {/* Card Header */}
              <div
                className="px-4 py-3 flex items-center gap-3"
                style={{ backgroundColor: color.header }}
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

              {/* All Topics Listed */}
              <div className="px-4 py-3 flex-1">
                <ul className="space-y-1">
                  {mod.topics.map((topic, tIdx) => (
                    <li key={tIdx} className="flex items-start gap-2">
                      <span
                        className="w-1.5 h-1.5 rounded-full flex-shrink-0 mt-[5px]"
                        style={{ backgroundColor: color.dot }}
                      />
                      <span className="text-[11px] text-stone-700 leading-snug">
                        {topic}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
