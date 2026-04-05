/**
 * OperationalTools — 3 ferramentas operacionais para o módulo de Alimentação
 * 1. Lista de Compras (período + espécie)
 * 2. Rotina Diária do Tratador (período + espécie)
 * 3. Guia de Preparo (dia + espécie)
 *
 * Estética idêntica ao card "Exportar Calendários em PDF".
 */
import { useState, useMemo } from "react";
import {
  ShoppingCart, ClipboardList, ChefHat, Calendar,
  Bird, Download, Package, Wheat, Leaf, Apple, Zap, Users, Scale,
  FileText,
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

function formatDateBR(d: Date): string {
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

/**
 * Formata peso de forma padronizada:
 * - Sempre em gramas com 1 casa decimal: "12,5 gramas"
 * - Acima de 1000g, mostra também em kg: "1.250,0 gramas (1,25 kg)"
 */
function formatWeight(g: number): string {
  const formatted = g.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  if (g >= 1000) {
    const kg = (g / 1000).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return `${formatted} gramas (${kg} kg)`;
  }
  return `${formatted} gramas`;
}

/** Formato curto para tabelas: "12,5 g" ou "1.250,0 g (1,25 kg)" */
function formatWeightShort(g: number): string {
  const formatted = g.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  if (g >= 1000) {
    const kg = (g / 1000).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return `${formatted} g (${kg} kg)`;
  }
  return `${formatted} g`;
}

const CATEGORY_CONFIG = {
  racao: { label: "Ração", icon: Wheat, color: "text-amber-700", bg: "bg-amber-50", border: "border-amber-200", badgeBg: "bg-amber-100", badgeText: "text-amber-800" },
  vegetais: { label: "Vegetais", icon: Leaf, color: "text-emerald-700", bg: "bg-emerald-50", border: "border-emerald-200", badgeBg: "bg-emerald-100", badgeText: "text-emerald-800" },
  frutas: { label: "Frutas", icon: Apple, color: "text-red-600", bg: "bg-red-50", border: "border-red-200", badgeBg: "bg-red-100", badgeText: "text-red-700" },
  proteicos: { label: "Proteicos", icon: Zap, color: "text-purple-700", bg: "bg-purple-50", border: "border-purple-200", badgeBg: "bg-purple-100", badgeText: "text-purple-800" },
} as const;

type FoodCategory = keyof typeof CATEGORY_CONFIG;

// ============================================
// PERIOD OPTIONS (same as Export card)
// ============================================
const PERIOD_OPTIONS = [
  { label: "Semana Atual", value: "current-week" },
  { label: "Próximos 7 Dias", value: "next-7" },
  { label: "Próximos 15 Dias", value: "next-15" },
  { label: "Mês Atual", value: "current-month" },
  { label: "Próximos 30 Dias", value: "next-30" },
  { label: "Personalizado", value: "custom" },
];

function getDateRangeForPeriod(period: string): { start: Date; end: Date } {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  switch (period) {
    case "current-week": {
      const dayOfWeek = today.getDay();
      const monday = new Date(today);
      monday.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      return { start: monday, end: sunday };
    }
    case "next-7": {
      const end = new Date(today);
      end.setDate(today.getDate() + 6);
      return { start: today, end };
    }
    case "next-15": {
      const end = new Date(today);
      end.setDate(today.getDate() + 14);
      return { start: today, end };
    }
    case "current-month": {
      const start = new Date(today.getFullYear(), today.getMonth(), 1);
      const end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      return { start, end };
    }
    case "next-30": {
      const end = new Date(today);
      end.setDate(today.getDate() + 29);
      return { start: today, end };
    }
    default:
      return { start: today, end: today };
  }
}

// ============================================
// COMPONENT
// ============================================
export default function OperationalTools({ savedDiets, speciesCalendars }: OperationalToolsProps) {
  const [activeTab, setActiveTab] = useState<ToolTab>("shopping");

  // --- Shared selectors (same pattern as Export card) ---
  const [selectedSpeciesIds, setSelectedSpeciesIds] = useState<string[]>(activeFlockSpecies.map(s => s.id));
  const [period, setPeriod] = useState("next-7");
  const [customDateFrom, setCustomDateFrom] = useState("");
  const [customDateTo, setCustomDateTo] = useState("");
  // For prep guide: single date
  const [singleDate, setSingleDate] = useState<string>(toInputDate(new Date()));

  // Derived date range
  const dateRange = useMemo(() => {
    if (period === "custom" && customDateFrom && customDateTo) {
      return { start: fromInputDate(customDateFrom), end: fromInputDate(customDateTo) };
    }
    return getDateRangeForPeriod(period);
  }, [period, customDateFrom, customDateTo]);

  const startDate = toInputDate(dateRange.start);
  const endDate = toInputDate(dateRange.end);

  // Toggle species (same pattern as Export card)
  const toggleSpecies = (id: string) => {
    setSelectedSpeciesIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const toggleAll = () => {
    if (selectedSpeciesIds.length === activeFlockSpecies.length) {
      setSelectedSpeciesIds([]);
    } else {
      setSelectedSpeciesIds(activeFlockSpecies.map(s => s.id));
    }
  };

  const effectiveSpeciesIds = selectedSpeciesIds;

  // ============================================
  // SHOPPING LIST LOGIC
  // ============================================
  const shoppingList = useMemo(() => {
    const start = fromInputDate(startDate);
    const end = fromInputDate(endDate);
    if (start > end) return null;

    const days = getDaysInRange(start, end);
    const totalDays = days.length;

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

    const grouped: Record<FoodCategory, { name: string; totalGrams: number; perSpecies: Record<string, number> }[]> = {
      racao: [], vegetais: [], frutas: [], proteicos: [],
    };

    for (const [name, data] of Object.entries(aggregate)) {
      grouped[data.category].push({ name, totalGrams: data.totalGrams, perSpecies: data.perSpecies });
    }

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
    lines.push(`Período: ${formatDateBR(fromInputDate(startDate))} a ${formatDateBR(fromInputDate(endDate))} (${shoppingList.totalDays} dias)`);
    lines.push(`Espécies: ${selectedSpeciesIds.length === activeFlockSpecies.length ? "Todas (plantel)" : effectiveSpeciesIds.map(id => species.find(s => s.id === id)?.commonName).filter(Boolean).join(", ")}`);
    lines.push("");

    const categories: FoodCategory[] = ["racao", "vegetais", "frutas", "proteicos"];
    for (const cat of categories) {
      const items = shoppingList.grouped[cat];
      if (items.length === 0) continue;
      lines.push(`───── ${CATEGORY_CONFIG[cat].label.toUpperCase()} ─────`);
      for (const item of items) {
        lines.push(`  • ${item.name}: ${formatWeight(item.totalGrams)}`);
      }
      lines.push("");
    }

    lines.push("═══════════════════════════════════════════════════");
    lines.push(`Gerado em ${formatDateBR(new Date())}`);

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
    lines.push(`Período: ${formatDateBR(fromInputDate(startDate))} a ${formatDateBR(fromInputDate(endDate))}`);
    lines.push("");

    for (const { date, speciesRoutines } of dailyRoutine) {
      const dayName = DAY_NAMES[date.getDay()];
      lines.push(`━━━ ${dayName}, ${formatDateBR(date)} ━━━`);
      lines.push("");

      for (const { species: sp, diet } of speciesRoutines) {
        lines.push(`  ${sp.commonName} (${diet.birdCount} aves)`);
        lines.push(`     Dieta: ${diet.name}`);
        const categories: FoodCategory[] = ["racao", "vegetais", "frutas", "proteicos"];
        for (const cat of categories) {
          if (diet.items[cat].length > 0) {
            const catItems = diet.items[cat].map(i => `${i.foodName} ${formatWeightShort(i.grams * diet.birdCount)}`).join(", ");
            lines.push(`     ${CATEGORY_CONFIG[cat].label}: ${catItems}`);
          }
        }
        lines.push("");
      }
    }

    lines.push("═══════════════════════════════════════════════════");
    lines.push(`Gerado em ${formatDateBR(new Date())}`);

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
    lines.push(`Data: ${dayName}, ${formatDateBR(prepGuide.date)}`);
    lines.push("");

    lines.push("───── INGREDIENTES TOTAIS ─────");
    const sortedItems = Object.entries(prepGuide.consolidated).sort((a, b) => b[1].totalGrams - a[1].totalGrams);
    for (const [name, data] of sortedItems) {
      lines.push(`  • ${name}: ${formatWeight(data.totalGrams)}`);
    }
    lines.push("");

    lines.push("───── PREPARO POR ESPÉCIE ─────");
    for (const { species: sp, diet } of prepGuide.speciesPreps) {
      lines.push("");
      lines.push(`  ${sp.commonName} — ${diet.birdCount} aves`);
      const categories: FoodCategory[] = ["racao", "vegetais", "frutas", "proteicos"];
      for (const cat of categories) {
        if (diet.items[cat].length > 0) {
          lines.push(`     ${CATEGORY_CONFIG[cat].label}:`);
          for (const item of diet.items[cat]) {
            lines.push(`       • ${item.foodName}: ${formatWeightShort(item.grams)} por ave — ${formatWeightShort(item.grams * diet.birdCount)} total`);
          }
        }
      }
    }

    lines.push("");
    lines.push("═══════════════════════════════════════════════════");
    lines.push(`Gerado em ${formatDateBR(new Date())}`);

    const blob = new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `guia-preparo-${singleDate}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ============================================
  // RENDER
  // ============================================
  const tabs: { id: ToolTab; label: string; icon: typeof ShoppingCart; color: string; activeColor: string; activeBg: string }[] = [
    { id: "shopping", label: "Lista de Compras", icon: ShoppingCart, color: "text-blue-600", activeColor: "text-blue-700", activeBg: "bg-blue-50" },
    { id: "routine", label: "Rotina do Tratador", icon: ClipboardList, color: "text-emerald-600", activeColor: "text-emerald-700", activeBg: "bg-emerald-50" },
    { id: "prep", label: "Guia de Preparo", icon: ChefHat, color: "text-amber-600", activeColor: "text-amber-700", activeBg: "bg-amber-50" },
  ];

  const currentTabConfig = tabs.find(t => t.id === activeTab)!;

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
                "flex-1 flex items-center justify-center gap-2 px-4 py-3.5 text-sm font-semibold transition-all border-b-2",
                isActive
                  ? `${tab.color} border-current ${tab.activeBg}`
                  : "text-stone-400 border-transparent hover:text-stone-600 hover:bg-stone-50/50"
              )}
            >
              <Icon className="w-4.5 h-4.5" />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div className="p-5">
        {/* ===== SPECIES SELECTOR (same style as Export card) ===== */}
        <div className="mb-4">
          <label className="text-xs font-semibold text-stone-600 mb-1.5 block">Espécies</label>
          <div className="flex flex-wrap gap-1.5">
            <button
              onClick={toggleAll}
              className={cn(
                "px-2.5 py-1 text-xs font-medium rounded-md border transition-colors",
                selectedSpeciesIds.length === activeFlockSpecies.length
                  ? "bg-indigo-600 text-white border-indigo-600"
                  : "bg-white text-stone-600 border-stone-200 hover:border-indigo-300"
              )}
            >
              {selectedSpeciesIds.length === activeFlockSpecies.length ? "✓ Todas" : "Todas"} ({activeFlockSpecies.length})
            </button>
            {activeFlockSpecies.map(sp => {
              const isSelected = selectedSpeciesIds.includes(sp.id);
              return (
                <button
                  key={sp.id}
                  onClick={() => toggleSpecies(sp.id)}
                  className={cn(
                    "px-2.5 py-1 text-xs font-medium rounded-md border transition-colors",
                    isSelected
                      ? "bg-emerald-600 text-white border-emerald-600"
                      : "bg-white text-stone-600 border-stone-200 hover:border-emerald-300"
                  )}
                >
                  {isSelected ? "✓ " : ""}{sp.commonName}
                </button>
              );
            })}
          </div>
        </div>

        {/* ===== PERIOD SELECTOR (same style as Export card) ===== */}
        {activeTab !== "prep" ? (
          <>
            <div className="mb-3">
              <label className="text-xs font-semibold text-stone-600 mb-1.5 block">Período Predefinido</label>
              <div className="flex flex-wrap gap-1.5">
                {PERIOD_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => setPeriod(opt.value)}
                    className={cn(
                      "px-2.5 py-1 text-xs font-medium rounded-md border transition-colors",
                      period === opt.value
                        ? "bg-indigo-600 text-white border-indigo-600"
                        : "bg-white text-stone-600 border-stone-200 hover:border-indigo-300"
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom date range (when Personalizado) */}
            {period === "custom" && (
              <div className="mb-4 p-3 bg-stone-50 rounded-lg border border-stone-200">
                <label className="text-xs font-semibold text-stone-600 mb-1.5 block">Selecione as datas</label>
                <div className="flex items-center gap-2">
                  <input
                    type="date"
                    value={customDateFrom}
                    onChange={(e) => setCustomDateFrom(e.target.value)}
                    className="px-2.5 py-1.5 text-sm border border-stone-200 rounded-md bg-white text-stone-700 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                  />
                  <span className="text-sm text-stone-400 font-medium">até</span>
                  <input
                    type="date"
                    value={customDateTo}
                    onChange={(e) => setCustomDateTo(e.target.value)}
                    className="px-2.5 py-1.5 text-sm border border-stone-200 rounded-md bg-white text-stone-700 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                  />
                  {customDateFrom && customDateTo && (
                    <button
                      onClick={() => { setCustomDateFrom(""); setCustomDateTo(""); setPeriod("next-7"); }}
                      className="text-xs text-red-500 hover:text-red-700 font-medium"
                    >
                      Limpar
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Date range summary */}
            <div className="mb-5 flex items-center gap-2 px-3 py-2 bg-stone-50 rounded-lg border border-stone-100">
              <Calendar className="w-4 h-4 text-stone-500" />
              <span className="text-sm font-medium text-stone-700">
                {formatDateBR(dateRange.start)} a {formatDateBR(dateRange.end)}
              </span>
              <span className="text-xs text-stone-400">
                ({getDaysInRange(dateRange.start, dateRange.end).length} dias)
              </span>
            </div>
          </>
        ) : (
          /* Prep guide: single date selector */
          <div className="mb-5">
            <label className="text-xs font-semibold text-stone-600 mb-1.5 block">Ou selecione a data</label>
            <div className="flex items-center gap-3">
              <input
                type="date"
                value={singleDate}
                onChange={e => setSingleDate(e.target.value)}
                className="px-2.5 py-1.5 text-sm border border-stone-200 rounded-md bg-white text-stone-700 focus:outline-none focus:ring-2 focus:ring-indigo-300"
              />
              <div className="flex items-center gap-2 px-3 py-2 bg-stone-50 rounded-lg border border-stone-100">
                <Calendar className="w-4 h-4 text-stone-500" />
                <span className="text-sm font-medium text-stone-700">
                  {DAY_NAMES[fromInputDate(singleDate).getDay()]}, {formatDateBR(fromInputDate(singleDate))}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* ===== TAB: LISTA DE COMPRAS ===== */}
        {activeTab === "shopping" && (
          <div>
            {!shoppingList || Object.values(shoppingList.grouped).every(arr => arr.length === 0) ? (
              <div className="text-center py-12 text-stone-400">
                <ShoppingCart className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="text-base font-medium">Nenhuma dieta programada no período selecionado.</p>
                <p className="text-sm mt-1">Programe dietas no calendário para gerar a lista de compras.</p>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Package className="w-5 h-5 text-blue-600" />
                    <span className="text-base font-bold text-stone-800">
                      {shoppingList.totalDays} dias
                    </span>
                    <span className="text-sm text-stone-500">
                      {Object.values(shoppingList.grouped).reduce((sum, arr) => sum + arr.length, 0)} itens no total
                    </span>
                  </div>
                  <button
                    onClick={exportShoppingListText}
                    className="flex items-center gap-1.5 px-3 py-2 text-sm font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors"
                  >
                    <Download className="w-4 h-4" />
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
                      <div key={cat} className={cn("rounded-xl border p-4", config.bg, config.border)}>
                        <div className="flex items-center gap-2 mb-3">
                          <Icon className={cn("w-5 h-5", config.color)} />
                          <span className={cn("text-base font-bold", config.color)}>{config.label}</span>
                          <span className={cn("px-2 py-0.5 text-xs font-semibold rounded-full", config.badgeBg, config.badgeText)}>
                            {items.length} {items.length === 1 ? "item" : "itens"}
                          </span>
                        </div>
                        <div className="space-y-2">
                          {items.map((item, i) => (
                            <div key={i} className="flex items-center justify-between bg-white rounded-lg px-4 py-3 border border-white/80 shadow-sm">
                              <span className="text-base font-medium text-stone-800">{item.name}</span>
                              <div className="text-right">
                                <span className="text-base font-bold text-stone-900">{formatWeightShort(item.totalGrams)}</span>
                                {Object.keys(item.perSpecies).length > 1 && (
                                  <div className="text-xs text-stone-500 mt-0.5">
                                    {Object.entries(item.perSpecies).map(([sp, g]) => `${sp}: ${formatWeightShort(g)}`).join(" · ")}
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
              <div className="text-center py-12 text-stone-400">
                <ClipboardList className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="text-base font-medium">Nenhuma dieta programada no período selecionado.</p>
                <p className="text-sm mt-1">Programe dietas no calendário para gerar a rotina.</p>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <ClipboardList className="w-5 h-5 text-emerald-600" />
                    <span className="text-base font-bold text-stone-800">
                      {dailyRoutine.length} dias com atividades
                    </span>
                  </div>
                  <button
                    onClick={exportRoutineText}
                    className="flex items-center gap-1.5 px-3 py-2 text-sm font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    Exportar
                  </button>
                </div>

                <div className="space-y-4">
                  {dailyRoutine.map(({ date, speciesRoutines }, idx) => {
                    const dayName = DAY_NAMES_SHORT[date.getDay()];
                    const isWeekend = date.getDay() === 0 || date.getDay() === 6;

                    return (
                      <div key={idx} className={cn("rounded-xl border p-4", isWeekend ? "bg-amber-50/60 border-amber-200" : "bg-white border-stone-200")}>
                        <div className="flex items-center gap-2 mb-3">
                          <Calendar className="w-5 h-5 text-stone-500" />
                          <span className={cn("text-base font-bold", isWeekend ? "text-amber-700" : "text-stone-800")}>
                            {dayName}, {formatDateBR(date)}
                          </span>
                          <span className={cn("px-2 py-0.5 text-xs font-semibold rounded-full", isWeekend ? "bg-amber-100 text-amber-700" : "bg-stone-100 text-stone-600")}>
                            {speciesRoutines.length} {speciesRoutines.length === 1 ? "espécie" : "espécies"}
                          </span>
                        </div>

                        <div className="space-y-3">
                          {speciesRoutines.map(({ species: sp, diet }, si) => (
                            <div key={si} className="bg-stone-50 rounded-lg p-4 border border-stone-100">
                              <div className="flex items-center gap-2 mb-3">
                                <Bird className="w-4.5 h-4.5 text-emerald-600" />
                                <span className="text-base font-bold text-stone-800">{sp.commonName}</span>
                                <span className="flex items-center gap-1 text-sm text-stone-500 font-medium">
                                  <Users className="w-3.5 h-3.5" /> {diet.birdCount} aves
                                </span>
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {(["racao", "vegetais", "frutas", "proteicos"] as FoodCategory[]).map(cat => {
                                  if (diet.items[cat].length === 0) return null;
                                  const config = CATEGORY_CONFIG[cat];
                                  const Icon = config.icon;
                                  return (
                                    <div key={cat} className={cn("rounded-lg px-3 py-2.5 border", config.bg, config.border)}>
                                      <div className="flex items-center gap-1.5 mb-1.5">
                                        <Icon className={cn("w-4 h-4", config.color)} />
                                        <span className={cn("text-sm font-bold", config.color)}>{config.label}</span>
                                      </div>
                                      {diet.items[cat].map((item, ii) => (
                                        <div key={ii} className="flex items-center justify-between text-sm text-stone-700 py-0.5">
                                          <span className="font-medium">{item.foodName}</span>
                                          <span className="font-bold text-stone-800">{formatWeightShort(item.grams * diet.birdCount)}</span>
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
              <div className="text-center py-12 text-stone-400">
                <ChefHat className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="text-base font-medium">Nenhuma dieta programada para este dia.</p>
                <p className="text-sm mt-1">Programe dietas no calendário para gerar o guia de preparo.</p>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <ChefHat className="w-5 h-5 text-amber-600" />
                    <span className="text-base font-bold text-stone-800">
                      {DAY_NAMES[prepGuide.date.getDay()]}, {formatDateBR(prepGuide.date)}
                    </span>
                    <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-amber-100 text-amber-700">
                      {prepGuide.speciesPreps.length} {prepGuide.speciesPreps.length === 1 ? "espécie" : "espécies"}
                    </span>
                  </div>
                  <button
                    onClick={exportPrepGuideText}
                    className="flex items-center gap-1.5 px-3 py-2 text-sm font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    Exportar
                  </button>
                </div>

                {/* Consolidated ingredients */}
                <div className="mb-5 bg-amber-50 rounded-xl border border-amber-200 p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Package className="w-5 h-5 text-amber-700" />
                    <span className="text-base font-bold text-amber-800">Ingredientes Totais do Dia</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {Object.entries(prepGuide.consolidated)
                      .sort((a, b) => b[1].totalGrams - a[1].totalGrams)
                      .map(([name, data], i) => {
                        const config = CATEGORY_CONFIG[data.category];
                        const Icon = config.icon;
                        return (
                          <div key={i} className="flex items-center gap-2 bg-white rounded-lg px-3 py-2.5 border border-amber-100 shadow-sm">
                            <Icon className={cn("w-4 h-4 flex-shrink-0", config.color)} />
                            <span className="text-sm font-medium text-stone-700">{name}</span>
                            <span className="text-sm font-bold text-stone-900 ml-auto">{formatWeightShort(data.totalGrams)}</span>
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
                      racao: "Separar Ração",
                      vegetais: "Lavar e Picar Vegetais",
                      frutas: "Lavar e Picar Frutas",
                      proteicos: "Preparar Proteicos",
                    };

                    return (
                      <div key={si} className={cn("rounded-xl border p-4", config.bg, config.border)}>
                        <div className="flex items-center gap-2 mb-3">
                          <div className={cn("w-7 h-7 rounded-full flex items-center justify-center text-white text-sm font-bold", step.category === "racao" ? "bg-amber-500" : step.category === "vegetais" ? "bg-emerald-500" : step.category === "frutas" ? "bg-red-400" : "bg-purple-500")}>
                            {si + 1}
                          </div>
                          <Icon className={cn("w-5 h-5", config.color)} />
                          <span className={cn("text-base font-bold", config.color)}>{stepLabels[step.category]}</span>
                        </div>

                        <div className="space-y-2">
                          {step.items.map((item, ii) => (
                            <div key={ii} className="flex items-center justify-between bg-white rounded-lg px-4 py-3 border border-white/80 shadow-sm">
                              <div>
                                <span className="text-base font-medium text-stone-800">{item.foodName}</span>
                                <span className="text-sm text-stone-500 ml-2">para {item.speciesName}</span>
                              </div>
                              <div className="text-right">
                                <span className="text-base font-bold text-stone-900">{formatWeightShort(item.totalGrams)}</span>
                                <div className="text-xs text-stone-500">
                                  {formatWeightShort(item.gramsPerBird)} por ave x {item.birdCount}
                                </div>
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
