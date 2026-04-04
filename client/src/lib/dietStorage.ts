/**
 * Diet Storage — Persistência local de dietas salvas
 * Usa localStorage para manter dietas entre sessões
 */

export interface SavedDietItem {
  foodId: string;
  foodName: string;
  grams: number;
  kcal: number;
  energyKcalPerKg: number;
}

/**
 * schedule: mapa de mês (1-12) → array de dias (1-31)
 * Ex: { 1: [1,5,10], 3: [1,2,...,31] }
 * Se um mês não está no mapa, não tem dias programados
 */
export interface SavedDiet {
  id: string;
  name: string;
  speciesId: string;
  speciesName: string;
  racaoId: string;
  racaoName: string;
  vegetaisIds: string[];
  frutasIds: string[];
  proteicosIds: string[];
  weight: number;
  phaseId: string;
  enclosureId: string;
  birdCount: number;
  mer: number;
  totalGrams: number;
  totalKcal: number;
  /** @deprecated Use schedule instead */
  selectedDays?: number[];
  /** @deprecated Use schedule instead */
  selectedMonths?: number[];
  /** Mapa mês→dias: { 1: [1,5], 4: [1,...,30] } */
  schedule: Record<number, number[]>;
  items: {
    racao: SavedDietItem[];
    vegetais: SavedDietItem[];
    frutas: SavedDietItem[];
    proteicos: SavedDietItem[];
  };
  createdAt: string;
  updatedAt: string;
}

const STORAGE_KEY = "minas-bird-saved-diets";

const MONTH_NAMES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 8);
}

/**
 * Migra dados antigos (selectedDays + selectedMonths) para o novo formato schedule
 */
function migrateToSchedule(diet: any): Record<number, number[]> {
  if (diet.schedule && Object.keys(diet.schedule).length > 0) {
    // Já tem schedule, converter keys para number
    const result: Record<number, number[]> = {};
    for (const [k, v] of Object.entries(diet.schedule)) {
      const month = Number(k);
      if (month >= 1 && month <= 12 && Array.isArray(v) && (v as number[]).length > 0) {
        result[month] = v as number[];
      }
    }
    return result;
  }
  // Migrar do formato antigo
  const months: number[] = diet.selectedMonths || [];
  const days: number[] = diet.selectedDays || [];
  if (months.length === 0 && days.length === 0) return {};
  const result: Record<number, number[]> = {};
  if (months.length > 0 && days.length > 0) {
    months.forEach(m => { result[m] = [...days]; });
  } else if (months.length > 0) {
    months.forEach(m => { result[m] = []; });
  }
  return result;
}

export function getSavedDiets(): SavedDiet[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return [];
    const diets = JSON.parse(data) as any[];
    return diets.map(d => ({
      ...d,
      schedule: migrateToSchedule(d),
    }));
  } catch {
    return [];
  }
}

export function saveDiet(diet: Omit<SavedDiet, "id" | "createdAt" | "updatedAt">): SavedDiet {
  const diets = getSavedDiets();
  const now = new Date().toISOString();
  const newDiet: SavedDiet = {
    ...diet,
    schedule: diet.schedule || {},
    id: generateId(),
    createdAt: now,
    updatedAt: now,
  };
  diets.push(newDiet);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(diets));
  return newDiet;
}

export function updateDiet(id: string, diet: Partial<SavedDiet>): SavedDiet | null {
  const diets = getSavedDiets();
  const idx = diets.findIndex(d => d.id === id);
  if (idx === -1) return null;
  diets[idx] = { ...diets[idx], ...diet, updatedAt: new Date().toISOString() };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(diets));
  return diets[idx];
}

export function deleteDiet(id: string): boolean {
  const diets = getSavedDiets();
  const filtered = diets.filter(d => d.id !== id);
  if (filtered.length === diets.length) return false;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  return true;
}

export function getDietsBySpecies(speciesId: string): SavedDiet[] {
  return getSavedDiets().filter(d => d.speciesId === speciesId);
}

function formatSchedule(schedule: Record<number, number[]>): string {
  const entries = Object.entries(schedule)
    .map(([m, days]) => ({ month: Number(m), days }))
    .filter(e => e.days.length > 0)
    .sort((a, b) => a.month - b.month);
  if (entries.length === 0) return "Nenhum período selecionado";
  return entries.map(e => {
    const monthName = MONTH_NAMES[e.month - 1];
    const daysInMonth = new Date(2026, e.month, 0).getDate();
    const daysStr = e.days.length === daysInMonth ? "todos os dias" : `dias ${e.days.sort((a, b) => a - b).join(", ")}`;
    return `${monthName}: ${daysStr}`;
  }).join(" | ");
}

export function exportDietAsText(diet: SavedDiet): string {
  const lines: string[] = [];
  lines.push("═══════════════════════════════════════════════════");
  lines.push(`  DIETA: ${diet.name}`);
  lines.push("═══════════════════════════════════════════════════");
  lines.push("");
  lines.push(`Espécie: ${diet.speciesName}`);
  lines.push(`Peso: ${diet.weight}g`);
  lines.push(`Quantidade de aves: ${diet.birdCount}`);
  lines.push(`MER: ${diet.mer.toFixed(1)} kcal/dia por ave`);

  // Período de uso
  const schedule = diet.schedule || {};
  if (Object.keys(schedule).length > 0) {
    lines.push(`Período de uso: ${formatSchedule(schedule)}`);
  }

  lines.push("");
  lines.push("───────────────────────────────────────────────────");
  lines.push("  POR AVE (diário)");
  lines.push("───────────────────────────────────────────────────");
  lines.push("");

  if (diet.items.racao.length > 0) {
    lines.push("RAÇÃO:");
    diet.items.racao.forEach(item => {
      lines.push(`  • ${item.foodName}: ${item.grams.toFixed(1)}g (${item.kcal.toFixed(1)} kcal)`);
    });
    lines.push("");
  }

  if (diet.items.vegetais.length > 0) {
    lines.push("VEGETAIS:");
    diet.items.vegetais.forEach(item => {
      lines.push(`  • ${item.foodName}: ${item.grams.toFixed(1)}g (${item.kcal.toFixed(1)} kcal)`);
    });
    lines.push("");
  }

  if (diet.items.frutas.length > 0) {
    lines.push("FRUTAS:");
    diet.items.frutas.forEach(item => {
      lines.push(`  • ${item.foodName}: ${item.grams.toFixed(1)}g (${item.kcal.toFixed(1)} kcal)`);
    });
    lines.push("");
  }

  if (diet.items.proteicos.length > 0) {
    lines.push("PROTEICOS:");
    diet.items.proteicos.forEach(item => {
      lines.push(`  • ${item.foodName}: ${item.grams.toFixed(1)}g (${item.kcal.toFixed(1)} kcal)`);
    });
    lines.push("");
  }

  lines.push(`TOTAL POR AVE: ${diet.totalGrams.toFixed(1)}g / ${diet.totalKcal.toFixed(1)} kcal`);

  if (diet.birdCount > 1) {
    lines.push("");
    lines.push("───────────────────────────────────────────────────");
    lines.push(`  TOTAL PARA ${diet.birdCount} AVES (diário)`);
    lines.push("───────────────────────────────────────────────────");
    lines.push("");

    if (diet.items.racao.length > 0) {
      lines.push("RAÇÃO:");
      diet.items.racao.forEach(item => {
        lines.push(`  • ${item.foodName}: ${(item.grams * diet.birdCount).toFixed(1)}g`);
      });
      lines.push("");
    }

    if (diet.items.vegetais.length > 0) {
      lines.push("VEGETAIS:");
      diet.items.vegetais.forEach(item => {
        lines.push(`  • ${item.foodName}: ${(item.grams * diet.birdCount).toFixed(1)}g`);
      });
      lines.push("");
    }

    if (diet.items.frutas.length > 0) {
      lines.push("FRUTAS:");
      diet.items.frutas.forEach(item => {
        lines.push(`  • ${item.foodName}: ${(item.grams * diet.birdCount).toFixed(1)}g`);
      });
      lines.push("");
    }

    if (diet.items.proteicos.length > 0) {
      lines.push("PROTEICOS:");
      diet.items.proteicos.forEach(item => {
        lines.push(`  • ${item.foodName}: ${(item.grams * diet.birdCount).toFixed(1)}g`);
      });
      lines.push("");
    }

    lines.push(`TOTAL PARA ${diet.birdCount} AVES: ${(diet.totalGrams * diet.birdCount).toFixed(1)}g / ${(diet.totalKcal * diet.birdCount).toFixed(1)} kcal`);
  }

  lines.push("");
  lines.push("───────────────────────────────────────────────────");
  lines.push(`Criatório Minas Bird — ${new Date().toLocaleDateString("pt-BR")}`);
  lines.push("═══════════════════════════════════════════════════");

  return lines.join("\n");
}
