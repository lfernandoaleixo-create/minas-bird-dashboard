/**
 * OperationalTools — 3 ferramentas operacionais para o módulo de Alimentação
 * 1. Lista de Compras (período + espécie)
 * 2. Rotina Diária do Tratador (período + espécie)
 * 3. Guia de Preparo (dia + espécie)
 *
 * Estética idêntica ao card "Exportar Calendários em PDF".
 */
import { useState, useMemo } from "react";
import {
  ShoppingCart, ClipboardList, ChefHat, Calendar,
  Bird, Download, Package, Wheat, Leaf, Apple, Zap, Users, Scale,
  FileText, ChevronDown, ChevronRight, Wrench,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { jsPDF } from "jspdf";
import { species, type Species } from "@/data/feeding";
import { lifePeriods, enclosureTypes } from "@/data/petbird";
import type { SavedDiet, SavedDietItem } from "@/lib/dietStorage";

// ============================================
// TYPES
// ============================================
type ToolTab = "shopping" | "routine" | "prep";

interface OperationalToolsProps {
  savedDiets: SavedDiet[];
  speciesCalendars: Record<string, Record<string, string>>;
}

// ============================================
// HELPERS
// ============================================
const MONTH_NAMES = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
const DAY_NAMES = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
const DAY_NAMES_SHORT = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

const activeFlockSpecies = species.filter(s => s.inCurrentFlock);

function formatDateBR(d: Date): string {
  return `${d.getDate().toString().padStart(2, "0")}/${(d.getMonth() + 1).toString().padStart(2, "0")}/${d.getFullYear()}`;
}

function toInputDate(d: Date): string {
  return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, "0")}-${d.getDate().toString().padStart(2, "0")}`;
}

function fromInputDate(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function getDayKey(d: Date): string {
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

function getDaysInRange(start: Date, end: Date): Date[] {
  const days: Date[] = [];
  const cur = new Date(start);
  while (cur <= end) {
    days.push(new Date(cur));
    cur.setDate(cur.getDate() + 1);
  }
  return days;
}

/**
 * Formata peso de forma padronizada:
 * - Acima de 1000g: somente kg com 3 casas decimais (ex: "1,190 kg")
 * - Abaixo de 1000g: gramas sem casas decimais (ex: "156 gramas")
 */
function formatWeight(g: number): string {
  if (g >= 1000) {
    const kg = (g / 1000).toLocaleString("pt-BR", { minimumFractionDigits: 3, maximumFractionDigits: 3 });
    return `${kg} kg`;
  }
  return `${Math.round(g)} gramas`;
}

/** Formato curto para tabelas: "156 g" ou "1,190 kg" */
function formatWeightShort(g: number): string {
  if (g >= 1000) {
    const kg = (g / 1000).toLocaleString("pt-BR", { minimumFractionDigits: 3, maximumFractionDigits: 3 });
    return `${kg} kg`;
  }
  return `${Math.round(g)} g`;
}

const CATEGORY_CONFIG = {
  racao: { label: "Ração", icon: Wheat, color: "text-amber-700", bg: "bg-amber-50", border: "border-amber-200", badgeBg: "bg-amber-100", badgeText: "text-amber-800" },
  vegetais: { label: "Vegetais", icon: Leaf, color: "text-emerald-700", bg: "bg-emerald-50", border: "border-emerald-200", badgeBg: "bg-emerald-100", badgeText: "text-emerald-800" },
  frutas: { label: "Frutas", icon: Apple, color: "text-red-600", bg: "bg-red-50", border: "border-red-200", badgeBg: "bg-red-100", badgeText: "text-red-700" },
  proteicos: { label: "Proteicos", icon: Zap, color: "text-purple-700", bg: "bg-purple-50", border: "border-purple-200", badgeBg: "bg-purple-100", badgeText: "text-purple-800" },
} as const;

type FoodCategory = keyof typeof CATEGORY_CONFIG;

// ============================================
// PERIOD OPTIONS (same as Export card)
// ============================================
const PERIOD_OPTIONS = [
  { label: "Semana Atual", value: "current-week" },
  { label: "Próximos 7 Dias", value: "next-7" },
  { label: "Próximos 15 Dias", value: "next-15" },
  { label: "Mês Atual", value: "current-month" },
  { label: "Próximos 30 Dias", value: "next-30" },
  { label: "Personalizado", value: "custom" },
];

function getDateRangeForPeriod(period: string): { start: Date; end: Date } {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  switch (period) {
    case "current-week": {
      const dayOfWeek = today.getDay();
      const monday = new Date(today);
      monday.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      return { start: monday, end: sunday };
    }
    case "next-7": {
      const end = new Date(today);
      end.setDate(today.getDate() + 6);
      return { start: today, end };
    }
    case "next-15": {
      const end = new Date(today);
      end.setDate(today.getDate() + 14);
      return { start: today, end };
    }
    case "current-month": {
      const start = new Date(today.getFullYear(), today.getMonth(), 1);
      const end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      return { start, end };
    }
    case "next-30": {
      const end = new Date(today);
      end.setDate(today.getDate() + 29);
      return { start: today, end };
    }
    default:
      return { start: today, end: today };
  }
}

// ============================================
// COMPONENT
// ============================================
export default function OperationalTools({ savedDiets, speciesCalendars }: OperationalToolsProps) {
  const [activeTab, setActiveTab] = useState<ToolTab>("shopping");

  // --- Shared selectors (same pattern as Export card) ---
  const [selectedSpeciesIds, setSelectedSpeciesIds] = useState<string[]>(activeFlockSpecies.map(s => s.id));
  const [period, setPeriod] = useState("next-7");
  const [customDateFrom, setCustomDateFrom] = useState("");
  const [customDateTo, setCustomDateTo] = useState("");
  // For prep guide: single date
  const [singleDate, setSingleDate] = useState<string>(toInputDate(new Date()));

  // Derived date range
  const dateRange = useMemo(() => {
    if (period === "custom" && customDateFrom && customDateTo) {
      return { start: fromInputDate(customDateFrom), end: fromInputDate(customDateTo) };
    }
    return getDateRangeForPeriod(period);
  }, [period, customDateFrom, customDateTo]);

  const startDate = toInputDate(dateRange.start);
  const endDate = toInputDate(dateRange.end);

  // Toggle species (same pattern as Export card)
  const toggleSpecies = (id: string) => {
    setSelectedSpeciesIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const toggleAll = () => {
    if (selectedSpeciesIds.length === activeFlockSpecies.length) {
      setSelectedSpeciesIds([]);
    } else {
      setSelectedSpeciesIds(activeFlockSpecies.map(s => s.id));
    }
  };

  const effectiveSpeciesIds = selectedSpeciesIds;

  // ============================================
  // SHOPPING LIST LOGIC
  // ============================================
  const shoppingList = useMemo(() => {
    const start = fromInputDate(startDate);
    const end = fromInputDate(endDate);
    if (start > end) return null;

    const days = getDaysInRange(start, end);
    const totalDays = days.length;

    const aggregate: Record<string, { category: FoodCategory; totalGrams: number; perSpecies: Record<string, number> }> = {};

    for (const speciesId of effectiveSpeciesIds) {
      const sp = species.find(s => s.id === speciesId);
      if (!sp) continue;
      const cal = speciesCalendars[speciesId] || {};

      for (const day of days) {
        const dayKey = getDayKey(day);
        const legacyKey = `${day.getMonth() + 1}-${day.getDate()}`;
        const dietId = cal[dayKey] || cal[legacyKey];
        if (!dietId) continue;

        const diet = savedDiets.find(d => d.id === dietId);
        if (!diet) continue;

        const categories: FoodCategory[] = ["racao", "vegetais", "frutas", "proteicos"];
        for (const cat of categories) {
          for (const item of diet.items[cat]) {
            const key = item.foodName;
            if (!aggregate[key]) {
              aggregate[key] = { category: cat, totalGrams: 0, perSpecies: {} };
            }
            const dailyTotal = item.grams * diet.birdCount;
            aggregate[key].totalGrams += dailyTotal;
            aggregate[key].perSpecies[sp.commonName] = (aggregate[key].perSpecies[sp.commonName] || 0) + dailyTotal;
          }
        }
      }
    }

    const grouped: Record<FoodCategory, { name: string; totalGrams: number; perSpecies: Record<string, number> }[]> = {
      racao: [], vegetais: [], frutas: [], proteicos: [],
    };

    for (const [name, data] of Object.entries(aggregate)) {
      grouped[data.category].push({ name, totalGrams: data.totalGrams, perSpecies: data.perSpecies });
    }

    for (const cat of Object.keys(grouped) as FoodCategory[]) {
      grouped[cat].sort((a, b) => b.totalGrams - a.totalGrams);
    }

    return { grouped, totalDays };
  }, [startDate, endDate, effectiveSpeciesIds, speciesCalendars, savedDiets]);

  // ============================================
  // DAILY ROUTINE LOGIC
  // ============================================
  const dailyRoutine = useMemo(() => {
    const start = fromInputDate(startDate);
    const end = fromInputDate(endDate);
    if (start > end) return null;

    const days = getDaysInRange(start, end);
    const routine: { date: Date; speciesRoutines: { species: Species; diet: SavedDiet }[] }[] = [];

    for (const day of days) {
      const dayKey = getDayKey(day);
      const legacyKey = `${day.getMonth() + 1}-${day.getDate()}`;
      const speciesRoutines: { species: Species; diet: SavedDiet }[] = [];

      for (const speciesId of effectiveSpeciesIds) {
        const sp = species.find(s => s.id === speciesId);
        if (!sp) continue;
        const cal = speciesCalendars[speciesId] || {};
        const dietId = cal[dayKey] || cal[legacyKey];
        if (!dietId) continue;

        const diet = savedDiets.find(d => d.id === dietId);
        if (!diet) continue;

        speciesRoutines.push({ species: sp, diet });
      }

      if (speciesRoutines.length > 0) {
        routine.push({ date: day, speciesRoutines });
      }
    }

    return routine;
  }, [startDate, endDate, effectiveSpeciesIds, speciesCalendars, savedDiets]);

  // ============================================
  // PREP GUIDE LOGIC
  // ============================================
  const prepGuide = useMemo(() => {
    const day = fromInputDate(singleDate);
    const dayKey = getDayKey(day);
    const legacyKey = `${day.getMonth() + 1}-${day.getDate()}`;

    const speciesPreps: { species: Species; diet: SavedDiet }[] = [];

    for (const speciesId of effectiveSpeciesIds) {
      const sp = species.find(s => s.id === speciesId);
      if (!sp) continue;
      const cal = speciesCalendars[speciesId] || {};
      const dietId = cal[dayKey] || cal[legacyKey];
      if (!dietId) continue;

      const diet = savedDiets.find(d => d.id === dietId);
      if (!diet) continue;

      speciesPreps.push({ species: sp, diet });
    }

    const steps: { category: FoodCategory; items: { foodName: string; speciesName: string; gramsPerBird: number; totalGrams: number; birdCount: number }[] }[] = [];

    const categories: FoodCategory[] = ["racao", "vegetais", "frutas", "proteicos"];
    for (const cat of categories) {
      const items: { foodName: string; speciesName: string; gramsPerBird: number; totalGrams: number; birdCount: number }[] = [];
      for (const { species: sp, diet } of speciesPreps) {
        for (const item of diet.items[cat]) {
          items.push({
            foodName: item.foodName,
            speciesName: sp.commonName,
            gramsPerBird: item.grams,
            totalGrams: item.grams * diet.birdCount,
            birdCount: diet.birdCount,
          });
        }
      }
      if (items.length > 0) {
        steps.push({ category: cat, items });
      }
    }

    const consolidated: Record<string, { category: FoodCategory; totalGrams: number }> = {};
    for (const step of steps) {
      for (const item of step.items) {
        if (!consolidated[item.foodName]) {
          consolidated[item.foodName] = { category: step.category, totalGrams: 0 };
        }
        consolidated[item.foodName].totalGrams += item.totalGrams;
      }
    }

    return { speciesPreps, steps, consolidated, date: day };
  }, [singleDate, effectiveSpeciesIds, speciesCalendars, savedDiets]);

  // ============================================
  // PDF EXPORT HELPERS
  // ============================================
  const BRAND = {
    primary: [16, 185, 129] as [number, number, number],
    dark: [6, 78, 59] as [number, number, number],
    medium: [5, 150, 105] as [number, number, number],
    light: [209, 250, 229] as [number, number, number],
    bg: [240, 253, 244] as [number, number, number],
    text: [41, 37, 36] as [number, number, number],
    muted: [120, 113, 108] as [number, number, number],
  };

  const CAT_COLORS: Record<FoodCategory, { r: number; g: number; b: number; bgR: number; bgG: number; bgB: number }> = {
    racao:     { r: 180, g: 83, b: 9,   bgR: 255, bgG: 251, bgB: 235 },
    vegetais:  { r: 5, g: 150, b: 105,  bgR: 236, bgG: 253, bgB: 245 },
    frutas:    { r: 220, g: 38, b: 38,  bgR: 254, bgG: 242, bgB: 242 },
    proteicos: { r: 126, g: 34, b: 206, bgR: 250, bgG: 245, bgB: 255 },
  };

  function pdfHeader(doc: jsPDF, pageW: number, title: string, subtitle: string): number {
    doc.setFillColor(...BRAND.dark);
    doc.rect(0, 0, pageW, 3, "F");
    doc.setFillColor(...BRAND.bg);
    doc.rect(0, 3, pageW, 18, "F");
    doc.setDrawColor(...BRAND.primary);
    doc.setLineWidth(0.3);
    doc.line(0, 21, pageW, 21);
    // Logo circle
    doc.setFillColor(...BRAND.primary);
    doc.circle(14, 11, 4, "F");
    doc.setFillColor(255, 255, 255);
    doc.circle(15.5, 10, 1.2, "F");
    doc.setFillColor(...BRAND.dark);
    doc.circle(15.5, 10, 0.5, "F");
    doc.setFillColor(...BRAND.medium);
    doc.triangle(18, 11, 20, 10.5, 18, 12, "F");
    // Name
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...BRAND.dark);
    doc.text("Criatório Minas Bird", 24, 10);
    doc.setFontSize(6.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...BRAND.muted);
    doc.text("Manual Operacional de Alimentação", 24, 14);
    // Title right
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...BRAND.text);
    doc.text(title, pageW - 10, 10, { align: "right" });
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...BRAND.muted);
    doc.text(subtitle, pageW - 10, 14, { align: "right" });
    return 24;
  }

  function pdfFooter(doc: jsPDF, pageW: number, pageH: number, pageNum?: number, totalPages?: number): void {
    const fy = pageH - 6;
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.2);
    doc.line(8, fy - 2, pageW - 8, fy - 2);
    const now = new Date();
    const ds = `${now.getDate().toString().padStart(2, "0")}/${(now.getMonth() + 1).toString().padStart(2, "0")}/${now.getFullYear()}`;
    const ts = `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`;
    doc.setFontSize(6);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...BRAND.muted);
    doc.text(`Publicado em ${ds} às ${ts}`, 8, fy);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...BRAND.medium);
    doc.text("Criatório Minas Bird", pageW / 2, fy, { align: "center" });
    if (pageNum !== undefined && totalPages !== undefined) {
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...BRAND.muted);
      doc.text(`Página ${pageNum} de ${totalPages}`, pageW - 8, fy, { align: "right" });
    }
  }

  // ============================================
  // EXPORT PDF
  // ============================================
  const exportShoppingListPdf = () => {
    if (!shoppingList) return;
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const periodStr = `${formatDateBR(fromInputDate(startDate))} a ${formatDateBR(fromInputDate(endDate))} (${shoppingList.totalDays} dias)`;
    const speciesStr = selectedSpeciesIds.length === activeFlockSpecies.length ? "Todas as espécies do plantel" : effectiveSpeciesIds.map(id => species.find(s => s.id === id)?.commonName).filter(Boolean).join(", ");

    let y = pdfHeader(doc, pageW, "Lista de Compras", periodStr);

    // Info box
    doc.setFillColor(250, 250, 249);
    doc.roundedRect(10, y, pageW - 20, 10, 1.5, 1.5, "F");
    doc.setFontSize(7.5);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...BRAND.text);
    doc.text(`Período: ${periodStr}`, 14, y + 4);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...BRAND.muted);
    doc.text(`Espécies: ${speciesStr}`, 14, y + 8);
    y += 14;

    // === SUPERMERCADO (vegetais, frutas, proteicos) ===
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(30, 64, 175); // blue-800
    doc.text("COMPRAS NO SUPERMERCADO", 14, y + 3);
    y += 8;

    const supermarketCats: FoodCategory[] = ["vegetais", "frutas", "proteicos"];
    for (const cat of supermarketCats) {
      const items = shoppingList.grouped[cat];
      if (items.length === 0) continue;
      const cc = CAT_COLORS[cat];

      // Category header
      if (y > pageH - 25) {
        pdfFooter(doc, pageW, pageH);
        doc.addPage();
        y = pdfHeader(doc, pageW, "Lista de Compras (cont.)", periodStr);
      }
      doc.setFillColor(cc.r, cc.g, cc.b);
      doc.roundedRect(10, y, pageW - 20, 7, 1, 1, "F");
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(255, 255, 255);
      doc.text(CATEGORY_CONFIG[cat].label.toUpperCase(), 14, y + 5);
      doc.text(`${items.length} itens`, pageW - 14, y + 5, { align: "right" });
      y += 9;

      // Items
      for (let i = 0; i < items.length; i++) {
        if (y > pageH - 20) {
          pdfFooter(doc, pageW, pageH);
          doc.addPage();
          y = pdfHeader(doc, pageW, "Lista de Compras (cont.)", periodStr);
        }
        const item = items[i];
        const isEven = i % 2 === 0;
        if (isEven) {
          doc.setFillColor(cc.bgR, cc.bgG, cc.bgB);
          doc.rect(10, y - 1, pageW - 20, 6, "F");
        }
        doc.setFontSize(8.5);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(...BRAND.text);
        doc.text(item.name, 14, y + 3);
        doc.setFont("helvetica", "bold");
        doc.text(formatWeight(item.totalGrams), pageW - 14, y + 3, { align: "right" });
        y += 6;
      }
      y += 4;
    }

    // === RAÇÕES (FORNECEDOR) ===
    const racaoItems = shoppingList.grouped.racao;
    if (racaoItems.length > 0) {
      if (y > pageH - 35) {
        pdfFooter(doc, pageW, pageH);
        doc.addPage();
        y = pdfHeader(doc, pageW, "Lista de Compras (cont.)", periodStr);
      }
      // Dashed separator line
      y += 4;
      doc.setDrawColor(217, 119, 6); // amber-600
      doc.setLineDashPattern([2, 2], 0);
      doc.line(10, y, pageW - 10, y);
      doc.setLineDashPattern([], 0);
      y += 6;

      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(146, 64, 14); // amber-800
      doc.text("RA\u00c7\u00d5ES \u2014 COMPRA VIA FORNECEDOR", 14, y + 3);
      y += 6;
      doc.setFontSize(7);
      doc.setFont("helvetica", "italic");
      doc.setTextColor(180, 83, 9); // amber-600
      doc.text("Compra trimestral direta do fornecedor \u2014 n\u00e3o incluir na lista de supermercado", 14, y + 3);
      y += 8;

      const cc = CAT_COLORS.racao;
      doc.setFillColor(cc.r, cc.g, cc.b);
      doc.roundedRect(10, y, pageW - 20, 7, 1, 1, "F");
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(255, 255, 255);
      doc.text("RA\u00c7\u00c3O", 14, y + 5);
      doc.text(`${racaoItems.length} itens`, pageW - 14, y + 5, { align: "right" });
      y += 9;

      for (let i = 0; i < racaoItems.length; i++) {
        if (y > pageH - 20) {
          pdfFooter(doc, pageW, pageH);
          doc.addPage();
          y = pdfHeader(doc, pageW, "Lista de Compras (cont.)", periodStr);
        }
        const item = racaoItems[i];
        const isEven = i % 2 === 0;
        if (isEven) {
          doc.setFillColor(cc.bgR, cc.bgG, cc.bgB);
          doc.rect(10, y - 1, pageW - 20, 6, "F");
        }
        doc.setFontSize(8.5);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(...BRAND.text);
        doc.text(item.name, 14, y + 3);
        doc.setFont("helvetica", "bold");
        doc.text(formatWeight(item.totalGrams), pageW - 14, y + 3, { align: "right" });
        y += 6;
      }
      y += 4;
    }

    pdfFooter(doc, pageW, pageH);
    doc.save(`Lista_Compras_${startDate}_a_${endDate}.pdf`);
  };

  const exportRoutinePdf = () => {
    if (!dailyRoutine) return;
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const periodStr = `${formatDateBR(fromInputDate(startDate))} a ${formatDateBR(fromInputDate(endDate))}`;
    let pageNum = 1;
    const totalPages = Math.max(1, Math.ceil(dailyRoutine.length / 3));

    let y = pdfHeader(doc, pageW, "Rotina do Tratador", periodStr);

    for (let di = 0; di < dailyRoutine.length; di++) {
      const { date, speciesRoutines } = dailyRoutine[di];
      const dayName = DAY_NAMES[date.getDay()];

      // Check space
      const neededH = 12 + speciesRoutines.length * 20;
      if (y + neededH > pageH - 15) {
        pdfFooter(doc, pageW, pageH, pageNum, totalPages);
        doc.addPage();
        pageNum++;
        y = pdfHeader(doc, pageW, "Rotina do Tratador (cont.)", periodStr);
      }

      // Day header
      doc.setFillColor(...BRAND.dark);
      doc.roundedRect(10, y, pageW - 20, 8, 1.5, 1.5, "F");
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(255, 255, 255);
      doc.text(`${dayName}, ${formatDateBR(date)}`, 14, y + 5.5);
      y += 10;

      for (const { species: sp, diet } of speciesRoutines) {
        if (y + 18 > pageH - 15) {
          pdfFooter(doc, pageW, pageH, pageNum, totalPages);
          doc.addPage();
          pageNum++;
          y = pdfHeader(doc, pageW, "Rotina do Tratador (cont.)", periodStr);
        }

        // Species card
        doc.setFillColor(...BRAND.bg);
        doc.roundedRect(12, y, pageW - 24, 5, 1, 1, "F");
        doc.setFontSize(8.5);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(...BRAND.dark);
        doc.text(`${sp.commonName} — ${diet.birdCount} ave${diet.birdCount > 1 ? "s" : ""}`, 15, y + 3.5);
        doc.setFontSize(7);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(...BRAND.muted);
        doc.text(`Dieta: ${diet.name}`, pageW - 15, y + 3.5, { align: "right" });
        y += 7;

        const categories: FoodCategory[] = ["racao", "vegetais", "frutas", "proteicos"];
        for (const cat of categories) {
          if (diet.items[cat].length > 0) {
            const cc = CAT_COLORS[cat];
            doc.setFillColor(cc.r, cc.g, cc.b);
            doc.circle(15, y + 1.5, 1, "F");
            doc.setFontSize(7);
            doc.setFont("helvetica", "bold");
            doc.setTextColor(cc.r, cc.g, cc.b);
            doc.text(CATEGORY_CONFIG[cat].label + ":", 18, y + 2.5);
            const catItems = diet.items[cat].map(i => `${i.foodName} ${formatWeightShort(i.grams * diet.birdCount)}`).join("  |  ");
            doc.setFont("helvetica", "normal");
            doc.setTextColor(...BRAND.text);
            doc.text(catItems, 18 + doc.getTextWidth(CATEGORY_CONFIG[cat].label + ": ") + 1, y + 2.5);
            y += 4;
          }
        }
        y += 3;
      }
      y += 2;
    }

    pdfFooter(doc, pageW, pageH, pageNum, totalPages);
    doc.save(`Rotina_Tratador_${startDate}_a_${endDate}.pdf`);
  };

  const exportPrepGuidePdf = () => {
    if (!prepGuide || prepGuide.speciesPreps.length === 0) return;
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const dayName = DAY_NAMES[prepGuide.date.getDay()];
    const dateStr = `${dayName}, ${formatDateBR(prepGuide.date)}`;

    let y = pdfHeader(doc, pageW, "Guia de Preparo", dateStr);

    // Consolidated ingredients
    doc.setFillColor(...BRAND.dark);
    doc.roundedRect(10, y, pageW - 20, 7, 1.5, 1.5, "F");
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(255, 255, 255);
    doc.text("INGREDIENTES TOTAIS", 14, y + 5);
    y += 9;

    const sortedItems = Object.entries(prepGuide.consolidated).sort((a, b) => b[1].totalGrams - a[1].totalGrams);
    for (let i = 0; i < sortedItems.length; i++) {
      const [name, data] = sortedItems[i];
      if (i % 2 === 0) {
        doc.setFillColor(250, 250, 249);
        doc.rect(10, y - 1, pageW - 20, 5.5, "F");
      }
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...BRAND.text);
      doc.text(name, 14, y + 3);
      doc.setFont("helvetica", "bold");
      doc.text(formatWeight(data.totalGrams), pageW - 14, y + 3, { align: "right" });
      y += 5.5;
    }
    y += 5;

    // Per species
    doc.setFillColor(...BRAND.medium);
    doc.roundedRect(10, y, pageW - 20, 7, 1.5, 1.5, "F");
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(255, 255, 255);
    doc.text("PREPARO POR ESPÉCIE", 14, y + 5);
    y += 9;

    for (const { species: sp, diet } of prepGuide.speciesPreps) {
      if (y + 20 > pageH - 15) {
        pdfFooter(doc, pageW, pageH);
        doc.addPage();
        y = pdfHeader(doc, pageW, "Guia de Preparo (cont.)", dateStr);
      }

      doc.setFillColor(...BRAND.bg);
      doc.roundedRect(12, y, pageW - 24, 6, 1, 1, "F");
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...BRAND.dark);
      doc.text(`${sp.commonName} — ${diet.birdCount} ave${diet.birdCount > 1 ? "s" : ""}`, 15, y + 4);
      y += 8;

      const categories: FoodCategory[] = ["racao", "vegetais", "frutas", "proteicos"];
      for (const cat of categories) {
        if (diet.items[cat].length > 0) {
          const cc = CAT_COLORS[cat];
          doc.setFontSize(7.5);
          doc.setFont("helvetica", "bold");
          doc.setTextColor(cc.r, cc.g, cc.b);
          doc.text(CATEGORY_CONFIG[cat].label, 15, y + 2.5);
          y += 4;

          for (const item of diet.items[cat]) {
            if (y + 5 > pageH - 15) {
              pdfFooter(doc, pageW, pageH);
              doc.addPage();
              y = pdfHeader(doc, pageW, "Guia de Preparo (cont.)", dateStr);
            }
            doc.setFontSize(7.5);
            doc.setFont("helvetica", "normal");
            doc.setTextColor(...BRAND.text);
            doc.text(`• ${item.foodName}`, 18, y + 2.5);
            doc.setFont("helvetica", "bold");
            doc.text(`${formatWeightShort(item.grams)}/ave — ${formatWeightShort(item.grams * diet.birdCount)} total`, pageW - 14, y + 2.5, { align: "right" });
            y += 4.5;
          }
        }
      }
      y += 4;
    }

    pdfFooter(doc, pageW, pageH);
    doc.save(`Guia_Preparo_${singleDate}.pdf`);
  };

  // ============================================
  // RENDER
  // ============================================
  const tabs: { id: ToolTab; label: string; icon: typeof ShoppingCart; color: string; activeColor: string; activeBg: string }[] = [
    { id: "shopping", label: "Lista de Compras", icon: ShoppingCart, color: "text-blue-600", activeColor: "text-blue-700", activeBg: "bg-blue-50" },
    { id: "routine", label: "Rotina do Tratador", icon: ClipboardList, color: "text-emerald-600", activeColor: "text-emerald-700", activeBg: "bg-emerald-50" },
    { id: "prep", label: "Guia de Preparo", icon: ChefHat, color: "text-amber-600", activeColor: "text-amber-700", activeBg: "bg-amber-50" },
  ];

  const currentTabConfig = tabs.find(t => t.id === activeTab)!;

  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="bg-white rounded-xl border border-stone-200 shadow-sm overflow-hidden">
      {/* Header expansível */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center gap-3 px-5 py-3.5 text-left hover:bg-stone-50 transition-colors"
      >
        <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
          <Wrench className="w-4 h-4 text-amber-700" />
        </div>
        <h3 className="font-bold text-stone-800">Ferramentas Operacionais</h3>
        <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-stone-100 text-stone-600">Compras · Rotina · Preparo</span>
        <span className="ml-auto flex-shrink-0">
          {isExpanded
            ? <ChevronDown className="w-5 h-5 text-stone-400" />
            : <ChevronRight className="w-5 h-5 text-stone-400" />}
        </span>
      </button>

      {isExpanded && (
      <>
      {/* Tabs */}
      <div className="flex border-b border-stone-200">
        {tabs.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 px-4 py-3.5 text-sm font-semibold transition-all border-b-2",
                isActive
                  ? `${tab.color} border-current ${tab.activeBg}`
                  : "text-stone-400 border-transparent hover:text-stone-600 hover:bg-stone-50/50"
              )}
            >
              <Icon className="w-4.5 h-4.5" />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div className="p-5">
        {/* ===== SPECIES SELECTOR (same style as Export card) ===== */}
        <div className="mb-4">
          <label className="text-xs font-semibold text-stone-600 mb-1.5 block">Espécies</label>
          <div className="flex flex-wrap gap-1.5">
            <button
              onClick={toggleAll}
              className={cn(
                "px-2.5 py-1 text-xs font-medium rounded-md border transition-colors",
                selectedSpeciesIds.length === activeFlockSpecies.length
                  ? "bg-indigo-600 text-white border-indigo-600"
                  : "bg-white text-stone-600 border-stone-200 hover:border-indigo-300"
              )}
            >
              {selectedSpeciesIds.length === activeFlockSpecies.length ? "✓ Todas" : "Todas"} ({activeFlockSpecies.length})
            </button>
            {activeFlockSpecies.map(sp => {
              const isSelected = selectedSpeciesIds.includes(sp.id);
              return (
                <button
                  key={sp.id}
                  onClick={() => toggleSpecies(sp.id)}
                  className={cn(
                    "px-2.5 py-1 text-xs font-medium rounded-md border transition-colors",
                    isSelected
                      ? "bg-emerald-600 text-white border-emerald-600"
                      : "bg-white text-stone-600 border-stone-200 hover:border-emerald-300"
                  )}
                >
                  {isSelected ? "✓ " : ""}{sp.commonName}
                </button>
              );
            })}
          </div>
        </div>

        {/* ===== PERIOD SELECTOR (same style as Export card) ===== */}
        {activeTab !== "prep" ? (
          <>
            <div className="mb-3">
              <label className="text-xs font-semibold text-stone-600 mb-1.5 block">Período Predefinido</label>
              <div className="flex flex-wrap gap-1.5">
                {PERIOD_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => setPeriod(opt.value)}
                    className={cn(
                      "px-2.5 py-1 text-xs font-medium rounded-md border transition-colors",
                      period === opt.value
                        ? "bg-indigo-600 text-white border-indigo-600"
                        : "bg-white text-stone-600 border-stone-200 hover:border-indigo-300"
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom date range (when Personalizado) */}
            {period === "custom" && (
              <div className="mb-4 p-3 bg-stone-50 rounded-lg border border-stone-200">
                <label className="text-xs font-semibold text-stone-600 mb-1.5 block">Selecione as datas</label>
                <div className="flex items-center gap-2">
                  <input
                    type="date"
                    value={customDateFrom}
                    onChange={(e) => setCustomDateFrom(e.target.value)}
                    className="px-2.5 py-1.5 text-sm border border-stone-200 rounded-md bg-white text-stone-700 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                  />
                  <span className="text-sm text-stone-400 font-medium">até</span>
                  <input
                    type="date"
                    value={customDateTo}
                    onChange={(e) => setCustomDateTo(e.target.value)}
                    className="px-2.5 py-1.5 text-sm border border-stone-200 rounded-md bg-white text-stone-700 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                  />
                  {customDateFrom && customDateTo && (
                    <button
                      onClick={() => { setCustomDateFrom(""); setCustomDateTo(""); setPeriod("next-7"); }}
                      className="text-xs text-red-500 hover:text-red-700 font-medium"
                    >
                      Limpar
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Date range summary */}
            <div className="mb-5 flex items-center gap-2 px-3 py-2 bg-stone-50 rounded-lg border border-stone-100">
              <Calendar className="w-4 h-4 text-stone-500" />
              <span className="text-sm font-medium text-stone-700">
                {formatDateBR(dateRange.start)} a {formatDateBR(dateRange.end)}
              </span>
              <span className="text-xs text-stone-400">
                ({getDaysInRange(dateRange.start, dateRange.end).length} dias)
              </span>
            </div>
          </>
        ) : (
          /* Prep guide: single date selector */
          <div className="mb-5">
            <label className="text-xs font-semibold text-stone-600 mb-1.5 block">Ou selecione a data</label>
            <div className="flex items-center gap-3">
              <input
                type="date"
                value={singleDate}
                onChange={e => setSingleDate(e.target.value)}
                className="px-2.5 py-1.5 text-sm border border-stone-200 rounded-md bg-white text-stone-700 focus:outline-none focus:ring-2 focus:ring-indigo-300"
              />
              <div className="flex items-center gap-2 px-3 py-2 bg-stone-50 rounded-lg border border-stone-100">
                <Calendar className="w-4 h-4 text-stone-500" />
                <span className="text-sm font-medium text-stone-700">
                  {DAY_NAMES[fromInputDate(singleDate).getDay()]}, {formatDateBR(fromInputDate(singleDate))}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* ===== TAB: LISTA DE COMPRAS ===== */}
        {activeTab === "shopping" && (
          <div>
            {!shoppingList || Object.values(shoppingList.grouped).every(arr => arr.length === 0) ? (
              <div className="text-center py-12 text-stone-400">
                <ShoppingCart className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="text-base font-medium">Nenhuma dieta programada no período selecionado.</p>
                <p className="text-sm mt-1">Programe dietas no calendário para gerar a lista de compras.</p>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Package className="w-5 h-5 text-blue-600" />
                    <span className="text-base font-bold text-stone-800">
                      {shoppingList.totalDays} dias
                    </span>
                    <span className="text-sm text-stone-500">
                      {Object.values(shoppingList.grouped).reduce((sum, arr) => sum + arr.length, 0)} itens no total
                    </span>
                  </div>
                  <button
                    onClick={exportShoppingListPdf}
                    className="flex items-center gap-1.5 px-3 py-2 text-sm font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    Exportar PDF
                  </button>
                </div>

                {/* === SEÇÃO SUPERMERCADO === */}
                <div className="mb-2">
                  <div className="flex items-center gap-2 mb-3 px-1">
                    <ShoppingCart className="w-5 h-5 text-blue-600" />
                    <span className="text-base font-bold text-stone-800">Compras no Supermercado</span>
                  </div>
                  <div className="space-y-4">
                    {(["vegetais", "frutas", "proteicos"] as FoodCategory[]).map(cat => {
                      const items = shoppingList.grouped[cat];
                      if (items.length === 0) return null;
                      const config = CATEGORY_CONFIG[cat];
                      const Icon = config.icon;

                      return (
                        <div key={cat} className={cn("rounded-xl border p-4", config.bg, config.border)}>
                          <div className="flex items-center gap-2 mb-3">
                            <Icon className={cn("w-5 h-5", config.color)} />
                            <span className={cn("text-base font-bold", config.color)}>{config.label}</span>
                            <span className={cn("px-2 py-0.5 text-xs font-semibold rounded-full", config.badgeBg, config.badgeText)}>
                              {items.length} {items.length === 1 ? "item" : "itens"}
                            </span>
                          </div>
                          <div className="space-y-2">
                            {items.map((item, i) => (
                              <div key={i} className="flex items-center justify-between bg-white rounded-lg px-4 py-3 border border-white/80 shadow-sm">
                                <span className="text-base font-medium text-stone-800">{item.name}</span>
                                <div className="text-right">
                                  <span className="text-base font-bold text-stone-900">{formatWeightShort(item.totalGrams)}</span>
                                  {Object.keys(item.perSpecies).length > 1 && (
                                    <div className="text-xs text-stone-500 mt-0.5">
                                      {Object.entries(item.perSpecies).map(([sp, g]) => `${sp}: ${formatWeightShort(g)}`).join(" · ")}
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* === SEÇÃO RAÇÕES (FORNECEDOR) === */}
                {shoppingList.grouped.racao.length > 0 && (
                  <div className="mt-6 pt-5 border-t-2 border-dashed border-amber-300">
                    <div className="flex items-center gap-2 mb-1 px-1">
                      <Wheat className="w-5 h-5 text-amber-700" />
                      <span className="text-base font-bold text-amber-800">Rações — Compra via Fornecedor</span>
                    </div>
                    <p className="text-xs text-amber-600 mb-3 px-1 flex items-center gap-1">
                      <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-400" />
                      Compra trimestral direta do fornecedor — não incluir na lista de supermercado
                    </p>
                    <div className={cn("rounded-xl border p-4", CATEGORY_CONFIG.racao.bg, CATEGORY_CONFIG.racao.border)}>
                      <div className="flex items-center gap-2 mb-3">
                        <Wheat className={cn("w-5 h-5", CATEGORY_CONFIG.racao.color)} />
                        <span className={cn("text-base font-bold", CATEGORY_CONFIG.racao.color)}>{CATEGORY_CONFIG.racao.label}</span>
                        <span className={cn("px-2 py-0.5 text-xs font-semibold rounded-full", CATEGORY_CONFIG.racao.badgeBg, CATEGORY_CONFIG.racao.badgeText)}>
                          {shoppingList.grouped.racao.length} {shoppingList.grouped.racao.length === 1 ? "item" : "itens"}
                        </span>
                      </div>
                      <div className="space-y-2">
                        {shoppingList.grouped.racao.map((item, i) => (
                          <div key={i} className="flex items-center justify-between bg-white rounded-lg px-4 py-3 border border-white/80 shadow-sm">
                            <span className="text-base font-medium text-stone-800">{item.name}</span>
                            <div className="text-right">
                              <span className="text-base font-bold text-stone-900">{formatWeightShort(item.totalGrams)}</span>
                              {Object.keys(item.perSpecies).length > 1 && (
                                <div className="text-xs text-stone-500 mt-0.5">
                                  {Object.entries(item.perSpecies).map(([sp, g]) => `${sp}: ${formatWeightShort(g)}`).join(" · ")}
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* ===== TAB: ROTINA DO TRATADOR ===== */}
        {activeTab === "routine" && (
          <div>
            {!dailyRoutine || dailyRoutine.length === 0 ? (
              <div className="text-center py-12 text-stone-400">
                <ClipboardList className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="text-base font-medium">Nenhuma dieta programada no período selecionado.</p>
                <p className="text-sm mt-1">Programe dietas no calendário para gerar a rotina.</p>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <ClipboardList className="w-5 h-5 text-emerald-600" />
                    <span className="text-base font-bold text-stone-800">
                      {dailyRoutine.length} dias com atividades
                    </span>
                  </div>
                  <button
                    onClick={exportRoutinePdf}
                    className="flex items-center gap-1.5 px-3 py-2 text-sm font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    Exportar PDF
                  </button>
                </div>

                <div className="space-y-4">
                  {dailyRoutine.map(({ date, speciesRoutines }, idx) => {
                    const dayName = DAY_NAMES_SHORT[date.getDay()];
                    const isWeekend = date.getDay() === 0 || date.getDay() === 6;

                    return (
                      <div key={idx} className={cn("rounded-xl border p-4", isWeekend ? "bg-amber-50/60 border-amber-200" : "bg-white border-stone-200")}>
                        <div className="flex items-center gap-2 mb-3">
                          <Calendar className="w-5 h-5 text-stone-500" />
                          <span className={cn("text-base font-bold", isWeekend ? "text-amber-700" : "text-stone-800")}>
                            {dayName}, {formatDateBR(date)}
                          </span>
                          <span className={cn("px-2 py-0.5 text-xs font-semibold rounded-full", isWeekend ? "bg-amber-100 text-amber-700" : "bg-stone-100 text-stone-600")}>
                            {speciesRoutines.length} {speciesRoutines.length === 1 ? "espécie" : "espécies"}
                          </span>
                        </div>

                        <div className="space-y-3">
                          {speciesRoutines.map(({ species: sp, diet }, si) => (
                            <div key={si} className="bg-stone-50 rounded-lg p-4 border border-stone-100">
                              <div className="flex items-center gap-2 mb-3">
                                <Bird className="w-4.5 h-4.5 text-emerald-600" />
                                <span className="text-base font-bold text-stone-800">{sp.commonName}</span>
                                <span className="flex items-center gap-1 text-sm text-stone-500 font-medium">
                                  <Users className="w-3.5 h-3.5" /> {diet.birdCount} aves
                                </span>
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {(["racao", "vegetais", "frutas", "proteicos"] as FoodCategory[]).map(cat => {
                                  if (diet.items[cat].length === 0) return null;
                                  const config = CATEGORY_CONFIG[cat];
                                  const Icon = config.icon;
                                  return (
                                    <div key={cat} className={cn("rounded-lg px-3 py-2.5 border", config.bg, config.border)}>
                                      <div className="flex items-center gap-1.5 mb-1.5">
                                        <Icon className={cn("w-4 h-4", config.color)} />
                                        <span className={cn("text-sm font-bold", config.color)}>{config.label}</span>
                                      </div>
                                      {diet.items[cat].map((item, ii) => (
                                        <div key={ii} className="flex items-center justify-between text-sm text-stone-700 py-0.5">
                                          <span className="font-medium">{item.foodName}</span>
                                          <span className="font-bold text-stone-800">{formatWeightShort(item.grams * diet.birdCount)}</span>
                                        </div>
                                      ))}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        )}

        {/* ===== TAB: GUIA DE PREPARO ===== */}
        {activeTab === "prep" && (
          <div>
            {prepGuide.speciesPreps.length === 0 ? (
              <div className="text-center py-12 text-stone-400">
                <ChefHat className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="text-base font-medium">Nenhuma dieta programada para este dia.</p>
                <p className="text-sm mt-1">Programe dietas no calendário para gerar o guia de preparo.</p>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <ChefHat className="w-5 h-5 text-amber-600" />
                    <span className="text-base font-bold text-stone-800">
                      {DAY_NAMES[prepGuide.date.getDay()]}, {formatDateBR(prepGuide.date)}
                    </span>
                    <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-amber-100 text-amber-700">
                      {prepGuide.speciesPreps.length} {prepGuide.speciesPreps.length === 1 ? "espécie" : "espécies"}
                    </span>
                  </div>
                  <button
                    onClick={exportPrepGuidePdf}
                    className="flex items-center gap-1.5 px-3 py-2 text-sm font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    Exportar PDF
                  </button>
                </div>

                {/* Consolidated ingredients */}
                <div className="mb-5 bg-amber-50 rounded-xl border border-amber-200 p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Package className="w-5 h-5 text-amber-700" />
                    <span className="text-base font-bold text-amber-800">Ingredientes Totais do Dia</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {Object.entries(prepGuide.consolidated)
                      .sort((a, b) => b[1].totalGrams - a[1].totalGrams)
                      .map(([name, data], i) => {
                        const config = CATEGORY_CONFIG[data.category];
                        const Icon = config.icon;
                        return (
                          <div key={i} className="flex items-center gap-2 bg-white rounded-lg px-3 py-2.5 border border-amber-100 shadow-sm">
                            <Icon className={cn("w-4 h-4 flex-shrink-0", config.color)} />
                            <span className="text-sm font-medium text-stone-700">{name}</span>
                            <span className="text-sm font-bold text-stone-900 ml-auto">{formatWeightShort(data.totalGrams)}</span>
                          </div>
                        );
                      })}
                  </div>
                </div>

                {/* Step-by-step prep per category */}
                <div className="space-y-4">
                  {prepGuide.steps.map((step, si) => {
                    const config = CATEGORY_CONFIG[step.category];
                    const Icon = config.icon;
                    const stepLabels: Record<FoodCategory, string> = {
                      racao: "Separar Ração",
                      vegetais: "Lavar e Picar Vegetais",
                      frutas: "Lavar e Picar Frutas",
                      proteicos: "Preparar Proteicos",
                    };

                    return (
                      <div key={si} className={cn("rounded-xl border p-4", config.bg, config.border)}>
                        <div className="flex items-center gap-2 mb-3">
                          <div className={cn("w-7 h-7 rounded-full flex items-center justify-center text-white text-sm font-bold", step.category === "racao" ? "bg-amber-500" : step.category === "vegetais" ? "bg-emerald-500" : step.category === "frutas" ? "bg-red-400" : "bg-purple-500")}>
                            {si + 1}
                          </div>
                          <Icon className={cn("w-5 h-5", config.color)} />
                          <span className={cn("text-base font-bold", config.color)}>{stepLabels[step.category]}</span>
                        </div>

                        <div className="space-y-2">
                          {step.items.map((item, ii) => (
                            <div key={ii} className="flex items-center justify-between bg-white rounded-lg px-4 py-3 border border-white/80 shadow-sm">
                              <div>
                                <span className="text-base font-medium text-stone-800">{item.foodName}</span>
                                <span className="text-sm text-stone-500 ml-2">para {item.speciesName}</span>
                              </div>
                              <div className="text-right">
                                <span className="text-base font-bold text-stone-900">{formatWeightShort(item.totalGrams)}</span>
                                <div className="text-xs text-stone-500">
                                  {formatWeightShort(item.gramsPerBird)} por ave x {item.birdCount}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        )}
      </div>
      </>
      )}
    </div>
  );
}
