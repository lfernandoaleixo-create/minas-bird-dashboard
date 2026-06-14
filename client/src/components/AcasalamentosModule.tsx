/**
 * AcasalamentosModule — Gerenciamento de casais reprodutores
 * Organizado por espécie em cards expansíveis
 * Permite criar, editar e gerenciar casais (macho + fêmea)
 */
import { useState, useMemo, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { species } from "@/data/feeding";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Heart, Plus, ChevronDown, ChevronRight, Edit2, Trash2, X,
  Calendar, MapPin, FileText, AlertTriangle, FlaskConical
} from "lucide-react";
import { calculateBreeding, type BreedingPrediction } from "@shared/geneticsEngine";
import { formatGenotype, VISUAL_MUTATIONS, AVAILABLE_SPLITS, type BirdGeneticsData } from "@shared/genetics";

// Species in current flock
const FLOCK_SPECIES = species.filter(s => s.inCurrentFlock);

type PairStatus = "ativo" | "separado" | "em_descanso";
type View = "list" | "form" | "detail";

const STATUS_LABELS: Record<PairStatus, string> = {
  ativo: "Ativo",
  separado: "Separado",
  em_descanso: "Em Descanso",
};

const STATUS_COLORS: Record<PairStatus, string> = {
  ativo: "bg-emerald-50 text-emerald-700 border-emerald-200",
  separado: "bg-stone-100 text-stone-600 border-stone-200",
  em_descanso: "bg-amber-50 text-amber-700 border-amber-200",
};

interface PairForm {
  speciesId: string;
  speciesName: string;
  maleId: number | null;
  femaleId: number | null;
  pairName: string;
  enclosure: string;
  status: PairStatus;
  startDate: string;
  notes: string;
}

// Genética local (apenas informativa, não salva no banco)
interface LocalGenetics {
  visual: string[];
  splits: string[];
}

const EMPTY_FORM: PairForm = {
  speciesId: "",
  speciesName: "",
  maleId: null,
  femaleId: null,
  pairName: "",
  enclosure: "",
  status: "ativo",
  startDate: "",
  notes: "",
};

// ============================================================
// GeneticsCard — card expansível para parametrizar genética
// ============================================================
function GeneticsCard({ title, sex, birdCode, genetics, onChange, colorScheme }: {
  title: string;
  sex: "macho" | "femea";
  birdCode: string;
  genetics: LocalGenetics;
  onChange: (g: LocalGenetics) => void;
  colorScheme: "blue" | "pink";
}) {
  const [expanded, setExpanded] = useState(false);
  const borderColor = colorScheme === "blue" ? "border-blue-200" : "border-pink-200";
  const bgColor = colorScheme === "blue" ? "bg-blue-50/50" : "bg-pink-50/50";
  const headerText = colorScheme === "blue" ? "text-blue-800" : "text-pink-800";

  // Pares exclusivos: SF/DF do mesmo gene não podem coexistir
  const EXCLUSIVE_PAIRS: Record<string, string> = {
    "dark_sf": "dark_df", "dark_df": "dark_sf",
    "violet_sf": "violet_df", "violet_df": "violet_sf",
    "grey_sf": "grey_df", "grey_df": "grey_sf",
    "dom_pied_sf": "dom_pied_df", "dom_pied_df": "dom_pied_sf",
  };
  // Ino/Pallid/Platinum são alelos do mesmo locus (exclusivos)
  const INO_LOCUS_IDS = ["slino", "pallid", "platinum"];

  const toggleVisual = (id: string, group: "base" | "other") => {
    let current = [...genetics.visual];
    if (group === "base") {
      // Cor base é exclusiva
      const baseIds = VISUAL_MUTATIONS.base.map(b => b.id);
      current = current.filter(v => !baseIds.includes(v));
      onChange({ ...genetics, visual: [...current, id] });
    } else {
      const has = current.includes(id);
      if (has) {
        onChange({ ...genetics, visual: current.filter(v => v !== id) });
      } else {
        // Remover conflitantes
        // 1. SF/DF exclusivos
        const exclusive = EXCLUSIVE_PAIRS[id];
        if (exclusive) current = current.filter(v => v !== exclusive);
        // 2. Ino/Pallid/Platinum exclusivos (mesmo locus)
        if (INO_LOCUS_IDS.includes(id)) {
          current = current.filter(v => !INO_LOCUS_IDS.includes(v));
        }
        onChange({ ...genetics, visual: [...current, id] });
      }
    }
  };

  const toggleSplit = (id: string) => {
    const has = genetics.splits.includes(id);
    onChange({ ...genetics, splits: has ? genetics.splits.filter(s => s !== id) : [...genetics.splits, id] });
  };

  return (
    <div className={`rounded-xl border ${borderColor} ${bgColor} overflow-hidden`}>
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full px-4 py-3 flex items-center justify-between text-left"
      >
        <div className="flex items-center gap-2">
          <FlaskConical size={14} className={headerText} />
          <span className={`text-sm font-semibold ${headerText}`}>{title}</span>
          <span className="text-xs text-stone-500">({birdCode})</span>
        </div>
        <div className="flex items-center gap-2">
          {genetics.visual.length > 0 && (
            <span className="text-[10px] text-stone-500 max-w-[150px] truncate">
              {formatGenotype(genetics)}
            </span>
          )}
          <ChevronDown size={14} className={cn("text-stone-400 transition-transform", expanded && "rotate-180")} />
        </div>
      </button>
      {expanded && (
        <div className="px-4 pb-4 space-y-3">
          {/* Mutações Visuais */}
          <div>
            <p className="text-xs font-semibold text-stone-700 mb-2">Mutação Visual</p>
            <div className="space-y-2">
              <div>
                <p className="text-[10px] text-stone-500 font-medium mb-1">Cor Base</p>
                <div className="flex flex-wrap gap-1.5">
                  {VISUAL_MUTATIONS.base.map(m => (
                    <button key={m.id} type="button" onClick={() => toggleVisual(m.id, "base")}
                      className={cn("px-2 py-0.5 rounded text-[11px] font-medium border transition-all",
                        genetics.visual.includes(m.id) ? "bg-emerald-600 text-white border-emerald-600" : "bg-white text-stone-600 border-stone-200 hover:border-emerald-300"
                      )}>{m.label}</button>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-[10px] text-stone-500 font-medium mb-1">Dominantes</p>
                <div className="flex flex-wrap gap-1.5">
                  {VISUAL_MUTATIONS.dominant.map(m => (
                    <button key={m.id} type="button" onClick={() => toggleVisual(m.id, "other")}
                      className={cn("px-2 py-0.5 rounded text-[11px] font-medium border transition-all",
                        genetics.visual.includes(m.id) ? "bg-violet-600 text-white border-violet-600" : "bg-white text-stone-600 border-stone-200 hover:border-violet-300"
                      )}>{m.label}</button>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-[10px] text-stone-500 font-medium mb-1">Recessivas</p>
                <div className="flex flex-wrap gap-1.5">
                  {VISUAL_MUTATIONS.recessive.map(m => (
                    <button key={m.id} type="button" onClick={() => toggleVisual(m.id, "other")}
                      className={cn("px-2 py-0.5 rounded text-[11px] font-medium border transition-all",
                        genetics.visual.includes(m.id) ? "bg-amber-600 text-white border-amber-600" : "bg-white text-stone-600 border-stone-200 hover:border-amber-300"
                      )}>{m.label}</button>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-[10px] text-stone-500 font-medium mb-1">Ligadas ao Sexo</p>
                <div className="flex flex-wrap gap-1.5">
                  {VISUAL_MUTATIONS.sexLinked.map(m => (
                    <button key={m.id} type="button" onClick={() => toggleVisual(m.id, "other")}
                      className={cn("px-2 py-0.5 rounded text-[11px] font-medium border transition-all",
                        genetics.visual.includes(m.id) ? "bg-pink-600 text-white border-pink-600" : "bg-white text-stone-600 border-stone-200 hover:border-pink-300"
                      )}>{m.label}</button>
                  ))}
                </div>
              </div>
            </div>
          </div>
          {/* Splits */}
          <div>
            <p className="text-xs font-semibold text-stone-700 mb-2">Splits / Portador</p>
            <div className="space-y-2">
              <div>
                <p className="text-[10px] text-stone-500 font-medium mb-1">Autossômicos</p>
                <div className="flex flex-wrap gap-1.5">
                  {AVAILABLE_SPLITS.autosomal.map(s => (
                    <button key={s.id} type="button" onClick={() => toggleSplit(s.id)}
                      className={cn("px-2 py-0.5 rounded text-[11px] font-medium border transition-all",
                        genetics.splits.includes(s.id) ? "bg-blue-600 text-white border-blue-600" : "bg-white text-stone-600 border-stone-200 hover:border-blue-300"
                      )}>{s.label}</button>
                  ))}
                </div>
              </div>
              {sex === "macho" && (
                <div>
                  <p className="text-[10px] text-stone-500 font-medium mb-1">Ligados ao Sexo (somente machos)</p>
                  <div className="flex flex-wrap gap-1.5">
                    {AVAILABLE_SPLITS.sexLinked.map(s => (
                      <button key={s.id} type="button" onClick={() => toggleSplit(s.id)}
                        className={cn("px-2 py-0.5 rounded text-[11px] font-medium border transition-all",
                          genetics.splits.includes(s.id) ? "bg-pink-600 text-white border-pink-600" : "bg-white text-stone-600 border-stone-200 hover:border-pink-300"
                        )}>{s.label}</button>
                    ))}
                  </div>
                </div>
              )}
              {sex === "femea" && (
                <p className="text-[10px] text-amber-700 italic">Fêmeas não podem ser split para mutações ligadas ao sexo</p>
              )}
            </div>
          </div>
          {/* Resumo */}
          {(genetics.visual.length > 0 || genetics.splits.length > 0) && (
            <div className="p-2 rounded-md bg-white border border-stone-200">
              <p className="text-[10px] text-stone-500 mb-0.5">Resumo:</p>
              <p className="text-xs font-bold text-stone-800">{formatGenotype(genetics)}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================
// MÓDULO PRINCIPAL
// ============================================================
export default function AcasalamentosModule() {
  const [view, setView] = useState<View>("list");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<PairForm>(EMPTY_FORM);
  const [expandedSpecies, setExpandedSpecies] = useState<Set<string>>(new Set());
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
  const [filterStatus, setFilterStatus] = useState<PairStatus | "todos">("todos");

  // Genética local (apenas informativa, não salva)
  const [maleGenetics, setMaleGenetics] = useState<LocalGenetics>({ visual: [], splits: [] });
  const [femaleGenetics, setFemaleGenetics] = useState<LocalGenetics>({ visual: [], splits: [] });

  // tRPC queries
  const { data: pairs = [], isLoading } = trpc.breeding.list.useQuery();
  const { data: birds = [] } = trpc.plantel.list.useQuery();
  const createMut = trpc.breeding.create.useMutation();
  const updateMut = trpc.breeding.update.useMutation();
  const deleteMut = trpc.breeding.delete.useMutation();
  const utils = trpc.useUtils();

  // Active birds only
  const activeBirds = useMemo(() => {
    return birds.filter(b => b.status === "ativo");
  }, [birds]);

  // Males and females by species
  const getMalesBySpecies = (speciesId: string) => {
    return activeBirds.filter(b => b.speciesId === speciesId && b.sex === "macho");
  };

  const getFemalesBySpecies = (speciesId: string) => {
    return activeBirds.filter(b => b.speciesId === speciesId && b.sex === "femea");
  };

  // Filter pairs
  const filteredPairs = useMemo(() => {
    if (filterStatus === "todos") return pairs;
    return pairs.filter(p => p.status === filterStatus);
  }, [pairs, filterStatus]);

  // Group pairs by species
  const groupedPairs = useMemo(() => {
    const groups: Record<string, { speciesId: string; speciesName: string; pairs: typeof filteredPairs }> = {};
    for (const pair of filteredPairs) {
      if (!groups[pair.speciesId]) {
        groups[pair.speciesId] = { speciesId: pair.speciesId, speciesName: pair.speciesName, pairs: [] };
      }
      groups[pair.speciesId].pairs.push(pair);
    }
    return Object.values(groups).sort((a, b) => a.speciesName.localeCompare(b.speciesName));
  }, [filteredPairs]);

  const toggleSpecies = (speciesId: string) => {
    setExpandedSpecies(prev => {
      const next = new Set(prev);
      if (next.has(speciesId)) next.delete(speciesId);
      else next.add(speciesId);
      return next;
    });
  };

  // Get bird info by ID
  const getBirdInfo = (birdId: number) => {
    return birds.find(b => b.id === birdId);
  };

  // Handle form submission
  const handleSubmit = async () => {
    if (!form.speciesId || !form.maleId || !form.femaleId) return;

    try {
      if (editingId) {
        await updateMut.mutateAsync({
          id: editingId,
          pairName: form.pairName || undefined,
          enclosure: form.enclosure || undefined,
          status: form.status,
          startDate: form.startDate ? new Date(form.startDate) : null,
          notes: form.notes || null,
          maleId: form.maleId,
          femaleId: form.femaleId,
          maleGenetics: maleGenetics.visual.length > 0 || maleGenetics.splits.length > 0 ? maleGenetics : null,
          femaleGenetics: femaleGenetics.visual.length > 0 || femaleGenetics.splits.length > 0 ? femaleGenetics : null,
        });
      } else {
        await createMut.mutateAsync({
          speciesId: form.speciesId,
          speciesName: form.speciesName,
          maleId: form.maleId,
          femaleId: form.femaleId,
          pairName: form.pairName || undefined,
          enclosure: form.enclosure || undefined,
          status: form.status,
          startDate: form.startDate ? new Date(form.startDate) : undefined,
          notes: form.notes || undefined,
          maleGenetics: maleGenetics.visual.length > 0 || maleGenetics.splits.length > 0 ? maleGenetics : undefined,
          femaleGenetics: femaleGenetics.visual.length > 0 || femaleGenetics.splits.length > 0 ? femaleGenetics : undefined,
        });
      }
      utils.breeding.list.invalidate();
      setView("list");
      setEditingId(null);
      setForm(EMPTY_FORM);
      setMaleGenetics({ visual: [], splits: [] });
      setFemaleGenetics({ visual: [], splits: [] });
    } catch (err) {
      console.error("Erro ao salvar casal:", err);
    }
  };

  // Handle edit
  const handleEdit = (pair: typeof pairs[0]) => {
    setEditingId(pair.id);
    setForm({
      speciesId: pair.speciesId,
      speciesName: pair.speciesName,
      maleId: pair.maleId,
      femaleId: pair.femaleId,
      pairName: pair.pairName || "",
      enclosure: pair.enclosure || "",
      status: pair.status as PairStatus,
      startDate: pair.startDate ? new Date(pair.startDate).toISOString().split("T")[0] : "",
      notes: pair.notes || "",
    });
    // Restaurar genética salva
    const mg = (pair as any).maleGenetics;
    const fg = (pair as any).femaleGenetics;
    setMaleGenetics(mg && (mg.visual?.length > 0 || mg.splits?.length > 0) ? mg : { visual: [], splits: [] });
    setFemaleGenetics(fg && (fg.visual?.length > 0 || fg.splits?.length > 0) ? fg : { visual: [], splits: [] });
    setView("form");
  };

  // Handle delete
  const handleDelete = async (id: number) => {
    try {
      await deleteMut.mutateAsync({ id });
      utils.breeding.list.invalidate();
      setDeleteConfirm(null);
    } catch (err) {
      console.error("Erro ao excluir casal:", err);
    }
  };

  // Stats
  const stats = useMemo(() => {
    const total = pairs.length;
    const ativos = pairs.filter(p => p.status === "ativo").length;
    const separados = pairs.filter(p => p.status === "separado").length;
    const descanso = pairs.filter(p => p.status === "em_descanso").length;
    const speciesCount = new Set(pairs.map(p => p.speciesId)).size;
    return { total, ativos, separados, descanso, speciesCount };
  }, [pairs]);

  // =============================================
  // FORM VIEW
  // =============================================
  if (view === "form") {
    const males = form.speciesId ? getMalesBySpecies(form.speciesId) : [];
    const females = form.speciesId ? getFemalesBySpecies(form.speciesId) : [];

    return (
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => { setView("list"); setEditingId(null); setForm(EMPTY_FORM); setMaleGenetics({ visual: [], splits: [] }); setFemaleGenetics({ visual: [], splits: [] }); }}
              className="p-2 rounded-lg hover:bg-stone-100 transition-colors"
            >
              <X size={18} className="text-stone-500" />
            </button>
            <h2 className="text-xl font-bold text-stone-800">
              {editingId ? "Editar Casal" : "Novo Casal"}
            </h2>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-6 space-y-5">
          {/* Espécie */}
          <div>
            <label className="block text-sm font-semibold text-stone-700 mb-1.5">Espécie *</label>
            <select
              value={form.speciesId}
              onChange={(e) => {
                const sp = FLOCK_SPECIES.find(s => s.id === e.target.value);
                setForm({ ...form, speciesId: e.target.value, speciesName: sp?.commonName || "", maleId: null, femaleId: null });
              }}
              className="w-full px-3 py-2.5 rounded-xl border border-stone-200 bg-stone-50 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
              disabled={!!editingId}
            >
              <option value="">Selecione a espécie...</option>
              {FLOCK_SPECIES.map(s => (
                <option key={s.id} value={s.id}>{s.commonName}</option>
              ))}
            </select>
          </div>

          {/* Macho */}
          <div>
            <label className="block text-sm font-semibold text-stone-700 mb-1.5">Macho *</label>
            {!form.speciesId ? (
              <p className="text-xs text-stone-400 italic">Selecione a espécie primeiro</p>
            ) : males.length === 0 ? (
              <p className="text-xs text-amber-600 italic flex items-center gap-1">
                <AlertTriangle size={12} /> Nenhum macho ativo desta espécie no plantel
              </p>
            ) : (
              <select
                value={form.maleId || ""}
                onChange={(e) => setForm({ ...form, maleId: Number(e.target.value) || null })}
                className="w-full px-3 py-2.5 rounded-xl border border-stone-200 bg-stone-50 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
              >
                <option value="">Selecione o macho...</option>
                {males.map(b => (
                  <option key={b.id} value={b.id}>
                    {b.ringNumber || `#${b.id}`} — {b.mutation || "Sem mutação"} {(b as any).anilha ? `(${(b as any).anilha})` : ""}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Fêmea */}
          <div>
            <label className="block text-sm font-semibold text-stone-700 mb-1.5">Fêmea *</label>
            {!form.speciesId ? (
              <p className="text-xs text-stone-400 italic">Selecione a espécie primeiro</p>
            ) : females.length === 0 ? (
              <p className="text-xs text-amber-600 italic flex items-center gap-1">
                <AlertTriangle size={12} /> Nenhuma fêmea ativa desta espécie no plantel
              </p>
            ) : (
              <select
                value={form.femaleId || ""}
                onChange={(e) => setForm({ ...form, femaleId: Number(e.target.value) || null })}
                className="w-full px-3 py-2.5 rounded-xl border border-stone-200 bg-stone-50 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
              >
                <option value="">Selecione a fêmea...</option>
                {females.map(b => (
                  <option key={b.id} value={b.id}>
                    {b.ringNumber || `#${b.id}`} — {b.mutation || "Sem mutação"} {(b as any).anilha ? `(${(b as any).anilha})` : ""}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Card Genética do Macho (opcional) */}
          {form.maleId && (
            <GeneticsCard
              title="🧬 Genética do Pai (opcional)"
              sex="macho"
              birdCode={activeBirds.find(b => b.id === form.maleId)?.ringNumber || '?'}
              genetics={maleGenetics}
              onChange={setMaleGenetics}
              colorScheme="blue"
            />
          )}

          {/* Card Genética da Fêmea (opcional) */}
          {form.femaleId && (
            <GeneticsCard
              title="🧬 Genética da Mãe (opcional)"
              sex="femea"
              birdCode={activeBirds.find(b => b.id === form.femaleId)?.ringNumber || '?'}
              genetics={femaleGenetics}
              onChange={setFemaleGenetics}
              colorScheme="pink"
            />
          )}

          {/* Previsão Genética dos Filhotes */}
          {form.maleId && form.femaleId && (maleGenetics.visual.length > 0 || femaleGenetics.visual.length > 0) && (() => {
            const prediction = calculateBreeding(maleGenetics, femaleGenetics);
            const sortedOffspring = [...prediction.offspring].sort((a, b) => b.probability - a.probability);
            
            return (
              <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/30">
                <div className="flex items-center gap-2 mb-3">
                  <FlaskConical size={16} className="text-emerald-700" />
                  <p className="text-sm font-bold text-emerald-800">🌿 Previsão de Filhotes</p>
                </div>
                <div className="mb-3 grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2 rounded-lg bg-blue-50 border border-blue-200">
                    <p className="font-semibold text-blue-800">♂ {activeBirds.find(b => b.id === form.maleId)?.ringNumber || '?'}</p>
                    <p className="text-blue-600 text-[10px]">{formatGenotype(maleGenetics) || 'Sem dados'}</p>
                  </div>
                  <div className="p-2 rounded-lg bg-pink-50 border border-pink-200">
                    <p className="font-semibold text-pink-800">♀ {activeBirds.find(b => b.id === form.femaleId)?.ringNumber || '?'}</p>
                    <p className="text-pink-600 text-[10px]">{formatGenotype(femaleGenetics) || 'Sem dados'}</p>
                  </div>
                </div>
                <div className="space-y-1.5 max-h-60 overflow-y-auto">
                  {sortedOffspring.map((o, i) => (
                    <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-white border border-stone-100">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-stone-800 truncate">{o.phenotype}</p>
                        <p className="text-[10px] text-stone-500 truncate">{o.genotype}</p>
                      </div>
                      <div className="flex items-center gap-2 ml-2">
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                          o.sex === 'macho' ? 'bg-blue-100 text-blue-700' :
                          o.sex === 'femea' ? 'bg-pink-100 text-pink-700' :
                          'bg-stone-100 text-stone-600'
                        }`}>
                          {o.sex === 'macho' ? '♂' : o.sex === 'femea' ? '♀' : '♂♀'}
                        </span>
                        <span className="text-sm font-bold text-emerald-700 min-w-[45px] text-right">
                          {o.probability.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
                <p className="text-[10px] text-stone-400 mt-2 text-center">
                  {prediction.totalCombinations} combinações calculadas
                </p>
              </div>
            );
          })()}

          {/* Nome do casal */}
          <div>
            <label className="block text-sm font-semibold text-stone-700 mb-1.5">Nome do Casal (opcional)</label>
            <input
              type="text"
              value={form.pairName}
              onChange={(e) => setForm({ ...form, pairName: e.target.value })}
              placeholder="Ex: Casal Violeta, Casal 1..."
              className="w-full px-3 py-2.5 rounded-xl border border-stone-200 bg-stone-50 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
            />
          </div>

          {/* Gaiola / Viveiro */}
          <div>
            <label className="block text-sm font-semibold text-stone-700 mb-1.5">Gaiola / Viveiro</label>
            <input
              type="text"
              value={form.enclosure}
              onChange={(e) => setForm({ ...form, enclosure: e.target.value })}
              placeholder="Ex: Viveiro 3, Gaiola A2..."
              className="w-full px-3 py-2.5 rounded-xl border border-stone-200 bg-stone-50 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
            />
          </div>

          {/* Status */}
          <div>
            <label className="block text-sm font-semibold text-stone-700 mb-1.5">Status</label>
            <select
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value as PairStatus })}
              className="w-full px-3 py-2.5 rounded-xl border border-stone-200 bg-stone-50 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
            >
              <option value="ativo">Ativo</option>
              <option value="em_descanso">Em Descanso</option>
              <option value="separado">Separado</option>
            </select>
          </div>

          {/* Data de formação */}
          <div>
            <label className="block text-sm font-semibold text-stone-700 mb-1.5">Data de Formação</label>
            <input
              type="date"
              value={form.startDate}
              onChange={(e) => setForm({ ...form, startDate: e.target.value })}
              className="w-full px-3 py-2.5 rounded-xl border border-stone-200 bg-stone-50 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
            />
          </div>

          {/* Observações */}
          <div>
            <label className="block text-sm font-semibold text-stone-700 mb-1.5">Observações</label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              rows={3}
              placeholder="Observações sobre o casal..."
              className="w-full px-3 py-2.5 rounded-xl border border-stone-200 bg-stone-50 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <Button
              onClick={handleSubmit}
              disabled={!form.speciesId || !form.maleId || !form.femaleId || createMut.isPending || updateMut.isPending}
              className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {createMut.isPending || updateMut.isPending ? "Salvando..." : editingId ? "Atualizar Casal" : "Criar Casal"}
            </Button>
            <Button
              variant="outline"
              onClick={() => { setView("list"); setEditingId(null); setForm(EMPTY_FORM); setMaleGenetics({ visual: [], splits: [] }); setFemaleGenetics({ visual: [], splits: [] }); }}
            >
              Cancelar
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // =============================================
  // LIST VIEW
  // =============================================
  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-stone-800 flex items-center gap-2">
            <Heart size={22} className="text-rose-500" />
            Acasalamentos
          </h2>
          <p className="text-sm text-stone-500 mt-0.5">Gerenciamento de casais reprodutores por espécie</p>
        </div>
        <Button
          onClick={() => { setForm(EMPTY_FORM); setEditingId(null); setView("form"); }}
          className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
        >
          <Plus size={16} />
          Novo Casal
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <div className="bg-white rounded-xl border border-stone-200 p-3">
          <p className="text-[11px] text-stone-400 font-medium uppercase tracking-wide">Total Casais</p>
          <p className="text-2xl font-bold text-stone-800 mt-0.5">{stats.total}</p>
        </div>
        <div className="bg-white rounded-xl border border-emerald-200 p-3">
          <p className="text-[11px] text-emerald-600 font-medium uppercase tracking-wide">Ativos</p>
          <p className="text-2xl font-bold text-emerald-700 mt-0.5">{stats.ativos}</p>
        </div>
        <div className="bg-white rounded-xl border border-amber-200 p-3">
          <p className="text-[11px] text-amber-600 font-medium uppercase tracking-wide">Em Descanso</p>
          <p className="text-2xl font-bold text-amber-700 mt-0.5">{stats.descanso}</p>
        </div>
        <div className="bg-white rounded-xl border border-stone-200 p-3">
          <p className="text-[11px] text-stone-400 font-medium uppercase tracking-wide">Espécies</p>
          <p className="text-2xl font-bold text-stone-800 mt-0.5">{stats.speciesCount}</p>
        </div>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-3 mb-5">
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value as PairStatus | "todos")}
          className="px-3 py-2 rounded-xl border border-stone-200 bg-white text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
        >
          <option value="todos">Todos os status</option>
          <option value="ativo">Ativos</option>
          <option value="em_descanso">Em Descanso</option>
          <option value="separado">Separados</option>
        </select>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full" />
        </div>
      )}

      {/* Empty state */}
      {!isLoading && pairs.length === 0 && (
        <div className="text-center py-16 bg-white rounded-2xl border border-stone-200">
          <Heart size={48} className="mx-auto text-stone-200 mb-4" />
          <h3 className="text-lg font-semibold text-stone-600 mb-1">Nenhum casal cadastrado</h3>
          <p className="text-sm text-stone-400 mb-4">Comece registrando seu primeiro casal reprodutor</p>
          <Button
            onClick={() => { setForm(EMPTY_FORM); setView("form"); }}
            className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
          >
            <Plus size={16} />
            Cadastrar Primeiro Casal
          </Button>
        </div>
      )}

      {/* Species cards */}
      {!isLoading && groupedPairs.length > 0 && (
        <div className="space-y-3">
          {groupedPairs.map(group => {
            const isExpanded = expandedSpecies.has(group.speciesId);
            const activePairs = group.pairs.filter(p => p.status === "ativo").length;

            return (
              <div key={group.speciesId} className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
                {/* Species header */}
                <button
                  onClick={() => toggleSpecies(group.speciesId)}
                  className="w-full px-5 py-4 flex items-center justify-between hover:bg-stone-50/50 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-rose-50 flex items-center justify-center flex-shrink-0">
                      <Heart size={16} className="text-rose-500" />
                    </div>
                    <div className="text-left min-w-0">
                      <h3 className="text-sm font-bold text-stone-800 truncate">{group.speciesName}</h3>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[11px] text-emerald-600 font-medium">{activePairs} ativo{activePairs !== 1 ? "s" : ""}</span>
                        <span className="text-[11px] text-stone-300">•</span>
                        <span className="text-[11px] text-stone-400">{group.pairs.length} total</span>
                      </div>
                    </div>
                  </div>
                  <ChevronDown
                    size={18}
                    className={cn("text-stone-400 transition-transform duration-200", isExpanded && "rotate-180")}
                  />
                </button>

                {/* Expanded pairs list */}
                {isExpanded && (
                  <div className="border-t border-stone-100">
                    {group.pairs.map(pair => {
                      const male = getBirdInfo(pair.maleId);
                      const female = getBirdInfo(pair.femaleId);

                      return (
                        <div
                          key={pair.id}
                          className="px-5 py-3.5 border-b border-stone-50 last:border-b-0 hover:bg-stone-50/30 transition-colors group"
                        >
                          <div className="flex items-center gap-3">
                            {/* Pair info */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1.5">
                                {pair.pairName && (
                                  <span className="text-sm font-bold text-stone-800">{pair.pairName}</span>
                                )}
                                <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-semibold border", STATUS_COLORS[pair.status as PairStatus])}>
                                  {STATUS_LABELS[pair.status as PairStatus]}
                                </span>
                              </div>

                              {/* Male + Female info */}
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1">
                                <p className="text-sm text-stone-700">
                                  <span className="text-blue-600 font-semibold text-xs">♂ Macho</span>{" "}
                                  <span className="font-medium">{male?.ringNumber || `#${pair.maleId}`}</span>
                                  {male?.mutation && <span className="text-stone-400 ml-1">· {male.mutation}</span>}
                                </p>
                                <p className="text-sm text-stone-700">
                                  <span className="text-rose-500 font-semibold text-xs">♀ Fêmea</span>{" "}
                                  <span className="font-medium">{female?.ringNumber || `#${pair.femaleId}`}</span>
                                  {female?.mutation && <span className="text-stone-400 ml-1">· {female.mutation}</span>}
                                </p>
                              </div>

                              {/* Extra info */}
                              <div className="flex items-center gap-4 mt-1.5 flex-wrap">
                                {pair.enclosure && (
                                  <span className="text-xs text-stone-400 flex items-center gap-1">
                                    <MapPin size={10} /> {pair.enclosure}
                                  </span>
                                )}
                                {pair.startDate && (
                                  <span className="text-xs text-stone-400 flex items-center gap-1">
                                    <Calendar size={10} /> {new Date(pair.startDate).toLocaleDateString("pt-BR")}
                                  </span>
                                )}
                                {pair.notes && (
                                  <span className="text-xs text-stone-400 flex items-center gap-1">
                                    <FileText size={10} /> Obs.
                                  </span>
                                )}
                                {(pair as any).maleGenetics && (pair as any).femaleGenetics && (
                                  <span className="text-xs text-emerald-500 flex items-center gap-1">
                                    <FlaskConical size={10} /> Genética salva
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Actions */}
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={() => handleEdit(pair)}
                                className="p-1.5 rounded-lg hover:bg-emerald-50 text-stone-400 hover:text-emerald-600 transition-colors"
                                title="Editar"
                              >
                                <Edit2 size={14} />
                              </button>
                              {deleteConfirm === pair.id ? (
                                <div className="flex items-center gap-1">
                                  <button
                                    onClick={() => handleDelete(pair.id)}
                                    className="px-2 py-1 rounded-lg bg-red-50 text-red-600 text-[10px] font-bold hover:bg-red-100 transition-colors"
                                  >
                                    Confirmar
                                  </button>
                                  <button
                                    onClick={() => setDeleteConfirm(null)}
                                    className="p-1 rounded-lg hover:bg-stone-100 text-stone-400 transition-colors"
                                  >
                                    <X size={12} />
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => setDeleteConfirm(pair.id)}
                                  className="p-1.5 rounded-lg hover:bg-red-50 text-stone-400 hover:text-red-500 transition-colors"
                                  title="Excluir"
                                >
                                  <Trash2 size={14} />
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
