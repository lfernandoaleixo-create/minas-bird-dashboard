/**
 * FoodCalendarCard — 3 Tabelas mensais separadas por categoria
 * Cada categoria (Vegetais, Frutas, Sementes/Proteicos) tem sua própria tabela e PDF
 * Indicador de qualidade (Excelente/Bom/Pobre) ao lado de cada alimento
 * Linhas = alimentos adicionados pelo usuário
 * Colunas = dias do mês
 * Persistência em localStorage
 */
import { useState, useMemo, useCallback } from "react";
import { ChevronLeft, ChevronRight, Plus, X, Leaf, Apple, Wheat, Check, FileDown, Star, ThumbsUp, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { vegetais, frutas, proteicos } from "@/data/petbird";
import { exportFoodCalendarCategoryPdf } from "@/lib/foodCalendarPdf";

// Vegetais a excluir (marcados com ⚠️ na aba original)
const VEGETAIS_EXCLUIDOS = ["Alface Romana, Folha, Crua \u26a0\ufe0f", "Alface Lisa, Folha, Crua \u26a0\ufe0f", "Espinafre Comum, Folha, Crua \u26a0\ufe0f"];

// Mapeamento de classificação para qualidade
function getQuality(classification: string): "excelente" | "bom" | "pobre" {
  const c = classification.toLowerCase().trim();
  if (c === "melhores") return "excelente";
  if (c === "bons" || c === "boas") return "bom";
  if (c === "pobres" || c === "inadequado") return "pobre";
  // Rações e outros: considerar "bom" por padrão
  return "bom";
}

const QUALITY_CONFIG = {
  excelente: {
    label: "Excelente",
    icon: Star,
    color: "text-emerald-600",
    bg: "bg-emerald-50",
    border: "border-emerald-200",
    dotColor: "bg-emerald-500",
    pdfColor: [16, 185, 129] as [number, number, number],
  },
  bom: {
    label: "Bom",
    icon: ThumbsUp,
    color: "text-blue-600",
    bg: "bg-blue-50",
    border: "border-blue-200",
    dotColor: "bg-blue-500",
    pdfColor: [37, 99, 235] as [number, number, number],
  },
  pobre: {
    label: "Pobre",
    icon: AlertTriangle,
    color: "text-amber-600",
    bg: "bg-amber-50",
    border: "border-amber-200",
    dotColor: "bg-amber-500",
    pdfColor: [217, 119, 6] as [number, number, number],
  },
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

type CategoryKey = keyof typeof FOOD_CATEGORIES;

interface FoodEntry {
  name: string;
  category: CategoryKey;
  quality: "excelente" | "bom" | "pobre";
}

const MONTHS = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

const STORAGE_KEY_FOODS = "foodCalendarFoods_v3";
const STORAGE_KEY_CHECKS = "foodCalendarChecks_v2";

function getMonthKey(year: number, month: number) {
  return `${year}-${String(month + 1).padStart(2, "0")}`;
}

export default function FoodCalendarCard() {
  const today = new Date();
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [currentYear, setCurrentYear] = useState(today.getFullYear());

  // Alimentos adicionados à tabela (persistidos)
  const [foods, setFoods] = useState<FoodEntry[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_FOODS);
      if (!saved) return [];
      const parsed = JSON.parse(saved) as FoodEntry[];
      return parsed.filter(f => f.category in FOOD_CATEGORIES);
    } catch { return []; }
  });

  // Checks: key = "YYYY-MM|foodName|day", value = true
  const [checks, setChecks] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_CHECKS);
      return saved ? JSON.parse(saved) : {};
    } catch { return {}; }
  });

  // UI state — which category panel is open for adding
  const [addingCategory, setAddingCategory] = useState<CategoryKey | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  // Persistir
  const saveFoods = useCallback((newFoods: FoodEntry[]) => {
    setFoods(newFoods);
    localStorage.setItem(STORAGE_KEY_FOODS, JSON.stringify(newFoods));
  }, []);

  const saveChecks = useCallback((newChecks: Record<string, boolean>) => {
    setChecks(newChecks);
    localStorage.setItem(STORAGE_KEY_CHECKS, JSON.stringify(newChecks));
  }, []);

  // Dias do mês
  const totalDays = useMemo(() => {
    return new Date(currentYear, currentMonth + 1, 0).getDate();
  }, [currentMonth, currentYear]);

  const monthKey = getMonthKey(currentYear, currentMonth);

  // Check key
  const getCheckKey = (foodName: string, day: number) => {
    return `${monthKey}|${foodName}|${day}`;
  };

  const isChecked = (foodName: string, day: number) => {
    return !!checks[getCheckKey(foodName, day)];
  };

  const toggleCheck = (foodName: string, day: number) => {
    const key = getCheckKey(foodName, day);
    const newChecks = { ...checks };
    if (newChecks[key]) {
      delete newChecks[key];
    } else {
      newChecks[key] = true;
    }
    saveChecks(newChecks);
  };

  // Adicionar alimento à tabela
  const addFood = (name: string, category: CategoryKey, quality: "excelente" | "bom" | "pobre") => {
    if (foods.some(f => f.name === name)) return;
    const newFoods = [...foods, { name, category, quality }];
    saveFoods(newFoods);
  };

  // Remover alimento da tabela
  const removeFood = (name: string) => {
    const newFoods = foods.filter(f => f.name !== name);
    saveFoods(newFoods);
    const newChecks = { ...checks };
    Object.keys(newChecks).forEach(key => {
      if (key.includes(`|${name}|`)) {
        delete newChecks[key];
      }
    });
    saveChecks(newChecks);
  };

  // Navegação de mês
  const prevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  const nextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  // Contar checks por alimento no mês
  const getCheckedCount = (foodName: string) => {
    return Object.keys(checks).filter(k => k.startsWith(`${monthKey}|${foodName}|`)).length;
  };

  // Alimentos disponíveis para adicionar (não já adicionados), com filtro de busca
  const getAvailableFoods = (catKey: CategoryKey) => {
    const addedNames = new Set(foods.map(f => f.name));
    let items = FOOD_CATEGORIES[catKey].items.filter(item => !addedNames.has(item.name));
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase().trim();
      items = items.filter(item => item.name.toLowerCase().includes(term));
    }
    return items;
  };

  // Dia de hoje
  const isToday = (day: number) => {
    return day === today.getDate() && currentMonth === today.getMonth() && currentYear === today.getFullYear();
  };

  // Filtrar alimentos por categoria
  const getFoodsByCategory = (catKey: CategoryKey) => {
    return foods.filter(f => f.category === catKey);
  };

  // Renderizar uma tabela de categoria
  const renderCategoryTable = (catKey: CategoryKey) => {
    const cat = FOOD_CATEGORIES[catKey];
    const catFoods = getFoodsByCategory(catKey);
    const Icon = cat.icon;
    const isAdding = addingCategory === catKey;
    const available = isAdding ? getAvailableFoods(catKey) : [];

    return (
      <div key={catKey} className="bg-card rounded-2xl border border-border/50 shadow-sm overflow-hidden">
        {/* Category Header */}
        <div className={cn("px-5 py-3.5 flex items-center justify-between", cat.colorLight)}>
          <div className="flex items-center gap-2.5">
            <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", cat.color)}>
              <Icon size={16} className="text-white" />
            </div>
            <div>
              <h4 className={cn("text-sm font-bold", cat.textColor)}>{cat.label}</h4>
              <p className="text-[10px] text-muted-foreground">
                {catFoods.length} alimento{catFoods.length !== 1 ? "s" : ""} na tabela · {cat.items.length} disponíveis
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => exportFoodCalendarCategoryPdf(catFoods, checks, currentYear, currentMonth, catKey, cat.label)}
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
              onClick={() => { setAddingCategory(isAdding ? null : catKey); setSearchTerm(""); }}
              className={cn(
                "flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all border",
                isAdding
                  ? `${cat.colorLight} ${cat.textColor} ${cat.borderColor}`
                  : "bg-background border-border/50 text-muted-foreground hover:bg-muted/30"
              )}
            >
              <Plus size={11} />
              Adicionar
            </button>
          </div>
        </div>

        {/* Add Panel */}
        {isAdding && (
          <div className="border-b border-border/50 bg-muted/10 p-4 space-y-3">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={`Buscar em ${cat.label}...`}
              className="w-full px-3 py-2 rounded-lg border border-border/50 bg-background text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary/30"
            />
            {/* Legenda de qualidade */}
            <div className="flex items-center gap-4 text-[10px] text-muted-foreground">
              <span className="flex items-center gap-1"><Star size={10} className="text-emerald-600" /> Excelente</span>
              <span className="flex items-center gap-1"><ThumbsUp size={10} className="text-blue-600" /> Bom</span>
              <span className="flex items-center gap-1"><AlertTriangle size={10} className="text-amber-600" /> Pobre</span>
            </div>
            <div className="max-h-52 overflow-y-auto">
              {available.length === 0 ? (
                <p className="text-xs text-muted-foreground italic py-2">
                  {searchTerm ? "Nenhum alimento encontrado." : "Todos já foram adicionados."}
                </p>
              ) : (
                <div className="flex gap-1.5 flex-wrap">
                  {available.map(food => {
                    const q = QUALITY_CONFIG[food.quality];
                    const QIcon = q.icon;
                    return (
                      <button
                        key={food.name}
                        onClick={() => addFood(food.name, catKey, food.quality)}
                        className={cn(
                          "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium border transition-all hover:shadow-sm",
                          q.bg, q.border, q.color
                        )}
                      >
                        <QIcon size={10} />
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
            <div className="text-center py-6 text-muted-foreground">
              <Icon size={24} className="mx-auto mb-2 opacity-20" />
              <p className="text-xs">Clique em "Adicionar" para incluir alimentos</p>
            </div>
          ) : (
            <div className="overflow-x-auto -mx-4 px-4">
              <table className="w-full border-collapse text-[10px] min-w-[700px]">
                <thead>
                  <tr>
                    <th className="sticky left-0 z-10 bg-card text-left px-2 py-2 border-b border-border/50 min-w-[160px]">
                      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                        Alimento
                      </span>
                    </th>
                    <th className="px-1 py-2 border-b border-border/50 text-center min-w-[20px]">
                      <span className="text-[9px] font-bold text-muted-foreground">Q</span>
                    </th>
                    {Array.from({ length: totalDays }, (_, i) => i + 1).map(day => (
                      <th
                        key={day}
                        className={cn(
                          "px-0 py-2 border-b border-border/50 text-center min-w-[24px]",
                          isToday(day) && "bg-primary/5"
                        )}
                      >
                        <span className={cn(
                          "text-[10px] font-semibold",
                          isToday(day) ? "text-primary font-bold" : "text-muted-foreground/70"
                        )}>
                          {day}
                        </span>
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
                    const QIcon = q.icon;
                    return (
                      <tr
                        key={food.name}
                        className={cn(
                          "group hover:bg-muted/20 transition-colors",
                          foodIdx % 2 === 0 ? "bg-background" : "bg-muted/5"
                        )}
                      >
                        {/* Nome do alimento */}
                        <td className="sticky left-0 z-10 bg-inherit px-2 py-1.5 border-b border-border/30">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[11px] font-semibold text-foreground/80 truncate max-w-[130px]" title={food.name}>
                              {food.name}
                            </span>
                            <button
                              onClick={() => removeFood(food.name)}
                              className="opacity-0 group-hover:opacity-100 ml-auto p-0.5 rounded hover:bg-red-100 text-red-400 hover:text-red-600 transition-all flex-shrink-0"
                              title="Remover alimento"
                            >
                              <X size={10} />
                            </button>
                          </div>
                        </td>

                        {/* Qualidade */}
                        <td className="px-0 py-1.5 border-b border-border/30 text-center" title={q.label}>
                          <QIcon size={11} className={cn("mx-auto", q.color)} />
                        </td>

                        {/* Dias */}
                        {Array.from({ length: totalDays }, (_, i) => i + 1).map(day => {
                          const checked = isChecked(food.name, day);
                          return (
                            <td
                              key={day}
                              className={cn(
                                "px-0 py-1 border-b border-border/30 text-center",
                                isToday(day) && "bg-primary/5"
                              )}
                            >
                              <button
                                onClick={() => toggleCheck(food.name, day)}
                                className={cn(
                                  "w-5 h-5 rounded border flex items-center justify-center mx-auto transition-all",
                                  checked
                                    ? `${cat.checkColor} border-transparent text-white shadow-sm`
                                    : "border-border/40 bg-background hover:border-emerald-300 hover:bg-emerald-50"
                                )}
                              >
                                {checked && <Check size={10} strokeWidth={3} />}
                              </button>
                            </td>
                          );
                        })}

                        {/* Total */}
                        <td className="px-2 py-1.5 border-b border-border/30 text-center">
                          <span className={cn(
                            "text-[11px] font-bold",
                            count > 0 ? cat.textColor : "text-muted-foreground/40"
                          )}>
                            {count}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
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
              3 tabelas separadas · Marque os dias em que cada alimento foi servido
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={prevMonth}
              className="p-1.5 rounded-lg hover:bg-muted/50 transition-all"
            >
              <ChevronLeft size={16} className="text-muted-foreground" />
            </button>
            <h4 className="text-sm font-bold text-foreground min-w-[120px] text-center">
              {MONTHS[currentMonth]} {currentYear}
            </h4>
            <button
              onClick={nextMonth}
              className="p-1.5 rounded-lg hover:bg-muted/50 transition-all"
            >
              <ChevronRight size={16} className="text-muted-foreground" />
            </button>
          </div>
        </div>
        {/* Legenda de qualidade */}
        <div className="flex items-center gap-5 mt-2 pt-2 border-t border-border/30">
          <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Qualidade:</span>
          <span className="flex items-center gap-1 text-[11px] text-emerald-600 font-medium">
            <Star size={11} /> Excelente
          </span>
          <span className="flex items-center gap-1 text-[11px] text-blue-600 font-medium">
            <ThumbsUp size={11} /> Bom
          </span>
          <span className="flex items-center gap-1 text-[11px] text-amber-600 font-medium">
            <AlertTriangle size={11} /> Pobre
          </span>
        </div>
      </div>

      {/* 3 Tabelas separadas */}
      {(Object.keys(FOOD_CATEGORIES) as CategoryKey[]).map(catKey => renderCategoryTable(catKey))}
    </div>
  );
}
