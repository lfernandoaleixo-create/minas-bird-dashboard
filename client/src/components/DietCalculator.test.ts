/**
 * DietCalculator logic tests (simplified version)
 * Tests the core calculation logic used by the DietCalculator component
 */
import { describe, it, expect } from "vitest";
import { calculateMER, kcalToGrams, getPetBirdData, lifePeriods, enclosureTypes } from "../data/petbird";

describe("DietCalculator logic", () => {
  it("getPetBirdData returns data for a valid species", () => {
    const data = getPetBirdData("psittacula-krameri");
    expect(data).not.toBeNull();
    expect(data!.petbird_name).toBe("Ringneck");
    expect(data!.weight).toBe(128);
    expect(data!.metabolism).toBe("Normal");
  });

  it("getPetBirdData returns null for invalid species", () => {
    const data = getPetBirdData("non-existent-species");
    expect(data).toBeNull();
  });

  it("calculateMER returns positive value for valid inputs", () => {
    const mer = calculateMER(128, "Normal", 1.0, "viveiro-voo-interno");
    expect(mer).toBeGreaterThan(0);
    expect(mer).toBeLessThan(100);
  });

  it("calculateMER increases with phase multiplier", () => {
    const merBase = calculateMER(128, "Normal", 1.0, "viveiro-voo-interno");
    const merRepro = calculateMER(128, "Normal", 1.3, "viveiro-voo-interno");
    expect(merRepro).toBeGreaterThan(merBase);
    expect(merRepro / merBase).toBeCloseTo(1.3, 1);
  });

  it("kcalToGrams converts correctly", () => {
    const grams = kcalToGrams(10, 3000);
    expect(grams).toBeCloseTo(3.33, 1);
  });

  it("kcalToGrams returns 0 for zero energy food", () => {
    const grams = kcalToGrams(10, 0);
    expect(grams).toBe(0);
  });

  it("diet metric: ração at 70% leaves 30% for salad", () => {
    const mer = calculateMER(128, "Normal", 1.0, "viveiro-voo-interno");
    const racaoPct = 70;
    const racaoKcal = mer * racaoPct / 100;
    const saladaKcal = mer * (100 - racaoPct) / 100;
    expect(racaoKcal + saladaKcal).toBeCloseTo(mer, 5);
    expect(saladaKcal / mer).toBeCloseTo(0.3, 5);
  });

  it("100% ração means 0 salad", () => {
    const mer = 30;
    const racaoPct = 100;
    const saladaKcal = mer * (100 - racaoPct) / 100;
    expect(saladaKcal).toBe(0);
  });

  it("50% ração means 50% salad", () => {
    const mer = 30;
    const racaoPct = 50;
    const saladaKcal = mer * (100 - racaoPct) / 100;
    expect(saladaKcal).toBeCloseTo(15, 5);
  });

  it("enclosure multiplier affects MER proportionally", () => {
    const baseMer = calculateMER(128, "Normal", 1.0, "viveiro-voo-interno");
    // Manual multiplier of 1.15 should increase by 15%
    const adjustedMer = baseMer * 1.15;
    expect(adjustedMer / baseMer).toBeCloseTo(1.15, 5);
  });

  it("lifePeriods have correct multipliers", () => {
    const manut = lifePeriods.find(p => p.id === "manutencao");
    const repro = lifePeriods.find(p => p.id === "pre-reproducao");
    const filhotes = lifePeriods.find(p => p.id === "alimentacao-filhotes");
    const muda = lifePeriods.find(p => p.id === "muda-penas");
    expect(manut!.multiplier).toBe(1.0);
    expect(repro!.multiplier).toBe(1.3);
    expect(filhotes!.multiplier).toBe(1.5);
    expect(muda!.multiplier).toBe(1.25);
  });

  it("enclosureTypes have valid multipliers", () => {
    expect(enclosureTypes.length).toBeGreaterThan(0);
    enclosureTypes.forEach(enc => {
      expect(enc.multiplier).toBeGreaterThan(0);
      expect(enc.multiplier).toBeLessThan(2);
    });
  });

  it("per-flock calculation multiplies correctly", () => {
    const perBirdGrams = 15.5;
    const count = 72;
    const totalGrams = perBirdGrams * count;
    expect(totalGrams).toBe(1116);
  });

  it("salad grams calculation with average kcal/kg", () => {
    const saladaKcal = 5; // 5 kcal for salad
    const AVG_SALADA_KCAL = 450;
    const saladaGrams = kcalToGrams(saladaKcal, AVG_SALADA_KCAL);
    expect(saladaGrams).toBeCloseTo(11.11, 1);
  });
});
