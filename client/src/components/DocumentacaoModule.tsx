/**
 * DocumentacaoModule — Repositório central de documentos do criatório
 * Design profissional e formal para apresentação em fiscalização
 */
import { useState, useRef, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { generateChecklistPdf, generateReviewChecklistPdf } from "@/lib/checklistPdf";
import DocumentosAuxiliares from "@/components/DocumentosAuxiliares";
import {
  FileText,
  Upload,
  Plus,
  Trash2,
  ArrowLeft,
  Calendar,
  Tag,
  AlertCircle,
  CheckCircle2,
  Clock,
  Archive,
  Search,
  RefreshCw,
  ExternalLink,
  Shield,
  Download,
  XCircle,
  ClipboardList,
  Printer,
  Eye,
  FileDown,
} from "lucide-react";

// Categorias de documentos do criatório
const CATEGORIES = [
  "Legalização / Licenças",
  "IBAMA / SISPASS",
  "Alvará / Prefeitura",
  "GTA / Transporte",
  "Certificados",
  "Contratos",
  "Notas Fiscais",
  "Laudos / Exames",
  "Responsabilidade Técnica",
  "Cadastros / Registros",
  "Outros",
] as const;

const STATUS_LABELS: Record<string, { label: string; color: string; bgColor: string; icon: typeof CheckCircle2 }> = {
  vigente: { label: "REGULAR", color: "text-emerald-700", bgColor: "bg-emerald-600 text-white", icon: CheckCircle2 },
  em_andamento: { label: "EM ANDAMENTO", color: "text-blue-700", bgColor: "bg-blue-600 text-white", icon: Clock },
  vencido: { label: "VENCIDO", color: "text-red-700", bgColor: "bg-red-600 text-white", icon: XCircle },
  arquivado: { label: "ARQUIVADO", color: "text-slate-600", bgColor: "bg-slate-500 text-white", icon: Archive },
};

type DocForm = {
  title: string;
  category: string;
  description: string;
  documentDate: string;
  vigenciaDate: string;
  expirationDate: string;
  status: "vigente" | "vencido" | "em_andamento" | "arquivado";
};

const EMPTY_FORM: DocForm = {
  title: "",
  category: "Legalização / Licenças",
  description: "",
  documentDate: "",
  vigenciaDate: "",
  expirationDate: "",
  status: "vigente",
};

function DocumentacaoModuleInner() {
  const [view, setView] = useState<"list" | "form" | "detail">("list");
  const [form, setForm] = useState<DocForm>(EMPTY_FORM);
  const [selectedDoc, setSelectedDoc] = useState<any>(null);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [renewalFiles, setRenewalFiles] = useState<File[]>([]);
  const [renewalDocDate, setRenewalDocDate] = useState("");
  const [renewalVigDate, setRenewalVigDate] = useState("");
  const [renewalExpDate, setRenewalExpDate] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadingRenewal, setUploadingRenewal] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [successMsg, setSuccessMsg] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const renewalInputRef = useRef<HTMLInputElement>(null);
  const dropRef = useRef<HTMLDivElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const { data: documents = [], refetch } = trpc.documentacao.list.useQuery();
  const createMut = trpc.documentacao.create.useMutation({ onSuccess: () => refetch() });
  const updateMut = trpc.documentacao.update.useMutation({ onSuccess: () => refetch() });
  const deleteMut = trpc.documentacao.delete.useMutation({ onSuccess: () => refetch() });
  const uploadMut = trpc.documentacao.upload.useMutation();

  // Drag & Drop handlers
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);
  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  }, []);
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const files = Array.from(e.dataTransfer.files);
    setPendingFiles((prev) => [...prev, ...files]);
  }, []);
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setPendingFiles((prev) => [...prev, ...Array.from(e.target.files!)]);
    }
    e.target.value = "";
  };
  const handleRenewalSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setRenewalFiles(Array.from(e.target.files!));
    }
    e.target.value = "";
  };

  const handleSubmit = async () => {
    if (!form.title || pendingFiles.length === 0) return;
    setUploading(true);
    try {
      for (const file of pendingFiles) {
        const reader = new FileReader();
        const base64 = await new Promise<string>((resolve) => {
          reader.onload = () => {
            const result = reader.result as string;
            resolve(result.split(",")[1]);
          };
          reader.readAsDataURL(file);
        });

        const { url } = await uploadMut.mutateAsync({
          fileName: file.name,
          fileBase64: base64,
          contentType: file.type,
        });

        await createMut.mutateAsync({
          title: form.title,
          category: form.category,
          fileUrl: url,
          fileName: file.name,
          mimeType: file.type || null,
          fileSize: file.size || null,
          description: form.description || null,
          documentDate: form.documentDate ? new Date(form.documentDate) : null,
          vigenciaDate: form.vigenciaDate ? new Date(form.vigenciaDate) : null,
          expirationDate: form.expirationDate ? new Date(form.expirationDate) : null,
          status: form.status,
        });
      }
      setForm(EMPTY_FORM);
      setPendingFiles([]);
      setView("list");
    } catch (err) {
      console.error("Erro ao enviar documento:", err);
    } finally {
      setUploading(false);
    }
  };

  const handleUpdate = async () => {
    if (!editingId) return;
    await updateMut.mutateAsync({
      id: editingId,
      title: form.title || undefined,
      category: form.category || undefined,
      description: form.description || null,
      documentDate: form.documentDate ? new Date(form.documentDate) : null,
      vigenciaDate: form.vigenciaDate ? new Date(form.vigenciaDate) : null,
      expirationDate: form.expirationDate ? new Date(form.expirationDate) : null,
      status: form.status,
    });
    setEditingId(null);
    setForm(EMPTY_FORM);
    setView("list");
  };

  // Upload renewal document and update the SAME record with new file URL + status
  const handleRenewalUpload = async () => {
    if (!selectedDoc || renewalFiles.length === 0) return;
    setUploadingRenewal(true);
    try {
      const file = renewalFiles[0];
      const reader = new FileReader();
      const base64 = await new Promise<string>((resolve) => {
        reader.onload = () => {
          const result = reader.result as string;
          resolve(result.split(",")[1]);
        };
        reader.readAsDataURL(file);
      });

      const { url } = await uploadMut.mutateAsync({
        fileName: file.name,
        fileBase64: base64,
        contentType: file.type,
      });

      await updateMut.mutateAsync({
        id: selectedDoc.id,
        status: "vigente",
        fileUrl: url,
        fileName: file.name,
        fileSize: file.size || null,
        ...(renewalDocDate ? { documentDate: new Date(renewalDocDate) } : {}),
        ...(renewalVigDate ? { vigenciaDate: new Date(renewalVigDate) } : {}),
        ...(renewalExpDate ? { expirationDate: new Date(renewalExpDate) } : {}),
      });

      setRenewalFiles([]);
      setRenewalDocDate("");
      setRenewalVigDate("");
      setRenewalExpDate("");
      setSuccessMsg("Documento atualizado com sucesso! Status alterado para REGULAR.");
      setTimeout(() => {
        setSuccessMsg("");
        setSelectedDoc(null);
        setView("list");
      }, 2000);
    } catch (err) {
      console.error("Erro ao enviar renovação:", err);
      alert("Erro ao enviar o documento. Tente novamente.");
    } finally {
      setUploadingRenewal(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (confirm("Excluir este documento permanentemente?")) {
      await deleteMut.mutateAsync({ id });
      if (selectedDoc?.id === id) {
        setSelectedDoc(null);
        setView("list");
      }
    }
  };

  const handleViewDetail = (doc: any) => {
    setSelectedDoc(doc);
    setRenewalFiles([]);
    setSuccessMsg("");
    setRenewalDocDate("");
    setRenewalVigDate("");
    setRenewalExpDate("");
    setView("detail");
  };

  const handleEdit = (doc: any) => {
    setEditingId(doc.id);
    setForm({
      title: doc.title,
      category: doc.category,
      description: doc.description || "",
      documentDate: doc.documentDate ? new Date(doc.documentDate).toISOString().split("T")[0] : "",
      vigenciaDate: doc.vigenciaDate ? new Date(doc.vigenciaDate).toISOString().split("T")[0] : "",
      expirationDate: doc.expirationDate ? new Date(doc.expirationDate).toISOString().split("T")[0] : "",
      status: doc.status,
    });
    setView("form");
  };

  // Format date in large readable format
  const formatDateLarge = (date: string | Date | null) => {
    if (!date) return null;
    return new Date(date).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  // Sort documents: "Processo de Legalização" first, then vencido, then by date
  const sortedDocs = [...documents].sort((a: any, b: any) => {
    const aIsProcess = a.title.toLowerCase().includes("processo de legalização");
    const bIsProcess = b.title.toLowerCase().includes("processo de legalização");
    if (aIsProcess && !bIsProcess) return -1;
    if (!aIsProcess && bIsProcess) return 1;
    if (a.status === "vencido" && b.status !== "vencido") return -1;
    if (a.status !== "vencido" && b.status === "vencido") return 1;
    if (a.expirationDate && b.expirationDate) {
      return new Date(a.expirationDate).getTime() - new Date(b.expirationDate).getTime();
    }
    if (a.expirationDate && !b.expirationDate) return -1;
    return 0;
  });

  // Filtered documents
  const filteredDocs = sortedDocs.filter((doc: any) => {
    const matchSearch =
      !searchTerm ||
      doc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.fileName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (doc.description || "").toLowerCase().includes(searchTerm.toLowerCase());
    const matchCategory = filterCategory === "all" || doc.category === filterCategory;
    const matchStatus = filterStatus === "all" || doc.status === filterStatus;
    return matchSearch && matchCategory && matchStatus;
  });

  // Count vencidos
  const vencidoCount = documents.filter((d: any) => d.status === "vencido").length;

  // ─── DETAIL VIEW ─────────────────────────────────────────────────────────────
  if (view === "detail" && selectedDoc) {
    const statusInfo = STATUS_LABELS[selectedDoc.status] || STATUS_LABELS.vigente;
    const isVencido = selectedDoc.status === "vencido";
    const hasFile = selectedDoc.fileUrl && selectedDoc.fileUrl.trim() !== "";

    return (
      <div className="space-y-6 max-w-4xl mx-auto">
        <button
          onClick={() => { setSelectedDoc(null); setView("list"); }}
          className="flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-800 transition-colors"
        >
          <ArrowLeft size={16} /> Voltar à lista
        </button>

        {/* Success message */}
        {successMsg && (
          <div className="bg-emerald-50 border-2 border-emerald-300 rounded-xl p-4 flex items-center gap-3 animate-in fade-in">
            <CheckCircle2 size={20} className="text-emerald-600" />
            <p className="text-sm font-semibold text-emerald-800">{successMsg}</p>
          </div>
        )}

        <div className={`bg-white border-2 rounded-2xl shadow-md shadow-stone-200/30 overflow-hidden ${isVencido ? "border-red-300" : "border-slate-200"}`}>
          {/* Header bar */}
          <div className={`px-6 py-4 flex items-center justify-between ${isVencido ? "bg-red-50 border-b-2 border-red-200" : "bg-slate-50 border-b border-slate-200"}`}>
            <div className="flex items-center gap-3">
              <span className={`text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider ${statusInfo.bgColor}`}>
                {statusInfo.label}
              </span>
              <span className="text-xs font-medium text-slate-500 px-2 py-0.5 rounded bg-slate-100">
                {selectedDoc.category}
              </span>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => handleEdit(selectedDoc)} className="text-xs">
                Editar
              </Button>
              <Button variant="outline" size="sm" className="text-xs text-red-500 hover:text-red-600 hover:border-red-300" onClick={() => handleDelete(selectedDoc.id)}>
                <Trash2 size={13} />
              </Button>
            </div>
          </div>

          {/* Title */}
          <div className="px-6 pt-5 pb-4">
            <h2 className="text-xl font-bold text-slate-900">{selectedDoc.title}</h2>
            {selectedDoc.description && (
              <p className="text-sm text-slate-600 mt-2 leading-relaxed">{selectedDoc.description}</p>
            )}
          </div>

          {/* DATES — Large and prominent: 3 columns */}
          <div className="px-6 pb-5">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="rounded-2xl p-4 bg-stone-50/80 border border-stone-200/80">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Data do Documento</p>
                <p className="text-2xl font-bold text-slate-800 tabular-nums">
                  {formatDateLarge(selectedDoc.documentDate) || "—"}
                </p>
              </div>
              <div className="rounded-xl p-4 bg-emerald-50 border border-emerald-200">
                <p className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider mb-2">Início da Vigência</p>
                <p className="text-2xl font-bold text-emerald-800 tabular-nums">
                  {formatDateLarge(selectedDoc.vigenciaDate) || "—"}
                </p>
              </div>
              <div className={`rounded-xl p-4 border ${isVencido ? "bg-red-50 border-red-300" : "bg-amber-50 border-amber-200"}`}>
                <p className={`text-[10px] font-bold uppercase tracking-wider mb-2 ${isVencido ? "text-red-700" : "text-amber-700"}`}>
                  {isVencido ? "VENCIDO EM" : "Vencimento"}
                </p>
                <p className={`text-2xl font-bold tabular-nums ${isVencido ? "text-red-700" : "text-amber-800"}`}>
                  {formatDateLarge(selectedDoc.expirationDate) || "—"}
                </p>
              </div>
            </div>
          </div>

          {/* File section */}
          <div className="px-6 pb-5">
            {hasFile ? (
              <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-xl p-4">
                <FileText size={20} className="text-slate-600 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-800 truncate">{selectedDoc.fileName}</p>
                  {selectedDoc.fileSize && (
                    <p className="text-xs text-slate-500">{(selectedDoc.fileSize / 1024 / 1024).toFixed(2)} MB</p>
                  )}
                </div>
                <a
                  href={selectedDoc.fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-800 text-white text-xs font-semibold rounded-lg hover:bg-slate-700 transition-colors"
                >
                  <ExternalLink size={13} /> Abrir Documento
                </a>
              </div>
            ) : (
              <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4">
                <AlertCircle size={18} className="text-amber-600 shrink-0" />
                <p className="text-sm text-amber-800 font-medium">
                  Documento individual não anexado — envie o arquivo abaixo
                </p>
              </div>
            )}
          </div>

          {/* Renewal / Upload section */}
          <div className={`px-6 pb-6 pt-2 border-t ${isVencido ? "border-red-200 bg-red-50/30" : "border-slate-100"}`}>
            <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
              <RefreshCw size={14} className={isVencido ? "text-red-600" : "text-slate-600"} />
              {hasFile ? "Enviar Renovação" : "Enviar Documento"}
            </h3>

            {/* File upload */}
            <div
              onClick={() => renewalInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-all mb-4 ${
                renewalFiles.length > 0
                  ? "border-emerald-400 bg-emerald-50/50"
                  : isVencido
                  ? "border-red-300 hover:border-red-400 hover:bg-red-50/50"
                  : "border-slate-300 hover:border-slate-400 hover:bg-slate-50"
              }`}
            >
              {renewalFiles.length > 0 ? (
                <div className="flex items-center justify-center gap-2">
                  <CheckCircle2 size={18} className="text-emerald-600" />
                  <span className="text-sm font-medium text-emerald-800">{renewalFiles[0].name}</span>
                </div>
              ) : (
                <>
                  <Upload size={24} className="mx-auto mb-2 text-slate-400" />
                  <p className="text-sm font-medium text-slate-600">
                    Clique para selecionar o arquivo
                  </p>
                  <p className="text-xs text-slate-400 mt-1">PDF, imagem ou documento</p>
                </>
              )}
            </div>
            <input
              ref={renewalInputRef}
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
              onChange={handleRenewalSelect}
              className="hidden"
            />

            {/* Date fields for renewal */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                  Data do Documento
                </label>
                <input
                  type="date"
                  value={renewalDocDate}
                  onChange={(e) => setRenewalDocDate(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg border border-slate-300 bg-white text-sm font-medium focus:outline-none focus:ring-2 focus:ring-slate-400/30 focus:border-slate-400"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-emerald-700 uppercase tracking-wider mb-1.5">
                  Início da Vigência
                </label>
                <input
                  type="date"
                  value={renewalVigDate}
                  onChange={(e) => setRenewalVigDate(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg border border-emerald-300 bg-emerald-50/30 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-400/30 focus:border-emerald-400"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-red-700 uppercase tracking-wider mb-1.5">
                  Data de Vencimento
                </label>
                <input
                  type="date"
                  value={renewalExpDate}
                  onChange={(e) => setRenewalExpDate(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg border border-red-300 bg-red-50/30 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-red-400/30 focus:border-red-400"
                />
              </div>
            </div>

            {/* Submit button */}
            <Button
              onClick={handleRenewalUpload}
              disabled={renewalFiles.length === 0 || uploadingRenewal}
              className={`w-full py-3 text-sm font-bold ${
                isVencido
                  ? "bg-red-600 hover:bg-red-700 text-white"
                  : "bg-slate-800 hover:bg-slate-700 text-white"
              }`}
            >
              {uploadingRenewal ? "Enviando..." : hasFile ? "Enviar Renovação" : "Enviar Documento"}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ─── FORM VIEW ────────────────────────────────────────────────────────────────
  if (view === "form") {
    return (
      <div className="space-y-6 max-w-3xl mx-auto">
        <button
          onClick={() => { setView("list"); setEditingId(null); setForm(EMPTY_FORM); setPendingFiles([]); }}
          className="flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-800 transition-colors"
        >
          <ArrowLeft size={16} /> Voltar à lista
        </button>

        <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-5 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900">
            {editingId ? "Editar Documento" : "Novo Documento"}
          </h2>

          {/* Title */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Título *</label>
            <Input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="Ex: Alvará de Funcionamento 2025"
              className="border-slate-300"
            />
          </div>

          {/* Category + Status */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Categoria *</label>
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="w-full h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Status</label>
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value as any })}
                className="w-full h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm"
              >
                <option value="vigente">Regular (Vigente)</option>
                <option value="em_andamento">Em Andamento</option>
                <option value="vencido">Vencido</option>
                <option value="arquivado">Arquivado</option>
              </select>
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Data do Documento</label>
              <Input
                type="date"
                value={form.documentDate}
                onChange={(e) => setForm({ ...form, documentDate: e.target.value })}
                className="border-slate-300"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-emerald-700 uppercase tracking-wider">Início da Vigência</label>
              <Input
                type="date"
                value={form.vigenciaDate}
                onChange={(e) => setForm({ ...form, vigenciaDate: e.target.value })}
                className="border-emerald-300"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-red-700 uppercase tracking-wider">Data de Vencimento</label>
              <Input
                type="date"
                value={form.expirationDate}
                onChange={(e) => setForm({ ...form, expirationDate: e.target.value })}
                className="border-red-300"
              />
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Descrição / Observações</label>
            <Textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Detalhes sobre o documento..."
              rows={3}
              className="border-slate-300"
            />
          </div>

          {/* File Upload (only for new documents) */}
          {!editingId && (
            <div className="space-y-3">
              <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Arquivo(s) *</label>
              <div
                ref={dropRef}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
                  dragOver
                    ? "border-slate-600 bg-slate-50"
                    : "border-slate-300 hover:border-slate-400 hover:bg-slate-50"
                }`}
              >
                <Upload size={28} className="mx-auto mb-3 text-slate-400" />
                <p className="text-sm font-medium text-slate-700">
                  Arraste arquivos aqui ou clique para selecionar
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  PDF, imagens, documentos
                </p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx"
                onChange={handleFileSelect}
                className="hidden"
              />

              {/* Pending files list */}
              {pendingFiles.length > 0 && (
                <div className="space-y-2">
                  {pendingFiles.map((file, i) => (
                    <div key={i} className="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5">
                      <FileText size={16} className="text-slate-600 shrink-0" />
                      <span className="text-sm truncate flex-1 text-slate-800">{file.name}</span>
                      <span className="text-xs text-slate-500">
                        {(file.size / 1024 / 1024).toFixed(1)} MB
                      </span>
                      <button
                        onClick={(e) => { e.stopPropagation(); setPendingFiles((prev) => prev.filter((_, j) => j !== i)); }}
                        className="text-red-400 hover:text-red-600"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Submit */}
          <div className="flex gap-3 pt-2">
            <Button
              onClick={editingId ? handleUpdate : handleSubmit}
              disabled={uploading || (!editingId && (!form.title || pendingFiles.length === 0))}
              className="flex-1 bg-slate-800 hover:bg-slate-700 text-white font-bold"
            >
              {uploading ? "Enviando..." : editingId ? "Salvar Alterações" : "Cadastrar Documento"}
            </Button>
            <Button
              variant="outline"
              onClick={() => { setView("list"); setEditingId(null); setForm(EMPTY_FORM); setPendingFiles([]); }}
              className="border-slate-300"
            >
              Cancelar
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ─── LIST VIEW ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">Documentação do Criatório</h2>
              <p className="text-sm text-slate-500 mt-1">
                {documents.length} documento{documents.length !== 1 ? "s" : ""} cadastrado{documents.length !== 1 ? "s" : ""}
                {vencidoCount > 0 && (
                  <span className="ml-2 text-red-600 font-bold">
                    — {vencidoCount} vencido{vencidoCount !== 1 ? "s" : ""}
                  </span>
                )}
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => generateReviewChecklistPdf()}
                variant="outline"
                className="border-amber-300 text-amber-700 font-semibold hover:bg-amber-50"
              >
                <Download size={16} className="mr-1.5" /> PDF Revisão
              </Button>
              <Button
                onClick={() => generateChecklistPdf(documents)}
                variant="outline"
                className="border-slate-300 text-slate-700 font-semibold hover:bg-slate-50"
              >
                <Download size={16} className="mr-1.5" /> PDF Checklist
              </Button>
              <Button
                onClick={() => { setForm(EMPTY_FORM); setPendingFiles([]); setEditingId(null); setView("form"); }}
                className="bg-slate-800 hover:bg-slate-700 text-white font-semibold"
              >
                <Plus size={16} className="mr-1.5" /> Novo Documento
              </Button>
            </div>
          </div>

          {/* Vencido alert banner */}
          {vencidoCount > 0 && filterStatus === "all" && (
            <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4 flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                <XCircle size={22} className="text-red-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold text-red-800">
                  {vencidoCount} documento{vencidoCount !== 1 ? "s" : ""} vencido{vencidoCount !== 1 ? "s" : ""} — renovação urgente
                </p>
                <p className="text-xs text-red-600 mt-0.5">
                  Clique no documento para enviar a renovação atualizada
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="text-red-700 border-red-300 hover:bg-red-100 font-semibold text-xs"
                onClick={() => setFilterStatus("vencido")}
              >
                Filtrar vencidos
              </Button>
            </div>
          )}

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por título ou arquivo..."
                className="pl-9 border-slate-300"
              />
            </div>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm min-w-[160px]"
            >
              <option value="all">Todas Categorias</option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm min-w-[140px]"
            >
              <option value="all">Todos Status</option>
              <option value="vigente">Regular</option>
              <option value="em_andamento">Em Andamento</option>
              <option value="vencido">Vencido</option>
              <option value="arquivado">Arquivado</option>
            </select>
          </div>

          {/* Document list */}
          {filteredDocs.length === 0 ? (
            <div className="text-center py-16 bg-white border border-slate-200 rounded-2xl shadow-md shadow-stone-200/30">
              <FileText size={48} className="mx-auto mb-4 text-slate-300" />
              <p className="text-slate-600 font-semibold">
                {documents.length === 0 ? "Nenhum documento cadastrado" : "Nenhum resultado encontrado"}
              </p>
              <p className="text-sm text-slate-400 mt-1">
                {documents.length === 0 ? "Clique em \"Novo Documento\" para começar" : "Tente ajustar os filtros"}
              </p>
            </div>
          ) : (
            <div className="bg-white border border-stone-200/80 rounded-2xl overflow-hidden shadow-md shadow-stone-200/30">
              {/* Table header */}
              <div className="bg-slate-50 border-b border-slate-200 px-5 py-3 hidden sm:block">
                <div className="flex items-center gap-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  <span className="w-8"></span>
                  <span className="flex-1">Documento</span>
                  <span className="w-28 text-center">Emissão</span>
                  <span className="w-28 text-center">Vigência</span>
                  <span className="w-28 text-center">Vencimento</span>
                  <span className="w-24 text-center">Status</span>
                  <span className="w-8"></span>
                </div>
              </div>

              {/* Document rows */}
              <div className="divide-y divide-slate-100">
                {filteredDocs.map((doc: any) => {
                  const statusInfo = STATUS_LABELS[doc.status] || STATUS_LABELS.vigente;
                  const isProcess = doc.title.toLowerCase().includes("processo de legalização");
                  const isVencido = doc.status === "vencido";
                  return (
                    <div
                      key={doc.id}
                      onClick={() => handleViewDetail(doc)}
                      className={`px-5 py-4 flex items-center gap-4 cursor-pointer transition-colors ${
                        isProcess
                          ? "bg-slate-50 hover:bg-slate-100"
                          : isVencido
                          ? "bg-red-50/50 hover:bg-red-50"
                          : "hover:bg-slate-50"
                      }`}
                    >
                      {/* Icon */}
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                        isProcess ? "bg-slate-800" : isVencido ? "bg-red-100" : "bg-slate-100"
                      }`}>
                        <FileText size={16} className={isProcess ? "text-white" : isVencido ? "text-red-600" : "text-slate-600"} />
                      </div>

                      {/* Title + category */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          {isProcess && (
                            <span className="text-[9px] font-bold bg-slate-800 text-white px-2 py-0.5 rounded uppercase tracking-wider shrink-0">
                              Principal
                            </span>
                          )}
                          <h3 className="font-semibold text-slate-800 text-sm truncate">
                            {doc.title}
                          </h3>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5 truncate">{doc.category}</p>
                      </div>

                      {/* Dates — desktop */}
                      <div className="w-28 text-center shrink-0 hidden sm:block">
                        <span className="text-xs font-medium text-slate-600 tabular-nums">
                          {formatDateLarge(doc.documentDate) || "—"}
                        </span>
                      </div>
                      <div className="w-28 text-center shrink-0 hidden sm:block">
                        <span className="text-xs font-semibold text-emerald-700 tabular-nums">
                          {formatDateLarge(doc.vigenciaDate) || "—"}
                        </span>
                      </div>
                      <div className="w-28 text-center shrink-0 hidden sm:block">
                        <span className={`text-sm font-bold tabular-nums ${isVencido ? "text-red-700" : "text-slate-700"}`}>
                          {formatDateLarge(doc.expirationDate) || "—"}
                        </span>
                      </div>

                      {/* Status badge */}
                      <div className="w-24 text-center shrink-0">
                        <span className={`inline-block text-[9px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider ${statusInfo.bgColor}`}>
                          {statusInfo.label}
                        </span>
                      </div>

                      {/* Delete */}
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDelete(doc.id); }}
                        className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors shrink-0"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Mobile dates (shown below each row on mobile) */}
          <style>{`
            @media (max-width: 639px) {
              .doc-mobile-dates { display: flex !important; }
            }
          `}</style>
    </div>
  );
}

// POP - Procedimentos Operacionais Padrão
const POP_DOCUMENTS = [
  {
    id: "pop-triagem",
    title: "Entrada na Sala de Triagem",
    code: "POP-BIO-001",
    description: "Procedimento completo para recebimento de aves: verificação documental, identificação, avaliação inicial e classificação (APTA / OBSERVAÇÃO / URGÊNCIA).",
    pdfUrl: "/manus-storage/01-entrada-sala-triagem_2b6946d9.pdf",
    pages: 5,
  },
  {
    id: "pop-quarentena",
    title: "Quarentena",
    code: "POP-BIO-002",
    description: "Protocolo de isolamento sanitário de 40 dias: exames laboratoriais (PCR, parasitológico), monitoramento diário, critérios de liberação e biossegurança.",
    pdfUrl: "/manus-storage/02-quarentena_aa9ccdd6.pdf",
    pages: 5,
  },
];

function POPSection() {
  const [viewingPdf, setViewingPdf] = useState<string | null>(null);
  const [viewingTitle, setViewingTitle] = useState<string>("");

  const handleView = (url: string, title: string) => {
    setViewingPdf(url + "?inline=1");
    setViewingTitle(title);
  };

  const handleDownloadPdf = (url: string) => {
    window.open(url, "_blank");
  };

  if (viewingPdf) {
    return (
      <div className="space-y-4">
        {/* Back button + title */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setViewingPdf(null)}
            className="flex items-center gap-1.5 px-3 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-semibold rounded-lg transition-colors"
          >
            <XCircle size={14} />
            Voltar
          </button>
          <h2 className="text-base font-bold text-stone-800">{viewingTitle}</h2>
        </div>
        {/* Embedded PDF viewer */}
        <div className="w-full rounded-2xl overflow-hidden border border-stone-200 shadow-sm" style={{ height: "80vh" }}>
          <iframe
            src={viewingPdf}
            className="w-full h-full"
            title={viewingTitle}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-stone-800">Procedimentos Operacionais Padrão</h2>
          <p className="text-sm text-stone-500 mt-0.5">
            Manuais padronizados para cada etapa do manejo — imprima e cole na parede do setor
          </p>
        </div>
      </div>

      {/* POP Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {POP_DOCUMENTS.map((pop) => (
          <div
            key={pop.id}
            className="group relative bg-white border border-stone-200 rounded-2xl p-5 hover:shadow-lg hover:border-emerald-200 transition-all duration-200"
          >
            {/* Icon + Code */}
            <div className="flex items-start justify-between mb-3">
              <div className="w-11 h-11 rounded-xl bg-emerald-50 flex items-center justify-center">
                <ClipboardList size={20} className="text-emerald-600" />
              </div>
              <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider bg-stone-50 px-2 py-1 rounded-md">
                {pop.code}
              </span>
            </div>

            {/* Title */}
            <h3 className="text-sm font-bold text-stone-800 mb-1.5">{pop.title}</h3>

            {/* Description */}
            <p className="text-xs text-stone-500 leading-relaxed mb-4">{pop.description}</p>

            {/* Footer */}
            <div className="flex items-center justify-between pt-3 border-t border-stone-100">
              <span className="text-[10px] text-stone-400 font-medium">{pop.pages} páginas</span>
              <div className="flex gap-2">
                <button
                  onClick={() => handleView(pop.pdfUrl, pop.title)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg transition-colors"
                >
                  <Eye size={13} />
                  Visualizar
                </button>
                <button
                  onClick={() => handleDownloadPdf(pop.pdfUrl)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-semibold rounded-lg transition-colors border border-stone-200"
                >
                  <FileDown size={13} />
                  PDF
                </button>
              </div>
            </div>
          </div>
        ))}

        {/* Placeholder for future POPs */}
        <div className="border-2 border-dashed border-stone-200 rounded-2xl p-5 flex flex-col items-center justify-center text-center min-h-[180px] opacity-50">
          <ClipboardList size={24} className="text-stone-300 mb-2" />
          <p className="text-xs font-semibold text-stone-400">Próximos POPs</p>
          <p className="text-[10px] text-stone-300 mt-1">Saída da Triagem...</p>
        </div>
      </div>
    </div>
  );
}

// Wrapper component that adds tabs
export default function DocumentacaoModule() {
  const [activeTab, setActiveTab] = useState("documentos");

  return (
    <div className="space-y-5">
      {/* Hero Banner */}
      <div className="relative h-32 rounded-2xl overflow-hidden shadow-lg shadow-emerald-900/10">
        <img src="/manus-storage/hero-doc-v2_6ff12d1b.jpg" alt="Documentação" className="w-full h-full object-cover object-center" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/30 to-transparent flex items-end p-5">
          <div>
            <p className="text-emerald-300/80 text-[10px] font-bold tracking-[0.2em] uppercase mb-1">Módulo 6</p>
            <h1 className="text-white text-xl lg:text-2xl font-bold tracking-tight">Documentação</h1>
            <p className="text-white/70 text-sm mt-1.5 font-light">Licenças, registros e conformidade legal</p>
          </div>
        </div>
      </div>
    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
      <TabsList className="mb-6 bg-stone-100/80 p-1.5 rounded-2xl">
        <TabsTrigger
          value="documentos"
          className="data-[state=active]:bg-white data-[state=active]:shadow-md rounded-xl px-5 py-2.5 text-sm font-semibold"
        >
          Documentos Obrigatórios
        </TabsTrigger>
        <TabsTrigger
          value="auxiliares"
          className="data-[state=active]:bg-white data-[state=active]:shadow-md rounded-xl px-5 py-2.5 text-sm font-semibold"
        >
          Documentos Auxiliares
        </TabsTrigger>
        <TabsTrigger
          value="pop"
          className="data-[state=active]:bg-white data-[state=active]:shadow-md rounded-xl px-5 py-2.5 text-sm font-semibold"
        >
          POP
        </TabsTrigger>
      </TabsList>
      <TabsContent value="documentos">
        <DocumentacaoModuleInner />
      </TabsContent>
      <TabsContent value="auxiliares">
        <DocumentosAuxiliares />
      </TabsContent>
      <TabsContent value="pop">
        <POPSection />
      </TabsContent>
    </Tabs>
    </div>
  );
}
