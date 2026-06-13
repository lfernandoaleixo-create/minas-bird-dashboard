/**
 * FiscalizacaoChecklist — Checklist visual para preparação de fiscalização
 * Lista todos os documentos obrigatórios com status visual (OK / Vencido / Pendente)
 * Numerado conforme regra do usuário
 */
import { trpc } from "@/lib/trpc";
import {
  CheckCircle2,
  AlertCircle,
  Clock,
  FileText,
  Shield,
  AlertTriangle,
} from "lucide-react";

// Documentos obrigatórios para fiscalização IBAMA/IMA
const REQUIRED_DOCS = [
  { key: "processo de legalização", label: "Processo de Legalização do Criatório (SEI)", category: "Legalização / Licenças" },
  { key: "certificado de regularidade (cr)", label: "Certificado de Regularidade (CR) IBAMA", category: "IBAMA / SISPASS" },
  { key: "ctf/aida", label: "Certificado de Regularidade CTF/AIDA", category: "IBAMA / SISPASS" },
  { key: "comprovante de inscrição ctf", label: "Comprovante de Inscrição CTF IBAMA", category: "IBAMA / SISPASS" },
  { key: "autorização prévia ibama", label: "Autorização Prévia IBAMA (Criação Amadora)", category: "IBAMA / SISPASS" },
  { key: "alvará sanitário", label: "Alvará Sanitário (Vigilância Sanitária)", category: "Alvará / Prefeitura" },
  { key: "alvará de funcionamento", label: "Alvará de Funcionamento Municipal", category: "Alvará / Prefeitura" },
  { key: "uso e ocupação", label: "Certidão de Uso e Ocupação do Solo", category: "Alvará / Prefeitura" },
  { key: "cadastro no ima", label: "Cadastro no IMA - Ficha Sanitária Animal", category: "Cadastros / Registros" },
  { key: "declaração do médico veterinário", label: "Declaração do Médico Veterinário", category: "Responsabilidade Técnica" },
  { key: "art do biólogo", label: "ART do Biólogo Responsável Técnico", category: "Responsabilidade Técnica" },
  { key: "contrato de arrendamento", label: "Contrato de Arrendamento Rural", category: "Contratos" },
];

type DocStatus = "ok" | "vencido" | "pendente" | "a_vencer";

function getDocStatus(doc: any): DocStatus {
  if (!doc) return "pendente";
  if (doc.status === "vencido") return "vencido";
  if (doc.expirationDate) {
    const expDate = new Date(doc.expirationDate);
    const now = new Date();
    const daysLeft = Math.ceil((expDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (daysLeft < 0) return "vencido";
    if (daysLeft <= 30) return "a_vencer";
  }
  if (doc.status === "vigente" || doc.status === "em_andamento") return "ok";
  return "pendente";
}

function getStatusConfig(status: DocStatus) {
  switch (status) {
    case "ok":
      return { icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-50 border-emerald-200", label: "OK", labelColor: "text-emerald-700" };
    case "vencido":
      return { icon: AlertCircle, color: "text-red-600", bg: "bg-red-50 border-red-200", label: "VENCIDO", labelColor: "text-red-700" };
    case "a_vencer":
      return { icon: AlertTriangle, color: "text-amber-600", bg: "bg-amber-50 border-amber-200", label: "A VENCER", labelColor: "text-amber-700" };
    case "pendente":
      return { icon: Clock, color: "text-gray-400", bg: "bg-gray-50 border-gray-200", label: "PENDENTE", labelColor: "text-gray-500" };
  }
}

export default function FiscalizacaoChecklist() {
  const { data: documents = [] } = trpc.documentacao.list.useQuery();

  // Match required docs with actual documents in the system
  const checklistItems = REQUIRED_DOCS.map((req) => {
    const matchedDoc = documents.find((doc: any) =>
      doc.title.toLowerCase().includes(req.key.toLowerCase())
    );
    const status = getDocStatus(matchedDoc);
    const hasFile = matchedDoc && matchedDoc.fileUrl && matchedDoc.fileUrl.trim() !== "";
    return { ...req, doc: matchedDoc, status, hasFile };
  });

  const okCount = checklistItems.filter((i) => i.status === "ok").length;
  const vencidoCount = checklistItems.filter((i) => i.status === "vencido").length;
  const aVencerCount = checklistItems.filter((i) => i.status === "a_vencer").length;
  const pendenteCount = checklistItems.filter((i) => i.status === "pendente").length;
  const total = checklistItems.length;
  const readyPercent = Math.round((okCount / total) * 100);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <Shield size={22} className="text-primary" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-foreground">Checklist de Fiscalização</h2>
          <p className="text-sm text-muted-foreground">
            Documentos obrigatórios para apresentar ao IBAMA / IMA / Vigilância Sanitária
          </p>
        </div>
      </div>

      {/* Summary bar */}
      <div className="bg-card border border-border rounded-xl p-5">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-semibold text-foreground">
            Preparação: {readyPercent}% concluída
          </span>
          <span className="text-xs text-muted-foreground">
            {okCount}/{total} documentos OK
          </span>
        </div>
        {/* Progress bar */}
        <div className="w-full h-3 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-emerald-500 rounded-full transition-all duration-500"
            style={{ width: `${readyPercent}%` }}
          />
        </div>
        {/* Status summary */}
        <div className="flex flex-wrap gap-4 mt-4">
          <div className="flex items-center gap-1.5">
            <CheckCircle2 size={14} className="text-emerald-600" />
            <span className="text-xs font-medium text-emerald-700">{okCount} OK</span>
          </div>
          <div className="flex items-center gap-1.5">
            <AlertCircle size={14} className="text-red-600" />
            <span className="text-xs font-medium text-red-700">{vencidoCount} Vencido{vencidoCount !== 1 ? "s" : ""}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <AlertTriangle size={14} className="text-amber-600" />
            <span className="text-xs font-medium text-amber-700">{aVencerCount} A Vencer</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Clock size={14} className="text-gray-400" />
            <span className="text-xs font-medium text-gray-500">{pendenteCount} Pendente{pendenteCount !== 1 ? "s" : ""}</span>
          </div>
        </div>
      </div>

      {/* Checklist items — numbered */}
      <div className="space-y-2">
        {checklistItems.map((item, index) => {
          const config = getStatusConfig(item.status);
          const Icon = config.icon;
          return (
            <div
              key={item.key}
              className={`border rounded-xl p-4 flex items-center gap-4 transition-all ${config.bg}`}
            >
              {/* Number */}
              <span className="text-lg font-bold text-muted-foreground/60 w-8 text-center shrink-0">
                {index + 1}
              </span>

              {/* Status icon */}
              <div className="shrink-0">
                <Icon size={22} className={config.color} />
              </div>

              {/* Doc info */}
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-foreground text-sm truncate">
                  {item.label}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {item.category}
                  {item.doc?.expirationDate && (
                    <span className="ml-2">
                      · Vence: {new Date(item.doc.expirationDate).toLocaleDateString("pt-BR")}
                    </span>
                  )}
                </p>
              </div>

              {/* File indicator */}
              <div className="shrink-0 flex items-center gap-2">
                {item.hasFile ? (
                  <span className="text-xs text-emerald-600 flex items-center gap-1">
                    <FileText size={12} /> Arquivo OK
                  </span>
                ) : (
                  <span className="text-xs text-gray-400 flex items-center gap-1">
                    <FileText size={12} /> Sem arquivo
                  </span>
                )}
              </div>

              {/* Status badge */}
              <span className={`text-xs font-bold px-2.5 py-1 rounded-full shrink-0 ${config.labelColor} ${config.bg}`}>
                {config.label}
              </span>
            </div>
          );
        })}
      </div>

      {/* Footer note */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
        <AlertTriangle size={18} className="text-amber-600 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-amber-800">Atenção</p>
          <p className="text-xs text-amber-700 mt-0.5">
            Mantenha todos os documentos vigentes e com arquivo anexado. Em caso de fiscalização, 
            todos os itens acima devem estar disponíveis para apresentação imediata.
            Documentos vencidos devem ser renovados com urgência.
          </p>
        </div>
      </div>
    </div>
  );
}
