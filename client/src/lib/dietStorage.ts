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
  selectedDays: number[]; // dias do mês (1-31) em que a dieta será usada
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

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 8);
}

export function getSavedDiets(): SavedDiet[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return [];
    const diets = JSON.parse(data) as SavedDiet[];
    // Migração: garantir que dietas antigas tenham selectedDays
    return diets.map(d => ({
      ...d,
      selectedDays: d.selectedDays || [],
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
    selectedDays: diet.selectedDays || [],
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

function formatSelectedDays(days: number[]): string {
  if (!days || days.length === 0) return "Nenhum dia selecionado";
  if (days.length === 31) return "Todos os dias do mês";
  const sorted = [...days].sort((a, b) => a - b);
  return sorted.join(", ");
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

  // Dias de uso
  const days = diet.selectedDays || [];
  if (days.length > 0) {
    lines.push(`Dias de uso: ${formatSelectedDays(days)}`);
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
