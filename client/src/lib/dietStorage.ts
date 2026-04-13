/**
 * Diet Storage — Tipos e funções utilitárias para dietas
 *
 * A persistência agora é feita via tRPC (banco de dados no servidor).
 * Este arquivo mantém os tipos e funções de exportação de texto.
 *
 * O calendário de atribuição de dietas a dias é separado da dieta.
 * A dieta é apenas a "receita". A atribuição de dias é feita no
 * speciesCalendar, que mapeia espécie → { "ano-mês-dia" → dietId }.
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
  notes: string;
  color: string;
  mer: number;
  totalGrams: number;
  totalKcal: number;
  items: {
    racao: SavedDietItem[];
    vegetais: SavedDietItem[];
    frutas: SavedDietItem[];
    proteicos: SavedDietItem[];
  };
  createdAt: string;
  updatedAt: string;
}

/**
 * SpeciesCalendar — Mapa de atribuição de dietas a dias por espécie
 * Estrutura: { speciesId: { "ano-mês-dia": dietId } }
 */
export type SpeciesCalendarMap = Record<string, Record<string, string>>;

/**
 * Gerar ID único para novas dietas
 */
export function generateDietId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 8);
}

// ===== EXPORT TEXTO =====

const MONTH_NAMES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

/**
 * Parseia uma dayKey no formato "ano-mês-dia" (ex: "2026-1-5")
 * Retorna { year, month, day }
 */
function parseDayKey(key: string): { year: number; month: number; day: number } {
  const parts = key.split("-").map(Number);
  if (parts.length === 3) {
    return { year: parts[0], month: parts[1], day: parts[2] };
  }
  // Fallback para formato legado "mês-dia"
  return { year: new Date().getFullYear(), month: parts[0], day: parts[1] };
}

export function exportDietAsText(diet: SavedDiet, calendarForSpecies?: Record<string, string>): string {
  const lines: string[] = [];
  lines.push("═══════════════════════════════════════════════════");
  lines.push(`  DIETA: ${diet.name}`);
  lines.push("═══════════════════════════════════════════════════");
  lines.push("");
  lines.push(`Espécie: ${diet.speciesName}`);
  lines.push(`Peso: ${diet.weight}g`);
  lines.push(`Quantidade de aves: ${diet.birdCount}`);
  lines.push(`MER: ${diet.mer.toFixed(1)} kcal/dia por ave`);

  if (diet.notes) {
    lines.push(`Observações: ${diet.notes}`);
  }

  // Dias atribuídos no calendário
  if (calendarForSpecies) {
    const assignedDays = Object.entries(calendarForSpecies)
      .filter(([, id]) => id === diet.id)
      .map(([key]) => key);
    if (assignedDays.length > 0) {
      // Agrupar por ano e mês
      const byYearMonth: Record<number, Record<number, number[]>> = {};
      assignedDays.forEach(key => {
        const { year, month, day } = parseDayKey(key);
        if (!byYearMonth[year]) byYearMonth[year] = {};
        if (!byYearMonth[year][month]) byYearMonth[year][month] = [];
        byYearMonth[year][month].push(day);
      });
      const years = Object.keys(byYearMonth).map(Number).sort((a, b) => a - b);
      const schedParts: string[] = [];
      for (const year of years) {
        const months = Object.keys(byYearMonth[year]).map(Number).sort((a, b) => a - b);
        for (const m of months) {
          const days = byYearMonth[year][m].sort((a, b) => a - b);
          schedParts.push(`${MONTH_NAMES[m - 1]}/${year}: dias ${days.join(", ")}`);
        }
      }
      lines.push(`Período de uso: ${schedParts.join(" | ")}`);
    }
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
