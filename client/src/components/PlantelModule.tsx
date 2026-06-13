/**
 * PlantelModule — Cadastro completo das aves do criatório
 * Listagem com filtros, formulário de cadastro, card de detalhe
 * Seleção de espécie ao entrar no card
 * Inclui: árvore genealógica (pai/mãe), número da NF, upload de documentos, filtro por documentação
 */
import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { species } from "@/data/feeding";
import {
  Bird, Plus, Search, Edit2, Trash2, ArrowLeft, Save,
  Filter, ChevronDown, X, Upload, FileText, ExternalLink,
  AlertTriangle, Download, Users
} from "lucide-react";
import { cn } from "@/lib/utils";
import { generateLineagePdf } from "@/lib/lineagePdf";

// Apenas as espécies do plantel (inCurrentFlock: true)
const SPECIES_LIST = species
  .filter(s => s.inCurrentFlock)
  .sort((a, b) => a.commonName.localeCompare(b.commonName));

// Código único da ave: prefixo 2 letras (espécie) + número
// Cada código é único e nunca se repete no criatório
const SPECIES_PREFIX: Record<string, string> = {
  "psittacula-krameri": "RN",       // Ringneck
  "psittacula-cyanocephala": "CA",  // Cabeça de Ameixa
  "psittacula-eupatria": "GA",      // Grande Alexandre (Alexandrino)
  "eclectus-roratus": "EC",         // Ecletus
  "psittacula-alexandri": "MT",     // Moustache
  "polytelis-anthopeplus": "RG",    // Regente
  "alisterus-scapularis": "KP",     // King Parrot
  "psittacus-erithacus": "PC",      // Papagaio do Congo
};

// Função para obter o prefixo a partir do speciesId
function getSpeciesPrefix(speciesId: string): string {
  return SPECIES_PREFIX[speciesId] || speciesId.substring(0, 2).toUpperCase();
}

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
  nascido_criadouro: "Nascido no Criatório Minas Bird",
  comprado: "Comprado",
  doado: "Doado",
  troca: "Troca",
};

const KNOWN_BREEDERS = [
  "Criatório SilkRock",
  "Criatório Fercal Birds",
  "Criatório E-Curtolo Aviário",
  "Criatório Bico de Ouro",
  "Criatório Psittatiba",
  "Criatório Aves de Gala",
  "Criatório Parrot Farm",
];

type ParentSource = "plantel" | "externo";

type DatePrecision = "full" | "month_year" | "year_only";

interface BirdForm {
  speciesId: string;
  speciesName: string;
  birdNumber: string; // Número da ave (sem prefixo)
  anilha: string; // Número da anilha física
  hasInvoice: boolean; // Nota Fiscal Sim/Não
  invoiceNumber: string; // Número da NF
  documents: string[]; // Documentos que acompanham
  otherDocuments: string; // Campo livre para outros documentos
  sex: BirdSex;
  birthDate: string;
  birthDatePrecision: DatePrecision;
  birthMonth: string; // MM format
  birthYear: string; // YYYY format
  mutation: string;
  origin: BirdOrigin;
  originBreeder: string;
  status: BirdStatus;
  enclosure: string;
  notes: string;
  fatherId: number | null;
  fatherSource: ParentSource;
  fatherNote: string; // Observação para pai externo
  fatherMutation: string; // Mutação do pai externo
  fatherBreeder: string; // Criatório do pai externo
  motherId: number | null;
  motherSource: ParentSource;
  motherNote: string; // Observação para mãe externa
  motherMutation: string; // Mutação da mãe externa
  motherBreeder: string; // Criatório da mãe externa
  // Drag-drop pending files for upload after bird is created
  pendingFiles: File[];
}

const DOCUMENT_OPTIONS = [
  { id: "nota_fiscal", label: "Nota Fiscal" },
  { id: "certificado_origem", label: "Certificado de Origem" },
  { id: "atestado_saude", label: "Atestado de Saúde" },
  { id: "gta", label: "Guia de Transporte (GTA)" },
  { id: "sexagem", label: "Sexagem" },
  { id: "exame_sanidade", label: "Exame de Sanidade" },
];

const EMPTY_FORM: BirdForm = {
  speciesId: "",
  speciesName: "",
  birdNumber: "",
  anilha: "",
  hasInvoice: false,
  invoiceNumber: "",
  documents: [],
  otherDocuments: "",
  sex: "indefinido",
  birthDate: "",
  birthDatePrecision: "full",
  birthMonth: "",
  birthYear: "",
  mutation: "",
  origin: "nascido_criadouro",
  originBreeder: "",
  status: "ativo",
  enclosure: "",
  notes: "",
  fatherId: null,
  fatherSource: "plantel",
  fatherNote: "",
  fatherMutation: "",
  fatherBreeder: "",
  motherId: null,
  motherSource: "plantel",
  motherNote: "",
  motherMutation: "",
  motherBreeder: "",
  pendingFiles: [],
};

type View = "list" | "form" | "detail";
type DocFilter = "todos" | "com_nf" | "sem_nf";

export default function PlantelModule() {
  const [view, setView] = useState<View>("list");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [selectedBirdId, setSelectedBirdId] = useState<number | null>(null);
  const [form, setForm] = useState<BirdForm>(EMPTY_FORM);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<BirdStatus | "todos">("todos");
  const [filterSpecies, setFilterSpecies] = useState<string>("todos");
  const [filterDoc, setFilterDoc] = useState<DocFilter>("todos");
  const [speciesSearch, setSpeciesSearch] = useState("");
  const [showSpeciesDropdown, setShowSpeciesDropdown] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadDocType, setUploadDocType] = useState("outro");

  // ===== ANILHA UNIQUENESS VALIDATION =====
  const [anilhaDuplicate, setAnilhaDuplicate] = useState<{ exists: boolean; bird: { id: number; ringNumber: string | null; speciesName: string } | null } | null>(null);
  const [anilhaChecking, setAnilhaChecking] = useState(false);
  const anilhaTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Normaliza anilha: remove tudo que não é letra/número, uppercase
  const normalizeAnilha = useCallback((value: string) => {
    return value.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
  }, []);

  // Debounced check de anilha duplicada
  useEffect(() => {
    // Limpar timer anterior
    if (anilhaTimerRef.current) {
      clearTimeout(anilhaTimerRef.current);
      anilhaTimerRef.current = null;
    }

    const normalized = normalizeAnilha(form.anilha);
    if (!normalized) {
      setAnilhaDuplicate(null);
      setAnilhaChecking(false);
      return;
    }

    setAnilhaChecking(true);
    anilhaTimerRef.current = setTimeout(async () => {
      try {
        const result = await utils.plantel.checkAnilha.fetch({
          anilha: form.anilha,
          excludeId: editingId || undefined,
        });
        setAnilhaDuplicate(result);
      } catch {
        setAnilhaDuplicate(null);
      } finally {
        setAnilhaChecking(false);
      }
    }, 400);

    return () => {
      if (anilhaTimerRef.current) {
        clearTimeout(anilhaTimerRef.current);
      }
    };
  }, [form.anilha, editingId]);

  // Reset anilha validation when switching views
  useEffect(() => {
    if (view !== "form") {
      setAnilhaDuplicate(null);
      setAnilhaChecking(false);
    }
  }, [view]);

  // tRPC
  const { data: birds = [], isLoading } = trpc.plantel.list.useQuery();
  const createMut = trpc.plantel.create.useMutation();
  const updateMut = trpc.plantel.update.useMutation();
  const deleteMut = trpc.plantel.delete.useMutation();
  const uploadDocMut = trpc.plantel.uploadDocument.useMutation();
  const deleteDocMut = trpc.plantel.deleteDocument.useMutation();
  const utils = trpc.useUtils();

  // Documents for selected bird
  const { data: birdDocs = [] } = trpc.plantel.getDocuments.useQuery(
    { birdId: selectedBirdId! },
    { enabled: !!selectedBirdId && view === "detail" }
  );

  // Filtered birds
  const filteredBirds = useMemo(() => {
    return birds.filter(b => {
      const matchesSearch =
        !searchTerm ||
        b.speciesName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (b.ringNumber && b.ringNumber.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (b.mutation && b.mutation.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (b.enclosure && b.enclosure.toLowerCase().includes(searchTerm.toLowerCase())) ||
        ((b as any).anilha && (b as any).anilha.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesStatus = filterStatus === "todos" || b.status === filterStatus;
      const matchesSpecies = filterSpecies === "todos" || b.speciesId === filterSpecies;
      // Documentation filter
      let matchesDoc = true;
      if (filterDoc === "com_nf") {
        // Has NF: either invoiceNumber is set, or notes has _docMeta.hasInvoice
        let hasNF = !!(b as any).invoiceNumber;
        if (!hasNF) {
          try {
            const parsed = b.notes ? JSON.parse(b.notes) : null;
            if (parsed && parsed._docMeta && parsed._docMeta.hasInvoice) hasNF = true;
          } catch { /* plain text */ }
        }
        matchesDoc = hasNF;
      } else if (filterDoc === "sem_nf") {
        let hasNF = !!(b as any).invoiceNumber;
        if (!hasNF) {
          try {
            const parsed = b.notes ? JSON.parse(b.notes) : null;
            if (parsed && parsed._docMeta && parsed._docMeta.hasInvoice) hasNF = true;
          } catch { /* plain text */ }
        }
        matchesDoc = !hasNF;
      }
      return matchesSearch && matchesStatus && matchesSpecies && matchesDoc;
    });
  }, [birds, searchTerm, filterStatus, filterSpecies, filterDoc]);

  // Species in the dropdown filtered by search
  const filteredSpeciesList = useMemo(() => {
    if (!speciesSearch) return SPECIES_LIST;
    return SPECIES_LIST.filter(s =>
      s.commonName.toLowerCase().includes(speciesSearch.toLowerCase()) ||
      s.scientificName.toLowerCase().includes(speciesSearch.toLowerCase())
    );
  }, [speciesSearch]);

  // Available parents for genealogy (same species, filtered by sex)
  const availableFathers = useMemo(() => {
    if (!form.speciesId) return [];
    return birds.filter(b =>
      b.speciesId === form.speciesId &&
      b.sex === "macho" &&
      b.id !== editingId
    );
  }, [birds, form.speciesId, editingId]);

  const availableMothers = useMemo(() => {
    if (!form.speciesId) return [];
    return birds.filter(b =>
      b.speciesId === form.speciesId &&
      b.sex === "femea" &&
      b.id !== editingId
    );
  }, [birds, form.speciesId, editingId]);

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
    // Extrair número do código (remover prefixo de 2 letras)
    const prefix = getSpeciesPrefix(bird.speciesId);
    const num = bird.ringNumber && bird.ringNumber.startsWith(prefix)
      ? bird.ringNumber.substring(prefix.length)
      : bird.ringNumber || "";
    // Parse documents from notes JSON if stored there
    let docs: string[] = [];
    let otherDocs = "";
    let hasNF = false;
    try {
      const meta = bird.notes ? JSON.parse(bird.notes) : null;
      if (meta && meta._docMeta) {
        docs = meta._docMeta.documents || [];
        otherDocs = meta._docMeta.otherDocuments || "";
        hasNF = meta._docMeta.hasInvoice || false;
      }
    } catch { /* notes is plain text */ }
    // If invoiceNumber is set on the bird record, it has NF
    if ((bird as any).invoiceNumber) hasNF = true;
    setForm({
      speciesId: bird.speciesId,
      speciesName: bird.speciesName,
      birdNumber: num,
      anilha: (bird as any).anilha || "",
      hasInvoice: hasNF,
      invoiceNumber: (bird as any).invoiceNumber || "",
      documents: docs,
      otherDocuments: otherDocs,
      sex: bird.sex as BirdSex,
      birthDate: bird.birthDate ? new Date(bird.birthDate).toISOString().split("T")[0] : "",
      mutation: bird.mutation || "",
      origin: bird.origin as BirdOrigin,
      originBreeder: bird.originBreeder || "",
      status: bird.status as BirdStatus,
      enclosure: bird.enclosure || "",
      notes: (() => {
        try {
          const parsed = bird.notes ? JSON.parse(bird.notes) : null;
          if (parsed && parsed._docMeta) return parsed.text || "";
        } catch { /* plain text */ }
        return bird.notes || "";
      })(),
      fatherId: (bird as any).fatherId || null,
      fatherSource: (bird as any).fatherId ? "plantel" : ((() => { try { const p = bird.notes ? JSON.parse(bird.notes) : null; return p?._docMeta?.fatherNote ? "externo" : "plantel"; } catch { return "plantel"; } })()),
      fatherNote: (() => { try { const p = bird.notes ? JSON.parse(bird.notes) : null; return p?._docMeta?.fatherNote || ""; } catch { return ""; } })(),
      fatherMutation: (() => { try { const p = bird.notes ? JSON.parse(bird.notes) : null; return p?._docMeta?.fatherMutation || ""; } catch { return ""; } })(),
      fatherBreeder: (() => { try { const p = bird.notes ? JSON.parse(bird.notes) : null; return p?._docMeta?.fatherBreeder || ""; } catch { return ""; } })(),
      motherId: (bird as any).motherId || null,
      motherSource: (bird as any).motherId ? "plantel" : ((() => { try { const p = bird.notes ? JSON.parse(bird.notes) : null; return p?._docMeta?.motherNote ? "externo" : "plantel"; } catch { return "plantel"; } })()),
      motherNote: (() => { try { const p = bird.notes ? JSON.parse(bird.notes) : null; return p?._docMeta?.motherNote || ""; } catch { return ""; } })(),
      motherMutation: (() => { try { const p = bird.notes ? JSON.parse(bird.notes) : null; return p?._docMeta?.motherMutation || ""; } catch { return ""; } })(),
      motherBreeder: (() => { try { const p = bird.notes ? JSON.parse(bird.notes) : null; return p?._docMeta?.motherBreeder || ""; } catch { return ""; } })(),
      birthDatePrecision: (() => { try { const p = bird.notes ? JSON.parse(bird.notes) : null; return p?._docMeta?.birthDatePrecision || "full"; } catch { return "full" as DatePrecision; } })(),
      birthMonth: (() => { if (!bird.birthDate) return ""; return String(new Date(bird.birthDate).getMonth() + 1).padStart(2, "0"); })(),
      birthYear: (() => { if (!bird.birthDate) return ""; return String(new Date(bird.birthDate).getFullYear()); })(),
      pendingFiles: [],
    });
    setEditingId(bird.id);
    setView("form");
  };

  const handleSelectSpecies = async (sp: typeof SPECIES_LIST[0]) => {
    setForm(prev => ({ ...prev, speciesId: sp.id, speciesName: sp.commonName, fatherId: null, fatherNote: "", fatherMutation: "", fatherBreeder: "", fatherSource: "plantel", motherId: null, motherNote: "", motherMutation: "", motherBreeder: "", motherSource: "plantel" }));
    setShowSpeciesDropdown(false);
    setSpeciesSearch("");
    // Auto-fill next available number for this species
    try {
      const result = await utils.plantel.nextNumber.fetch({ speciesId: sp.id });
      if (result?.nextNumber) {
        setForm(prev => ({ ...prev, birdNumber: result.nextNumber }));
      }
    } catch (e) {
      // Silently fail - user can still type manually
    }
  };

  const handleSubmit = async () => {
    if (!form.speciesId) return;
    // Bloquear se anilha duplicada
    if (anilhaDuplicate?.exists) return;

    // Montar código completo: prefixo + número
    const prefix = getSpeciesPrefix(form.speciesId);
    const fullCode = form.birdNumber ? `${prefix}${form.birdNumber}` : null;

    // Incluir metadados de documentos e genealogia no campo notes como JSON
    const hasDocMeta = form.hasInvoice || form.documents.length > 0 || form.otherDocuments || form.fatherNote || form.motherNote || form.fatherMutation || form.fatherBreeder || form.motherMutation || form.motherBreeder || form.birthDatePrecision !== "full";
    let notesValue = form.notes || null;
    if (hasDocMeta) {
      const docMeta = {
        _docMeta: {
          hasInvoice: form.hasInvoice,
          documents: form.documents,
          otherDocuments: form.otherDocuments,
          fatherNote: form.fatherSource === "externo" ? form.fatherNote : "",
          fatherMutation: form.fatherSource === "externo" ? form.fatherMutation : "",
          fatherBreeder: form.fatherSource === "externo" ? form.fatherBreeder : "",
          motherNote: form.motherSource === "externo" ? form.motherNote : "",
          motherMutation: form.motherSource === "externo" ? form.motherMutation : "",
          motherBreeder: form.motherSource === "externo" ? form.motherBreeder : "",
          birthDatePrecision: form.birthDatePrecision,
        },
        text: form.notes || "",
      };
      notesValue = JSON.stringify(docMeta);
    }

    const payload = {
      speciesId: form.speciesId,
      speciesName: form.speciesName,
      ringNumber: fullCode,
      sex: form.sex,
      birthDate: (() => {
        if (form.birthDatePrecision === "full" && form.birthDate) return new Date(form.birthDate);
        if (form.birthDatePrecision === "month_year" && form.birthMonth && form.birthYear) return new Date(`${form.birthYear}-${form.birthMonth}-01`);
        if (form.birthDatePrecision === "year_only" && form.birthYear) return new Date(`${form.birthYear}-01-01`);
        return null;
      })(),
      mutation: form.mutation || null,
      origin: form.origin,
      originBreeder: form.originBreeder || null,
      status: form.status,
      enclosure: form.enclosure || null,
      weightGrams: null,
      notes: notesValue,
      anilha: form.anilha || null,
      fatherId: form.fatherSource === "plantel" ? (form.fatherId || null) : null,
      motherId: form.motherSource === "plantel" ? (form.motherId || null) : null,
      invoiceNumber: form.hasInvoice && form.invoiceNumber ? form.invoiceNumber : null,
    };

    let birdId = editingId;
    if (editingId) {
      await updateMut.mutateAsync({ id: editingId, ...payload });
    } else {
      const result = await createMut.mutateAsync(payload);
      birdId = (result as any)?.id || null;
    }

    // Upload pending files if any
    if (form.pendingFiles.length > 0 && birdId) {
      for (const file of form.pendingFiles) {
        try {
          const reader = new FileReader();
          const base64 = await new Promise<string>((resolve, reject) => {
            reader.onload = () => {
              const result = reader.result as string;
              resolve(result.split(",")[1]);
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
          });
          await uploadDocMut.mutateAsync({
            birdId: birdId,
            docType: "documento",
            fileName: file.name,
            mimeType: file.type || "application/octet-stream",
            fileBase64: base64,
          });
        } catch (err) {
          console.error("Failed to upload file:", file.name, err);
        }
      }
    }

    utils.plantel.list.invalidate();
    utils.plantel.getDocuments.invalidate();
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

  // File upload handler
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedBirdId) return;
    setUploading(true);
    try {
      // Read file as base64
      const reader = new FileReader();
      const base64 = await new Promise<string>((resolve, reject) => {
        reader.onload = () => {
          const result = reader.result as string;
          // Remove data URL prefix (data:mime;base64,...)
          const base64Data = result.split(",")[1];
          resolve(base64Data);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      await uploadDocMut.mutateAsync({
        birdId: selectedBirdId,
        docType: uploadDocType,
        fileName: file.name,
        mimeType: file.type || "application/octet-stream",
        fileBase64: base64,
      });
      utils.plantel.getDocuments.invalidate({ birdId: selectedBirdId });
    } catch (err) {
      console.error("Upload failed:", err);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDeleteDoc = async (docId: number) => {
    await deleteDocMut.mutateAsync({ id: docId });
    if (selectedBirdId) {
      utils.plantel.getDocuments.invalidate({ birdId: selectedBirdId });
    }
  };

  // === CONSANGUINITY DETECTION ===
  // Traverse ancestors up to 3 generations and check for shared ancestors
  const getAncestors = (birdId: number | null, depth: number = 3): Set<number> => {
    const ancestors = new Set<number>();
    if (!birdId || depth === 0) return ancestors;
    const bird = birds.find(b => b.id === birdId);
    if (!bird) return ancestors;
    const fId = (bird as any).fatherId;
    const mId = (bird as any).motherId;
    if (fId) {
      ancestors.add(fId);
      getAncestors(fId, depth - 1).forEach(a => ancestors.add(a));
    }
    if (mId) {
      ancestors.add(mId);
      getAncestors(mId, depth - 1).forEach(a => ancestors.add(a));
    }
    return ancestors;
  };

  // Check consanguinity between selected father and mother in the form
  const consanguinityAlert = useMemo(() => {
    if (form.fatherSource !== "plantel" || form.motherSource !== "plantel") return null;
    if (!form.fatherId || !form.motherId) return null;
    // Check if father and mother share any ancestors (up to 3 generations)
    const fatherAncestors = getAncestors(form.fatherId, 3);
    const motherAncestors = getAncestors(form.motherId, 3);
    // Also check if one is ancestor of the other
    if (fatherAncestors.has(form.motherId) || motherAncestors.has(form.fatherId)) {
      return "Alerta: Pai e Mãe possuem relação direta de parentesco!";
    }
    // Check shared ancestors
    const shared: number[] = [];
    fatherAncestors.forEach(a => {
      if (motherAncestors.has(a)) shared.push(a);
    });
    if (shared.length > 0) {
      const names = shared.map(id => {
        const b = birds.find(x => x.id === id);
        return b ? (b.ringNumber || b.speciesName) : `#${id}`;
      });
      return `Alerta de Consanguinidade: Pai e Mãe compartilham ancestral(is) comum(ns): ${names.join(", ")}`;
    }
    return null;
  }, [form.fatherId, form.motherId, form.fatherSource, form.motherSource, birds]);

  // === CHILDREN LIST (for detail view) ===
  const childrenOfBird = useMemo(() => {
    if (!selectedBirdId) return [];
    return birds.filter(b =>
      (b as any).fatherId === selectedBirdId || (b as any).motherId === selectedBirdId
    );
  }, [birds, selectedBirdId]);

  // === RENDER: LIST VIEW ===
  if (view === "list") {
    return (
      <div className="space-y-5">
        {/* Hero Banner */}
        <div className="relative h-32 rounded-2xl overflow-hidden shadow-lg shadow-emerald-900/10">
          <img src="/manus-storage/bird-alexandrines_3e5db796.jpeg" alt="Plantel" className="w-full h-full object-cover object-[center_30%]" />
          <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/30 to-transparent flex items-end p-5">
            <div>
              <p className="text-emerald-300/80 text-[10px] font-bold tracking-[0.2em] uppercase mb-1">Módulo 2</p>
              <h1 className="text-white text-xl lg:text-2xl font-bold tracking-tight">Plantel</h1>
              <p className="text-white/70 text-sm mt-1.5 font-light">Cadastro e gestão completa das aves do criatório</p>
            </div>
          </div>
        </div>
        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white rounded-2xl border border-stone-200/80 p-4 shadow-sm">
            <p className="text-[10px] text-stone-500 font-medium uppercase tracking-wider">Total Aves</p>
            <p className="text-2xl font-bold text-stone-800 mt-1">{stats.total}</p>
          </div>
          <div className="bg-white rounded-2xl border border-stone-200/80 p-4 shadow-sm">
            <p className="text-[10px] text-stone-500 font-medium uppercase tracking-wider">Ativas</p>
            <p className="text-2xl font-bold text-emerald-700 mt-1">{stats.ativos}</p>
          </div>
          <div className="bg-white rounded-2xl border border-stone-200/80 p-4 shadow-sm">
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
          <div className="flex items-center gap-2 flex-wrap">
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
            <select
              value={filterDoc}
              onChange={e => setFilterDoc(e.target.value as DocFilter)}
              className="px-3 py-2.5 rounded-lg border border-stone-200 bg-white text-xs font-medium text-stone-600 focus:outline-none focus:ring-2 focus:ring-emerald-200"
            >
              <option value="todos">Documentação</option>
              <option value="com_nf">Com NF</option>
              <option value="sem_nf">Sem NF</option>
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
                className="bg-white rounded-2xl border border-stone-200/80 p-4 shadow-sm hover:shadow-md hover:border-emerald-200 transition-all cursor-pointer group"
              >
                <div className="flex items-center gap-4">
                  {/* Left: Icon + Code (destaque principal) */}
                  <div className="flex items-center gap-3 min-w-[140px]">
                    <div className="w-11 h-11 rounded-full bg-emerald-50 flex items-center justify-center border-2 border-emerald-200">
                      <Bird size={18} className="text-emerald-600" />
                    </div>
                    <div>
                      {bird.ringNumber ? (
                        <p className="text-lg font-extrabold text-emerald-700 font-mono leading-tight tracking-wide">{bird.ringNumber}</p>
                      ) : (
                        <p className="text-sm font-bold text-stone-400 italic">Sem código</p>
                      )}
                      <span className={cn("inline-block mt-0.5 px-2 py-0.5 rounded-full text-[10px] font-semibold border", STATUS_COLORS[bird.status as BirdStatus])}>
                        {STATUS_LABELS[bird.status as BirdStatus]}
                      </span>
                    </div>
                  </div>

                  {/* Center columns: Espécie | Sexo | Gaiola | Mutação (destaque) */}
                  <div className="flex-1 flex items-start gap-5 sm:gap-6">
                    <div className="w-[100px] flex-shrink-0 hidden sm:block">
                      <p className="text-[10px] text-stone-400 font-medium uppercase tracking-wider">Espécie</p>
                      <p className="text-sm font-semibold text-stone-800 leading-tight">{bird.speciesName}</p>
                    </div>
                    <div className="w-[75px] flex-shrink-0 hidden sm:block">
                      <p className="text-[10px] text-stone-400 font-medium uppercase tracking-wider">Sexo</p>
                      <p className="text-sm font-semibold text-stone-800">{SEX_LABELS[bird.sex as BirdSex]}</p>
                    </div>
                    <div className="w-[75px] flex-shrink-0 hidden sm:block">
                      <p className="text-[10px] text-stone-400 font-medium uppercase tracking-wider">Gaiola</p>
                      <p className="text-sm font-semibold text-stone-800">{bird.enclosure || <span className="text-stone-300 italic">—</span>}</p>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] text-stone-400 font-medium uppercase tracking-wider">Mutação</p>
                      <p className="text-sm font-bold text-stone-900 leading-snug break-words">{bird.mutation || <span className="text-stone-300 italic font-normal">—</span>}</p>
                    </div>
                  </div>

                  {/* Right: Arrow */}
                  <ChevronDown size={16} className="text-stone-300 group-hover:text-emerald-400 -rotate-90 transition-colors flex-shrink-0" />
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
        <div className="bg-white rounded-2xl border border-stone-200/80 p-6 shadow-sm space-y-5">
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

          {/* Row: Código da Ave + Sex */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-stone-600 mb-1.5">
                Código da Ave <span className="text-red-500">*</span>
              </label>
              <div className="flex items-stretch">
                {/* Prefixo automático (baseado na espécie) */}
                <div className="flex items-center px-3 py-2.5 rounded-l-lg border border-r-0 border-stone-200 bg-emerald-50 text-emerald-700 font-bold text-sm min-w-[48px] justify-center">
                  {form.speciesId ? getSpeciesPrefix(form.speciesId) : "??"}
                </div>
                {/* Número digitado pelo usuário */}
                <input
                  type="text"
                  value={form.birdNumber}
                  onChange={e => setForm(prev => ({ ...prev, birdNumber: e.target.value.replace(/[^0-9]/g, '') }))}
                  placeholder="001"
                  className="flex-1 px-4 py-2.5 rounded-r-lg border border-stone-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200 font-mono"
                />
              </div>
              {form.speciesId && form.birdNumber && (
                <p className="text-[11px] text-stone-500 mt-1">
                  Código final: <span className="font-bold text-emerald-700">{getSpeciesPrefix(form.speciesId)}{form.birdNumber}</span>
                </p>
              )}
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

          {/* Row: Anilha + Nota Fiscal */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-stone-600 mb-1.5">Anilha</label>
              <input
                type="text"
                value={form.anilha}
                onChange={e => setForm(prev => ({ ...prev, anilha: e.target.value }))}
                placeholder="Número da anilha física"
                className={cn(
                  "w-full px-4 py-2.5 rounded-lg border text-sm focus:outline-none focus:ring-2",
                  anilhaDuplicate?.exists
                    ? "border-red-400 focus:ring-red-200 bg-red-50"
                    : "border-stone-200 focus:ring-emerald-200"
                )}
              />
              {anilhaChecking && normalizeAnilha(form.anilha) && (
                <p className="text-xs text-stone-400 mt-1">Verificando...</p>
              )}
              {anilhaDuplicate?.exists && anilhaDuplicate.bird && (
                <div className="flex items-center gap-1.5 mt-1.5 p-2 rounded-lg bg-red-50 border border-red-200">
                  <AlertTriangle size={14} className="text-red-500 shrink-0" />
                  <p className="text-xs text-red-600 font-medium">
                    Esta anilha já está cadastrada na ave {anilhaDuplicate.bird.ringNumber || ""} ({anilhaDuplicate.bird.speciesName})
                  </p>
                </div>
              )}
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-600 mb-1.5">Nota Fiscal</label>
              <div className="flex items-center gap-4 py-2.5">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="hasInvoice"
                    checked={form.hasInvoice === true}
                    onChange={() => setForm(prev => ({ ...prev, hasInvoice: true }))}
                    className="w-4 h-4 text-emerald-600 focus:ring-emerald-200"
                  />
                  <span className="text-sm text-stone-700 font-medium">Sim</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="hasInvoice"
                    checked={form.hasInvoice === false}
                    onChange={() => setForm(prev => ({ ...prev, hasInvoice: false, invoiceNumber: "" }))}
                    className="w-4 h-4 text-emerald-600 focus:ring-emerald-200"
                  />
                  <span className="text-sm text-stone-700 font-medium">Não</span>
                </label>
              </div>
            </div>
          </div>

          {/* Número da NF (só aparece quando NF = Sim) */}
          {form.hasInvoice && (
            <div>
              <label className="block text-xs font-semibold text-stone-600 mb-1.5">Número da Nota Fiscal</label>
              <input
                type="text"
                value={form.invoiceNumber}
                onChange={e => setForm(prev => ({ ...prev, invoiceNumber: e.target.value }))}
                placeholder="Ex: 001234, NF-e 35..."
                className="w-full px-4 py-2.5 rounded-lg border border-stone-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200"
              />
            </div>
          )}

          {/* Documentação (independente da NF — sempre visível) */}
          <div className="p-4 rounded-lg border border-stone-200 bg-stone-50/50">
            <label className="block text-xs font-semibold text-stone-600 mb-3">Documentação</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {DOCUMENT_OPTIONS.map(doc => (
                <label key={doc.id} className="flex items-center gap-2.5 cursor-pointer py-1">
                  <input
                    type="checkbox"
                    checked={form.documents.includes(doc.id)}
                    onChange={e => {
                      if (e.target.checked) {
                        setForm(prev => ({ ...prev, documents: [...prev.documents, doc.id] }));
                      } else {
                        setForm(prev => ({ ...prev, documents: prev.documents.filter(d => d !== doc.id) }));
                      }
                    }}
                    className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-200"
                  />
                  <span className="text-sm text-stone-700">{doc.label}</span>
                </label>
              ))}
            </div>
            <div className="mt-3">
              <label className="block text-xs font-semibold text-stone-600 mb-1.5">Outros documentos</label>
              <input
                type="text"
                value={form.otherDocuments}
                onChange={e => setForm(prev => ({ ...prev, otherDocuments: e.target.value }))}
                placeholder="Descreva outros documentos..."
                className="w-full px-4 py-2.5 rounded-lg border border-stone-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200 bg-white"
              />
            </div>
            {/* Drag-and-drop file area */}
            <div className="mt-3">
              <label className="block text-xs font-semibold text-stone-600 mb-1.5">Anexar Arquivos</label>
              <div
                onDragOver={e => { e.preventDefault(); e.stopPropagation(); e.currentTarget.classList.add("border-emerald-400", "bg-emerald-50"); }}
                onDragLeave={e => { e.preventDefault(); e.stopPropagation(); e.currentTarget.classList.remove("border-emerald-400", "bg-emerald-50"); }}
                onDrop={e => {
                  e.preventDefault();
                  e.stopPropagation();
                  e.currentTarget.classList.remove("border-emerald-400", "bg-emerald-50");
                  const files = Array.from(e.dataTransfer.files).filter(f =>
                    f.type === "application/pdf" || f.type.startsWith("image/") || f.name.endsWith(".doc") || f.name.endsWith(".docx")
                  );
                  if (files.length > 0) {
                    setForm(prev => ({ ...prev, pendingFiles: [...prev.pendingFiles, ...files] }));
                  }
                }}
                onClick={() => {
                  const input = document.createElement("input");
                  input.type = "file";
                  input.multiple = true;
                  input.accept = ".pdf,.jpg,.jpeg,.png,.doc,.docx";
                  input.onchange = (ev) => {
                    const files = Array.from((ev.target as HTMLInputElement).files || []);
                    if (files.length > 0) {
                      setForm(prev => ({ ...prev, pendingFiles: [...prev.pendingFiles, ...files] }));
                    }
                  };
                  input.click();
                }}
                className="w-full border-2 border-dashed border-stone-300 rounded-lg p-4 text-center cursor-pointer hover:border-emerald-400 hover:bg-emerald-50/50 transition-all"
              >
                <Upload size={20} className="mx-auto text-stone-400 mb-1" />
                <p className="text-xs text-stone-500">Arraste PDFs ou imagens aqui, ou clique para selecionar</p>
                <p className="text-[10px] text-stone-400 mt-0.5">PDF, JPG, PNG, DOC</p>
              </div>
              {form.pendingFiles.length > 0 && (
                <div className="mt-2 space-y-1">
                  {form.pendingFiles.map((file, idx) => (
                    <div key={idx} className="flex items-center justify-between px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-100">
                      <div className="flex items-center gap-2">
                        <FileText size={12} className="text-emerald-600" />
                        <span className="text-xs text-stone-700 truncate max-w-[200px]">{file.name}</span>
                        <span className="text-[10px] text-stone-400">({(file.size / 1024).toFixed(0)} KB)</span>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setForm(prev => ({ ...prev, pendingFiles: prev.pendingFiles.filter((_, i) => i !== idx) })); }}
                        className="p-1 rounded hover:bg-red-50 text-stone-400 hover:text-red-500 transition-colors"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Row: Birth date + Mutation */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-stone-600 mb-1.5">Data de Nascimento</label>
              <div className="flex items-center gap-2 mb-2">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="datePrecision"
                    checked={form.birthDatePrecision === "full"}
                    onChange={() => setForm(prev => ({ ...prev, birthDatePrecision: "full" as DatePrecision }))}
                    className="w-3.5 h-3.5 text-emerald-600 focus:ring-emerald-200"
                  />
                  <span className="text-[11px] text-stone-600">Dia/Mês/Ano</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="datePrecision"
                    checked={form.birthDatePrecision === "month_year"}
                    onChange={() => setForm(prev => ({ ...prev, birthDatePrecision: "month_year" as DatePrecision }))}
                    className="w-3.5 h-3.5 text-emerald-600 focus:ring-emerald-200"
                  />
                  <span className="text-[11px] text-stone-600">Mês/Ano</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="datePrecision"
                    checked={form.birthDatePrecision === "year_only"}
                    onChange={() => setForm(prev => ({ ...prev, birthDatePrecision: "year_only" as DatePrecision }))}
                    className="w-3.5 h-3.5 text-emerald-600 focus:ring-emerald-200"
                  />
                  <span className="text-[11px] text-stone-600">Apenas Ano</span>
                </label>
              </div>
              {form.birthDatePrecision === "full" && (
                <input
                  type="date"
                  value={form.birthDate}
                  onChange={e => setForm(prev => ({ ...prev, birthDate: e.target.value }))}
                  className="w-full px-4 py-2.5 rounded-lg border border-stone-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200"
                />
              )}
              {form.birthDatePrecision === "month_year" && (
                <div className="flex gap-2">
                  <select
                    value={form.birthMonth}
                    onChange={e => setForm(prev => ({ ...prev, birthMonth: e.target.value }))}
                    className="flex-1 px-3 py-2.5 rounded-lg border border-stone-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200"
                  >
                    <option value="">Mês...</option>
                    <option value="01">Janeiro</option>
                    <option value="02">Fevereiro</option>
                    <option value="03">Março</option>
                    <option value="04">Abril</option>
                    <option value="05">Maio</option>
                    <option value="06">Junho</option>
                    <option value="07">Julho</option>
                    <option value="08">Agosto</option>
                    <option value="09">Setembro</option>
                    <option value="10">Outubro</option>
                    <option value="11">Novembro</option>
                    <option value="12">Dezembro</option>
                  </select>
                  <input
                    type="number"
                    value={form.birthYear}
                    onChange={e => setForm(prev => ({ ...prev, birthYear: e.target.value }))}
                    placeholder="Ano"
                    min="2000"
                    max="2030"
                    className="w-24 px-3 py-2.5 rounded-lg border border-stone-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200"
                  />
                </div>
              )}
              {form.birthDatePrecision === "year_only" && (
                <input
                  type="number"
                  value={form.birthYear}
                  onChange={e => setForm(prev => ({ ...prev, birthYear: e.target.value }))}
                  placeholder="Ex: 2024"
                  min="2000"
                  max="2030"
                  className="w-full px-4 py-2.5 rounded-lg border border-stone-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200"
                />
              )}
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

          {/* Árvore Genealógica (abaixo de Mutação) */}
          {form.speciesId && (
            <div className="p-4 rounded-lg border border-stone-200 bg-stone-50/50">
              <label className="block text-xs font-semibold text-stone-600 mb-3">Árvore Genealógica</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* PAI */}
                <div>
                  <label className="block text-[11px] text-stone-500 mb-1">Pai (Macho)</label>
                  <div className="flex items-center gap-2 mb-2">
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="radio"
                        name="fatherSource"
                        checked={form.fatherSource === "plantel"}
                        onChange={() => setForm(prev => ({ ...prev, fatherSource: "plantel", fatherNote: "" }))}
                        className="w-3.5 h-3.5 text-emerald-600 focus:ring-emerald-200"
                      />
                      <span className="text-[11px] text-stone-600">Do Plantel</span>
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="radio"
                        name="fatherSource"
                        checked={form.fatherSource === "externo"}
                        onChange={() => setForm(prev => ({ ...prev, fatherSource: "externo", fatherId: null }))}
                        className="w-3.5 h-3.5 text-emerald-600 focus:ring-emerald-200"
                      />
                      <span className="text-[11px] text-stone-600">Externo</span>
                    </label>
                  </div>
                  {form.fatherSource === "plantel" ? (
                    <select
                      value={form.fatherId ?? ""}
                      onChange={e => setForm(prev => ({ ...prev, fatherId: e.target.value ? Number(e.target.value) : null }))}
                      className="w-full px-3 py-2.5 rounded-lg border border-stone-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200 bg-white"
                    >
                      <option value="">— Não informado —</option>
                      {availableFathers.map(b => (
                        <option key={b.id} value={b.id}>
                          {b.ringNumber || "?"} — {b.mutation || b.speciesName}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div className="space-y-2">
                      <input
                        type="text"
                        value={form.fatherMutation}
                        onChange={e => setForm(prev => ({ ...prev, fatherMutation: e.target.value }))}
                        placeholder="Mutação do pai"
                        className="w-full px-3 py-2 rounded-lg border border-stone-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200 bg-white"
                      />
                      <input
                        type="text"
                        value={form.fatherBreeder}
                        onChange={e => setForm(prev => ({ ...prev, fatherBreeder: e.target.value }))}
                        placeholder="Criatório de origem"
                        className="w-full px-3 py-2 rounded-lg border border-stone-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200 bg-white"
                      />
                      <input
                        type="text"
                        value={form.fatherNote}
                        onChange={e => setForm(prev => ({ ...prev, fatherNote: e.target.value }))}
                        placeholder="Observação (anilha, etc.)"
                        className="w-full px-3 py-2 rounded-lg border border-stone-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200 bg-white"
                      />
                    </div>
                  )}
                </div>
                {/* MÃE */}
                <div>
                  <label className="block text-[11px] text-stone-500 mb-1">Mãe (Fêmea)</label>
                  <div className="flex items-center gap-2 mb-2">
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="radio"
                        name="motherSource"
                        checked={form.motherSource === "plantel"}
                        onChange={() => setForm(prev => ({ ...prev, motherSource: "plantel", motherNote: "" }))}
                        className="w-3.5 h-3.5 text-emerald-600 focus:ring-emerald-200"
                      />
                      <span className="text-[11px] text-stone-600">Do Plantel</span>
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="radio"
                        name="motherSource"
                        checked={form.motherSource === "externo"}
                        onChange={() => setForm(prev => ({ ...prev, motherSource: "externo", motherId: null }))}
                        className="w-3.5 h-3.5 text-emerald-600 focus:ring-emerald-200"
                      />
                      <span className="text-[11px] text-stone-600">Externo</span>
                    </label>
                  </div>
                  {form.motherSource === "plantel" ? (
                    <select
                      value={form.motherId ?? ""}
                      onChange={e => setForm(prev => ({ ...prev, motherId: e.target.value ? Number(e.target.value) : null }))}
                      className="w-full px-3 py-2.5 rounded-lg border border-stone-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200 bg-white"
                    >
                      <option value="">— Não informado —</option>
                      {availableMothers.map(b => (
                        <option key={b.id} value={b.id}>
                          {b.ringNumber || "?"} — {b.mutation || b.speciesName}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div className="space-y-2">
                      <input
                        type="text"
                        value={form.motherMutation}
                        onChange={e => setForm(prev => ({ ...prev, motherMutation: e.target.value }))}
                        placeholder="Mutação da mãe"
                        className="w-full px-3 py-2 rounded-lg border border-stone-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200 bg-white"
                      />
                      <input
                        type="text"
                        value={form.motherBreeder}
                        onChange={e => setForm(prev => ({ ...prev, motherBreeder: e.target.value }))}
                        placeholder="Criatório de origem"
                        className="w-full px-3 py-2 rounded-lg border border-stone-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200 bg-white"
                      />
                      <input
                        type="text"
                        value={form.motherNote}
                        onChange={e => setForm(prev => ({ ...prev, motherNote: e.target.value }))}
                        placeholder="Observação (anilha, etc.)"
                        className="w-full px-3 py-2 rounded-lg border border-stone-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200 bg-white"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Consanguinity Alert */}
              {consanguinityAlert && (
                <div className="mt-3 flex items-start gap-2 p-3 rounded-lg bg-red-50 border border-red-200">
                  <AlertTriangle size={16} className="text-red-600 mt-0.5 shrink-0" />
                  <p className="text-xs font-semibold text-red-700">{consanguinityAlert}</p>
                </div>
              )}
            </div>
          )}

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
            {(form.origin === "comprado" || form.origin === "doado" || form.origin === "troca") && (
              <div>
                <label className="block text-xs font-semibold text-stone-600 mb-1.5">
                  {form.origin === "comprado" ? "Criatório de Origem" : form.origin === "doado" ? "Quem doou" : "Trocado com"}
                  {" "}<span className="text-red-500">*</span>
                </label>
                {form.origin === "comprado" ? (
                  <>
                    <select
                      value={KNOWN_BREEDERS.includes(form.originBreeder) ? form.originBreeder : (form.originBreeder ? "__outro__" : "")}
                      onChange={e => {
                        const val = e.target.value;
                        if (val === "__outro__") {
                          setForm(prev => ({ ...prev, originBreeder: "" }));
                        } else {
                          setForm(prev => ({ ...prev, originBreeder: val }));
                        }
                      }}
                      className="w-full px-4 py-2.5 rounded-lg border border-stone-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200"
                    >
                      <option value="">Selecione o criatório...</option>
                      {KNOWN_BREEDERS.map(b => (
                        <option key={b} value={b}>{b}</option>
                      ))}
                      <option value="__outro__">✏️ Outro (digitar)</option>
                    </select>
                    {!KNOWN_BREEDERS.includes(form.originBreeder) && form.originBreeder !== "" && (
                      <input
                        type="text"
                        value={form.originBreeder}
                        onChange={e => setForm(prev => ({ ...prev, originBreeder: e.target.value }))}
                        placeholder="Digite o nome do criatório..."
                        className="w-full mt-2 px-4 py-2.5 rounded-lg border border-stone-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200"
                        autoFocus
                      />
                    )}
                    {(!KNOWN_BREEDERS.includes(form.originBreeder) && form.originBreeder === "") && (
                      <input
                        type="text"
                        value={form.originBreeder}
                        onChange={e => setForm(prev => ({ ...prev, originBreeder: e.target.value }))}
                        placeholder="Digite o nome do novo criatório..."
                        className="w-full mt-2 px-4 py-2.5 rounded-lg border border-stone-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200"
                        autoFocus
                      />
                    )}
                  </>
                ) : (
                  <input
                    type="text"
                    value={form.originBreeder}
                    onChange={e => setForm(prev => ({ ...prev, originBreeder: e.target.value }))}
                    placeholder={form.origin === "doado" ? "Ex: Criatório XYZ, Maria..." : "Ex: Criatório ABC..."}
                    className="w-full px-4 py-2.5 rounded-lg border border-stone-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200"
                  />
                )}
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
            disabled={!form.speciesId || createMut.isPending || updateMut.isPending || !!anilhaDuplicate?.exists}
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
    // Resolve father/mother names
    const fatherBird = (selectedBird as any).fatherId ? birds.find(b => b.id === (selectedBird as any).fatherId) : null;
    const motherBird = (selectedBird as any).motherId ? birds.find(b => b.id === (selectedBird as any).motherId) : null;

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
                <p className="text-xs text-stone-500 font-mono">Código: <span className="font-semibold text-emerald-700">{selectedBird.ringNumber}</span></p>
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
        <div className="bg-white rounded-2xl border border-stone-200/80 p-6 shadow-sm">
          <div className="flex items-center gap-4 mb-5 pb-5 border-b border-stone-100">
            <div className="w-14 h-14 rounded-full bg-emerald-50 flex items-center justify-center border-2 border-emerald-200">
              <Bird size={28} className="text-emerald-600" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-stone-800">{selectedBird.speciesName}</h3>
              <p className="text-xs text-stone-500 italic">
                {SPECIES_LIST.find(s => s.id === selectedBird.speciesId)?.scientificName || ""}
              </p>
            </div>
            <span className={cn("ml-auto px-3 py-1 rounded-full text-xs font-semibold border", STATUS_COLORS[selectedBird.status as BirdStatus])}>
              {STATUS_LABELS[selectedBird.status as BirdStatus]}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-8">
            <div>
              <p className="text-[10px] text-stone-400 font-medium uppercase tracking-wider">Código</p>
              <p className="text-sm font-semibold text-emerald-700 mt-0.5 font-mono">{selectedBird.ringNumber || "—"}</p>
            </div>
            <div>
              <p className="text-[10px] text-stone-400 font-medium uppercase tracking-wider">Anilha</p>
              <p className="text-sm font-semibold text-stone-800 mt-0.5">{(selectedBird as any).anilha || "—"}</p>
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
                <p className="text-[10px] text-stone-400 font-medium uppercase tracking-wider">Criatório / Dono de Origem</p>
                <p className="text-sm font-semibold text-stone-800 mt-0.5">{selectedBird.originBreeder}</p>
              </div>
            )}
            <div>
              <p className="text-[10px] text-stone-400 font-medium uppercase tracking-wider">Recinto / Viveiro</p>
              <p className="text-sm font-semibold text-stone-800 mt-0.5">{selectedBird.enclosure || "—"}</p>
            </div>
          </div>

          {/* Árvore Genealógica */}
          {(() => {
            let fatherNote = "";
            let motherNote = "";
            try {
              const parsed = selectedBird.notes ? JSON.parse(selectedBird.notes) : null;
              if (parsed && parsed._docMeta) {
                fatherNote = parsed._docMeta.fatherNote || "";
                motherNote = parsed._docMeta.motherNote || "";
              }
            } catch { /* plain text */ }
            if (!fatherBird && !motherBird && !fatherNote && !motherNote) return null;
            return (
              <div className="mt-5 pt-4 border-t border-stone-100">
                <p className="text-[10px] text-stone-400 font-medium uppercase tracking-wider mb-2">Árvore Genealógica</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {fatherBird && (
                    <div className="flex items-center gap-2 p-2.5 rounded-lg bg-blue-50 border border-blue-100">
                      <Bird size={14} className="text-blue-600" />
                      <div>
                        <p className="text-[10px] text-blue-500 font-medium">Pai (Plantel)</p>
                        <p className="text-xs font-semibold text-blue-800">
                          {fatherBird.ringNumber || "?"} {fatherBird.mutation ? `— ${fatherBird.mutation}` : ""}
                        </p>
                      </div>
                    </div>
                  )}
                  {!fatherBird && fatherNote && (
                    <div className="flex items-center gap-2 p-2.5 rounded-lg bg-blue-50 border border-blue-100">
                      <Bird size={14} className="text-blue-600" />
                      <div>
                        <p className="text-[10px] text-blue-500 font-medium">Pai (Externo)</p>
                        <p className="text-xs font-semibold text-blue-800">{fatherNote}</p>
                      </div>
                    </div>
                  )}
                  {motherBird && (
                    <div className="flex items-center gap-2 p-2.5 rounded-lg bg-pink-50 border border-pink-100">
                      <Bird size={14} className="text-pink-600" />
                      <div>
                        <p className="text-[10px] text-pink-500 font-medium">Mãe (Plantel)</p>
                        <p className="text-xs font-semibold text-pink-800">
                          {motherBird.ringNumber || "?"} {motherBird.mutation ? `— ${motherBird.mutation}` : ""}
                        </p>
                      </div>
                    </div>
                  )}
                  {!motherBird && motherNote && (
                    <div className="flex items-center gap-2 p-2.5 rounded-lg bg-pink-50 border border-pink-100">
                      <Bird size={14} className="text-pink-600" />
                      <div>
                        <p className="text-[10px] text-pink-500 font-medium">Mãe (Externa)</p>
                        <p className="text-xs font-semibold text-pink-800">{motherNote}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })()}

          {/* Nota Fiscal e Documentos */}
          {(() => {
            const invoiceNum = (selectedBird as any).invoiceNumber;
            let docMeta: any = null;
            try {
              const parsed = selectedBird.notes ? JSON.parse(selectedBird.notes) : null;
              if (parsed && parsed._docMeta) docMeta = parsed._docMeta;
            } catch { /* plain text notes */ }
            if (!docMeta && !invoiceNum) return null;
            return (
              <div className="mt-5 pt-4 border-t border-stone-100">
                <p className="text-[10px] text-stone-400 font-medium uppercase tracking-wider mb-2">Nota Fiscal e Documentos</p>
                {invoiceNum && (
                  <p className="text-sm text-stone-700 mb-2">
                    NF: <span className="font-semibold text-emerald-700">{invoiceNum}</span>
                  </p>
                )}
                <div className="flex flex-wrap gap-2">
                  {docMeta?.documents?.map((docId: string) => {
                    const doc = DOCUMENT_OPTIONS.find(d => d.id === docId);
                    return doc ? (
                      <span key={docId} className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-medium border border-emerald-200">
                        ✓ {doc.label}
                      </span>
                    ) : null;
                  })}
                  {docMeta?.otherDocuments && (
                    <span className="px-2.5 py-1 rounded-full bg-stone-100 text-stone-700 text-xs font-medium border border-stone-200">
                      {docMeta.otherDocuments}
                    </span>
                  )}
                </div>
              </div>
            );
          })()}

          {/* Documentos Anexados (uploads) */}
          <div className="mt-5 pt-4 border-t border-stone-100">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[10px] text-stone-400 font-medium uppercase tracking-wider">Documentos Anexados</p>
            </div>
            {birdDocs.length > 0 && (
              <div className="space-y-2 mb-3">
                {birdDocs.map((doc: any) => (
                  <div key={doc.id} className="flex items-center justify-between p-2.5 rounded-lg bg-stone-50 border border-stone-100">
                    <div className="flex items-center gap-2">
                      <FileText size={14} className="text-stone-500" />
                      <div>
                        <p className="text-xs font-medium text-stone-700">{doc.fileName}</p>
                        <p className="text-[10px] text-stone-400">{doc.docType}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <a
                        href={doc.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 rounded hover:bg-stone-200 text-stone-500 hover:text-emerald-600 transition-colors"
                        title="Abrir documento"
                      >
                        <ExternalLink size={13} />
                      </a>
                      <button
                        onClick={() => handleDeleteDoc(doc.id)}
                        className="p-1.5 rounded hover:bg-red-50 text-stone-400 hover:text-red-500 transition-colors"
                        title="Excluir documento"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {/* Upload section */}
            <div className="flex items-center gap-2">
              <select
                value={uploadDocType}
                onChange={e => setUploadDocType(e.target.value)}
                className="px-2.5 py-2 rounded-lg border border-stone-200 text-xs text-stone-600 focus:outline-none focus:ring-2 focus:ring-emerald-200"
              >
                <option value="nota_fiscal">Nota Fiscal</option>
                <option value="certificado_origem">Certificado de Origem</option>
                <option value="atestado_saude">Atestado de Saúde</option>
                <option value="gta">GTA</option>
                <option value="sexagem">Sexagem</option>
                <option value="exame_sanidade">Exame de Sanidade</option>
                <option value="outro">Outro</option>
              </select>
              <label className={cn(
                "flex items-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-medium cursor-pointer transition-all",
                uploading
                  ? "border-stone-200 bg-stone-100 text-stone-400 cursor-wait"
                  : "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
              )}>
                <Upload size={13} />
                {uploading ? "Enviando..." : "Anexar Arquivo"}
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  onChange={handleFileUpload}
                  disabled={uploading}
                  accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx"
                />
              </label>
            </div>
          </div>

          {/* Filhos */}
          {childrenOfBird.length > 0 && (
            <div className="mt-5 pt-4 border-t border-stone-100">
              <p className="text-[10px] text-stone-400 font-medium uppercase tracking-wider mb-2">
                <Users size={11} className="inline mr-1" />
                Filhos ({childrenOfBird.length})
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {childrenOfBird.map(child => (
                  <button
                    key={child.id}
                    onClick={() => { setSelectedBirdId(child.id); }}
                    className="flex items-center gap-2 p-2.5 rounded-lg bg-stone-50 border border-stone-100 hover:bg-stone-100 transition-colors text-left"
                  >
                    <Bird size={14} className="text-emerald-600" />
                    <div>
                      <p className="text-xs font-semibold text-stone-800">
                        {child.ringNumber || "?"} {child.mutation ? `— ${child.mutation}` : ""}
                      </p>
                      <p className="text-[10px] text-stone-500">
                        {SEX_LABELS[child.sex as BirdSex]} · {STATUS_LABELS[child.status as BirdStatus]}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Observações */}
          {(() => {
            let notesText = selectedBird.notes || "";
            try {
              const parsed = JSON.parse(notesText);
              if (parsed && parsed._docMeta) notesText = parsed.text || "";
            } catch { /* plain text */ }
            if (!notesText) return null;
            return (
              <div className="mt-5 pt-4 border-t border-stone-100">
                <p className="text-[10px] text-stone-400 font-medium uppercase tracking-wider mb-1">Observações</p>
                <p className="text-sm text-stone-700 whitespace-pre-wrap">{notesText}</p>
              </div>
            );
          })()}

          {/* Footer: dates + PDF button */}
          <div className="mt-5 pt-4 border-t border-stone-100 flex items-center justify-between">
            <p className="text-[10px] text-stone-400">
              Cadastrado em {new Date(selectedBird.createdAt).toLocaleDateString("pt-BR")} · Atualizado em {new Date(selectedBird.updatedAt).toLocaleDateString("pt-BR")}
            </p>
            <button
              onClick={() => generateLineagePdf(selectedBird as any, birds as any)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700 text-xs font-medium hover:bg-emerald-100 transition-all"
            >
              <Download size={13} />
              Relatório de Linhagem
            </button>
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
