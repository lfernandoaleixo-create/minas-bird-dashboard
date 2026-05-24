/**
 * FoodCalendarCard — 3 Tabelas mensais separadas por categoria (expansíveis)
 * + Cards por espécie de ave com seletor unificado (incluindo ração)
 * + Seletor de 4 fases da vida da ave
 * + Herança: alimentos dos 3 cards gerais aparecem automaticamente em TODAS as espécies
 * + Exclusividade: alimentos adicionados no card da espécie são exclusivos daquela ave
 * Indicador de qualidade (Excelente/Bom/Pobre) ao lado de cada alimento
 * Persistência em localStorage
 */
import { useState, useMemo, useCallback } from "react";
import {
  ChevronLeft, ChevronRight, ChevronDown, Plus, X, Leaf, Apple, Wheat,
  Check, FileDown, Bird
} from "lucide-react";
import { cn } from "@/lib/utils";
import { vegetais, frutas, proteicos, racoes, lifePeriods } from "@/data/petbird";
import { species } from "@/data/feeding";
import { exportFoodCalendarCategoryPdf, exportFoodCalendarSpeciesPdf } from "@/lib/foodCalendarPdf";

// Vegetais a excluir (marcados com ⚠️ na aba original)
const VEGETAIS_EXCLUIDOS = ["Alface Romana, Folha, Crua \u26a0\ufe0f", "Alface Lisa, Folha, Crua \u26a0\ufe0f", "Espinafre Comum, Folha, Crua \u26a0\ufe0f"];

// Mapeamento de classificação para qualidade
function getQuality(classification: string): "excelente" | "bom" | "pobre" {
  const c = classification.toLowerCase().trim();
  if (c === "melhores") return "excelente";
  if (c === "bons" || c === "boas") return "bom";
  if (c === "pobres" || c === "inadequado") return "pobre";
  return "bom";
}

const QUALITY_CONFIG = {
  excelente: {
    label: "Excelente",
    symbol: "+",
    color: "text-emerald-700",
    bg: "bg-emerald-100",
    border: "border-emerald-300",
    dotColor: "bg-emerald-500",
  },
  bom: {
    label: "Bom",
    symbol: "+/-",
    color: "text-blue-700",
    bg: "bg-blue-100",
    border: "border-blue-300",
    dotColor: "bg-blue-500",
  },
  pobre: {
    label: "Pobre",
    symbol: "-",
    color: "text-amber-700",
    bg: "bg-amber-100",
    border: "border-amber-300",
    dotColor: "bg-amber-500",
  },
};

// Cores de fundo da linha por categoria (para cards de espécie)
const CATEGORY_ROW_BG: Record<string, string> = {
  racao: "bg-amber-50/70",
  vegetais: "bg-emerald-50/70",
  frutas: "bg-red-50/70",
  proteicos: "bg-purple-50/70",
};

// Categorias com seus itens e classificações
interface CategoryConfig {
  label: string;
  icon: typeof Leaf;
  color: string;
  colorLight: string;
  borderColor: string;
  textColor: string;
  dotColor: string;
  checkColor: string;
  items: { name: string; quality: "excelente" | "bom" | "pobre" }[];
}

const FOOD_CATEGORIES: Record<string, CategoryConfig> = {
  vegetais: {
    label: "Vegetais / Hortaliças",
    icon: Leaf,
    color: "bg-green-600",
    colorLight: "bg-green-50",
    borderColor: "border-green-200",
    textColor: "text-green-700",
    dotColor: "bg-green-500",
    checkColor: "bg-green-600",
    items: vegetais
      .filter(f => f.name !== "Hortaliça Mediana" && !VEGETAIS_EXCLUIDOS.includes(f.name))
      .map(f => ({ name: f.name, quality: getQuality(f.classification) })),
  },
  frutas: {
    label: "Frutas",
    icon: Apple,
    color: "bg-orange-500",
    colorLight: "bg-orange-50",
    borderColor: "border-orange-200",
    textColor: "text-orange-700",
    dotColor: "bg-orange-400",
    checkColor: "bg-orange-500",
    items: frutas
      .filter(f => f.name !== "Fruta Mediana")
      .map(f => ({ name: f.name, quality: getQuality(f.classification) })),
  },
  proteicos: {
    label: "Sementes e Proteicos",
    icon: Wheat,
    color: "bg-amber-700",
    colorLight: "bg-amber-50",
    borderColor: "border-amber-200",
    textColor: "text-amber-800",
    dotColor: "bg-amber-600",
    checkColor: "bg-amber-700",
    items: proteicos
      .filter(f => f.name !== "Proteico Mediano")
      .map(f => ({ name: f.name, quality: getQuality(f.classification) })),
  },
};

// Categoria unificada para cards de espécie (inclui ração) — ordem fixa: ração, vegetais, frutas, sementes
const ALL_FOOD_ITEMS_UNIFIED: { name: string; quality: "excelente" | "bom" | "pobre"; category: string }[] = [
  ...racoes
    .filter(f => f.name !== "Ração Mediana")
    .map(f => ({ name: f.name, quality: getQuality(f.classification), category: "racao" })),
  ...FOOD_CATEGORIES.vegetais.items.map(f => ({ ...f, category: "vegetais" })),
  ...FOOD_CATEGORIES.frutas.items.map(f => ({ ...f, category: "frutas" })),
  ...FOOD_CATEGORIES.proteicos.items.map(f => ({ ...f, category: "proteicos" })),
];

// Espécies do plantel (com aves)
const ACTIVE_SPECIES = species.filter(s => s.currentCount > 0);

// Fases da vida da ave
const LIFE_PHASES = lifePeriods.map(p => ({ id: p.id, label: p.label }));

type CategoryKey = keyof typeof FOOD_CATEGORIES;

interface FoodEntry {
  name: string;
  category: string;
  quality: "excelente" | "bom" | "pobre";
}

const MONTHS = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

const STORAGE_KEY_FOODS = "foodCalendarFoods_v3";
const STORAGE_KEY_CHECKS = "foodCalendarChecks_v2";
const STORAGE_KEY_SPECIES_FOODS = "foodCalendarSpeciesFoods_v1";
const STORAGE_KEY_SPECIES_CHECKS = "foodCalendarSpeciesChecks_v1";
const STORAGE_KEY_SPECIES_PHASE = "foodCalendarSpeciesPhase_v1";

function getMonthKey(year: number, month: number) {
  return `${year}-${String(month + 1).padStart(2, "0")}`;
}

export default function FoodCalendarCard() {
  const today = new Date();
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [currentYear, setCurrentYear] = useState(today.getFullYear());

  // === CATEGORY TABLES STATE ===
  const [foods, setFoods] = useState<FoodEntry[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_FOODS);
      if (!saved) return [];
      const parsed = JSON.parse(saved) as FoodEntry[];
      return parsed.filter(f => f.category in FOOD_CATEGORIES);
    } catch { return []; }
  });

  const [checks, setChecks] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_CHECKS);
      return saved ? JSON.parse(saved) : {};
    } catch { return {}; }
  });

  // === SPECIES TABLES STATE ===
  // speciesFoods: { [speciesId]: FoodEntry[] } — EXCLUSIVE to that species
  const [speciesFoods, setSpeciesFoods] = useState<Record<string, FoodEntry[]>>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_SPECIES_FOODS);
      return saved ? JSON.parse(saved) : {};
    } catch { return {}; }
  });

  // speciesChecks: { [speciesId]: { "YYYY-MM|foodName|day": true } }
  const [speciesChecks, setSpeciesChecks] = useState<Record<string, Record<string, boolean>>>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_SPECIES_CHECKS);
      return saved ? JSON.parse(saved) : {};
    } catch { return {}; }
  });

  // Per-species selected phase
  const [speciesPhase, setSpeciesPhase] = useState<Record<string, string>>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_SPECIES_PHASE);
      return saved ? JSON.parse(saved) : {};
    } catch { return {}; }
  });

  // UI state
  const [addingCategory, setAddingCategory] = useState<CategoryKey | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});
  const [expandedSpecies, setExpandedSpecies] = useState<Record<string, boolean>>({});
  // Per-species: which category panel is open (toggle: click opens, click again closes)
  const [speciesOpenCat, setSpeciesOpenCat] = useState<Record<string, string | null>>({});
  const [speciesSearchTerm, setSpeciesSearchTerm] = useState("");

  // Persistir
  const saveFoods = useCallback((newFoods: FoodEntry[]) => {
    setFoods(newFoods);
    localStorage.setItem(STORAGE_KEY_FOODS, JSON.stringify(newFoods));
  }, []);

  const saveChecks = useCallback((newChecks: Record<string, boolean>) => {
    setChecks(newChecks);
    localStorage.setItem(STORAGE_KEY_CHECKS, JSON.stringify(newChecks));
  }, []);

  const saveSpeciesFoods = useCallback((newData: Record<string, FoodEntry[]>) => {
    setSpeciesFoods(newData);
    localStorage.setItem(STORAGE_KEY_SPECIES_FOODS, JSON.stringify(newData));
  }, []);

  const saveSpeciesChecks = useCallback((newData: Record<string, Record<string, boolean>>) => {
    setSpeciesChecks(newData);
    localStorage.setItem(STORAGE_KEY_SPECIES_CHECKS, JSON.stringify(newData));
  }, []);

  const saveSpeciesPhase = useCallback((newData: Record<string, string>) => {
    setSpeciesPhase(newData);
    localStorage.setItem(STORAGE_KEY_SPECIES_PHASE, JSON.stringify(newData));
  }, []);

  // Dias do mês
  const totalDays = useMemo(() => {
    return new Date(currentYear, currentMonth + 1, 0).getDate();
  }, [currentMonth, currentYear]);

  const monthKey = getMonthKey(currentYear, currentMonth);

  // === CATEGORY TABLE HELPERS ===
  const getCheckKey = (foodName: string, day: number) => `${monthKey}|${foodName}|${day}`;
  const isChecked = (foodName: string, day: number) => !!checks[getCheckKey(foodName, day)];

  const toggleCheck = (foodName: string, day: number) => {
    const key = getCheckKey(foodName, day);
    const newChecks = { ...checks };
    if (newChecks[key]) delete newChecks[key];
    else newChecks[key] = true;
    saveChecks(newChecks);
  };

  const addFood = (name: string, category: CategoryKey, quality: "excelente" | "bom" | "pobre") => {
    if (foods.some(f => f.name === name)) return;
    saveFoods([...foods, { name, category, quality }]);
  };

  const removeFood = (name: string) => {
    saveFoods(foods.filter(f => f.name !== name));
    const newChecks = { ...checks };
    Object.keys(newChecks).forEach(key => { if (key.includes(`|${name}|`)) delete newChecks[key]; });
    saveChecks(newChecks);
  };

  // === SPECIES TABLE HELPERS ===
  const getSpeciesCheckKey = (foodName: string, day: number) => `${monthKey}|${foodName}|${day}`;

  const isSpeciesChecked = (speciesId: string, foodName: string, day: number) => {
    return !!(speciesChecks[speciesId]?.[getSpeciesCheckKey(foodName, day)]);
  };

  const toggleSpeciesCheck = (speciesId: string, foodName: string, day: number) => {
    const key = getSpeciesCheckKey(foodName, day);
    const current = { ...speciesChecks };
    if (!current[speciesId]) current[speciesId] = {};
    const specChecks = { ...current[speciesId] };
    if (specChecks[key]) delete specChecks[key];
    else specChecks[key] = true;
    current[speciesId] = specChecks;
    saveSpeciesChecks(current);
  };

  const addSpeciesFood = (speciesId: string, name: string, category: string, quality: "excelente" | "bom" | "pobre") => {
    const current = { ...speciesFoods };
    if (!current[speciesId]) current[speciesId] = [];
    if (current[speciesId].some(f => f.name === name)) return;
    // Don't add if already in general foods (it's inherited)
    if (foods.some(f => f.name === name)) return;
    current[speciesId] = [...current[speciesId], { name, category, quality }];
    saveSpeciesFoods(current);
  };

  const removeSpeciesFood = (speciesId: string, name: string) => {
    const current = { ...speciesFoods };
    if (!current[speciesId]) return;
    current[speciesId] = current[speciesId].filter(f => f.name !== name);
    saveSpeciesFoods(current);
    // Remove checks too
    const currentChecks = { ...speciesChecks };
    if (currentChecks[speciesId]) {
      const specChecks = { ...currentChecks[speciesId] };
      Object.keys(specChecks).forEach(key => { if (key.includes(`|${name}|`)) delete specChecks[key]; });
      currentChecks[speciesId] = specChecks;
      saveSpeciesChecks(currentChecks);
    }
  };

  // Get all foods for a species: inherited (from general, only if checked at least once) + exclusive (species-only)
  // Sorted by category order: racao > vegetais > frutas > proteicos, then inherited before exclusive
  const CATEGORY_ORDER: Record<string, number> = { racao: 0, vegetais: 1, frutas: 2, proteicos: 3 };
  const getSpeciesAllFoods = (speciesId: string): (FoodEntry & { inherited: boolean })[] => {
    // Only inherit foods that have at least 1 day checked in the general cards
    const inherited = foods
      .filter(f => Object.keys(checks).some(k => k.startsWith(`${monthKey}|${f.name}|`)))
      .map(f => ({ ...f, inherited: true }));
    const exclusive = (speciesFoods[speciesId] || []).map(f => ({ ...f, inherited: false }));
    const all = [...inherited, ...exclusive];
    // Sort: by category order, then inherited first within same category
    all.sort((a, b) => {
      const catA = CATEGORY_ORDER[a.category] ?? 99;
      const catB = CATEGORY_ORDER[b.category] ?? 99;
      if (catA !== catB) return catA - catB;
      if (a.inherited !== b.inherited) return a.inherited ? -1 : 1;
      return 0;
    });
    return all;
  };

  const getSpeciesCheckedCount = (speciesId: string, foodName: string) => {
    // Check in species checks first
    const specCount = speciesChecks[speciesId]
      ? Object.keys(speciesChecks[speciesId]).filter(k => k.startsWith(`${monthKey}|${foodName}|`)).length
      : 0;
    // For inherited foods, also check the general checks
    if (foods.some(f => f.name === foodName)) {
      return Object.keys(checks).filter(k => k.startsWith(`${monthKey}|${foodName}|`)).length;
    }
    return specCount;
  };

  // For inherited foods, use general checks; for exclusive, use species checks
  const isSpeciesFoodChecked = (speciesId: string, foodName: string, day: number, inherited: boolean) => {
    if (inherited) {
      return isChecked(foodName, day);
    }
    return isSpeciesChecked(speciesId, foodName, day);
  };

  const toggleSpeciesFoodCheck = (speciesId: string, foodName: string, day: number, inherited: boolean) => {
    if (inherited) {
      toggleCheck(foodName, day);
    } else {
      toggleSpeciesCheck(speciesId, foodName, day);
    }
  };

  const getSpeciesFoodCheckedCount = (speciesId: string, foodName: string, inherited: boolean) => {
    if (inherited) {
      return Object.keys(checks).filter(k => k.startsWith(`${monthKey}|${foodName}|`)).length;
    }
    if (!speciesChecks[speciesId]) return 0;
    return Object.keys(speciesChecks[speciesId]).filter(k => k.startsWith(`${monthKey}|${foodName}|`)).length;
  };

  // Navegação de mês
  const prevMonth = () => {
    if (currentMonth === 0) { setCurrentMonth(11); setCurrentYear(currentYear - 1); }
    else setCurrentMonth(currentMonth - 1);
  };

  const nextMonth = () => {
    if (currentMonth === 11) { setCurrentMonth(0); setCurrentYear(currentYear + 1); }
    else setCurrentMonth(currentMonth + 1);
  };

  const getCheckedCount = (foodName: string) => {
    return Object.keys(checks).filter(k => k.startsWith(`${monthKey}|${foodName}|`)).length;
  };

  const getAvailableFoods = (catKey: CategoryKey) => {
    const addedNames = new Set(foods.map(f => f.name));
    let items = FOOD_CATEGORIES[catKey].items.filter(item => !addedNames.has(item.name));
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase().trim();
      items = items.filter(item => item.name.toLowerCase().includes(term));
    }
    return items;
  };

  const getAvailableSpeciesFoods = (speciesId: string, catFilter: string) => {
    const addedNames = new Set((speciesFoods[speciesId] || []).map(f => f.name));
    // Also exclude foods already checked in general cards (they're inherited)
    const inheritedNames = new Set(
      foods
        .filter(f => Object.keys(checks).some(k => k.startsWith(`${monthKey}|${f.name}|`)))
        .map(f => f.name)
    );
    let items = ALL_FOOD_ITEMS_UNIFIED.filter(item => !addedNames.has(item.name) && !inheritedNames.has(item.name));
    items = items.filter(item => item.category === catFilter);
    if (speciesSearchTerm.trim()) {
      const term = speciesSearchTerm.toLowerCase().trim();
      items = items.filter(item => item.name.toLowerCase().includes(term));
    }
    return items;
  };

  const isToday = (day: number) => {
    return day === today.getDate() && currentMonth === today.getMonth() && currentYear === today.getFullYear();
  };

  const getFoodsByCategory = (catKey: CategoryKey) => foods.filter(f => f.category === catKey);

  const toggleCategoryExpand = (catKey: string) => {
    setExpandedCategories(prev => ({ ...prev, [catKey]: !prev[catKey] }));
  };

  const toggleSpeciesExpand = (speciesId: string) => {
    setExpandedSpecies(prev => ({ ...prev, [speciesId]: !prev[speciesId] }));
  };

  // === RENDER CATEGORY TABLE (EXPANDABLE) ===
  const renderCategoryTable = (catKey: CategoryKey) => {
    const cat = FOOD_CATEGORIES[catKey];
    const catFoods = getFoodsByCategory(catKey);
    const Icon = cat.icon;
    const isAdding = addingCategory === catKey;
    const available = isAdding ? getAvailableFoods(catKey) : [];
    const isExpanded = !!expandedCategories[catKey];

    return (
      <div key={catKey} className="bg-card rounded-2xl border border-border/50 shadow-sm overflow-hidden">
        {/* Category Header — clickable to expand */}
        <button
          onClick={() => toggleCategoryExpand(catKey)}
          className={cn("w-full px-5 py-3.5 flex items-center justify-between cursor-pointer hover:opacity-90 transition-all", cat.colorLight)}
        >
          <div className="flex items-center gap-2.5">
            <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", cat.color)}>
              <Icon size={16} className="text-white" />
            </div>
            <div className="text-left">
              <h4 className={cn("text-sm font-bold", cat.textColor)}>{cat.label}</h4>
              <p className="text-[10px] text-muted-foreground">
                {catFoods.length} alimento{catFoods.length !== 1 ? "s" : ""} na tabela · {cat.items.length} disponíveis
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {catFoods.length > 0 && !isExpanded && (
              <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full", cat.colorLight, cat.textColor, cat.borderColor, "border")}>
                {catFoods.length} itens
              </span>
            )}
            <ChevronDown size={18} className={cn("text-muted-foreground transition-transform", isExpanded && "rotate-180")} />
          </div>
        </button>

        {/* Expanded content */}
        {isExpanded && (
          <>
            {/* Action buttons */}
            <div className={cn("px-5 py-2 flex items-center justify-end gap-2 border-b border-border/30", cat.colorLight)}>
              <button
                onClick={(e) => { e.stopPropagation(); exportFoodCalendarCategoryPdf(catFoods, checks, currentYear, currentMonth, catKey, cat.label); }}
                disabled={catFoods.length === 0}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all",
                  catFoods.length > 0
                    ? `${cat.color} text-white hover:opacity-90 shadow-sm`
                    : "bg-muted/50 text-muted-foreground/40 cursor-not-allowed"
                )}
              >
                <FileDown size={12} />
                PDF
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); setAddingCategory(isAdding ? null : catKey); setSearchTerm(""); }}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all",
                  isAdding
                    ? "bg-red-100 text-red-700 hover:bg-red-200"
                    : `${cat.color} text-white hover:opacity-90 shadow-sm`
                )}
              >
                {isAdding ? <X size={12} /> : <Plus size={12} />}
                {isAdding ? "Fechar" : "Adicionar"}
              </button>
            </div>

            {/* Add panel */}
            {isAdding && (
              <div className="px-5 py-3 border-b border-border/30 bg-muted/5">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Buscar alimento..."
                  className="w-full px-3 py-1.5 rounded-lg border border-border/50 bg-background text-xs text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary/30"
                />
                <div className="mt-2 max-h-48 overflow-y-auto">
                  {available.length === 0 ? (
                    <p className="text-xs text-muted-foreground italic py-2">
                      {searchTerm ? "Nenhum alimento encontrado." : "Todos já foram adicionados."}
                    </p>
                  ) : (
                    <div className="flex gap-1.5 flex-wrap">
                      {available.map(food => {
                        const q = QUALITY_CONFIG[food.quality];
                        return (
                          <button
                            key={food.name}
                            onClick={() => addFood(food.name, catKey, food.quality)}
                            className={cn("flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium border transition-all hover:shadow-sm", q.bg, q.border, q.color)}
                          >
                            <span className={cn("w-2 h-2 rounded-full flex-shrink-0", q.dotColor)} />
                            {food.name}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Table */}
            <div className="p-4">
              {catFoods.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4 italic">
                  Nenhum alimento adicionado. Clique em "Adicionar" para começar.
                </p>
              ) : (
                <div className="overflow-x-auto -mx-4 px-4">
                  <table className="w-full border-collapse text-[10px] min-w-[700px]">
                    <thead>
                      <tr>
                        <th className="sticky left-0 z-10 bg-card text-left px-2 py-2 border-b border-border/50 min-w-[160px]">
                          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Alimento</span>
                        </th>
                        {Array.from({ length: totalDays }, (_, i) => i + 1).map(day => (
                          <th key={day} className={cn("px-0 py-2 border-b border-border/50 text-center min-w-[24px]", isToday(day) && "bg-primary/5")}>
                            <span className={cn("text-[10px] font-semibold", isToday(day) ? "text-primary font-bold" : "text-muted-foreground/70")}>{day}</span>
                          </th>
                        ))}
                        <th className="px-2 py-2 border-b border-border/50 text-center min-w-[30px]">
                          <span className="text-[10px] font-bold text-muted-foreground uppercase">Total</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {catFoods.map((food, foodIdx) => {
                        const count = getCheckedCount(food.name);
                        const q = QUALITY_CONFIG[food.quality];
                        return (
                          <tr key={food.name} className={cn("group hover:bg-muted/20 transition-colors", foodIdx % 2 === 0 ? "bg-background" : "bg-muted/5")}>
                            <td className="sticky left-0 z-10 bg-inherit px-2 py-1.5 border-b border-border/30">
                              <div className="flex items-center gap-1.5">
                                <span className={cn("w-2.5 h-2.5 rounded-full flex-shrink-0", q.dotColor)} title={q.label} />
                                <span className="text-[11px] font-semibold text-foreground/80 truncate max-w-[140px]" title={food.name}>{food.name}</span>
                                <button onClick={() => removeFood(food.name)} className="opacity-0 group-hover:opacity-100 ml-auto p-0.5 rounded hover:bg-red-100 text-red-400 hover:text-red-600 transition-all flex-shrink-0" title="Remover"><X size={10} /></button>
                              </div>
                            </td>
                            {Array.from({ length: totalDays }, (_, i) => i + 1).map(day => {
                              const checked = isChecked(food.name, day);
                              return (
                                <td key={day} className={cn("px-0 py-1 border-b border-border/30 text-center", isToday(day) && "bg-primary/5")}>
                                  <button
                                    onClick={() => toggleCheck(food.name, day)}
                                    className={cn("w-5 h-5 rounded border flex items-center justify-center mx-auto transition-all", checked ? `${cat.checkColor} border-transparent text-white shadow-sm` : "border-border/40 bg-background hover:border-primary/30 hover:bg-primary/5")}
                                  >
                                    {checked && <Check size={10} strokeWidth={3} />}
                                  </button>
                                </td>
                              );
                            })}
                            <td className="px-2 py-1.5 border-b border-border/30 text-center">
                              <span className={cn("text-[11px] font-bold", count > 0 ? cat.textColor : "text-muted-foreground/40")}>{count}</span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    );
  };

  // === RENDER SPECIES CARD (EXPANDABLE) ===
  const renderSpeciesCard = (sp: typeof ACTIVE_SPECIES[0]) => {
    const isExpanded = !!expandedSpecies[sp.id];
    const exclusiveFoods = speciesFoods[sp.id] || [];
    const allFoods = getSpeciesAllFoods(sp.id);
    const openCat = speciesOpenCat[sp.id] || null;
    const selectedPhase = speciesPhase[sp.id] || LIFE_PHASES[0].id;

    const SPECIES_CATEGORIES = [
      { key: "racao", label: "Ração", icon: Wheat, color: "bg-amber-700", colorLight: "bg-amber-50", borderColor: "border-amber-300", textColor: "text-amber-800" },
      { key: "vegetais", label: "Vegetais", icon: Leaf, color: "bg-emerald-600", colorLight: "bg-emerald-50", borderColor: "border-emerald-300", textColor: "text-emerald-700" },
      { key: "frutas", label: "Frutas", icon: Apple, color: "bg-red-600", colorLight: "bg-red-50", borderColor: "border-red-300", textColor: "text-red-700" },
      { key: "proteicos", label: "Sementes", icon: Wheat, color: "bg-purple-600", colorLight: "bg-purple-50", borderColor: "border-purple-300", textColor: "text-purple-700" },
    ];

    const toggleSpeciesCat = (catKey: string) => {
      setSpeciesOpenCat(prev => ({
        ...prev,
        [sp.id]: prev[sp.id] === catKey ? null : catKey,
      }));
      setSpeciesSearchTerm("");
    };

    const available = openCat ? getAvailableSpeciesFoods(sp.id, openCat) : [];

    const handlePhaseChange = (phaseId: string) => {
      saveSpeciesPhase({ ...speciesPhase, [sp.id]: phaseId });
    };

    return (
      <div key={sp.id} className="bg-card rounded-2xl border border-border/50 shadow-sm overflow-hidden">
        {/* Species Header — clickable */}
        <button
          onClick={() => toggleSpeciesExpand(sp.id)}
          className="w-full px-5 py-3.5 flex items-center justify-between cursor-pointer hover:bg-muted/10 transition-all"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-teal-600">
              <Bird size={16} className="text-white" />
            </div>
            <div className="text-left">
              <h4 className="text-sm font-bold text-foreground">{sp.commonName}</h4>
              <p className="text-[10px] text-muted-foreground">
                {sp.currentCount} ave{sp.currentCount !== 1 ? "s" : ""} · {allFoods.length} alimento{allFoods.length !== 1 ? "s" : ""} na tabela
                {allFoods.filter(f => f.inherited).length > 0 && <span className="text-teal-600 ml-1">({allFoods.filter(f => f.inherited).length} herdados)</span>}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {allFoods.length > 0 && !isExpanded && (
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-teal-50 text-teal-700 border border-teal-200">
                {allFoods.length} itens
              </span>
            )}
            <ChevronDown size={18} className={cn("text-muted-foreground transition-transform", isExpanded && "rotate-180")} />
          </div>
        </button>

        {/* Expanded content */}
        {isExpanded && (
          <>
            {/* Phase selector */}
            <div className="px-5 py-2.5 border-b border-border/30 bg-gradient-to-r from-teal-50/50 to-transparent">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mr-1">Fase:</span>
                {LIFE_PHASES.map(phase => (
                  <button
                    key={phase.id}
                    onClick={(e) => { e.stopPropagation(); handlePhaseChange(phase.id); }}
                    className={cn(
                      "px-2.5 py-1 rounded-lg text-[10px] font-semibold border transition-all",
                      selectedPhase === phase.id
                        ? "bg-teal-600 text-white border-teal-600 shadow-sm"
                        : "bg-background border-border/50 text-muted-foreground hover:bg-teal-50 hover:border-teal-200 hover:text-teal-700"
                    )}
                  >
                    {phase.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Mini category cards (toggle) — for adding EXCLUSIVE foods */}
            <div className="px-5 py-3 border-b border-border/30 bg-muted/5">
              <p className="text-[10px] text-muted-foreground mb-2 font-medium">Adicionar alimento exclusivo para {sp.commonName}:</p>
              <div className="flex items-center gap-2 flex-wrap">
                {SPECIES_CATEGORIES.map(cat => {
                  const CatIcon = cat.icon;
                  const isOpen = openCat === cat.key;
                  return (
                    <button
                      key={cat.key}
                      onClick={(e) => { e.stopPropagation(); toggleSpeciesCat(cat.key); }}
                      className={cn(
                        "flex items-center gap-1.5 px-3 py-2 rounded-xl text-[11px] font-semibold border transition-all",
                        isOpen
                          ? `${cat.colorLight} ${cat.textColor} ${cat.borderColor} shadow-sm ring-1 ring-offset-1`
                          : `${cat.colorLight} ${cat.borderColor} ${cat.textColor} hover:shadow-sm`
                      )}
                    >
                      <div className={cn("w-4 h-4 rounded flex items-center justify-center", cat.color)}>
                        <CatIcon size={10} className="text-white" />
                      </div>
                      {cat.label}
                    </button>
                  );
                })}
              </div>

              {/* Food list panel (shown when a category is open) */}
              {openCat && (
                <div className="mt-3 space-y-2">
                  <input
                    type="text"
                    value={speciesSearchTerm}
                    onChange={(e) => setSpeciesSearchTerm(e.target.value)}
                    placeholder="Buscar alimento..."
                    className="w-full px-3 py-1.5 rounded-lg border border-border/50 bg-background text-xs text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-teal-300"
                  />
                  <div className="max-h-48 overflow-y-auto">
                    {available.length === 0 ? (
                      <p className="text-xs text-muted-foreground italic py-2">
                        {speciesSearchTerm ? "Nenhum alimento encontrado." : "Todos já foram adicionados."}
                      </p>
                    ) : (
                      <div className="flex gap-1.5 flex-wrap">
                        {available.map(food => {
                          const q = QUALITY_CONFIG[food.quality];
                          const isRacao = food.category === "racao";
                          return (
                            <button
                              key={food.name}
                              onClick={() => addSpeciesFood(sp.id, food.name, food.category, food.quality)}
                              className={cn("flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium border transition-all hover:shadow-sm", isRacao ? "bg-amber-50 border-amber-300 text-amber-800" : `${q.bg} ${q.border} ${q.color}`)}
                            >
                              {!isRacao && <span className={cn("w-2 h-2 rounded-full flex-shrink-0", q.dotColor)} />}
                              {food.name}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* PDF button + Table */}
            <div className="p-4">
              {allFoods.length > 0 && (
                <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
                  <div className="flex items-center gap-4 text-sm text-foreground/70 flex-wrap">
                    <span className="flex items-center gap-1.5"><span className="text-lg font-black text-violet-600">*</span> <span className="font-medium">Exclusivo desta ave</span></span>
                    <span className="text-muted-foreground/30">|</span>
                    <span className="flex items-center gap-1.5"><span className="text-base font-extrabold text-emerald-700">+</span> <span className="font-medium">Excelente</span></span>
                    <span className="flex items-center gap-1.5"><span className="text-base font-extrabold text-blue-700">+/-</span> <span className="font-medium">Bom</span></span>
                    <span className="flex items-center gap-1.5"><span className="text-base font-extrabold text-amber-700">-</span> <span className="font-medium">Pobre</span></span>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); exportFoodCalendarSpeciesPdf(allFoods, checks, speciesChecks[sp.id] || {}, currentYear, currentMonth, sp.commonName, sp.id); }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold bg-teal-600 text-white hover:opacity-90 shadow-sm transition-all"
                  >
                    <FileDown size={12} />
                    PDF
                  </button>
                </div>
              )}
              {allFoods.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground">
                  <Bird size={24} className="mx-auto mb-2 opacity-20" />
                  <p className="text-xs">Adicione alimentos nos cards gerais acima (herdam para todas as espécies) ou adicione exclusivos aqui</p>
                </div>
              ) : (
                <div className="overflow-x-auto -mx-4 px-4">
                  <table className="w-full border-collapse text-[10px] min-w-[700px]">
                    <thead>
                      <tr>
                        <th className="sticky left-0 z-10 bg-card text-left px-2 py-2 border-b border-border/50 min-w-[160px]">
                          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Alimento</span>
                        </th>
                        {Array.from({ length: totalDays }, (_, i) => i + 1).map(day => (
                          <th key={day} className={cn("px-0 py-2 border-b border-border/50 text-center min-w-[24px]", isToday(day) && "bg-primary/5")}>
                            <span className={cn("text-[10px] font-semibold", isToday(day) ? "text-primary font-bold" : "text-muted-foreground/70")}>{day}</span>
                          </th>
                        ))}
                        <th className="px-2 py-2 border-b border-border/50 text-center min-w-[30px]">
                          <span className="text-[10px] font-bold text-muted-foreground uppercase">Total</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {allFoods.map((food) => {
                        const count = getSpeciesFoodCheckedCount(sp.id, food.name, food.inherited);
                        const q = QUALITY_CONFIG[food.quality];
                        const rowBg = CATEGORY_ROW_BG[food.category] || "bg-background";
                        return (
                          <tr key={food.name} className={cn("group hover:opacity-80 transition-colors", rowBg)}>
                            <td className={cn("sticky left-0 z-10 px-2 py-1.5 border-b border-border/30", rowBg)}>
                              <div className="flex items-center gap-1.5">
                                {food.category !== "racao" && (
                                  <span className={cn("text-xs font-bold flex-shrink-0 min-w-[20px]", q.color)} title={q.label}>{q.symbol}</span>
                                )}
                                {!food.inherited && (
                                  <span className="text-base font-black text-violet-600 flex-shrink-0 leading-none">*</span>
                                )}
                                <span className="text-[11px] font-semibold text-foreground/80 truncate max-w-[130px]" title={food.name}>{food.name}</span>
                                {!food.inherited && (
                                  <button onClick={() => removeSpeciesFood(sp.id, food.name)} className="opacity-0 group-hover:opacity-100 ml-auto p-0.5 rounded hover:bg-red-100 text-red-400 hover:text-red-600 transition-all flex-shrink-0" title="Remover"><X size={10} /></button>
                                )}
                              </div>
                            </td>
                            {Array.from({ length: totalDays }, (_, i) => i + 1).map(day => {
                              const checked = isSpeciesFoodChecked(sp.id, food.name, day, food.inherited);
                              return (
                                <td key={day} className={cn("px-0 py-1 border-b border-border/30 text-center", isToday(day) && "bg-primary/5")}>
                                  <button
                                    onClick={() => toggleSpeciesFoodCheck(sp.id, food.name, day, food.inherited)}
                                    className={cn("w-5 h-5 rounded border flex items-center justify-center mx-auto transition-all", checked ? "bg-teal-600 border-transparent text-white shadow-sm" : "border-border/40 bg-background hover:border-teal-300 hover:bg-teal-50")}
                                  >
                                    {checked && <Check size={10} strokeWidth={3} />}
                                  </button>
                                </td>
                              );
                            })}
                            <td className="px-2 py-1.5 border-b border-border/30 text-center">
                              <span className={cn("text-[11px] font-bold", count > 0 ? "text-teal-700" : "text-muted-foreground/40")}>{count}</span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Navegação do mês (compartilhada) */}
      <div className="bg-card rounded-2xl border border-border/50 shadow-sm px-5 py-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-serif font-bold text-foreground">
              Calendário de Alimentos
            </h3>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Marque os dias em que cada alimento foi servido
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={prevMonth} className="p-1.5 rounded-lg hover:bg-muted/50 transition-all">
              <ChevronLeft size={16} className="text-muted-foreground" />
            </button>
            <h4 className="text-sm font-bold text-foreground min-w-[120px] text-center">
              {MONTHS[currentMonth]} {currentYear}
            </h4>
            <button onClick={nextMonth} className="p-1.5 rounded-lg hover:bg-muted/50 transition-all">
              <ChevronRight size={16} className="text-muted-foreground" />
            </button>
          </div>
        </div>
        {/* Legenda de qualidade */}
        <div className="flex items-center gap-5 mt-2 pt-2 border-t border-border/30">
          <span className="text-[10px] text-muted-foreground font-medium">Qualidade:</span>
          <span className="flex items-center gap-1.5 text-[11px] text-emerald-700 font-medium"><span className="w-3 h-3 rounded-full bg-emerald-500" /> Excelente</span>
          <span className="flex items-center gap-1.5 text-[11px] text-blue-700 font-medium"><span className="w-3 h-3 rounded-full bg-blue-500" /> Bom</span>
          <span className="flex items-center gap-1.5 text-[11px] text-amber-700 font-medium"><span className="w-3 h-3 rounded-full bg-amber-500" /> Pobre</span>
        </div>
      </div>

      {/* 3 Tabelas por categoria (expansíveis) */}
      {(Object.keys(FOOD_CATEGORIES) as CategoryKey[]).map(catKey => renderCategoryTable(catKey))}

      {/* Separador */}
      <div className="flex items-center gap-3 pt-4">
        <div className="flex-1 h-px bg-border/50" />
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
          <Bird size={13} /> Por Espécie
        </span>
        <div className="flex-1 h-px bg-border/50" />
      </div>

      {/* Cards por espécie */}
      {ACTIVE_SPECIES.map(sp => renderSpeciesCard(sp))}
    </div>
  );
}
