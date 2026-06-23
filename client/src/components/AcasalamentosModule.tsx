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
  Heart, Plus, ChevronDown, ChevronRight, Edit2, X, ArrowLeft,
  Calendar, MapPin, FileText, AlertTriangle, FlaskConical, Save, Lock, Users
} from "lucide-react";
import { generateBreedingPdf, generateSinglesPdf, type PairData, type SingleBirdData } from "@/lib/breedingPdf";
import { calculateBreedingForSpecies, type BreedingPrediction } from "@shared/geneticsEngine";
import { formatGenotype, VISUAL_MUTATIONS, AVAILABLE_SPLITS, getVisualMutationsForSpecies, getAvailableSplitsForSpecies, type BirdGeneticsData, type SpeciesId } from "@shared/genetics";

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
function GeneticsCard({ title, sex, birdCode, genetics, onChange, colorScheme, speciesId, locked, onLockToggle }: {
  title: string;
  sex: "macho" | "femea";
  birdCode: string;
  genetics: LocalGenetics;
  onChange: (g: LocalGenetics) => void;
  colorScheme: "blue" | "pink";
  speciesId?: SpeciesId;
  locked?: boolean;
  onLockToggle?: () => void;
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

  // Use species-specific mutations if speciesId is provided
  const speciesMutations = speciesId ? getVisualMutationsForSpecies(speciesId) : VISUAL_MUTATIONS;
  const speciesSplits = speciesId ? getAvailableSplitsForSpecies(speciesId) : AVAILABLE_SPLITS;

  const toggleVisual = (id: string, group: "base" | "other") => {
    if (locked) return;
    let current = [...genetics.visual];
    if (group === "base") {
      // Cor base é exclusiva
      const baseIds = speciesMutations.base.map(b => b.id);
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
    if (locked) return;
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
                  {speciesMutations.base.map(m => (
                    <button key={m.id} type="button" onClick={() => toggleVisual(m.id, "base")}
                      className={cn("px-2 py-0.5 rounded text-[11px] font-medium border transition-all",
                        genetics.visual.includes(m.id) ? "bg-emerald-600 text-white border-emerald-600" : "bg-white text-stone-600 border-stone-200 hover:border-emerald-300"
                      )}>{m.label}</button>
                  ))}
                </div>
              </div>
              {speciesMutations.dominant.length > 0 && (
              <div>
                <p className="text-[10px] text-stone-500 font-medium mb-1">Dominantes</p>
                <div className="flex flex-wrap gap-1.5">
                  {speciesMutations.dominant.map(m => (
                    <button key={m.id} type="button" onClick={() => toggleVisual(m.id, "other")}
                      className={cn("px-2 py-0.5 rounded text-[11px] font-medium border transition-all",
                        genetics.visual.includes(m.id) ? "bg-violet-600 text-white border-violet-600" : "bg-white text-stone-600 border-stone-200 hover:border-violet-300"
                      )}>{m.label}</button>
                  ))}
                </div>
              </div>
              )}
              {speciesMutations.recessive.length > 0 && (
              <div>
                <p className="text-[10px] text-stone-500 font-medium mb-1">Recessivas</p>
                <div className="flex flex-wrap gap-1.5">
                  {speciesMutations.recessive.map(m => (
                    <button key={m.id} type="button" onClick={() => toggleVisual(m.id, "other")}
                      className={cn("px-2 py-0.5 rounded text-[11px] font-medium border transition-all",
                        genetics.visual.includes(m.id) ? "bg-amber-600 text-white border-amber-600" : "bg-white text-stone-600 border-stone-200 hover:border-amber-300"
                      )}>{m.label}</button>
                  ))}
                </div>
              </div>
              )}
              {speciesMutations.sexLinked.length > 0 && (
              <div>
                <p className="text-[10px] text-stone-500 font-medium mb-1">Ligadas ao Sexo</p>
                <div className="flex flex-wrap gap-1.5">
                  {speciesMutations.sexLinked.map(m => (
                    <button key={m.id} type="button" onClick={() => toggleVisual(m.id, "other")}
                      className={cn("px-2 py-0.5 rounded text-[11px] font-medium border transition-all",
                        genetics.visual.includes(m.id) ? "bg-pink-600 text-white border-pink-600" : "bg-white text-stone-600 border-stone-200 hover:border-pink-300"
                      )}>{m.label}</button>
                  ))}
                </div>
              </div>
              )}
            </div>
          </div>
          {/* Splits — only show if species has available splits */}
          {(speciesSplits.autosomal.length > 0 || speciesSplits.sexLinked.length > 0) && (
          <div>
            <p className="text-xs font-semibold text-stone-700 mb-2">Splits / Portador</p>
            <div className="space-y-2">
              {speciesSplits.autosomal.length > 0 && (
              <div>
                <p className="text-[10px] text-stone-500 font-medium mb-1">Autossômicos</p>
                <div className="flex flex-wrap gap-1.5">
                  {speciesSplits.autosomal.map(s => (
                    <button key={s.id} type="button" onClick={() => toggleSplit(s.id)}
                      className={cn("px-2 py-0.5 rounded text-[11px] font-medium border transition-all",
                        genetics.splits.includes(s.id) ? "bg-blue-600 text-white border-blue-600" : "bg-white text-stone-600 border-stone-200 hover:border-blue-300"
                      )}>{s.label}</button>
                  ))}
                </div>
              </div>
              )}
              {sex === "macho" && speciesSplits.sexLinked.length > 0 && (
                <div>
                  <p className="text-[10px] text-stone-500 font-medium mb-1">Ligados ao Sexo (somente machos)</p>
                  <div className="flex flex-wrap gap-1.5">
                    {speciesSplits.sexLinked.map(s => (
                      <button key={s.id} type="button" onClick={() => toggleSplit(s.id)}
                        className={cn("px-2 py-0.5 rounded text-[11px] font-medium border transition-all",
                          genetics.splits.includes(s.id) ? "bg-pink-600 text-white border-pink-600" : "bg-white text-stone-600 border-stone-200 hover:border-pink-300"
                        )}>{s.label}</button>
                    ))}
                  </div>
                </div>
              )}
              {sex === "femea" && speciesSplits.sexLinked.length > 0 && (
                <p className="text-[10px] text-amber-700 italic">Fêmeas não podem ser split para mutações ligadas ao sexo</p>
              )}
            </div>
          </div>
          )}
          {/* Nota para espécies sem splits */}
          {speciesSplits.autosomal.length === 0 && speciesSplits.sexLinked.length === 0 && (
            <p className="text-[10px] text-stone-500 italic">Esta espécie não possui splits disponíveis (mutação dominante)</p>
          )}
          {/* Resumo */}
          {(genetics.visual.length > 0 || genetics.splits.length > 0) && (
            <div className="p-2 rounded-md bg-white border border-stone-200">
              <p className="text-[10px] text-stone-500 mb-0.5">Resumo:</p>
              <p className="text-xs font-bold text-stone-800">{formatGenotype(genetics)}</p>
            </div>
          )}
          {/* Botão Salvar / Editar */}
          {onLockToggle && (genetics.visual.length > 0 || genetics.splits.length > 0) && (
            <button
              type="button"
              onClick={onLockToggle}
              className={cn(
                "w-full mt-2 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-bold transition-all",
                locked
                  ? "bg-stone-100 text-stone-500 hover:bg-stone-200 border border-stone-200"
                  : "bg-emerald-600 text-white hover:bg-emerald-700"
              )}
            >
              {locked ? <><Lock size={12} /> Genética Salva — Clique para Editar</> : <><Save size={12} /> Salvar Genética</>}
            </button>
          )}
          {/* Aviso quando travado */}
          {locked && (
            <p className="text-[10px] text-amber-600 text-center italic mt-1">Genética travada. Clique acima para desbloquear.</p>
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
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteError, setDeleteError] = useState("");
  const [filterStatus, setFilterStatus] = useState<PairStatus | "todos">("todos");
  const [showSingles, setShowSingles] = useState(false);

  // Genética local (apenas informativa, não salva)
  const [maleGenetics, setMaleGenetics] = useState<LocalGenetics>({ visual: [], splits: [] });
  const [femaleGenetics, setFemaleGenetics] = useState<LocalGenetics>({ visual: [], splits: [] });
  const [maleLocked, setMaleLocked] = useState(false);
  const [femaleLocked, setFemaleLocked] = useState(false);

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
  // IDs de aves já em casais ativos (excluir do seletor)
  const birdsInActivePairs = useMemo(() => {
    const ids = new Set<number>();
    pairs.filter(p => p.status === "ativo").forEach(p => {
      // Se estamos editando este casal, não bloquear as aves dele
      if (editingId && p.id === editingId) return;
      ids.add(p.maleId);
      ids.add(p.femaleId);
    });
    return ids;
  }, [pairs, editingId]);

  const getMalesBySpecies = (speciesId: string) => {
    return activeBirds.filter(b => b.speciesId === speciesId && b.sex === "macho" && !birdsInActivePairs.has(b.id));
  };

  const getFemalesBySpecies = (speciesId: string) => {
    return activeBirds.filter(b => b.speciesId === speciesId && b.sex === "femea" && !birdsInActivePairs.has(b.id));
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
    } catch (err: any) {
      console.error("Erro ao salvar casal:", err);
      const msg = err?.message || "Erro desconhecido";
      if (msg.includes("login") || msg.includes("10001")) {
        alert("Sua sessão expirou. Faça login novamente.");
        window.location.reload();
      } else {
        alert(`Erro ao salvar casal: ${msg}`);
      }
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
    const hasMaleGenetics = mg && (mg.visual?.length > 0 || mg.splits?.length > 0);
    const hasFemaleGenetics = fg && (fg.visual?.length > 0 || fg.splits?.length > 0);
    setMaleGenetics(hasMaleGenetics ? mg : { visual: [], splits: [] });
    setFemaleGenetics(hasFemaleGenetics ? fg : { visual: [], splits: [] });
    setMaleLocked(!!hasMaleGenetics);
    setFemaleLocked(!!hasFemaleGenetics);
    setView("form");
  };

  // Handle delete
  const handleDelete = async (id: number) => {
    if (deletePassword !== "123456") {
      setDeleteError("Senha incorreta");
      return;
    }
    try {
      await deleteMut.mutateAsync({ id });
      utils.breeding.list.invalidate();
      setDeleteConfirm(null);
      setDeletePassword("");
      setDeleteError("");
    } catch (err) {
      console.error("Erro ao excluir casal:", err);
      alert("Erro ao excluir casal");
    }
  };

  // Aves solteiras (não estão em casais ativos)
  const singleMales = useMemo(() => {
    const pairedIds = new Set<number>();
    pairs.filter(p => p.status === "ativo").forEach(p => { pairedIds.add(p.maleId); pairedIds.add(p.femaleId); });
    return activeBirds.filter(b => b.sex === "macho" && !pairedIds.has(b.id));
  }, [activeBirds, pairs]);

  const singleFemales = useMemo(() => {
    const pairedIds = new Set<number>();
    pairs.filter(p => p.status === "ativo").forEach(p => { pairedIds.add(p.maleId); pairedIds.add(p.femaleId); });
    return activeBirds.filter(b => b.sex === "femea" && !pairedIds.has(b.id));
  }, [activeBirds, pairs]);

  // PDF dos casais
  const handlePairsPdf = async () => {
    const pairData: PairData[] = pairs.map(p => {
      const male = getBirdInfo(p.maleId);
      const female = getBirdInfo(p.femaleId);
      return {
        id: p.id,
        speciesName: p.speciesName,
        pairName: p.pairName || null,
        enclosure: p.enclosure || null,
        status: p.status,
        maleCode: male?.ringNumber || `#${p.maleId}`,
        maleMutation: male?.mutation || null,
        maleAnilha: (male as any)?.anilha || null,
        femaleCode: female?.ringNumber || `#${p.femaleId}`,
        femaleMutation: female?.mutation || null,
        femaleAnilha: (female as any)?.anilha || null,
        startDate: p.startDate ? new Date(p.startDate).toLocaleDateString("pt-BR") : null,
        notes: p.notes || null,
      };
    });
    await generateBreedingPdf(pairData);
  };

  // PDF das solteiras
  const handleSinglesPdf = async () => {
    const males: SingleBirdData[] = singleMales.map(b => ({
      ringNumber: b.ringNumber || null,
      sex: "macho",
      speciesName: FLOCK_SPECIES.find(s => s.id === b.speciesId)?.commonName || b.speciesId,
      mutation: b.mutation || null,
      anilha: (b as any).anilha || null,
      enclosure: (b as any).enclosure || null,
    }));
    const females: SingleBirdData[] = singleFemales.map(b => ({
      ringNumber: b.ringNumber || null,
      sex: "femea",
      speciesName: FLOCK_SPECIES.find(s => s.id === b.speciesId)?.commonName || b.speciesId,
      mutation: b.mutation || null,
      anilha: (b as any).anilha || null,
      enclosure: (b as any).enclosure || null,
    }));
    await generateSinglesPdf(males, females);
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
              onClick={() => { setView("list"); setEditingId(null); setForm(EMPTY_FORM); setMaleGenetics({ visual: [], splits: [] }); setFemaleGenetics({ visual: [], splits: [] }); setMaleLocked(false); setFemaleLocked(false); }}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg hover:bg-stone-100 transition-colors text-stone-500 hover:text-stone-700"
            >
              <ArrowLeft size={16} />
              <span className="text-sm font-medium">Voltar</span>
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
              speciesId={form.speciesId as SpeciesId}
              locked={maleLocked}
              onLockToggle={() => setMaleLocked(!maleLocked)}
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
              speciesId={form.speciesId as SpeciesId}
              locked={femaleLocked}
              onLockToggle={() => setFemaleLocked(!femaleLocked)}
            />
          )}

          {/* Previsão Genética dos Filhotes */}
          {form.maleId && form.femaleId && (maleGenetics.visual.length > 0 || femaleGenetics.visual.length > 0) && (() => {
            const prediction = calculateBreedingForSpecies(maleGenetics, femaleGenetics, form.speciesId);
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
            {editingId && (
              <Button
                variant="outline"
                onClick={() => { setDeleteConfirm(editingId); setDeletePassword(""); setDeleteError(""); }}
                className="border-red-300 text-red-600 hover:bg-red-50"
              >
                <X size={14} className="mr-1" /> Excluir
              </Button>
            )}
            <Button
              variant="outline"
              onClick={() => { setView("list"); setEditingId(null); setForm(EMPTY_FORM); setMaleGenetics({ visual: [], splits: [] }); setFemaleGenetics({ visual: [], splits: [] }); setMaleLocked(false); setFemaleLocked(false); }}
            >
              Cancelar
            </Button>
          </div>
          {/* Delete confirmation modal */}
          {deleteConfirm && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
              <div className="bg-white rounded-2xl p-6 shadow-xl max-w-sm w-full mx-4">
                <h3 className="text-lg font-bold text-red-700 mb-2">Excluir Casal</h3>
                <p className="text-sm text-stone-600 mb-4">Digite a senha para confirmar a exclusão:</p>
                <input
                  type="password"
                  value={deletePassword}
                  onChange={(e) => { setDeletePassword(e.target.value); setDeleteError(""); }}
                  placeholder="Senha..."
                  className="w-full px-3 py-2.5 rounded-xl border border-stone-200 bg-stone-50 text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all mb-2"
                  autoFocus
                />
                {deleteError && <p className="text-xs text-red-600 font-semibold mb-2">{deleteError}</p>}
                <div className="flex gap-3 mt-4">
                  <Button
                    onClick={() => handleDelete(deleteConfirm)}
                    disabled={deleteMut.isPending}
                    className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                  >
                    {deleteMut.isPending ? "Excluindo..." : "Confirmar Exclusão"}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => { setDeleteConfirm(null); setDeletePassword(""); setDeleteError(""); }}
                  >
                    Cancelar
                  </Button>
                </div>
              </div>
            </div>
          )}
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

      {/* Filter + Actions */}
      <div className="flex flex-wrap items-center gap-3 mb-5">
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
        <div className="flex items-center gap-2 ml-auto">
          <Button
            variant="outline"
            onClick={handlePairsPdf}
            className="gap-1.5 text-xs border-emerald-300 text-emerald-700 hover:bg-emerald-50"
            disabled={pairs.length === 0}
          >
            <FileText size={14} /> PDF Casais
          </Button>
          <Button
            variant="outline"
            onClick={handleSinglesPdf}
            className="gap-1.5 text-xs border-blue-300 text-blue-700 hover:bg-blue-50"
          >
            <FileText size={14} /> PDF Solteiras
          </Button>
          <Button
            variant="outline"
            onClick={() => setShowSingles(!showSingles)}
            className={cn("gap-1.5 text-xs", showSingles ? "bg-blue-50 border-blue-400 text-blue-700" : "border-stone-200 text-stone-600")}
          >
            {showSingles ? "Ocultar Solteiras" : "Ver Solteiras"}
          </Button>
        </div>
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
            // Contar machos e fêmeas solteiros (ativos, não estão em nenhum casal ativo)
            const pairedMaleIds = new Set(group.pairs.filter(p => p.status === "ativo").map(p => p.maleId));
            const pairedFemaleIds = new Set(group.pairs.filter(p => p.status === "ativo").map(p => p.femaleId));
            const allMales = activeBirds.filter(b => b.speciesId === group.speciesId && b.sex === "macho");
            const allFemales = activeBirds.filter(b => b.speciesId === group.speciesId && b.sex === "femea");
            const singleMales = allMales.filter(b => !pairedMaleIds.has(b.id)).length;
            const singleFemales = allFemales.filter(b => !pairedFemaleIds.has(b.id)).length;

            return (
              <div key={group.speciesId} className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
                {/* Species header */}
                <button
                  onClick={() => toggleSpecies(group.speciesId)}
                  className="w-full px-5 py-4 flex items-center justify-between hover:bg-stone-50/50 transition-colors"
                >
                  <div className="flex items-center gap-4 min-w-0 flex-wrap">
                    <div className="w-10 h-10 rounded-full bg-rose-50 flex items-center justify-center border-2 border-rose-200 flex-shrink-0">
                      <Heart size={16} className="text-rose-500" />
                    </div>
                    <h3 className="text-lg font-extrabold text-stone-800">{group.speciesName}</h3>
                    <span className="text-sm font-bold text-emerald-600">{activePairs} ativo{activePairs !== 1 ? "s" : ""}</span>
                    <span className="text-stone-300 font-bold">•</span>
                    <span className="text-sm font-bold text-blue-600">{singleMales} ♂ solteiro{singleMales !== 1 ? "s" : ""}</span>
                    <span className="text-stone-300 font-bold">•</span>
                    <span className="text-sm font-bold text-rose-500">{singleFemales} ♀ solteira{singleFemales !== 1 ? "s" : ""}</span>
                  </div>
                  <ChevronDown
                    size={20}
                    className={cn("text-stone-400 transition-transform duration-200", isExpanded && "rotate-180")}
                  />
                </button>

                {/* Expanded pairs list — same row format as PlantelModule */}
                {isExpanded && (
                  <div className="border-t border-stone-100">
                    {group.pairs.map((pair, idx) => {
                      const male = getBirdInfo(pair.maleId);
                      const female = getBirdInfo(pair.femaleId);
                      const maleGen = (pair as any).maleGenetics as LocalGenetics | null;
                      const femaleGen = (pair as any).femaleGenetics as LocalGenetics | null;

                      return (
                        <div
                          key={pair.id}
                          className={cn(
                            "flex items-center gap-6 px-5 py-3 hover:bg-emerald-50/40 transition-colors cursor-pointer group",
                            idx < group.pairs.length - 1 && "border-b border-stone-100/60"
                          )}
                          onClick={() => handleEdit(pair)}
                        >
                          {/* Tudo na mesma linha, colunas distribuídas no espaço horizontal */}

                          {/* Gaiola + número */}
                          <span className="text-base font-bold whitespace-nowrap min-w-[100px]">
                            <span className="text-stone-500">Gaiola</span>{" "}
                            <span className="text-emerald-700 font-extrabold font-mono">{pair.enclosure || <span className="text-stone-300 italic font-normal">—</span>}</span>
                          </span>

                          {/* Status */}
                          <span className={cn("px-3 py-1 rounded-full text-xs font-bold border min-w-[90px] text-center", STATUS_COLORS[pair.status as PairStatus])}>
                            {STATUS_LABELS[pair.status as PairStatus]}
                          </span>

                          {/* ♂ código + mutação + anilha */}
                          <span className="text-base font-bold whitespace-nowrap flex-1 truncate">
                            <span className="text-blue-600">♂</span>{" "}
                            <span className="text-stone-800">{male?.ringNumber || <span className="text-stone-300 italic font-normal">—</span>}</span>
                            {male?.mutation && <span className="text-blue-600 font-bold ml-1.5">{male.mutation}</span>}
                            {male?.anilha && <span className="text-stone-900 font-semibold font-mono text-sm ml-1.5">{male.anilha}</span>}
                          </span>

                          {/* ♀ código + mutação + anilha */}
                          <span className="text-base font-bold whitespace-nowrap flex-1 truncate">
                            <span className="text-rose-500">♀</span>{" "}
                            <span className="text-stone-800">{female?.ringNumber || <span className="text-stone-300 italic font-normal">—</span>}</span>
                            {female?.mutation && <span className="text-rose-500 font-bold ml-1.5">{female.mutation}</span>}
                            {female?.anilha && <span className="text-stone-900 font-semibold font-mono text-sm ml-1.5">{female.anilha}</span>}
                          </span>

                          {/* Genética + símbolo */}
                          <span className="text-base font-bold whitespace-nowrap">
                            <span className="text-stone-500">Genética</span>{" "}
                            {maleGen || femaleGen ? (
                              <span className="text-emerald-700 font-extrabold">✓</span>
                            ) : (
                              <span className="text-stone-300 italic font-normal">—</span>
                            )}
                          </span>



                          {/* Arrow */}
                          <ChevronRight size={14} className="text-stone-300 group-hover:text-emerald-400 transition-colors" />
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

      {/* Aves Solteiras Section */}
      {showSingles && (
        <div className="mt-6 space-y-4">
          <h3 className="text-lg font-bold text-stone-800 flex items-center gap-2">
            <Users size={18} className="text-blue-500" />
            Aves Solteiras
            <span className="text-sm font-normal text-stone-500">({singleMales.length + singleFemales.length} aves não vinculadas a casais ativos)</span>
          </h3>

          {/* Machos */}
          <div className="bg-white rounded-2xl border border-blue-200 shadow-sm overflow-hidden">
            <div className="px-5 py-3 bg-blue-50 border-b border-blue-100">
              <h4 className="font-bold text-blue-700">♂ Machos Solteiros ({singleMales.length})</h4>
            </div>
            {singleMales.length === 0 ? (
              <p className="px-5 py-4 text-sm text-stone-400 italic">Nenhum macho solteiro</p>
            ) : (
              <div className="divide-y divide-stone-100">
                {singleMales.map(b => (
                  <div key={b.id} className="flex items-center gap-4 px-5 py-2.5 text-sm">
                    <span className="font-bold text-blue-700 min-w-[60px]">{b.ringNumber || `#${b.id}`}</span>
                    <span className="text-stone-600 min-w-[120px]">{FLOCK_SPECIES.find(s => s.id === b.speciesId)?.commonName || b.speciesId}</span>
                    <span className="text-stone-800 font-medium flex-1">{b.mutation || "—"}</span>
                    <span className="text-stone-400 text-xs">{(b as any).anilha || ""}</span>
                    <span className="text-stone-400 text-xs">{(b as any).enclosure || ""}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Fêmeas */}
          <div className="bg-white rounded-2xl border border-rose-200 shadow-sm overflow-hidden">
            <div className="px-5 py-3 bg-rose-50 border-b border-rose-100">
              <h4 className="font-bold text-rose-700">♀ Fêmeas Solteiras ({singleFemales.length})</h4>
            </div>
            {singleFemales.length === 0 ? (
              <p className="px-5 py-4 text-sm text-stone-400 italic">Nenhuma fêmea solteira</p>
            ) : (
              <div className="divide-y divide-stone-100">
                {singleFemales.map(b => (
                  <div key={b.id} className="flex items-center gap-4 px-5 py-2.5 text-sm">
                    <span className="font-bold text-rose-600 min-w-[60px]">{b.ringNumber || `#${b.id}`}</span>
                    <span className="text-stone-600 min-w-[120px]">{FLOCK_SPECIES.find(s => s.id === b.speciesId)?.commonName || b.speciesId}</span>
                    <span className="text-stone-800 font-medium flex-1">{b.mutation || "—"}</span>
                    <span className="text-stone-400 text-xs">{(b as any).anilha || ""}</span>
                    <span className="text-stone-400 text-xs">{(b as any).enclosure || ""}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
