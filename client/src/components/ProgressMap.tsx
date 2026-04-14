/**
 * ProgressMap — Visual dashboard showing all modules and their implementation status
 * First screen when opening the system — clear overview of what's done and what's pending
 */
import { sectors } from "@/data/sectors";
import type { Sector } from "@/data/sectors";
import { motion } from "framer-motion";
import {
  Utensils,
  Bird,
  Baby,
  ShieldCheck,
  HeartPulse,
  UtensilsCrossed,
  Sparkles,
  FileText,
  Wrench,
  CheckCircle2,
  Clock,
  ArrowRight,
  Feather,
  LayoutGrid,
} from "lucide-react";

interface ProgressMapProps {
  onNavigate: (moduleId: string) => void;
}

const FEEDING_ID = "__alimentacao__";

// Module definitions with status
interface ModuleInfo {
  id: string;
  number: number;
  title: string;
  subtitle: string;
  icon: typeof Utensils;
  status: "active" | "pending";
  topicCount: number;
  highlights?: string[];
}

function buildModules(): ModuleInfo[] {
  const feedingModule: ModuleInfo = {
    id: FEEDING_ID,
    number: 1,
    title: "Alimentação",
    subtitle: "Balanceamento nutricional dinâmico",
    icon: Utensils,
    status: "active",
    topicCount: 39,
    highlights: [
      "Dietas por espécie",
      "Calendário alimentar",
      "Calculadora nutricional",
      "PDFs operacionais",
      "Sistema de cores",
    ],
  };

  const sectorModules: ModuleInfo[] = sectors.map((s: Sector) => {
    const totalTopics = s.topicGroups.reduce((sum, g) => sum + g.topics.length, 0);
    return {
      id: s.id,
      number: s.number,
      title: s.title,
      subtitle: s.subtitle,
      icon: s.icon,
      status: "pending" as const,
      topicCount: totalTopics,
      highlights: s.topicGroups.slice(0, 3).map(g => g.title),
    };
  });

  return [feedingModule, ...sectorModules];
}

export default function ProgressMap({ onNavigate }: ProgressMapProps) {
  const modules = buildModules();
  const activeModules = modules.filter(m => m.status === "active");
  const pendingModules = modules.filter(m => m.status === "pending");
  const totalModules = modules.length;
  const completedCount = activeModules.length;
  const totalTopics = modules.reduce((sum, m) => sum + m.topicCount, 0);
  const activeTopics = activeModules.reduce((sum, m) => sum + m.topicCount, 0);
  const progressPercent = Math.round((completedCount / totalModules) * 100);

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-emerald-700/10 flex items-center justify-center">
            <LayoutGrid size={20} className="text-emerald-700" />
          </div>
          <div>
            <h1 className="text-2xl font-serif font-bold text-foreground">
              Mapa de Progresso
            </h1>
            <p className="text-sm text-muted-foreground">
              Visão geral de todos os módulos do Manual Operacional
            </p>
          </div>
        </div>
      </div>

      {/* Progress Overview Bar */}
      <div className="bg-white rounded-2xl border border-stone-200/60 shadow-sm p-6 mb-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
          <div>
            <p className="text-sm font-semibold text-stone-600 mb-1">Progresso Geral</p>
            <p className="text-3xl font-bold text-foreground">
              {completedCount}
              <span className="text-lg text-muted-foreground font-normal"> de {totalModules} módulos</span>
            </p>
          </div>
          <div className="flex gap-6">
            <div className="text-center">
              <p className="text-2xl font-bold text-emerald-600">{activeTopics}</p>
              <p className="text-[11px] text-muted-foreground font-medium">Tópicos ativos</p>
            </div>
            <div className="w-px bg-stone-200" />
            <div className="text-center">
              <p className="text-2xl font-bold text-stone-400">{totalTopics - activeTopics}</p>
              <p className="text-[11px] text-muted-foreground font-medium">Tópicos pendentes</p>
            </div>
            <div className="w-px bg-stone-200" />
            <div className="text-center">
              <p className="text-2xl font-bold text-stone-800">{totalTopics}</p>
              <p className="text-[11px] text-muted-foreground font-medium">Total de tópicos</p>
            </div>
          </div>
        </div>
        {/* Progress bar */}
        <div className="relative h-3 bg-stone-100 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progressPercent}%` }}
            transition={{ duration: 1.2, ease: "easeOut" }}
            className="absolute top-0 left-0 h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full"
          />
        </div>
        <div className="flex justify-between mt-2">
          <p className="text-[11px] text-muted-foreground">{progressPercent}% concluído</p>
          <p className="text-[11px] text-muted-foreground">{totalModules - completedCount} módulos restantes</p>
        </div>
      </div>

      {/* Active Modules Section */}
      <div className="mb-8">
        <div className="flex items-center gap-2.5 mb-4">
          <CheckCircle2 size={16} className="text-emerald-500" />
          <h2 className="text-base font-bold text-foreground">Em Andamento</h2>
          <div className="flex-1 h-px bg-emerald-200/50 ml-2" />
          <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full">
            {activeModules.length} {activeModules.length === 1 ? "módulo" : "módulos"}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {activeModules.map((mod, i) => (
            <motion.button
              key={mod.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1, duration: 0.4 }}
              onClick={() => onNavigate(mod.id)}
              className="group relative bg-white rounded-2xl border-2 border-emerald-200 shadow-sm hover:shadow-md hover:border-emerald-300 transition-all duration-300 p-5 text-left overflow-hidden"
            >
              {/* Green accent bar */}
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 to-emerald-400" />

              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-emerald-600 flex items-center justify-center shadow-sm flex-shrink-0">
                  <mod.icon size={22} className="text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                      MÓDULO {mod.number}
                    </span>
                    <span className="text-[10px] font-semibold text-emerald-500 flex items-center gap-1">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      ATIVO
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-foreground mb-0.5 group-hover:text-emerald-700 transition-colors">
                    {mod.title}
                  </h3>
                  <p className="text-xs text-muted-foreground mb-3">{mod.subtitle}</p>

                  {/* Highlights */}
                  {mod.highlights && (
                    <div className="flex flex-wrap gap-1.5">
                      {mod.highlights.map((h, idx) => (
                        <span
                          key={idx}
                          className="text-[10px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md"
                        >
                          {h}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-1 text-emerald-400 group-hover:text-emerald-600 transition-colors flex-shrink-0 mt-2">
                  <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                </div>
              </div>

              {/* Topic count */}
              <div className="mt-3 pt-3 border-t border-emerald-100 flex items-center justify-between">
                <p className="text-[11px] text-emerald-600 font-medium">
                  {mod.topicCount} tópicos implementados
                </p>
                <span className="text-[10px] text-emerald-500 font-semibold group-hover:underline flex items-center gap-1">
                  Acessar módulo
                  <ArrowRight size={10} />
                </span>
              </div>
            </motion.button>
          ))}
        </div>
      </div>

      {/* Pending Modules Section */}
      <div className="mb-12">
        <div className="flex items-center gap-2.5 mb-4">
          <Clock size={16} className="text-stone-400" />
          <h2 className="text-base font-bold text-foreground">A Implementar</h2>
          <div className="flex-1 h-px bg-stone-200/50 ml-2" />
          <span className="text-xs font-semibold text-stone-500 bg-stone-100 px-2.5 py-1 rounded-full">
            {pendingModules.length} módulos
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {pendingModules.map((mod, i) => (
            <motion.button
              key={mod.id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 + i * 0.06, duration: 0.35 }}
              onClick={() => onNavigate(mod.id)}
              className="group relative bg-white/70 rounded-xl border border-stone-200/60 hover:border-stone-300 hover:bg-white hover:shadow-sm transition-all duration-300 p-4 text-left"
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-stone-100 flex items-center justify-center flex-shrink-0 group-hover:bg-stone-200/70 transition-colors">
                  <mod.icon size={18} className="text-stone-400 group-hover:text-stone-500 transition-colors" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[9px] font-bold text-stone-400 bg-stone-100 px-1.5 py-0.5 rounded">
                      MÓDULO {mod.number}
                    </span>
                  </div>
                  <h3 className="text-sm font-semibold text-stone-700 mb-0.5 group-hover:text-stone-900 transition-colors truncate">
                    {mod.title}
                  </h3>
                  <p className="text-[11px] text-stone-400 truncate">{mod.subtitle}</p>
                </div>
                <ArrowRight size={14} className="text-stone-300 group-hover:text-stone-500 group-hover:translate-x-0.5 transition-all flex-shrink-0 mt-2" />
              </div>

              {/* Topic groups preview */}
              {mod.highlights && mod.highlights.length > 0 && (
                <div className="mt-3 pt-2.5 border-t border-stone-100">
                  <div className="flex flex-wrap gap-1">
                    {mod.highlights.map((h, idx) => (
                      <span
                        key={idx}
                        className="text-[9px] font-medium text-stone-400 bg-stone-50 px-1.5 py-0.5 rounded"
                      >
                        {h}
                      </span>
                    ))}
                  </div>
                  <p className="text-[10px] text-stone-400 mt-2 font-medium">
                    {mod.topicCount} tópicos a implementar
                  </p>
                </div>
              )}
            </motion.button>
          ))}
        </div>
      </div>

      {/* Footer note */}
      <div className="text-center pb-8">
        <div className="inline-flex items-center gap-2 text-stone-300">
          <Feather size={12} />
          <p className="text-[10px] font-medium tracking-wider uppercase">
            Criatório Minas Bird — Ribeirão Vermelho, MG — {new Date().getFullYear()}
          </p>
          <Feather size={12} />
        </div>
      </div>
    </div>
  );
}
