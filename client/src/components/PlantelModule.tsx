/**
 * PlantelModule — Cadastro completo das aves do criatório
 * Listagem com filtros, formulário de cadastro, card de detalhe
 * Seleção de espécie ao entrar no card
 */
import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { species } from "@/data/feeding";
import {
  Bird, Plus, Search, Edit2, Trash2, ArrowLeft, Save,
  Filter, ChevronDown, X
} from "lucide-react";
import { cn } from "@/lib/utils";

// Species list for the selector
const SPECIES_LIST = species
  .filter(s => s.inCurrentFlock)
  .sort((a, b) => a.commonName.localeCompare(b.commonName));

const ALL_SPECIES = species.sort((a, b) => a.commonName.localeCompare(b.commonName));

type BirdStatus = "ativo" | "vendido" | "obito" | "doado" | "emprestado";
type BirdSex = "macho" | "femea" | "indefinido";
type BirdOrigin = "nascido_criadouro" | "comprado" | "doado" | "troca";

const STATUS_LABELS: Record<BirdStatus, string> = {
  ativo: "Ativo",
  vendido: "Vendido",
  obito: "Óbito",
  doado: "Doado",
  emprestado: "Emprestado",
};

const STATUS_COLORS: Record<BirdStatus, string> = {
  ativo: "bg-emerald-100 text-emerald-700 border-emerald-200",
  vendido: "bg-blue-100 text-blue-700 border-blue-200",
  obito: "bg-stone-200 text-stone-600 border-stone-300",
  doado: "bg-purple-100 text-purple-700 border-purple-200",
  emprestado: "bg-amber-100 text-amber-700 border-amber-200",
};

const SEX_LABELS: Record<BirdSex, string> = {
  macho: "Macho",
  femea: "Fêmea",
  indefinido: "Indefinido",
};

const ORIGIN_LABELS: Record<BirdOrigin, string> = {
  nascido_criadouro: "Nascido no Criatório",
  comprado: "Comprado",
  doado: "Doado",
  troca: "Troca",
};

interface BirdForm {
  speciesId: string;
  speciesName: string;
  ringNumber: string;
  sex: BirdSex;
  birthDate: string;
  mutation: string;
  origin: BirdOrigin;
  originBreeder: string;
  status: BirdStatus;
  enclosure: string;
  weightGrams: string;
  notes: string;
}

const EMPTY_FORM: BirdForm = {
  speciesId: "",
  speciesName: "",
  ringNumber: "",
  sex: "indefinido",
  birthDate: "",
  mutation: "",
  origin: "nascido_criadouro",
  originBreeder: "",
  status: "ativo",
  enclosure: "",
  weightGrams: "",
  notes: "",
};

type View = "list" | "form" | "detail";

export default function PlantelModule() {
  const [view, setView] = useState<View>("list");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [selectedBirdId, setSelectedBirdId] = useState<number | null>(null);
  const [form, setForm] = useState<BirdForm>(EMPTY_FORM);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<BirdStatus | "todos">("todos");
  const [filterSpecies, setFilterSpecies] = useState<string>("todos");
  const [speciesSearch, setSpeciesSearch] = useState("");
  const [showSpeciesDropdown, setShowSpeciesDropdown] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);

  // tRPC
  const { data: birds = [], isLoading } = trpc.plantel.list.useQuery();
  const createMut = trpc.plantel.create.useMutation();
  const updateMut = trpc.plantel.update.useMutation();
  const deleteMut = trpc.plantel.delete.useMutation();
  const utils = trpc.useUtils();

  // Filtered birds
  const filteredBirds = useMemo(() => {
    return birds.filter(b => {
      const matchesSearch =
        !searchTerm ||
        b.speciesName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (b.ringNumber && b.ringNumber.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (b.mutation && b.mutation.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (b.enclosure && b.enclosure.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesStatus = filterStatus === "todos" || b.status === filterStatus;
      const matchesSpecies = filterSpecies === "todos" || b.speciesId === filterSpecies;
      return matchesSearch && matchesStatus && matchesSpecies;
    });
  }, [birds, searchTerm, filterStatus, filterSpecies]);

  // Species in the dropdown filtered by search
  const filteredSpeciesList = useMemo(() => {
    if (!speciesSearch) return ALL_SPECIES;
    return ALL_SPECIES.filter(s =>
      s.commonName.toLowerCase().includes(speciesSearch.toLowerCase()) ||
      s.scientificName.toLowerCase().includes(speciesSearch.toLowerCase())
    );
  }, [speciesSearch]);

  // Stats
  const stats = useMemo(() => {
    const total = birds.length;
    const ativos = birds.filter(b => b.status === "ativo").length;
    const speciesCount = new Set(birds.filter(b => b.status === "ativo").map(b => b.speciesId)).size;
    return { total, ativos, speciesCount };
  }, [birds]);

  // Handlers
  const handleNewBird = () => {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setView("form");
  };

  const handleEditBird = (bird: typeof birds[0]) => {
    setForm({
      speciesId: bird.speciesId,
      speciesName: bird.speciesName,
      ringNumber: bird.ringNumber || "",
      sex: bird.sex as BirdSex,
      birthDate: bird.birthDate ? new Date(bird.birthDate).toISOString().split("T")[0] : "",
      mutation: bird.mutation || "",
      origin: bird.origin as BirdOrigin,
      originBreeder: bird.originBreeder || "",
      status: bird.status as BirdStatus,
      enclosure: bird.enclosure || "",
      weightGrams: bird.weightGrams ? String(bird.weightGrams) : "",
      notes: bird.notes || "",
    });
    setEditingId(bird.id);
    setView("form");
  };

  const handleSelectSpecies = (sp: typeof ALL_SPECIES[0]) => {
    setForm(prev => ({ ...prev, speciesId: sp.id, speciesName: sp.commonName }));
    setShowSpeciesDropdown(false);
    setSpeciesSearch("");
  };

  const handleSubmit = async () => {
    if (!form.speciesId) return;

    const payload = {
      speciesId: form.speciesId,
      speciesName: form.speciesName,
      ringNumber: form.ringNumber || null,
      sex: form.sex,
      birthDate: form.birthDate ? new Date(form.birthDate) : null,
      mutation: form.mutation || null,
      origin: form.origin,
      originBreeder: form.originBreeder || null,
      status: form.status,
      enclosure: form.enclosure || null,
      weightGrams: form.weightGrams ? parseInt(form.weightGrams) : null,
      notes: form.notes || null,
    };

    if (editingId) {
      await updateMut.mutateAsync({ id: editingId, ...payload });
    } else {
      await createMut.mutateAsync(payload);
    }
    utils.plantel.list.invalidate();
    setView("list");
  };

  const handleDelete = async (id: number) => {
    await deleteMut.mutateAsync({ id });
    utils.plantel.list.invalidate();
    setDeleteConfirm(null);
    if (selectedBirdId === id) {
      setView("list");
      setSelectedBirdId(null);
    }
  };

  const handleViewBird = (bird: typeof birds[0]) => {
    setSelectedBirdId(bird.id);
    setView("detail");
  };

  const selectedBird = useMemo(() => {
    if (!selectedBirdId) return null;
    return birds.find(b => b.id === selectedBirdId) || null;
  }, [birds, selectedBirdId]);

  // === RENDER: LIST VIEW ===
  if (view === "list") {
    return (
      <div className="space-y-5">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white rounded-xl border border-stone-200 p-4 shadow-sm">
            <p className="text-[10px] text-stone-500 font-medium uppercase tracking-wider">Total Aves</p>
            <p className="text-2xl font-bold text-stone-800 mt-1">{stats.total}</p>
          </div>
          <div className="bg-white rounded-xl border border-stone-200 p-4 shadow-sm">
            <p className="text-[10px] text-stone-500 font-medium uppercase tracking-wider">Ativas</p>
            <p className="text-2xl font-bold text-emerald-700 mt-1">{stats.ativos}</p>
          </div>
          <div className="bg-white rounded-xl border border-stone-200 p-4 shadow-sm">
            <p className="text-[10px] text-stone-500 font-medium uppercase tracking-wider">Espécies</p>
            <p className="text-2xl font-bold text-stone-800 mt-1">{stats.speciesCount}</p>
          </div>
        </div>

        {/* Search + Filters + New button */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
            <input
              type="text"
              placeholder="Buscar por espécie, anilha, mutação, recinto..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 rounded-lg border border-stone-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-300"
            />
          </div>
          <div className="flex items-center gap-2">
            <select
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value as BirdStatus | "todos")}
              className="px-3 py-2.5 rounded-lg border border-stone-200 bg-white text-xs font-medium text-stone-600 focus:outline-none focus:ring-2 focus:ring-emerald-200"
            >
              <option value="todos">Todos Status</option>
              {Object.entries(STATUS_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
            <select
              value={filterSpecies}
              onChange={e => setFilterSpecies(e.target.value)}
              className="px-3 py-2.5 rounded-lg border border-stone-200 bg-white text-xs font-medium text-stone-600 focus:outline-none focus:ring-2 focus:ring-emerald-200 max-w-[150px]"
            >
              <option value="todos">Todas Espécies</option>
              {SPECIES_LIST.map(sp => (
                <option key={sp.id} value={sp.id}>{sp.commonName}</option>
              ))}
            </select>
            <button
              onClick={handleNewBird}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-sm transition-all whitespace-nowrap"
            >
              <Plus size={14} />
              Nova Ave
            </button>
          </div>
        </div>

        {/* Bird list */}
        {isLoading ? (
          <div className="text-center py-12 text-stone-400 text-sm">Carregando plantel...</div>
        ) : filteredBirds.length === 0 ? (
          <div className="text-center py-12">
            <Bird size={40} className="mx-auto text-stone-300 mb-3" />
            <p className="text-stone-500 text-sm">
              {birds.length === 0 ? "Nenhuma ave cadastrada ainda" : "Nenhuma ave encontrada com os filtros aplicados"}
            </p>
            {birds.length === 0 && (
              <button onClick={handleNewBird} className="mt-3 text-emerald-600 text-sm font-medium hover:underline">
                Cadastrar primeira ave
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {filteredBirds.map(bird => (
              <div
                key={bird.id}
                onClick={() => handleViewBird(bird)}
                className="bg-white rounded-xl border border-stone-200 p-4 shadow-sm hover:shadow-md hover:border-emerald-200 transition-all cursor-pointer group"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center border border-emerald-100">
                      <Bird size={18} className="text-emerald-600" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-bold text-stone-800">{bird.speciesName}</h4>
                        <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-semibold border", STATUS_COLORS[bird.status as BirdStatus])}>
                          {STATUS_LABELS[bird.status as BirdStatus]}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 mt-0.5">
                        {bird.ringNumber && (
                          <span className="text-[11px] text-stone-500">Anilha: <span className="font-semibold text-stone-700">{bird.ringNumber}</span></span>
                        )}
                        <span className="text-[11px] text-stone-500">{SEX_LABELS[bird.sex as BirdSex]}</span>
                        {bird.mutation && (
                          <span className="text-[11px] text-stone-500">· {bird.mutation}</span>
                        )}
                        {bird.enclosure && (
                          <span className="text-[11px] text-stone-400">· {bird.enclosure}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <ChevronDown size={16} className="text-stone-300 group-hover:text-emerald-400 -rotate-90 transition-colors" />
                </div>
              </div>
            ))}
            <p className="text-center text-[11px] text-stone-400 pt-2">
              {filteredBirds.length} ave{filteredBirds.length !== 1 ? "s" : ""} encontrada{filteredBirds.length !== 1 ? "s" : ""}
            </p>
          </div>
        )}
      </div>
    );
  }

  // === RENDER: FORM VIEW ===
  if (view === "form") {
    return (
      <div className="space-y-5">
        {/* Header */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setView(editingId ? "detail" : "list")}
            className="p-2 rounded-lg hover:bg-stone-100 transition-colors"
          >
            <ArrowLeft size={18} className="text-stone-600" />
          </button>
          <h2 className="text-lg font-bold text-stone-800">
            {editingId ? "Editar Ave" : "Cadastrar Nova Ave"}
          </h2>
        </div>

        {/* Form */}
        <div className="bg-white rounded-xl border border-stone-200 p-6 shadow-sm space-y-5">
          {/* Species selector */}
          <div>
            <label className="block text-xs font-semibold text-stone-600 mb-1.5">
              Espécie <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowSpeciesDropdown(!showSpeciesDropdown)}
                className={cn(
                  "w-full text-left px-4 py-3 rounded-lg border bg-white text-sm transition-all",
                  form.speciesId
                    ? "border-emerald-300 text-stone-800 font-medium"
                    : "border-stone-200 text-stone-400",
                  "focus:outline-none focus:ring-2 focus:ring-emerald-200"
                )}
              >
                {form.speciesName || "Selecione a espécie..."}
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400" />
              </button>

              {showSpeciesDropdown && (
                <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-stone-200 rounded-lg shadow-lg max-h-64 overflow-hidden">
                  <div className="p-2 border-b border-stone-100">
                    <input
                      type="text"
                      placeholder="Buscar espécie..."
                      value={speciesSearch}
                      onChange={e => setSpeciesSearch(e.target.value)}
                      className="w-full px-3 py-2 rounded-md border border-stone-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200"
                      autoFocus
                    />
                  </div>
                  <div className="max-h-48 overflow-y-auto">
                    {filteredSpeciesList.map(sp => (
                      <button
                        key={sp.id}
                        onClick={() => handleSelectSpecies(sp)}
                        className={cn(
                          "w-full text-left px-4 py-2.5 text-sm hover:bg-emerald-50 transition-colors flex items-center justify-between",
                          form.speciesId === sp.id && "bg-emerald-50 font-semibold text-emerald-700"
                        )}
                      >
                        <span>{sp.commonName}</span>
                        <span className="text-[10px] text-stone-400 italic">{sp.scientificName}</span>
                      </button>
                    ))}
                    {filteredSpeciesList.length === 0 && (
                      <p className="px-4 py-3 text-sm text-stone-400">Nenhuma espécie encontrada</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Row: Ring + Sex */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-stone-600 mb-1.5">Número da Anilha</label>
              <input
                type="text"
                value={form.ringNumber}
                onChange={e => setForm(prev => ({ ...prev, ringNumber: e.target.value }))}
                placeholder="Ex: MB-2026-001"
                className="w-full px-4 py-2.5 rounded-lg border border-stone-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-600 mb-1.5">Sexo</label>
              <select
                value={form.sex}
                onChange={e => setForm(prev => ({ ...prev, sex: e.target.value as BirdSex }))}
                className="w-full px-4 py-2.5 rounded-lg border border-stone-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200"
              >
                {Object.entries(SEX_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Row: Birth date + Mutation */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-stone-600 mb-1.5">Data de Nascimento</label>
              <input
                type="date"
                value={form.birthDate}
                onChange={e => setForm(prev => ({ ...prev, birthDate: e.target.value }))}
                className="w-full px-4 py-2.5 rounded-lg border border-stone-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-600 mb-1.5">Mutação / Cor</label>
              <input
                type="text"
                value={form.mutation}
                onChange={e => setForm(prev => ({ ...prev, mutation: e.target.value }))}
                placeholder="Ex: Lutino, Verde Normal, Azul..."
                className="w-full px-4 py-2.5 rounded-lg border border-stone-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200"
              />
            </div>
          </div>

          {/* Row: Origin + Origin Breeder */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-stone-600 mb-1.5">Origem</label>
              <select
                value={form.origin}
                onChange={e => setForm(prev => ({ ...prev, origin: e.target.value as BirdOrigin }))}
                className="w-full px-4 py-2.5 rounded-lg border border-stone-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200"
              >
                {Object.entries(ORIGIN_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
            {(form.origin === "comprado" || form.origin === "troca") && (
              <div>
                <label className="block text-xs font-semibold text-stone-600 mb-1.5">Criatório de Origem</label>
                <input
                  type="text"
                  value={form.originBreeder}
                  onChange={e => setForm(prev => ({ ...prev, originBreeder: e.target.value }))}
                  placeholder="Nome do criatório"
                  className="w-full px-4 py-2.5 rounded-lg border border-stone-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200"
                />
              </div>
            )}
          </div>

          {/* Row: Status + Enclosure */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-stone-600 mb-1.5">Status</label>
              <select
                value={form.status}
                onChange={e => setForm(prev => ({ ...prev, status: e.target.value as BirdStatus }))}
                className="w-full px-4 py-2.5 rounded-lg border border-stone-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200"
              >
                {Object.entries(STATUS_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-600 mb-1.5">Recinto / Viveiro</label>
              <input
                type="text"
                value={form.enclosure}
                onChange={e => setForm(prev => ({ ...prev, enclosure: e.target.value }))}
                placeholder="Ex: Viveiro 1, Berçário, Quarentena..."
                className="w-full px-4 py-2.5 rounded-lg border border-stone-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200"
              />
            </div>
          </div>

          {/* Weight */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-stone-600 mb-1.5">Peso (gramas)</label>
              <input
                type="number"
                value={form.weightGrams}
                onChange={e => setForm(prev => ({ ...prev, weightGrams: e.target.value }))}
                placeholder="Ex: 350"
                className="w-full px-4 py-2.5 rounded-lg border border-stone-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-stone-600 mb-1.5">Observações</label>
            <textarea
              value={form.notes}
              onChange={e => setForm(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Observações sobre a ave..."
              rows={3}
              className="w-full px-4 py-2.5 rounded-lg border border-stone-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200 resize-none"
            />
          </div>

          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={!form.speciesId || createMut.isPending || updateMut.isPending}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:bg-stone-300 text-white font-semibold text-sm shadow-sm transition-all"
          >
            <Save size={16} />
            {editingId ? "Salvar Alterações" : "Cadastrar Ave"}
          </button>
        </div>
      </div>
    );
  }

  // === RENDER: DETAIL VIEW ===
  if (view === "detail" && selectedBird) {
    return (
      <div className="space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => { setView("list"); setSelectedBirdId(null); }}
              className="p-2 rounded-lg hover:bg-stone-100 transition-colors"
            >
              <ArrowLeft size={18} className="text-stone-600" />
            </button>
            <div>
              <h2 className="text-lg font-bold text-stone-800">{selectedBird.speciesName}</h2>
              {selectedBird.ringNumber && (
                <p className="text-xs text-stone-500">Anilha: {selectedBird.ringNumber}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleEditBird(selectedBird)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-stone-200 hover:bg-stone-50 text-stone-600 text-xs font-medium transition-all"
            >
              <Edit2 size={13} />
              Editar
            </button>
            <button
              onClick={() => setDeleteConfirm(selectedBird.id)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-red-200 hover:bg-red-50 text-red-600 text-xs font-medium transition-all"
            >
              <Trash2 size={13} />
              Excluir
            </button>
          </div>
        </div>

        {/* Detail card */}
        <div className="bg-white rounded-xl border border-stone-200 p-6 shadow-sm">
          <div className="flex items-center gap-4 mb-5 pb-5 border-b border-stone-100">
            <div className="w-14 h-14 rounded-full bg-emerald-50 flex items-center justify-center border-2 border-emerald-200">
              <Bird size={28} className="text-emerald-600" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-stone-800">{selectedBird.speciesName}</h3>
              <p className="text-xs text-stone-500 italic">
                {ALL_SPECIES.find(s => s.id === selectedBird.speciesId)?.scientificName || ""}
              </p>
            </div>
            <span className={cn("ml-auto px-3 py-1 rounded-full text-xs font-semibold border", STATUS_COLORS[selectedBird.status as BirdStatus])}>
              {STATUS_LABELS[selectedBird.status as BirdStatus]}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-8">
            <div>
              <p className="text-[10px] text-stone-400 font-medium uppercase tracking-wider">Anilha</p>
              <p className="text-sm font-semibold text-stone-800 mt-0.5">{selectedBird.ringNumber || "—"}</p>
            </div>
            <div>
              <p className="text-[10px] text-stone-400 font-medium uppercase tracking-wider">Sexo</p>
              <p className="text-sm font-semibold text-stone-800 mt-0.5">{SEX_LABELS[selectedBird.sex as BirdSex]}</p>
            </div>
            <div>
              <p className="text-[10px] text-stone-400 font-medium uppercase tracking-wider">Data de Nascimento</p>
              <p className="text-sm font-semibold text-stone-800 mt-0.5">
                {selectedBird.birthDate ? new Date(selectedBird.birthDate).toLocaleDateString("pt-BR") : "—"}
              </p>
            </div>
            <div>
              <p className="text-[10px] text-stone-400 font-medium uppercase tracking-wider">Mutação / Cor</p>
              <p className="text-sm font-semibold text-stone-800 mt-0.5">{selectedBird.mutation || "—"}</p>
            </div>
            <div>
              <p className="text-[10px] text-stone-400 font-medium uppercase tracking-wider">Origem</p>
              <p className="text-sm font-semibold text-stone-800 mt-0.5">{ORIGIN_LABELS[selectedBird.origin as BirdOrigin]}</p>
            </div>
            {selectedBird.originBreeder && (
              <div>
                <p className="text-[10px] text-stone-400 font-medium uppercase tracking-wider">Criatório de Origem</p>
                <p className="text-sm font-semibold text-stone-800 mt-0.5">{selectedBird.originBreeder}</p>
              </div>
            )}
            <div>
              <p className="text-[10px] text-stone-400 font-medium uppercase tracking-wider">Recinto / Viveiro</p>
              <p className="text-sm font-semibold text-stone-800 mt-0.5">{selectedBird.enclosure || "—"}</p>
            </div>
            <div>
              <p className="text-[10px] text-stone-400 font-medium uppercase tracking-wider">Peso</p>
              <p className="text-sm font-semibold text-stone-800 mt-0.5">
                {selectedBird.weightGrams ? `${selectedBird.weightGrams}g` : "—"}
              </p>
            </div>
          </div>

          {selectedBird.notes && (
            <div className="mt-5 pt-4 border-t border-stone-100">
              <p className="text-[10px] text-stone-400 font-medium uppercase tracking-wider mb-1">Observações</p>
              <p className="text-sm text-stone-700 whitespace-pre-wrap">{selectedBird.notes}</p>
            </div>
          )}

          <div className="mt-5 pt-4 border-t border-stone-100">
            <p className="text-[10px] text-stone-400">
              Cadastrado em {new Date(selectedBird.createdAt).toLocaleDateString("pt-BR")} · Atualizado em {new Date(selectedBird.updatedAt).toLocaleDateString("pt-BR")}
            </p>
          </div>
        </div>

        {/* Delete confirmation dialog */}
        {deleteConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
            <div className="bg-white rounded-xl p-6 shadow-xl max-w-sm w-full mx-4">
              <h3 className="text-base font-bold text-stone-800 mb-2">Confirmar Exclusão</h3>
              <p className="text-sm text-stone-600 mb-5">
                Tem certeza que deseja excluir esta ave do plantel? Esta ação não pode ser desfeita.
              </p>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setDeleteConfirm(null)}
                  className="flex-1 px-4 py-2.5 rounded-lg border border-stone-200 text-stone-600 text-sm font-medium hover:bg-stone-50 transition-all"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => handleDelete(deleteConfirm)}
                  className="flex-1 px-4 py-2.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-semibold transition-all"
                >
                  Excluir
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return null;
}
