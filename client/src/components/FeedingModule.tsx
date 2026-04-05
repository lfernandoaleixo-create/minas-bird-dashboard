/**
 * FeedingModule v7 — Funcionalidades completas
 * - Criar Nova Dieta (balanceamento dinâmico)
 * - Mudar Dieta Atual (carregar dieta salva e editar)
 * - Dietas Salvas (listar, visualizar, excluir, exportar)
 * - Campo de quantidade de aves para cálculo em lote
 * - Botão salvar/exportar dieta
 * - Barras Ideal vs Nossa Dieta em % kcal
 */
import { useState, useMemo, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bird, ChevronDown, ChevronRight, Search, Scale,
  Utensils, Leaf, Apple, Wheat, Check, Info, Star,
  Home, Egg, Feather, Lock, Zap, Plus, X, ArrowRight,
  AlertCircle, CheckCircle2, BarChart3, RefreshCw,
  FilePlus, Edit3, FolderOpen, Save, Download, Trash2,
  Eye, Copy, Users, ArrowLeft, FileText, CalendarDays, Paintbrush,
  FileDown, CopyPlus, Filter,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { species, type Species } from "@/data/feeding";
import {
  racoes, vegetais, frutas, proteicos,
  petbirdMapping, lifePeriods, enclosureTypes,
  getPetBirdData, calculateMER, kcalToGrams,
  type FoodItem, type BirdData, type DietBreakdown,
  type LifePeriod as LifePeriodType, type EnclosureType,
  feedingToPetbirdId,
} from "@/data/petbird";
import { exportDietAsText, generateDietId, type SavedDiet } from "@/lib/dietStorage";
import { exportCalendarPdf, exportAllCalendarsPdf } from "@/lib/calendarPdf";
import OperationalTools from "@/components/OperationalTools";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

const HERO_IMAGE = "https://d2xsxph8kpxj0f.cloudfront.net/310519663426530649/GUVCZBcaMUVxbcauwK97Fr/hero-alimentacao-9qkdhc8VaTxqHLKvqK3hAv.webp";

// ============================================
// TYPES & CONSTANTS
// ============================================
interface SelectedFood {
  food: FoodItem;
  grams: number;
}

type DietMode = "menu" | "creating" | "editing" | "saved-list" | "saved-detail";
type DietStep = "species" | "racao" | "vegetais" | "frutas" | "proteicos";

const STEP_CONFIG: Record<DietStep, { label: string; icon: typeof Bird; color: string; bgColor: string; barColor: string; groupKey: keyof DietBreakdown }> = {
  species: { label: "Espécie", icon: Bird, color: "text-emerald-700", bgColor: "bg-emerald-100", barColor: "bg-emerald-500", groupKey: "ap" },
  racao: { label: "Ração / Alimento Formulado", icon: Utensils, color: "text-amber-700", bgColor: "bg-amber-100", barColor: "bg-amber-500", groupKey: "ap" },
  vegetais: { label: "Vegetais / Hortaliças", icon: Leaf, color: "text-green-700", bgColor: "bg-green-100", barColor: "bg-green-500", groupKey: "vegetais" },
  frutas: { label: "Frutas", icon: Apple, color: "text-red-600", bgColor: "bg-red-100", barColor: "bg-red-400", groupKey: "frutas" },
  proteicos: { label: "Sementes e Proteicos", icon: Wheat, color: "text-yellow-700", bgColor: "bg-yellow-100", barColor: "bg-yellow-500", groupKey: "proteico" },
};

const BAR_COLORS = {
  ap: { bg: "bg-amber-500", text: "text-amber-700", light: "bg-amber-50", border: "border-amber-200" },
  vegetais: { bg: "bg-green-500", text: "text-green-700", light: "bg-green-50", border: "border-green-200" },
  frutas: { bg: "bg-red-400", text: "text-red-600", light: "bg-red-50", border: "border-red-200" },
  proteico: { bg: "bg-yellow-500", text: "text-yellow-700", light: "bg-yellow-50", border: "border-yellow-200" },
};

// ============================================
// HELPERS
// ============================================
function sortFoods(items: FoodItem[]): FoodItem[] {
  const order: Record<string, number> = { "Melhores": 0, "Bons": 1, "Boas": 1, "Pobres": 2 };
  return [...items].sort((a, b) => {
    const oa = order[a.classification] ?? 1;
    const ob = order[b.classification] ?? 1;
    if (oa !== ob) return oa - ob;
    return a.name.localeCompare(b.name, "pt-BR");
  });
}

function classificationBadge(c: string) {
  if (c === "Melhores") return <span className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-emerald-100 text-emerald-800">Melhor</span>;
  if (c === "Bons" || c === "Boas") return <span className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-blue-100 text-blue-800">Bom</span>;
  if (c === "Pobres") return <span className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-orange-100 text-orange-800">Pobre</span>;
  if (c && c !== "-") return <span className="px-1.5 py-0.5 text-[10px] font-medium rounded bg-stone-100 text-stone-600">{c}</span>;
  return null;
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
  } catch { return iso; }
}

// ============================================
// MAIN COMPONENT
// ============================================
export default function FeedingModule() {
  // --- Mode ---
  const [dietMode, setDietMode] = useState<DietMode>("menu");
  const [editingDietId, setEditingDietId] = useState<string | null>(null);
  const [viewingDiet, setViewingDiet] = useState<SavedDiet | null>(null);

  // --- State ---
  const [selectedSpeciesId, setSelectedSpeciesId] = useState<string | null>(null);
  const [speciesSearch, setSpeciesSearch] = useState("");
  const [showSpeciesDropdown, setShowSpeciesDropdown] = useState(false);

  const [phaseId, setPhaseId] = useState("manutencao");
  const [enclosureId, setEnclosureId] = useState("viveiro-voo-interno");
  const [customWeight, setCustomWeight] = useState<number | null>(null);
  const [phaseExpanded, setPhaseExpanded] = useState(false);
  const [enclosureExpanded, setEnclosureExpanded] = useState(false);

  const [selectedRacao, setSelectedRacao] = useState<FoodItem | null>(null);
  const [selectedVegetais, setSelectedVegetais] = useState<FoodItem[]>([]);
  const [selectedFrutas, setSelectedFrutas] = useState<FoodItem[]>([]);
  const [selectedProteicos, setSelectedProteicos] = useState<FoodItem[]>([]);

  const [racaoSearch, setRacaoSearch] = useState("");
  const [vegetaisSearch, setVegetaisSearch] = useState("");
  const [frutasSearch, setFrutasSearch] = useState("");
  const [proteicosSearch, setProteicosSearch] = useState("");

  const [expandedStep, setExpandedStep] = useState<DietStep | null>(null);

  // --- Quantidade de aves ---
  const [birdCount, setBirdCount] = useState<number>(1);

  // --- Dieta salva nome e notas ---
  const [dietName, setDietName] = useState("");
  const [dietNotes, setDietNotes] = useState("");
  const [showSaveDialog, setShowSaveDialog] = useState(false);

  // --- Calendário interativo por espécie ---
  const [calendarYear, setCalendarYear] = useState<number>(new Date().getFullYear());
  const [expandedRegistries, setExpandedRegistries] = useState<Set<string>>(new Set());
  // Dieta ativa selecionada para "pintar" no calendário (dietId)
  const [activePaintDiet, setActivePaintDiet] = useState<string | null>(null);
  // Dieta sendo visualizada no resumo (ao clicar num dia)
  const [dayDetailDiet, setDayDetailDiet] = useState<SavedDiet | null>(null);
  const [dayDetailKey, setDayDetailKey] = useState<string>("");
  // Calendarios por espécie carregados do servidor via tRPC

  // --- Filtro por fase ---
  const [phaseFilter, setPhaseFilter] = useState<string>("all");

  // --- Saved diets list (from server via tRPC) ---
  const [savedDietsFilter, setSavedDietsFilter] = useState("");
  const dietsQuery = trpc.diet.list.useQuery();
  const calendarQuery = trpc.calendar.getAll.useQuery();
  const savedDiets: SavedDiet[] = dietsQuery.data ?? [];
  const speciesCalendars: Record<string, Record<string, string>> = calendarQuery.data ?? {};

  // tRPC mutations
  const createDietMut = trpc.diet.create.useMutation({ onSuccess: () => { dietsQuery.refetch(); } });
  const updateDietMut = trpc.diet.update.useMutation({ onSuccess: () => { dietsQuery.refetch(); } });
  const deleteDietMut = trpc.diet.delete.useMutation({ onSuccess: () => { dietsQuery.refetch(); calendarQuery.refetch(); } });
  const assignDayMut = trpc.calendar.assignDay.useMutation({ onSuccess: () => { calendarQuery.refetch(); } });
  const removeDayMut = trpc.calendar.removeDay.useMutation({ onSuccess: () => { calendarQuery.refetch(); } });
  const saveCalendarMut = trpc.calendar.saveForSpecies.useMutation({ onSuccess: () => { calendarQuery.refetch(); } });

  // --- Derived data ---
  const selectedSpecies = useMemo(() => species.find(s => s.id === selectedSpeciesId) || null, [selectedSpeciesId]);
  const birdData = useMemo(() => selectedSpeciesId ? getPetBirdData(selectedSpeciesId) : null, [selectedSpeciesId]);
  const phase = useMemo(() => lifePeriods.find(p => p.id === phaseId)!, [phaseId]);
  const enclosure = useMemo(() => enclosureTypes.find(e => e.id === enclosureId)!, [enclosureId]);
  const weight = customWeight ?? (birdData?.weight || 0);

  const mer = useMemo(() => {
    if (!birdData || weight <= 0) return 0;
    return calculateMER(weight, birdData.metabolism, phase.multiplier, enclosure.id);
  }, [birdData, weight, phase, enclosure]);

  const breakdown = useMemo(() => birdData?.dietBreakdown || { ap: 70, vegetais: 15, frutas: 10, proteico: 5 }, [birdData]);

  // ============================================
  // IDEAL (travada — baseada na composição ideal em KCAL)
  // ============================================
  const idealDiet = useMemo(() => {
    if (!selectedRacao || mer <= 0) return null;
    const racaoKcalPerKg = selectedRacao.energyKcal;
    const AVG_KCAL: Record<string, number> = { vegetais: 280, frutas: 520, proteico: 3200 };

    const apKcal = mer * breakdown.ap / 100;
    const vegKcal = mer * breakdown.vegetais / 100;
    const frtKcal = mer * breakdown.frutas / 100;
    const proKcal = mer * breakdown.proteico / 100;

    const apGrams = kcalToGrams(apKcal, racaoKcalPerKg);
    const vegGrams = kcalToGrams(vegKcal, AVG_KCAL.vegetais);
    const frtGrams = kcalToGrams(frtKcal, AVG_KCAL.frutas);
    const proGrams = kcalToGrams(proKcal, AVG_KCAL.proteico);

    return {
      racao:     { kcal: apKcal,  pctKcal: breakdown.ap,       grams: apGrams },
      vegetais:  { kcal: vegKcal, pctKcal: breakdown.vegetais, grams: vegGrams },
      frutas:    { kcal: frtKcal, pctKcal: breakdown.frutas,   grams: frtGrams },
      proteicos: { kcal: proKcal, pctKcal: breakdown.proteico, grams: proGrams },
      totalKcal: mer,
      totalGrams: apGrams + vegGrams + frtGrams + proGrams,
    };
  }, [selectedRacao, mer, breakdown]);

  // ============================================
  // NOSSA DIETA (dinâmica)
  // ============================================
  const nossaDieta = useMemo(() => {
    if (!selectedRacao || mer <= 0) return null;

    const hasVeg = selectedVegetais.length > 0;
    const hasFrt = selectedFrutas.length > 0;
    const hasPro = selectedProteicos.length > 0;

    let racaoKcal: number;
    let vegKcal = 0;
    let frtKcal = 0;
    let proKcal = 0;

    if (!hasVeg && !hasFrt && !hasPro) {
      racaoKcal = mer;
    } else {
      racaoKcal = mer * breakdown.ap / 100;
      const remainingKcal = mer - racaoKcal;
      const activeGroups: { key: string; pct: number }[] = [];
      if (hasVeg) activeGroups.push({ key: "vegetais", pct: breakdown.vegetais });
      if (hasFrt) activeGroups.push({ key: "frutas", pct: breakdown.frutas });
      if (hasPro) activeGroups.push({ key: "proteico", pct: breakdown.proteico });

      const totalActivePct = activeGroups.reduce((s, g) => s + g.pct, 0);

      activeGroups.forEach(g => {
        const share = totalActivePct > 0 ? (g.pct / totalActivePct) * remainingKcal : 0;
        if (g.key === "vegetais") vegKcal = share;
        else if (g.key === "frutas") frtKcal = share;
        else if (g.key === "proteico") proKcal = share;
      });
    }

    const racaoGrams = kcalToGrams(racaoKcal, selectedRacao.energyKcal);

    const vegItems: SelectedFood[] = selectedVegetais.map(v => {
      const perItemKcal = vegKcal / selectedVegetais.length;
      return { food: v, grams: kcalToGrams(perItemKcal, v.energyKcal) };
    });
    const frtItems: SelectedFood[] = selectedFrutas.map(f => {
      const perItemKcal = frtKcal / selectedFrutas.length;
      return { food: f, grams: kcalToGrams(perItemKcal, f.energyKcal) };
    });
    const proItems: SelectedFood[] = selectedProteicos.map(p => {
      const perItemKcal = proKcal / selectedProteicos.length;
      return { food: p, grams: kcalToGrams(perItemKcal, p.energyKcal) };
    });

    const totalVegGrams = vegItems.reduce((s, v) => s + v.grams, 0);
    const totalFrtGrams = frtItems.reduce((s, f) => s + f.grams, 0);
    const totalProGrams = proItems.reduce((s, p) => s + p.grams, 0);
    const totalGrams = racaoGrams + totalVegGrams + totalFrtGrams + totalProGrams;
    const totalKcal = racaoKcal + vegKcal + frtKcal + proKcal;

    const racaoPctKcal = totalKcal > 0 ? (racaoKcal / totalKcal) * 100 : 100;
    const vegPctKcal   = totalKcal > 0 ? (vegKcal / totalKcal) * 100 : 0;
    const frtPctKcal   = totalKcal > 0 ? (frtKcal / totalKcal) * 100 : 0;
    const proPctKcal   = totalKcal > 0 ? (proKcal / totalKcal) * 100 : 0;

    let comment = "";
    if (!hasVeg && !hasFrt && !hasPro) {
      comment = `Dieta 100% ração. Forneça ${racaoGrams.toFixed(1)}g de ${selectedRacao.name} para suprir ${mer.toFixed(1)} kcal/dia. Adicione vegetais para começar a balancear.`;
    } else if (hasVeg && !hasFrt && !hasPro) {
      comment = `Ração (${racaoPctKcal.toFixed(0)}% kcal) + Vegetais (${vegPctKcal.toFixed(0)}% kcal). A ração cobre a base energética e os vegetais adicionam fibras e vitaminas. Adicione frutas para mais diversidade.`;
    } else if (hasVeg && hasFrt && !hasPro) {
      comment = `Ração + Vegetais + Frutas. Boa diversidade! Adicione sementes/proteicos para completar com aminoácidos essenciais.`;
    } else if (hasVeg && hasFrt && hasPro) {
      comment = `Dieta completa! ${totalGrams.toFixed(1)}g/dia (${mer.toFixed(1)} kcal) em ${1 + selectedVegetais.length + selectedFrutas.length + selectedProteicos.length} alimentos. Proporção energética próxima do ideal.`;
    } else {
      comment = `Dieta parcial. Continue adicionando grupos para aproximar da composição ideal.`;
    }

    return {
      racao:     { grams: racaoGrams,    kcal: racaoKcal, pctKcal: racaoPctKcal, items: [{ food: selectedRacao, grams: racaoGrams }] },
      vegetais:  { grams: totalVegGrams,  kcal: vegKcal,   pctKcal: vegPctKcal,   items: vegItems },
      frutas:    { grams: totalFrtGrams,  kcal: frtKcal,   pctKcal: frtPctKcal,   items: frtItems },
      proteicos: { grams: totalProGrams,  kcal: proKcal,   pctKcal: proPctKcal,   items: proItems },
      total:     { grams: totalGrams, kcal: totalKcal },
      comment,
    };
  }, [selectedRacao, selectedVegetais, selectedFrutas, selectedProteicos, mer, breakdown]);

  // Which steps are unlocked
  const unlockedSteps = useMemo(() => {
    const unlocked = new Set<DietStep>(["species"]);
    if (selectedSpeciesId) unlocked.add("racao");
    if (selectedRacao) { unlocked.add("vegetais"); unlocked.add("frutas"); unlocked.add("proteicos"); }
    return unlocked;
  }, [selectedSpeciesId, selectedRacao]);

  // --- Handlers ---
  const handleSelectSpecies = useCallback((sp: Species) => {
    setSelectedSpeciesId(sp.id);
    setShowSpeciesDropdown(false);
    setSpeciesSearch("");
    setCustomWeight(null);
    setSelectedRacao(null);
    setSelectedVegetais([]);
    setSelectedFrutas([]);
    setSelectedProteicos([]);
    setExpandedStep("racao");
    // Set bird count from species data
    if (sp.currentCount > 0) {
      setBirdCount(sp.currentCount);
    } else {
      setBirdCount(1);
    }
  }, []);

  const handleResetAll = useCallback(() => {
    setSelectedSpeciesId(null);
    setSelectedRacao(null);
    setSelectedVegetais([]);
    setSelectedFrutas([]);
    setSelectedProteicos([]);
    setCustomWeight(null);
    setExpandedStep(null);
    setPhaseId("manutencao");
    setEnclosureId("viveiro-voo-interno");
    setBirdCount(1);
    setDietMode("menu");
    setEditingDietId(null);
    setDietName("");
    setDietNotes("");
    setShowSaveDialog(false);

  }, []);

  // --- Load saved diet into editor ---
  const loadDietForEditing = useCallback((diet: SavedDiet) => {
    setSelectedSpeciesId(diet.speciesId);
    setPhaseId(diet.phaseId);
    setEnclosureId(diet.enclosureId);
    setCustomWeight(diet.weight);
    setBirdCount(diet.birdCount);

    // Find food items by ID
    const allRacoes = racoes;
    const racao = allRacoes.find(r => r.id === diet.racaoId) || null;
    setSelectedRacao(racao);

    const veg = diet.vegetaisIds.map(id => vegetais.find(v => v.id === id)).filter(Boolean) as FoodItem[];
    setSelectedVegetais(veg);

    const frt = diet.frutasIds.map(id => frutas.find(f => f.id === id)).filter(Boolean) as FoodItem[];
    setSelectedFrutas(frt);

    const pro = diet.proteicosIds.map(id => proteicos.find(p => p.id === id)).filter(Boolean) as FoodItem[];
    setSelectedProteicos(pro);

    setEditingDietId(diet.id);
    // Extrair apenas o complemento do nome (remover prefixo "Ave — Fase — Ambiente — ")
    const nameParts = diet.name.split(" — ");
    // Se tem 5+ partes, o complemento é tudo após as 4 primeiras (Ave — Fase — Ambiente — Ração — ...)
    const complement = nameParts.length >= 5 ? nameParts.slice(4).join(" — ") : (nameParts.length <= 3 ? diet.name : "");
    setDietName(complement);
    setDietNotes(diet.notes || "");

    setExpandedStep(null);
    setDietMode("editing");
  }, []);

  // --- Save diet ---
  const handleSaveDiet = useCallback(async () => {
    if (!selectedSpecies || !selectedRacao || !nossaDieta) return;

    const phaseLabel = lifePeriods.find(p => p.id === phaseId)?.label || phaseId;
    const enclosureLabel = enclosureTypes.find(e => e.id === enclosureId)?.label || enclosureId;
    const racaoLabel = selectedRacao.name;
    const prefix = `${selectedSpecies.commonName} — ${phaseLabel} — ${enclosureLabel} — ${racaoLabel}`;
    const suffix = dietName.trim();
    const name = suffix ? `${prefix} — ${suffix}` : prefix;

    const dietData = {
      name,
      speciesId: selectedSpecies.id,
      speciesName: selectedSpecies.commonName,
      racaoId: selectedRacao.id,
      racaoName: selectedRacao.name,
      vegetaisIds: selectedVegetais.map(v => v.id),
      frutasIds: selectedFrutas.map(f => f.id),
      proteicosIds: selectedProteicos.map(p => p.id),
      weight,
      phaseId,
      enclosureId,
      birdCount,
      notes: dietNotes.trim() || undefined,
      mer,
      totalGrams: nossaDieta.total.grams,
      totalKcal: nossaDieta.total.kcal,
      items: {
        racao: nossaDieta.racao.items.map(i => ({ foodId: i.food.id, foodName: i.food.name, grams: i.grams, kcal: nossaDieta.racao.kcal, energyKcalPerKg: i.food.energyKcal })),
        vegetais: nossaDieta.vegetais.items.map(i => ({ foodId: i.food.id, foodName: i.food.name, grams: i.grams, kcal: nossaDieta.vegetais.kcal / Math.max(1, selectedVegetais.length), energyKcalPerKg: i.food.energyKcal })),
        frutas: nossaDieta.frutas.items.map(i => ({ foodId: i.food.id, foodName: i.food.name, grams: i.grams, kcal: nossaDieta.frutas.kcal / Math.max(1, selectedFrutas.length), energyKcalPerKg: i.food.energyKcal })),
        proteicos: nossaDieta.proteicos.items.map(i => ({ foodId: i.food.id, foodName: i.food.name, grams: i.grams, kcal: nossaDieta.proteicos.kcal / Math.max(1, selectedProteicos.length), energyKcalPerKg: i.food.energyKcal })),
      },
    };

    try {
      if (editingDietId) {
        await updateDietMut.mutateAsync({ id: editingDietId, ...dietData });
        toast.success("Dieta atualizada com sucesso!");
      } else {
        const newId = generateDietId();
        await createDietMut.mutateAsync({ id: newId, ...dietData });
        setEditingDietId(newId);
        toast.success("Dieta salva com sucesso!");
      }
    } catch (err) {
      console.error("Erro ao salvar dieta:", err);
      toast.error("Erro ao salvar dieta. Tente novamente.");
      return;
    }

    setShowSaveDialog(false);
    // Resetar estado do editor e voltar ao menu
    setTimeout(() => {
      setSelectedSpeciesId(null);
      setSelectedRacao(null);
      setSelectedVegetais([]);
      setSelectedFrutas([]);
      setSelectedProteicos([]);
      setCustomWeight(null);
      setExpandedStep(null);
      setPhaseId("manutencao");
      setEnclosureId("viveiro-voo-interno");
      setBirdCount(1);
      setEditingDietId(null);
      setDietName("");
      setDietNotes("");
      setShowSaveDialog(false);

      setDietMode("menu");
    }, 600);
  }, [selectedSpecies, selectedRacao, nossaDieta, selectedVegetais, selectedFrutas, selectedProteicos, weight, phaseId, enclosureId, birdCount, mer, dietName, dietNotes, editingDietId]);

  // --- Export diet as text ---
  const handleExportDiet = useCallback((diet: SavedDiet) => {
    const text = exportDietAsText(diet);
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `dieta-${diet.speciesName.toLowerCase().replace(/\s+/g, "-")}-${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Dieta exportada!");
  }, []);



  // --- Copy diet to clipboard ---
  const handleCopyDiet = useCallback((diet: SavedDiet) => {
    const text = exportDietAsText(diet);
    navigator.clipboard.writeText(text).then(() => {
      toast.success("Dieta copiada para a área de transferência!");
    }).catch(() => {
      toast.error("Erro ao copiar. Tente exportar como arquivo.");
    });
  }, []);

  // --- Duplicar dieta ---
  const handleDuplicateDiet = useCallback(async (diet: SavedDiet) => {
    const newId = generateDietId();
    const newName = `${diet.name} (cópia)`;
    try {
      await createDietMut.mutateAsync({
        id: newId,
        name: newName,
        speciesId: diet.speciesId,
        speciesName: diet.speciesName,
        racaoId: diet.racaoId,
        racaoName: diet.racaoName,
        vegetaisIds: diet.vegetaisIds,
        frutasIds: diet.frutasIds,
        proteicosIds: diet.proteicosIds,
        weight: diet.weight,
        phaseId: diet.phaseId,
        enclosureId: diet.enclosureId,
        birdCount: diet.birdCount,
        notes: diet.notes || undefined,
        mer: diet.mer,
        totalGrams: diet.totalGrams,
        totalKcal: diet.totalKcal,
        items: diet.items,
      });
      toast.success(`Dieta duplicada: "${newName}"`);
    } catch (err) {
      console.error("Erro ao duplicar dieta:", err);
      toast.error("Erro ao duplicar dieta.");
    }
  }, [createDietMut]);

  // --- Delete diet ---
  const handleDeleteDiet = useCallback(async (id: string) => {
    try {
      await deleteDietMut.mutateAsync({ id });
      if (viewingDiet?.id === id) {
        setViewingDiet(null);
        setDietMode("menu");
      }
      toast.success("Dieta exclu\u00edda!");
    } catch (err) {
      console.error("Erro ao excluir dieta:", err);
      toast.error("Erro ao excluir dieta.");
    }
  }, [viewingDiet, deleteDietMut]);

  // --- Filtered rações (apenas Psittacus e Nutribiótica) ---
  const filteredRacoes = useMemo(() => {
    return racoes.filter(r => {
      const cls = r.classification.toLowerCase();
      return cls.includes("psittacus") || cls.includes("nutrib");
    });
  }, []);

  const toggleFood = useCallback((setter: React.Dispatch<React.SetStateAction<FoodItem[]>>, food: FoodItem) => {
    setter(prev => prev.find(v => v.id === food.id) ? prev.filter(v => v.id !== food.id) : [...prev, food]);
  }, []);

  // --- Filtered species ---
  const filteredSpecies = useMemo(() => {
    if (!speciesSearch) return species;
    const q = speciesSearch.toLowerCase();
    return species.filter(s => s.commonName.toLowerCase().includes(q) || s.scientificName.toLowerCase().includes(q));
  }, [speciesSearch]);

  const groupedSpecies = useMemo(() => {
    const groups: Record<string, Species[]> = {};
    filteredSpecies.forEach(s => { if (!groups[s.group]) groups[s.group] = []; groups[s.group].push(s); });
    return groups;
  }, [filteredSpecies]);

  // --- Filtered saved diets ---
  const filteredSavedDiets = useMemo(() => {
    if (!savedDietsFilter) return savedDiets;
    const q = savedDietsFilter.toLowerCase();
    return savedDiets.filter(d => d.name.toLowerCase().includes(q) || d.speciesName.toLowerCase().includes(q));
  }, [savedDiets, savedDietsFilter]);

  // Group saved diets by species
  const groupedSavedDiets = useMemo(() => {
    const groups: Record<string, SavedDiet[]> = {};
    filteredSavedDiets.forEach(d => {
      if (!groups[d.speciesName]) groups[d.speciesName] = [];
      groups[d.speciesName].push(d);
    });
    return groups;
  }, [filteredSavedDiets]);

  // 8 espécies ativas do plantel (sempre visíveis como cards)
  const activeFlockSpecies = useMemo(() => {
    return species.filter(s => s.inCurrentFlock);
  }, []);

  // ============================================
  // RENDER
  // ============================================
  return (
    <div className="space-y-6">
      {/* Hero */}
      <div className="relative h-40 rounded-xl overflow-hidden">
        <img src={HERO_IMAGE} alt="Alimentação" className="w-full h-full object-cover object-center" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/60 to-transparent flex items-end p-6">
          <div>
            <p className="text-white/70 text-xs font-semibold tracking-widest uppercase">Módulo 1</p>
            <h1 className="text-white text-2xl font-bold">Alimentação</h1>
            <p className="text-white/80 text-sm mt-1">Balanceamento nutricional dinâmico baseado no DietBirdPet</p>
          </div>
        </div>
      </div>

      {/* ===== MENU INICIAL ===== */}
      {dietMode === "menu" && (
        <>
        <div className="bg-white rounded-xl border border-stone-200 shadow-sm p-6">
          <h2 className="text-lg font-bold text-stone-800 mb-4">O que deseja fazer?</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <button
              onClick={() => {
                setSelectedSpeciesId(null);
                setSelectedRacao(null);
                setSelectedVegetais([]);
                setSelectedFrutas([]);
                setSelectedProteicos([]);
                setCustomWeight(null);
                setExpandedStep(null);
                setPhaseId("manutencao");
                setEnclosureId("viveiro-voo-interno");
                setBirdCount(1);
    setEditingDietId(null);
    setDietName("");
    setDietNotes("");
    setShowSaveDialog(false);
    setDietMode("creating");
              }}
              className="flex items-center gap-3 p-3 rounded-lg border-2 border-dashed border-emerald-300 bg-emerald-50/50 hover:bg-emerald-100 hover:border-emerald-400 transition-all group"
            >
              <div className="w-9 h-9 rounded-full bg-emerald-100 flex items-center justify-center group-hover:bg-emerald-200 transition-colors flex-shrink-0">
                <FilePlus className="w-4 h-4 text-emerald-700" />
              </div>
              <div className="text-left">
                <span className="font-semibold text-stone-800 block text-sm">Criar Nova Dieta</span>
                <span className="text-[11px] text-stone-500">Montar do zero</span>
              </div>
            </button>

            <button
              onClick={() => {
                if (savedDiets.length === 0) {
                  toast.info("Nenhuma dieta salva. Crie uma nova dieta primeiro.");
                  return;
                }
                setDietMode("saved-list");
              }}
              className="flex items-center gap-3 p-3 rounded-lg border-2 border-dashed border-amber-300 bg-amber-50/50 hover:bg-amber-100 hover:border-amber-400 transition-all group"
            >
              <div className="w-9 h-9 rounded-full bg-amber-100 flex items-center justify-center group-hover:bg-amber-200 transition-colors flex-shrink-0">
                <Edit3 className="w-4 h-4 text-amber-700" />
              </div>
              <div className="text-left">
                <span className="font-semibold text-stone-800 block text-sm">Mudar Dieta Atual</span>
                <span className="text-[11px] text-stone-500">Ajustar existente</span>
              </div>
            </button>

            <button
              onClick={() => {
                setDietMode("saved-list");
              }}
              className="flex items-center gap-3 p-3 rounded-lg border-2 border-dashed border-stone-300 bg-stone-50/50 hover:bg-stone-100 hover:border-stone-400 transition-all group"
            >
              <div className="w-9 h-9 rounded-full bg-stone-100 flex items-center justify-center group-hover:bg-stone-200 transition-colors flex-shrink-0">
                <FolderOpen className="w-4 h-4 text-stone-600" />
              </div>
              <div className="text-left">
                <span className="font-semibold text-stone-800 block text-sm">Dietas Salvas</span>
                <span className="text-[11px] text-stone-500">Ver por espécie</span>
              </div>
            </button>
          </div>
        </div>


        {/* ===== PAINEL DE REGISTRO DE ALIMENTAÇÃO POR ESPÉCIE ===== */}
        {savedDiets.length > 0 && (() => {
          const MONTH_NAMES_FULL = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
          const FERIADOS_REG: Record<string, string> = {
            "1-1": "Confraternização Universal",
            "2-17": "Carnaval", "2-18": "Carnaval",
            "3-4": "Quarta-feira de Cinzas",
            "4-18": "Sexta-feira Santa", "4-20": "Páscoa",
            "4-21": "Tiradentes",
            "5-1": "Dia do Trabalho",
            "6-19": "Corpus Christi",
            "9-7": "Independência do Brasil",
            "10-12": "N. Sra. Aparecida",
            "11-2": "Finados", "11-15": "Proclamação da República", "11-20": "Consciência Negra",
            "12-25": "Natal",
          };
          const DIET_COLORS = [
            { bg: "bg-emerald-500", text: "text-emerald-800", light: "bg-emerald-100", border: "border-emerald-300", hex: "#10b981" },
            { bg: "bg-blue-500", text: "text-blue-800", light: "bg-blue-100", border: "border-blue-300", hex: "#3b82f6" },
            { bg: "bg-amber-500", text: "text-amber-800", light: "bg-amber-100", border: "border-amber-300", hex: "#f59e0b" },
            { bg: "bg-purple-500", text: "text-purple-800", light: "bg-purple-100", border: "border-purple-300", hex: "#a855f7" },
            { bg: "bg-red-400", text: "text-red-800", light: "bg-red-100", border: "border-red-300", hex: "#f87171" },
            { bg: "bg-teal-500", text: "text-teal-800", light: "bg-teal-100", border: "border-teal-300", hex: "#14b8a6" },
          ];

          return Object.entries(groupedSavedDiets).map(([speciesName, dietsForSpecies]) => {
            const dietColorMap = new Map<string, typeof DIET_COLORS[0]>();
            dietsForSpecies.forEach((d, i) => dietColorMap.set(d.id, DIET_COLORS[i % DIET_COLORS.length]));

            const speciesId = dietsForSpecies[0]?.speciesId;
            const allCalendarForSpecies = speciesCalendars[speciesId] || {};
            // Filtrar entradas do calendário para o ano selecionado
            const calendarForSpecies: Record<string, string> = {};
            for (const [key, val] of Object.entries(allCalendarForSpecies)) {
              const parts = key.split("-").map(Number);
              if (parts.length === 3 && parts[0] === calendarYear) {
                calendarForSpecies[key] = val;
              } else if (parts.length === 2) {
                // Formato legado m-d: manter se calendarYear for o ano atual
                calendarForSpecies[key] = val;
              }
            }
            const now = new Date();

            const isExpanded = expandedRegistries.has(speciesName);
            const toggleExpand = () => {
              setExpandedRegistries(prev => {
                const next = new Set(prev);
                if (next.has(speciesName)) next.delete(speciesName);
                else next.add(speciesName);
                return next;
              });
            };

            // Contar dias atribuídos
            const totalAssigned = Object.keys(calendarForSpecies).length;

            return (
              <div key={speciesName} className="bg-white rounded-xl border border-stone-200 shadow-sm overflow-hidden">
                <button
                  type="button"
                  onClick={toggleExpand}
                  className="w-full p-5 border-b border-stone-100 text-left hover:bg-stone-50 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Bird className="w-5 h-5 text-emerald-600" />
                    <h2 className="font-bold text-stone-800">{speciesName}</h2>
                    <span className="text-xs text-stone-400">Registro de Alimentação {calendarYear}</span>
                    <span className="text-[11px] text-stone-400 ml-1">({dietsForSpecies.length} dieta{dietsForSpecies.length > 1 ? "s" : ""})</span>
                    {totalAssigned > 0 && (
                      <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-100 text-emerald-700">
                        {totalAssigned} dia{totalAssigned > 1 ? "s" : ""} programado{totalAssigned > 1 ? "s" : ""}
                      </span>
                    )}
                    <span className="ml-auto">
                      {isExpanded
                        ? <ChevronDown className="w-5 h-5 text-stone-400" />
                        : <ChevronRight className="w-5 h-5 text-stone-400" />}
                    </span>
                  </div>
                  {!isExpanded && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {dietsForSpecies.map(diet => {
                        const color = dietColorMap.get(diet.id)!;
                        return (
                          <span key={diet.id} className="flex items-center gap-1">
                            <span className={cn("w-2.5 h-2.5 rounded-sm", color.bg)} />
                            <span className="text-[11px] text-stone-600">{diet.name}</span>
                          </span>
                        );
                      })}
                    </div>
                  )}
                </button>

                {isExpanded && (
                  <>
                {/* Seletor de dieta para pintar no calendário */}
                <div className="px-5 py-3 border-b border-stone-100 bg-stone-50">
                  <div className="flex items-center gap-2 mb-2">
                    <Paintbrush className="w-4 h-4 text-stone-500" />
                    <span className="text-xs font-semibold text-stone-600">Selecione uma dieta e clique nos dias do calendário para atribuí-la:</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {dietsForSpecies.map(diet => {
                      const color = dietColorMap.get(diet.id)!;
                      const isActive = activePaintDiet === diet.id;
                      const assignedCount = Object.values(calendarForSpecies).filter(id => id === diet.id).length;
                      return (
                        <button
                          key={diet.id}
                          type="button"
                          onClick={() => {
                            setActivePaintDiet(isActive ? null : diet.id);
                            setDayDetailDiet(null);
                          }}
                          className={cn(
                            "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border",
                            isActive
                              ? `${color.bg} text-white border-transparent ring-2 ring-offset-1 ring-stone-400 shadow-md`
                              : `${color.light} ${color.text} ${color.border} hover:shadow-sm`
                          )}
                        >
                          <span className={cn("w-3 h-3 rounded-sm", isActive ? "bg-white/40" : color.bg)} />
                          {diet.name}
                          {assignedCount > 0 && (
                            <span className={cn(
                              "ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold",
                              isActive ? "bg-white/30 text-white" : "bg-white text-stone-600"
                            )}>
                              {assignedCount}d
                            </span>
                          )}
                        </button>
                      );
                    })}
                    {activePaintDiet && (
                      <button
                        type="button"
                        onClick={() => setActivePaintDiet(null)}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-stone-500 border border-stone-200 hover:bg-stone-100 transition-colors"
                      >
                        <X className="w-3 h-3" /> Cancelar
                      </button>
                    )}
                  </div>
                  {activePaintDiet && (
                    <p className="text-[11px] text-emerald-700 mt-2 font-medium">
                      Modo pintura ativo — clique nos dias para atribuir/remover a dieta selecionada
                    </p>
                  )}
                </div>

                {/* Resumo da dieta do dia clicado */}
                {dayDetailDiet && dayDetailKey && (() => {
                  const keyParts = dayDetailKey.split("-");
                  const mStr = keyParts.length === 3 ? keyParts[1] : keyParts[0];
                  const dStr = keyParts.length === 3 ? keyParts[2] : keyParts[1];
                  const monthName = MONTH_NAMES_FULL[Number(mStr) - 1];
                  const dayNum = Number(dStr);
                  const color = dietColorMap.get(dayDetailDiet.id);
                  return (
                    <div className="px-5 py-3 border-b border-stone-100 bg-blue-50">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <CalendarDays className="w-4 h-4 text-blue-600" />
                          <span className="text-sm font-bold text-stone-800">{dayNum} de {monthName}</span>
                          {color && <span className={cn("w-3 h-3 rounded-sm", color.bg)} />}
                          <span className="text-sm font-medium text-blue-700">{dayDetailDiet.name}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => { setDayDetailDiet(null); setDayDetailKey(""); }}
                          className="p-1 text-stone-400 hover:text-stone-600 rounded transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <div className="bg-white rounded-lg p-2 border border-blue-100">
                          <span className="text-[10px] text-stone-400 uppercase">Total/ave</span>
                          <p className="text-sm font-bold text-stone-800">{dayDetailDiet.totalGrams.toFixed(1)}g</p>
                          <p className="text-[10px] text-stone-500">{dayDetailDiet.totalKcal.toFixed(1)} kcal</p>
                        </div>
                        {dayDetailDiet.items.racao.length > 0 && (
                          <div className="bg-white rounded-lg p-2 border border-amber-100">
                            <span className="text-[10px] text-amber-600 uppercase font-semibold">Ração</span>
                            {dayDetailDiet.items.racao.map(item => (
                              <p key={item.foodId} className="text-[11px] text-stone-700">{item.foodName}: {item.grams.toFixed(1)}g</p>
                            ))}
                          </div>
                        )}
                        {dayDetailDiet.items.vegetais.length > 0 && (
                          <div className="bg-white rounded-lg p-2 border border-green-100">
                            <span className="text-[10px] text-green-600 uppercase font-semibold">Vegetais</span>
                            {dayDetailDiet.items.vegetais.map(item => (
                              <p key={item.foodId} className="text-[11px] text-stone-700">{item.foodName}: {item.grams.toFixed(1)}g</p>
                            ))}
                          </div>
                        )}
                        {dayDetailDiet.items.frutas.length > 0 && (
                          <div className="bg-white rounded-lg p-2 border border-red-100">
                            <span className="text-[10px] text-red-600 uppercase font-semibold">Frutas</span>
                            {dayDetailDiet.items.frutas.map(item => (
                              <p key={item.foodId} className="text-[11px] text-stone-700">{item.foodName}: {item.grams.toFixed(1)}g</p>
                            ))}
                          </div>
                        )}
                        {dayDetailDiet.items.proteicos.length > 0 && (
                          <div className="bg-white rounded-lg p-2 border border-yellow-100">
                            <span className="text-[10px] text-yellow-700 uppercase font-semibold">Proteícos</span>
                            {dayDetailDiet.items.proteicos.map(item => (
                              <p key={item.foodId} className="text-[11px] text-stone-700">{item.foodName}: {item.grams.toFixed(1)}g</p>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-2">
                        <button
                          onClick={() => { setViewingDiet(dayDetailDiet); setDietMode("saved-detail"); }}
                          className="text-[11px] text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1"
                        >
                          <Eye className="w-3 h-3" /> Ver dieta completa
                        </button>
                        <button
                          onClick={() => loadDietForEditing(dayDetailDiet)}
                          className="text-[11px] text-amber-600 hover:text-amber-800 font-medium flex items-center gap-1"
                        >
                          <Edit3 className="w-3 h-3" /> Editar
                        </button>
                      </div>
                    </div>
                  );
                })()}

                {/* Seletor de ano + Grid de meses */}
                <div className="p-5">
                  <div className="flex items-center justify-center gap-3 mb-4">
                    <button
                      type="button"
                      onClick={() => setCalendarYear(y => y - 1)}
                      className="p-1.5 rounded-lg hover:bg-stone-100 transition-colors text-stone-500 hover:text-stone-700"
                    >
                      <ChevronRight className="w-4 h-4 rotate-180" />
                    </button>
                    <span className="text-sm font-bold text-stone-700 min-w-[60px] text-center">{calendarYear}</span>
                    <button
                      type="button"
                      onClick={() => setCalendarYear(y => y + 1)}
                      className="p-1.5 rounded-lg hover:bg-stone-100 transition-colors text-stone-500 hover:text-stone-700"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {Array.from({ length: 12 }, (_, monthIdx) => {
                      const month = monthIdx + 1;
                      const daysInMonth = new Date(calendarYear, month, 0).getDate();
                      const firstDayOffset = new Date(calendarYear, monthIdx, 1).getDay();

                      return (
                        <div key={month} className="border border-stone-200 rounded-lg overflow-hidden">
                          <div className="bg-stone-50 px-3 py-1.5 border-b border-stone-200">
                            <span className="text-xs font-bold text-stone-700">{MONTH_NAMES_FULL[monthIdx]}</span>
                          </div>
                          <div className="p-2">
                            {/* Dias da semana header */}
                            <div className="grid grid-cols-7 gap-px mb-1">
                              {["D", "S", "T", "Q", "Q", "S", "S"].map((d, i) => (
                                <div key={i} className="text-center text-[8px] font-semibold text-stone-400 py-0.5">{d}</div>
                              ))}
                            </div>
                            {/* Grid de dias */}
                            <div className="grid grid-cols-7 gap-px">
                              {Array.from({ length: firstDayOffset }, (_, i) => (
                                <div key={`e-${i}`} className="aspect-square" />
                              ))}
                              {Array.from({ length: daysInMonth }, (_, i) => {
                                const day = i + 1;
                                const dayKey = `${calendarYear}-${month}-${day}`;
                                const legacyKey = `${month}-${day}`;
                                const assignedDietId = calendarForSpecies[dayKey] || calendarForSpecies[legacyKey];
                                const assignedDiet = assignedDietId ? dietsForSpecies.find(d => d.id === assignedDietId) : null;
                                const assignedColor = assignedDiet ? dietColorMap.get(assignedDiet.id) : null;
                                const isToday = day === now.getDate() && monthIdx === now.getMonth() && calendarYear === now.getFullYear();
                                const feriadoKey = `${month}-${day}`;
                                const feriado = FERIADOS_REG[feriadoKey];
                                const isActivePaintTarget = activePaintDiet !== null;
                                const isViewingThisDay = dayDetailKey === dayKey && dayDetailDiet !== null;

                                return (
                                  <button
                                    key={day}
                                    type="button"
                                    onClick={() => {
                                      if (isActivePaintTarget && activePaintDiet) {
                                        // Modo pintura: atribuir ou remover dieta
                                        if (assignedDietId === activePaintDiet) {
                                          // Remover
                                          removeDayMut.mutate({ speciesId, dayKey });
                                        } else {
                                          // Atribuir
                                          assignDayMut.mutate({ speciesId, dayKey, dietId: activePaintDiet });
                                        }
                                      } else if (assignedDiet) {
                                        // Modo visualização: mostrar resumo da dieta
                                        if (isViewingThisDay) {
                                          setDayDetailDiet(null);
                                          setDayDetailKey("");
                                        } else {
                                          setDayDetailDiet(assignedDiet);
                                          setDayDetailKey(dayKey);
                                        }
                                      }
                                    }}
                                    title={(() => {
                                      const parts: string[] = [];
                                      if (feriado) parts.push(feriado);
                                      if (assignedDiet) parts.push(assignedDiet.name);
                                      return parts.length > 0 ? parts.join(" | ") : undefined;
                                    })()}
                                    className={cn(
                                      "aspect-square rounded-sm flex items-center justify-center text-[9px] font-medium relative transition-all",
                                      assignedColor
                                        ? `${assignedColor.light} ${assignedColor.text} hover:opacity-80`
                                        : "text-stone-400 hover:bg-stone-100",
                                      isToday && "ring-1 ring-emerald-500 font-bold",
                                      isActivePaintTarget && !assignedDietId && "hover:bg-emerald-50 cursor-crosshair",
                                      isActivePaintTarget && assignedDietId && "cursor-crosshair",
                                      isViewingThisDay && "ring-2 ring-blue-500",
                                      feriado && !assignedColor && "text-red-400"
                                    )}
                                  >
                                    {day}
                                    {feriado && (
                                      <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-red-500" />
                                    )}
                                  </button>
                                );
                              })}
                            </div>
                            {/* Rodé de feriados do mês */}
                            {(() => {
                              const feriadosDoMes: { day: number; name: string }[] = [];
                              for (let d = 1; d <= daysInMonth; d++) {
                                const fKey = `${month}-${d}`;
                                if (FERIADOS_REG[fKey]) feriadosDoMes.push({ day: d, name: FERIADOS_REG[fKey] });
                              }
                              return feriadosDoMes.length > 0 ? (
                                <div className="mt-1 pt-1 border-t border-stone-100">
                                  {feriadosDoMes.map(f => (
                                    <p key={f.day} className="text-[8px] text-red-400 leading-tight">
                                      <span className="font-semibold">{f.day}</span> — {f.name}
                                    </p>
                                  ))}
                                </div>
                              ) : null;
                            })()}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Legenda */}
                <div className="px-5 pb-3 flex flex-wrap items-center gap-3 text-[10px] text-stone-400">
                  {dietsForSpecies.map(diet => {
                    const color = dietColorMap.get(diet.id)!;
                    return (
                      <span key={diet.id} className="flex items-center gap-1">
                        <span className={cn("w-2.5 h-2.5 rounded-sm", color.bg)} />
                        {diet.name}
                      </span>
                    );
                  })}
                  <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-red-500 inline-block" /> Feriado</span>
                  <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm ring-1 ring-emerald-500 inline-block" /> Hoje</span>
                  <button
                    onClick={() => {
                      exportCalendarPdf({
                        year: calendarYear,
                        speciesName: speciesName,
                        speciesId: speciesId,
                        diets: dietsForSpecies,
                        calendar: calendarForSpecies,
                      });
                      toast.success("PDF do calendário exportado!");
                    }}
                    className="ml-auto flex items-center gap-1 px-2 py-1 text-[10px] font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded transition-colors"
                    title="Exportar calendário em PDF"
                  >
                    <FileDown className="w-3 h-3" /> Exportar PDF
                  </button>
                </div>

                {/* Lista de dietas com ações */}
                <div className="border-t border-stone-100">
                  {dietsForSpecies.map(diet => {
                    const color = dietColorMap.get(diet.id)!;
                    const assignedCount = Object.values(calendarForSpecies).filter(id => id === diet.id).length;
                    return (
                      <div key={diet.id} className="px-5 py-3 hover:bg-stone-50 transition-colors border-b border-stone-50 last:border-b-0">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <span className={cn("w-2.5 h-2.5 rounded-sm flex-shrink-0", color.bg)} />
                            <h4 className="font-medium text-stone-800 text-sm truncate">{diet.name}</h4>
                            {diet.birdCount > 1 && (
                              <span className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-blue-100 text-blue-700 flex items-center gap-0.5">
                                <Users className="w-3 h-3" />{diet.birdCount}
                              </span>
                            )}
                            <span className="text-[11px] text-stone-400">{diet.totalGrams.toFixed(1)}g/ave</span>
                            {assignedCount > 0 && (
                              <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-emerald-100 text-emerald-700">
                                {assignedCount} dia{assignedCount > 1 ? "s" : ""}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1 ml-3">
                            <button
                              onClick={() => { setViewingDiet(diet); setDietMode("saved-detail"); }}
                              className="p-1.5 text-stone-400 hover:text-emerald-600 hover:bg-emerald-50 rounded transition-colors"
                              title="Ver detalhes"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => loadDietForEditing(diet)}
                              className="p-1.5 text-stone-400 hover:text-amber-600 hover:bg-amber-50 rounded transition-colors"
                              title="Editar"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDuplicateDiet(diet)}
                              className="p-1.5 text-stone-400 hover:text-violet-600 hover:bg-violet-50 rounded transition-colors"
                              title="Duplicar"
                            >
                              <CopyPlus className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleExportDiet(diet)}
                              className="p-1.5 text-stone-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
                              title="Exportar"
                            >
                              <Download className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => { handleDeleteDiet(diet.id); }}
                              className="p-1.5 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                              title="Excluir"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                  </>
                )}
              </div>
            );
          });
        })()}

        {/* Botão de exportar todos os calendários em PDF */}
        {savedDiets.length > 0 && (
          <div className="flex justify-center">
            <button
              onClick={() => {
                exportAllCalendarsPdf(
                  calendarYear,
                  activeFlockSpecies.map(sp => ({ id: sp.id, commonName: sp.commonName })),
                  savedDiets,
                  speciesCalendars,
                );
                toast.success("PDF completo exportado com sucesso!");
              }}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg transition-colors"
            >
              <FileDown className="w-4 h-4" />
              Exportar Todos os Calendários em PDF ({calendarYear})
            </button>
          </div>
        )}

        {/* ===== FERRAMENTAS OPERACIONAIS ===== */}
        {savedDiets.length > 0 && (
          <OperationalTools
            savedDiets={savedDiets}
            speciesCalendars={speciesCalendars}
          />
        )}
        </>
      )}

      {/* ===== DIETAS SALVAS — LISTA ===== */}
      {dietMode === "saved-list" && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <div className="bg-white rounded-xl border border-stone-200 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-stone-100">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <button onClick={() => setDietMode("menu")} className="text-stone-400 hover:text-stone-600 transition-colors">
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                  <FolderOpen className="w-5 h-5 text-stone-600" />
                  <h2 className="font-bold text-stone-800">Dietas Salvas</h2>
                  <span className="text-xs text-stone-400">({savedDiets.length})</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {savedDiets.length > 3 && (
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                    <input
                      type="text" placeholder="Buscar dieta..."
                      value={savedDietsFilter} onChange={e => setSavedDietsFilter(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 text-sm border border-stone-200 rounded-md focus:outline-none focus:border-emerald-400"
                    />
                  </div>
                )}
                <div className="flex items-center gap-1.5">
                  <Filter className="w-3.5 h-3.5 text-stone-400" />
                  <select
                    value={phaseFilter}
                    onChange={e => setPhaseFilter(e.target.value)}
                    className="text-xs border border-stone-200 rounded-md px-2 py-2 bg-white text-stone-700 focus:outline-none focus:border-emerald-400"
                  >
                    <option value="all">Todas as fases</option>
                    {lifePeriods.map(p => (
                      <option key={p.id} value={p.id}>{p.label}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {savedDiets.length === 0 ? (
              <div className="p-8 text-center">
                <FolderOpen className="w-12 h-12 text-stone-300 mx-auto mb-3" />
                <p className="text-stone-500 font-medium">Nenhuma dieta salva ainda</p>
                <p className="text-xs text-stone-400 mt-1">Crie uma nova dieta e salve para vê-la aqui</p>
                <button
                  onClick={() => { handleResetAll(); setDietMode("creating"); }}
                  className="mt-4 px-4 py-2 bg-emerald-600 text-white text-sm rounded-lg hover:bg-emerald-700 transition-colors"
                >
                  Criar Nova Dieta
                </button>
              </div>
            ) : (
              <div className="divide-y divide-stone-100">
                {activeFlockSpecies.map(sp => {
                  const dietsForSp = savedDiets.filter(d => d.speciesId === sp.id);
                  const phaseFilteredDiets = phaseFilter === "all" ? dietsForSp : dietsForSp.filter(d => d.phaseId === phaseFilter);
                  const filteredDietsForSp = savedDietsFilter
                    ? phaseFilteredDiets.filter(d => d.name.toLowerCase().includes(savedDietsFilter.toLowerCase()) || d.speciesName.toLowerCase().includes(savedDietsFilter.toLowerCase()))
                    : phaseFilteredDiets;
                  const isExpanded = expandedRegistries.has(sp.id + "-saved");
                  const toggleExpand = () => {
                    setExpandedRegistries(prev => {
                      const next = new Set(prev);
                      const key = sp.id + "-saved";
                      if (next.has(key)) next.delete(key);
                      else next.add(key);
                      return next;
                    });
                  };
                  return (
                    <div key={sp.id}>
                      <button
                        type="button"
                        onClick={toggleExpand}
                        className="w-full px-5 py-3 bg-stone-50 hover:bg-stone-100 transition-colors text-left"
                      >
                        <div className="flex items-center gap-2">
                          <Bird className="w-3.5 h-3.5 text-emerald-600" />
                          <span className="text-xs font-bold text-stone-600 uppercase tracking-wider">{sp.commonName}</span>
                          <span className="text-[10px] text-stone-400">({dietsForSp.length} dieta{dietsForSp.length !== 1 ? "s" : ""})</span>
                          {sp.currentCount > 0 && (
                            <span className="text-[10px] text-stone-400 flex items-center gap-0.5">
                              <Users className="w-3 h-3" />{sp.currentCount}
                            </span>
                          )}
                          <span className="ml-auto">
                            {isExpanded
                              ? <ChevronDown className="w-4 h-4 text-stone-400" />
                              : <ChevronRight className="w-4 h-4 text-stone-400" />}
                          </span>
                        </div>
                      </button>
                      {isExpanded && (
                        <div>
                          {filteredDietsForSp.length === 0 ? (
                            <div className="px-5 py-4 text-center">
                              <p className="text-xs text-stone-400">Nenhuma dieta salva para {sp.commonName}</p>
                              <button
                                onClick={() => {
                                  handleResetAll();
                                  handleSelectSpecies(sp);
                                  setDietMode("creating");
                                }}
                                className="mt-2 text-xs text-emerald-600 hover:text-emerald-800 font-medium"
                              >
                                + Criar dieta
                              </button>
                            </div>
                          ) : (
                            filteredDietsForSp.map(diet => (
                              <div key={diet.id} className="px-5 py-3 hover:bg-stone-50 transition-colors border-b border-stone-50 last:border-b-0">
                                <div className="flex items-center justify-between">
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                      <h4 className="font-medium text-stone-800 text-sm truncate">{diet.name}</h4>
                                      {diet.birdCount > 1 && (
                                        <span className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-blue-100 text-blue-700 flex items-center gap-0.5">
                                          <Users className="w-3 h-3" />{diet.birdCount}
                                        </span>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-3 mt-1 text-[11px] text-stone-400">
                                      <span className="px-1.5 py-0.5 rounded bg-stone-100 text-stone-600 font-medium text-[10px]">
                                        {lifePeriods.find(p => p.id === diet.phaseId)?.label || diet.phaseId}
                                      </span>
                                      <span>{diet.totalGrams.toFixed(1)}g/ave</span>
                                      <span>{diet.totalKcal.toFixed(1)} kcal/ave</span>
                                      {(() => {
                                        const cal = speciesCalendars[diet.speciesId] || {};
                                        const assignedDays = Object.values(cal).filter(id => id === diet.id).length;
                                        return assignedDays > 0 ? (
                                          <span className="flex items-center gap-0.5 text-emerald-600">
                                            <CalendarDays className="w-3 h-3" />
                                            {assignedDays} dia{assignedDays > 1 ? "s" : ""}
                                          </span>
                                        ) : null;
                                      })()}
                                      <span>{formatDate(diet.updatedAt)}</span>
                                    </div>
                                    {diet.notes && (
                                      <p className="text-[11px] text-stone-400 mt-0.5 italic truncate">{diet.notes}</p>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-1 ml-3">
                                    <button
                                      onClick={() => { setViewingDiet(diet); setDietMode("saved-detail"); }}
                                      className="p-1.5 text-stone-400 hover:text-emerald-600 hover:bg-emerald-50 rounded transition-colors"
                                      title="Ver detalhes"
                                    >
                                      <Eye className="w-4 h-4" />
                                    </button>
                                    <button
                                      onClick={() => loadDietForEditing(diet)}
                                      className="p-1.5 text-stone-400 hover:text-amber-600 hover:bg-amber-50 rounded transition-colors"
                                      title="Editar"
                                    >
                                      <Edit3 className="w-4 h-4" />
                                    </button>
                                    <button
                                      onClick={() => handleDuplicateDiet(diet)}
                                      className="p-1.5 text-stone-400 hover:text-violet-600 hover:bg-violet-50 rounded transition-colors"
                                      title="Duplicar"
                                    >
                                      <CopyPlus className="w-4 h-4" />
                                    </button>
                                    <button
                                      onClick={() => handleCopyDiet(diet)}
                                      className="p-1.5 text-stone-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                      title="Copiar"
                                    >
                                      <Copy className="w-4 h-4" />
                                    </button>
                                    <button
                                      onClick={() => handleExportDiet(diet)}
                                      className="p-1.5 text-stone-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
                                      title="Exportar"
                                    >
                                      <Download className="w-4 h-4" />
                                    </button>
                                    <button
                                      onClick={() => handleDeleteDiet(diet.id)}
                                      className="p-1.5 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                      title="Excluir"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </div>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* ===== DIETA SALVA — DETALHE ===== */}
      {dietMode === "saved-detail" && viewingDiet && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <div className="bg-white rounded-xl border border-stone-200 shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <button onClick={() => setDietMode("saved-list")} className="text-stone-400 hover:text-stone-600 transition-colors">
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <h2 className="font-bold text-stone-800">{viewingDiet.name}</h2>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => loadDietForEditing(viewingDiet)} className="px-3 py-1.5 text-xs bg-amber-100 text-amber-700 rounded-lg hover:bg-amber-200 transition-colors flex items-center gap-1">
                  <Edit3 className="w-3 h-3" /> Editar
                </button>
                <button onClick={() => handleDuplicateDiet(viewingDiet)} className="px-3 py-1.5 text-xs bg-violet-100 text-violet-700 rounded-lg hover:bg-violet-200 transition-colors flex items-center gap-1">
                  <CopyPlus className="w-3 h-3" /> Duplicar
                </button>
                <button onClick={() => handleCopyDiet(viewingDiet)} className="px-3 py-1.5 text-xs bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors flex items-center gap-1">
                  <Copy className="w-3 h-3" /> Copiar
                </button>
                <button onClick={() => handleExportDiet(viewingDiet)} className="px-3 py-1.5 text-xs bg-indigo-100 text-indigo-700 rounded-lg hover:bg-indigo-200 transition-colors flex items-center gap-1">
                  <Download className="w-3 h-3" /> Exportar
                </button>
              </div>
            </div>

            {/* Info grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
              <div className="bg-stone-50 rounded-lg p-3">
                <span className="text-[10px] text-stone-500 font-medium">Espécie</span>
                <p className="text-sm font-semibold text-stone-800">{viewingDiet.speciesName}</p>
              </div>
              <div className="bg-stone-50 rounded-lg p-3">
                <span className="text-[10px] text-stone-500 font-medium">Fase</span>
                <p className="text-sm font-semibold text-stone-800">{lifePeriods.find(p => p.id === viewingDiet.phaseId)?.label || viewingDiet.phaseId}</p>
              </div>
              <div className="bg-stone-50 rounded-lg p-3">
                <span className="text-[10px] text-stone-500 font-medium">Ambiente</span>
                <p className="text-sm font-semibold text-stone-800">{enclosureTypes.find(e => e.id === viewingDiet.enclosureId)?.label || viewingDiet.enclosureId}</p>
              </div>
              <div className="bg-stone-50 rounded-lg p-3">
                <span className="text-[10px] text-stone-500 font-medium">Peso</span>
                <p className="text-sm font-semibold text-stone-800">{viewingDiet.weight}g</p>
              </div>
              <div className="bg-stone-50 rounded-lg p-3">
                <span className="text-[10px] text-stone-500 font-medium">Aves</span>
                <p className="text-sm font-semibold text-stone-800">{viewingDiet.birdCount}</p>
              </div>
              <div className="bg-stone-50 rounded-lg p-3">
                <span className="text-[10px] text-stone-500 font-medium">MER</span>
                <p className="text-sm font-semibold text-emerald-700">{viewingDiet.mer.toFixed(1)} kcal/dia</p>
              </div>
            </div>

            {/* Observações */}
            {viewingDiet.notes && (
              <div className="mb-4 bg-amber-50 rounded-lg border border-amber-200 p-3">
                <span className="text-[10px] text-amber-700 font-semibold uppercase tracking-wider">Observações</span>
                <p className="text-sm text-stone-700 mt-1">{viewingDiet.notes}</p>
              </div>
            )}

            {/* Dias atribuídos no calendário */}
            {(() => {
              const cal = speciesCalendars[viewingDiet.speciesId] || {};
              const assignedDayKeys = Object.entries(cal)
                .filter(([, id]) => id === viewingDiet.id)
                .map(([key]) => key);
              if (assignedDayKeys.length === 0) return null;
              const MONTH_NAMES_VIEW = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
              // Agrupar por mês
              const byMonth: Record<number, number[]> = {};
              assignedDayKeys.forEach(key => {
                const [m, d] = key.split("-").map(Number);
                if (!byMonth[m]) byMonth[m] = [];
                byMonth[m].push(d);
              });
              const months = Object.keys(byMonth).map(Number).sort((a, b) => a - b);
              return (
                <div className="mb-4">
                  <div className="bg-emerald-50 rounded-lg border border-emerald-200 p-3">
                    <div className="flex items-center gap-1.5 mb-2">
                      <CalendarDays className="w-3.5 h-3.5 text-emerald-700" />
                      <span className="text-xs font-medium text-emerald-800">
                        Dias programados ({assignedDayKeys.length} dia{assignedDayKeys.length > 1 ? "s" : ""})
                      </span>
                    </div>
                    <div className="space-y-2">
                      {months.map(m => {
                        const days = byMonth[m].sort((a, b) => a - b);
                        const daysInMonth = new Date(2026, m, 0).getDate();
                        return (
                          <div key={m} className="bg-white/80 rounded-lg p-2 border border-emerald-100">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-[11px] font-bold text-emerald-800">{MONTH_NAMES_VIEW[m - 1]}</span>
                              <span className="text-[10px] text-emerald-500">
                                {days.length === daysInMonth ? "todos os dias" : `${days.length} dia${days.length > 1 ? "s" : ""}`}
                              </span>
                            </div>
                            <div className="flex flex-wrap gap-0.5">
                              {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
                                const isActive = days.includes(day);
                                return (
                                  <span
                                    key={day}
                                    className={cn(
                                      "w-6 h-6 rounded text-[9px] font-medium flex items-center justify-center",
                                      isActive
                                        ? "bg-emerald-600 text-white"
                                        : "bg-stone-100 text-stone-300"
                                    )}
                                  >
                                    {day}
                                  </span>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Per bird */}
            <div className="mb-4">
              <p className="text-[11px] font-semibold text-stone-500 uppercase tracking-wider mb-2">Por ave (diário)</p>
              <div className="space-y-1">
                {viewingDiet.items.racao.map(item => (
                  <div key={item.foodId} className="flex items-center justify-between px-3 py-1.5 bg-amber-50 rounded text-sm">
                    <span className="text-stone-700">{item.foodName}</span>
                    <span className="font-semibold text-amber-700">{item.grams.toFixed(1)}g</span>
                  </div>
                ))}
                {viewingDiet.items.vegetais.map(item => (
                  <div key={item.foodId} className="flex items-center justify-between px-3 py-1.5 bg-green-50 rounded text-sm">
                    <span className="text-stone-700">{item.foodName}</span>
                    <span className="font-semibold text-green-700">{item.grams.toFixed(1)}g</span>
                  </div>
                ))}
                {viewingDiet.items.frutas.map(item => (
                  <div key={item.foodId} className="flex items-center justify-between px-3 py-1.5 bg-red-50 rounded text-sm">
                    <span className="text-stone-700">{item.foodName}</span>
                    <span className="font-semibold text-red-600">{item.grams.toFixed(1)}g</span>
                  </div>
                ))}
                {viewingDiet.items.proteicos.map(item => (
                  <div key={item.foodId} className="flex items-center justify-between px-3 py-1.5 bg-yellow-50 rounded text-sm">
                    <span className="text-stone-700">{item.foodName}</span>
                    <span className="font-semibold text-yellow-700">{item.grams.toFixed(1)}g</span>
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-between px-4 py-3 bg-emerald-50 rounded-lg border border-emerald-200 mt-2">
                <span className="text-sm font-bold text-emerald-800">Total por ave</span>
                <div className="text-right">
                  <span className="text-lg font-bold text-emerald-800">{viewingDiet.totalGrams.toFixed(1)}g</span>
                  <span className="text-xs text-emerald-600 ml-2">{viewingDiet.totalKcal.toFixed(1)} kcal</span>
                </div>
              </div>
            </div>

            {/* Total for all birds */}
            {viewingDiet.birdCount > 1 && (
              <div>
                <p className="text-[11px] font-semibold text-stone-500 uppercase tracking-wider mb-2">
                  Total para {viewingDiet.birdCount} aves (diário)
                </p>
                <div className="space-y-1">
                  {viewingDiet.items.racao.map(item => (
                    <div key={item.foodId} className="flex items-center justify-between px-3 py-1.5 bg-amber-50/60 rounded text-sm">
                      <span className="text-stone-700">{item.foodName}</span>
                      <span className="font-semibold text-amber-700">{(item.grams * viewingDiet.birdCount).toFixed(1)}g</span>
                    </div>
                  ))}
                  {viewingDiet.items.vegetais.map(item => (
                    <div key={item.foodId} className="flex items-center justify-between px-3 py-1.5 bg-green-50/60 rounded text-sm">
                      <span className="text-stone-700">{item.foodName}</span>
                      <span className="font-semibold text-green-700">{(item.grams * viewingDiet.birdCount).toFixed(1)}g</span>
                    </div>
                  ))}
                  {viewingDiet.items.frutas.map(item => (
                    <div key={item.foodId} className="flex items-center justify-between px-3 py-1.5 bg-red-50/60 rounded text-sm">
                      <span className="text-stone-700">{item.foodName}</span>
                      <span className="font-semibold text-red-600">{(item.grams * viewingDiet.birdCount).toFixed(1)}g</span>
                    </div>
                  ))}
                  {viewingDiet.items.proteicos.map(item => (
                    <div key={item.foodId} className="flex items-center justify-between px-3 py-1.5 bg-yellow-50/60 rounded text-sm">
                      <span className="text-stone-700">{item.foodName}</span>
                      <span className="font-semibold text-yellow-700">{(item.grams * viewingDiet.birdCount).toFixed(1)}g</span>
                    </div>
                  ))}
                </div>
                <div className="flex items-center justify-between px-4 py-3 bg-blue-50 rounded-lg border border-blue-200 mt-2">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-blue-600" />
                    <span className="text-sm font-bold text-blue-800">Total para {viewingDiet.birdCount} aves</span>
                  </div>
                  <div className="text-right">
                    <span className="text-lg font-bold text-blue-800">{(viewingDiet.totalGrams * viewingDiet.birdCount).toFixed(1)}g</span>
                    <span className="text-xs text-blue-600 ml-2">{(viewingDiet.totalKcal * viewingDiet.birdCount).toFixed(1)} kcal</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* Main Card — só aparece quando criando/editando */}
      {/* Botão de retorno ao menu */}
      {(dietMode === "creating" || dietMode === "editing") && (
        <div className="flex items-center gap-3 mb-3">
          <button
            onClick={() => { handleResetAll(); setDietMode("menu"); }}
            className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-stone-600 hover:text-stone-800 bg-white hover:bg-stone-50 rounded-xl border border-stone-200 shadow-sm transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar ao Menu
          </button>
          <div className="flex-1" />
          {dietMode === "editing" && (
            <span className="px-3 py-1 text-xs font-bold rounded-full bg-amber-100 text-amber-700">Editando dieta</span>
          )}
          {selectedSpeciesId && (
            <button onClick={handleResetAll} className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-stone-500 hover:text-red-600 bg-white hover:bg-red-50 rounded-lg border border-stone-200 transition-colors">
              <RefreshCw className="w-3.5 h-3.5" /> Recomeçar
            </button>
          )}
        </div>
      )}

      {(dietMode === "creating" || dietMode === "editing") && (
      <div className="bg-white rounded-xl border border-stone-200 shadow-sm">

        {/* ===== STEP 1: ESPÉCIE ===== */}
        <div className="p-5 border-b border-stone-100">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center">
                <Bird className="w-4 h-4 text-emerald-700" />
              </div>
              <div>
                <h3 className="font-semibold text-stone-800 text-sm">1. Espécie</h3>
                <p className="text-[11px] text-stone-500">Selecione para iniciar o cálculo da dieta</p>
              </div>
            </div>
          </div>

          {/* Species Selector */}
          <div className="relative">
            <button
              onClick={() => setShowSpeciesDropdown(!showSpeciesDropdown)}
              className="w-full flex items-center justify-between px-4 py-3 rounded-lg border border-stone-200 hover:border-emerald-300 transition-colors bg-stone-50"
            >
              {selectedSpecies ? (
                <div className="flex items-center gap-3">
                  {birdData?.image && <img src={birdData.image} alt="" className="w-8 h-8 rounded-full object-cover object-top" />}
                  <div className="text-left">
                    <span className="font-medium text-stone-800">{selectedSpecies.commonName}</span>
                    <span className="text-xs text-stone-500 ml-2 italic">{selectedSpecies.scientificName}</span>
                    {selectedSpecies.currentCount > 0 && (
                      <span className="ml-2 px-1.5 py-0.5 text-[10px] font-bold rounded bg-blue-100 text-blue-700">
                        {selectedSpecies.currentCount} no plantel
                      </span>
                    )}
                  </div>
                </div>
              ) : (
                <span className="text-stone-400">Selecione a espécie...</span>
              )}
              <ChevronDown className={cn("w-4 h-4 text-stone-400 transition-transform", showSpeciesDropdown && "rotate-180")} />
            </button>

            <AnimatePresence>
              {showSpeciesDropdown && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                  className="absolute z-50 top-full left-0 right-0 mt-1 bg-white rounded-lg border border-stone-200 shadow-lg max-h-80 overflow-hidden"
                >
                  <div className="p-2 border-b border-stone-100">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                      <input
                        type="text" placeholder="Buscar espécie..."
                        value={speciesSearch} onChange={e => setSpeciesSearch(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 text-sm border border-stone-200 rounded-md focus:outline-none focus:border-emerald-400"
                        autoFocus
                      />
                    </div>
                  </div>
                  <div className="overflow-y-auto max-h-60">
                    {Object.entries(groupedSpecies).map(([group, spp]) => (
                      <div key={group}>
                        <div className="px-3 py-1.5 text-[10px] font-bold text-stone-400 uppercase tracking-wider bg-stone-50">{group}</div>
                        {spp.map(sp => (
                          <button
                            key={sp.id}
                            onClick={() => handleSelectSpecies(sp)}
                            className="w-full px-3 py-2 text-left hover:bg-emerald-50 flex items-center gap-2 transition-colors"
                          >
                            <span className="text-sm font-medium text-stone-700">{sp.commonName}</span>
                            <span className="text-xs text-stone-400 italic">{sp.scientificName}</span>
                            {sp.currentCount > 0 && (
                              <span className="ml-auto text-[10px] text-blue-600 font-medium">{sp.currentCount} aves</span>
                            )}
                          </button>
                        ))}
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Bird Info Card */}
          {birdData && selectedSpecies && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-4">
              <div className="bg-stone-50 rounded-lg p-4 border border-stone-200">
                <div className="flex items-start gap-4">
                  {birdData.image && <img src={birdData.image} alt="" className="w-16 h-16 rounded-lg object-cover object-top flex-shrink-0" />}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-bold text-stone-800">{birdData.petbird_name}</h4>
                      <span className="text-xs italic text-stone-500">{birdData.petbird_sci}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-100 text-emerald-800">{birdData.strategyName}</span>
                      <span className="text-xs text-stone-500">{birdData.size_cm}cm / {birdData.weight}g</span>
                      <span className="text-xs text-stone-500">Metabolismo: {birdData.metabolism}</span>
                    </div>
                    {selectedSpecies.notes && (
                      <p className="text-[11px] text-stone-500 mt-1 italic">{selectedSpecies.notes}</p>
                    )}
                  </div>
                </div>

                {/* Weight + MER + Bird Count */}
                <div className="mt-3 pt-3 border-t border-stone-200 grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="text-[10px] text-stone-500 font-medium">Peso (g)</label>
                    <input
                      type="number"
                      value={customWeight ?? birdData.weight}
                      onChange={e => setCustomWeight(parseFloat(e.target.value) || null)}
                      className="w-full mt-0.5 px-2 py-1.5 text-sm font-semibold text-stone-800 border border-stone-200 rounded-md focus:outline-none focus:border-emerald-400 bg-white"
                    />
                    <span className="text-[10px] text-stone-400">DietBirdPet: {birdData.weight}g</span>
                  </div>
                  <div className="flex flex-col justify-center">
                    <label className="text-[10px] text-stone-500 font-medium">MER</label>
                    <span className="text-lg font-bold text-emerald-700">{mer.toFixed(1)}</span>
                    <span className="text-[10px] text-stone-400">kcal/dia por ave</span>
                  </div>
                  <div>
                    <label className="text-[10px] text-stone-500 font-medium flex items-center gap-1">
                      <Users className="w-3 h-3" /> Quantidade de aves
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={birdCount}
                      onChange={e => setBirdCount(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-full mt-0.5 px-2 py-1.5 text-sm font-semibold text-stone-800 border border-stone-200 rounded-md focus:outline-none focus:border-blue-400 bg-white"
                    />
                    <span className="text-[10px] text-stone-400">
                      {selectedSpecies.currentCount > 0 ? `Plantel: ${selectedSpecies.currentCount}` : "Para cálculo em lote"}
                    </span>
                  </div>
                  <div className="flex flex-col justify-center">
                    <label className="text-[10px] text-stone-500 font-medium">Referência</label>
                    <span className="text-[10px] text-stone-500 leading-tight">Dados do DietBirdPet. Valores editáveis manualmente.</span>
                  </div>
                </div>

                {/* Phase & Enclosure */}
                <div className="mt-3 pt-3 border-t border-stone-200 space-y-2">
                  {/* Phase */}
                  <button
                    onClick={() => setPhaseExpanded(!phaseExpanded)}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-lg border border-stone-200 hover:border-emerald-300 transition-colors bg-white"
                  >
                    <div className="flex items-center gap-2">
                      <Egg className="w-4 h-4 text-stone-500" />
                      <span className="text-sm text-stone-700">Fase</span>
                      <span className="text-xs font-semibold text-emerald-700">{phase.label}</span>
                      <span className="text-[10px] text-stone-400">x{phase.multiplier}</span>
                    </div>
                    <ChevronDown className={cn("w-4 h-4 text-stone-400 transition-transform", phaseExpanded && "rotate-180")} />
                  </button>
                  <AnimatePresence>
                    {phaseExpanded && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                        <div className="space-y-1 pl-2">
                          {lifePeriods.map(p => (
                            <button
                              key={p.id}
                              onClick={() => { setPhaseId(p.id); setPhaseExpanded(false); }}
                              className={cn("w-full text-left px-3 py-2 rounded-lg border transition-colors", phaseId === p.id ? "border-emerald-400 bg-emerald-50" : "border-stone-100 hover:bg-stone-50")}
                            >
                              <div className="flex items-center justify-between">
                                <span className="text-sm font-medium text-stone-700">{p.label}</span>
                                <span className="text-[10px] text-stone-500">x{p.multiplier}</span>
                              </div>
                              <p className="text-[11px] text-stone-500 mt-0.5 leading-tight">{p.description}</p>
                            </button>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Enclosure */}
                  <button
                    onClick={() => setEnclosureExpanded(!enclosureExpanded)}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-lg border border-stone-200 hover:border-emerald-300 transition-colors bg-white"
                  >
                    <div className="flex items-center gap-2">
                      <Home className="w-4 h-4 text-stone-500" />
                      <span className="text-sm text-stone-700">Viveiro</span>
                      <span className="text-xs font-semibold text-emerald-700">{enclosure.label}</span>
                      <span className="text-[10px] text-stone-400">x{enclosure.multiplier}</span>
                    </div>
                    <ChevronDown className={cn("w-4 h-4 text-stone-400 transition-transform", enclosureExpanded && "rotate-180")} />
                  </button>
                  <AnimatePresence>
                    {enclosureExpanded && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                        <div className="space-y-1 pl-2">
                          {enclosureTypes.map(e => (
                            <button
                              key={e.id}
                              onClick={() => { setEnclosureId(e.id); setEnclosureExpanded(false); }}
                              className={cn("w-full text-left px-3 py-2 rounded-lg border transition-colors", enclosureId === e.id ? "border-emerald-400 bg-emerald-50" : "border-stone-100 hover:bg-stone-50")}
                            >
                              <div className="flex items-center justify-between">
                                <span className="text-sm font-medium text-stone-700">{e.label}</span>
                                <span className="text-[10px] text-stone-500">x{e.multiplier}</span>
                              </div>
                              <p className="text-[11px] text-stone-500 mt-0.5 leading-tight">{e.description}</p>
                            </button>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </motion.div>
          )}
        </div>

        {/* ===== DUAL BARS: IDEAL vs NOSSA DIETA ===== */}
        {idealDiet && nossaDieta && (
          <div className="px-5 py-4 border-b border-stone-100 space-y-4">
            {/* BARRA IDEAL (travada) */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <Star className="w-4 h-4 text-stone-400" />
                  <span className="text-xs font-semibold text-stone-600 uppercase tracking-wider">Composição Ideal</span>
                </div>
                <span className="text-xs text-stone-500 font-medium">{idealDiet.totalKcal.toFixed(1)} kcal | {idealDiet.totalGrams.toFixed(1)}g</span>
              </div>
              <div className="flex h-8 rounded-lg overflow-hidden border border-stone-200">
                <div className="bg-amber-500 flex items-center justify-center relative group" style={{ width: `${idealDiet.racao.pctKcal}%` }}>
                  <span className="text-[9px] font-bold text-white leading-none">
                    {idealDiet.racao.pctKcal}%
                  </span>
                </div>
                <div className="bg-green-500 flex items-center justify-center" style={{ width: `${idealDiet.vegetais.pctKcal}%` }}>
                  <span className="text-[9px] font-bold text-white leading-none">
                    {idealDiet.vegetais.pctKcal}%
                  </span>
                </div>
                <div className="bg-red-400 flex items-center justify-center" style={{ width: `${idealDiet.frutas.pctKcal}%` }}>
                  <span className="text-[9px] font-bold text-white leading-none">
                    {idealDiet.frutas.pctKcal}%
                  </span>
                </div>
                <div className="bg-yellow-500 flex items-center justify-center" style={{ width: `${idealDiet.proteicos.pctKcal}%` }}>
                  <span className="text-[9px] font-bold text-white leading-none">
                    {idealDiet.proteicos.pctKcal}%
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-4 mt-1.5 text-[10px] text-stone-500 flex-wrap">
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-amber-500" />Ração {idealDiet.racao.pctKcal}% ({idealDiet.racao.grams.toFixed(1)}g)</span>
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-green-500" />Vegetais {idealDiet.vegetais.pctKcal}% ({idealDiet.vegetais.grams.toFixed(1)}g)</span>
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-red-400" />Frutas {idealDiet.frutas.pctKcal}% ({idealDiet.frutas.grams.toFixed(1)}g)</span>
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-yellow-500" />Proteico {idealDiet.proteicos.pctKcal}% ({idealDiet.proteicos.grams.toFixed(1)}g)</span>
              </div>
            </div>

            {/* BARRA NOSSA DIETA (dinâmica) */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-emerald-600" />
                  <span className="text-xs font-semibold text-emerald-700 uppercase tracking-wider">Nossa Dieta</span>
                </div>
                <span className="text-xs text-emerald-600 font-medium">{nossaDieta.total.kcal.toFixed(1)} kcal | {nossaDieta.total.grams.toFixed(1)}g</span>
              </div>
              <div className="flex h-8 rounded-lg overflow-hidden border border-emerald-300 bg-stone-100">
                {nossaDieta.racao.pctKcal > 0 && (
                  <motion.div
                    layout
                    className="bg-amber-500 flex items-center justify-center"
                    style={{ width: `${nossaDieta.racao.pctKcal}%` }}
                  >
                    <span className="text-[9px] font-bold text-white leading-none truncate px-1">
                      {nossaDieta.racao.pctKcal.toFixed(0)}%
                    </span>
                  </motion.div>
                )}
                {nossaDieta.vegetais.pctKcal > 0 && (
                  <motion.div
                    layout
                    className="bg-green-500 flex items-center justify-center"
                    style={{ width: `${nossaDieta.vegetais.pctKcal}%` }}
                  >
                    <span className="text-[9px] font-bold text-white leading-none truncate px-1">
                      {nossaDieta.vegetais.pctKcal.toFixed(0)}%
                    </span>
                  </motion.div>
                )}
                {nossaDieta.frutas.pctKcal > 0 && (
                  <motion.div
                    layout
                    className="bg-red-400 flex items-center justify-center"
                    style={{ width: `${nossaDieta.frutas.pctKcal}%` }}
                  >
                    <span className="text-[9px] font-bold text-white leading-none truncate px-1">
                      {nossaDieta.frutas.pctKcal.toFixed(0)}%
                    </span>
                  </motion.div>
                )}
                {nossaDieta.proteicos.pctKcal > 0 && (
                  <motion.div
                    layout
                    className="bg-yellow-500 flex items-center justify-center"
                    style={{ width: `${nossaDieta.proteicos.pctKcal}%` }}
                  >
                    <span className="text-[9px] font-bold text-white leading-none truncate px-1">
                      {nossaDieta.proteicos.pctKcal.toFixed(0)}%
                    </span>
                  </motion.div>
                )}
              </div>
              {/* Legend with grams */}
              <div className="flex items-center gap-4 mt-1.5 text-[10px] text-stone-500 flex-wrap">
                {nossaDieta.racao.pctKcal > 0 && (
                  <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-amber-500" />Ração {nossaDieta.racao.pctKcal.toFixed(0)}% ({nossaDieta.racao.grams.toFixed(1)}g)</span>
                )}
                {nossaDieta.vegetais.pctKcal > 0 && (
                  <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-green-500" />Vegetais {nossaDieta.vegetais.pctKcal.toFixed(0)}% ({nossaDieta.vegetais.grams.toFixed(1)}g)</span>
                )}
                {nossaDieta.frutas.pctKcal > 0 && (
                  <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-red-400" />Frutas {nossaDieta.frutas.pctKcal.toFixed(0)}% ({nossaDieta.frutas.grams.toFixed(1)}g)</span>
                )}
                {nossaDieta.proteicos.pctKcal > 0 && (
                  <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-yellow-500" />Proteico {nossaDieta.proteicos.pctKcal.toFixed(0)}% ({nossaDieta.proteicos.grams.toFixed(1)}g)</span>
                )}
              </div>
              {/* Comment */}
              <p className="text-[11px] text-stone-600 mt-1.5 leading-relaxed italic">
                {nossaDieta.comment}
              </p>
            </div>
          </div>
        )}

      </div>
      )}

      {/* ===== FOOD SELECTION STEPS — CARDS SEPARADOS ===== */}
      {(dietMode === "creating" || dietMode === "editing") && (
        <div className="space-y-3">
          {/* STEP 2: RAÇÃO */}
          <div className="bg-white rounded-xl border border-amber-200 shadow-sm overflow-hidden border-l-4 border-l-amber-500">
            <FoodStepCard
              step="racao" stepNumber={2}
              unlocked={unlockedSteps.has("racao")}
              expanded={expandedStep === "racao"}
              onToggle={() => setExpandedStep(expandedStep === "racao" ? null : "racao")}
              foods={sortFoods(filteredRacoes)}
              search={racaoSearch} onSearchChange={setRacaoSearch}
              selectedSingle={selectedRacao}
              onSelectSingle={(food) => { setSelectedRacao(food); setExpandedStep("vegetais"); }}
              nossaDieta={nossaDieta}
              idealDiet={idealDiet}
              groupKey="ap"
            />
          </div>

          {/* STEP 3: VEGETAIS */}
          <div className={cn("bg-white rounded-xl border shadow-sm overflow-hidden border-l-4", unlockedSteps.has("vegetais") ? "border-green-200 border-l-green-500" : "border-stone-200 border-l-green-300")}>
            <FoodStepCard
              step="vegetais" stepNumber={3}
              unlocked={unlockedSteps.has("vegetais")}
              expanded={expandedStep === "vegetais"}
              onToggle={() => setExpandedStep(expandedStep === "vegetais" ? null : "vegetais")}
              foods={sortFoods(vegetais)}
              search={vegetaisSearch} onSearchChange={setVegetaisSearch}
              selectedMultiple={selectedVegetais}
              onToggleMultiple={(food) => toggleFood(setSelectedVegetais, food)}
              nossaDieta={nossaDieta}
              idealDiet={idealDiet}
              groupKey="vegetais"
              nextStepLabel="Frutas"
              onAdvance={() => setExpandedStep("frutas")}
            />
          </div>

          {/* STEP 4: FRUTAS */}
          <div className={cn("bg-white rounded-xl border shadow-sm overflow-hidden border-l-4", unlockedSteps.has("frutas") ? "border-red-200 border-l-red-400" : "border-stone-200 border-l-red-300")}>
            <FoodStepCard
              step="frutas" stepNumber={4}
              unlocked={unlockedSteps.has("frutas")}
              expanded={expandedStep === "frutas"}
              onToggle={() => setExpandedStep(expandedStep === "frutas" ? null : "frutas")}
              foods={sortFoods(frutas)}
              search={frutasSearch} onSearchChange={setFrutasSearch}
              selectedMultiple={selectedFrutas}
              onToggleMultiple={(food) => toggleFood(setSelectedFrutas, food)}
              nossaDieta={nossaDieta}
              idealDiet={idealDiet}
              groupKey="frutas"
              nextStepLabel="Proteicos"
              onAdvance={() => setExpandedStep("proteicos")}
            />
          </div>

          {/* STEP 5: PROTEICOS */}
          <div className={cn("bg-white rounded-xl border shadow-sm overflow-hidden border-l-4", unlockedSteps.has("proteicos") ? "border-yellow-200 border-l-yellow-500" : "border-stone-200 border-l-yellow-300")}>
            <FoodStepCard
              step="proteicos" stepNumber={5}
              unlocked={unlockedSteps.has("proteicos")}
              expanded={expandedStep === "proteicos"}
              onToggle={() => setExpandedStep(expandedStep === "proteicos" ? null : "proteicos")}
              foods={sortFoods(proteicos)}
              search={proteicosSearch} onSearchChange={setProteicosSearch}
              selectedMultiple={selectedProteicos}
              onToggleMultiple={(food) => toggleFood(setSelectedProteicos, food)}
              nossaDieta={nossaDieta}
              idealDiet={idealDiet}
              groupKey="proteico"
            />
          </div>
        </div>
      )}



      {/* ===== RESUMO FINAL ===== */}
      {nossaDieta && (dietMode === "creating" || dietMode === "editing") && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="bg-white rounded-xl border border-stone-200 shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-emerald-700" />
                <h3 className="font-bold text-stone-800">Resumo da Dieta</h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowSaveDialog(true)}
                  className="px-3 py-1.5 bg-emerald-600 text-white text-xs font-medium rounded-lg hover:bg-emerald-700 transition-colors flex items-center gap-1"
                >
                  <Save className="w-3.5 h-3.5" />
                  {editingDietId ? "Atualizar" : "Salvar"} Dieta
                </button>
              </div>
            </div>

            {/* Save Dialog — Espécie → Fase → Ambiente → Observações */}
            <AnimatePresence>
              {showSaveDialog && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden mb-4"
                >
                  <div className="bg-emerald-50 rounded-lg border border-emerald-200 p-4 space-y-3">
                    {/* Nome da dieta (prefixo automático + complemento) */}
                    <div>
                      <label className="text-[10px] font-semibold text-emerald-800 uppercase tracking-wider block mb-1">Nome da dieta</label>
                      <div className="flex items-center gap-0 rounded-md border border-emerald-300 bg-white overflow-hidden">
                        <span className="px-3 py-2 text-sm font-medium text-stone-600 bg-stone-100 border-r border-emerald-200 whitespace-nowrap flex-shrink-0">
                          {selectedSpecies?.commonName || "Espécie"} — {lifePeriods.find(p => p.id === phaseId)?.label || phaseId} — {enclosureTypes.find(e => e.id === enclosureId)?.label || enclosureId} — {selectedRacao?.name || "Ração"}
                        </span>
                        <input
                          type="text"
                          value={dietName}
                          onChange={e => setDietName(e.target.value)}
                          placeholder="complemento (opcional)"
                          className="flex-1 px-3 py-2 text-sm focus:outline-none bg-transparent min-w-0"
                          autoFocus
                        />
                      </div>
                      <p className="text-[10px] text-stone-400 mt-1">O nome será salvo como: <span className="font-medium text-stone-600">{selectedSpecies?.commonName} — {lifePeriods.find(p => p.id === phaseId)?.label} — {enclosureTypes.find(e => e.id === enclosureId)?.label} — {selectedRacao?.name || "Ração"}{dietName.trim() ? ` — ${dietName.trim()}` : ""}</span></p>
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      <button
                        onClick={handleSaveDiet}
                        className="px-4 py-2 bg-emerald-600 text-white text-xs font-medium rounded-lg hover:bg-emerald-700 transition-colors flex items-center gap-1"
                      >
                        <Save className="w-3.5 h-3.5" />
                        {editingDietId ? "Atualizar" : "Salvar"}
                      </button>
                      <button
                        onClick={() => setShowSaveDialog(false)}
                        className="px-4 py-2 text-stone-600 text-xs font-medium rounded-lg hover:bg-stone-100 transition-colors"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Summary cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
              <SummaryCard label="Ração" grams={nossaDieta.racao.grams} kcal={nossaDieta.racao.kcal} pctKcal={nossaDieta.racao.pctKcal} color="bg-amber-50 border-amber-200" textColor="text-amber-700" count={selectedRacao ? 1 : 0} idealPctKcal={idealDiet?.racao.pctKcal} />
              <SummaryCard label="Vegetais" grams={nossaDieta.vegetais.grams} kcal={nossaDieta.vegetais.kcal} pctKcal={nossaDieta.vegetais.pctKcal} color="bg-green-50 border-green-200" textColor="text-green-700" count={selectedVegetais.length} idealPctKcal={idealDiet?.vegetais.pctKcal} />
              <SummaryCard label="Frutas" grams={nossaDieta.frutas.grams} kcal={nossaDieta.frutas.kcal} pctKcal={nossaDieta.frutas.pctKcal} color="bg-red-50 border-red-200" textColor="text-red-600" count={selectedFrutas.length} idealPctKcal={idealDiet?.frutas.pctKcal} />
              <SummaryCard label="Proteicos" grams={nossaDieta.proteicos.grams} kcal={nossaDieta.proteicos.kcal} pctKcal={nossaDieta.proteicos.pctKcal} color="bg-yellow-50 border-yellow-200" textColor="text-yellow-700" count={selectedProteicos.length} idealPctKcal={idealDiet?.proteicos.pctKcal} />
            </div>

            {/* Total per bird */}
            <div className="flex items-center justify-between px-4 py-3 bg-emerald-50 rounded-lg border border-emerald-200">
              <div>
                <span className="text-sm font-bold text-emerald-800">Total por Ave</span>
                <span className="text-xs text-emerald-600 ml-2">
                  ({(selectedRacao ? 1 : 0) + selectedVegetais.length + selectedFrutas.length + selectedProteicos.length} alimentos)
                </span>
              </div>
              <div className="text-right">
                <span className="text-lg font-bold text-emerald-800">{nossaDieta.total.grams.toFixed(1)}g</span>
                <span className="text-xs text-emerald-600 ml-2">{nossaDieta.total.kcal.toFixed(1)} kcal</span>
              </div>
            </div>

            {/* Total for all birds */}
            {birdCount > 1 && (
              <div className="flex items-center justify-between px-4 py-3 bg-blue-50 rounded-lg border border-blue-200 mt-2">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-blue-600" />
                  <span className="text-sm font-bold text-blue-800">Total para {birdCount} aves</span>
                </div>
                <div className="text-right">
                  <span className="text-lg font-bold text-blue-800">{(nossaDieta.total.grams * birdCount).toFixed(1)}g</span>
                  <span className="text-xs text-blue-600 ml-2">{(nossaDieta.total.kcal * birdCount).toFixed(1)} kcal</span>
                </div>
              </div>
            )}

            {/* Detailed list */}
            <div className="mt-4 space-y-1">
              <p className="text-[11px] font-semibold text-stone-500 uppercase tracking-wider mb-2">
                Detalhamento por alimento {birdCount > 1 ? "(por ave)" : ""}
              </p>
              {nossaDieta.racao.items.map(item => (
                <div key={item.food.id} className="flex items-center justify-between px-3 py-1.5 bg-amber-50 rounded text-sm">
                  <span className="text-stone-700">{item.food.name}</span>
                  <div className="flex items-center gap-3">
                    <span className="font-semibold text-amber-700">{item.grams.toFixed(1)}g</span>
                    {birdCount > 1 && <span className="text-[10px] text-stone-400">({(item.grams * birdCount).toFixed(1)}g total)</span>}
                  </div>
                </div>
              ))}
              {nossaDieta.vegetais.items.map(item => (
                <div key={item.food.id} className="flex items-center justify-between px-3 py-1.5 bg-green-50 rounded text-sm">
                  <span className="text-stone-700">{item.food.name}</span>
                  <div className="flex items-center gap-3">
                    <span className="font-semibold text-green-700">{item.grams.toFixed(1)}g</span>
                    {birdCount > 1 && <span className="text-[10px] text-stone-400">({(item.grams * birdCount).toFixed(1)}g total)</span>}
                  </div>
                </div>
              ))}
              {nossaDieta.frutas.items.map(item => (
                <div key={item.food.id} className="flex items-center justify-between px-3 py-1.5 bg-red-50 rounded text-sm">
                  <span className="text-stone-700">{item.food.name}</span>
                  <div className="flex items-center gap-3">
                    <span className="font-semibold text-red-600">{item.grams.toFixed(1)}g</span>
                    {birdCount > 1 && <span className="text-[10px] text-stone-400">({(item.grams * birdCount).toFixed(1)}g total)</span>}
                  </div>
                </div>
              ))}
              {nossaDieta.proteicos.items.map(item => (
                <div key={item.food.id} className="flex items-center justify-between px-3 py-1.5 bg-yellow-50 rounded text-sm">
                  <span className="text-stone-700">{item.food.name}</span>
                  <div className="flex items-center gap-3">
                    <span className="font-semibold text-yellow-700">{item.grams.toFixed(1)}g</span>
                    {birdCount > 1 && <span className="text-[10px] text-stone-400">({(item.grams * birdCount).toFixed(1)}g total)</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}

// ============================================
// FOOD STEP CARD
// ============================================
interface FoodStepCardProps {
  step: DietStep;
  stepNumber: number;
  unlocked: boolean;
  expanded: boolean;
  onToggle: () => void;
  foods: FoodItem[];
  search: string;
  onSearchChange: (v: string) => void;
  selectedSingle?: FoodItem | null;
  onSelectSingle?: (food: FoodItem) => void;
  selectedMultiple?: FoodItem[];
  onToggleMultiple?: (food: FoodItem) => void;
  nossaDieta: ReturnType<typeof Object> | null;
  idealDiet: ReturnType<typeof Object> | null;
  groupKey: string;
  nextStepLabel?: string;
  onAdvance?: () => void;
}

function FoodStepCard({
  step, stepNumber, unlocked, expanded, onToggle,
  foods, search, onSearchChange,
  selectedSingle, onSelectSingle,
  selectedMultiple, onToggleMultiple,
  nossaDieta, idealDiet, groupKey,
  nextStepLabel, onAdvance,
}: FoodStepCardProps) {
  const config = STEP_CONFIG[step];
  const Icon = config.icon;
  const isMulti = !!onToggleMultiple;
  const selectedCount = isMulti ? (selectedMultiple?.length || 0) : (selectedSingle ? 1 : 0);

  // Get grams from nossaDieta
  const dietGroup = nossaDieta ? (nossaDieta as any)[step === "racao" ? "racao" : step] : null;
  const totalGroupGrams = dietGroup?.grams || 0;
  const groupItems: SelectedFood[] = dietGroup?.items || [];

  const filteredFoods = useMemo(() => {
    if (!search) return foods;
    const q = search.toLowerCase();
    return foods.filter(f => f.name.toLowerCase().includes(q) || f.classification.toLowerCase().includes(q));
  }, [foods, search]);

  return (
    <div className={cn(!unlocked && "pointer-events-none")}>
      <button
        onClick={unlocked ? onToggle : undefined}
        className={cn(
          "w-full flex items-center justify-between px-5 py-4 transition-colors rounded-t-xl",
          unlocked ? "hover:bg-stone-50/50 cursor-pointer" : "cursor-not-allowed"
        )}
      >
        <div className="flex items-center gap-3">
          <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center shadow-sm",
            unlocked ? config.bgColor : "bg-stone-100"
          )}>
            {unlocked ? <Icon className={cn("w-5 h-5", config.color)} /> : <Lock className="w-4 h-4 text-stone-400" />}
          </div>
          <div className="text-left">
            <div className="flex items-center gap-2">
              <h3 className={cn("font-bold text-sm", unlocked ? "text-stone-800" : "text-stone-500")}>{stepNumber}. {config.label}</h3>
              <span className="text-[10px] text-stone-400 bg-stone-100 px-1.5 py-0.5 rounded-full">{foods.length} itens</span>
              {selectedCount > 0 && (
                <span className={cn("px-2 py-0.5 text-[10px] font-bold rounded-full",
                  step === "racao" ? "bg-amber-100 text-amber-800" :
                  step === "vegetais" ? "bg-green-100 text-green-800" :
                  step === "frutas" ? "bg-red-100 text-red-800" :
                  "bg-yellow-100 text-yellow-800"
                )}>
                  {selectedCount} selecionado{selectedCount > 1 ? "s" : ""}
                </span>
              )}
            </div>
            {selectedCount > 0 && totalGroupGrams > 0 && (
              <p className="text-[11px] text-stone-500 mt-0.5">{totalGroupGrams.toFixed(1)}g na nossa dieta</p>
            )}
            {selectedCount === 0 && unlocked && (
              <p className="text-[11px] text-stone-400 mt-0.5 italic">
                {step === "racao" ? "Selecione a ração base da dieta" :
                 step === "vegetais" ? "Adicione vegetais para balancear" :
                 step === "frutas" ? "Adicione frutas para diversificar" :
                 "Adicione sementes e proteicos"}
              </p>
            )}
            {!unlocked && (
              <p className="text-[11px] text-stone-400 mt-0.5 flex items-center gap-1">
                <Lock className="w-3 h-3" /> Selecione a ração para desbloquear
              </p>
            )}
          </div>
        </div>
        {unlocked ? (
          <ChevronDown className={cn("w-5 h-5 text-stone-400 transition-transform duration-200", expanded && "rotate-180")} />
        ) : (
          <Lock className="w-4 h-4 text-stone-300" />
        )}
      </button>

      <AnimatePresence>
        {expanded && unlocked && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-4">
              {/* Separador visual */}
              <div className={cn("h-0.5 rounded-full mb-4",
                step === "racao" ? "bg-amber-200" :
                step === "vegetais" ? "bg-green-200" :
                step === "frutas" ? "bg-red-200" :
                "bg-yellow-200"
              )} />

              {/* Selected items with calculated grams */}
              {isMulti && selectedMultiple && selectedMultiple.length > 0 && groupItems.length > 0 && (
                <div className="mb-4">
                  <p className={cn("text-[10px] font-bold uppercase tracking-wider mb-2 flex items-center gap-1.5",
                    step === "vegetais" ? "text-green-700" :
                    step === "frutas" ? "text-red-600" :
                    "text-yellow-700"
                  )}>
                    <Check className="w-3 h-3" />
                    Selecionados — gramas calculadas
                  </p>
                  <div className="space-y-1.5">
                    {groupItems.map((item: SelectedFood) => (
                      <div key={item.food.id} className={cn("flex items-center justify-between px-3 py-2 rounded-lg border",
                        step === "vegetais" ? "bg-green-50 border-green-200" :
                        step === "frutas" ? "bg-red-50 border-red-200" :
                        "bg-yellow-50 border-yellow-200"
                      )}>
                        <div className="flex items-center gap-2">
                          <button onClick={() => onToggleMultiple?.(item.food)} className="text-red-400 hover:text-red-600 p-0.5 rounded hover:bg-red-50 transition-colors"><X className="w-3.5 h-3.5" /></button>
                          <span className="text-sm font-medium text-stone-700">{item.food.name}</span>
                          {classificationBadge(item.food.classification)}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-stone-400">{item.food.energyKcal} kcal/kg</span>
                          <span className={cn("font-bold text-sm",
                            step === "vegetais" ? "text-green-700" :
                            step === "frutas" ? "text-red-600" :
                            "text-yellow-700"
                          )}>{item.grams.toFixed(1)}g</span>
                        </div>
                      </div>
                    ))}
                  </div>
                  {nextStepLabel && onAdvance && (
                    <button onClick={onAdvance} className={cn("mt-3 flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-md transition-colors",
                      step === "vegetais" ? "text-green-700 hover:bg-green-100" :
                      step === "frutas" ? "text-red-600 hover:bg-red-100" :
                      "text-yellow-700 hover:bg-yellow-100"
                    )}>
                      Avançar para {nextStepLabel} <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              )}

              {/* Single selected (ração) */}
              {!isMulti && selectedSingle && totalGroupGrams > 0 && (
                <div className="mb-4">
                  <p className="text-[10px] font-bold uppercase tracking-wider mb-2 text-amber-700 flex items-center gap-1.5">
                    <Check className="w-3 h-3" />
                    Ração selecionada
                  </p>
                  <div className="flex items-center justify-between px-3 py-2.5 bg-amber-50 rounded-lg border border-amber-200">
                    <div className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-amber-600" />
                      <span className="text-sm font-medium text-stone-700">{selectedSingle.name}</span>
                      {classificationBadge(selectedSingle.classification)}
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-amber-700">{totalGroupGrams.toFixed(1)}g</span>
                      <span className="text-[10px] text-stone-500 ml-1">({selectedSingle.energyKcal} kcal/kg)</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Search */}
              <div className="relative mb-3">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                <input
                  type="text" placeholder={`Buscar em ${foods.length} ${config.label.toLowerCase()}...`}
                  value={search} onChange={e => onSearchChange(e.target.value)}
                  className={cn("w-full pl-9 pr-3 py-2.5 text-sm border rounded-lg focus:outline-none transition-colors",
                    step === "racao" ? "border-amber-200 focus:border-amber-400 bg-amber-50/30" :
                    step === "vegetais" ? "border-green-200 focus:border-green-400 bg-green-50/30" :
                    step === "frutas" ? "border-red-200 focus:border-red-400 bg-red-50/30" :
                    "border-yellow-200 focus:border-yellow-400 bg-yellow-50/30"
                  )}
                />
              </div>

              {/* Food list */}
              <div className={cn("max-h-64 overflow-y-auto rounded-lg border",
                step === "racao" ? "border-amber-200" :
                step === "vegetais" ? "border-green-200" :
                step === "frutas" ? "border-red-200" :
                "border-yellow-200"
              )}>
                {filteredFoods.map(food => {
                  const isSelected = isMulti
                    ? selectedMultiple?.some(s => s.id === food.id)
                    : selectedSingle?.id === food.id;

                  const selectedBg = step === "racao" ? "bg-amber-50 border-l-amber-500" :
                    step === "vegetais" ? "bg-green-50 border-l-green-500" :
                    step === "frutas" ? "bg-red-50 border-l-red-400" :
                    "bg-yellow-50 border-l-yellow-500";

                  const selectedIconColor = step === "racao" ? "text-amber-600" :
                    step === "vegetais" ? "text-green-600" :
                    step === "frutas" ? "text-red-500" :
                    "text-yellow-600";

                  return (
                    <button
                      key={food.id}
                      onClick={() => isMulti ? onToggleMultiple?.(food) : onSelectSingle?.(food)}
                      className={cn(
                        "w-full flex items-center justify-between px-3 py-2.5 text-left transition-all text-sm border-l-3",
                        isSelected ? selectedBg : "hover:bg-stone-50 border-l-transparent"
                      )}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        {isSelected ? (
                          <Check className={cn("w-4 h-4 flex-shrink-0", selectedIconColor)} />
                        ) : (
                          <Plus className="w-4 h-4 text-stone-300 flex-shrink-0" />
                        )}
                        <span className={cn("truncate", isSelected ? "font-semibold text-stone-800" : "text-stone-600")}>{food.name}</span>
                        {classificationBadge(food.classification)}
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                        <span className="text-[10px] text-stone-400">{food.energyKcal} kcal/kg</span>
                        {food.proteinG > 0 && <span className="text-[10px] text-stone-400">P:{food.proteinG}%</span>}
                        {food.fatG > 0 && <span className="text-[10px] text-stone-400">G:{food.fatG}%</span>}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ============================================
// SUMMARY CARD
// ============================================
function SummaryCard({ label, grams, kcal, pctKcal, color, textColor, count, idealPctKcal }: {
  label: string; grams: number; kcal: number; pctKcal: number; color: string; textColor: string; count: number; idealPctKcal?: number;
}) {
  const diff = idealPctKcal !== undefined ? pctKcal - idealPctKcal : 0;
  const diffAbs = Math.abs(diff);

  return (
    <div className={cn("rounded-lg border p-3", color)}>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-medium text-stone-600">{label}</span>
        <span className="text-[10px] text-stone-400">{count} item{count !== 1 ? "s" : ""}</span>
      </div>
      <div className={cn("text-lg font-bold", textColor)}>{grams.toFixed(1)}g</div>
      <div className="text-[10px] text-stone-500">{kcal.toFixed(1)} kcal ({pctKcal.toFixed(0)}%)</div>
      {idealPctKcal !== undefined && count > 0 && diffAbs > 1 && (
        <div className={cn("text-[10px] mt-1 font-medium", diff > 0 ? "text-amber-600" : "text-blue-600")}>
          {diff > 0 ? `+${diffAbs.toFixed(0)}% kcal vs ideal` : `-${diffAbs.toFixed(0)}% kcal vs ideal`}
        </div>
      )}
    </div>
  );
}
