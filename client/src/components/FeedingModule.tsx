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
  Eye, Copy, Users, ArrowLeft, FileText, CalendarDays,
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
import {
  getSavedDiets, saveDiet, updateDiet, deleteDiet,
  exportDietAsText, type SavedDiet,
} from "@/lib/dietStorage";
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

  // --- Dieta salva nome ---
  const [dietName, setDietName] = useState("");
  const [showSaveDialog, setShowSaveDialog] = useState(false);

  // --- Dias do mês selecionados ---
  const [selectedDays, setSelectedDays] = useState<number[]>([]);

  // --- Saved diets list ---
  const [savedDiets, setSavedDiets] = useState<SavedDiet[]>(() => getSavedDiets());
  const [savedDietsFilter, setSavedDietsFilter] = useState("");

  // Load saved diets on mount, mode change, and after any save/delete
  useEffect(() => {
    const diets = getSavedDiets();
    setSavedDiets(diets);
  }, [dietMode]);

  // Also listen for storage events (cross-tab sync)
  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === "minas-bird-saved-diets") {
        setSavedDiets(getSavedDiets());
      }
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  // --- Derived data ---
  const selectedSpecies = useMemo(() => species.find(s => s.id === selectedSpeciesId) || null, [selectedSpeciesId]);
  const birdData = useMemo(() => selectedSpeciesId ? getPetBirdData(selectedSpeciesId) : null, [selectedSpeciesId]);
  const phase = useMemo(() => lifePeriods.find(p => p.id === phaseId)!, [phaseId]);
  const enclosure = useMemo(() => enclosureTypes.find(e => e.id === enclosureId)!, [enclosureId]);
  const weight = customWeight ?? (birdData?.weight || 0);

  const mer = useMemo(() => {
    if (!birdData || weight <= 0) return 0;
    return calculateMER(weight, birdData.metabolism, phase.multiplier, enclosure.multiplier);
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
    setShowSaveDialog(false);
    setSelectedDays([]);
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
    setDietName(diet.name);
    setSelectedDays(diet.selectedDays || []);
    setDietMode("editing");
    setExpandedStep(null);
  }, []);

  // --- Save diet ---
  const handleSaveDiet = useCallback(() => {
    if (!selectedSpecies || !selectedRacao || !nossaDieta) return;

    const name = dietName.trim() || `${selectedSpecies.commonName} — ${new Date().toLocaleDateString("pt-BR")}`;

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
      mer,
      totalGrams: nossaDieta.total.grams,
      totalKcal: nossaDieta.total.kcal,
      selectedDays,
      items: {
        racao: nossaDieta.racao.items.map(i => ({ foodId: i.food.id, foodName: i.food.name, grams: i.grams, kcal: nossaDieta.racao.kcal, energyKcalPerKg: i.food.energyKcal })),
        vegetais: nossaDieta.vegetais.items.map(i => ({ foodId: i.food.id, foodName: i.food.name, grams: i.grams, kcal: nossaDieta.vegetais.kcal / Math.max(1, selectedVegetais.length), energyKcalPerKg: i.food.energyKcal })),
        frutas: nossaDieta.frutas.items.map(i => ({ foodId: i.food.id, foodName: i.food.name, grams: i.grams, kcal: nossaDieta.frutas.kcal / Math.max(1, selectedFrutas.length), energyKcalPerKg: i.food.energyKcal })),
        proteicos: nossaDieta.proteicos.items.map(i => ({ foodId: i.food.id, foodName: i.food.name, grams: i.grams, kcal: nossaDieta.proteicos.kcal / Math.max(1, selectedProteicos.length), energyKcalPerKg: i.food.energyKcal })),
      },
    };

    try {
      if (editingDietId) {
        updateDiet(editingDietId, dietData);
        toast.success("Dieta atualizada com sucesso!");
      } else {
        const saved = saveDiet(dietData);
        setEditingDietId(saved.id);
        toast.success("Dieta salva com sucesso!");
      }
    } catch (err) {
      console.error("Erro ao salvar dieta:", err);
      toast.error("Erro ao salvar dieta. Tente novamente.");
      return;
    }

    setShowSaveDialog(false);
    // Atualizar a lista e voltar ao menu
    const updatedDiets = getSavedDiets();
    setSavedDiets(updatedDiets);
    // Resetar estado do editor sem perder as dietas salvas
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
      setShowSaveDialog(false);
      setSelectedDays([]);
      setDietMode("menu");
    }, 600);
  }, [selectedSpecies, selectedRacao, nossaDieta, selectedVegetais, selectedFrutas, selectedProteicos, weight, phaseId, enclosureId, birdCount, mer, dietName, editingDietId, selectedDays]);

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

  // --- Delete diet ---
  const handleDeleteDiet = useCallback((id: string) => {
    deleteDiet(id);
    const updated = getSavedDiets();
    setSavedDiets(updated);
    if (viewingDiet?.id === id) {
      setViewingDiet(null);
      if (updated.length === 0) {
        setDietMode("menu");
      } else {
        setDietMode("saved-list");
      }
    }
    toast.success("Dieta excluída!");
  }, [viewingDiet]);

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
                setShowSaveDialog(false);
                setSelectedDays([]);
                setDietMode("creating");
              }}
              className="flex flex-col items-center gap-3 p-6 rounded-xl border-2 border-dashed border-emerald-300 bg-emerald-50/50 hover:bg-emerald-100 hover:border-emerald-400 transition-all group"
            >
              <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center group-hover:bg-emerald-200 transition-colors">
                <FilePlus className="w-6 h-6 text-emerald-700" />
              </div>
              <div className="text-center">
                <span className="font-semibold text-stone-800 block">Criar Nova Dieta</span>
                <span className="text-xs text-stone-500 mt-1">Montar uma dieta do zero para uma espécie</span>
              </div>
            </button>

            <button
              onClick={() => {
                const diets = getSavedDiets();
                if (diets.length === 0) {
                  toast.info("Nenhuma dieta salva. Crie uma nova dieta primeiro.");
                  return;
                }
                setSavedDiets(diets);
                setDietMode("saved-list");
              }}
              className="flex flex-col items-center gap-3 p-6 rounded-xl border-2 border-dashed border-amber-300 bg-amber-50/50 hover:bg-amber-100 hover:border-amber-400 transition-all group"
            >
              <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center group-hover:bg-amber-200 transition-colors">
                <Edit3 className="w-6 h-6 text-amber-700" />
              </div>
              <div className="text-center">
                <span className="font-semibold text-stone-800 block">Mudar Dieta Atual</span>
                <span className="text-xs text-stone-500 mt-1">Ajustar a dieta de uma espécie existente</span>
              </div>
            </button>

            <button
              onClick={() => {
                setSavedDiets(getSavedDiets());
                setDietMode("saved-list");
              }}
              className="flex flex-col items-center gap-3 p-6 rounded-xl border-2 border-dashed border-stone-300 bg-stone-50/50 hover:bg-stone-100 hover:border-stone-400 transition-all group"
            >
              <div className="w-12 h-12 rounded-full bg-stone-100 flex items-center justify-center group-hover:bg-stone-200 transition-colors">
                <FolderOpen className="w-6 h-6 text-stone-600" />
              </div>
              <div className="text-center">
                <span className="font-semibold text-stone-800 block">Dietas Salvas</span>
                <span className="text-xs text-stone-500 mt-1">Ver dietas salvas por espécie</span>
              </div>
            </button>
          </div>
        </div>

        {/* ===== LISTA DE DIETAS SALVAS NA TELA INICIAL ===== */}
        {savedDiets.length > 0 && (
          <div className="bg-white rounded-xl border border-stone-200 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-stone-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FolderOpen className="w-5 h-5 text-emerald-600" />
                  <h2 className="font-bold text-stone-800">Dietas Salvas</h2>
                  <span className="text-xs text-stone-400">({savedDiets.length})</span>
                </div>
                <button
                  onClick={() => {
                    setSavedDiets(getSavedDiets());
                    setDietMode("saved-list");
                  }}
                  className="text-xs text-emerald-600 hover:text-emerald-800 font-medium transition-colors flex items-center gap-1"
                >
                  Ver todas <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            </div>
            <div className="divide-y divide-stone-100">
              {Object.entries(groupedSavedDiets).map(([speciesName, diets]) => (
                <div key={speciesName}>
                  <div className="px-5 py-2 bg-stone-50">
                    <div className="flex items-center gap-2">
                      <Bird className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="text-xs font-bold text-stone-500 uppercase tracking-wider">{speciesName}</span>
                      <span className="text-[10px] text-stone-400">({diets.length} dieta{diets.length > 1 ? "s" : ""})</span>
                    </div>
                  </div>
                  {diets.map(diet => (
                    <div key={diet.id} className="px-5 py-3 hover:bg-stone-50 transition-colors">
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
                            <span>{diet.totalGrams.toFixed(1)}g/ave</span>
                            <span>{diet.totalKcal.toFixed(1)} kcal/ave</span>
                            {diet.selectedDays && diet.selectedDays.length > 0 && (
                              <span className="flex items-center gap-0.5 text-emerald-600">
                                <CalendarDays className="w-3 h-3" />
                                {diet.selectedDays.length === 31 ? "Todos os dias" : `${diet.selectedDays.length} dia${diet.selectedDays.length > 1 ? "s" : ""}`}
                              </span>
                            )}
                            <span>{formatDate(diet.updatedAt)}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 ml-3">
                          <button
                            onClick={() => { setViewingDiet(diet); setSavedDiets(getSavedDiets()); setDietMode("saved-detail"); }}
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
                            onClick={() => handleExportDiet(diet)}
                            className="p-1.5 text-stone-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
                            title="Exportar"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => { handleDeleteDiet(diet.id); setSavedDiets(getSavedDiets()); }}
                            className="p-1.5 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                            title="Excluir"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
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
              {savedDiets.length > 3 && (
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                  <input
                    type="text" placeholder="Buscar dieta..."
                    value={savedDietsFilter} onChange={e => setSavedDietsFilter(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-sm border border-stone-200 rounded-md focus:outline-none focus:border-emerald-400"
                  />
                </div>
              )}
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
                {Object.entries(groupedSavedDiets).map(([speciesName, diets]) => (
                  <div key={speciesName}>
                    <div className="px-5 py-2 bg-stone-50">
                      <div className="flex items-center gap-2">
                        <Bird className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="text-xs font-bold text-stone-500 uppercase tracking-wider">{speciesName}</span>
                        <span className="text-[10px] text-stone-400">({diets.length} dieta{diets.length > 1 ? "s" : ""})</span>
                      </div>
                    </div>
                    {diets.map(diet => (
                      <div key={diet.id} className="px-5 py-3 hover:bg-stone-50 transition-colors">
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
                              <span>{diet.totalGrams.toFixed(1)}g/ave</span>
                              <span>{diet.totalKcal.toFixed(1)} kcal/ave</span>
                              {diet.selectedDays && diet.selectedDays.length > 0 && (
                                <span className="flex items-center gap-0.5 text-emerald-600">
                                  <CalendarDays className="w-3 h-3" />
                                  {diet.selectedDays.length === 31 ? "Todos os dias" : `${diet.selectedDays.length} dia${diet.selectedDays.length > 1 ? "s" : ""}`}
                                </span>
                              )}
                              <span>{formatDate(diet.updatedAt)}</span>
                            </div>
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
                    ))}
                  </div>
                ))}
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
                <button onClick={() => handleCopyDiet(viewingDiet)} className="px-3 py-1.5 text-xs bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors flex items-center gap-1">
                  <Copy className="w-3 h-3" /> Copiar
                </button>
                <button onClick={() => handleExportDiet(viewingDiet)} className="px-3 py-1.5 text-xs bg-indigo-100 text-indigo-700 rounded-lg hover:bg-indigo-200 transition-colors flex items-center gap-1">
                  <Download className="w-3 h-3" /> Exportar
                </button>
              </div>
            </div>

            {/* Info grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
              <div className="bg-stone-50 rounded-lg p-3">
                <span className="text-[10px] text-stone-500 font-medium">Espécie</span>
                <p className="text-sm font-semibold text-stone-800">{viewingDiet.speciesName}</p>
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

            {/* Dias de uso */}
            {viewingDiet.selectedDays && viewingDiet.selectedDays.length > 0 && (
              <div className="mb-4">
                <div className="bg-emerald-50 rounded-lg border border-emerald-200 p-3">
                  <div className="flex items-center gap-1.5 mb-2">
                    <CalendarDays className="w-3.5 h-3.5 text-emerald-700" />
                    <span className="text-xs font-medium text-emerald-800">
                      Dias de uso no mês
                      {viewingDiet.selectedDays.length === 31 ? " (todos)" : ` (${viewingDiet.selectedDays.length} dia${viewingDiet.selectedDays.length > 1 ? "s" : ""})`}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {Array.from({ length: 31 }, (_, i) => i + 1).map(day => {
                      const isActive = viewingDiet.selectedDays.includes(day);
                      return (
                        <span
                          key={day}
                          className={cn(
                            "w-7 h-7 rounded-md text-[10px] font-medium flex items-center justify-center border",
                            isActive
                              ? "bg-emerald-600 text-white border-emerald-700"
                              : "bg-white/60 text-stone-300 border-stone-100"
                          )}
                        >
                          {day}
                        </span>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

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
      {(dietMode === "creating" || dietMode === "editing") && (
      <div className="bg-white rounded-xl border border-stone-200 shadow-sm overflow-hidden">

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
            <div className="flex items-center gap-2">
              {dietMode === "editing" && (
                <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-amber-100 text-amber-700">Editando</span>
              )}
              {selectedSpeciesId && (
                <button onClick={handleResetAll} className="text-xs text-stone-500 hover:text-red-600 flex items-center gap-1 transition-colors">
                  <RefreshCw className="w-3 h-3" /> Recomeçar
                </button>
              )}
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

        {/* ===== FOOD SELECTION STEPS ===== */}
        {/* STEP 2: RAÇÃO */}
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

        {/* STEP 3: VEGETAIS */}
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

        {/* STEP 4: FRUTAS */}
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

        {/* STEP 5: PROTEICOS */}
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

            {/* Save Dialog */}
            <AnimatePresence>
              {showSaveDialog && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden mb-4"
                >
                  <div className="bg-emerald-50 rounded-lg border border-emerald-200 p-4">
                    <label className="text-xs font-medium text-emerald-800 block mb-1">Nome da dieta</label>
                    <input
                      type="text"
                      value={dietName}
                      onChange={e => setDietName(e.target.value)}
                      placeholder={`${selectedSpecies?.commonName || "Espécie"} — ${new Date().toLocaleDateString("pt-BR")}`}
                      className="w-full px-3 py-2 text-sm border border-emerald-300 rounded-md focus:outline-none focus:border-emerald-500 bg-white"
                      autoFocus
                    />

                    {/* Seletor de dias do mês */}
                    <div className="mt-4">
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-xs font-medium text-emerald-800 flex items-center gap-1.5">
                          <CalendarDays className="w-3.5 h-3.5" />
                          Dias de uso no mês
                        </label>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setSelectedDays(selectedDays.length === 31 ? [] : Array.from({ length: 31 }, (_, i) => i + 1))}
                            className="text-[10px] font-medium text-emerald-700 hover:text-emerald-900 underline underline-offset-2 transition-colors"
                          >
                            {selectedDays.length === 31 ? "Desmarcar todos" : "Selecionar todos"}
                          </button>
                          {selectedDays.length > 0 && selectedDays.length < 31 && (
                            <span className="text-[10px] text-stone-500">({selectedDays.length} dia{selectedDays.length > 1 ? "s" : ""})</span>
                          )}
                        </div>
                      </div>
                      <div className="grid grid-cols-7 gap-1">
                        {Array.from({ length: 31 }, (_, i) => i + 1).map(day => {
                          const isSelected = selectedDays.includes(day);
                          return (
                            <button
                              key={day}
                              type="button"
                              onClick={() => {
                                setSelectedDays(prev =>
                                  prev.includes(day)
                                    ? prev.filter(d => d !== day)
                                    : [...prev, day].sort((a, b) => a - b)
                                );
                              }}
                              className={cn(
                                "w-full aspect-square rounded-md text-xs font-medium transition-all duration-150 border",
                                isSelected
                                  ? "bg-emerald-600 text-white border-emerald-700 shadow-sm"
                                  : "bg-white text-stone-600 border-stone-200 hover:border-emerald-400 hover:bg-emerald-50"
                              )}
                            >
                              {day}
                            </button>
                          );
                        })}
                      </div>
                      {selectedDays.length === 0 && (
                        <p className="text-[10px] text-stone-400 mt-1.5 italic">Opcional — selecione os dias em que esta dieta será utilizada</p>
                      )}
                    </div>

                    <div className="flex items-center gap-2 mt-4">
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
    <div className={cn("border-b border-stone-100", !unlocked && "opacity-40 pointer-events-none")}>
      <button
        onClick={unlocked ? onToggle : undefined}
        className={cn(
          "w-full flex items-center justify-between px-5 py-4 transition-colors",
          unlocked ? "hover:bg-stone-50 cursor-pointer" : "cursor-not-allowed"
        )}
      >
        <div className="flex items-center gap-3">
          <div className={cn("w-8 h-8 rounded-full flex items-center justify-center", unlocked ? config.bgColor : "bg-stone-50")}>
            {unlocked ? <Icon className={cn("w-4 h-4", config.color)} /> : <Lock className="w-4 h-4 text-stone-300" />}
          </div>
          <div className="text-left">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-stone-800 text-sm">{stepNumber}. {config.label}</h3>
              <span className="text-[10px] text-stone-400">{foods.length}</span>
              {selectedCount > 0 && (
                <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-emerald-100 text-emerald-800">
                  {selectedCount} selecionado{selectedCount > 1 ? "s" : ""}
                </span>
              )}
            </div>
            {selectedCount > 0 && totalGroupGrams > 0 && (
              <p className="text-[11px] text-stone-500">{totalGroupGrams.toFixed(1)}g na nossa dieta</p>
            )}
          </div>
        </div>
        {unlocked && (
          <ChevronDown className={cn("w-4 h-4 text-stone-400 transition-transform", expanded && "rotate-180")} />
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
              {/* Selected items with calculated grams */}
              {isMulti && selectedMultiple && selectedMultiple.length > 0 && groupItems.length > 0 && (
                <div className="mb-3 space-y-1">
                  <p className="text-[10px] font-semibold text-stone-500 uppercase tracking-wider">Selecionados — gramas calculadas</p>
                  {groupItems.map((item: SelectedFood) => (
                    <div key={item.food.id} className="flex items-center justify-between px-3 py-1.5 bg-emerald-50 rounded-lg">
                      <div className="flex items-center gap-2">
                        <button onClick={() => onToggleMultiple?.(item.food)} className="text-red-400 hover:text-red-600"><X className="w-3 h-3" /></button>
                        <span className="text-sm text-stone-700">{item.food.name}</span>
                        {classificationBadge(item.food.classification)}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-stone-500">{item.food.energyKcal} kcal/kg</span>
                        <span className="font-bold text-sm text-emerald-700">{item.grams.toFixed(1)}g</span>
                      </div>
                    </div>
                  ))}
                  {nextStepLabel && onAdvance && (
                    <button onClick={onAdvance} className="mt-2 flex items-center gap-1 text-xs text-emerald-700 hover:text-emerald-900 font-medium">
                      Avançar para {nextStepLabel} <ArrowRight className="w-3 h-3" />
                    </button>
                  )}
                </div>
              )}

              {/* Single selected (ração) */}
              {!isMulti && selectedSingle && totalGroupGrams > 0 && (
                <div className="mb-3">
                  <div className="flex items-center justify-between px-3 py-2 bg-amber-50 rounded-lg border border-amber-200">
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
              <div className="relative mb-2">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                <input
                  type="text" placeholder={`Buscar em ${foods.length} alimentos...`}
                  value={search} onChange={e => onSearchChange(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm border border-stone-200 rounded-md focus:outline-none focus:border-emerald-400"
                />
              </div>

              {/* Food list */}
              <div className="max-h-64 overflow-y-auto space-y-0.5 rounded-lg border border-stone-100">
                {filteredFoods.map(food => {
                  const isSelected = isMulti
                    ? selectedMultiple?.some(s => s.id === food.id)
                    : selectedSingle?.id === food.id;

                  return (
                    <button
                      key={food.id}
                      onClick={() => isMulti ? onToggleMultiple?.(food) : onSelectSingle?.(food)}
                      className={cn(
                        "w-full flex items-center justify-between px-3 py-2 text-left transition-colors text-sm",
                        isSelected ? "bg-emerald-50 border-l-2 border-emerald-500" : "hover:bg-stone-50 border-l-2 border-transparent"
                      )}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        {isSelected ? (
                          <Check className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                        ) : (
                          <Plus className="w-4 h-4 text-stone-300 flex-shrink-0" />
                        )}
                        <span className={cn("truncate", isSelected ? "font-medium text-stone-800" : "text-stone-600")}>{food.name}</span>
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
