/**
 * Tests for annotationPdf logic
 * Since we can't test actual PDF generation in vitest (no DOM/canvas),
 * we test the calculation logic that feeds into the PDF.
 */
import { describe, it, expect } from "vitest";
import { calculateMER, kcalToGrams, getPetBirdData, lifePeriods, racoes } from "../data/petbird";
import { species } from "../data/feeding";

const RACAO_PCT_OPTIONS = [50, 60, 70, 80, 90, 100];
const AVG_SALADA_KCAL = 450;

describe("annotationPdf calculation logic", () => {
  it("generates correct values for all 6 percentage options for Ringneck", () => {
    const sp = species.find(s => s.id === "psittacula-krameri")!;
    const birdData = getPetBirdData("psittacula-krameri")!;
    const phase = lifePeriods.find(p => p.id === "manutencao")!;
    const racao = racoes.find(r => r.name === "Alcon Calopsita Criador")!;
    const enclosureMultiplier = 1.0;

    const baseMer = calculateMER(birdData.weight, birdData.metabolism, phase.multiplier, "viveiro-voo-interno");
    const mer = baseMer * enclosureMultiplier;

    expect(mer).toBeGreaterThan(0);

    RACAO_PCT_OPTIONS.forEach(pct => {
      const racaoKcal = mer * pct / 100;
      const saladaKcal = mer * (100 - pct) / 100;
      const racaoGrams = kcalToGrams(racaoKcal, racao.energyKcal);
      const saladaGrams = kcalToGrams(saladaKcal, AVG_SALADA_KCAL);

      expect(racaoKcal + saladaKcal).toBeCloseTo(mer, 5);
      expect(racaoGrams).toBeGreaterThanOrEqual(0);
      expect(saladaGrams).toBeGreaterThanOrEqual(0);

      if (pct === 100) {
        expect(saladaGrams).toBe(0);
      }
      if (pct === 50) {
        expect(racaoKcal).toBeCloseTo(saladaKcal, 5);
      }
    });
  });

  it("plantel multiplication is correct", () => {
    const sp = species.find(s => s.id === "psittacula-krameri")!;
    expect(sp.currentCount).toBe(72);

    const perBird = 5.0; // example grams
    const plantel = perBird * sp.currentCount;
    expect(plantel).toBe(360);
  });

  it("higher enclosure multiplier increases all values proportionally", () => {
    const birdData = getPetBirdData("psittacula-krameri")!;
    const phase = lifePeriods.find(p => p.id === "manutencao")!;
    const racao = racoes.find(r => r.name === "Alcon Calopsita Criador")!;

    const baseMer = calculateMER(birdData.weight, birdData.metabolism, phase.multiplier, "viveiro-voo-interno");
    const mer1 = baseMer * 1.0;
    const mer2 = baseMer * 1.15;

    const racaoGrams1 = kcalToGrams(mer1 * 0.7, racao.energyKcal);
    const racaoGrams2 = kcalToGrams(mer2 * 0.7, racao.energyKcal);

    expect(racaoGrams2 / racaoGrams1).toBeCloseTo(1.15, 2);
  });

  it("all species have valid data for PDF generation", () => {
    const activeSpecies = species.filter(s => s.inCurrentFlock);
    expect(activeSpecies.length).toBeGreaterThan(0);

    activeSpecies.forEach(sp => {
      const birdData = getPetBirdData(sp.id);
      // Some species may not have petbird data, that's ok
      if (birdData) {
        expect(birdData.weight).toBeGreaterThan(0);
        expect(birdData.metabolism).toBeTruthy();
      }
    });
  });

  it("racao energy values are valid for calculation", () => {
    racoes.forEach(r => {
      if (r.name === "Ração Mediana") return;
      expect(r.energyKcal).toBeGreaterThan(0);
      const grams = kcalToGrams(10, r.energyKcal);
      expect(grams).toBeGreaterThan(0);
      expect(grams).toBeLessThan(100); // 10 kcal should never need 100g
    });
  });
});
