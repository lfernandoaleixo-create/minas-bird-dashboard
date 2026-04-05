/**
 * Comprehensive test suite for nutritional calculations.
 *
 * All reference values were extracted directly from the DietBirdPet API
 * (nutriaves-backend-production) by creating diets with known parameters
 * and capturing the API responses.
 *
 * Test methodology:
 * - Single food: High Protein Psittacus (3050 kcal/kg)
 * - Diet type: Dieta Básica (100% ração, 0% waste)
 * - K factor = (grams_result * 3.05) / (weight_kg ^ 0.75)
 *
 * Reference species:
 * - Ringneck (128g, Normal metabolism)
 * - Calopsita (90g, Aumentado metabolism)
 */
import { describe, it, expect } from "vitest";
import { calculateMER, getKFactor, kcalToGrams } from "./petbird";

// ============================================================
// 1. K Factor Lookup Tests
// ============================================================
describe("getKFactor", () => {
  describe("Normal metabolism", () => {
    const cases: [string, number][] = [
      ["gaiola-interna", 161.05],
      ["gaiola-externa-verao", 189.56],
      ["gaiola-externa-inverno", 212.65],
      ["viveiro-voo-interno", 184.00],
      ["viveiro-voo-externo-verao", 212.51],
      ["viveiro-voo-externo-inverno", 235.59],
      ["vida-livre", 238.87],
    ];

    it.each(cases)("returns correct K for %s", (enclosure, expected) => {
      expect(getKFactor("Normal", enclosure)).toBe(expected);
    });
  });

  describe("Aumentado metabolism", () => {
    const cases: [string, number][] = [
      ["gaiola-interna", 176.52],
      ["gaiola-externa-verao", 204.92],
      ["gaiola-externa-inverno", 227.94],
      ["viveiro-voo-interno", 199.54],
      ["viveiro-voo-externo-verao", 227.75],
      ["viveiro-voo-externo-inverno", 250.95],
      ["vida-livre", 254.11],
    ];

    it.each(cases)("returns correct K for %s", (enclosure, expected) => {
      expect(getKFactor("Aumentado", enclosure)).toBe(expected);
    });
  });

  describe("fallback behavior", () => {
    it("falls back to Normal table for unknown metabolism", () => {
      expect(getKFactor("Unknown", "viveiro-voo-interno")).toBe(184.00);
    });

    it("falls back to default K for unknown enclosure (Normal)", () => {
      expect(getKFactor("Normal", "unknown-enclosure")).toBe(184.00);
    });

    it("falls back to default K for unknown enclosure (Aumentado)", () => {
      expect(getKFactor("Aumentado", "unknown-enclosure")).toBe(199.54);
    });
  });
});

// ============================================================
// 2. MER Calculation Tests — DietBirdPet Reference Values
// ============================================================
describe("calculateMER", () => {
  /**
   * Reference: Ringneck, 128g, Normal, Manutenção
   * DietBirdPet API returned food amounts (High Protein Psittacus, 3050 kcal/kg):
   *   Gaiola Interna:              11.30g → MER = 11.30 * 3.05 = 34.465 kcal
   *   Gaiola Externa Verão:        13.30g → MER = 13.30 * 3.05 = 40.565 kcal
   *   Gaiola Externa Inverno:      14.92g → MER = 14.92 * 3.05 = 45.506 kcal
   *   Viveiro Voo Interno:         12.91g → MER = 12.91 * 3.05 = 39.376 kcal
   *   Viveiro Voo Externo Verão:   14.91g → MER = 14.91 * 3.05 = 45.476 kcal
   *   Viveiro Voo Externo Inverno: 16.53g → MER = 16.53 * 3.05 = 50.417 kcal
   *   Vida Livre:                  16.76g → MER = 16.76 * 3.05 = 51.118 kcal
   */
  describe("Ringneck (128g, Normal, Manutenção)", () => {
    const weight = 128;
    const metabolism = "Normal";
    const phaseMultiplier = 1.0; // Manutenção

    const cases: [string, number, number][] = [
      // [enclosureId, expectedFoodGrams, tolerance]
      ["gaiola-interna", 11.30, 0.05],
      ["gaiola-externa-verao", 13.30, 0.05],
      ["gaiola-externa-inverno", 14.92, 0.05],
      ["viveiro-voo-interno", 12.91, 0.05],
      ["viveiro-voo-externo-verao", 14.91, 0.05],
      ["viveiro-voo-externo-inverno", 16.53, 0.05],
      ["vida-livre", 16.76, 0.05],
    ];

    it.each(cases)(
      "matches DietBirdPet for %s (expected %sg ±%s)",
      (enclosureId, expectedGrams, tolerance) => {
        const mer = calculateMER(weight, metabolism, phaseMultiplier, enclosureId);
        // Convert MER to food grams: grams = (MER / energyPerKg) * 1000
        const foodGrams = kcalToGrams(mer, 3050);
        expect(foodGrams).toBeCloseTo(expectedGrams, 1);
      }
    );
  });

  /**
   * Reference: Calopsita, 90g, Aumentado, Manutenção
   * DietBirdPet API returned food amounts (High Protein Psittacus, 3050 kcal/kg):
   *   Gaiola Interna:              9.51g
   *   Gaiola Externa Verão:        11.04g
   *   Gaiola Externa Inverno:      12.28g
   *   Viveiro Voo Interno:         10.75g
   *   Viveiro Voo Externo Verão:   12.27g
   *   Viveiro Voo Externo Inverno: 13.52g
   *   Vida Livre:                  13.69g
   */
  describe("Calopsita (90g, Aumentado, Manutenção)", () => {
    const weight = 90;
    const metabolism = "Aumentado";
    const phaseMultiplier = 1.0;

    const cases: [string, number][] = [
      ["gaiola-interna", 9.51],
      ["gaiola-externa-verao", 11.04],
      ["gaiola-externa-inverno", 12.28],
      ["viveiro-voo-interno", 10.75],
      ["viveiro-voo-externo-verao", 12.27],
      ["viveiro-voo-externo-inverno", 13.52],
      ["vida-livre", 13.69],
    ];

    it.each(cases)(
      "matches DietBirdPet for %s (expected %sg)",
      (enclosureId, expectedGrams) => {
        const mer = calculateMER(weight, metabolism, phaseMultiplier, enclosureId);
        const foodGrams = kcalToGrams(mer, 3050);
        expect(foodGrams).toBeCloseTo(expectedGrams, 1);
      }
    );
  });

  /**
   * Phase multiplier tests.
   * DietBirdPet does NOT apply phase multipliers to basic diets,
   * but our system applies them for planning purposes.
   * We verify the multiplier is correctly applied on top of the base MER.
   */
  describe("Phase multiplier application", () => {
    it("Manutenção (x1.0) equals base MER", () => {
      const base = calculateMER(128, "Normal", 1.0, "viveiro-voo-interno");
      const maint = calculateMER(128, "Normal", 1.0, "viveiro-voo-interno");
      expect(maint).toBe(base);
    });

    it("Pré-Reprodução (x1.3) is 30% more than base", () => {
      const base = calculateMER(128, "Normal", 1.0, "viveiro-voo-interno");
      const preRepro = calculateMER(128, "Normal", 1.3, "viveiro-voo-interno");
      expect(preRepro / base).toBeCloseTo(1.3, 5);
    });

    it("Alimentação de Filhotes (x1.5) is 50% more than base", () => {
      const base = calculateMER(128, "Normal", 1.0, "viveiro-voo-interno");
      const feeding = calculateMER(128, "Normal", 1.5, "viveiro-voo-interno");
      expect(feeding / base).toBeCloseTo(1.5, 5);
    });

    it("Muda de Penas (x1.25) is 25% more than base", () => {
      const base = calculateMER(128, "Normal", 1.0, "viveiro-voo-interno");
      const molt = calculateMER(128, "Normal", 1.25, "viveiro-voo-interno");
      expect(molt / base).toBeCloseTo(1.25, 5);
    });
  });
});

// ============================================================
// 3. kcalToGrams Tests
// ============================================================
describe("kcalToGrams", () => {
  it("correctly converts kcal to grams for High Protein Psittacus (3050 kcal/kg)", () => {
    // 34.465 kcal → 34.465 / 3050 * 1000 = 11.30g
    const grams = kcalToGrams(34.465, 3050);
    expect(grams).toBeCloseTo(11.30, 1);
  });

  it("returns 0 for zero energy food", () => {
    expect(kcalToGrams(10, 0)).toBe(0);
  });

  it("returns 0 for negative energy food", () => {
    expect(kcalToGrams(10, -100)).toBe(0);
  });

  it("handles large energy values correctly", () => {
    // 100 kcal from food with 4000 kcal/kg = 25g
    expect(kcalToGrams(100, 4000)).toBeCloseTo(25, 5);
  });
});

// ============================================================
// 4. Cross-species validation with different weights
// ============================================================
describe("Cross-species validation", () => {
  /**
   * Verify that the formula MER = K * W^0.75 produces correct results
   * for species with very different body weights.
   */

  it("Grande Alexandre (255g, Normal, viveiro-voo-interno) produces reasonable MER", () => {
    const mer = calculateMER(255, "Normal", 1.0, "viveiro-voo-interno");
    // K=184, W=0.255kg, W^0.75 = 0.255^0.75 ≈ 0.3477
    // MER = 184 * 0.3477 ≈ 63.98 kcal
    const expectedMER = 184.00 * Math.pow(0.255, 0.75);
    expect(mer).toBeCloseTo(expectedMER, 2);
  });

  it("Cacatua Galerita (895g, Aumentado, viveiro-voo-interno) produces reasonable MER", () => {
    const mer = calculateMER(895, "Aumentado", 1.0, "viveiro-voo-interno");
    // K=199.54, W=0.895kg, W^0.75 ≈ 0.9207
    // MER = 199.54 * 0.9207 ≈ 183.61 kcal
    const expectedMER = 199.54 * Math.pow(0.895, 0.75);
    expect(mer).toBeCloseTo(expectedMER, 2);
  });

  it("Forpus (33g, Normal, gaiola-interna) produces reasonable MER", () => {
    const mer = calculateMER(33, "Normal", 1.0, "gaiola-interna");
    // K=161.05, W=0.033kg, W^0.75 ≈ 0.0680
    // MER = 161.05 * 0.0680 ≈ 10.95 kcal
    const expectedMER = 161.05 * Math.pow(0.033, 0.75);
    expect(mer).toBeCloseTo(expectedMER, 2);
  });

  it("MER increases with weight (same species/environment)", () => {
    const mer100 = calculateMER(100, "Normal", 1.0, "viveiro-voo-interno");
    const mer200 = calculateMER(200, "Normal", 1.0, "viveiro-voo-interno");
    const mer400 = calculateMER(400, "Normal", 1.0, "viveiro-voo-interno");
    expect(mer200).toBeGreaterThan(mer100);
    expect(mer400).toBeGreaterThan(mer200);
  });

  it("MER is higher for Aumentado than Normal (same weight/environment)", () => {
    const merNormal = calculateMER(128, "Normal", 1.0, "viveiro-voo-interno");
    const merAumentado = calculateMER(128, "Aumentado", 1.0, "viveiro-voo-interno");
    expect(merAumentado).toBeGreaterThan(merNormal);
  });

  it("MER follows expected ordering across environments", () => {
    const envOrder = [
      "gaiola-interna",
      "viveiro-voo-interno",
      "gaiola-externa-verao",
      "viveiro-voo-externo-verao",
      "gaiola-externa-inverno",
      "viveiro-voo-externo-inverno",
      "vida-livre",
    ];

    const mers = envOrder.map(env => calculateMER(128, "Normal", 1.0, env));

    // Each should be >= the previous (with some tolerance for close values)
    for (let i = 1; i < mers.length; i++) {
      expect(mers[i]).toBeGreaterThanOrEqual(mers[i - 1] * 0.99); // 1% tolerance for close values
    }
  });
});

// ============================================================
// 5. End-to-end diet calculation validation
// ============================================================
describe("End-to-end diet calculation", () => {
  /**
   * Simulate the full diet calculation flow:
   * 1. Get MER for species
   * 2. Split by diet breakdown percentages
   * 3. Convert each category to grams
   * 4. Verify total matches expected
   */
  it("Ringneck full diet (70/15/10/5 split, viveiro-voo-interno)", () => {
    const weight = 128;
    const mer = calculateMER(weight, "Normal", 1.0, "viveiro-voo-interno");

    // Diet breakdown: 70% AP, 15% Vegetais, 10% Frutas, 5% Proteico
    const breakdown = { ap: 70, vegetais: 15, frutas: 10, proteico: 5 };
    const AVG_KCAL = { racao: 3050, vegetais: 280, frutas: 520, proteico: 3200 };

    const apKcal = mer * breakdown.ap / 100;
    const vegKcal = mer * breakdown.vegetais / 100;
    const frtKcal = mer * breakdown.frutas / 100;
    const proKcal = mer * breakdown.proteico / 100;

    const apGrams = kcalToGrams(apKcal, AVG_KCAL.racao);
    const vegGrams = kcalToGrams(vegKcal, AVG_KCAL.vegetais);
    const frtGrams = kcalToGrams(frtKcal, AVG_KCAL.frutas);
    const proGrams = kcalToGrams(proKcal, AVG_KCAL.proteico);

    // Ração should be about 70% of 12.91g reference = ~9.04g
    expect(apGrams).toBeGreaterThan(8);
    expect(apGrams).toBeLessThan(11);

    // Vegetais should be much more grams (low energy density)
    expect(vegGrams).toBeGreaterThan(apGrams);

    // Total kcal should equal MER
    const totalKcal = apKcal + vegKcal + frtKcal + proKcal;
    expect(totalKcal).toBeCloseTo(mer, 5);
  });
});
