/**
 * ClientsModule — Módulo de Cadastro de Clientes
 * CRUD completo: listagem, cadastro, edição, exclusão
 * Inclui histórico de compras por cliente
 */
import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import {
  Users,
  Plus,
  Search,
  Phone,
  Mail,
  MapPin,
  Edit2,
  Trash2,
  X,
  ChevronRight,
  ShoppingBag,
  Bird,
  UserCheck,
  UserX,
  Clock,
  Save,
  AlertTriangle,
  CreditCard,
  Calendar,
  CheckCircle2,
  AlertCircle,
  ChevronDown,
} from "lucide-react";

// Species list for interest selection
const SPECIES_LIST = [
  "Ringneck", "Cabeça de Ameixa", "Alexandrino", "Moustache", "Derbiano",
  "Regente", "Príncipe de Gales", "Barraband", "Papagaio Ecletus", "Papagaio do Congo",
  "Periquito King", "Periquito RedWing", "Barnard", "Port Lincoln",
  "Cacatua Alba", "Cacatua Galerita", "Cacatua Goffini", "Cacatua Moluca",
  "Cacatua Ophthalmica", "Cacatua Pastinator", "Cacatua Sulphurea", "Cacatua Galah",
  "Kakariki", "Forpus Celeste", "Forpus Conspicillatus",
  "Neophema Asa Azul", "Turquasine", "Esplêndido", "Bourke",
  "Rosella Adelaide", "Rosella Adscitus", "Rosella da Caledônia", "Rosella Pennat",
  "Rosella Eximius", "Rosella Amarela", "Rosella Icterotis",
  "Lorinho do Senegal", "Periquito Hooded", "Red Rumped",
];

const REFERRAL_SOURCES = [
  "Instagram", "Facebook", "WhatsApp", "Indicação de cliente",
  "Google", "Feira/Evento", "Visita ao criatório", "Outro",
];

const STATES_BR = [
  "AC", "AL", "AM", "AP", "BA", "CE", "DF", "ES", "GO", "MA",
  "MG", "MS", "MT", "PA", "PB", "PE", "PI", "PR", "RJ", "RN",
  "RO", "RR", "RS", "SC", "SE", "SP", "TO",
];

type ClientStatus = "ativo" | "inativo" | "lista_espera";

interface ClientFormData {
  name: string;
  phone: string;
  phone2: string;
  email: string;
  cpf: string;
  address: string;
  city: string;
  state: string;
  cep: string;
  speciesInterest: string[];
  referralSource: string;
  notes: string;
  status: ClientStatus;
}

const emptyForm: ClientFormData = {
  name: "",
  phone: "",
  phone2: "",
  email: "",
  cpf: "",
  address: "",
  city: "",
  state: "",
  cep: "",
  speciesInterest: [],
  referralSource: "",
  notes: "",
  status: "ativo",
};

type PaymentMethod = "pix" | "dinheiro" | "cartao_debito" | "cartao_credito" | "boleto" | "transferencia";

const PAYMENT_METHODS: { value: PaymentMethod; label: string }[] = [
  { value: "pix", label: "PIX" },
  { value: "dinheiro", label: "Dinheiro" },
  { value: "cartao_debito", label: "Cartão Débito" },
  { value: "cartao_credito", label: "Cartão Crédito" },
  { value: "boleto", label: "Boleto" },
  { value: "transferencia", label: "Transferência" },
];

interface InstallmentInput {
  valueCents: number;
  dueDate: string;
}

interface PurchaseFormData {
  species: string;
  birdId: number | null; // ID da ave no plantel (para vincular)
  birdCode: string; // Código da ave (ex: RN001)
  quantity: number;
  valueCents: number | null;
  paymentMethod: PaymentMethod | "";
  installmentsCount: number;
  invoiceNumber: string;
  saleDate: string;
  notes: string;
  installments: InstallmentInput[];
}

const emptyPurchaseForm: PurchaseFormData = {
  species: "",
  birdId: null,
  birdCode: "",
  quantity: 1,
  valueCents: null,
  paymentMethod: "",
  installmentsCount: 1,
  invoiceNumber: "",
  saleDate: new Date().toISOString().split("T")[0],
  notes: "",
  installments: [],
};

// Generate installment dates (30 days apart from sale date)
function generateInstallments(totalCents: number, count: number, startDate: string): InstallmentInput[] {
  const parcels: InstallmentInput[] = [];
  const baseValue = Math.floor(totalCents / count);
  const remainder = totalCents - baseValue * count;
  const start = new Date(startDate);
  for (let i = 0; i < count; i++) {
    const dueDate = new Date(start);
    dueDate.setDate(dueDate.getDate() + 30 * (i + 1));
    parcels.push({
      valueCents: baseValue + (i === 0 ? remainder : 0),
      dueDate: dueDate.toISOString().split("T")[0],
    });
  }
  return parcels;
}

// Payment method label
function getPaymentLabel(method: string | null): string {
  const found = PAYMENT_METHODS.find((m) => m.value === method);
  return found ? found.label : "Não informado";
}

// Installment status badge
function InstallmentStatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; color: string; icon: any }> = {
    pendente: { label: "Pendente", color: "bg-amber-50 text-amber-700 border-amber-200", icon: Clock },
    pago: { label: "Pago", color: "bg-emerald-50 text-emerald-700 border-emerald-200", icon: CheckCircle2 },
    atrasado: { label: "Atrasado", color: "bg-red-50 text-red-700 border-red-200", icon: AlertCircle },
  };
  const { label, color, icon: Icon } = config[status] || config.pendente;
  return (
    <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border", color)}>
      <Icon size={10} />
      {label}
    </span>
  );
}

// Format phone for display
function formatPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 11) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  }
  if (digits.length === 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  return phone;
}

// Format CPF
function formatCpf(cpf: string): string {
  const digits = cpf.replace(/\D/g, "");
  if (digits.length === 11) {
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
  }
  return cpf;
}

// Format currency
function formatCurrency(cents: number): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);
}

// Status badge component
function StatusBadge({ status }: { status: ClientStatus }) {
  const config = {
    ativo: { label: "Ativo", icon: UserCheck, color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
    inativo: { label: "Inativo", icon: UserX, color: "bg-stone-100 text-stone-600 border-stone-200" },
    lista_espera: { label: "Lista de Espera", icon: Clock, color: "bg-amber-50 text-amber-700 border-amber-200" },
  };
  const { label, icon: Icon, color } = config[status];
  return (
    <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border", color)}>
      <Icon size={12} />
      {label}
    </span>
  );
}

export default function ClientsModule() {
  const [view, setView] = useState<"list" | "form" | "detail">("list");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [selectedClientId, setSelectedClientId] = useState<number | null>(null);
  const [formData, setFormData] = useState<ClientFormData>(emptyForm);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<ClientStatus | "todos">("todos");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<number | null>(null);
  const [showPurchaseForm, setShowPurchaseForm] = useState(false);
  const [purchaseForm, setPurchaseForm] = useState<PurchaseFormData>(emptyPurchaseForm);
  const [speciesDropdownOpen, setSpeciesDropdownOpen] = useState(false);
  const [birdFilterSpecies, setBirdFilterSpecies] = useState<string>("todos");
  const [birdFilterMutation, setBirdFilterMutation] = useState<string>("todos");

  // tRPC queries
  const clientsQuery = trpc.cliente.list.useQuery();
  const clientDetailQuery = trpc.cliente.getById.useQuery(
    { id: selectedClientId! },
    { enabled: selectedClientId !== null && view === "detail" }
  );
  // Plantel query for bird selection in purchase form
  const plantelQuery = trpc.plantel.list.useQuery();
  const activeBirds = useMemo(() => {
    return (plantelQuery.data || []).filter(b => b.status === "ativo");
  }, [plantelQuery.data]);

  // Filtered active birds for sale form (by species and mutation)
  const filteredActiveBirds = useMemo(() => {
    let list = activeBirds;
    if (birdFilterSpecies !== "todos") {
      list = list.filter(b => b.speciesId === birdFilterSpecies);
    }
    if (birdFilterMutation !== "todos") {
      list = list.filter(b => b.mutation === birdFilterMutation);
    }
    return list;
  }, [activeBirds, birdFilterSpecies, birdFilterMutation]);

  // Unique species and mutations from active birds for filter dropdowns
  const birdSpeciesOptions = useMemo(() => {
    const map = new Map<string, string>();
    activeBirds.forEach(b => map.set(b.speciesId, b.speciesName));
    return Array.from(map.entries()).sort((a, b) => a[1].localeCompare(b[1]));
  }, [activeBirds]);

  const birdMutationOptions = useMemo(() => {
    let list = activeBirds;
    if (birdFilterSpecies !== "todos") {
      list = list.filter(b => b.speciesId === birdFilterSpecies);
    }
    const mutations = new Set<string>();
    list.forEach(b => { if (b.mutation) mutations.add(b.mutation); });
    return Array.from(mutations).sort();
  }, [activeBirds, birdFilterSpecies]);

  const utils = trpc.useUtils();

  // Mutations
  const createMutation = trpc.cliente.create.useMutation({
    onSuccess: () => {
      utils.cliente.list.invalidate();
      setView("list");
      setFormData(emptyForm);
    },
  });
  const updateMutation = trpc.cliente.update.useMutation({
    onSuccess: () => {
      utils.cliente.list.invalidate();
      utils.cliente.getById.invalidate();
      setView("list");
      setFormData(emptyForm);
      setEditingId(null);
    },
  });
  const deleteMutation = trpc.cliente.delete.useMutation({
    onSuccess: () => {
      utils.cliente.list.invalidate();
      setShowDeleteConfirm(null);
      if (view === "detail") setView("list");
    },
  });
  const updateBirdStatusMut = trpc.plantel.update.useMutation({
    onSuccess: () => {
      utils.plantel.list.invalidate();
    },
  });
  const createPurchaseMutation = trpc.purchase.create.useMutation({
    onSuccess: () => {
      utils.cliente.getById.invalidate();
      // Se uma ave do plantel foi vinculada, atualizar status para "vendido"
      if (purchaseForm.birdId) {
        updateBirdStatusMut.mutate({ id: purchaseForm.birdId, status: "vendido" });
      }
      setShowPurchaseForm(false);
      setPurchaseForm(emptyPurchaseForm);
    },
  });
  const deletePurchaseMutation = trpc.purchase.delete.useMutation({
    onSuccess: () => {
      utils.cliente.getById.invalidate();
    },
  });

  // Filtered clients
  const filteredClients = useMemo(() => {
    if (!clientsQuery.data) return [];
    let list = clientsQuery.data;
    if (statusFilter !== "todos") {
      list = list.filter((c) => c.status === statusFilter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.phone.includes(q) ||
          (c.email && c.email.toLowerCase().includes(q)) ||
          (c.city && c.city.toLowerCase().includes(q)) ||
          (c.cpf && c.cpf.includes(q))
      );
    }
    return list;
  }, [clientsQuery.data, statusFilter, searchQuery]);

  // Handlers
  const handleSubmit = () => {
    if (!formData.name.trim() || !formData.phone.trim()) return;
    const payload = {
      name: formData.name.trim(),
      phone: formData.phone.trim(),
      phone2: formData.phone2.trim() || null,
      email: formData.email.trim() || null,
      cpf: formData.cpf.trim() || null,
      address: formData.address.trim() || null,
      city: formData.city.trim() || null,
      state: formData.state || null,
      cep: formData.cep.trim() || null,
      speciesInterest: formData.speciesInterest.length > 0 ? formData.speciesInterest : null,
      referralSource: formData.referralSource || null,
      notes: formData.notes.trim() || null,
      status: formData.status,
    };
    if (editingId) {
      updateMutation.mutate({ id: editingId, ...payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const handleEdit = (client: any) => {
    setEditingId(client.id);
    setFormData({
      name: client.name,
      phone: client.phone,
      phone2: client.phone2 || "",
      email: client.email || "",
      cpf: client.cpf || "",
      address: client.address || "",
      city: client.city || "",
      state: client.state || "",
      cep: client.cep || "",
      speciesInterest: client.speciesInterest || [],
      referralSource: client.referralSource || "",
      notes: client.notes || "",
      status: client.status,
    });
    setView("form");
  };

  const updateInstallmentMutation = trpc.purchase.updateInstallment.useMutation({
    onSuccess: () => {
      utils.cliente.getById.invalidate();
    },
  });

  const handlePurchaseSubmit = () => {
    if ((!purchaseForm.species.trim() && !purchaseForm.birdId) || !selectedClientId) return;
    const hasInstallments = (purchaseForm.paymentMethod === "cartao_credito" || purchaseForm.paymentMethod === "boleto") && purchaseForm.installmentsCount > 1;
    createPurchaseMutation.mutate({
      clientId: selectedClientId,
      species: purchaseForm.species,
      quantity: purchaseForm.quantity,
      valueCents: purchaseForm.valueCents,
      paymentMethod: purchaseForm.paymentMethod || null,
      installmentsCount: purchaseForm.installmentsCount,
      invoiceNumber: purchaseForm.invoiceNumber.trim() || null,
      saleDate: purchaseForm.saleDate,
      notes: purchaseForm.notes.trim() || null,
      installments: hasInstallments ? purchaseForm.installments : undefined,
    });
  };

  // Auto-generate installments when count or value changes
  const handleInstallmentsChange = (count: number) => {
    const newForm = { ...purchaseForm, installmentsCount: count };
    if (count > 1 && purchaseForm.valueCents && purchaseForm.valueCents > 0) {
      newForm.installments = generateInstallments(purchaseForm.valueCents, count, purchaseForm.saleDate);
    } else {
      newForm.installments = [];
    }
    setPurchaseForm(newForm);
  };

  const toggleSpeciesInterest = (species: string) => {
    setFormData((prev) => ({
      ...prev,
      speciesInterest: prev.speciesInterest.includes(species)
        ? prev.speciesInterest.filter((s) => s !== species)
        : [...prev.speciesInterest, species],
    }));
  };

  // ===== RENDER =====

  // CLIENT DETAIL VIEW
  if (view === "detail" && selectedClientId) {
    const client = clientDetailQuery.data;
    if (clientDetailQuery.isLoading) {
      return (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full" />
        </div>
      );
    }
    if (!client) {
      return (
        <div className="text-center py-20 text-stone-500">
          Cliente não encontrado.
          <button onClick={() => setView("list")} className="ml-2 text-emerald-600 underline">
            Voltar
          </button>
        </div>
      );
    }

    return (
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => setView("list")}
            className="p-2 rounded-lg hover:bg-stone-100 transition-colors"
          >
            <ChevronRight size={18} className="rotate-180 text-stone-500" />
          </button>
          <div className="flex-1">
            <h2 className="text-xl font-bold text-stone-800">{client.name}</h2>
            <div className="flex items-center gap-3 mt-1">
              <StatusBadge status={client.status} />
              <span className="text-xs text-stone-400">
                Cadastrado em {new Date(client.createdAt).toLocaleDateString("pt-BR")}
              </span>
            </div>
          </div>
          <button
            onClick={() => handleEdit(client)}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors"
          >
            <Edit2 size={14} />
            Editar
          </button>
        </div>

        {/* Info cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {/* Contact */}
          <div className="bg-white rounded-xl border border-stone-200 p-5">
            <h3 className="text-sm font-semibold text-stone-700 mb-3 flex items-center gap-2">
              <Phone size={14} className="text-emerald-600" />
              Contato
            </h3>
            <div className="space-y-2 text-sm">
              <p className="text-stone-700">
                <span className="text-stone-400 mr-2">Tel:</span>
                {formatPhone(client.phone)}
              </p>
              {client.phone2 && (
                <p className="text-stone-700">
                  <span className="text-stone-400 mr-2">Tel 2:</span>
                  {formatPhone(client.phone2)}
                </p>
              )}
              {client.email && (
                <p className="text-stone-700">
                  <span className="text-stone-400 mr-2">Email:</span>
                  {client.email}
                </p>
              )}
              {client.cpf && (
                <p className="text-stone-700">
                  <span className="text-stone-400 mr-2">CPF:</span>
                  {formatCpf(client.cpf)}
                </p>
              )}
            </div>
          </div>

          {/* Address */}
          <div className="bg-white rounded-xl border border-stone-200 p-5">
            <h3 className="text-sm font-semibold text-stone-700 mb-3 flex items-center gap-2">
              <MapPin size={14} className="text-emerald-600" />
              Endereço
            </h3>
            <div className="space-y-2 text-sm">
              {client.address && <p className="text-stone-700">{client.address}</p>}
              {(client.city || client.state) && (
                <p className="text-stone-700">
                  {client.city}{client.city && client.state ? " — " : ""}{client.state}
                </p>
              )}
              {client.cep && (
                <p className="text-stone-700">
                  <span className="text-stone-400 mr-2">CEP:</span>
                  {client.cep}
                </p>
              )}
              {!client.address && !client.city && !client.cep && (
                <p className="text-stone-400 italic">Não informado</p>
              )}
            </div>
          </div>

          {/* Species Interest */}
          <div className="bg-white rounded-xl border border-stone-200 p-5">
            <h3 className="text-sm font-semibold text-stone-700 mb-3 flex items-center gap-2">
              <Bird size={14} className="text-emerald-600" />
              Espécies de Interesse
            </h3>
            {client.speciesInterest && client.speciesInterest.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {client.speciesInterest.map((sp: string) => (
                  <span key={sp} className="px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-full text-xs font-medium border border-emerald-100">
                    {sp}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-stone-400 italic text-sm">Nenhuma espécie selecionada</p>
            )}
          </div>

          {/* Notes */}
          <div className="bg-white rounded-xl border border-stone-200 p-5">
            <h3 className="text-sm font-semibold text-stone-700 mb-3">Observações</h3>
            {client.notes ? (
              <p className="text-sm text-stone-600 whitespace-pre-wrap">{client.notes}</p>
            ) : (
              <p className="text-stone-400 italic text-sm">Sem observações</p>
            )}
            {client.referralSource && (
              <p className="text-xs text-stone-400 mt-3 pt-3 border-t border-stone-100">
                Conheceu por: <span className="text-stone-600">{client.referralSource}</span>
              </p>
            )}
          </div>
        </div>

        {/* Purchase History */}
        <div className="bg-white rounded-xl border border-stone-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-stone-700 flex items-center gap-2">
              <ShoppingBag size={14} className="text-emerald-600" />
              Histórico de Compras
              {client.purchases && client.purchases.length > 0 && (
                <span className="ml-2 px-2 py-0.5 bg-stone-100 rounded-full text-xs text-stone-500">
                  {client.purchases.length}
                </span>
              )}
            </h3>
            <button
              onClick={() => setShowPurchaseForm(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-lg text-xs font-medium hover:bg-emerald-100 transition-colors border border-emerald-200"
            >
              <Plus size={12} />
              Nova Venda
            </button>
          </div>

          {/* Purchase form */}
          {showPurchaseForm && (
            <div className="mb-4 p-4 bg-stone-50 rounded-lg border border-stone-200">
              <h4 className="text-sm font-semibold text-stone-700 mb-3 flex items-center gap-2">
                <CreditCard size={14} className="text-emerald-600" />
                Nova Venda
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="text-xs font-medium text-stone-600 mb-1 block">Ave do Plantel *</label>
                  {/* Filtros de espécie e mutação */}
                  <div className="flex items-center gap-2 mb-2">
                    <select
                      value={birdFilterSpecies}
                      onChange={e => { setBirdFilterSpecies(e.target.value); setBirdFilterMutation("todos"); }}
                      className="px-2.5 py-1.5 border border-stone-200 rounded-lg text-xs bg-white text-stone-600"
                    >
                      <option value="todos">Todas Espécies</option>
                      {birdSpeciesOptions.map(([id, name]) => (
                        <option key={id} value={id}>{name}</option>
                      ))}
                    </select>
                    <select
                      value={birdFilterMutation}
                      onChange={e => setBirdFilterMutation(e.target.value)}
                      className="px-2.5 py-1.5 border border-stone-200 rounded-lg text-xs bg-white text-stone-600"
                    >
                      <option value="todos">Todas Mutações</option>
                      {birdMutationOptions.map(m => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>
                    <span className="text-[10px] text-stone-400">
                      {filteredActiveBirds.length} disponíve{filteredActiveBirds.length !== 1 ? "is" : "l"}
                    </span>
                  </div>
                  <select
                    value={purchaseForm.birdId ? String(purchaseForm.birdId) : ""}
                    onChange={(e) => {
                      const birdId = e.target.value ? parseInt(e.target.value) : null;
                      const bird = activeBirds.find(b => b.id === birdId);
                      setPurchaseForm((p) => ({
                        ...p,
                        birdId,
                        birdCode: bird?.ringNumber || "",
                        species: bird?.speciesName || "",
                      }));
                    }}
                    className="w-full px-3 py-2 border border-stone-200 rounded-lg text-sm bg-white"
                  >
                    <option value="">Selecione a ave...</option>
                    {filteredActiveBirds.map((bird) => (
                      <option key={bird.id} value={String(bird.id)}>
                        {bird.ringNumber ? `${bird.ringNumber} — ` : ""}{bird.speciesName}{bird.mutation ? ` (${bird.mutation})` : ""}
                      </option>
                    ))}
                  </select>
                  {purchaseForm.birdCode && (
                    <p className="text-[10px] text-emerald-600 mt-0.5 font-medium">
                      Código: {purchaseForm.birdCode} · Status será atualizado para "Vendido"
                    </p>
                  )}
                </div>
                <div>
                  <label className="text-xs font-medium text-stone-600 mb-1 block">Quantidade</label>
                  <input
                    type="number"
                    min={1}
                    value={purchaseForm.quantity}
                    onChange={(e) => setPurchaseForm((p) => ({ ...p, quantity: parseInt(e.target.value) || 1 }))}
                    className="w-full px-3 py-2 border border-stone-200 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-stone-600 mb-1 block">Valor Total (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    min={0}
                    placeholder="0,00"
                    value={purchaseForm.valueCents !== null ? (purchaseForm.valueCents / 100).toFixed(2) : ""}
                    onChange={(e) => {
                      const val = e.target.value ? Math.round(parseFloat(e.target.value) * 100) : null;
                      const newForm = { ...purchaseForm, valueCents: val };
                      // Regenerate installments if needed
                      if (val && newForm.installmentsCount > 1) {
                        newForm.installments = generateInstallments(val, newForm.installmentsCount, newForm.saleDate);
                      }
                      setPurchaseForm(newForm);
                    }}
                    className="w-full px-3 py-2 border border-stone-200 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-stone-600 mb-1 block">Data da Venda</label>
                  <input
                    type="date"
                    value={purchaseForm.saleDate}
                    onChange={(e) => {
                      const newForm = { ...purchaseForm, saleDate: e.target.value };
                      if (newForm.valueCents && newForm.installmentsCount > 1) {
                        newForm.installments = generateInstallments(newForm.valueCents, newForm.installmentsCount, e.target.value);
                      }
                      setPurchaseForm(newForm);
                    }}
                    className="w-full px-3 py-2 border border-stone-200 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-stone-600 mb-1 block">Forma de Pagamento</label>
                  <select
                    value={purchaseForm.paymentMethod}
                    onChange={(e) => {
                      const method = e.target.value as PaymentMethod | "";
                      const newForm = { ...purchaseForm, paymentMethod: method };
                      // Reset installments if not credit/boleto
                      if (method !== "cartao_credito" && method !== "boleto") {
                        newForm.installmentsCount = 1;
                        newForm.installments = [];
                      }
                      setPurchaseForm(newForm);
                    }}
                    className="w-full px-3 py-2 border border-stone-200 rounded-lg text-sm bg-white"
                  >
                    <option value="">Selecione...</option>
                    {PAYMENT_METHODS.map((m) => (
                      <option key={m.value} value={m.value}>{m.label}</option>
                    ))}
                  </select>
                </div>
                {/* Installments count - only for credit card or boleto */}
                {(purchaseForm.paymentMethod === "cartao_credito" || purchaseForm.paymentMethod === "boleto") && (
                  <div>
                    <label className="text-xs font-medium text-stone-600 mb-1 block">Parcelas</label>
                    <select
                      value={purchaseForm.installmentsCount}
                      onChange={(e) => handleInstallmentsChange(parseInt(e.target.value))}
                      className="w-full px-3 py-2 border border-stone-200 rounded-lg text-sm bg-white"
                    >
                      {Array.from({ length: 12 }, (_, i) => i + 1).map((n) => (
                        <option key={n} value={n}>{n}x{purchaseForm.valueCents ? ` de ${formatCurrency(Math.floor(purchaseForm.valueCents / n))}` : ""}</option>
                      ))}
                    </select>
                  </div>
                )}
                <div>
                  <label className="text-xs font-medium text-stone-600 mb-1 block">Nota Fiscal</label>
                  <input
                    type="text"
                    placeholder="Número da NF"
                    value={purchaseForm.invoiceNumber}
                    onChange={(e) => setPurchaseForm((p) => ({ ...p, invoiceNumber: e.target.value }))}
                    className="w-full px-3 py-2 border border-stone-200 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-stone-600 mb-1 block">Observações</label>
                  <input
                    type="text"
                    placeholder="Observações da venda"
                    value={purchaseForm.notes}
                    onChange={(e) => setPurchaseForm((p) => ({ ...p, notes: e.target.value }))}
                    className="w-full px-3 py-2 border border-stone-200 rounded-lg text-sm"
                  />
                </div>
              </div>

              {/* Installments preview */}
              {purchaseForm.installments.length > 1 && (
                <div className="mt-4 p-3 bg-white rounded-lg border border-stone-200">
                  <h5 className="text-xs font-semibold text-stone-600 mb-2 flex items-center gap-1.5">
                    <Calendar size={12} />
                    Parcelas ({purchaseForm.installments.length}x)
                  </h5>
                  <div className="space-y-1.5">
                    {purchaseForm.installments.map((inst, idx) => (
                      <div key={idx} className="flex items-center justify-between text-xs">
                        <span className="text-stone-600">
                          {idx + 1}ª parcela
                        </span>
                        <div className="flex items-center gap-3">
                          <input
                            type="date"
                            value={inst.dueDate}
                            onChange={(e) => {
                              const newInstallments = [...purchaseForm.installments];
                              newInstallments[idx] = { ...newInstallments[idx], dueDate: e.target.value };
                              setPurchaseForm((p) => ({ ...p, installments: newInstallments }));
                            }}
                            className="px-2 py-1 border border-stone-200 rounded text-xs"
                          />
                          <span className="font-semibold text-stone-700 min-w-[80px] text-right">
                            {formatCurrency(inst.valueCents)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex items-center gap-2 mt-3">
                <button
                  onClick={handlePurchaseSubmit}
                  disabled={!purchaseForm.species || createPurchaseMutation.isPending}
                  className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-50 transition-colors"
                >
                  <Save size={14} />
                  Registrar Venda
                </button>
                <button
                  onClick={() => { setShowPurchaseForm(false); setPurchaseForm(emptyPurchaseForm); }}
                  className="px-4 py-2 text-stone-500 hover:text-stone-700 text-sm"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}

          {/* Purchase list */}
          {client.purchases && client.purchases.length > 0 ? (
            <div className="space-y-3">
              {client.purchases.map((p: any) => (
                <div key={p.id} className="p-4 bg-stone-50 rounded-lg border border-stone-100">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-emerald-50 flex items-center justify-center">
                        <Bird size={14} className="text-emerald-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-stone-700">
                          {p.quantity}x {p.species}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs text-stone-400">
                            {new Date(p.saleDate).toLocaleDateString("pt-BR")}
                          </span>
                          {p.paymentMethod && (
                            <span className="text-xs px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full border border-blue-100 font-medium">
                              {getPaymentLabel(p.paymentMethod)}
                            </span>
                          )}
                          {p.installments && p.installments > 1 && (
                            <span className="text-xs text-stone-500">
                              {p.installments}x
                            </span>
                          )}
                          {p.invoiceNumber && (
                            <span className="text-xs text-stone-400">
                              NF {p.invoiceNumber}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {p.valueCents && (
                        <span className="text-sm font-semibold text-emerald-700">
                          {formatCurrency(p.valueCents)}
                        </span>
                      )}
                      <button
                        onClick={() => deletePurchaseMutation.mutate({ id: p.id })}
                        className="p-1.5 text-stone-400 hover:text-red-500 transition-colors"
                        title="Excluir venda"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>

                  {/* Installments table */}
                  {p.parcelas && p.parcelas.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-stone-200">
                      <h5 className="text-xs font-semibold text-stone-600 mb-2 flex items-center gap-1.5">
                        <Calendar size={11} />
                        Parcelas
                      </h5>
                      <div className="space-y-1.5">
                        {(p.parcelas as any[]).map((inst: any) => (
                          <div key={inst.id} className="flex items-center justify-between text-xs bg-white p-2 rounded border border-stone-100">
                            <div className="flex items-center gap-2">
                              <span className="text-stone-500 font-medium w-16">
                                {inst.installmentNumber}ª parcela
                              </span>
                              <span className="text-stone-400">
                                Venc: {new Date(inst.dueDate).toLocaleDateString("pt-BR")}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-stone-700">
                                {formatCurrency(inst.valueCents)}
                              </span>
                              <InstallmentStatusBadge status={inst.status} />
                              {inst.status !== "pago" && (
                                <button
                                  onClick={() => updateInstallmentMutation.mutate({
                                    id: inst.id,
                                    status: "pago",
                                    paidAt: new Date().toISOString(),
                                  })}
                                  className="px-2 py-0.5 text-[10px] font-medium bg-emerald-50 text-emerald-700 rounded border border-emerald-200 hover:bg-emerald-100 transition-colors"
                                  title="Marcar como pago"
                                >
                                  Pagar
                                </button>
                              )}
                              {inst.status === "pago" && (
                                <button
                                  onClick={() => updateInstallmentMutation.mutate({
                                    id: inst.id,
                                    status: "pendente",
                                    paidAt: null,
                                  })}
                                  className="px-2 py-0.5 text-[10px] font-medium bg-stone-50 text-stone-500 rounded border border-stone-200 hover:bg-stone-100 transition-colors"
                                  title="Desfazer pagamento"
                                >
                                  Desfazer
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-stone-400 italic text-sm text-center py-4">Nenhuma compra registrada</p>
          )}
        </div>
      </div>
    );
  }

  // CLIENT FORM VIEW
  if (view === "form") {
    return (
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => { setView("list"); setFormData(emptyForm); setEditingId(null); }}
            className="p-2 rounded-lg hover:bg-stone-100 transition-colors"
          >
            <ChevronRight size={18} className="rotate-180 text-stone-500" />
          </button>
          <h2 className="text-xl font-bold text-stone-800">
            {editingId ? "Editar Cliente" : "Novo Cliente"}
          </h2>
        </div>

        <div className="bg-white rounded-xl border border-stone-200 shadow-sm p-6">
          {/* Personal Info */}
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-stone-700 mb-4 pb-2 border-b border-stone-100">
              Dados Pessoais
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="text-xs font-medium text-stone-600 mb-1 block">Nome Completo *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData((f) => ({ ...f, name: e.target.value }))}
                  placeholder="Nome do cliente"
                  className="w-full px-4 py-2.5 border border-stone-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-200 focus:border-emerald-400 outline-none transition-all"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-stone-600 mb-1 block">CPF</label>
                <input
                  type="text"
                  value={formData.cpf}
                  onChange={(e) => setFormData((f) => ({ ...f, cpf: e.target.value }))}
                  placeholder="000.000.000-00"
                  maxLength={14}
                  className="w-full px-4 py-2.5 border border-stone-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-200 focus:border-emerald-400 outline-none transition-all"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-stone-600 mb-1 block">Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData((f) => ({ ...f, status: e.target.value as ClientStatus }))}
                  className="w-full px-4 py-2.5 border border-stone-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-200 focus:border-emerald-400 outline-none transition-all bg-white"
                >
                  <option value="ativo">Ativo</option>
                  <option value="inativo">Inativo</option>
                  <option value="lista_espera">Lista de Espera</option>
                </select>
              </div>
            </div>
          </div>

          {/* Contact */}
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-stone-700 mb-4 pb-2 border-b border-stone-100">
              Contato
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-stone-600 mb-1 block">Telefone (WhatsApp) *</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData((f) => ({ ...f, phone: e.target.value }))}
                  placeholder="(00) 00000-0000"
                  className="w-full px-4 py-2.5 border border-stone-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-200 focus:border-emerald-400 outline-none transition-all"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-stone-600 mb-1 block">Telefone 2</label>
                <input
                  type="tel"
                  value={formData.phone2}
                  onChange={(e) => setFormData((f) => ({ ...f, phone2: e.target.value }))}
                  placeholder="(00) 00000-0000"
                  className="w-full px-4 py-2.5 border border-stone-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-200 focus:border-emerald-400 outline-none transition-all"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="text-xs font-medium text-stone-600 mb-1 block">Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData((f) => ({ ...f, email: e.target.value }))}
                  placeholder="email@exemplo.com"
                  className="w-full px-4 py-2.5 border border-stone-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-200 focus:border-emerald-400 outline-none transition-all"
                />
              </div>
            </div>
          </div>

          {/* Address */}
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-stone-700 mb-4 pb-2 border-b border-stone-100">
              Endereço
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="text-xs font-medium text-stone-600 mb-1 block">Endereço</label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData((f) => ({ ...f, address: e.target.value }))}
                  placeholder="Rua, número, bairro"
                  className="w-full px-4 py-2.5 border border-stone-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-200 focus:border-emerald-400 outline-none transition-all"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-stone-600 mb-1 block">Cidade</label>
                <input
                  type="text"
                  value={formData.city}
                  onChange={(e) => setFormData((f) => ({ ...f, city: e.target.value }))}
                  placeholder="Cidade"
                  className="w-full px-4 py-2.5 border border-stone-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-200 focus:border-emerald-400 outline-none transition-all"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-stone-600 mb-1 block">Estado</label>
                  <select
                    value={formData.state}
                    onChange={(e) => setFormData((f) => ({ ...f, state: e.target.value }))}
                    className="w-full px-3 py-2.5 border border-stone-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-200 focus:border-emerald-400 outline-none transition-all bg-white"
                  >
                    <option value="">UF</option>
                    {STATES_BR.map((uf) => (
                      <option key={uf} value={uf}>{uf}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-stone-600 mb-1 block">CEP</label>
                  <input
                    type="text"
                    value={formData.cep}
                    onChange={(e) => setFormData((f) => ({ ...f, cep: e.target.value }))}
                    placeholder="00000-000"
                    maxLength={9}
                    className="w-full px-3 py-2.5 border border-stone-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-200 focus:border-emerald-400 outline-none transition-all"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Species Interest */}
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-stone-700 mb-4 pb-2 border-b border-stone-100">
              Espécies de Interesse
            </h3>
            <div className="relative">
              <button
                onClick={() => setSpeciesDropdownOpen(!speciesDropdownOpen)}
                className="w-full px-4 py-2.5 border border-stone-200 rounded-lg text-sm text-left bg-white hover:border-stone-300 transition-colors flex items-center justify-between"
              >
                <span className={formData.speciesInterest.length > 0 ? "text-stone-700" : "text-stone-400"}>
                  {formData.speciesInterest.length > 0
                    ? `${formData.speciesInterest.length} espécie(s) selecionada(s)`
                    : "Selecione as espécies..."}
                </span>
                <ChevronRight size={14} className={cn("text-stone-400 transition-transform", speciesDropdownOpen && "rotate-90")} />
              </button>
              {speciesDropdownOpen && (
                <div className="absolute z-20 mt-1 w-full bg-white border border-stone-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                  {SPECIES_LIST.map((sp) => (
                    <button
                      key={sp}
                      onClick={() => toggleSpeciesInterest(sp)}
                      className={cn(
                        "w-full px-4 py-2 text-left text-sm hover:bg-stone-50 transition-colors flex items-center gap-2",
                        formData.speciesInterest.includes(sp) && "bg-emerald-50 text-emerald-700"
                      )}
                    >
                      <div className={cn(
                        "w-4 h-4 rounded border flex items-center justify-center",
                        formData.speciesInterest.includes(sp)
                          ? "bg-emerald-500 border-emerald-500"
                          : "border-stone-300"
                      )}>
                        {formData.speciesInterest.includes(sp) && (
                          <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                      {sp}
                    </button>
                  ))}
                </div>
              )}
            </div>
            {formData.speciesInterest.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-3">
                {formData.speciesInterest.map((sp) => (
                  <span
                    key={sp}
                    className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-full text-xs font-medium border border-emerald-100"
                  >
                    {sp}
                    <button onClick={() => toggleSpeciesInterest(sp)} className="hover:text-emerald-900">
                      <X size={11} />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Referral & Notes */}
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-stone-700 mb-4 pb-2 border-b border-stone-100">
              Informações Adicionais
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-stone-600 mb-1 block">Como conheceu o criatório</label>
                <select
                  value={formData.referralSource}
                  onChange={(e) => setFormData((f) => ({ ...f, referralSource: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-stone-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-200 focus:border-emerald-400 outline-none transition-all bg-white"
                >
                  <option value="">Selecione...</option>
                  {REFERRAL_SOURCES.map((src) => (
                    <option key={src} value={src}>{src}</option>
                  ))}
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="text-xs font-medium text-stone-600 mb-1 block">Observações</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData((f) => ({ ...f, notes: e.target.value }))}
                  placeholder="Anotações sobre o cliente..."
                  rows={3}
                  className="w-full px-4 py-2.5 border border-stone-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-200 focus:border-emerald-400 outline-none transition-all resize-none"
                />
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 pt-4 border-t border-stone-100">
            <button
              onClick={handleSubmit}
              disabled={!formData.name.trim() || !formData.phone.trim() || createMutation.isPending || updateMutation.isPending}
              className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-50 transition-colors"
            >
              <Save size={14} />
              {editingId ? "Salvar Alterações" : "Cadastrar Cliente"}
            </button>
            <button
              onClick={() => { setView("list"); setFormData(emptyForm); setEditingId(null); }}
              className="px-6 py-2.5 text-stone-500 hover:text-stone-700 text-sm font-medium transition-colors"
            >
              Cancelar
            </button>
          </div>
        </div>
      </div>
    );
  }

  // CLIENT LIST VIEW (default)
  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl font-bold text-stone-800 flex items-center gap-2">
            <Users size={20} className="text-emerald-600" />
            Cadastro de Clientes
          </h2>
          <p className="text-sm text-stone-500 mt-1">
            {clientsQuery.data?.length ?? 0} cliente(s) cadastrado(s)
          </p>
        </div>
        <button
          onClick={() => { setFormData(emptyForm); setEditingId(null); setView("form"); }}
          className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors shadow-sm"
        >
          <Plus size={15} />
          Novo Cliente
        </button>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por nome, telefone, email, cidade ou CPF..."
            className="w-full pl-10 pr-4 py-2.5 border border-stone-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-emerald-200 focus:border-emerald-400 outline-none transition-all"
          />
        </div>
        <div className="flex gap-1 bg-white border border-stone-200 rounded-lg p-1">
          {(["todos", "ativo", "inativo", "lista_espera"] as const).map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={cn(
                "px-3 py-1.5 rounded-md text-xs font-medium transition-all",
                statusFilter === status
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "text-stone-500 hover:text-stone-700 hover:bg-stone-50"
              )}
            >
              {status === "todos" ? "Todos" : status === "ativo" ? "Ativos" : status === "inativo" ? "Inativos" : "Espera"}
            </button>
          ))}
        </div>
      </div>

      {/* Client List */}
      {clientsQuery.isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full" />
        </div>
      ) : filteredClients.length === 0 ? (
        <div className="bg-white rounded-xl border border-stone-200 shadow-sm p-10 text-center">
          <div className="w-14 h-14 rounded-full bg-stone-100 flex items-center justify-center mx-auto mb-4">
            <Users className="w-6 h-6 text-stone-400" />
          </div>
          <h3 className="text-base font-semibold text-stone-700 mb-1">
            {searchQuery || statusFilter !== "todos" ? "Nenhum cliente encontrado" : "Nenhum cliente cadastrado"}
          </h3>
          <p className="text-stone-500 text-sm">
            {searchQuery || statusFilter !== "todos"
              ? "Tente alterar os filtros de busca."
              : "Clique em \"Novo Cliente\" para começar."}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredClients.map((client) => (
            <div
              key={client.id}
              className="bg-white rounded-xl border border-stone-200 hover:border-emerald-200 hover:shadow-sm transition-all p-4 cursor-pointer group"
              onClick={() => { setSelectedClientId(client.id); setView("detail"); }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  {/* Avatar */}
                  <div className="w-10 h-10 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center shrink-0">
                    <span className="text-sm font-bold text-emerald-700">
                      {client.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  {/* Info */}
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-semibold text-stone-800 group-hover:text-emerald-700 transition-colors">
                        {client.name}
                      </h4>
                      <StatusBadge status={client.status} />
                    </div>
                    <div className="flex items-center gap-4 mt-1 text-xs text-stone-500">
                      <span className="flex items-center gap-1">
                        <Phone size={11} />
                        {formatPhone(client.phone)}
                      </span>
                      {client.city && (
                        <span className="flex items-center gap-1">
                          <MapPin size={11} />
                          {client.city}{client.state ? ` — ${client.state}` : ""}
                        </span>
                      )}
                      {client.email && (
                        <span className="hidden md:flex items-center gap-1">
                          <Mail size={11} />
                          {client.email}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                {/* Actions */}
                <div className="flex items-center gap-1">
                  {client.speciesInterest && client.speciesInterest.length > 0 && (
                    <span className="hidden sm:flex items-center gap-1 px-2 py-1 bg-emerald-50 rounded-full text-xs text-emerald-600 mr-2">
                      <Bird size={11} />
                      {client.speciesInterest.length}
                    </span>
                  )}
                  <button
                    onClick={(e) => { e.stopPropagation(); handleEdit(client); }}
                    className="p-2 text-stone-400 hover:text-emerald-600 transition-colors rounded-lg hover:bg-emerald-50"
                    title="Editar"
                  >
                    <Edit2 size={14} />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); setShowDeleteConfirm(client.id); }}
                    className="p-2 text-stone-400 hover:text-red-500 transition-colors rounded-lg hover:bg-red-50"
                    title="Excluir"
                  >
                    <Trash2 size={14} />
                  </button>
                  <ChevronRight size={16} className="text-stone-300 ml-1" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {showDeleteConfirm !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-xl border border-stone-200 shadow-xl p-6 max-w-sm w-full mx-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center">
                <AlertTriangle size={18} className="text-red-500" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-stone-800">Excluir Cliente</h3>
                <p className="text-xs text-stone-500">Esta ação não pode ser desfeita</p>
              </div>
            </div>
            <p className="text-sm text-stone-600 mb-5">
              Tem certeza que deseja excluir este cliente? Todo o histórico de compras também será removido.
            </p>
            <div className="flex items-center gap-3">
              <button
                onClick={() => deleteMutation.mutate({ id: showDeleteConfirm })}
                disabled={deleteMutation.isPending}
                className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50 transition-colors"
              >
                Excluir
              </button>
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className="flex-1 px-4 py-2.5 border border-stone-200 text-stone-600 rounded-lg text-sm font-medium hover:bg-stone-50 transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
