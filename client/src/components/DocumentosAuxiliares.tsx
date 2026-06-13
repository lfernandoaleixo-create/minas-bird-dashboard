/**
 * DocumentosAuxiliares — Documentos de apoio para ter em mãos durante fiscalização
 * Funcionário pode marcar "Em Mãos" quando separar o documento fisicamente
 */
import { useState, useEffect } from "react";
import {
  CheckCircle2,
  Circle,
  ClipboardList,
  MapPin,
  Leaf,
  Shield,
  Receipt,
  Utensils,
  Heart,
  Stethoscope,
  Download,
  HandMetal,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { generateAuxiliaresPdf } from "@/lib/auxiliaresPdf";

// 10 documentos auxiliares para fiscalização (sem item 11)
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
    icon: Stethoscope,
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
];

// LocalStorage key for persisting "em mãos" state
const STORAGE_KEY = "minas-bird-auxiliares-em-maos";

export default function DocumentosAuxiliares() {
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [emMaos, setEmMaos] = useState<Record<number, boolean>>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  });

  // Persist to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(emMaos));
  }, [emMaos]);

  const toggleEmMaos = (id: number) => {
    setEmMaos((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const totalEmMaos = AUXILIARY_DOCS.filter((d) => emMaos[d.id]).length;

  const handleGeneratePdf = () => {
    const items = AUXILIARY_DOCS.map((d) => ({
      title: d.title,
      emMaos: !!emMaos[d.id],
    }));
    generateAuxiliaresPdf(items);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">
            Documentos Auxiliares para Fiscalização
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Materiais de apoio que o fiscal pode solicitar — marque quando estiver separado
          </p>
        </div>
        <Button
          onClick={handleGeneratePdf}
          variant="outline"
          className="gap-2 border-slate-300 text-slate-700 hover:bg-slate-50"
        >
          <Download size={14} />
          PDF Auxiliares
        </Button>
      </div>

      {/* Progress */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-bold text-slate-700">
            Preparação para Fiscalização
          </span>
          <span className="text-sm font-bold text-slate-900">
            {totalEmMaos}/{AUXILIARY_DOCS.length} em mãos
          </span>
        </div>
        <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-emerald-500 rounded-full transition-all duration-500"
            style={{
              width: `${(totalEmMaos / AUXILIARY_DOCS.length) * 100}%`,
            }}
          />
        </div>
        <p className="text-xs text-slate-400 mt-2">
          Clique em "Em Mãos" quando o documento estiver separado e pronto para apresentar
        </p>
      </div>

      {/* Document list */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="bg-slate-50 border-b border-slate-200 px-5 py-3">
          <div className="flex items-center gap-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
            <span className="w-6">#</span>
            <span className="flex-1">Documento</span>
            <span className="w-28 text-center">Status</span>
          </div>
        </div>

        <div className="divide-y divide-slate-100">
          {AUXILIARY_DOCS.map((doc, idx) => {
            const isReady = !!emMaos[doc.id];
            const isExpanded = expandedId === doc.id;
            const Icon = doc.icon;

            return (
              <div key={doc.id}>
                <div
                  className={`px-5 py-4 flex items-center gap-4 transition-colors ${
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
                      isReady ? "bg-emerald-100" : "bg-slate-100"
                    }`}
                  >
                    <Icon
                      size={16}
                      className={
                        isReady ? "text-emerald-600" : "text-slate-500"
                      }
                    />
                  </div>

                  {/* Title - clickable to expand */}
                  <div
                    className="flex-1 min-w-0 cursor-pointer"
                    onClick={() =>
                      setExpandedId(isExpanded ? null : doc.id)
                    }
                  >
                    <h3
                      className={`font-semibold text-sm ${
                        isReady
                          ? "text-emerald-800 line-through opacity-70"
                          : "text-slate-800"
                      }`}
                    >
                      {doc.title}
                    </h3>
                  </div>

                  {/* Em Mãos button */}
                  <div className="w-28 flex justify-center shrink-0">
                    <button
                      onClick={() => toggleEmMaos(doc.id)}
                      className={`inline-flex items-center gap-1.5 text-[10px] font-bold px-3 py-1.5 rounded-full uppercase tracking-wider transition-all ${
                        isReady
                          ? "bg-emerald-600 text-white shadow-sm"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-200"
                      }`}
                    >
                      {isReady ? (
                        <>
                          <CheckCircle2 size={11} /> Em Mãos
                        </>
                      ) : (
                        <>
                          <Circle size={11} /> Pendente
                        </>
                      )}
                    </button>
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
            Imprima o PDF e organize estes documentos em uma pasta física. O
            fiscal pode solicitar qualquer um deles durante a vistoria.
            Marque como "Em Mãos" conforme for separando cada item.
          </p>
        </div>
      </div>
    </div>
  );
}
