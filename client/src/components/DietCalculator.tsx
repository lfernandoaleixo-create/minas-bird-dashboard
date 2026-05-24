/**
 * DietCalculator — Calculadora de Dieta por Espécie
 * Seleciona ração, % de ração na dieta, e calcula automaticamente
 * a quantidade de "salada" (vegetais + frutas + sementes/proteicos).
 * Ajustável na prática com sliders de proporção.
 * Persistência em localStorage por espécie.
 */
import { useState, useMemo, useCallback } from "react";
import { Calculator, ChevronDown, Wheat, Leaf, Apple, Egg, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  racoes,
  getPetBirdData,
  calculateMER,
  kcalToGrams,
  lifePeriods,
  enclosureTypes,
} from "@/data/petbird";
import type { FoodItem } from "@/data/petbird";
import { species } from "@/data/feeding";

interface DietCalculatorProps {
  speciesId: string;
  selectedPhase: string;
}

const RACAO_PCT_OPTIONS = [50, 60, 70, 80, 90, 100];

const STORAGE_KEY_DIET_CALC = "dietCalc_v1";

interface CalcState {
  racaoId: string | null;
  racaoPct: number;
  // Proporções da salada (somam 100%)
  vegPct: number;
  frtPct: number;
  proPct: number;
  enclosureId: string;
}

function loadCalcState(speciesId: string): CalcState {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_DIET_CALC);
    if (saved) {
      const all = JSON.parse(saved);
      if (all[speciesId]) return all[speciesId];
    }
  } catch {}
  return {
    racaoId: null,
    racaoPct: 70,
    vegPct: 50,
    frtPct: 30,
    proPct: 20,
    enclosureId: "viveiro-voo-interno",
  };
}

function saveCalcState(speciesId: string, state: CalcState) {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_DIET_CALC);
    const all = saved ? JSON.parse(saved) : {};
    all[speciesId] = state;
    localStorage.setItem(STORAGE_KEY_DIET_CALC, JSON.stringify(all));
  } catch {}
}

export default function DietCalculator({ speciesId, selectedPhase }: DietCalculatorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [state, setState] = useState<CalcState>(() => loadCalcState(speciesId));
  const [racaoSearch, setRacaoSearch] = useState("");
  const [showRacaoList, setShowRacaoList] = useState(false);

  const persist = useCallback((newState: CalcState) => {
    setState(newState);
    saveCalcState(speciesId, newState);
  }, [speciesId]);

  // Species data
  const sp = useMemo(() => species.find(s => s.id === speciesId), [speciesId]);
  const birdData = useMemo(() => getPetBirdData(speciesId), [speciesId]);
  const phase = useMemo(() => lifePeriods.find(p => p.id === selectedPhase) || lifePeriods[0], [selectedPhase]);
  const enclosure = useMemo(() => enclosureTypes.find(e => e.id === state.enclosureId) || enclosureTypes[3], [state.enclosureId]);
  const selectedRacao = useMemo(() => racoes.find(r => r.id === state.racaoId) || null, [state.racaoId]);

  // MER calculation
  const weight = birdData?.weight || (sp ? (sp.weightRange.min + sp.weightRange.max) / 2 : 100);
  const mer = useMemo(() => {
    if (!birdData || weight <= 0) return 0;
    return calculateMER(weight, birdData.metabolism, phase.multiplier, enclosure.id);
  }, [birdData, weight, phase, enclosure]);

  // Diet calculation
  const dietResult = useMemo(() => {
    if (!selectedRacao || mer <= 0) return null;

    const racaoFrac = state.racaoPct / 100;
    const racaoKcal = mer * racaoFrac;
    const saladaKcal = mer * (1 - racaoFrac);

    const racaoGrams = kcalToGrams(racaoKcal, selectedRacao.energyKcal);

    // Average kcal/kg for each group (based on petbird data medians)
    const AVG_KCAL = { vegetais: 280, frutas: 554, proteicos: 3596 };

    const vegKcal = saladaKcal * (state.vegPct / 100);
    const frtKcal = saladaKcal * (state.frtPct / 100);
    const proKcal = saladaKcal * (state.proPct / 100);

    const vegGrams = kcalToGrams(vegKcal, AVG_KCAL.vegetais);
    const frtGrams = kcalToGrams(frtKcal, AVG_KCAL.frutas);
    const proGrams = kcalToGrams(proKcal, AVG_KCAL.proteicos);

    const totalSaladaGrams = vegGrams + frtGrams + proGrams;

    return {
      racaoKcal,
      racaoGrams,
      saladaKcal,
      totalSaladaGrams,
      vegGrams,
      frtGrams,
      proGrams,
      totalKcal: mer,
      totalGrams: racaoGrams + totalSaladaGrams,
    };
  }, [selectedRacao, mer, state.racaoPct, state.vegPct, state.frtPct, state.proPct]);

  // Filtered rations for search
  const filteredRacoes = useMemo(() => {
    if (!racaoSearch.trim()) return racoes.filter(r => r.name !== "Ração Mediana");
    const q = racaoSearch.toLowerCase();
    return racoes.filter(r => r.name !== "Ração Mediana" && r.name.toLowerCase().includes(q));
  }, [racaoSearch]);

  const handleSaladPctChange = (key: "vegPct" | "frtPct" | "proPct", value: number) => {
    // Adjust other two proportionally to keep total = 100
    const others = (["vegPct", "frtPct", "proPct"] as const).filter(k => k !== key);
    const remaining = 100 - value;
    const otherTotal = state[others[0]] + state[others[1]];
    let newState: CalcState;
    if (otherTotal === 0) {
      newState = { ...state, [key]: value, [others[0]]: Math.round(remaining / 2), [others[1]]: remaining - Math.round(remaining / 2) };
    } else {
      const ratio0 = state[others[0]] / otherTotal;
      const v0 = Math.round(remaining * ratio0);
      const v1 = remaining - v0;
      newState = { ...state, [key]: value, [others[0]]: v0, [others[1]]: v1 };
    }
    persist(newState);
  };

  if (!sp || !birdData) return null;

  return (
    <div className="border-b border-border/30">
      {/* Toggle header */}
      <button
        onClick={(e) => { e.stopPropagation(); setIsOpen(!isOpen); }}
        className="w-full px-5 py-2.5 flex items-center justify-between hover:bg-muted/10 transition-all"
      >
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg flex items-center justify-center bg-indigo-100">
            <Calculator size={13} className="text-indigo-600" />
          </div>
          <span className="text-[11px] font-bold text-foreground/80">Calculadora de Dieta</span>
          {selectedRacao && dietResult && (
            <span className="text-[10px] text-muted-foreground ml-2">
              {selectedRacao.name.substring(0, 20)}{selectedRacao.name.length > 20 ? "..." : ""} · {state.racaoPct}% ração · {dietResult.totalGrams.toFixed(1)}g total
            </span>
          )}
        </div>
        <ChevronDown size={14} className={cn("text-muted-foreground transition-transform", isOpen && "rotate-180")} />
      </button>

      {/* Calculator content */}
      {isOpen && (
        <div className="px-5 pb-4 space-y-4">
          {/* Info banner */}
          <div className="flex items-start gap-2 p-2.5 rounded-lg bg-indigo-50 border border-indigo-100">
            <Info size={12} className="text-indigo-500 mt-0.5 flex-shrink-0" />
            <p className="text-[10px] text-indigo-700 leading-relaxed">
              MER calculado: <span className="font-bold">{mer.toFixed(1)} kcal/dia</span> · Peso: {weight}g · Fase: {phase.label} · Recinto: {enclosure.label}
            </p>
          </div>

          {/* Enclosure selector */}
          <div>
            <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">Recinto</label>
            <select
              value={state.enclosureId}
              onChange={(e) => persist({ ...state, enclosureId: e.target.value })}
              className="w-full px-3 py-1.5 rounded-lg border border-border/50 bg-background text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-indigo-300"
            >
              {enclosureTypes.map(enc => (
                <option key={enc.id} value={enc.id}>{enc.label}</option>
              ))}
            </select>
          </div>

          {/* Ração selector */}
          <div>
            <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">Ração</label>
            <div className="relative">
              <input
                type="text"
                value={showRacaoList ? racaoSearch : (selectedRacao?.name || "")}
                onChange={(e) => { setRacaoSearch(e.target.value); setShowRacaoList(true); }}
                onFocus={() => setShowRacaoList(true)}
                placeholder="Buscar ração..."
                className="w-full px-3 py-2 rounded-lg border border-border/50 bg-background text-xs text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-indigo-300"
              />
              {showRacaoList && (
                <div className="absolute z-30 top-full left-0 right-0 mt-1 bg-card border border-border rounded-lg shadow-lg max-h-48 overflow-y-auto">
                  {filteredRacoes.length === 0 ? (
                    <p className="text-xs text-muted-foreground p-3 italic">Nenhuma ração encontrada</p>
                  ) : (
                    filteredRacoes.map(r => (
                      <button
                        key={r.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          persist({ ...state, racaoId: r.id });
                          setShowRacaoList(false);
                          setRacaoSearch("");
                        }}
                        className={cn(
                          "w-full text-left px-3 py-2 text-xs hover:bg-muted/50 transition-colors border-b border-border/20 last:border-0",
                          state.racaoId === r.id && "bg-indigo-50 font-semibold text-indigo-700"
                        )}
                      >
                        <span className="font-medium">{r.name}</span>
                        <span className="text-muted-foreground ml-2">({r.classification}) · {r.energyKcal} kcal/kg · {r.proteinG}% prot</span>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
            {selectedRacao && (
              <div className="mt-1.5 flex items-center gap-3 text-[10px] text-muted-foreground">
                <span>Energia: <span className="font-semibold text-foreground">{selectedRacao.energyKcal} kcal/kg</span></span>
                <span>Proteína: <span className="font-semibold text-foreground">{selectedRacao.proteinG}%</span></span>
                <span>Gordura: <span className="font-semibold text-foreground">{selectedRacao.fatG}%</span></span>
                <span>Fibra: <span className="font-semibold text-foreground">{selectedRacao.fiberG}%</span></span>
              </div>
            )}
          </div>

          {/* Ração percentage selector */}
          <div>
            <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">
              % de Ração na Dieta
            </label>
            <div className="flex items-center gap-1.5">
              {RACAO_PCT_OPTIONS.map(pct => (
                <button
                  key={pct}
                  onClick={(e) => { e.stopPropagation(); persist({ ...state, racaoPct: pct }); }}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-[11px] font-bold border transition-all",
                    state.racaoPct === pct
                      ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                      : "bg-background border-border/50 text-muted-foreground hover:bg-indigo-50 hover:border-indigo-200 hover:text-indigo-700"
                  )}
                >
                  {pct}%
                </button>
              ))}
            </div>
          </div>

          {/* Salad proportion sliders */}
          {state.racaoPct < 100 && (
            <div>
              <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">
                Proporção da Salada ({100 - state.racaoPct}% restante)
              </label>
              <div className="space-y-2.5">
                {/* Vegetais */}
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5 min-w-[90px]">
                    <Leaf size={12} className="text-emerald-600" />
                    <span className="text-[11px] font-semibold text-emerald-700">Vegetais</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    step={5}
                    value={state.vegPct}
                    onChange={(e) => handleSaladPctChange("vegPct", Number(e.target.value))}
                    className="flex-1 h-1.5 rounded-full appearance-none bg-emerald-100 accent-emerald-600"
                  />
                  <span className="text-[11px] font-bold text-emerald-700 min-w-[35px] text-right">{state.vegPct}%</span>
                </div>
                {/* Frutas */}
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5 min-w-[90px]">
                    <Apple size={12} className="text-orange-600" />
                    <span className="text-[11px] font-semibold text-orange-700">Frutas</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    step={5}
                    value={state.frtPct}
                    onChange={(e) => handleSaladPctChange("frtPct", Number(e.target.value))}
                    className="flex-1 h-1.5 rounded-full appearance-none bg-orange-100 accent-orange-600"
                  />
                  <span className="text-[11px] font-bold text-orange-700 min-w-[35px] text-right">{state.frtPct}%</span>
                </div>
                {/* Proteicos/Sementes */}
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5 min-w-[90px]">
                    <Wheat size={12} className="text-purple-600" />
                    <span className="text-[11px] font-semibold text-purple-700">Sementes</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    step={5}
                    value={state.proPct}
                    onChange={(e) => handleSaladPctChange("proPct", Number(e.target.value))}
                    className="flex-1 h-1.5 rounded-full appearance-none bg-purple-100 accent-purple-600"
                  />
                  <span className="text-[11px] font-bold text-purple-700 min-w-[35px] text-right">{state.proPct}%</span>
                </div>
              </div>
            </div>
          )}

          {/* Results */}
          {dietResult && selectedRacao && (
            <div className="rounded-xl border border-indigo-200 bg-gradient-to-br from-indigo-50/50 to-white p-4 space-y-3">
              <h5 className="text-[11px] font-bold text-indigo-800 uppercase tracking-wider">Resultado — Por Ave / Dia</h5>
              
              {/* Main metrics */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div className="rounded-lg bg-amber-50 border border-amber-200 p-2.5 text-center">
                  <Wheat size={14} className="mx-auto text-amber-600 mb-1" />
                  <p className="text-[10px] text-amber-600 font-medium">Ração</p>
                  <p className="text-base font-black text-amber-800">{dietResult.racaoGrams.toFixed(1)}g</p>
                  <p className="text-[9px] text-amber-500">{state.racaoPct}% · {dietResult.racaoKcal.toFixed(0)} kcal</p>
                </div>
                <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-2.5 text-center">
                  <Leaf size={14} className="mx-auto text-emerald-600 mb-1" />
                  <p className="text-[10px] text-emerald-600 font-medium">Vegetais</p>
                  <p className="text-base font-black text-emerald-800">{dietResult.vegGrams.toFixed(1)}g</p>
                  <p className="text-[9px] text-emerald-500">{state.vegPct}% da salada</p>
                </div>
                <div className="rounded-lg bg-orange-50 border border-orange-200 p-2.5 text-center">
                  <Apple size={14} className="mx-auto text-orange-600 mb-1" />
                  <p className="text-[10px] text-orange-600 font-medium">Frutas</p>
                  <p className="text-base font-black text-orange-800">{dietResult.frtGrams.toFixed(1)}g</p>
                  <p className="text-[9px] text-orange-500">{state.frtPct}% da salada</p>
                </div>
                <div className="rounded-lg bg-purple-50 border border-purple-200 p-2.5 text-center">
                  <Wheat size={14} className="mx-auto text-purple-600 mb-1" />
                  <p className="text-[10px] text-purple-600 font-medium">Sementes</p>
                  <p className="text-base font-black text-purple-800">{dietResult.proGrams.toFixed(1)}g</p>
                  <p className="text-[9px] text-purple-500">{state.proPct}% da salada</p>
                </div>
              </div>

              {/* Summary row */}
              <div className="flex items-center justify-between pt-2 border-t border-indigo-100">
                <div className="text-[10px] text-muted-foreground">
                  <span className="font-semibold text-foreground">Total Salada:</span> {dietResult.totalSaladaGrams.toFixed(1)}g ({(100 - state.racaoPct)}% da dieta)
                </div>
                <div className="text-[10px] text-muted-foreground">
                  <span className="font-semibold text-foreground">Total Geral:</span> {dietResult.totalGrams.toFixed(1)}g/dia · {dietResult.totalKcal.toFixed(0)} kcal
                </div>
              </div>

              {/* Per-flock calculation */}
              {sp && sp.currentCount > 1 && (
                <div className="pt-2 border-t border-indigo-100">
                  <p className="text-[10px] font-semibold text-indigo-700 mb-1">
                    Para o plantel ({sp.currentCount} aves):
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-[10px]">
                    <span className="px-2 py-1 rounded bg-amber-50 text-amber-800 font-medium text-center">
                      Ração: {(dietResult.racaoGrams * sp.currentCount).toFixed(0)}g
                    </span>
                    <span className="px-2 py-1 rounded bg-emerald-50 text-emerald-800 font-medium text-center">
                      Vegetais: {(dietResult.vegGrams * sp.currentCount).toFixed(0)}g
                    </span>
                    <span className="px-2 py-1 rounded bg-orange-50 text-orange-800 font-medium text-center">
                      Frutas: {(dietResult.frtGrams * sp.currentCount).toFixed(0)}g
                    </span>
                    <span className="px-2 py-1 rounded bg-purple-50 text-purple-800 font-medium text-center">
                      Sementes: {(dietResult.proGrams * sp.currentCount).toFixed(0)}g
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {!selectedRacao && (
            <div className="text-center py-4 text-muted-foreground">
              <Calculator size={20} className="mx-auto mb-2 opacity-20" />
              <p className="text-[11px]">Selecione uma ração acima para calcular a dieta</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
