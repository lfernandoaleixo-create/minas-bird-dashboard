/**
 * ProgressMap — Vertical list of module cards with drag-and-drop priority ordering
 * All cards start CLOSED (only title header visible)
 * Click to expand and see topics
 * Drag to reorder priority (top = highest priority)
 * Order persisted to database (public, no auth required)
 */
import { sectors } from "@/data/sectors";
import type { Sector, TopicGroup } from "@/data/sectors";
import { useState, useEffect, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Utensils, ChevronDown, ChevronRight, GripVertical } from "lucide-react";
import { trpc } from "@/lib/trpc";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface ProgressMapProps {
  onNavigate: (moduleId: string) => void;
}

const FEEDING_ID = "__alimentacao__";

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

// Alimentação topics
const FEEDING_TOPICS: TopicItem[] = [
  { title: "Dietas por Espécie", description: "Criação e gerenciamento de dietas balanceadas para cada espécie. Inclui seleção de ração base, vegetais, frutas e sementes/proteicos. Cada dieta é vinculada a uma fase (manutenção, reprodução, filhotes, muda) e tem cor de referência para o calendário." },
  { title: "Calendário Alimentar", description: "Planejamento semanal e mensal de alimentação por espécie. Permite pintar cada dia da semana com a dieta correspondente usando o sistema de cores. Gera PDF para impressão e fixação na cozinha do criatório." },
  { title: "Calculadora Nutricional", description: "Cálculo automático de quantidades de alimento por número de aves e peso médio da espécie. Ajusta proporções de ração, vegetais, frutas e suplementos conforme a fase da ave." },
  { title: "PDFs Operacionais", description: "Geração de fichas impressas padronizadas: rotina do tratador, lista de compras semanal, guia de preparo de alimentos e ficha individual de dieta. Todos otimizados para impressão com economia de tinta." },
  { title: "Sistema de Cores", description: "Cores unificadas entre calendário e fichas de dieta impressas. O tratador identifica a cor no calendário na parede e pega a ficha de dieta correspondente. Cada dieta tem uma cor única escolhida ao salvar." },
];

// Vibrant color palette
const VIBRANT_COLORS = [
  { header: "#059669", headerText: "#fff", dot: "#34d399", border: "#6ee7b7", expandBg: "#ecfdf5", topicBg: "#f0fdf4" },
  { header: "#2563eb", headerText: "#fff", dot: "#60a5fa", border: "#93c5fd", expandBg: "#eff6ff", topicBg: "#f0f7ff" },
  { header: "#d97706", headerText: "#fff", dot: "#fbbf24", border: "#fcd34d", expandBg: "#fffbeb", topicBg: "#fefce8" },
  { header: "#dc2626", headerText: "#fff", dot: "#f87171", border: "#fca5a5", expandBg: "#fef2f2", topicBg: "#fff5f5" },
  { header: "#7c3aed", headerText: "#fff", dot: "#a78bfa", border: "#c4b5fd", expandBg: "#f5f3ff", topicBg: "#faf5ff" },
  { header: "#ea580c", headerText: "#fff", dot: "#fb923c", border: "#fdba74", expandBg: "#fff7ed", topicBg: "#fffbf5" },
  { header: "#0891b2", headerText: "#fff", dot: "#22d3ee", border: "#67e8f9", expandBg: "#ecfeff", topicBg: "#f0fdfa" },
  { header: "#4f46e5", headerText: "#fff", dot: "#818cf8", border: "#a5b4fc", expandBg: "#eef2ff", topicBg: "#f5f7ff" },
  { header: "#be185d", headerText: "#fff", dot: "#f472b6", border: "#f9a8d4", expandBg: "#fdf2f8", topicBg: "#fef1f7" },
];

// Priority labels
const PRIORITY_LABELS = [
  { label: "URGENTE", color: "#dc2626", bg: "#fef2f2" },
  { label: "ALTA", color: "#ea580c", bg: "#fff7ed" },
  { label: "ALTA", color: "#d97706", bg: "#fffbeb" },
  { label: "MÉDIA", color: "#059669", bg: "#ecfdf5" },
  { label: "MÉDIA", color: "#059669", bg: "#ecfdf5" },
  { label: "NORMAL", color: "#2563eb", bg: "#eff6ff" },
  { label: "NORMAL", color: "#2563eb", bg: "#eff6ff" },
  { label: "BAIXA", color: "#6b7280", bg: "#f9fafb" },
  { label: "BAIXA", color: "#6b7280", bg: "#f9fafb" },
];

function buildModulesMap(): Map<string, ModuleCardData> {
  const map = new Map<string, ModuleCardData>();

  map.set(FEEDING_ID, {
    id: FEEDING_ID,
    title: "Alimentação",
    icon: Utensils,
    topics: FEEDING_TOPICS,
    colorIdx: 0,
  });

  sectors.forEach((s: Sector, i: number) => {
    const allTopics: TopicItem[] = [];
    s.topicGroups.forEach((g: TopicGroup) => {
      g.topics.forEach(t => allTopics.push({ title: t.title, description: t.description }));
    });
    map.set(s.id, { id: s.id, title: s.title, icon: s.icon, topics: allTopics, colorIdx: i + 1 });
  });

  return map;
}

const DEFAULT_ORDER = [FEEDING_ID, ...sectors.map(s => s.id)];

// ===== Sortable Card Component =====
interface SortableCardProps {
  mod: ModuleCardData;
  priorityIdx: number;
  isExpanded: boolean;
  expandedTopic: string | null;
  onToggleCard: () => void;
  onToggleTopic: (key: string, e: React.MouseEvent) => void;
}

function SortableCard({ mod, priorityIdx, isExpanded, expandedTopic, onToggleCard, onToggleTopic }: SortableCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: mod.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
    opacity: isDragging ? 0.85 : 1,
  };

  const color = VIBRANT_COLORS[mod.colorIdx % VIBRANT_COLORS.length];
  const Icon = mod.icon;
  const priority = PRIORITY_LABELS[Math.min(priorityIdx, PRIORITY_LABELS.length - 1)];

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`rounded-2xl overflow-hidden shadow-md transition-shadow duration-200 ${
        isDragging ? "shadow-2xl" : isExpanded ? "shadow-lg" : ""
      }`}
    >
      {/* Header */}
      <div
        className="flex items-center"
        style={{ backgroundColor: color.header }}
      >
        {/* Drag handle */}
        <div
          {...attributes}
          {...listeners}
          className="flex items-center justify-center px-3 py-4 cursor-grab active:cursor-grabbing hover:bg-white/10 transition-colors"
          title="Arraste para reordenar"
        >
          <GripVertical size={20} color="rgba(255,255,255,0.6)" />
        </div>

        {/* Clickable header content */}
        <button
          onClick={onToggleCard}
          className="flex-1 flex items-center gap-3 px-2 py-4 pr-5 hover:bg-white/5 transition-colors"
        >
          <div
            className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: "rgba(255,255,255,0.2)" }}
          >
            <Icon size={18} color={color.headerText} />
          </div>
          <h3 className="text-[17px] font-bold flex-1 text-left" style={{ color: color.headerText }}>
            {mod.title}
          </h3>

          {/* Priority badge */}
          <span
            className="text-[10px] font-bold px-2 py-0.5 rounded-full mr-2 tracking-wider"
            style={{ backgroundColor: priority.bg, color: priority.color, border: `1px solid ${priority.color}30` }}
          >
            {priority.label}
          </span>

          {/* Topic count */}
          <span
            className="text-xs font-bold px-2.5 py-1 rounded-full mr-2"
            style={{ backgroundColor: "rgba(255,255,255,0.25)", color: color.headerText }}
          >
            {mod.topics.length}
          </span>

          <motion.div animate={{ rotate: isExpanded ? 180 : 0 }} transition={{ duration: 0.2 }}>
            <ChevronDown size={18} color={color.headerText} />
          </motion.div>
        </button>
      </div>

      {/* Expanded content */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="overflow-hidden"
          >
            <div className="px-5 py-4" style={{ backgroundColor: color.expandBg }}>
              <p className="text-sm text-stone-400 mb-3">
                Clique em um tópico para ver os detalhes
              </p>

              {/* Topics in 2-column grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                {mod.topics.map((topic, tIdx) => {
                  const topicKey = `${mod.id}::${tIdx}`;
                  const isTopicOpen = expandedTopic === topicKey;

                  return (
                    <div
                      key={tIdx}
                      className={`rounded-xl overflow-hidden transition-all duration-200 ${
                        isTopicOpen ? "md:col-span-2" : ""
                      }`}
                      style={{
                        backgroundColor: isTopicOpen ? color.topicBg : "#ffffff",
                        border: `1.5px solid ${isTopicOpen ? color.border : "#e7e5e4"}`,
                        boxShadow: isTopicOpen ? `0 2px 8px ${color.border}40` : "none",
                      }}
                    >
                      <button
                        onClick={(e) => onToggleTopic(topicKey, e)}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-stone-50/50 transition-colors"
                      >
                        <motion.div
                          animate={{ rotate: isTopicOpen ? 90 : 0 }}
                          transition={{ duration: 0.15 }}
                          className="flex-shrink-0"
                        >
                          <ChevronRight size={15} style={{ color: isTopicOpen ? color.header : "#a8a29e" }} />
                        </motion.div>
                        <span
                          className="w-2 h-2 rounded-full flex-shrink-0"
                          style={{ backgroundColor: color.dot }}
                        />
                        <span className={`text-sm leading-snug ${
                          isTopicOpen ? "text-stone-900 font-semibold" : "text-stone-700"
                        }`}>
                          {topic.title}
                        </span>
                      </button>

                      <AnimatePresence>
                        {isTopicOpen && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden"
                          >
                            <div className="px-5 pb-3 pt-1 ml-8" style={{ borderTop: `1px solid ${color.border}40` }}>
                              <p className="text-sm text-stone-600 leading-relaxed">
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
    </div>
  );
}

// ===== Main Component =====
export default function ProgressMap({ onNavigate }: ProgressMapProps) {
  const modulesMap = useMemo(() => buildModulesMap(), []);
  const [orderedIds, setOrderedIds] = useState<string[]>(DEFAULT_ORDER);
  const [expandedCard, setExpandedCard] = useState<string | null>(null);
  const [expandedTopic, setExpandedTopic] = useState<string | null>(null);

  // Load saved order from DB
  const { data: savedOrder } = trpc.moduleOrder.get.useQuery();
  const saveMutation = trpc.moduleOrder.save.useMutation();

  useEffect(() => {
    if (savedOrder && savedOrder.length > 0) {
      // Merge: use saved order first, then append any new modules not in saved order
      const savedSet = new Set(savedOrder);
      const remaining = DEFAULT_ORDER.filter(id => !savedSet.has(id));
      setOrderedIds([...savedOrder, ...remaining]);
    }
  }, [savedOrder]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    setOrderedIds(prev => {
      const oldIndex = prev.indexOf(active.id as string);
      const newIndex = prev.indexOf(over.id as string);
      const newOrder = arrayMove(prev, oldIndex, newIndex);
      // Save to DB
      saveMutation.mutate({ moduleIds: newOrder });
      return newOrder;
    });
  }, [saveMutation]);

  const toggleCard = useCallback((modId: string) => {
    setExpandedCard(prev => {
      if (prev === modId) {
        setExpandedTopic(null);
        return null;
      }
      setExpandedTopic(null);
      return modId;
    });
  }, []);

  const toggleTopic = useCallback((key: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedTopic(prev => prev === key ? null : key);
  }, []);

  const orderedModules = orderedIds
    .map(id => modulesMap.get(id))
    .filter((m): m is ModuleCardData => !!m);

  return (
    <div className="max-w-4xl mx-auto">
      {/* Priority scale header */}
      <div className="flex items-center gap-3 mb-5 px-1">
        <div className="flex items-center gap-1.5 text-xs text-stone-400">
          <GripVertical size={14} className="text-stone-300" />
          <span>Arraste para reordenar a prioridade</span>
        </div>
        <div className="flex-1 h-px bg-stone-200" />
        <div className="flex items-center gap-2">
          {["URGENTE", "ALTA", "MÉDIA", "NORMAL", "BAIXA"].map((label, i) => {
            const p = PRIORITY_LABELS[[0,1,3,5,7][i]];
            return (
              <span key={label} className="text-[9px] font-bold px-1.5 py-0.5 rounded" style={{ color: p.color, backgroundColor: p.bg }}>
                {label}
              </span>
            );
          })}
        </div>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={orderedIds} strategy={verticalListSortingStrategy}>
          <div className="flex flex-col gap-3">
            {orderedModules.map((mod, idx) => (
              <SortableCard
                key={mod.id}
                mod={mod}
                priorityIdx={idx}
                isExpanded={expandedCard === mod.id}
                expandedTopic={expandedTopic}
                onToggleCard={() => toggleCard(mod.id)}
                onToggleTopic={toggleTopic}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
}
