/**
 * FoodCalendarCard — Calendário mensal com seletor de alimentos
 * Categorias: Legumes, Vegetais, Oleaginosas
 * Ao selecionar um alimento, checkboxes aparecem abaixo de cada dia do mês
 */
import { useState, useMemo } from "react";
import { ChevronLeft, ChevronRight, Leaf, Carrot, Nut } from "lucide-react";
import { cn } from "@/lib/utils";

// Dados de alimentos por categoria
const FOOD_CATEGORIES = {
  legumes: {
    label: "Legumes",
    icon: Carrot,
    color: "bg-orange-500",
    colorLight: "bg-orange-50 border-orange-200",
    textColor: "text-orange-700",
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
    colorLight: "bg-green-50 border-green-200",
    textColor: "text-green-700",
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
    colorLight: "bg-amber-50 border-amber-200",
    textColor: "text-amber-800",
    items: [
      "Amêndoa", "Amendoim", "Castanha-de-caju", "Castanha-do-pará",
      "Chia", "Girassol", "Linhaça", "Macadâmia", "Noz", "Pistache",
      "Semente de abóbora"
    ]
  }
} as const;

type CategoryKey = keyof typeof FOOD_CATEGORIES;

const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const MONTHS = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

export default function FoodCalendarCard() {
  const today = new Date();
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [selectedCategory, setSelectedCategory] = useState<CategoryKey | null>(null);
  const [selectedFood, setSelectedFood] = useState<string | null>(null);
  // checkedDays: key = "YYYY-MM-DD-food", value = true
  const [checkedDays, setCheckedDays] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem("foodCalendarChecks");
      return saved ? JSON.parse(saved) : {};
    } catch { return {}; }
  });

  // Salvar no localStorage quando muda
  const saveChecks = (newChecks: Record<string, boolean>) => {
    setCheckedDays(newChecks);
    localStorage.setItem("foodCalendarChecks", JSON.stringify(newChecks));
  };

  // Dias do mês
  const daysInMonth = useMemo(() => {
    const firstDay = new Date(currentYear, currentMonth, 1);
    const lastDay = new Date(currentYear, currentMonth + 1, 0);
    const startDayOfWeek = firstDay.getDay();
    const totalDays = lastDay.getDate();

    const days: (number | null)[] = [];
    // Preencher dias vazios antes do primeiro dia
    for (let i = 0; i < startDayOfWeek; i++) {
      days.push(null);
    }
    // Dias do mês
    for (let d = 1; d <= totalDays; d++) {
      days.push(d);
    }
    return days;
  }, [currentMonth, currentYear]);

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

  const getDayKey = (day: number) => {
    const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    return `${dateStr}-${selectedFood}`;
  };

  const toggleDay = (day: number) => {
    if (!selectedFood) return;
    const key = getDayKey(day);
    const newChecks = { ...checkedDays, [key]: !checkedDays[key] };
    if (!newChecks[key]) delete newChecks[key];
    saveChecks(newChecks);
  };

  const isDayChecked = (day: number) => {
    if (!selectedFood) return false;
    return !!checkedDays[getDayKey(day)];
  };

  // Contar dias marcados para o alimento selecionado no mês
  const checkedCount = useMemo(() => {
    if (!selectedFood) return 0;
    const prefix = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}`;
    return Object.keys(checkedDays).filter(k => k.startsWith(prefix) && k.endsWith(`-${selectedFood}`)).length;
  }, [checkedDays, selectedFood, currentMonth, currentYear]);

  return (
    <div className="bg-card rounded-2xl border border-border/50 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-600 to-teal-600 px-6 py-4">
        <h3 className="text-white font-serif text-lg font-semibold">
          Calendário de Alimentos
        </h3>
        <p className="text-white/70 text-xs mt-0.5">
          Selecione um alimento e marque os dias em que será servido
        </p>
      </div>

      <div className="p-5 space-y-5">
        {/* Seletor de Categoria */}
        <div>
          <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">
            Categoria
          </p>
          <div className="flex gap-2 flex-wrap">
            {(Object.keys(FOOD_CATEGORIES) as CategoryKey[]).map(catKey => {
              const cat = FOOD_CATEGORIES[catKey];
              const Icon = cat.icon;
              const isActive = selectedCategory === catKey;
              return (
                <button
                  key={catKey}
                  onClick={() => {
                    setSelectedCategory(isActive ? null : catKey);
                    setSelectedFood(null);
                  }}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 rounded-xl border text-sm font-medium transition-all",
                    isActive
                      ? `${cat.colorLight} ${cat.textColor} border-current shadow-sm`
                      : "bg-muted/30 border-border/50 text-muted-foreground hover:bg-muted/50"
                  )}
                >
                  <Icon size={14} />
                  {cat.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Seletor de Alimento */}
        {selectedCategory && (
          <div>
            <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">
              Alimento
            </p>
            <div className="flex gap-1.5 flex-wrap">
              {FOOD_CATEGORIES[selectedCategory].items.map(food => {
                const isActive = selectedFood === food;
                const cat = FOOD_CATEGORIES[selectedCategory];
                return (
                  <button
                    key={food}
                    onClick={() => setSelectedFood(isActive ? null : food)}
                    className={cn(
                      "px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all",
                      isActive
                        ? `${cat.color} text-white border-transparent shadow-sm`
                        : "bg-background border-border/50 text-foreground/70 hover:bg-muted/50"
                    )}
                  >
                    {food}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Calendário */}
        <div>
          {/* Navegação do mês */}
          <div className="flex items-center justify-between mb-3">
            <button
              onClick={prevMonth}
              className="p-1.5 rounded-lg hover:bg-muted/50 transition-all"
            >
              <ChevronLeft size={16} className="text-muted-foreground" />
            </button>
            <h4 className="text-sm font-semibold text-foreground">
              {MONTHS[currentMonth]} {currentYear}
            </h4>
            <button
              onClick={nextMonth}
              className="p-1.5 rounded-lg hover:bg-muted/50 transition-all"
            >
              <ChevronRight size={16} className="text-muted-foreground" />
            </button>
          </div>

          {/* Info do alimento selecionado */}
          {selectedFood && (
            <div className="mb-3 px-3 py-2 rounded-lg bg-muted/30 border border-border/30 flex items-center justify-between">
              <span className="text-xs font-medium text-foreground/70">
                <span className="font-semibold text-foreground">{selectedFood}</span> — marque os dias
              </span>
              <span className="text-xs text-muted-foreground">
                {checkedCount} dia{checkedCount !== 1 ? "s" : ""} marcado{checkedCount !== 1 ? "s" : ""}
              </span>
            </div>
          )}

          {/* Grid do calendário */}
          <div className="grid grid-cols-7 gap-1">
            {/* Cabeçalho dos dias da semana */}
            {WEEKDAYS.map(day => (
              <div key={day} className="text-center text-[10px] font-semibold text-muted-foreground/60 py-1">
                {day}
              </div>
            ))}

            {/* Dias do mês */}
            {daysInMonth.map((day, idx) => {
              if (day === null) {
                return <div key={`empty-${idx}`} className="aspect-square" />;
              }

              const isToday = day === today.getDate() && currentMonth === today.getMonth() && currentYear === today.getFullYear();
              const checked = isDayChecked(day);
              const hasFood = selectedFood !== null;

              return (
                <div
                  key={`day-${day}`}
                  className="flex flex-col items-center"
                >
                  {/* Número do dia */}
                  <div
                    className={cn(
                      "w-full aspect-square flex flex-col items-center justify-center rounded-lg text-xs transition-all",
                      isToday && "ring-1 ring-primary/50",
                      hasFood && "cursor-pointer hover:bg-muted/50",
                      checked && "bg-emerald-100 dark:bg-emerald-900/30"
                    )}
                    onClick={() => hasFood && toggleDay(day)}
                  >
                    <span className={cn(
                      "font-medium",
                      isToday ? "text-primary font-bold" : "text-foreground/70",
                      checked && "text-emerald-700 dark:text-emerald-300"
                    )}>
                      {day}
                    </span>

                    {/* Checkbox visual */}
                    {hasFood && (
                      <div className={cn(
                        "w-3.5 h-3.5 rounded border mt-0.5 flex items-center justify-center transition-all",
                        checked
                          ? "bg-emerald-500 border-emerald-500"
                          : "border-muted-foreground/30 bg-background"
                      )}>
                        {checked && (
                          <svg width="8" height="8" viewBox="0 0 12 12" fill="none">
                            <path d="M2 6L5 9L10 3" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
