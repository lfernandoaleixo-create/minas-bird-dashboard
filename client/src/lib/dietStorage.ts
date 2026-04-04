/**
 * Diet Storage — Persistência local de dietas salvas
 * Usa localStorage para manter dietas entre sessões
 *
 * NOVO: O calendário de atribuição de dietas a dias é separado da dieta.
 * A dieta é apenas a "receita". A atribuição de dias é feita no
 * speciesCalendar, que mapeia espécie → { "mês-dia" → dietId }.
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
  /** @deprecated Mantido para compatibilidade, não mais usado na criação */
  schedule?: Record<number, number[]>;
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

/**
 * SpeciesCalendar — Mapa de atribuição de dietas a dias por espécie
 * Estrutura: { speciesId: { "mês-dia": dietId } }
 * Ex: { "ringneck": { "1-5": "abc123", "1-6": "abc123", "3-10": "def456" } }
 */
export type SpeciesCalendarMap = Record<string, Record<string, string>>;

const CALENDAR_STORAGE_KEY = "minas-bird-species-calendar";

// ===== DIETAS CRUD =====

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 8);
}

export function getSavedDiets(): SavedDiet[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return [];
    return JSON.parse(data) as SavedDiet[];
  } catch {
    return [];
  }
}

export function saveDiet(diet: Omit<SavedDiet, "id" | "createdAt" | "updatedAt">): SavedDiet {
  const diets = getSavedDiets();
  const now = new Date().toISOString();
  const newDiet: SavedDiet = {
    ...diet,
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
  // Também remover do calendário
  removeCalendarEntriesForDiet(id);
  return true;
}

export function getDietsBySpecies(speciesId: string): SavedDiet[] {
  return getSavedDiets().filter(d => d.speciesId === speciesId);
}

// ===== SPECIES CALENDAR CRUD =====

export function getSpeciesCalendar(): SpeciesCalendarMap {
  try {
    const data = localStorage.getItem(CALENDAR_STORAGE_KEY);
    if (!data) return {};
    return JSON.parse(data) as SpeciesCalendarMap;
  } catch {
    return {};
  }
}

export function getCalendarForSpecies(speciesId: string): Record<string, string> {
  const all = getSpeciesCalendar();
  return all[speciesId] || {};
}

/**
 * Atribuir uma dieta a um dia específico para uma espécie
 * dayKey no formato "mês-dia", ex: "1-5" para 5 de janeiro
 */
export function assignDietToDay(speciesId: string, dayKey: string, dietId: string): void {
  const all = getSpeciesCalendar();
  if (!all[speciesId]) all[speciesId] = {};
  all[speciesId][dayKey] = dietId;
  localStorage.setItem(CALENDAR_STORAGE_KEY, JSON.stringify(all));
}

/**
 * Remover a atribuição de dieta de um dia
 */
export function removeDietFromDay(speciesId: string, dayKey: string): void {
  const all = getSpeciesCalendar();
  if (!all[speciesId]) return;
  delete all[speciesId][dayKey];
  if (Object.keys(all[speciesId]).length === 0) delete all[speciesId];
  localStorage.setItem(CALENDAR_STORAGE_KEY, JSON.stringify(all));
}

/**
 * Atribuir uma dieta a múltiplos dias de uma vez
 */
export function assignDietToDays(speciesId: string, dayKeys: string[], dietId: string): void {
  const all = getSpeciesCalendar();
  if (!all[speciesId]) all[speciesId] = {};
  dayKeys.forEach(key => { all[speciesId][key] = dietId; });
  localStorage.setItem(CALENDAR_STORAGE_KEY, JSON.stringify(all));
}

/**
 * Remover todas as entradas de calendário de uma dieta deletada
 */
function removeCalendarEntriesForDiet(dietId: string): void {
  const all = getSpeciesCalendar();
  let changed = false;
  for (const speciesId of Object.keys(all)) {
    for (const dayKey of Object.keys(all[speciesId])) {
      if (all[speciesId][dayKey] === dietId) {
        delete all[speciesId][dayKey];
        changed = true;
      }
    }
    if (Object.keys(all[speciesId]).length === 0) delete all[speciesId];
  }
  if (changed) localStorage.setItem(CALENDAR_STORAGE_KEY, JSON.stringify(all));
}

/**
 * Salvar o calendário inteiro de uma espécie
 */
export function saveCalendarForSpecies(speciesId: string, calendar: Record<string, string>): void {
  const all = getSpeciesCalendar();
  all[speciesId] = calendar;
  localStorage.setItem(CALENDAR_STORAGE_KEY, JSON.stringify(all));
}

// ===== BACKUP / RESTORE =====

export interface DietBackup {
  version: number;
  exportedAt: string;
  diets: SavedDiet[];
  calendar: SpeciesCalendarMap;
}

/**
 * Exportar todos os dados (dietas + calendário) como JSON para backup
 */
export function exportAllData(): DietBackup {
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    diets: getSavedDiets(),
    calendar: getSpeciesCalendar(),
  };
}

/**
 * Importar dados de um backup JSON
 * mode: 'replace' substitui tudo, 'merge' adiciona sem duplicar
 */
export function importAllData(backup: DietBackup, mode: 'replace' | 'merge' = 'replace'): { dietsImported: number; calendarEntries: number } {
  if (!backup || !backup.diets || !backup.calendar) {
    throw new Error('Arquivo de backup inválido');
  }

  let dietsImported = 0;
  let calendarEntries = 0;

  if (mode === 'replace') {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(backup.diets));
    localStorage.setItem(CALENDAR_STORAGE_KEY, JSON.stringify(backup.calendar));
    dietsImported = backup.diets.length;
    calendarEntries = Object.values(backup.calendar).reduce((sum, cal) => sum + Object.keys(cal).length, 0);
  } else {
    // Merge: add diets that don't exist by id
    const existing = getSavedDiets();
    const existingIds = new Set(existing.map(d => d.id));
    const newDiets = backup.diets.filter(d => !existingIds.has(d.id));
    const merged = [...existing, ...newDiets];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
    dietsImported = newDiets.length;

    // Merge calendar
    const existingCal = getSpeciesCalendar();
    for (const [speciesId, days] of Object.entries(backup.calendar)) {
      if (!existingCal[speciesId]) existingCal[speciesId] = {};
      for (const [dayKey, dietId] of Object.entries(days)) {
        if (!existingCal[speciesId][dayKey]) {
          existingCal[speciesId][dayKey] = dietId;
          calendarEntries++;
        }
      }
    }
    localStorage.setItem(CALENDAR_STORAGE_KEY, JSON.stringify(existingCal));
  }

  return { dietsImported, calendarEntries };
}

// ===== EXPORT =====

const MONTH_NAMES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

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

  // Dias atribuídos no calendário
  const calendar = getCalendarForSpecies(diet.speciesId);
  const assignedDays = Object.entries(calendar)
    .filter(([, id]) => id === diet.id)
    .map(([key]) => key);
  if (assignedDays.length > 0) {
    // Agrupar por mês
    const byMonth: Record<number, number[]> = {};
    assignedDays.forEach(key => {
      const [m, d] = key.split("-").map(Number);
      if (!byMonth[m]) byMonth[m] = [];
      byMonth[m].push(d);
    });
    const schedule = Object.entries(byMonth)
      .sort(([a], [b]) => Number(a) - Number(b))
      .map(([m, days]) => `${MONTH_NAMES[Number(m) - 1]}: dias ${days.sort((a, b) => a - b).join(", ")}`)
      .join(" | ");
    lines.push(`Período de uso: ${schedule}`);
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
