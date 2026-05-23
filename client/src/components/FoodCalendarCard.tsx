/**
 * FoodCalendarCard — Tabela mensal de alimentos
 * Importa diretamente as listas do petbird.ts (cópia fiel da aba Alimentação)
 * Categorias: Ração/Formulado, Vegetais/Hortaliças, Frutas, Sementes e Proteicos
 * Linhas = alimentos adicionados pelo usuário
 * Colunas = dias do mês
 * Persistência em localStorage
 */
import { useState, useMemo, useCallback } from "react";
import { ChevronLeft, ChevronRight, Plus, X, Leaf, Apple, Wheat, Check, FileDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { vegetais, frutas, proteicos } from "@/data/petbird";
import { exportFoodCalendarPdf } from "@/lib/foodCalendarPdf";

// Vegetais a excluir (marcados com ⚠️ na aba original)
const VEGETAIS_EXCLUIDOS = ["Alface Romana, Folha, Crua \u26a0\ufe0f", "Alface Lisa, Folha, Crua \u26a0\ufe0f", "Espinafre Comum, Folha, Crua \u26a0\ufe0f"];

// Categorias fiéis à aba Alimentação original (sem Ração)
const FOOD_CATEGORIES = {
  vegetais: {
    label: "Vegetais / Hortaliças",
    icon: Leaf,
    color: "bg-green-600",
    colorLight: "bg-green-50",
    borderColor: "border-green-200",
    textColor: "text-green-700",
    dotColor: "bg-green-500",
    items: vegetais.filter(f => f.name !== "Hortaliça Mediana" && !VEGETAIS_EXCLUIDOS.includes(f.name)).map(f => f.name),
  },
  frutas: {
    label: "Frutas",
    icon: Apple,
    color: "bg-orange-500",
    colorLight: "bg-orange-50",
    borderColor: "border-orange-200",
    textColor: "text-orange-700",
    dotColor: "bg-orange-400",
    items: frutas.filter(f => f.name !== "Fruta Mediana").map(f => f.name),
  },
  proteicos: {
    label: "Sementes e Proteicos",
    icon: Wheat,
    color: "bg-amber-700",
    colorLight: "bg-amber-50",
    borderColor: "border-amber-200",
    textColor: "text-amber-800",
    dotColor: "bg-amber-600",
    items: proteicos.filter(f => f.name !== "Proteico Mediano").map(f => f.name),
  },
} as const;

type CategoryKey = keyof typeof FOOD_CATEGORIES;

interface FoodEntry {
  name: string;
  category: CategoryKey;
}

const MONTHS = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

const STORAGE_KEY_FOODS = "foodCalendarFoods";
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
      // Filter out entries with categories that no longer exist
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

  // UI state
  const [showAddPanel, setShowAddPanel] = useState(false);
  const [addCategory, setAddCategory] = useState<CategoryKey | null>(null);
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
  const addFood = (name: string, category: CategoryKey) => {
    if (foods.some(f => f.name === name)) return;
    const newFoods = [...foods, { name, category }];
    saveFoods(newFoods);
  };

  // Remover alimento da tabela
  const removeFood = (name: string) => {
    const newFoods = foods.filter(f => f.name !== name);
    saveFoods(newFoods);
    // Remover checks desse alimento
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
  const availableFoods = useMemo(() => {
    if (!addCategory) return [];
    const addedNames = new Set(foods.map(f => f.name));
    let items = FOOD_CATEGORIES[addCategory].items.filter(item => !addedNames.has(item));
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase().trim();
      items = items.filter(item => item.toLowerCase().includes(term));
    }
    return items;
  }, [addCategory, foods, searchTerm]);

  // Dia de hoje
  const isToday = (day: number) => {
    return day === today.getDate() && currentMonth === today.getMonth() && currentYear === today.getFullYear();
  };

  return (
    <div className="bg-card rounded-2xl border border-border/50 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-600 to-teal-600 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-white font-serif text-lg font-semibold">
              Calendário de Alimentos
            </h3>
            <p className="text-white/70 text-xs mt-0.5">
              Adicione alimentos e marque os dias em que foram servidos
            </p>
          </div>
          <button
            onClick={() => { setShowAddPanel(!showAddPanel); setSearchTerm(""); }}
            className={cn(
              "flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all",
              showAddPanel
                ? "bg-white/20 text-white"
                : "bg-white/10 text-white/90 hover:bg-white/20"
            )}
          >
            <Plus size={14} />
            Adicionar Alimento
          </button>
        </div>
      </div>

      {/* Painel de adicionar alimento */}
      {showAddPanel && (
        <div className="border-b border-border/50 bg-muted/20 p-4 space-y-3">
          {/* Categorias */}
          <div className="flex gap-2 flex-wrap">
            {(Object.keys(FOOD_CATEGORIES) as CategoryKey[]).map(catKey => {
              const cat = FOOD_CATEGORIES[catKey];
              const Icon = cat.icon;
              const isActive = addCategory === catKey;
              return (
                <button
                  key={catKey}
                  onClick={() => { setAddCategory(isActive ? null : catKey); setSearchTerm(""); }}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-medium transition-all",
                    isActive
                      ? `${cat.colorLight} ${cat.textColor} ${cat.borderColor} shadow-sm`
                      : "bg-background border-border/50 text-muted-foreground hover:bg-muted/50"
                  )}
                >
                  <Icon size={13} />
                  {cat.label}
                  <span className="text-[10px] opacity-60">({cat.items.length})</span>
                </button>
              );
            })}
          </div>

          {/* Busca */}
          {addCategory && (
            <div>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={`Buscar em ${FOOD_CATEGORIES[addCategory].label}...`}
                className="w-full px-3 py-2 rounded-lg border border-border/50 bg-background text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary/30"
              />
            </div>
          )}

          {/* Alimentos disponíveis */}
          {addCategory && (
            <div className="max-h-48 overflow-y-auto">
              {availableFoods.length === 0 ? (
                <p className="text-xs text-muted-foreground italic py-2">
                  {searchTerm ? "Nenhum alimento encontrado com esse termo." : "Todos os alimentos desta categoria já foram adicionados."}
                </p>
              ) : (
                <div className="flex gap-1.5 flex-wrap">
                  {availableFoods.map(food => (
                    <button
                      key={food}
                      onClick={() => addFood(food, addCategory)}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-medium border border-border/50 bg-background text-foreground/70 hover:bg-emerald-50 hover:border-emerald-300 hover:text-emerald-700 transition-all"
                    >
                      <Plus size={9} />
                      {food}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <div className="p-5">
        {/* Navegação do mês */}
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={prevMonth}
            className="p-1.5 rounded-lg hover:bg-muted/50 transition-all"
          >
            <ChevronLeft size={16} className="text-muted-foreground" />
          </button>
          <h4 className="text-sm font-bold text-foreground">
            {MONTHS[currentMonth]} {currentYear}
          </h4>
          <button
            onClick={nextMonth}
            className="p-1.5 rounded-lg hover:bg-muted/50 transition-all"
          >
            <ChevronRight size={16} className="text-muted-foreground" />
          </button>
        </div>

        {/* Tabela */}
        {foods.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground">
            <Leaf size={32} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm font-medium">Nenhum alimento adicionado</p>
            <p className="text-xs mt-1 opacity-70">
              Clique em "Adicionar Alimento" para montar sua tabela mensal
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto -mx-5 px-5">
            <table className="w-full border-collapse text-[10px] min-w-[700px]">
              <thead>
                <tr>
                  <th className="sticky left-0 z-10 bg-card text-left px-2 py-2 border-b border-border/50 min-w-[140px]">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                      Alimento
                    </span>
                  </th>
                  {Array.from({ length: totalDays }, (_, i) => i + 1).map(day => (
                    <th
                      key={day}
                      className={cn(
                        "px-0 py-2 border-b border-border/50 text-center min-w-[26px]",
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
                  <th className="px-2 py-2 border-b border-border/50 text-center min-w-[32px]">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase">Total</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {foods.map((food, foodIdx) => {
                  const cat = FOOD_CATEGORIES[food.category];
                  const count = getCheckedCount(food.name);
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
                          <div className={cn("w-2 h-2 rounded-full flex-shrink-0", cat.dotColor)} />
                          <span className="text-[11px] font-semibold text-foreground/80 truncate max-w-[110px]" title={food.name}>
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
                                  ? `${cat.color} border-transparent text-white shadow-sm`
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

        {/* Legenda de categorias + botão PDF */}
        {foods.length > 0 && (
          <div className="mt-4 pt-3 border-t border-border/30">
            <div className="flex items-center gap-4 flex-wrap">
              {(Object.keys(FOOD_CATEGORIES) as CategoryKey[]).map(catKey => {
                const cat = FOOD_CATEGORIES[catKey];
                const count = foods.filter(f => f.category === catKey).length;
                if (count === 0) return null;
                return (
                  <div key={catKey} className="flex items-center gap-1.5">
                    <div className={cn("w-2.5 h-2.5 rounded-full", cat.dotColor)} />
                    <span className="text-[10px] font-medium text-muted-foreground">
                      {cat.label} ({count})
                    </span>
                  </div>
                );
              })}
              <div className="ml-auto text-[10px] text-muted-foreground/60">
                {foods.length} alimento{foods.length !== 1 ? "s" : ""} na tabela
              </div>
            </div>
            <div className="mt-3 flex justify-end">
              <button
                onClick={() => exportFoodCalendarPdf(foods, checks, currentYear, currentMonth)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition-all shadow-sm"
              >
                <FileDown size={14} />
                Exportar PDF do Mês
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
