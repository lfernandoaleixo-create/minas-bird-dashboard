/**
 * DocumentosAuxiliares — Documentos de apoio para ter em mãos durante fiscalização
 * Não são documentos com vencimento, mas sim materiais que o fiscal pode solicitar
 */
import { useState } from "react";
import {
  FileText,
  CheckCircle2,
  Circle,
  Upload,
  ExternalLink,
  ClipboardList,
  MapPin,
  Leaf,
  Shield,
  Bug,
  Utensils,
  Heart,
  Stethoscope,
  Receipt,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";

// 11 documentos auxiliares para fiscalização
const AUXILIARY_DOCS = [
  {
    id: 1,
    title: "Projeto Arquitetônico (Planta Baixa do Criadouro)",
    description:
      "Planta baixa com layout de todos os recintos, cozinhas, quarentena, sala veterinário. O fiscal pode pedir para conferir se a estrutura bate com o projeto aprovado.",
    icon: MapPin,
    tip: "Manter cópia impressa plastificada no escritório do criadouro.",
  },
  {
    id: 2,
    title: "Projeto da Estação de Tratamento de Efluentes (ETE)",
    description:
      "Planta e dimensionamento da ETE (5.000L/dia, tanque séptico, UASB, filtro biológico). Fiscal ambiental pode verificar funcionamento e conformidade.",
    icon: Leaf,
    tip: "Incluir ART do engenheiro responsável junto com o projeto.",
  },
  {
    id: 3,
    title: "Lista Atualizada do Plantel com Anilhas",
    description:
      "Relação completa de todas as aves com espécie, anilha, sexo, ano, gaiola/viveiro. Deve bater com o declarado no SISPASS. O fiscal confere ave por ave.",
    icon: ClipboardList,
    tip: "Atualizar toda vez que houver nascimento, óbito, venda ou aquisição.",
  },
  {
    id: 4,
    title: "Mapa de Identificação dos Recintos (Gaiola × Ave)",
    description:
      "Croqui mostrando qual ave está em qual gaiola/viveiro, com numeração. Facilita a conferência do fiscal no local sem precisar consultar o sistema.",
    icon: MapPin,
    tip: "Fixar cópia na parede do corredor principal dos viveiros.",
  },
  {
    id: 5,
    title: "Notas Fiscais + Certificado de Origem + GTS",
    description:
      "Todas as NFs de compra de aves com Certificado de Origem e Guia de Trânsito de Animais Silvestres (GTS). Comprova origem legal de cada ave do plantel.",
    icon: Receipt,
    tip: "Organizar em pasta por ave ou por data de aquisição.",
  },
  {
    id: 6,
    title: "Plano de Manejo Sanitário",
    description:
      "Protocolo de higienização dos recintos, calendário de vermifugação, registro de óbitos e causas. Fiscal pode pedir para ver procedimentos de saúde.",
    icon: Shield,
    tip: "Manter atualizado com datas de última desinfecção e vermifugação.",
  },
  {
    id: 7,
    title: "Protocolo de Quarentena",
    description:
      "Procedimentos para aves recém-chegadas: período de isolamento, exames realizados, observações. O criadouro possui sala de quarentena no projeto.",
    icon: Bug,
    tip: "Registrar cada ave que passou pela quarentena com datas de entrada e saída.",
  },
  {
    id: 8,
    title: "Registro de Dietas e Alimentação (Impresso)",
    description:
      "Cardápio por espécie com ingredientes, quantidades e frequência. Já existe no sistema — ter versão impressa para apresentar ao fiscal.",
    icon: Utensils,
    tip: "Usar o PDF gerado pelo módulo Alimentação do sistema.",
  },
  {
    id: 9,
    title: "Controle de Reprodução (Casais e Nascimentos)",
    description:
      "Registro de casais formados, posturas, incubação, nascimentos e anilhamento de filhotes. Comprova manejo reprodutivo responsável.",
    icon: Heart,
    tip: "Incluir datas de postura, eclosão e anilhamento de cada ninhada.",
  },
  {
    id: 10,
    title: "Registro de Visitas do Veterinário / Biólogo RT",
    description:
      "Datas das visitas técnicas do responsável técnico, observações e recomendações. Comprova acompanhamento profissional regular.",
    icon: Stethoscope,
    tip: "Solicitar ao profissional que assine e carimbe cada visita.",
  },
  {
    id: 11,
    title: "Comprovantes de Transferência SISPASS",
    description:
      "Registros de transferência de aves entre criadores no sistema SISPASS. Comprova toda movimentação legal do plantel.",
    icon: FileText,
    tip: "Imprimir comprovante de cada transferência realizada.",
  },
];

export default function DocumentosAuxiliares() {
  const { data: documents = [] } = trpc.documentacao.list.useQuery();
  const [expandedId, setExpandedId] = useState<number | null>(null);

  // Check if a document has been uploaded (match by partial title)
  const getDocStatus = (auxDoc: (typeof AUXILIARY_DOCS)[0]) => {
    const keywords = auxDoc.title.toLowerCase().split(" ").slice(0, 3);
    const found = documents.find((d: any) => {
      const docTitle = d.title.toLowerCase();
      return keywords.some((kw) => kw.length > 4 && docTitle.includes(kw));
    });
    return found ? "anexado" : "pendente";
  };

  const totalAnexados = AUXILIARY_DOCS.filter(
    (d) => getDocStatus(d) === "anexado"
  ).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-slate-900">
          Documentos Auxiliares para Fiscalização
        </h2>
        <p className="text-sm text-slate-500 mt-1">
          Materiais de apoio que o fiscal pode solicitar durante a vistoria —
          organize e tenha sempre em mãos
        </p>
      </div>

      {/* Progress */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-bold text-slate-700">
            Preparação para Fiscalização
          </span>
          <span className="text-sm font-bold text-slate-900">
            {totalAnexados}/{AUXILIARY_DOCS.length} organizados
          </span>
        </div>
        <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-emerald-500 rounded-full transition-all duration-500"
            style={{
              width: `${(totalAnexados / AUXILIARY_DOCS.length) * 100}%`,
            }}
          />
        </div>
        <p className="text-xs text-slate-400 mt-2">
          Documentos encontrados no sistema com título correspondente são
          marcados como "Anexado"
        </p>
      </div>

      {/* Document list */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="bg-slate-50 border-b border-slate-200 px-5 py-3">
          <div className="flex items-center gap-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
            <span className="w-6">#</span>
            <span className="flex-1">Documento</span>
            <span className="w-24 text-center">Status</span>
          </div>
        </div>

        <div className="divide-y divide-slate-100">
          {AUXILIARY_DOCS.map((doc, idx) => {
            const status = getDocStatus(doc);
            const isExpanded = expandedId === doc.id;
            const Icon = doc.icon;

            return (
              <div key={doc.id}>
                <div
                  onClick={() =>
                    setExpandedId(isExpanded ? null : doc.id)
                  }
                  className={`px-5 py-4 flex items-center gap-4 cursor-pointer transition-colors ${
                    isExpanded ? "bg-slate-50" : "hover:bg-slate-50/50"
                  }`}
                >
                  {/* Number */}
                  <span className="w-6 text-sm font-bold text-slate-400 tabular-nums">
                    {idx + 1}
                  </span>

                  {/* Icon */}
                  <div
                    className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                      status === "anexado"
                        ? "bg-emerald-100"
                        : "bg-slate-100"
                    }`}
                  >
                    <Icon
                      size={16}
                      className={
                        status === "anexado"
                          ? "text-emerald-600"
                          : "text-slate-500"
                      }
                    />
                  </div>

                  {/* Title */}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-slate-800 text-sm">
                      {doc.title}
                    </h3>
                  </div>

                  {/* Status */}
                  <div className="w-24 text-center shrink-0">
                    {status === "anexado" ? (
                      <span className="inline-flex items-center gap-1 text-[9px] font-bold bg-emerald-600 text-white px-2.5 py-1 rounded-full uppercase tracking-wider">
                        <CheckCircle2 size={10} /> Anexado
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[9px] font-bold bg-amber-100 text-amber-800 px-2.5 py-1 rounded-full uppercase tracking-wider">
                        <Circle size={10} /> Pendente
                      </span>
                    )}
                  </div>
                </div>

                {/* Expanded detail */}
                {isExpanded && (
                  <div className="px-5 pb-5 pt-0 ml-10">
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                      <p className="text-sm text-slate-700 leading-relaxed">
                        {doc.description}
                      </p>
                      <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg p-3">
                        <Shield
                          size={14}
                          className="text-amber-600 mt-0.5 shrink-0"
                        />
                        <p className="text-xs text-amber-800 font-medium">
                          <strong>Dica:</strong> {doc.tip}
                        </p>
                      </div>
                      {status === "pendente" && (
                        <p className="text-xs text-slate-500 italic">
                          Para marcar como "Anexado", cadastre este documento
                          na aba "Documentos" com um título correspondente.
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer tip */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex items-start gap-3">
        <ClipboardList size={18} className="text-slate-500 mt-0.5 shrink-0" />
        <div>
          <p className="text-sm font-semibold text-slate-700">
            Preparação para o dia da fiscalização
          </p>
          <p className="text-xs text-slate-500 mt-1 leading-relaxed">
            Imprima e organize estes documentos em uma pasta física. O fiscal
            pode solicitar qualquer um deles durante a vistoria. Documentos
            digitais no sistema são úteis, mas ter cópia impressa demonstra
            organização e agiliza a inspeção.
          </p>
        </div>
      </div>
    </div>
  );
}
