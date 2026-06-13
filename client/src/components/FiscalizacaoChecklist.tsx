/**
 * FiscalizacaoChecklist — Checklist profissional para fiscalização
 * Design limpo e formal para apresentar ao IBAMA / IMA / Vigilância Sanitária
 */
import { trpc } from "@/lib/trpc";
import {
  CheckCircle2,
  XCircle,
  Clock,
  FileText,
  Shield,
  AlertTriangle,
  ExternalLink,
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
      return { icon: CheckCircle2, color: "text-emerald-600", bg: "bg-white border-emerald-300", badge: "bg-emerald-600 text-white", label: "REGULAR" };
    case "vencido":
      return { icon: XCircle, color: "text-red-600", bg: "bg-white border-red-300", badge: "bg-red-600 text-white", label: "VENCIDO" };
    case "a_vencer":
      return { icon: AlertTriangle, color: "text-amber-600", bg: "bg-white border-amber-300", badge: "bg-amber-500 text-white", label: "A VENCER" };
    case "pendente":
      return { icon: Clock, color: "text-slate-400", bg: "bg-white border-slate-200", badge: "bg-slate-400 text-white", label: "PENDENTE" };
  }
}

export default function FiscalizacaoChecklist() {
  const { data: documents = [] } = trpc.documentacao.list.useQuery();

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
    <div className="space-y-8">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-800 to-slate-700 rounded-2xl p-6 text-white shadow-lg">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-white/10 backdrop-blur flex items-center justify-center">
            <Shield size={28} className="text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Checklist de Fiscalização</h2>
            <p className="text-sm text-white/70 mt-1">
              Documentos obrigatórios para apresentação ao IBAMA / IMA / Vigilância Sanitária
            </p>
          </div>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white rounded-2xl border-2 border-emerald-200 p-4 text-center shadow-sm">
          <p className="text-3xl font-bold text-emerald-600">{okCount}</p>
          <p className="text-xs font-semibold text-emerald-700 mt-1 uppercase tracking-wide">Regulares</p>
        </div>
        <div className="bg-white rounded-2xl border-2 border-red-200 p-4 text-center shadow-sm">
          <p className="text-3xl font-bold text-red-600">{vencidoCount}</p>
          <p className="text-xs font-semibold text-red-700 mt-1 uppercase tracking-wide">Vencidos</p>
        </div>
        <div className="bg-white rounded-2xl border-2 border-amber-200 p-4 text-center shadow-sm">
          <p className="text-3xl font-bold text-amber-600">{aVencerCount}</p>
          <p className="text-xs font-semibold text-amber-700 mt-1 uppercase tracking-wide">A Vencer</p>
        </div>
        <div className="bg-white rounded-2xl border-2 border-slate-200 p-4 text-center shadow-sm">
          <p className="text-3xl font-bold text-slate-500">{pendenteCount}</p>
          <p className="text-xs font-semibold text-slate-600 mt-1 uppercase tracking-wide">Pendentes</p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-bold text-slate-800">
            Conformidade Geral
          </span>
          <span className="text-lg font-bold text-emerald-600">
            {readyPercent}%
          </span>
        </div>
        <div className="w-full h-4 bg-slate-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-700 ${
              readyPercent >= 80 ? "bg-emerald-500" : readyPercent >= 50 ? "bg-amber-500" : "bg-red-500"
            }`}
            style={{ width: `${readyPercent}%` }}
          />
        </div>
      </div>

      {/* Checklist items — numbered */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="bg-slate-50 border-b border-slate-200 px-6 py-3">
          <div className="flex items-center gap-6 text-xs font-bold text-slate-500 uppercase tracking-wider">
            <span className="w-8 text-center">#</span>
            <span className="flex-1">Documento</span>
            <span className="w-24 text-center hidden sm:block">Vencimento</span>
            <span className="w-20 text-center hidden sm:block">Arquivo</span>
            <span className="w-24 text-center">Status</span>
          </div>
        </div>
        <div className="divide-y divide-slate-100">
          {checklistItems.map((item, index) => {
            const config = getStatusConfig(item.status);
            const Icon = config.icon;
            return (
              <div
                key={item.key}
                className={`px-6 py-4 flex items-center gap-6 transition-colors hover:bg-slate-50/50 ${
                  item.status === "vencido" ? "bg-red-50/40" : ""
                }`}
              >
                {/* Number */}
                <span className="text-base font-bold text-slate-400 w-8 text-center shrink-0">
                  {String(index + 1).padStart(2, "0")}
                </span>

                {/* Doc info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <Icon size={16} className={config.color} />
                    <p className="font-semibold text-slate-800 text-sm truncate">
                      {item.label}
                    </p>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5 ml-6">
                    {item.category}
                  </p>
                </div>

                {/* Expiration date */}
                <div className="w-24 text-center shrink-0 hidden sm:block">
                  {item.doc?.expirationDate ? (
                    <span className={`text-xs font-semibold ${item.status === "vencido" ? "text-red-600" : item.status === "a_vencer" ? "text-amber-600" : "text-slate-600"}`}>
                      {new Date(item.doc.expirationDate).toLocaleDateString("pt-BR")}
                    </span>
                  ) : (
                    <span className="text-xs text-slate-300">—</span>
                  )}
                </div>

                {/* File indicator */}
                <div className="w-20 text-center shrink-0 hidden sm:block">
                  {item.hasFile ? (
                    <span className="inline-flex items-center gap-1 text-xs text-emerald-600 font-medium">
                      <FileText size={11} /> Sim
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs text-slate-400">
                      <FileText size={11} /> Não
                    </span>
                  )}
                </div>

                {/* Status badge */}
                <div className="w-24 text-center shrink-0">
                  <span className={`inline-block text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider ${config.badge}`}>
                    {config.label}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer */}
      {vencidoCount > 0 && (
        <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-5 flex items-start gap-4">
          <XCircle size={22} className="text-red-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold text-red-800">Ação Urgente Necessária</p>
            <p className="text-sm text-red-700 mt-1">
              {vencidoCount} documento{vencidoCount !== 1 ? "s" : ""} vencido{vencidoCount !== 1 ? "s" : ""}. 
              Providencie a renovação imediatamente para evitar autuação em caso de fiscalização.
              Acesse a aba "Documentos" para enviar os documentos renovados.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
