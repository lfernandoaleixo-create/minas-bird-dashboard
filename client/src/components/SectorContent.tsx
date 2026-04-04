/**
 * SectorContent — Displays topic groups and topics for a given sector
 * Tropical Craft Design: warm tones, golden accents, serif headings
 * Hero images for visual impact, smooth animations
 * Topics represent subjects to be addressed, with status tracking
 * Now supports rich content rendering with paragraphs
 */
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import type { Sector, Topic } from "@/data/sectors";
import { cn } from "@/lib/utils";
import {
  BookOpen,
  Calendar,
  ChevronRight,
  CircleDashed,
  CircleDot,
  CheckCircle2,
  Info,
  Layers,
  FileText,
} from "lucide-react";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface SectorContentProps {
  sector: Sector;
}

const heroImages: Record<string, string> = {
  viveiros: "https://d2xsxph8kpxj0f.cloudfront.net/310519663426530649/GUVCZBcaMUVxbcauwK97Fr/hero-viveiros-MtAH57RUuvbuHknRLhA5VD.webp",
  maternidade: "https://d2xsxph8kpxj0f.cloudfront.net/310519663426530649/GUVCZBcaMUVxbcauwK97Fr/hero-maternidade-EWwNuzZ3yxCAyD6oz2dxUy.webp",
  quarentena: "https://d2xsxph8kpxj0f.cloudfront.net/310519663426530649/GUVCZBcaMUVxbcauwK97Fr/hero-quarentena-AtSfkLrquUxKeY3LK2d6xf.webp",
  saude: "https://d2xsxph8kpxj0f.cloudfront.net/310519663426530649/GUVCZBcaMUVxbcauwK97Fr/hero-saude-MMZ9gzo5RLLmdA8N6untWH.webp",
  nutricao: "https://d2xsxph8kpxj0f.cloudfront.net/310519663426530649/GUVCZBcaMUVxbcauwK97Fr/hero-nutricao-MW2FdUSYGm3BRbqpzbetSn.webp",
  limpeza: "https://d2xsxph8kpxj0f.cloudfront.net/310519663426530649/GUVCZBcaMUVxbcauwK97Fr/hero-limpeza-b6LMwhfMDSHAwMxnzVfp63.webp",
  administrativo: "https://d2xsxph8kpxj0f.cloudfront.net/310519663426530649/GUVCZBcaMUVxbcauwK97Fr/hero-administrativo-KjQscaPDXXe6pC6LVq5X9f.webp",
  infraestrutura: "https://d2xsxph8kpxj0f.cloudfront.net/310519663426530649/GUVCZBcaMUVxbcauwK97Fr/hero-infraestrutura-MosdHqct7xfUkPvkDrdkFQ.webp",
};

const statusConfig: Record<string, { label: string; color: string; bgColor: string; borderColor: string; icon: typeof CircleDashed }> = {
  "a-criar": {
    label: "A criar",
    color: "text-slate-500",
    bgColor: "bg-slate-50",
    borderColor: "border-slate-200",
    icon: CircleDashed,
  },
  "em-progresso": {
    label: "Em progresso",
    color: "text-amber-600",
    bgColor: "bg-amber-50",
    borderColor: "border-amber-200",
    icon: CircleDot,
  },
  "concluido": {
    label: "Concluído",
    color: "text-emerald-600",
    bgColor: "bg-emerald-50",
    borderColor: "border-emerald-200",
    icon: CheckCircle2,
  },
};

function renderParagraph(text: string) {
  // Support bold **text** and bullet points starting with "- " or "• "
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={i} className="font-semibold text-card-foreground">{part.slice(2, -2)}</strong>;
    }
    return <span key={i}>{part}</span>;
  });
}

function TopicCard({ topic, index }: { topic: Topic; index: number }) {
  const [expanded, setExpanded] = useState(false);
  const status = statusConfig[topic.status];
  const StatusIcon = status.icon;
  const hasContent = topic.content && topic.content.length > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, duration: 0.3 }}
      className="bg-card rounded-xl border border-border/50 shadow-[0_1px_3px_rgba(0,0,0,0.04)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.06)] transition-all duration-300"
    >
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full text-left p-5 group"
      >
        <div className="flex items-start gap-3.5">
          <div className="mt-0.5 flex-shrink-0">
            <div className={cn(
              "w-8 h-8 rounded-lg flex items-center justify-center transition-colors",
              expanded ? "bg-primary text-primary-foreground" : "bg-primary/8 text-primary/60 group-hover:bg-primary/15"
            )}>
              {hasContent ? <FileText size={16} /> : <BookOpen size={16} />}
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold text-card-foreground text-[15px] leading-snug mb-1">
              {topic.title}
            </h4>
            <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2">
              {topic.description}
            </p>
            <div className="flex items-center gap-2 mt-3 flex-wrap">
              <span
                className={cn(
                  "inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border",
                  status.color, status.bgColor, status.borderColor
                )}
              >
                <StatusIcon size={10} />
                {status.label}
              </span>
              {hasContent && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border text-emerald-600 bg-emerald-50 border-emerald-200">
                  <FileText size={10} />
                  Conteúdo disponível
                </span>
              )}
            </div>
          </div>
          <ChevronRight
            size={16}
            className={cn(
              "text-muted-foreground/30 transition-transform duration-300 flex-shrink-0 mt-2",
              expanded && "rotate-90"
            )}
          />
        </div>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-5 border-t border-border/30">
              <div className="pt-4 space-y-3">
                {/* Scope */}
                <div className="bg-muted/30 rounded-lg p-4">
                  <p className="text-[11px] font-bold text-foreground/50 uppercase tracking-[0.15em] mb-2.5 flex items-center gap-1.5">
                    <Info size={12} />
                    Escopo do Tópico
                  </p>
                  <p className="text-[13.5px] text-card-foreground leading-relaxed">
                    {topic.description}
                  </p>
                </div>

                {/* Rich Content */}
                {hasContent && (
                  <div className="bg-card rounded-lg border border-border/40 p-5">
                    <p className="text-[11px] font-bold text-primary/70 uppercase tracking-[0.15em] mb-4 flex items-center gap-1.5">
                      <FileText size={12} />
                      Conteúdo Operacional
                    </p>
                    <div className="space-y-3">
                      {topic.content!.map((paragraph, pIdx) => {
                        // Check if paragraph is a bullet point
                        const isBullet = paragraph.startsWith("- ") || paragraph.startsWith("\u2022 ");
                        if (isBullet) {
                          return (
                            <div key={pIdx} className="flex items-start gap-2.5 pl-2">
                              <span className="w-1.5 h-1.5 rounded-full bg-primary/40 mt-2 flex-shrink-0" />
                              <p className="text-[13.5px] text-card-foreground/90 leading-relaxed">
                                {renderParagraph(paragraph.replace(/^[-\u2022]\s*/, ""))}
                              </p>
                            </div>
                          );
                        }
                        // Check if paragraph is a heading (starts with ##)
                        if (paragraph.startsWith("## ")) {
                          return (
                            <h5 key={pIdx} className="font-serif text-base text-card-foreground font-semibold mt-4 mb-1 border-b border-border/30 pb-1.5">
                              {paragraph.replace(/^##\s*/, "")}
                            </h5>
                          );
                        }
                        if (paragraph.startsWith("### ")) {
                          return (
                            <h6 key={pIdx} className="font-semibold text-[13.5px] text-card-foreground mt-3 mb-0.5">
                              {paragraph.replace(/^###\s*/, "")}
                            </h6>
                          );
                        }
                        // Regular paragraph
                        return (
                          <p key={pIdx} className="text-[13.5px] text-card-foreground/90 leading-relaxed">
                            {renderParagraph(paragraph)}
                          </p>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Notes */}
                {topic.notes && (
                  <div className="bg-amber-50/60 border border-amber-200/50 rounded-lg p-4">
                    <div className="flex items-start gap-2.5">
                      <Info size={14} className="text-amber-600/70 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-[11px] font-bold text-amber-700/70 uppercase tracking-[0.12em] mb-1">
                          Observações
                        </p>
                        <p className="text-[13px] text-amber-900/80 leading-relaxed">
                          {topic.notes}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default function SectorContent({ sector }: SectorContentProps) {
  const Icon = sector.icon;
  const totalTopics = sector.topicGroups.reduce((sum: number, g) => sum + g.topics.length, 0);
  const completedTopics = sector.topicGroups.reduce(
    (sum: number, g) => sum + g.topics.filter((t) => t.status === "concluido").length,
    0
  );
  const heroImage = heroImages[sector.id];
  const progressPct = totalTopics > 0 ? Math.round((completedTopics / totalTopics) * 100) : 0;

  return (
    <motion.div
      key={sector.id}
      initial={{ opacity: 0, x: 12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className="max-w-4xl"
    >
      {/* Hero Image */}
      {heroImage && (
        <div className="relative rounded-2xl overflow-hidden mb-8 shadow-lg">
          <img
            src={heroImage}
            alt={sector.title}
            className="w-full h-44 sm:h-52 object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-6">
            <p className="text-[10px] font-bold text-white/60 uppercase tracking-[0.2em] mb-1">
              Módulo {sector.number}
            </p>
            <h2 className="font-serif text-2xl sm:text-3xl text-white leading-tight drop-shadow-sm">
              {sector.title}
            </h2>
          </div>
        </div>
      )}

      {/* Sector Header (for sectors without hero) */}
      {!heroImage && (
        <div className="mb-8">
          <div className="flex items-center gap-3.5 mb-3">
            <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10 text-primary shadow-sm">
              <Icon size={22} />
            </div>
            <div>
              <p className="text-[10px] font-bold text-primary/50 uppercase tracking-[0.2em]">
                Módulo {sector.number}
              </p>
              <h2 className="font-serif text-2xl sm:text-3xl text-foreground leading-tight">
                {sector.title}
              </h2>
            </div>
          </div>
        </div>
      )}

      {/* Description */}
      <p className="text-muted-foreground leading-relaxed text-[15px] mb-4">
        {sector.description}
      </p>

      {/* Stats + Progress */}
      <div className="flex items-center gap-5 mb-4 text-xs text-muted-foreground/60">
        <span className="flex items-center gap-1.5">
          <BookOpen size={13} />
          <span className="font-semibold text-foreground/50">{totalTopics}</span> tópicos
        </span>
        <span className="flex items-center gap-1.5">
          <Layers size={13} />
          <span className="font-semibold text-foreground/50">{sector.topicGroups.length}</span> categorias
        </span>
        <span className="flex items-center gap-1.5">
          <CheckCircle2 size={13} />
          <span className="font-semibold text-foreground/50">{completedTopics}</span> concluídos
        </span>
      </div>

      {/* Progress bar */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[11px] text-muted-foreground/50 font-medium">Progresso</span>
          <span className="text-[11px] font-bold text-foreground/40">{progressPct}%</span>
        </div>
        <div className="h-1.5 bg-muted/50 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progressPct}%` }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="h-full bg-primary/60 rounded-full"
          />
        </div>
      </div>

      {/* Divider */}
      <div className="h-px bg-gradient-to-r from-border via-border/50 to-transparent mb-8" />

      {/* Topic Groups */}
      <Accordion type="multiple" defaultValue={sector.topicGroups.map(g => g.id)} className="space-y-5">
        {sector.topicGroups.map((group) => {
          const groupCompleted = group.topics.filter(t => t.status === "concluido").length;
          return (
            <AccordionItem
              key={group.id}
              value={group.id}
              className="border border-border/40 rounded-2xl bg-card/20 overflow-hidden shadow-[0_1px_2px_rgba(0,0,0,0.03)]"
            >
              <AccordionTrigger className="px-6 py-5 hover:no-underline hover:bg-muted/20 transition-colors [&[data-state=open]]:border-b [&[data-state=open]]:border-border/30">
                <div className="flex items-center gap-3.5 text-left">
                  <div className="w-1 h-9 rounded-full bg-primary/30" />
                  <div>
                    <h3 className="font-serif text-lg text-foreground leading-snug">
                      {group.title}
                    </h3>
                    <p className="text-xs text-muted-foreground/70 mt-0.5 font-normal">
                      {group.description}
                    </p>
                  </div>
                  <span className="ml-auto mr-2 text-[10px] font-bold text-muted-foreground/30 bg-muted/40 px-2 py-0.5 rounded-full">
                    {groupCompleted}/{group.topics.length}
                  </span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-6 pt-4 pb-6">
                <div className="space-y-3">
                  {group.topics.map((topic, topicIdx) => (
                    <TopicCard key={topic.id} topic={topic} index={topicIdx} />
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>
    </motion.div>
  );
}
