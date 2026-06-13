/**
 * ProgressMap — Fixed module cards with draggable numbered topics inside each card
 * Cards are in a fixed order (not draggable)
 * Topics inside each card have fixed numbering (1, 2, 3...)
 * Topics can be reordered via native HTML5 drag-and-drop
 * Topic order persisted to localStorage
 * Each topic has an editable comment box persisted to database
 */
import { sectors } from "@/data/sectors";
import type { Sector, TopicGroup } from "@/data/sectors";
import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { Utensils, ChevronDown, ChevronRight, GripVertical, MessageSquare, Save, Check } from "lucide-react";
import { trpc } from "@/lib/trpc";

interface ProgressMapProps {
  onNavigate: (moduleId: string) => void;
}

const FEEDING_ID = "__alimentacao__";

interface TopicItem {
  title: string;
  description: string;
  originalIndex: number;
}

interface ModuleCardData {
  id: string;
  title: string;
  icon: typeof Utensils;
  topics: TopicItem[];
  colorIdx: number;
}

// Alimentação topics
const FEEDING_TOPICS_RAW = [
  { title: "Dietas por Espécie", description: "Criação e gerenciamento de dietas balanceadas para cada espécie. Inclui seleção de ração base, vegetais, frutas e sementes/proteicos. Cada dieta é vinculada a uma fase (manutenção, reprodução, filhotes, muda) e tem cor de referência para o calendário." },
  { title: "Calendário Alimentar", description: "Planejamento semanal e mensal de alimentação por espécie. Permite pintar cada dia da semana com a dieta correspondente usando o sistema de cores. Gera PDF para impressão e fixação na cozinha do criatório." },
  { title: "Calculadora Nutricional", description: "Cálculo automático de quantidades de alimento por número de aves e peso médio da espécie. Ajusta proporções de ração, vegetais, frutas e suplementos conforme a fase da ave." },
  { title: "PDFs Operacionais", description: "Geração de fichas impressas padronizadas: rotina do tratador, lista de compras semanal, guia de preparo de alimentos e ficha individual de dieta. Todos otimizados para impressão com economia de tinta." },
  { title: "Sistema de Cores", description: "Cores unificadas entre calendário e fichas de dieta impressas. O tratador identifica a cor no calendário na parede e pega a ficha de dieta correspondente. Cada dieta tem uma cor única escolhida ao salvar." },
];

// Vibrant color palette
const VIBRANT_COLORS = [
  { header: "#059669", headerText: "#fff", dot: "#34d399", border: "#6ee7b7", expandBg: "#ecfdf5", topicBg: "#f0fdf4", numBg: "#d1fae5", numText: "#065f46" },
  { header: "#2563eb", headerText: "#fff", dot: "#60a5fa", border: "#93c5fd", expandBg: "#eff6ff", topicBg: "#f0f7ff", numBg: "#dbeafe", numText: "#1e40af" },
  { header: "#d97706", headerText: "#fff", dot: "#fbbf24", border: "#fcd34d", expandBg: "#fffbeb", topicBg: "#fefce8", numBg: "#fef3c7", numText: "#92400e" },
  { header: "#dc2626", headerText: "#fff", dot: "#f87171", border: "#fca5a5", expandBg: "#fef2f2", topicBg: "#fff5f5", numBg: "#fee2e2", numText: "#991b1b" },
  { header: "#7c3aed", headerText: "#fff", dot: "#a78bfa", border: "#c4b5fd", expandBg: "#f5f3ff", topicBg: "#faf5ff", numBg: "#ede9fe", numText: "#5b21b6" },
  { header: "#ea580c", headerText: "#fff", dot: "#fb923c", border: "#fdba74", expandBg: "#fff7ed", topicBg: "#fffbf5", numBg: "#ffedd5", numText: "#9a3412" },
  { header: "#0891b2", headerText: "#fff", dot: "#22d3ee", border: "#67e8f9", expandBg: "#ecfeff", topicBg: "#f0fdfa", numBg: "#cffafe", numText: "#155e75" },
  { header: "#4f46e5", headerText: "#fff", dot: "#818cf8", border: "#a5b4fc", expandBg: "#eef2ff", topicBg: "#f5f7ff", numBg: "#e0e7ff", numText: "#3730a3" },
  { header: "#be185d", headerText: "#fff", dot: "#f472b6", border: "#f9a8d4", expandBg: "#fdf2f8", topicBg: "#fef1f7", numBg: "#fce7f3", numText: "#9d174d" },
];

// Topic order now stored in database via tRPC

function buildModulesMap(): Map<string, ModuleCardData> {
  const map = new Map<string, ModuleCardData>();

  map.set(FEEDING_ID, {
    id: FEEDING_ID,
    title: "Alimentação",
    icon: Utensils,
    topics: FEEDING_TOPICS_RAW.map((t, i) => ({ ...t, originalIndex: i })),
    colorIdx: 0,
  });

  sectors.forEach((s: Sector, i: number) => {
    const allTopics: TopicItem[] = [];
    let idx = 0;
    s.topicGroups.forEach((g: TopicGroup) => {
      g.topics.forEach(t => {
        allTopics.push({ title: t.title, description: t.description, originalIndex: idx });
        idx++;
      });
    });
    map.set(s.id, { id: s.id, title: s.title, icon: s.icon, topics: allTopics, colorIdx: i + 1 });
  });

  return map;
}

const FIXED_ORDER = [FEEDING_ID, ...sectors.map(s => s.id)];

// ===== Comment Box Component =====
interface CommentBoxProps {
  topicKey: string;
  savedComment: string;
  onSave: (topicKey: string, comment: string) => void;
  accentColor: string;
  borderColor: string;
}

function CommentBox({ topicKey, savedComment, onSave, accentColor, borderColor }: CommentBoxProps) {
  const [localText, setLocalText] = useState(savedComment);
  const [saved, setSaved] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync with saved comment when it changes from server
  useEffect(() => {
    setLocalText(savedComment);
  }, [savedComment]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setLocalText(val);
    setSaved(false);

    // Auto-save after 1.5s of inactivity
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      onSave(topicKey, val);
      setSaved(true);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setSaved(false), 2000);
    }, 1500);
  };

  const handleSaveClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (debounceRef.current) clearTimeout(debounceRef.current);
    onSave(topicKey, localText);
    setSaved(true);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="mt-3" onClick={(e) => e.stopPropagation()}>
      <div className="flex items-center gap-1.5 mb-1.5">
        <MessageSquare size={13} style={{ color: accentColor }} />
        <span className="text-xs font-semibold" style={{ color: accentColor }}>
          Comentários da equipe
        </span>
        {saved && (
          <span className="flex items-center gap-1 text-[10px] text-emerald-600 font-medium ml-auto">
            <Check size={11} />
            Salvo
          </span>
        )}
      </div>
      <div className="flex gap-2">
        <textarea
          value={localText}
          onChange={handleChange}
          placeholder="Escreva observações, anotações ou sugestões sobre este tópico..."
          className="flex-1 text-sm rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-2 transition-all"
          style={{
            border: `1.5px solid ${borderColor}`,
            backgroundColor: "#ffffff",
            minHeight: "72px",
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = accentColor;
            e.currentTarget.style.boxShadow = `0 0 0 2px ${accentColor}30`;
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = borderColor;
            e.currentTarget.style.boxShadow = "none";
          }}
          rows={3}
        />
        <button
          onClick={handleSaveClick}
          className="self-end px-3 py-2 rounded-lg text-white text-xs font-semibold flex items-center gap-1.5 hover:brightness-110 transition-all"
          style={{ backgroundColor: accentColor }}
          title="Salvar comentário"
        >
          <Save size={13} />
          Salvar
        </button>
      </div>
    </div>
  );
}

// ===== Module Card Component =====
interface ModuleCardProps {
  mod: ModuleCardData;
  isExpanded: boolean;
  expandedTopic: string | null;
  onToggleCard: () => void;
  onToggleTopic: (key: string, e: React.MouseEvent) => void;
  topicOrder: number[];
  onTopicReorder: (moduleId: string, newOrder: number[]) => void;
  comments: Record<string, string>;
  onSaveComment: (topicKey: string, comment: string) => void;
}

function ModuleCard({
  mod, isExpanded, expandedTopic,
  onToggleCard, onToggleTopic,
  topicOrder, onTopicReorder,
  comments, onSaveComment,
}: ModuleCardProps) {
  const color = VIBRANT_COLORS[mod.colorIdx % VIBRANT_COLORS.length];
  const Icon = mod.icon;

  // Drag state for topics
  const [dragTopicIdx, setDragTopicIdx] = useState<number | null>(null);
  const [dragOverTopicIdx, setDragOverTopicIdx] = useState<number | null>(null);

  const orderedTopics = topicOrder.map(origIdx => mod.topics.find(t => t.originalIndex === origIdx)!).filter(Boolean);

  const handleTopicDragStart = (e: React.DragEvent, displayIdx: number) => {
    e.stopPropagation();
    setDragTopicIdx(displayIdx);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", String(displayIdx));
  };

  const handleTopicDragOver = (e: React.DragEvent, displayIdx: number) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = "move";
    setDragOverTopicIdx(displayIdx);
  };

  const handleTopicDragLeave = () => {
    setDragOverTopicIdx(null);
  };

  const handleTopicDrop = (e: React.DragEvent, targetDisplayIdx: number) => {
    e.preventDefault();
    e.stopPropagation();
    const sourceDisplayIdx = parseInt(e.dataTransfer.getData("text/plain"), 10);
    if (isNaN(sourceDisplayIdx) || sourceDisplayIdx === targetDisplayIdx) {
      setDragTopicIdx(null);
      setDragOverTopicIdx(null);
      return;
    }

    const newOrder = [...topicOrder];
    const [moved] = newOrder.splice(sourceDisplayIdx, 1);
    newOrder.splice(targetDisplayIdx, 0, moved);
    onTopicReorder(mod.id, newOrder);

    setDragTopicIdx(null);
    setDragOverTopicIdx(null);
  };

  const handleTopicDragEnd = () => {
    setDragTopicIdx(null);
    setDragOverTopicIdx(null);
  };

  // Count comments for this module
  const commentCount = orderedTopics.filter(t => {
    const key = `${mod.id}::${t.originalIndex}`;
    return comments[key] && comments[key].trim().length > 0;
  }).length;

  return (
    <div className="rounded-2xl overflow-hidden shadow-md transition-all duration-200">
      {/* Header */}
      <button
        onClick={onToggleCard}
        className="w-full flex items-center gap-3 px-5 py-4 hover:brightness-110 transition-all"
        style={{ backgroundColor: color.header }}
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

        {/* Comment count badge */}
        {commentCount > 0 && (
          <span
            className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full"
            style={{ backgroundColor: "rgba(255,255,255,0.25)", color: color.headerText }}
          >
            <MessageSquare size={10} />
            {commentCount}
          </span>
        )}

        {/* Topic count */}
        <span
          className="text-xs font-bold px-2.5 py-1 rounded-full mr-2"
          style={{ backgroundColor: "rgba(255,255,255,0.25)", color: color.headerText }}
        >
          {mod.topics.length}
        </span>

        <div
          className="transition-transform duration-200"
          style={{ transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)" }}
        >
          <ChevronDown size={18} color={color.headerText} />
        </div>
      </button>

      {/* Expanded content */}
      {isExpanded && (
        <div className="px-5 py-4" style={{ backgroundColor: color.expandBg }}>
          <p className="text-xs text-stone-400 mb-3 flex items-center gap-1.5">
            <GripVertical size={12} className="text-stone-300" />
            Arraste os tópicos para reordenar a prioridade
          </p>

          <div className="flex flex-col gap-2">
            {orderedTopics.map((topic, displayIdx) => {
              const topicKey = `${mod.id}::${topic.originalIndex}`;
              const isTopicOpen = expandedTopic === topicKey;
              const isDragging = dragTopicIdx === displayIdx;
              const isDragOver = dragOverTopicIdx === displayIdx && dragTopicIdx !== displayIdx;
              const hasComment = comments[topicKey] && comments[topicKey].trim().length > 0;

              return (
                <div
                  key={topic.originalIndex}
                  className={`rounded-xl overflow-hidden transition-all duration-200 ${
                    isDragging ? "opacity-40 scale-[0.98]" : ""
                  } ${isDragOver ? "ring-2 ring-offset-1" : ""}`}
                  style={{
                    backgroundColor: isTopicOpen ? color.topicBg : "#ffffff",
                    border: `1.5px solid ${isTopicOpen ? color.border : isDragOver ? color.header : "#e7e5e4"}`,
                    boxShadow: isTopicOpen ? `0 2px 8px ${color.border}40` : isDragOver ? `0 2px 12px ${color.header}30` : "0 1px 3px rgba(0,0,0,0.04)",
                  }}
                  onDragOver={(e) => handleTopicDragOver(e, displayIdx)}
                  onDragLeave={handleTopicDragLeave}
                  onDrop={(e) => handleTopicDrop(e, displayIdx)}
                >
                  <div className="flex items-center">
                    {/* Drag handle */}
                    <div
                      draggable
                      onDragStart={(e) => handleTopicDragStart(e, displayIdx)}
                      onDragEnd={handleTopicDragEnd}
                      className="flex items-center justify-center pl-3 pr-1 py-2.5 cursor-grab active:cursor-grabbing hover:bg-stone-50 transition-colors select-none"
                      title="Arraste para reordenar"
                    >
                      <GripVertical size={14} className="text-stone-300" />
                    </div>

                    {/* Number badge */}
                    <div
                      className="flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold mr-2"
                      style={{ backgroundColor: color.numBg, color: color.numText }}
                    >
                      {displayIdx + 1}
                    </div>

                    {/* Topic title button */}
                    <button
                      onClick={(e) => onToggleTopic(topicKey, e)}
                      className="flex-1 flex items-center gap-2 px-2 py-2.5 text-left hover:bg-stone-50/50 transition-colors"
                    >
                      <div
                        className="flex-shrink-0 transition-transform duration-150"
                        style={{ transform: isTopicOpen ? "rotate(90deg)" : "rotate(0deg)" }}
                      >
                        <ChevronRight size={15} style={{ color: isTopicOpen ? color.header : "#a8a29e" }} />
                      </div>
                      <span className={`text-sm leading-snug ${
                        isTopicOpen ? "text-stone-900 font-semibold" : "text-stone-700"
                      }`}>
                        {topic.title}
                      </span>
                      {/* Small comment indicator when collapsed */}
                      {!isTopicOpen && hasComment && (
                        <MessageSquare size={12} style={{ color: color.header }} className="ml-auto mr-2 flex-shrink-0 opacity-60" />
                      )}
                    </button>
                  </div>

                  {isTopicOpen && (
                    <div className="px-5 pb-4 pt-1 ml-12" style={{ borderTop: `1px solid ${color.border}40` }}>
                      <p className="text-sm text-stone-600 leading-relaxed mb-1">
                        {topic.description}
                      </p>

                      {/* Editable comment box */}
                      <CommentBox
                        topicKey={topicKey}
                        savedComment={comments[topicKey] || ""}
                        onSave={onSaveComment}
                        accentColor={color.header}
                        borderColor={color.border}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ===== Main Component =====
export default function ProgressMap({ onNavigate }: ProgressMapProps) {
  const modulesMap = useMemo(() => buildModulesMap(), []);

  const [expandedCard, setExpandedCard] = useState<string | null>(null);
  const [expandedTopic, setExpandedTopic] = useState<string | null>(null);

  // Topic order state — loaded from DB
  const { data: serverTopicOrders } = trpc.topicOrderRouter.getAll.useQuery();
  const saveTopicOrderMut = trpc.topicOrderRouter.save.useMutation();
  const topicOrderUtils = trpc.useUtils();

  const [topicOrders, setTopicOrders] = useState<Record<string, number[]>>(() => {
    const result: Record<string, number[]> = {};
    Array.from(modulesMap.entries()).forEach(([id, mod]) => {
      result[id] = mod.topics.map((t: TopicItem) => t.originalIndex);
    });
    return result;
  });

  // Sync topic orders from DB
  useEffect(() => {
    if (serverTopicOrders) {
      setTopicOrders(prev => {
        const updated = { ...prev };
        for (const [modId, order] of Object.entries(serverTopicOrders)) {
          const mod = modulesMap.get(modId);
          if (mod && order.length === mod.topics.length) {
            updated[modId] = order;
          }
        }
        return updated;
      });
    }
  }, [serverTopicOrders]);

  // Comments state — loaded from DB
  const { data: serverComments } = trpc.topicComment.getAll.useQuery();
  const saveMutation = trpc.topicComment.save.useMutation();

  const [localComments, setLocalComments] = useState<Record<string, string>>({});

  // Merge server comments into local state on load
  useEffect(() => {
    if (serverComments) {
      setLocalComments(prev => {
        // Only update keys that haven't been locally modified
        const merged = { ...prev };
        for (const [key, val] of Object.entries(serverComments)) {
          if (!(key in merged)) {
            merged[key] = val;
          }
        }
        return merged;
      });
    }
  }, [serverComments]);

  // Use server comments as base, overlay with local edits
  const mergedComments = useMemo(() => {
    return { ...(serverComments || {}), ...localComments };
  }, [serverComments, localComments]);

  const handleSaveComment = useCallback((topicKey: string, comment: string) => {
    setLocalComments(prev => ({ ...prev, [topicKey]: comment }));
    saveMutation.mutate({ topicKey, comment });
  }, [saveMutation]);

  const handleTopicReorder = useCallback((moduleId: string, newOrder: number[]) => {
    setTopicOrders(prev => {
      const updated = { ...prev, [moduleId]: newOrder };
      return updated;
    });
    saveTopicOrderMut.mutate({ moduleId, orderJson: newOrder }, {
      onSuccess: () => topicOrderUtils.topicOrderRouter.getAll.invalidate(),
    });
  }, [saveTopicOrderMut, topicOrderUtils]);

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

  const orderedModules = FIXED_ORDER
    .map(id => modulesMap.get(id))
    .filter((m): m is ModuleCardData => !!m);

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      {/* Hero Banner */}
      <div className="relative h-32 rounded-2xl overflow-hidden shadow-lg shadow-emerald-900/10">
        <img src="/manus-storage/hero-progresso_47f09842.jpg" alt="Mapa de Progresso" className="w-full h-full object-cover object-center" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/30 to-transparent flex items-end p-5">
          <div>
            <p className="text-emerald-300/80 text-[10px] font-bold tracking-[0.2em] uppercase mb-1">Módulo 7</p>
            <h1 className="text-white text-xl lg:text-2xl font-bold tracking-tight">Mapa de Progresso</h1>
            <p className="text-white/70 text-sm mt-1.5 font-light">Acompanhamento de tarefas e evolução do criatório</p>
          </div>
        </div>
      </div>
      <div className="flex flex-col gap-3">
        {orderedModules.map((mod) => (
          <ModuleCard
            key={mod.id}
            mod={mod}
            isExpanded={expandedCard === mod.id}
            expandedTopic={expandedTopic}
            onToggleCard={() => toggleCard(mod.id)}
            onToggleTopic={toggleTopic}
            topicOrder={topicOrders[mod.id] || mod.topics.map(t => t.originalIndex)}
            onTopicReorder={handleTopicReorder}
            comments={mergedComments}
            onSaveComment={handleSaveComment}
          />
        ))}
      </div>
    </div>
  );
}
