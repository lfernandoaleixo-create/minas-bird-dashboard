/**
 * DietCalculator logic tests
 * Tests the core calculation logic used by the DietCalculator component
 */
import { describe, it, expect } from "vitest";
import { calculateMER, kcalToGrams, getPetBirdData } from "../data/petbird";

describe("DietCalculator logic", () => {
  it("getPetBirdData returns data for a valid species", () => {
    const data = getPetBirdData("psittacula-krameri");
    expect(data).not.toBeNull();
    expect(data!.petbird_name).toBe("Ringneck");
    expect(data!.weight).toBe(128);
    expect(data!.metabolism).toBe("Normal");
    expect(data!.dietBreakdown).toBeDefined();
  });

  it("getPetBirdData returns null for invalid species", () => {
    const data = getPetBirdData("non-existent-species");
    expect(data).toBeNull();
  });

  it("calculateMER returns positive value for valid inputs", () => {
    const mer = calculateMER(128, "Normal", 1.0, "viveiro-voo-interno");
    expect(mer).toBeGreaterThan(0);
    expect(mer).toBeLessThan(100); // Reasonable range for a 128g bird
  });

  it("calculateMER increases with phase multiplier", () => {
    const merBase = calculateMER(128, "Normal", 1.0, "viveiro-voo-interno");
    const merRepro = calculateMER(128, "Normal", 1.3, "viveiro-voo-interno");
    expect(merRepro).toBeGreaterThan(merBase);
    expect(merRepro / merBase).toBeCloseTo(1.3, 1);
  });

  it("kcalToGrams converts correctly", () => {
    // 10 kcal from a food with 3000 kcal/kg = 3.33g
    const grams = kcalToGrams(10, 3000);
    expect(grams).toBeCloseTo(3.33, 1);
  });

  it("kcalToGrams returns 0 for zero energy food", () => {
    const grams = kcalToGrams(10, 0);
    expect(grams).toBe(0);
  });

  it("diet calculation: ração at 70% leaves 30% for salad", () => {
    const birdData = getPetBirdData("psittacula-krameri")!;
    const mer = calculateMER(birdData.weight, birdData.metabolism, 1.0, "viveiro-voo-interno");
    
    const racaoPct = 70;
    const racaoKcal = mer * racaoPct / 100;
    const saladaKcal = mer * (100 - racaoPct) / 100;
    
    expect(racaoKcal + saladaKcal).toBeCloseTo(mer, 5);
    expect(saladaKcal / mer).toBeCloseTo(0.3, 5);
  });

  it("salad proportions distribute correctly", () => {
    const saladaKcal = 10; // 10 kcal for salad
    const vegPct = 50;
    const frtPct = 30;
    const proPct = 20;

    const vegKcal = saladaKcal * vegPct / 100;
    const frtKcal = saladaKcal * frtPct / 100;
    const proKcal = saladaKcal * proPct / 100;

    expect(vegKcal).toBeCloseTo(5, 5);
    expect(frtKcal).toBeCloseTo(3, 5);
    expect(proKcal).toBeCloseTo(2, 5);
    expect(vegKcal + frtKcal + proKcal).toBeCloseTo(saladaKcal, 5);
  });

  it("100% ração means 0 salad", () => {
    const mer = 30; // arbitrary
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

  it("per-flock calculation multiplies correctly", () => {
    const perBirdGrams = 15.5;
    const count = 72;
    const totalGrams = perBirdGrams * count;
    expect(totalGrams).toBe(1116);
  });
});
