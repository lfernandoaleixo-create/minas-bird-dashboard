/**
 * DietCalculator — Calculadora de Dieta Simplificada por Espécie
 * - Fases com fator de multiplicação visível
 * - Recinto com fator editável manualmente + tooltip de referência
 * - Seletor de ração (mantido)
 * - Métrica simples: % ração → quantidade de salada (sem sliders)
 * Persistência em localStorage por espécie.
 */
import { useState, useMemo, useCallback, useRef } from "react";
import { Calculator, ChevronDown, HelpCircle, Wheat } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  racoes,
  getPetBirdData,
  calculateMER,
  kcalToGrams,
  lifePeriods,
  enclosureTypes,
} from "@/data/petbird";
import { species } from "@/data/feeding";

interface DietCalculatorProps {
  speciesId: string;
  selectedPhase: string;
}

const RACAO_PCT_OPTIONS = [50, 60, 70, 80, 90, 100];

const STORAGE_KEY_DIET_CALC = "dietCalc_v2";

interface CalcState {
  racaoId: string | null;
  racaoPct: number;
  enclosureMultiplier: number; // fator manual editável
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
    enclosureMultiplier: 1.0,
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
  const [showEnclosureHelp, setShowEnclosureHelp] = useState(false);
  const helpRef = useRef<HTMLDivElement>(null);

  const persist = useCallback((newState: CalcState) => {
    setState(newState);
    saveCalcState(speciesId, newState);
  }, [speciesId]);

  // Species data
  const sp = useMemo(() => species.find(s => s.id === speciesId), [speciesId]);
  const birdData = useMemo(() => getPetBirdData(speciesId), [speciesId]);
  const phase = useMemo(() => lifePeriods.find(p => p.id === selectedPhase) || lifePeriods[0], [selectedPhase]);
  const selectedRacao = useMemo(() => racoes.find(r => r.id === state.racaoId) || null, [state.racaoId]);

  // MER calculation using manual enclosure multiplier
  const weight = birdData?.weight || (sp ? (sp.weightRange.min + sp.weightRange.max) / 2 : 100);
  const mer = useMemo(() => {
    if (!birdData || weight <= 0) return 0;
    // Use viveiro-voo-interno as base, then apply manual multiplier
    const baseMer = calculateMER(weight, birdData.metabolism, phase.multiplier, "viveiro-voo-interno");
    return baseMer * state.enclosureMultiplier;
  }, [birdData, weight, phase, state.enclosureMultiplier]);

  // Diet calculation — simple metric
  const dietResult = useMemo(() => {
    if (!selectedRacao || mer <= 0) return null;

    const racaoFrac = state.racaoPct / 100;
    const racaoKcal = mer * racaoFrac;
    const saladaKcal = mer * (1 - racaoFrac);

    const racaoGrams = kcalToGrams(racaoKcal, selectedRacao.energyKcal);

    // Average kcal/kg for mixed salad (vegetais + frutas + sementes ponderado)
    const AVG_SALADA_KCAL = 450; // média ponderada típica de salada mista para psitacídeos
    const saladaGrams = kcalToGrams(saladaKcal, AVG_SALADA_KCAL);

    return {
      racaoKcal,
      racaoGrams,
      saladaKcal,
      saladaGrams,
      totalKcal: mer,
      totalGrams: racaoGrams + saladaGrams,
    };
  }, [selectedRacao, mer, state.racaoPct]);

  // Filtered rations for search
  const filteredRacoes = useMemo(() => {
    if (!racaoSearch.trim()) return racoes.filter(r => r.name !== "Ração Mediana");
    const q = racaoSearch.toLowerCase();
    return racoes.filter(r => r.name !== "Ração Mediana" && r.name.toLowerCase().includes(q));
  }, [racaoSearch]);

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
              {selectedRacao.name.substring(0, 20)}{selectedRacao.name.length > 20 ? "..." : ""} · {state.racaoPct}% ração → {dietResult.saladaGrams.toFixed(0)}g salada
            </span>
          )}
        </div>
        <ChevronDown size={14} className={cn("text-muted-foreground transition-transform", isOpen && "rotate-180")} />
      </button>

      {/* Calculator content */}
      {isOpen && (
        <div className="px-5 pb-4 space-y-4">
          {/* Phase display with multipliers */}
          <div>
            <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">
              Fase da Vida
            </label>
            <div className="flex items-center gap-1.5 flex-wrap">
              {lifePeriods.map(p => (
                <div
                  key={p.id}
                  className={cn(
                    "px-2.5 py-1.5 rounded-lg text-[10px] border transition-all",
                    selectedPhase === p.id
                      ? "bg-teal-600 text-white border-teal-600 shadow-sm font-bold"
                      : "bg-muted/20 border-border/30 text-muted-foreground/60"
                  )}
                >
                  {p.label} <span className={cn("font-mono", selectedPhase === p.id ? "text-teal-100" : "text-muted-foreground/40")}>×{p.multiplier}</span>
                </div>
              ))}
            </div>
            <p className="text-[9px] text-muted-foreground/50 mt-1 italic">
              A fase é selecionada no seletor acima do card
            </p>
          </div>

          {/* Enclosure factor — manual input with help tooltip */}
          <div>
            <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">
              Fator do Recinto
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                step="0.05"
                min="0.5"
                max="2.0"
                value={state.enclosureMultiplier}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  if (!isNaN(val) && val >= 0.5 && val <= 2.0) {
                    persist({ ...state, enclosureMultiplier: val });
                  }
                }}
                onClick={(e) => e.stopPropagation()}
                className="w-20 px-2.5 py-1.5 rounded-lg border border-border/50 bg-background text-xs text-foreground text-center font-mono font-bold focus:outline-none focus:ring-1 focus:ring-indigo-300"
              />
              {/* Help icon with tooltip */}
              <div className="relative" ref={helpRef}>
                <button
                  onClick={(e) => { e.stopPropagation(); setShowEnclosureHelp(!showEnclosureHelp); }}
                  onMouseEnter={() => setShowEnclosureHelp(true)}
                  onMouseLeave={() => setShowEnclosureHelp(false)}
                  className="w-5 h-5 rounded-full flex items-center justify-center bg-muted/30 hover:bg-indigo-100 transition-colors"
                >
                  <HelpCircle size={12} className="text-muted-foreground" />
                </button>
                {showEnclosureHelp && (
                  <div className="absolute z-50 left-7 top-0 bg-card border border-border rounded-lg shadow-xl p-3 min-w-[260px]">
                    <p className="text-[10px] font-bold text-foreground mb-2">Referência de Fatores por Recinto:</p>
                    <table className="w-full text-[9px]">
                      <thead>
                        <tr className="border-b border-border/30">
                          <th className="text-left py-1 text-muted-foreground font-semibold">Recinto</th>
                          <th className="text-right py-1 text-muted-foreground font-semibold">Fator</th>
                        </tr>
                      </thead>
                      <tbody>
                        {enclosureTypes.map(enc => (
                          <tr key={enc.id} className="border-b border-border/10">
                            <td className="py-1 text-foreground">{enc.label}</td>
                            <td className="py-1 text-right font-mono font-bold text-indigo-700">×{enc.multiplier.toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <p className="text-[8px] text-muted-foreground/60 mt-2 italic">
                      Ajuste manualmente conforme sua realidade
                    </p>
                  </div>
                )}
              </div>
              <span className="text-[10px] text-muted-foreground">
                (base: Viveiro Voo Interno = ×1.00)
              </span>
            </div>
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
                onClick={(e) => e.stopPropagation()}
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
                        <span className="text-muted-foreground ml-2">({r.classification}) · {r.energyKcal} kcal/kg</span>
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
              </div>
            )}
          </div>

          {/* Ração percentage selector */}
          <div>
            <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">
              % de Ração na Dieta
            </label>
            <div className="flex items-center gap-1.5 flex-wrap">
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

          {/* Results — simple metric */}
          {dietResult && selectedRacao && (
            <div className="rounded-xl border border-indigo-200 bg-gradient-to-br from-indigo-50/50 to-white p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h5 className="text-[11px] font-bold text-indigo-800 uppercase tracking-wider">Métrica — Por Ave / Dia</h5>
                <span className="text-[9px] text-muted-foreground font-mono">MER: {mer.toFixed(1)} kcal</span>
              </div>

              {/* Main metric cards */}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-center">
                  <Wheat size={16} className="mx-auto text-amber-600 mb-1" />
                  <p className="text-[10px] text-amber-600 font-medium mb-0.5">Ração ({state.racaoPct}%)</p>
                  <p className="text-xl font-black text-amber-800">{dietResult.racaoGrams.toFixed(1)}g</p>
                  <p className="text-[9px] text-amber-500 mt-0.5">{dietResult.racaoKcal.toFixed(0)} kcal</p>
                </div>
                <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-3 text-center">
                  <svg className="mx-auto text-emerald-600 mb-1" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M7 21h10"/><path d="M12 21a9 9 0 0 0 9-9H3a9 9 0 0 0 9 9Z"/><path d="M12 3v4"/><path d="M8 5l1 2"/><path d="M16 5l-1 2"/></svg>
                  <p className="text-[10px] text-emerald-600 font-medium mb-0.5">Salada ({100 - state.racaoPct}%)</p>
                  <p className="text-xl font-black text-emerald-800">{dietResult.saladaGrams.toFixed(1)}g</p>
                  <p className="text-[9px] text-emerald-500 mt-0.5">{dietResult.saladaKcal.toFixed(0)} kcal</p>
                </div>
              </div>

              {/* Total */}
              <div className="flex items-center justify-between pt-2 border-t border-indigo-100 text-[10px]">
                <span className="text-muted-foreground">
                  <span className="font-semibold text-foreground">Total:</span> {dietResult.totalGrams.toFixed(1)}g/dia · {dietResult.totalKcal.toFixed(0)} kcal
                </span>
                {sp.dailyRation > 0 && (
                  <span className="text-muted-foreground italic">
                    Prática atual: {sp.dailyRation}g ração + {sp.dailySalad}g salada
                  </span>
                )}
              </div>

              {/* Per-flock */}
              {sp.currentCount > 1 && (
                <div className="pt-2 border-t border-indigo-100">
                  <p className="text-[10px] font-semibold text-indigo-700 mb-1.5">
                    Plantel ({sp.currentCount} aves):
                  </p>
                  <div className="grid grid-cols-2 gap-2 text-[10px]">
                    <span className="px-2.5 py-1.5 rounded-lg bg-amber-50 border border-amber-100 text-amber-800 font-bold text-center">
                      Ração: {(dietResult.racaoGrams * sp.currentCount).toFixed(0)}g
                    </span>
                    <span className="px-2.5 py-1.5 rounded-lg bg-emerald-50 border border-emerald-100 text-emerald-800 font-bold text-center">
                      Salada: {(dietResult.saladaGrams * sp.currentCount).toFixed(0)}g
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {!selectedRacao && (
            <div className="text-center py-4 text-muted-foreground">
              <Calculator size={20} className="mx-auto mb-2 opacity-20" />
              <p className="text-[11px]">Selecione uma ração acima para ver a métrica</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
