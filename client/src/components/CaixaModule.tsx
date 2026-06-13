/**
 * CaixaModule — Controle Financeiro do Criatório
 * Dashboard com saldo, entradas e saídas
 * Formulário de lançamento (Aporte, Venda, Despesa)
 * Listagem de transações com filtros (tipo, período, categoria)
 */
import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import {
  DollarSign, Plus, Search, Edit2, Trash2, ArrowLeft, Save,
  Filter, TrendingUp, TrendingDown, Wallet, ArrowUpCircle, ArrowDownCircle,
  Calendar, X, BarChart3, Download, FileText
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Bar, BarChart, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { generateFinancialPdf } from "@/lib/financialPdf";

// Types
type TransactionType = "aporte" | "venda" | "despesa";
type View = "list" | "form" | "detail";
type PeriodFilter = "todos" | "hoje" | "semana" | "mes" | "ano" | "custom";

// Categories per type
const CATEGORIES: Record<TransactionType, string[]> = {
  aporte: ["Investimento Pessoal", "Empréstimo", "Prêmio", "Outro"],
  venda: ["Venda de Ave", "Venda de Filhote", "Venda de Ovo", "Consultoria", "Outro"],
  despesa: [
    "Ração", "Medicamentos", "Veterinário", "Equipamentos", "Manutenção",
    "Energia Elétrica", "Água", "Transporte", "Documentação / IBAMA",
    "Alimentação (Frutas/Verduras)", "Suplementos", "Gaiolas / Viveiros",
    "Funcionário", "Impostos / Taxas", "Outro"
  ],
};

const TYPE_LABELS: Record<TransactionType, string> = {
  aporte: "Aporte",
  venda: "Venda",
  despesa: "Despesa",
};

const TYPE_COLORS: Record<TransactionType, { bg: string; text: string; border: string; icon: string }> = {
  aporte: { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200", icon: "text-blue-600" },
  venda: { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200", icon: "text-emerald-600" },
  despesa: { bg: "bg-red-50", text: "text-red-700", border: "border-red-200", icon: "text-red-600" },
};

const PAYMENT_METHODS = [
  { id: "pix", label: "PIX" },
  { id: "dinheiro", label: "Dinheiro" },
  { id: "cartao_debito", label: "Cartão Débito" },
  { id: "cartao_credito", label: "Cartão Crédito" },
  { id: "boleto", label: "Boleto" },
  { id: "transferencia", label: "Transferência" },
];

interface TransactionForm {
  type: TransactionType;
  category: string;
  description: string;
  valueCents: number;
  valueDisplay: string;
  transactionDate: string;
  paymentMethod: string;
  reference: string;
  notes: string;
}

const EMPTY_FORM: TransactionForm = {
  type: "despesa",
  category: "",
  description: "",
  valueCents: 0,
  valueDisplay: "",
  transactionDate: new Date().toISOString().split("T")[0],
  paymentMethod: "",
  reference: "",
  notes: "",
};

function formatCurrency(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function parseCurrencyInput(value: string): number {
  // Remove everything except digits and comma/dot
  const cleaned = value.replace(/[^\d,]/g, "");
  const parts = cleaned.split(",");
  const intPart = parts[0] || "0";
  const decPart = (parts[1] || "00").substring(0, 2).padEnd(2, "0");
  return parseInt(intPart + decPart, 10) || 0;
}

export default function CaixaModule() {
  const [view, setView] = useState<View>("list");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [form, setForm] = useState<TransactionForm>(EMPTY_FORM);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<TransactionType | "todos">("todos");
  const [filterPeriod, setFilterPeriod] = useState<PeriodFilter>("mes");
  const [filterCategory, setFilterCategory] = useState<string>("todos");
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);

  // tRPC
  const { data: transactions = [], isLoading } = trpc.caixa.list.useQuery();
  const createMut = trpc.caixa.create.useMutation();
  const updateMut = trpc.caixa.update.useMutation();
  const deleteMut = trpc.caixa.delete.useMutation();
  const utils = trpc.useUtils();

  // Filtered transactions
  const filteredTransactions = useMemo(() => {
    const now = new Date();
    return transactions.filter(t => {
      // Type filter
      if (filterType !== "todos" && t.type !== filterType) return false;
      // Category filter
      if (filterCategory !== "todos" && t.category !== filterCategory) return false;
      // Search filter
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        const matchesDesc = t.description?.toLowerCase().includes(term);
        const matchesCat = t.category.toLowerCase().includes(term);
        const matchesRef = t.reference?.toLowerCase().includes(term);
        const matchesNotes = t.notes?.toLowerCase().includes(term);
        if (!matchesDesc && !matchesCat && !matchesRef && !matchesNotes) return false;
      }
      // Period filter
      if (filterPeriod !== "todos") {
        const tDate = new Date(t.transactionDate);
        if (filterPeriod === "hoje") {
          if (tDate.toDateString() !== now.toDateString()) return false;
        } else if (filterPeriod === "semana") {
          const weekAgo = new Date(now);
          weekAgo.setDate(weekAgo.getDate() - 7);
          if (tDate < weekAgo) return false;
        } else if (filterPeriod === "mes") {
          if (tDate.getMonth() !== now.getMonth() || tDate.getFullYear() !== now.getFullYear()) return false;
        } else if (filterPeriod === "ano") {
          if (tDate.getFullYear() !== now.getFullYear()) return false;
        }
      }
      return true;
    });
  }, [transactions, filterType, filterPeriod, filterCategory, searchTerm]);

  // Summary stats (from filtered transactions)
  const stats = useMemo(() => {
    let entradas = 0;
    let saidas = 0;
    for (const t of filteredTransactions) {
      if (t.type === "aporte" || t.type === "venda") {
        entradas += t.valueCents;
      } else {
        saidas += t.valueCents;
      }
    }
    return { entradas, saidas, saldo: entradas - saidas };
  }, [filteredTransactions]);

  // All-time balance
  const totalBalance = useMemo(() => {
    let entradas = 0;
    let saidas = 0;
    for (const t of transactions) {
      if (t.type === "aporte" || t.type === "venda") {
        entradas += t.valueCents;
      } else {
        saidas += t.valueCents;
      }
    }
    return entradas - saidas;
  }, [transactions]);

  // All categories from current transactions (for filter)
  const allCategories = useMemo(() => {
    const cats = new Set<string>();
    transactions.forEach(t => cats.add(t.category));
    return Array.from(cats).sort();
  }, [transactions]);

  // Daily chart data for current month
  const dailyData = useMemo(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const days: { day: number; label: string; entradas: number; saidas: number }[] = [];
    for (let d = 1; d <= daysInMonth; d++) {
      days.push({ day: d, label: String(d), entradas: 0, saidas: 0 });
    }
    for (const t of transactions) {
      const tDate = new Date(t.transactionDate);
      if (tDate.getFullYear() === year && tDate.getMonth() === month) {
        const dayIdx = tDate.getDate() - 1;
        if (dayIdx >= 0 && dayIdx < days.length) {
          if (t.type === "aporte" || t.type === "venda") {
            days[dayIdx].entradas += t.valueCents;
          } else {
            days[dayIdx].saidas += t.valueCents;
          }
        }
      }
    }
    return days;
  }, [transactions]);

  const currentMonthLabel = useMemo(() => {
    const now = new Date();
    return now.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  }, []);

  const [showChart, setShowChart] = useState(true);

  // Handlers
  const handleNewTransaction = (type?: TransactionType) => {
    setForm({ ...EMPTY_FORM, type: type || "despesa" });
    setEditingId(null);
    setView("form");
  };

  const handleEditTransaction = (t: typeof transactions[0]) => {
    setForm({
      type: t.type as TransactionType,
      category: t.category,
      description: t.description || "",
      valueCents: t.valueCents,
      valueDisplay: (t.valueCents / 100).toFixed(2).replace(".", ","),
      transactionDate: new Date(t.transactionDate).toISOString().split("T")[0],
      paymentMethod: t.paymentMethod || "",
      reference: t.reference || "",
      notes: t.notes || "",
    });
    setEditingId(t.id);
    setView("form");
  };

  const handleSubmit = async () => {
    if (!form.category || form.valueCents <= 0) return;
    const payload = {
      type: form.type,
      category: form.category,
      description: form.description || null,
      valueCents: form.valueCents,
      transactionDate: new Date(form.transactionDate + "T12:00:00"),
      paymentMethod: form.paymentMethod || null,
      reference: form.reference || null,
      notes: form.notes || null,
    };
    if (editingId) {
      await updateMut.mutateAsync({ id: editingId, ...payload });
    } else {
      await createMut.mutateAsync(payload);
    }
    utils.caixa.list.invalidate();
    setView("list");
  };

  const handleDelete = async (id: number) => {
    await deleteMut.mutateAsync({ id });
    utils.caixa.list.invalidate();
    setDeleteConfirm(null);
    if (selectedId === id) {
      setView("list");
      setSelectedId(null);
    }
  };

  const handleValueChange = (value: string) => {
    // Allow only digits and comma
    const cleaned = value.replace(/[^\d,]/g, "");
    setForm(prev => ({
      ...prev,
      valueDisplay: cleaned,
      valueCents: parseCurrencyInput(cleaned),
    }));
  };

  // === RENDER: LIST VIEW ===
  if (view === "list") {
    return (
      <div className="space-y-5">
        {/* Hero Banner */}
        <div className="relative h-32 rounded-2xl overflow-hidden shadow-lg shadow-emerald-900/10">
          <img src="/manus-storage/hero-caixa_03f05e01.jpg" alt="Caixa" className="w-full h-full object-cover object-center" />
          <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/30 to-transparent flex items-end p-5">
            <div>
              <p className="text-emerald-300/80 text-[10px] font-bold tracking-[0.2em] uppercase mb-1">Módulo 4</p>
              <h1 className="text-white text-xl lg:text-2xl font-bold tracking-tight">Caixa</h1>
              <p className="text-white/70 text-sm mt-1.5 font-light">Controle financeiro completo do criatório</p>
            </div>
          </div>
        </div>
        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <div className="bg-white rounded-2xl border border-stone-200/80 p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-1">
              <Wallet size={14} className="text-stone-500" />
              <p className="text-[10px] text-stone-500 font-medium uppercase tracking-wider">Saldo Total</p>
            </div>
            <p className={cn("text-xl font-bold", totalBalance >= 0 ? "text-emerald-700" : "text-red-700")}>
              {formatCurrency(totalBalance)}
            </p>
          </div>
          <div className="bg-white rounded-2xl border border-stone-200/80 p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-1">
              <ArrowUpCircle size={14} className="text-emerald-500" />
              <p className="text-[10px] text-stone-500 font-medium uppercase tracking-wider">Entradas (Período)</p>
            </div>
            <p className="text-xl font-bold text-emerald-700">{formatCurrency(stats.entradas)}</p>
          </div>
          <div className="bg-white rounded-2xl border border-stone-200/80 p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-1">
              <ArrowDownCircle size={14} className="text-red-500" />
              <p className="text-[10px] text-stone-500 font-medium uppercase tracking-wider">Saídas (Período)</p>
            </div>
            <p className="text-xl font-bold text-red-700">{formatCurrency(stats.saidas)}</p>
          </div>
          <div className="bg-white rounded-2xl border border-stone-200/80 p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp size={14} className="text-blue-500" />
              <p className="text-[10px] text-stone-500 font-medium uppercase tracking-wider">Resultado (Período)</p>
            </div>
            <p className={cn("text-xl font-bold", stats.saldo >= 0 ? "text-emerald-700" : "text-red-700")}>
              {formatCurrency(stats.saldo)}
            </p>
          </div>
        </div>

        {/* Daily Evolution Chart — Current Month */}
        <div className="bg-white rounded-2xl border border-stone-200/80 p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <BarChart3 size={14} className="text-stone-500" />
              <p className="text-xs font-semibold text-stone-700">
                Evolução Diária — {currentMonthLabel.charAt(0).toUpperCase() + currentMonthLabel.slice(1)}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => generateFinancialPdf(transactions)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-stone-200 text-stone-600 text-[11px] font-medium hover:bg-stone-50 transition-all"
              >
                <Download size={12} />
                Relatório PDF
              </button>
              <button
                onClick={() => setShowChart(!showChart)}
                className="text-[10px] text-stone-400 hover:text-stone-600 transition-colors"
              >
                {showChart ? "Ocultar" : "Mostrar"}
              </button>
            </div>
          </div>
          {showChart && (
            <div className="h-[220px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dailyData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" vertical={false} />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 9, fill: "#78716c" }}
                    interval={0}
                    tickFormatter={(v: string) => {
                      const d = parseInt(v);
                      return d % 5 === 1 || d === 1 ? v : "";
                    }}
                  />
                  <YAxis
                    tick={{ fontSize: 9, fill: "#78716c" }}
                    tickFormatter={(v: number) => v > 0 ? `R$${(v / 100).toLocaleString("pt-BR", { notation: "compact" } as any)}` : ""}
                    width={50}
                  />
                  <Tooltip
                    formatter={(value: number) => [(value / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })]}
                    labelFormatter={(label: string) => `Dia ${label}`}
                    labelStyle={{ fontSize: 11, fontWeight: 600 }}
                    contentStyle={{ borderRadius: 8, border: "1px solid #e7e5e4", fontSize: 11 }}
                  />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="entradas" name="Entradas" fill="#059669" radius={[2, 2, 0, 0]} />
                  <Bar dataKey="saidas" name="Saídas" fill="#dc2626" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Quick Action Buttons */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => handleNewTransaction("aporte")}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-all shadow-sm"
          >
            <Plus size={15} />
            Aporte
          </button>
          <button
            onClick={() => handleNewTransaction("venda")}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold transition-all shadow-sm"
          >
            <Plus size={15} />
            Venda
          </button>
          <button
            onClick={() => handleNewTransaction("despesa")}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-semibold transition-all shadow-sm"
          >
            <Plus size={15} />
            Despesa
          </button>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-2xl border border-stone-200/80 p-4 shadow-sm space-y-3">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
              <input
                type="text"
                placeholder="Buscar por descrição, categoria, referência..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-lg border border-stone-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200"
              />
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Filter size={13} className="text-stone-400" />
            <select
              value={filterType}
              onChange={e => setFilterType(e.target.value as any)}
              className="px-3 py-1.5 rounded-lg border border-stone-200 text-xs text-stone-600 focus:outline-none focus:ring-2 focus:ring-emerald-200"
            >
              <option value="todos">Todos os tipos</option>
              <option value="aporte">Aportes</option>
              <option value="venda">Vendas</option>
              <option value="despesa">Despesas</option>
            </select>
            <select
              value={filterPeriod}
              onChange={e => setFilterPeriod(e.target.value as PeriodFilter)}
              className="px-3 py-1.5 rounded-lg border border-stone-200 text-xs text-stone-600 focus:outline-none focus:ring-2 focus:ring-emerald-200"
            >
              <option value="todos">Todo o período</option>
              <option value="hoje">Hoje</option>
              <option value="semana">Última semana</option>
              <option value="mes">Este mês</option>
              <option value="ano">Este ano</option>
            </select>
            <select
              value={filterCategory}
              onChange={e => setFilterCategory(e.target.value)}
              className="px-3 py-1.5 rounded-lg border border-stone-200 text-xs text-stone-600 focus:outline-none focus:ring-2 focus:ring-emerald-200"
            >
              <option value="todos">Todas as categorias</option>
              {allCategories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Transactions List */}
        <div className="bg-white rounded-2xl border border-stone-200/80 shadow-md shadow-stone-200/30 overflow-hidden">
          {isLoading ? (
            <div className="p-8 text-center text-stone-400 text-sm">Carregando...</div>
          ) : filteredTransactions.length === 0 ? (
            <div className="p-8 text-center">
              <DollarSign size={32} className="mx-auto text-stone-300 mb-2" />
              <p className="text-sm text-stone-500">Nenhuma transação encontrada</p>
              <p className="text-xs text-stone-400 mt-1">Use os botões acima para registrar um lançamento</p>
            </div>
          ) : (
            <div className="divide-y divide-stone-100">
              {filteredTransactions.map(t => {
                const colors = TYPE_COLORS[t.type as TransactionType];
                const isEntry = t.type === "aporte" || t.type === "venda";
                return (
                  <div
                    key={t.id}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-stone-50 transition-colors cursor-pointer"
                    onClick={() => { setSelectedId(t.id); setView("detail"); }}
                  >
                    <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center shrink-0", colors.bg)}>
                      {t.type === "aporte" && <ArrowUpCircle size={16} className={colors.icon} />}
                      {t.type === "venda" && <TrendingUp size={16} className={colors.icon} />}
                      {t.type === "despesa" && <ArrowDownCircle size={16} className={colors.icon} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-stone-800 truncate">
                          {t.description || t.category}
                        </p>
                        <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-medium", colors.bg, colors.text, `border ${colors.border}`)}>
                          {TYPE_LABELS[t.type as TransactionType]}
                        </span>
                      </div>
                      <p className="text-xs text-stone-500 mt-0.5">
                        {t.category} · {new Date(t.transactionDate).toLocaleDateString("pt-BR")}
                      </p>
                    </div>
                    <p className={cn("text-sm font-bold tabular-nums", isEntry ? "text-emerald-700" : "text-red-700")}>
                      {isEntry ? "+" : "−"} {formatCurrency(t.valueCents)}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Transaction count */}
        <p className="text-xs text-stone-400 text-center">
          {filteredTransactions.length} transação(ões) · Total geral: {transactions.length}
        </p>
      </div>
    );
  }

  // === RENDER: FORM VIEW ===
  if (view === "form") {
    const typeColors = TYPE_COLORS[form.type];
    return (
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => setView("list")}
            className="p-2 rounded-lg hover:bg-stone-100 text-stone-500 transition-all"
          >
            <ArrowLeft size={18} />
          </button>
          <h2 className="text-lg font-bold text-stone-800">
            {editingId ? "Editar Lançamento" : "Novo Lançamento"}
          </h2>
        </div>

        <div className="bg-white rounded-2xl border border-stone-200/80 p-6 shadow-sm space-y-5">
          {/* Type selector */}
          <div>
            <label className="block text-xs font-semibold text-stone-600 mb-2">Tipo</label>
            <div className="grid grid-cols-3 gap-2">
              {(["aporte", "venda", "despesa"] as TransactionType[]).map(type => {
                const colors = TYPE_COLORS[type];
                const isActive = form.type === type;
                return (
                  <button
                    key={type}
                    onClick={() => setForm(prev => ({ ...prev, type, category: "" }))}
                    className={cn(
                      "flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 text-sm font-semibold transition-all",
                      isActive
                        ? `${colors.bg} ${colors.text} ${colors.border}`
                        : "border-stone-200 text-stone-500 hover:border-stone-300"
                    )}
                  >
                    {type === "aporte" && <ArrowUpCircle size={16} />}
                    {type === "venda" && <TrendingUp size={16} />}
                    {type === "despesa" && <ArrowDownCircle size={16} />}
                    {TYPE_LABELS[type]}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Value */}
          <div>
            <label className="block text-xs font-semibold text-stone-600 mb-1.5">Valor (R$)</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 text-sm font-medium">R$</span>
              <input
                type="text"
                inputMode="decimal"
                placeholder="0,00"
                value={form.valueDisplay}
                onChange={e => handleValueChange(e.target.value)}
                className="w-full pl-10 pr-4 py-3 rounded-lg border border-stone-200 text-lg font-bold text-stone-800 focus:outline-none focus:ring-2 focus:ring-emerald-200"
              />
            </div>
          </div>

          {/* Category */}
          <div>
            <label className="block text-xs font-semibold text-stone-600 mb-1.5">Categoria</label>
            <select
              value={form.category}
              onChange={e => setForm(prev => ({ ...prev, category: e.target.value }))}
              className="w-full px-4 py-2.5 rounded-lg border border-stone-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200"
            >
              <option value="">Selecione uma categoria</option>
              {CATEGORIES[form.type].map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-stone-600 mb-1.5">Descrição</label>
            <input
              type="text"
              placeholder="Ex: Compra de ração Megazoo 5kg"
              value={form.description}
              onChange={e => setForm(prev => ({ ...prev, description: e.target.value }))}
              className="w-full px-4 py-2.5 rounded-lg border border-stone-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200"
            />
          </div>

          {/* Date + Payment Method */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-stone-600 mb-1.5">Data</label>
              <input
                type="date"
                value={form.transactionDate}
                onChange={e => setForm(prev => ({ ...prev, transactionDate: e.target.value }))}
                className="w-full px-4 py-2.5 rounded-lg border border-stone-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-600 mb-1.5">Forma de Pagamento</label>
              <select
                value={form.paymentMethod}
                onChange={e => setForm(prev => ({ ...prev, paymentMethod: e.target.value }))}
                className="w-full px-4 py-2.5 rounded-lg border border-stone-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200"
              >
                <option value="">Não informado</option>
                {PAYMENT_METHODS.map(pm => (
                  <option key={pm.id} value={pm.id}>{pm.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Reference */}
          <div>
            <label className="block text-xs font-semibold text-stone-600 mb-1.5">Referência (opcional)</label>
            <input
              type="text"
              placeholder="Ex: NF 12345, Cliente João Silva, Fornecedor ABC..."
              value={form.reference}
              onChange={e => setForm(prev => ({ ...prev, reference: e.target.value }))}
              className="w-full px-4 py-2.5 rounded-lg border border-stone-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-stone-600 mb-1.5">Observações</label>
            <textarea
              placeholder="Observações adicionais..."
              value={form.notes}
              onChange={e => setForm(prev => ({ ...prev, notes: e.target.value }))}
              rows={2}
              className="w-full px-4 py-2.5 rounded-lg border border-stone-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200 resize-none"
            />
          </div>

          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={!form.category || form.valueCents <= 0 || createMut.isPending || updateMut.isPending}
            className={cn(
              "w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-sm font-bold transition-all",
              "bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm",
              "disabled:opacity-50 disabled:cursor-not-allowed"
            )}
          >
            <Save size={16} />
            {editingId ? "Salvar Alterações" : "Registrar Lançamento"}
          </button>
        </div>
      </div>
    );
  }

  // === RENDER: DETAIL VIEW ===
  if (view === "detail" && selectedId) {
    const transaction = transactions.find(t => t.id === selectedId);
    if (!transaction) {
      setView("list");
      return null;
    }
    const colors = TYPE_COLORS[transaction.type as TransactionType];
    const isEntry = transaction.type === "aporte" || transaction.type === "venda";

    return (
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setView("list")}
              className="p-2 rounded-lg hover:bg-stone-100 text-stone-500 transition-all"
            >
              <ArrowLeft size={18} />
            </button>
            <h2 className="text-lg font-bold text-stone-800">Detalhe do Lançamento</h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleEditTransaction(transaction)}
              className="p-2 rounded-lg hover:bg-stone-100 text-stone-500 transition-all"
              title="Editar"
            >
              <Edit2 size={16} />
            </button>
            <button
              onClick={() => setDeleteConfirm(transaction.id)}
              className="p-2 rounded-lg hover:bg-red-50 text-stone-400 hover:text-red-500 transition-all"
              title="Excluir"
            >
              <Trash2 size={16} />
            </button>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-stone-200/80 p-6 shadow-sm">
          {/* Type badge + Value */}
          <div className="flex items-center justify-between mb-5">
            <span className={cn("px-3 py-1.5 rounded-full text-xs font-semibold", colors.bg, colors.text, `border ${colors.border}`)}>
              {TYPE_LABELS[transaction.type as TransactionType]}
            </span>
            <p className={cn("text-2xl font-bold", isEntry ? "text-emerald-700" : "text-red-700")}>
              {isEntry ? "+" : "−"} {formatCurrency(transaction.valueCents)}
            </p>
          </div>

          {/* Info grid */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-[10px] text-stone-400 font-medium uppercase tracking-wider">Categoria</p>
              <p className="text-sm font-semibold text-stone-800 mt-0.5">{transaction.category}</p>
            </div>
            <div>
              <p className="text-[10px] text-stone-400 font-medium uppercase tracking-wider">Data</p>
              <p className="text-sm font-semibold text-stone-800 mt-0.5">
                {new Date(transaction.transactionDate).toLocaleDateString("pt-BR")}
              </p>
            </div>
            {transaction.description && (
              <div className="col-span-2">
                <p className="text-[10px] text-stone-400 font-medium uppercase tracking-wider">Descrição</p>
                <p className="text-sm text-stone-700 mt-0.5">{transaction.description}</p>
              </div>
            )}
            {transaction.paymentMethod && (
              <div>
                <p className="text-[10px] text-stone-400 font-medium uppercase tracking-wider">Forma de Pagamento</p>
                <p className="text-sm text-stone-700 mt-0.5">
                  {PAYMENT_METHODS.find(pm => pm.id === transaction.paymentMethod)?.label || transaction.paymentMethod}
                </p>
              </div>
            )}
            {transaction.reference && (
              <div>
                <p className="text-[10px] text-stone-400 font-medium uppercase tracking-wider">Referência</p>
                <p className="text-sm text-stone-700 mt-0.5">{transaction.reference}</p>
              </div>
            )}
            {transaction.notes && (
              <div className="col-span-2">
                <p className="text-[10px] text-stone-400 font-medium uppercase tracking-wider">Observações</p>
                <p className="text-sm text-stone-700 mt-0.5 whitespace-pre-wrap">{transaction.notes}</p>
              </div>
            )}
          </div>

          <div className="mt-5 pt-4 border-t border-stone-100">
            <p className="text-[10px] text-stone-400">
              Registrado em {new Date(transaction.createdAt).toLocaleDateString("pt-BR")}
            </p>
          </div>
        </div>

        {/* Delete confirmation */}
        {deleteConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
            <div className="bg-white rounded-xl p-6 shadow-xl max-w-sm w-full mx-4">
              <h3 className="text-base font-bold text-stone-800 mb-2">Confirmar Exclusão</h3>
              <p className="text-sm text-stone-600 mb-5">
                Tem certeza que deseja excluir este lançamento? Esta ação não pode ser desfeita.
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
