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
  FileText, ChevronDown, ChevronRight, Wrench, Sun, CloudSun,
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
    if (!dailyRoutine || dailyRoutine.length === 0) return;

    // Build a map of all days in the period (including days without diets)
    const allDays = getDaysInRange(fromInputDate(startDate), fromInputDate(endDate));
    const routineMap = new Map<string, typeof dailyRoutine[0]>();
    for (const r of dailyRoutine) {
      routineMap.set(getDayKey(r.date), r);
    }

    // Group days into weeks (Mon-Sun)
    const weeks: Date[][] = [];
    let currentWeek: Date[] = [];
    for (const day of allDays) {
      const dow = day.getDay(); // 0=Sun
      if (dow === 1 && currentWeek.length > 0) {
        weeks.push(currentWeek);
        currentWeek = [];
      }
      currentWeek.push(day);
    }
    if (currentWeek.length > 0) weeks.push(currentWeek);

    const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const totalPages = weeks.length;

    for (let wi = 0; wi < weeks.length; wi++) {
      if (wi > 0) doc.addPage();
      const week = weeks[wi];
      const weekStart = formatDateBR(week[0]);
      const weekEnd = formatDateBR(week[week.length - 1]);

      // === HEADER ===
      doc.setFillColor(...BRAND.dark);
      doc.rect(0, 0, pageW, 2.5, "F");
      doc.setFillColor(...BRAND.bg);
      doc.rect(0, 2.5, pageW, 16, "F");
      doc.setDrawColor(...BRAND.primary);
      doc.setLineWidth(0.3);
      doc.line(0, 18.5, pageW, 18.5);
      // Logo
      doc.setFillColor(...BRAND.primary);
      doc.circle(12, 10, 3.5, "F");
      doc.setFillColor(255, 255, 255);
      doc.circle(13.2, 9.2, 1, "F");
      doc.setFillColor(...BRAND.dark);
      doc.circle(13.2, 9.2, 0.4, "F");
      doc.setFillColor(...BRAND.medium);
      doc.triangle(15.5, 10, 17, 9.5, 15.5, 11, "F");
      // Title
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...BRAND.dark);
      doc.text("ROTINA DO TRATADOR", 22, 9);
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...BRAND.muted);
      doc.text("Criatório Minas Bird — Manual Operacional de Alimentação", 22, 14);
      // Week info right
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...BRAND.text);
      doc.text(`Semana: ${weekStart} a ${weekEnd}`, pageW - 10, 9, { align: "right" });
      doc.setFontSize(7.5);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...BRAND.muted);
      doc.text(`Página ${wi + 1} de ${totalPages}`, pageW - 10, 14, { align: "right" });

      // === TABLE LAYOUT ===
      const tableTop = 22;
      const margin = 6;
      const tableW = pageW - margin * 2;
      const colW = tableW / 7;
      const morningColor: [number, number, number] = [255, 251, 235]; // amber-50
      const afternoonColor: [number, number, number] = [236, 253, 245]; // emerald-50
      const footerY = pageH - 8;
      const tableH = footerY - tableTop - 2;
      const dayHeaderH = 10;
      const shiftLabelH = 6;
      const contentAreaH = (tableH - dayHeaderH - shiftLabelH * 2) / 2;

      // Draw 7 columns
      for (let ci = 0; ci < 7; ci++) {
        const x = margin + ci * colW;
        const day = week[ci] || null;
        const dayData = day ? routineMap.get(getDayKey(day)) : null;
        const isWeekend = day ? (day.getDay() === 0 || day.getDay() === 6) : false;

        // Day header
        doc.setFillColor(isWeekend ? 180 : BRAND.dark[0], isWeekend ? 83 : BRAND.dark[1], isWeekend ? 9 : BRAND.dark[2]);
        doc.rect(x, tableTop, colW, dayHeaderH, "F");
        doc.setFontSize(9);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(255, 255, 255);
        if (day) {
          doc.text(DAY_NAMES_SHORT[day.getDay()].toUpperCase(), x + colW / 2, tableTop + 4, { align: "center" });
          doc.setFontSize(7.5);
          doc.setFont("helvetica", "normal");
          doc.text(formatDateBR(day), x + colW / 2, tableTop + 8, { align: "center" });
        } else {
          doc.text("—", x + colW / 2, tableTop + 6, { align: "center" });
        }

        const shiftTop = tableTop + dayHeaderH;

        // MANHÃ section
        doc.setFillColor(255, 247, 237); // orange-50
        doc.rect(x, shiftTop, colW, shiftLabelH, "F");
        doc.setFontSize(7);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(194, 65, 12); // orange-700
        doc.text("MANHA - RACAO", x + colW / 2, shiftTop + 4, { align: "center" });

        // Morning content area
        const morningTop = shiftTop + shiftLabelH;
        doc.setFillColor(...morningColor);
        doc.rect(x, morningTop, colW, contentAreaH, "F");

        // TARDE section
        const afternoonLabelTop = morningTop + contentAreaH;
        doc.setFillColor(220, 252, 231); // green-100
        doc.rect(x, afternoonLabelTop, colW, shiftLabelH, "F");
        doc.setFontSize(7);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(21, 128, 61); // green-700
        doc.text("TARDE - SALADA", x + colW / 2, afternoonLabelTop + 4, { align: "center" });

        // Afternoon content area
        const afternoonTop = afternoonLabelTop + shiftLabelH;
        doc.setFillColor(...afternoonColor);
        doc.rect(x, afternoonTop, colW, contentAreaH, "F");

        // Fill content for this day
        if (dayData) {
          let my = morningTop + 3;
          let ay = afternoonTop + 3;

          for (const { species: sp, diet } of dayData.speciesRoutines) {
            // Morning: ração items
            if (diet.items.racao.length > 0 && my < morningTop + contentAreaH - 2) {
              doc.setFontSize(6.5);
              doc.setFont("helvetica", "bold");
              doc.setTextColor(...BRAND.dark);
              const spLabel = sp.commonName.length > 12 ? sp.commonName.substring(0, 11) + "." : sp.commonName;
              doc.text(spLabel, x + 2, my);
              my += 3;
              for (const item of diet.items.racao) {
                if (my >= morningTop + contentAreaH - 1) break;
                doc.setFontSize(5.5);
                doc.setFont("helvetica", "normal");
                doc.setTextColor(...BRAND.text);
                const nameShort = item.foodName.length > 14 ? item.foodName.substring(0, 13) + "." : item.foodName;
                doc.text(`${nameShort}`, x + 2, my);
                doc.setFont("helvetica", "bold");
                doc.text(formatWeightShort(item.grams * diet.birdCount), x + colW - 2, my, { align: "right" });
                my += 2.8;
              }
              my += 1;
            }

            // Afternoon: vegetais + frutas + proteicos
            const saladItems = [...diet.items.vegetais, ...diet.items.frutas, ...diet.items.proteicos];
            if (saladItems.length > 0 && ay < afternoonTop + contentAreaH - 2) {
              doc.setFontSize(6.5);
              doc.setFont("helvetica", "bold");
              doc.setTextColor(...BRAND.dark);
              const spLabel = sp.commonName.length > 12 ? sp.commonName.substring(0, 11) + "." : sp.commonName;
              doc.text(spLabel, x + 2, ay);
              ay += 3;
              for (const item of saladItems) {
                if (ay >= afternoonTop + contentAreaH - 1) break;
                doc.setFontSize(5.5);
                doc.setFont("helvetica", "normal");
                doc.setTextColor(...BRAND.text);
                const nameShort = item.foodName.length > 14 ? item.foodName.substring(0, 13) + "." : item.foodName;
                doc.text(`${nameShort}`, x + 2, ay);
                doc.setFont("helvetica", "bold");
                doc.text(formatWeightShort(item.grams * diet.birdCount), x + colW - 2, ay, { align: "right" });
                ay += 2.8;
              }
              ay += 1;
            }
          }
        } else if (!day) {
          // Empty column for missing days
          doc.setFillColor(245, 245, 244);
          doc.rect(x, morningTop, colW, contentAreaH, "F");
          doc.rect(x, afternoonTop, colW, contentAreaH, "F");
        } else {
          // Day exists but no diet
          doc.setFontSize(6);
          doc.setFont("helvetica", "italic");
          doc.setTextColor(...BRAND.muted);
          doc.text("Sem dieta", x + colW / 2, morningTop + contentAreaH / 2, { align: "center" });
          doc.text("programada", x + colW / 2, morningTop + contentAreaH / 2 + 3, { align: "center" });
        }

        // Column borders
        doc.setDrawColor(200, 200, 200);
        doc.setLineWidth(0.15);
        doc.rect(x, tableTop, colW, tableH);
      }

      // Outer border
      doc.setDrawColor(...BRAND.dark);
      doc.setLineWidth(0.4);
      doc.rect(margin, tableTop, tableW, tableH);

      // Footer
      const fy = pageH - 4;
      doc.setDrawColor(200, 200, 200);
      doc.setLineWidth(0.2);
      doc.line(margin, fy - 2, pageW - margin, fy - 2);
      const now = new Date();
      const ds = `${now.getDate().toString().padStart(2, "0")}/${(now.getMonth() + 1).toString().padStart(2, "0")}/${now.getFullYear()}`;
      doc.setFontSize(7);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...BRAND.muted);
      doc.text(`Publicado em ${ds}`, margin, fy);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...BRAND.medium);
      doc.text("Criatório Minas Bird", pageW / 2, fy, { align: "center" });
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...BRAND.muted);
      doc.text(`Manhã = Ração · Tarde = Salada`, pageW - margin, fy, { align: "right" });
    }

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
            ) : (() => {
              // Build weekly groups for UI
              const allDaysUI = getDaysInRange(fromInputDate(startDate), fromInputDate(endDate));
              const routineMapUI = new Map<string, typeof dailyRoutine[0]>();
              for (const r of dailyRoutine) routineMapUI.set(getDayKey(r.date), r);
              const weeksUI: Date[][] = [];
              let cwUI: Date[] = [];
              for (const d of allDaysUI) {
                if (d.getDay() === 1 && cwUI.length > 0) { weeksUI.push(cwUI); cwUI = []; }
                cwUI.push(d);
              }
              if (cwUI.length > 0) weeksUI.push(cwUI);

              return (
                <>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <ClipboardList className="w-5 h-5 text-emerald-600" />
                      <span className="text-base font-bold text-stone-800">
                        {dailyRoutine.length} dias com atividades
                      </span>
                      <span className="text-xs text-stone-400 font-medium">
                        Manhã = Ração · Tarde = Salada
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

                  <div className="space-y-6">
                    {weeksUI.map((week, wi) => (
                      <div key={wi} className="rounded-xl border border-stone-200 overflow-hidden">
                        {/* Week header */}
                        <div className="bg-emerald-800 px-4 py-2.5 flex items-center justify-between">
                          <span className="text-sm font-bold text-white">
                            Semana: {formatDateBR(week[0])} a {formatDateBR(week[week.length - 1])}
                          </span>
                          <span className="text-xs text-emerald-200 font-medium">
                            {week.length} dias
                          </span>
                        </div>

                        {/* Days grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 divide-x divide-stone-100">
                          {week.map((day, di) => {
                            const dayData = routineMapUI.get(getDayKey(day));
                            const isWeekend = day.getDay() === 0 || day.getDay() === 6;

                            return (
                              <div key={di} className={cn("min-h-[120px] flex flex-col", isWeekend ? "bg-amber-50/40" : "bg-white")}>
                                {/* Day header */}
                                <div className={cn("px-2 py-1.5 text-center border-b", isWeekend ? "bg-amber-100 border-amber-200" : "bg-stone-100 border-stone-200")}>
                                  <div className={cn("text-xs font-bold", isWeekend ? "text-amber-700" : "text-stone-700")}>
                                    {DAY_NAMES_SHORT[day.getDay()]}
                                  </div>
                                  <div className="text-[10px] text-stone-500">{formatDateBR(day)}</div>
                                </div>

                                {dayData ? (
                                  <div className="flex-1 flex flex-col">
                                    {/* MANHÃ */}
                                    <div className="flex-1 border-b border-dashed border-stone-200 p-1.5">
                                      <div className="flex items-center gap-1 mb-1">
                                        <Sun className="w-3 h-3 text-orange-500" />
                                        <span className="text-[9px] font-bold text-orange-600 uppercase">Ração</span>
                                      </div>
                                      {dayData.speciesRoutines.map(({ species: sp, diet }, si) => (
                                        diet.items.racao.length > 0 && (
                                          <div key={si} className="mb-0.5">
                                            <div className="text-[9px] font-bold text-stone-700">{sp.commonName}</div>
                                            {diet.items.racao.map((item, ii) => (
                                              <div key={ii} className="text-[8px] text-stone-600 flex justify-between">
                                                <span>{item.foodName}</span>
                                                <span className="font-semibold">{formatWeightShort(item.grams * diet.birdCount)}</span>
                                              </div>
                                            ))}
                                          </div>
                                        )
                                      ))}
                                    </div>
                                    {/* TARDE */}
                                    <div className="flex-1 p-1.5">
                                      <div className="flex items-center gap-1 mb-1">
                                        <CloudSun className="w-3 h-3 text-emerald-500" />
                                        <span className="text-[9px] font-bold text-emerald-600 uppercase">Salada</span>
                                      </div>
                                      {dayData.speciesRoutines.map(({ species: sp, diet }, si) => {
                                        const saladItems = [...diet.items.vegetais, ...diet.items.frutas, ...diet.items.proteicos];
                                        return saladItems.length > 0 && (
                                          <div key={si} className="mb-0.5">
                                            <div className="text-[9px] font-bold text-stone-700">{sp.commonName}</div>
                                            {saladItems.map((item, ii) => (
                                              <div key={ii} className="text-[8px] text-stone-600 flex justify-between">
                                                <span>{item.foodName}</span>
                                                <span className="font-semibold">{formatWeightShort(item.grams * diet.birdCount)}</span>
                                              </div>
                                            ))}
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                ) : (
                                  <div className="flex-1 flex items-center justify-center">
                                    <span className="text-[10px] text-stone-300 italic">Sem dieta</span>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              );
            })()}
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
