/**
 * DocumentacaoModule — Repositório central de documentos do criatório
 * Licenças, alvarás, processos de legalização, certificados, etc.
 * - Processo completo fixo no topo
 * - Datas de emissão e vencimento grandes e visíveis
 * - Campo para anexar renovação dentro de cada documento
 */
import { useState, useRef, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  FileText,
  Upload,
  Plus,
  Trash2,
  Eye,
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
  vigente: { label: "Vigente", color: "text-emerald-700", bgColor: "bg-emerald-50 border-emerald-200", icon: CheckCircle2 },
  em_andamento: { label: "Em Andamento", color: "text-amber-700", bgColor: "bg-amber-50 border-amber-200", icon: Clock },
  vencido: { label: "Vencido", color: "text-red-700", bgColor: "bg-red-50 border-red-200", icon: AlertCircle },
  arquivado: { label: "Arquivado", color: "text-gray-600", bgColor: "bg-gray-50 border-gray-200", icon: Archive },
};

type DocForm = {
  title: string;
  category: string;
  description: string;
  documentDate: string;
  expirationDate: string;
  status: "vigente" | "vencido" | "em_andamento" | "arquivado";
};

const EMPTY_FORM: DocForm = {
  title: "",
  category: "Legalização / Licenças",
  description: "",
  documentDate: "",
  expirationDate: "",
  status: "vigente",
};

export default function DocumentacaoModule() {
  const [view, setView] = useState<"list" | "form" | "detail">("list");
  const [form, setForm] = useState<DocForm>(EMPTY_FORM);
  const [selectedDoc, setSelectedDoc] = useState<any>(null);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [renewalFiles, setRenewalFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadingRenewal, setUploadingRenewal] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [editingId, setEditingId] = useState<number | null>(null);
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
      expirationDate: form.expirationDate ? new Date(form.expirationDate) : null,
      status: form.status,
    });
    setEditingId(null);
    setForm(EMPTY_FORM);
    setView("list");
  };

  // Upload renewal document and update the record with new file URL + status
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

      // Update the document with the new file URL and mark as vigente
      await updateMut.mutateAsync({
        id: selectedDoc.id,
        status: "vigente",
      });

      // Create a new document entry for the renewal
      await createMut.mutateAsync({
        title: `${selectedDoc.title} (Renovação)`,
        category: selectedDoc.category,
        fileUrl: url,
        fileName: file.name,
        mimeType: file.type || null,
        fileSize: file.size || null,
        description: `Renovação do documento: ${selectedDoc.title}`,
        documentDate: new Date(),
        expirationDate: null,
        status: "vigente",
      });

      setRenewalFiles([]);
      setSelectedDoc(null);
      setView("list");
    } catch (err) {
      console.error("Erro ao enviar renovação:", err);
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
    setView("detail");
  };

  const handleEdit = (doc: any) => {
    setEditingId(doc.id);
    setForm({
      title: doc.title,
      category: doc.category,
      description: doc.description || "",
      documentDate: doc.documentDate ? new Date(doc.documentDate).toISOString().split("T")[0] : "",
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

  // Sort documents: "Processo de Legalização" first (id=1 or title contains "Processo"), then by status (vencido first), then by date
  const sortedDocs = [...documents].sort((a: any, b: any) => {
    // Process document always first
    const aIsProcess = a.title.toLowerCase().includes("processo de legalização");
    const bIsProcess = b.title.toLowerCase().includes("processo de legalização");
    if (aIsProcess && !bIsProcess) return -1;
    if (!aIsProcess && bIsProcess) return 1;
    // Vencido documents next
    if (a.status === "vencido" && b.status !== "vencido") return -1;
    if (a.status !== "vencido" && b.status === "vencido") return 1;
    // Then by expiration date (soonest first)
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
    const StatusIcon = statusInfo.icon;
    const isVencido = selectedDoc.status === "vencido";
    return (
      <div className="space-y-6">
        <button
          onClick={() => { setSelectedDoc(null); setView("list"); }}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft size={16} /> Voltar à lista
        </button>

        <div className={`bg-card border-2 rounded-xl p-6 space-y-5 ${isVencido ? "border-red-300" : "border-border"}`}>
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <h2 className="text-xl font-bold text-foreground">{selectedDoc.title}</h2>
              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-primary/10 text-primary">
                  {selectedDoc.category}
                </span>
                <span className={`text-xs font-semibold px-3 py-1.5 rounded-full flex items-center gap-1.5 border ${statusInfo.bgColor} ${statusInfo.color}`}>
                  <StatusIcon size={14} /> {statusInfo.label}
                </span>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => handleEdit(selectedDoc)}>
                Editar
              </Button>
              <Button variant="outline" size="sm" className="text-red-500 hover:text-red-600" onClick={() => handleDelete(selectedDoc.id)}>
                <Trash2 size={14} />
              </Button>
            </div>
          </div>

          {/* DATES — Large and prominent */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className={`rounded-xl p-4 border ${isVencido ? "bg-red-50/50 border-red-200" : "bg-muted/20 border-border"}`}>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Data de Emissão</p>
              <p className="text-2xl font-bold text-foreground">
                {formatDateLarge(selectedDoc.documentDate) || "—"}
              </p>
            </div>
            <div className={`rounded-xl p-4 border ${isVencido ? "bg-red-100 border-red-300" : selectedDoc.expirationDate ? "bg-amber-50/50 border-amber-200" : "bg-muted/20 border-border"}`}>
              <p className={`text-xs font-medium uppercase tracking-wide mb-1 ${isVencido ? "text-red-600" : "text-muted-foreground"}`}>
                {isVencido ? "⚠ VENCIDO EM" : "Validade / Vencimento"}
              </p>
              <p className={`text-2xl font-bold ${isVencido ? "text-red-700" : "text-foreground"}`}>
                {formatDateLarge(selectedDoc.expirationDate) || "Sem validade"}
              </p>
            </div>
          </div>

          {/* Description */}
          {selectedDoc.description && (
            <div className="bg-muted/30 rounded-lg p-4">
              <p className="text-sm text-muted-foreground leading-relaxed">{selectedDoc.description}</p>
            </div>
          )}

          {/* File info */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground text-xs mb-1">Arquivo</p>
              <p className="font-medium truncate">{selectedDoc.fileName}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs mb-1">Tamanho</p>
              <p className="font-medium">{selectedDoc.fileSize ? `${(selectedDoc.fileSize / 1024 / 1024).toFixed(1)} MB` : "—"}</p>
            </div>
          </div>

          {/* View/Download button */}
          <div className="pt-3 border-t border-border">
            <a
              href={selectedDoc.fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-5 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-semibold text-sm"
            >
              <ExternalLink size={16} /> Visualizar / Baixar Documento
            </a>
          </div>

          {/* ─── RENEWAL UPLOAD SECTION ─────────────────────────────────────── */}
          <div className={`mt-6 pt-5 border-t-2 ${isVencido ? "border-red-200" : "border-border"}`}>
            <div className="flex items-center gap-2 mb-3">
              <RefreshCw size={18} className={isVencido ? "text-red-600" : "text-primary"} />
              <h3 className={`text-base font-bold ${isVencido ? "text-red-700" : "text-foreground"}`}>
                {isVencido ? "Enviar Renovação (Documento Vencido)" : "Enviar Renovação / Atualização"}
              </h3>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Anexe aqui o documento renovado. Ele será cadastrado como uma nova versão e o status será atualizado para "Vigente".
            </p>

            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1">
                <div
                  onClick={() => renewalInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all ${
                    renewalFiles.length > 0
                      ? "border-emerald-400 bg-emerald-50/50"
                      : isVencido
                      ? "border-red-300 hover:border-red-400 hover:bg-red-50/30"
                      : "border-border hover:border-primary/50 hover:bg-muted/20"
                  }`}
                >
                  {renewalFiles.length > 0 ? (
                    <div className="flex items-center gap-2 justify-center">
                      <FileText size={18} className="text-emerald-600" />
                      <span className="text-sm font-medium text-emerald-700">{renewalFiles[0].name}</span>
                      <span className="text-xs text-muted-foreground">
                        ({(renewalFiles[0].size / 1024 / 1024).toFixed(1)} MB)
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 justify-center">
                      <Upload size={18} className="text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">Clique para selecionar o arquivo renovado</span>
                    </div>
                  )}
                </div>
                <input
                  ref={renewalInputRef}
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                  onChange={handleRenewalSelect}
                  className="hidden"
                />
              </div>
              <Button
                onClick={handleRenewalUpload}
                disabled={renewalFiles.length === 0 || uploadingRenewal}
                className={`shrink-0 ${isVencido ? "bg-red-600 hover:bg-red-700" : ""}`}
              >
                {uploadingRenewal ? "Enviando..." : "Enviar Renovação"}
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─── FORM VIEW ────────────────────────────────────────────────────────────────
  if (view === "form") {
    return (
      <div className="space-y-6">
        <button
          onClick={() => { setView("list"); setEditingId(null); setForm(EMPTY_FORM); setPendingFiles([]); }}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft size={16} /> Voltar à lista
        </button>

        <div className="bg-card border border-border rounded-xl p-6 space-y-5">
          <h2 className="text-lg font-bold text-foreground">
            {editingId ? "Editar Documento" : "Novo Documento"}
          </h2>

          {/* Title */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Título *</label>
            <Input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="Ex: Processo de Legalização SISFAUNA"
            />
          </div>

          {/* Category + Status */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Categoria *</label>
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Status</label>
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value as any })}
                className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="vigente">Vigente</option>
                <option value="em_andamento">Em Andamento</option>
                <option value="vencido">Vencido</option>
                <option value="arquivado">Arquivado</option>
              </select>
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Data do Documento</label>
              <Input
                type="date"
                value={form.documentDate}
                onChange={(e) => setForm({ ...form, documentDate: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Data de Validade</label>
              <Input
                type="date"
                value={form.expirationDate}
                onChange={(e) => setForm({ ...form, expirationDate: e.target.value })}
              />
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Descrição / Observações</label>
            <Textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Detalhes sobre o documento..."
              rows={3}
            />
          </div>

          {/* File Upload (only for new documents) */}
          {!editingId && (
            <div className="space-y-3">
              <label className="text-sm font-medium text-foreground">Arquivo(s) *</label>
              <div
                ref={dropRef}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
                  dragOver
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50 hover:bg-muted/20"
                }`}
              >
                <Upload size={32} className="mx-auto mb-3 text-muted-foreground" />
                <p className="text-sm font-medium text-foreground">
                  Arraste arquivos aqui ou clique para selecionar
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  PDF, imagens, documentos — sem limite de tamanho
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
                    <div key={i} className="flex items-center gap-3 bg-muted/30 rounded-lg px-3 py-2">
                      <FileText size={16} className="text-primary shrink-0" />
                      <span className="text-sm truncate flex-1">{file.name}</span>
                      <span className="text-xs text-muted-foreground">
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
              className="flex-1"
            >
              {uploading ? "Enviando..." : editingId ? "Salvar Alterações" : "Cadastrar Documento"}
            </Button>
            <Button
              variant="outline"
              onClick={() => { setView("list"); setEditingId(null); setForm(EMPTY_FORM); setPendingFiles([]); }}
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
          <h2 className="text-xl font-bold text-foreground">Documentação do Criatório</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            {documents.length} documento{documents.length !== 1 ? "s" : ""} cadastrado{documents.length !== 1 ? "s" : ""}
            {vencidoCount > 0 && (
              <span className="ml-2 text-red-600 font-semibold">
                · {vencidoCount} vencido{vencidoCount !== 1 ? "s" : ""}
              </span>
            )}
          </p>
        </div>
        <Button onClick={() => { setForm(EMPTY_FORM); setPendingFiles([]); setEditingId(null); setView("form"); }}>
          <Plus size={16} className="mr-1.5" /> Novo Documento
        </Button>
      </div>

      {/* Vencido alert banner */}
      {vencidoCount > 0 && filterStatus === "all" && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
          <AlertCircle size={20} className="text-red-600 shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-red-700">
              {vencidoCount} documento{vencidoCount !== 1 ? "s" : ""} vencido{vencidoCount !== 1 ? "s" : ""} — necessitam renovação
            </p>
            <p className="text-xs text-red-600/70 mt-0.5">
              Clique no documento para enviar a renovação
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="text-red-600 border-red-300 hover:bg-red-100"
            onClick={() => setFilterStatus("vencido")}
          >
            Ver vencidos
          </Button>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por título ou arquivo..."
            className="pl-9"
          />
        </div>
        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          className="h-9 rounded-md border border-input bg-background px-3 text-sm min-w-[160px]"
        >
          <option value="all">Todas Categorias</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="h-9 rounded-md border border-input bg-background px-3 text-sm min-w-[140px]"
        >
          <option value="all">Todos Status</option>
          <option value="vigente">Vigente</option>
          <option value="em_andamento">Em Andamento</option>
          <option value="vencido">Vencido</option>
          <option value="arquivado">Arquivado</option>
        </select>
      </div>

      {/* Document list */}
      {filteredDocs.length === 0 ? (
        <div className="text-center py-16 bg-card border border-border rounded-xl">
          <FileText size={48} className="mx-auto mb-4 text-muted-foreground/30" />
          <p className="text-muted-foreground font-medium">
            {documents.length === 0 ? "Nenhum documento cadastrado" : "Nenhum resultado encontrado"}
          </p>
          <p className="text-sm text-muted-foreground/60 mt-1">
            {documents.length === 0 ? "Clique em \"Novo Documento\" para começar" : "Tente ajustar os filtros"}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredDocs.map((doc: any) => {
            const statusInfo = STATUS_LABELS[doc.status] || STATUS_LABELS.vigente;
            const StatusIcon = statusInfo.icon;
            const isProcess = doc.title.toLowerCase().includes("processo de legalização");
            const isVencido = doc.status === "vencido";
            return (
              <div
                key={doc.id}
                onClick={() => handleViewDetail(doc)}
                className={`bg-card border-2 rounded-xl p-4 hover:shadow-md transition-all cursor-pointer ${
                  isProcess
                    ? "border-primary/40 bg-primary/5"
                    : isVencido
                    ? "border-red-300 bg-red-50/30"
                    : "border-border hover:border-primary/30"
                }`}
              >
                <div className="flex items-center gap-4">
                  {/* Icon */}
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                    isProcess ? "bg-primary/20" : isVencido ? "bg-red-100" : "bg-primary/10"
                  }`}>
                    <FileText size={20} className={isProcess ? "text-primary" : isVencido ? "text-red-600" : "text-primary"} />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className={`font-bold truncate ${isProcess ? "text-primary" : "text-foreground"}`}>
                        {isProcess && <span className="text-xs font-semibold bg-primary/20 text-primary px-1.5 py-0.5 rounded mr-2">PRINCIPAL</span>}
                        {doc.title}
                      </h3>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Tag size={11} /> {doc.category}
                      </span>
                    </div>
                  </div>

                  {/* Dates — visible in list */}
                  <div className="hidden sm:flex flex-col items-end gap-0.5 shrink-0 mr-2">
                    {doc.documentDate && (
                      <span className="text-xs text-muted-foreground">
                        <Calendar size={10} className="inline mr-1" />
                        {formatDateLarge(doc.documentDate)}
                      </span>
                    )}
                    {doc.expirationDate && (
                      <span className={`text-sm font-bold ${isVencido ? "text-red-700" : "text-amber-700"}`}>
                        Venc: {formatDateLarge(doc.expirationDate)}
                      </span>
                    )}
                  </div>

                  {/* Status badge */}
                  <span className={`text-xs font-semibold px-2.5 py-1.5 rounded-full flex items-center gap-1 shrink-0 border ${statusInfo.bgColor} ${statusInfo.color}`}>
                    <StatusIcon size={12} /> {statusInfo.label}
                  </span>

                  {/* Actions */}
                  <div className="flex gap-1 shrink-0">
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDelete(doc.id); }}
                      className="p-1.5 rounded-lg hover:bg-red-50 text-muted-foreground hover:text-red-500 transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                {/* Mobile dates row */}
                <div className="sm:hidden flex items-center gap-4 mt-2 ml-14 text-xs">
                  {doc.documentDate && (
                    <span className="text-muted-foreground">
                      Emissão: {formatDateLarge(doc.documentDate)}
                    </span>
                  )}
                  {doc.expirationDate && (
                    <span className={`font-bold ${isVencido ? "text-red-700" : "text-amber-700"}`}>
                      Venc: {formatDateLarge(doc.expirationDate)}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
