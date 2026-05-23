/**
 * FoodCalendarCard — Tabela mensal de alimentos
 * Linhas = alimentos adicionados pelo usuário (de qualquer categoria)
 * Colunas = dias do mês
 * O usuário adiciona alimentos à tabela e marca X nos dias em que cada um foi usado
 * Persistência em localStorage
 */
import { useState, useMemo, useCallback } from "react";
import { ChevronLeft, ChevronRight, Plus, X, Leaf, Carrot, Nut, Check } from "lucide-react";
import { cn } from "@/lib/utils";

// Dados de alimentos por categoria
const FOOD_CATEGORIES = {
  legumes: {
    label: "Legumes",
    icon: Carrot,
    color: "bg-orange-500",
    colorLight: "bg-orange-50",
    borderColor: "border-orange-200",
    textColor: "text-orange-700",
    dotColor: "bg-orange-400",
    items: [
      "Abóbora", "Abobrinha", "Beterraba", "Brócolis", "Cenoura",
      "Chuchu", "Couve-flor", "Inhame", "Jiló", "Maxixe",
      "Milho verde", "Pepino", "Pimentão", "Quiabo", "Vagem"
    ]
  },
  vegetais: {
    label: "Vegetais/Folhas",
    icon: Leaf,
    color: "bg-green-500",
    colorLight: "bg-green-50",
    borderColor: "border-green-200",
    textColor: "text-green-700",
    dotColor: "bg-green-400",
    items: [
      "Agrião", "Alface", "Almeirão", "Catalônia", "Chicória",
      "Couve", "Dente-de-leão", "Espinafre", "Mostarda", "Ora-pro-nóbis",
      "Rúcula", "Serralha", "Taioba"
    ]
  },
  oleaginosas: {
    label: "Oleaginosas",
    icon: Nut,
    color: "bg-amber-700",
    colorLight: "bg-amber-50",
    borderColor: "border-amber-200",
    textColor: "text-amber-800",
    dotColor: "bg-amber-500",
    items: [
      "Amêndoa", "Amendoim", "Castanha-de-caju", "Castanha-do-pará",
      "Chia", "Girassol", "Linhaça", "Macadâmia", "Noz", "Pistache",
      "Semente de abóbora"
    ]
  }
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
      return saved ? JSON.parse(saved) : [];
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
    if (foods.some(f => f.name === name)) return; // já existe
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

  // Alimentos disponíveis para adicionar (não já adicionados)
  const availableFoods = useMemo(() => {
    if (!addCategory) return [];
    const addedNames = new Set(foods.map(f => f.name));
    return FOOD_CATEGORIES[addCategory].items.filter(item => !addedNames.has(item));
  }, [addCategory, foods]);

  // Dia de hoje
  const isToday = (day: number) => {
    return day === today.getDate() && currentMonth === today.getMonth() && currentYear === today.getFullYear();
  };

  // Dia da semana do primeiro dia
  const firstDayOfWeek = new Date(currentYear, currentMonth, 1).getDay();

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
            onClick={() => setShowAddPanel(!showAddPanel)}
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
                  onClick={() => setAddCategory(isActive ? null : catKey)}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-medium transition-all",
                    isActive
                      ? `${cat.colorLight} ${cat.textColor} ${cat.borderColor} shadow-sm`
                      : "bg-background border-border/50 text-muted-foreground hover:bg-muted/50"
                  )}
                >
                  <Icon size={13} />
                  {cat.label}
                </button>
              );
            })}
          </div>

          {/* Alimentos disponíveis */}
          {addCategory && (
            <div className="flex gap-1.5 flex-wrap">
              {availableFoods.length === 0 ? (
                <p className="text-xs text-muted-foreground italic">Todos os alimentos desta categoria já foram adicionados.</p>
              ) : (
                availableFoods.map(food => (
                  <button
                    key={food}
                    onClick={() => addFood(food, addCategory)}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium border border-border/50 bg-background text-foreground/70 hover:bg-emerald-50 hover:border-emerald-300 hover:text-emerald-700 transition-all"
                  >
                    <Plus size={10} />
                    {food}
                  </button>
                ))
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
                  <th className="sticky left-0 z-10 bg-card text-left px-2 py-2 border-b border-border/50 min-w-[120px]">
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
                          <span className="text-[11px] font-semibold text-foreground/80 truncate max-w-[90px]">
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

        {/* Legenda de categorias */}
        {foods.length > 0 && (
          <div className="mt-4 pt-3 border-t border-border/30 flex items-center gap-4 flex-wrap">
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
        )}
      </div>
    </div>
  );
}
