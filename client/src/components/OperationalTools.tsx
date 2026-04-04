/**
 * OperationalTools — 3 ferramentas operacionais para o módulo de Alimentação
 * 1. Lista de Compras (período + espécie)
 * 2. Rotina Diária do Tratador (período + espécie)
 * 3. Guia de Preparo (dia + espécie)
 *
 * Todas baseadas nas dietas programadas no calendário.
 */
import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShoppingCart, ClipboardList, ChefHat, Calendar,
  ChevronDown, ChevronRight, Bird, Check, Download,
  Package, Wheat, Leaf, Apple, Zap, Users, Scale,
  Printer, FileText,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { species, type Species } from "@/data/feeding";
import { lifePeriods, enclosureTypes } from "@/data/petbird";
import type { SavedDiet, SavedDietItem } from "@/lib/dietStorage";

// ============================================
// TYPES
// ============================================
type ToolTab = "shopping" | "routine" | "prep";

interface OperationalToolsProps {
  savedDiets: SavedDiet[];
  speciesCalendars: Record<string, Record<string, string>>;
}

// ============================================
// HELPERS
// ============================================
const MONTH_NAMES = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
const DAY_NAMES = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
const DAY_NAMES_SHORT = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

const activeFlockSpecies = species.filter(s => s.inCurrentFlock);

function formatDate(d: Date): string {
  return `${d.getDate().toString().padStart(2, "0")}/${(d.getMonth() + 1).toString().padStart(2, "0")}/${d.getFullYear()}`;
}

function toInputDate(d: Date): string {
  return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, "0")}-${d.getDate().toString().padStart(2, "0")}`;
}

function fromInputDate(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function getDayKey(d: Date): string {
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

function getDaysInRange(start: Date, end: Date): Date[] {
  const days: Date[] = [];
  const cur = new Date(start);
  while (cur <= end) {
    days.push(new Date(cur));
    cur.setDate(cur.getDate() + 1);
  }
  return days;
}

const CATEGORY_CONFIG = {
  racao: { label: "Ração", icon: Wheat, color: "text-amber-700", bg: "bg-amber-50", border: "border-amber-200" },
  vegetais: { label: "Vegetais", icon: Leaf, color: "text-emerald-700", bg: "bg-emerald-50", border: "border-emerald-200" },
  frutas: { label: "Frutas", icon: Apple, color: "text-red-600", bg: "bg-red-50", border: "border-red-200" },
  proteicos: { label: "Proteicos", icon: Zap, color: "text-purple-700", bg: "bg-purple-50", border: "border-purple-200" },
} as const;

type FoodCategory = keyof typeof CATEGORY_CONFIG;

// ============================================
// COMPONENT
// ============================================
export default function OperationalTools({ savedDiets, speciesCalendars }: OperationalToolsProps) {
  const [activeTab, setActiveTab] = useState<ToolTab>("shopping");

  // --- Shared selectors ---
  const [startDate, setStartDate] = useState<string>(toInputDate(new Date()));
  const [endDate, setEndDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 6);
    return toInputDate(d);
  });
  const [singleDate, setSingleDate] = useState<string>(toInputDate(new Date()));
  const [selectedSpeciesIds, setSelectedSpeciesIds] = useState<Set<string>>(new Set(["__all__"]));

  const isAllSelected = selectedSpeciesIds.has("__all__");

  const toggleSpecies = (id: string) => {
    if (id === "__all__") {
      setSelectedSpeciesIds(new Set(["__all__"]));
      return;
    }
    setSelectedSpeciesIds(prev => {
      const next = new Set(prev);
      next.delete("__all__");
      if (next.has(id)) {
        next.delete(id);
        if (next.size === 0) next.add("__all__");
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const effectiveSpeciesIds = useMemo(() => {
    if (isAllSelected) return activeFlockSpecies.map(s => s.id);
    return Array.from(selectedSpeciesIds);
  }, [isAllSelected, selectedSpeciesIds]);

  // ============================================
  // SHOPPING LIST LOGIC
  // ============================================
  const shoppingList = useMemo(() => {
    const start = fromInputDate(startDate);
    const end = fromInputDate(endDate);
    if (start > end) return null;

    const days = getDaysInRange(start, end);
    const totalDays = days.length;

    // Aggregate: foodName → { category, totalGrams, perSpecies: { speciesName: grams } }
    const aggregate: Record<string, { category: FoodCategory; totalGrams: number; perSpecies: Record<string, number> }> = {};

    for (const speciesId of effectiveSpeciesIds) {
      const sp = species.find(s => s.id === speciesId);
      if (!sp) continue;
      const cal = speciesCalendars[speciesId] || {};

      for (const day of days) {
        const dayKey = getDayKey(day);
        const legacyKey = `${day.getMonth() + 1}-${day.getDate()}`;
        const dietId = cal[dayKey] || cal[legacyKey];
        if (!dietId) continue;

        const diet = savedDiets.find(d => d.id === dietId);
        if (!diet) continue;

        const categories: FoodCategory[] = ["racao", "vegetais", "frutas", "proteicos"];
        for (const cat of categories) {
          for (const item of diet.items[cat]) {
            const key = item.foodName;
            if (!aggregate[key]) {
              aggregate[key] = { category: cat, totalGrams: 0, perSpecies: {} };
            }
            const dailyTotal = item.grams * diet.birdCount;
            aggregate[key].totalGrams += dailyTotal;
            aggregate[key].perSpecies[sp.commonName] = (aggregate[key].perSpecies[sp.commonName] || 0) + dailyTotal;
          }
        }
      }
    }

    // Group by category
    const grouped: Record<FoodCategory, { name: string; totalGrams: number; perSpecies: Record<string, number> }[]> = {
      racao: [], vegetais: [], frutas: [], proteicos: [],
    };

    for (const [name, data] of Object.entries(aggregate)) {
      grouped[data.category].push({ name, totalGrams: data.totalGrams, perSpecies: data.perSpecies });
    }

    // Sort each category by totalGrams desc
    for (const cat of Object.keys(grouped) as FoodCategory[]) {
      grouped[cat].sort((a, b) => b.totalGrams - a.totalGrams);
    }

    return { grouped, totalDays };
  }, [startDate, endDate, effectiveSpeciesIds, speciesCalendars, savedDiets]);

  // ============================================
  // DAILY ROUTINE LOGIC
  // ============================================
  const dailyRoutine = useMemo(() => {
    const start = fromInputDate(startDate);
    const end = fromInputDate(endDate);
    if (start > end) return null;

    const days = getDaysInRange(start, end);

    // For each day, for each species, what diet is assigned?
    const routine: { date: Date; speciesRoutines: { species: Species; diet: SavedDiet }[] }[] = [];

    for (const day of days) {
      const dayKey = getDayKey(day);
      const legacyKey = `${day.getMonth() + 1}-${day.getDate()}`;
      const speciesRoutines: { species: Species; diet: SavedDiet }[] = [];

      for (const speciesId of effectiveSpeciesIds) {
        const sp = species.find(s => s.id === speciesId);
        if (!sp) continue;
        const cal = speciesCalendars[speciesId] || {};
        const dietId = cal[dayKey] || cal[legacyKey];
        if (!dietId) continue;

        const diet = savedDiets.find(d => d.id === dietId);
        if (!diet) continue;

        speciesRoutines.push({ species: sp, diet });
      }

      if (speciesRoutines.length > 0) {
        routine.push({ date: day, speciesRoutines });
      }
    }

    return routine;
  }, [startDate, endDate, effectiveSpeciesIds, speciesCalendars, savedDiets]);

  // ============================================
  // PREP GUIDE LOGIC
  // ============================================
  const prepGuide = useMemo(() => {
    const day = fromInputDate(singleDate);
    const dayKey = getDayKey(day);
    const legacyKey = `${day.getMonth() + 1}-${day.getDate()}`;

    // Collect all diets for the day across selected species
    const speciesPreps: { species: Species; diet: SavedDiet }[] = [];

    for (const speciesId of effectiveSpeciesIds) {
      const sp = species.find(s => s.id === speciesId);
      if (!sp) continue;
      const cal = speciesCalendars[speciesId] || {};
      const dietId = cal[dayKey] || cal[legacyKey];
      if (!dietId) continue;

      const diet = savedDiets.find(d => d.id === dietId);
      if (!diet) continue;

      speciesPreps.push({ species: sp, diet });
    }

    // Consolidate ingredients for prep order
    // Step 1: Ração (seca, preparar primeiro)
    // Step 2: Vegetais (lavar, picar)
    // Step 3: Frutas (lavar, picar)
    // Step 4: Proteicos (preparar por último)
    const steps: { category: FoodCategory; items: { foodName: string; speciesName: string; gramsPerBird: number; totalGrams: number; birdCount: number }[] }[] = [];

    const categories: FoodCategory[] = ["racao", "vegetais", "frutas", "proteicos"];
    for (const cat of categories) {
      const items: { foodName: string; speciesName: string; gramsPerBird: number; totalGrams: number; birdCount: number }[] = [];
      for (const { species: sp, diet } of speciesPreps) {
        for (const item of diet.items[cat]) {
          items.push({
            foodName: item.foodName,
            speciesName: sp.commonName,
            gramsPerBird: item.grams,
            totalGrams: item.grams * diet.birdCount,
            birdCount: diet.birdCount,
          });
        }
      }
      if (items.length > 0) {
        steps.push({ category: cat, items });
      }
    }

    // Also create a consolidated shopping mini-list for the day
    const consolidated: Record<string, { category: FoodCategory; totalGrams: number }> = {};
    for (const step of steps) {
      for (const item of step.items) {
        if (!consolidated[item.foodName]) {
          consolidated[item.foodName] = { category: step.category, totalGrams: 0 };
        }
        consolidated[item.foodName].totalGrams += item.totalGrams;
      }
    }

    return { speciesPreps, steps, consolidated, date: day };
  }, [singleDate, effectiveSpeciesIds, speciesCalendars, savedDiets]);

  // ============================================
  // EXPORT TEXT
  // ============================================
  const exportShoppingListText = () => {
    if (!shoppingList) return;
    const lines: string[] = [];
    lines.push("═══════════════════════════════════════════════════");
    lines.push("  LISTA DE COMPRAS — CRIATÓRIO MINAS BIRD");
    lines.push("═══════════════════════════════════════════════════");
    lines.push("");
    lines.push(`Período: ${formatDate(fromInputDate(startDate))} a ${formatDate(fromInputDate(endDate))} (${shoppingList.totalDays} dias)`);
    lines.push(`Espécies: ${isAllSelected ? "Todas (plantel)" : effectiveSpeciesIds.map(id => species.find(s => s.id === id)?.commonName).filter(Boolean).join(", ")}`);
    lines.push("");

    const categories: FoodCategory[] = ["racao", "vegetais", "frutas", "proteicos"];
    for (const cat of categories) {
      const items = shoppingList.grouped[cat];
      if (items.length === 0) continue;
      lines.push(`───── ${CATEGORY_CONFIG[cat].label.toUpperCase()} ─────`);
      for (const item of items) {
        const kg = item.totalGrams >= 1000 ? `${(item.totalGrams / 1000).toFixed(2)} kg` : `${item.totalGrams.toFixed(0)}g`;
        lines.push(`  ☐ ${item.name}: ${kg}`);
      }
      lines.push("");
    }

    lines.push("═══════════════════════════════════════════════════");
    lines.push(`Gerado em ${formatDate(new Date())}`);

    const blob = new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `lista-compras-${startDate}-a-${endDate}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportRoutineText = () => {
    if (!dailyRoutine) return;
    const lines: string[] = [];
    lines.push("═══════════════════════════════════════════════════");
    lines.push("  ROTINA DIÁRIA DO TRATADOR — CRIATÓRIO MINAS BIRD");
    lines.push("═══════════════════════════════════════════════════");
    lines.push("");
    lines.push(`Período: ${formatDate(fromInputDate(startDate))} a ${formatDate(fromInputDate(endDate))}`);
    lines.push("");

    for (const { date, speciesRoutines } of dailyRoutine) {
      const dayName = DAY_NAMES[date.getDay()];
      lines.push(`━━━ ${dayName}, ${formatDate(date)} ━━━`);
      lines.push("");

      for (const { species: sp, diet } of speciesRoutines) {
        lines.push(`  🐦 ${sp.commonName} (${diet.birdCount} aves)`);
        lines.push(`     Dieta: ${diet.name}`);
        const categories: FoodCategory[] = ["racao", "vegetais", "frutas", "proteicos"];
        for (const cat of categories) {
          if (diet.items[cat].length > 0) {
            const catItems = diet.items[cat].map(i => `${i.foodName} ${(i.grams * diet.birdCount).toFixed(0)}g`).join(", ");
            lines.push(`     ${CATEGORY_CONFIG[cat].label}: ${catItems}`);
          }
        }
        lines.push("");
      }
    }

    lines.push("═══════════════════════════════════════════════════");
    lines.push(`Gerado em ${formatDate(new Date())}`);

    const blob = new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `rotina-tratador-${startDate}-a-${endDate}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportPrepGuideText = () => {
    if (!prepGuide || prepGuide.speciesPreps.length === 0) return;
    const lines: string[] = [];
    const dayName = DAY_NAMES[prepGuide.date.getDay()];
    lines.push("═══════════════════════════════════════════════════");
    lines.push("  GUIA DE PREPARO — CRIATÓRIO MINAS BIRD");
    lines.push("═══════════════════════════════════════════════════");
    lines.push("");
    lines.push(`Data: ${dayName}, ${formatDate(prepGuide.date)}`);
    lines.push("");

    lines.push("───── INGREDIENTES TOTAIS ─────");
    const sortedItems = Object.entries(prepGuide.consolidated).sort((a, b) => b[1].totalGrams - a[1].totalGrams);
    for (const [name, data] of sortedItems) {
      const kg = data.totalGrams >= 1000 ? `${(data.totalGrams / 1000).toFixed(2)} kg` : `${data.totalGrams.toFixed(0)}g`;
      lines.push(`  • ${name}: ${kg}`);
    }
    lines.push("");

    lines.push("───── PREPARO POR ESPÉCIE ─────");
    for (const { species: sp, diet } of prepGuide.speciesPreps) {
      lines.push("");
      lines.push(`  🐦 ${sp.commonName} — ${diet.birdCount} aves`);
      const categories: FoodCategory[] = ["racao", "vegetais", "frutas", "proteicos"];
      for (const cat of categories) {
        if (diet.items[cat].length > 0) {
          lines.push(`     ${CATEGORY_CONFIG[cat].label}:`);
          for (const item of diet.items[cat]) {
            lines.push(`       • ${item.foodName}: ${item.grams.toFixed(1)}g/ave → ${(item.grams * diet.birdCount).toFixed(0)}g total`);
          }
        }
      }
    }

    lines.push("");
    lines.push("═══════════════════════════════════════════════════");
    lines.push(`Gerado em ${formatDate(new Date())}`);

    const blob = new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `guia-preparo-${singleDate}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ============================================
  // FORMAT HELPERS
  // ============================================
  function formatGrams(g: number): string {
    if (g >= 1000) return `${(g / 1000).toFixed(2)} kg`;
    return `${g.toFixed(0)}g`;
  }

  // ============================================
  // RENDER
  // ============================================
  const tabs: { id: ToolTab; label: string; icon: typeof ShoppingCart; color: string }[] = [
    { id: "shopping", label: "Lista de Compras", icon: ShoppingCart, color: "text-blue-600" },
    { id: "routine", label: "Rotina do Tratador", icon: ClipboardList, color: "text-emerald-600" },
    { id: "prep", label: "Guia de Preparo", icon: ChefHat, color: "text-amber-600" },
  ];

  return (
    <div className="bg-white rounded-xl border border-stone-200 shadow-sm overflow-hidden">
      {/* Tabs */}
      <div className="flex border-b border-stone-200">
        {tabs.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-all border-b-2",
                isActive
                  ? `${tab.color} border-current bg-stone-50`
                  : "text-stone-400 border-transparent hover:text-stone-600 hover:bg-stone-50/50"
              )}
            >
              <Icon className="w-4 h-4" />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div className="p-5">
        {/* ===== SPECIES SELECTOR (shared) ===== */}
        <div className="mb-4">
          <label className="text-[10px] font-semibold text-stone-500 uppercase tracking-wider block mb-1.5">Espécies</label>
          <div className="flex flex-wrap gap-1.5">
            <button
              onClick={() => toggleSpecies("__all__")}
              className={cn(
                "px-3 py-1.5 rounded-full text-xs font-medium transition-all border",
                isAllSelected
                  ? "bg-emerald-600 text-white border-emerald-600"
                  : "bg-white text-stone-600 border-stone-200 hover:border-emerald-300"
              )}
            >
              Todas
            </button>
            {activeFlockSpecies.map(sp => {
              const isSelected = isAllSelected || selectedSpeciesIds.has(sp.id);
              return (
                <button
                  key={sp.id}
                  onClick={() => toggleSpecies(sp.id)}
                  className={cn(
                    "px-3 py-1.5 rounded-full text-xs font-medium transition-all border",
                    isSelected && !isAllSelected
                      ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                      : isAllSelected
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                        : "bg-white text-stone-500 border-stone-200 hover:border-emerald-300"
                  )}
                >
                  {sp.commonName}
                  <span className="ml-1 text-[10px] opacity-60">({sp.currentCount})</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* ===== DATE SELECTORS ===== */}
        {activeTab !== "prep" ? (
          <div className="flex items-center gap-3 mb-5">
            <div className="flex-1">
              <label className="text-[10px] font-semibold text-stone-500 uppercase tracking-wider block mb-1">De</label>
              <input
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-stone-200 rounded-lg focus:outline-none focus:border-emerald-400"
              />
            </div>
            <div className="flex-1">
              <label className="text-[10px] font-semibold text-stone-500 uppercase tracking-wider block mb-1">Até</label>
              <input
                type="date"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-stone-200 rounded-lg focus:outline-none focus:border-emerald-400"
              />
            </div>
          </div>
        ) : (
          <div className="mb-5">
            <label className="text-[10px] font-semibold text-stone-500 uppercase tracking-wider block mb-1">Data</label>
            <input
              type="date"
              value={singleDate}
              onChange={e => setSingleDate(e.target.value)}
              className="w-full max-w-xs px-3 py-2 text-sm border border-stone-200 rounded-lg focus:outline-none focus:border-emerald-400"
            />
          </div>
        )}

        {/* ===== TAB: LISTA DE COMPRAS ===== */}
        {activeTab === "shopping" && (
          <div>
            {!shoppingList || Object.values(shoppingList.grouped).every(arr => arr.length === 0) ? (
              <div className="text-center py-10 text-stone-400">
                <ShoppingCart className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p className="text-sm">Nenhuma dieta programada no período selecionado.</p>
                <p className="text-xs mt-1">Programe dietas no calendário para gerar a lista de compras.</p>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Package className="w-4 h-4 text-blue-600" />
                    <span className="text-sm font-semibold text-stone-700">
                      {shoppingList.totalDays} dias · {Object.values(shoppingList.grouped).reduce((sum, arr) => sum + arr.length, 0)} itens
                    </span>
                  </div>
                  <button
                    onClick={exportShoppingListText}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Exportar
                  </button>
                </div>

                <div className="space-y-4">
                  {(["racao", "vegetais", "frutas", "proteicos"] as FoodCategory[]).map(cat => {
                    const items = shoppingList.grouped[cat];
                    if (items.length === 0) return null;
                    const config = CATEGORY_CONFIG[cat];
                    const Icon = config.icon;

                    return (
                      <div key={cat} className={cn("rounded-lg border p-4", config.bg, config.border)}>
                        <div className="flex items-center gap-2 mb-3">
                          <Icon className={cn("w-4 h-4", config.color)} />
                          <span className={cn("text-sm font-bold", config.color)}>{config.label}</span>
                          <span className="text-[10px] text-stone-400">({items.length} itens)</span>
                        </div>
                        <div className="space-y-2">
                          {items.map((item, i) => (
                            <div key={i} className="flex items-center justify-between bg-white/80 rounded-md px-3 py-2 border border-white">
                              <div className="flex items-center gap-2">
                                <div className="w-4 h-4 rounded border border-stone-300 flex-shrink-0" />
                                <span className="text-sm text-stone-700">{item.name}</span>
                              </div>
                              <div className="text-right">
                                <span className="text-sm font-bold text-stone-800">{formatGrams(item.totalGrams)}</span>
                                {Object.keys(item.perSpecies).length > 1 && (
                                  <div className="text-[10px] text-stone-400 mt-0.5">
                                    {Object.entries(item.perSpecies).map(([sp, g]) => `${sp}: ${formatGrams(g)}`).join(" · ")}
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        )}

        {/* ===== TAB: ROTINA DO TRATADOR ===== */}
        {activeTab === "routine" && (
          <div>
            {!dailyRoutine || dailyRoutine.length === 0 ? (
              <div className="text-center py-10 text-stone-400">
                <ClipboardList className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p className="text-sm">Nenhuma dieta programada no período selecionado.</p>
                <p className="text-xs mt-1">Programe dietas no calendário para gerar a rotina.</p>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <ClipboardList className="w-4 h-4 text-emerald-600" />
                    <span className="text-sm font-semibold text-stone-700">
                      {dailyRoutine.length} dias com atividades
                    </span>
                  </div>
                  <button
                    onClick={exportRoutineText}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Exportar
                  </button>
                </div>

                <div className="space-y-3">
                  {dailyRoutine.map(({ date, speciesRoutines }, idx) => {
                    const dayName = DAY_NAMES_SHORT[date.getDay()];
                    const isWeekend = date.getDay() === 0 || date.getDay() === 6;

                    return (
                      <div key={idx} className={cn("rounded-lg border p-4", isWeekend ? "bg-amber-50/50 border-amber-200" : "bg-white border-stone-200")}>
                        <div className="flex items-center gap-2 mb-3">
                          <Calendar className="w-4 h-4 text-stone-500" />
                          <span className={cn("text-sm font-bold", isWeekend ? "text-amber-700" : "text-stone-800")}>
                            {dayName}, {formatDate(date)}
                          </span>
                          <span className="text-[10px] text-stone-400">({speciesRoutines.length} espécies)</span>
                        </div>

                        <div className="space-y-2">
                          {speciesRoutines.map(({ species: sp, diet }, si) => (
                            <div key={si} className="bg-stone-50 rounded-md p-3 border border-stone-100">
                              <div className="flex items-center gap-2 mb-2">
                                <Bird className="w-3.5 h-3.5 text-emerald-600" />
                                <span className="text-sm font-semibold text-stone-700">{sp.commonName}</span>
                                <span className="text-[10px] text-stone-400 flex items-center gap-1">
                                  <Users className="w-3 h-3" /> {diet.birdCount} aves
                                </span>
                              </div>

                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                {(["racao", "vegetais", "frutas", "proteicos"] as FoodCategory[]).map(cat => {
                                  if (diet.items[cat].length === 0) return null;
                                  const config = CATEGORY_CONFIG[cat];
                                  const Icon = config.icon;
                                  return (
                                    <div key={cat} className={cn("rounded px-2 py-1.5 border", config.bg, config.border)}>
                                      <div className="flex items-center gap-1 mb-1">
                                        <Icon className={cn("w-3 h-3", config.color)} />
                                        <span className={cn("text-[10px] font-bold", config.color)}>{config.label}</span>
                                      </div>
                                      {diet.items[cat].map((item, ii) => (
                                        <div key={ii} className="text-[11px] text-stone-600">
                                          {item.foodName} <span className="font-medium">{(item.grams * diet.birdCount).toFixed(0)}g</span>
                                        </div>
                                      ))}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        )}

        {/* ===== TAB: GUIA DE PREPARO ===== */}
        {activeTab === "prep" && (
          <div>
            {prepGuide.speciesPreps.length === 0 ? (
              <div className="text-center py-10 text-stone-400">
                <ChefHat className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p className="text-sm">Nenhuma dieta programada para este dia.</p>
                <p className="text-xs mt-1">Programe dietas no calendário para gerar o guia de preparo.</p>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <ChefHat className="w-4 h-4 text-amber-600" />
                    <span className="text-sm font-semibold text-stone-700">
                      {DAY_NAMES[prepGuide.date.getDay()]}, {formatDate(prepGuide.date)} · {prepGuide.speciesPreps.length} espécies
                    </span>
                  </div>
                  <button
                    onClick={exportPrepGuideText}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Exportar
                  </button>
                </div>

                {/* Consolidated ingredients */}
                <div className="mb-5 bg-amber-50 rounded-lg border border-amber-200 p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Package className="w-4 h-4 text-amber-700" />
                    <span className="text-sm font-bold text-amber-800">Ingredientes Totais do Dia</span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {Object.entries(prepGuide.consolidated)
                      .sort((a, b) => b[1].totalGrams - a[1].totalGrams)
                      .map(([name, data], i) => {
                        const config = CATEGORY_CONFIG[data.category];
                        const Icon = config.icon;
                        return (
                          <div key={i} className="flex items-center gap-2 bg-white rounded-md px-2.5 py-1.5 border border-amber-100">
                            <Icon className={cn("w-3 h-3 flex-shrink-0", config.color)} />
                            <span className="text-xs text-stone-600 truncate">{name}</span>
                            <span className="text-xs font-bold text-stone-800 ml-auto">{formatGrams(data.totalGrams)}</span>
                          </div>
                        );
                      })}
                  </div>
                </div>

                {/* Step-by-step prep per category */}
                <div className="space-y-4">
                  {prepGuide.steps.map((step, si) => {
                    const config = CATEGORY_CONFIG[step.category];
                    const Icon = config.icon;
                    const stepLabels: Record<FoodCategory, string> = {
                      racao: "1. Separar Ração",
                      vegetais: "2. Lavar e Picar Vegetais",
                      frutas: "3. Lavar e Picar Frutas",
                      proteicos: "4. Preparar Proteicos",
                    };

                    return (
                      <div key={si} className={cn("rounded-lg border p-4", config.bg, config.border)}>
                        <div className="flex items-center gap-2 mb-3">
                          <div className={cn("w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold", step.category === "racao" ? "bg-amber-500" : step.category === "vegetais" ? "bg-emerald-500" : step.category === "frutas" ? "bg-red-400" : "bg-purple-500")}>
                            {si + 1}
                          </div>
                          <Icon className={cn("w-4 h-4", config.color)} />
                          <span className={cn("text-sm font-bold", config.color)}>{stepLabels[step.category]}</span>
                        </div>

                        <div className="space-y-1.5">
                          {step.items.map((item, ii) => (
                            <div key={ii} className="flex items-center justify-between bg-white/80 rounded-md px-3 py-2 border border-white">
                              <div>
                                <span className="text-sm text-stone-700">{item.foodName}</span>
                                <span className="text-[10px] text-stone-400 ml-2">para {item.speciesName}</span>
                              </div>
                              <div className="text-right">
                                <span className="text-sm font-bold text-stone-800">{formatGrams(item.totalGrams)}</span>
                                <span className="text-[10px] text-stone-400 block">
                                  {item.gramsPerBird.toFixed(1)}g/ave × {item.birdCount}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
