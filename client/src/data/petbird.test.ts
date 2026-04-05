/**
 * Comprehensive test suite for nutritional calculations.
 * Validates the additive K model (psittacine.org) against DietBirdPet reference data.
 *
 * Formula: MER (kcal/day) = (K_base + K_env) * W_kg^0.73 / 4.184
 * K_base: Normal=647, Aumentado(High)=711
 * K_env: GI=0, GEV=114, GEI=207, VVI=92, VVEV=206, VVEI=299, VL=391
 *
 * All reference food amounts obtained directly from DietBirdPet API
 * using High Protein Psittacus (3050 kcal/kg) with 100% ração diet.
 */
import { describe, it, expect } from "vitest";
import { calculateMER, getKFactor, kcalToGrams } from "./petbird";

// Tolerance: 0.15% relative error (DietBirdPet rounds to 2 decimal places)
const TOLERANCE_PCT = 0.15;

function expectClose(actual: number, expected: number, label: string) {
  const pct = Math.abs(actual - expected) / expected * 100;
  expect(pct, `${label}: ${actual.toFixed(2)}g vs expected ${expected.toFixed(2)}g (${pct.toFixed(3)}%)`).toBeLessThan(TOLERANCE_PCT);
}

// ============================================================
// 1. K Factor Lookup Tests (additive model)
// ============================================================
describe("getKFactor - additive model", () => {
  it("returns K_base for Normal with Gaiola Interna (no env bonus)", () => {
    expect(getKFactor("Normal", "gaiola-interna")).toBe(647);
  });

  it("returns K_base for Aumentado with Gaiola Interna (no env bonus)", () => {
    expect(getKFactor("Aumentado", "gaiola-interna")).toBe(711);
  });

  it("adds K_env=92 for viveiro-voo-interno", () => {
    expect(getKFactor("Normal", "viveiro-voo-interno")).toBe(647 + 92);
    expect(getKFactor("Aumentado", "viveiro-voo-interno")).toBe(711 + 92);
  });

  it("adds K_env=114 for gaiola-externa-verao", () => {
    expect(getKFactor("Normal", "gaiola-externa-verao")).toBe(647 + 114);
    expect(getKFactor("Aumentado", "gaiola-externa-verao")).toBe(711 + 114);
  });

  it("adds K_env=207 for gaiola-externa-inverno", () => {
    expect(getKFactor("Normal", "gaiola-externa-inverno")).toBe(647 + 207);
    expect(getKFactor("Aumentado", "gaiola-externa-inverno")).toBe(711 + 207);
  });

  it("adds K_env=206 for viveiro-voo-externo-verao", () => {
    expect(getKFactor("Normal", "viveiro-voo-externo-verao")).toBe(647 + 206);
  });

  it("adds K_env=299 for viveiro-voo-externo-inverno", () => {
    expect(getKFactor("Normal", "viveiro-voo-externo-inverno")).toBe(647 + 299);
  });

  it("adds K_env=391 for vida-livre", () => {
    expect(getKFactor("Normal", "vida-livre")).toBe(647 + 391);
  });

  it("falls back to Normal K_base for unknown metabolism", () => {
    expect(getKFactor("Unknown", "gaiola-interna")).toBe(647);
  });

  it("falls back to K_env=0 for unknown enclosure", () => {
    expect(getKFactor("Normal", "unknown-enclosure")).toBe(647);
    expect(getKFactor("Aumentado", "unknown-enclosure")).toBe(711);
  });
});

// ============================================================
// 2. DietBirdPet Cross-Validation (10 validated reference points)
// ============================================================
describe("calculateMER - DietBirdPet cross-validation", () => {

  describe("Ringneck (128g, Normal BMR) - 4 environments", () => {
    it("Gaiola Interna -> 11.30g", () => {
      const mer = calculateMER(128, "Normal", 1.0, "gaiola-interna");
      expectClose(kcalToGrams(mer, 3050), 11.30, "Ringneck GI");
    });

    it("Gaiola Externa Verao -> 13.30g", () => {
      const mer = calculateMER(128, "Normal", 1.0, "gaiola-externa-verao");
      expectClose(kcalToGrams(mer, 3050), 13.30, "Ringneck GEV");
    });

    it("Gaiola Externa Inverno -> 14.92g", () => {
      const mer = calculateMER(128, "Normal", 1.0, "gaiola-externa-inverno");
      expectClose(kcalToGrams(mer, 3050), 14.92, "Ringneck GEI");
    });

    it("Viveiro de Voo Interno -> 12.91g", () => {
      const mer = calculateMER(128, "Normal", 1.0, "viveiro-voo-interno");
      expectClose(kcalToGrams(mer, 3050), 12.91, "Ringneck VVI");
    });
  });

  describe("Calopsita (90g, Aumentado/High BMR) - 2 environments", () => {
    it("Gaiola Interna -> 9.61g", () => {
      const mer = calculateMER(90, "Aumentado", 1.0, "gaiola-interna");
      expectClose(kcalToGrams(mer, 3050), 9.61, "Calopsita GI");
    });

    it("Viveiro de Voo Interno -> 10.86g", () => {
      const mer = calculateMER(90, "Aumentado", 1.0, "viveiro-voo-interno");
      expectClose(kcalToGrams(mer, 3050), 10.86, "Calopsita VVI");
    });
  });

  describe("Forpus (33g, Normal BMR) - smallest Normal species", () => {
    it("Gaiola Interna -> 4.20g", () => {
      const mer = calculateMER(33, "Normal", 1.0, "gaiola-interna");
      expectClose(kcalToGrams(mer, 3050), 4.20, "Forpus GI");
    });
  });

  describe("Cacatua Galerita (895g, Aumentado/High BMR) - largest species", () => {
    it("Gaiola Interna -> 51.42g", () => {
      const mer = calculateMER(895, "Aumentado", 1.0, "gaiola-interna");
      expectClose(kcalToGrams(mer, 3050), 51.42, "Cacatua Galerita GI");
    });
  });

  describe("Papagaio do Congo (400g, Normal BMR) - medium species", () => {
    it("Gaiola Interna -> 25.97g", () => {
      const mer = calculateMER(400, "Normal", 1.0, "gaiola-interna");
      expectClose(kcalToGrams(mer, 3050), 25.97, "Papagaio Congo GI");
    });
  });

  describe("Kakariki (81.5g, Aumentado/High BMR) - small High species", () => {
    it("Gaiola Interna -> 8.94g", () => {
      const mer = calculateMER(81.5, "Aumentado", 1.0, "gaiola-interna");
      expectClose(kcalToGrams(mer, 3050), 8.94, "Kakariki GI");
    });
  });
});

// ============================================================
// 3. Phase Multiplier Tests
// ============================================================
describe("calculateMER - phase multipliers", () => {
  it("Manutencao (1.0x) returns base MER", () => {
    const base = calculateMER(128, "Normal", 1.0, "gaiola-interna");
    const maint = calculateMER(128, "Normal", 1.0, "gaiola-interna");
    expect(maint).toBe(base);
  });

  it("Pre-Reproducao (1.3x) increases MER by 30%", () => {
    const base = calculateMER(128, "Normal", 1.0, "gaiola-interna");
    const preRepro = calculateMER(128, "Normal", 1.3, "gaiola-interna");
    expect(preRepro).toBeCloseTo(base * 1.3, 5);
  });

  it("Alimentacao de Filhotes (1.5x) increases MER by 50%", () => {
    const base = calculateMER(128, "Normal", 1.0, "gaiola-interna");
    const feeding = calculateMER(128, "Normal", 1.5, "gaiola-interna");
    expect(feeding).toBeCloseTo(base * 1.5, 5);
  });

  it("Muda de Penas (1.25x) increases MER by 25%", () => {
    const base = calculateMER(128, "Normal", 1.0, "gaiola-interna");
    const molt = calculateMER(128, "Normal", 1.25, "gaiola-interna");
    expect(molt).toBeCloseTo(base * 1.25, 5);
  });
});

// ============================================================
// 4. All Dashboard Species - Sanity Checks
// ============================================================
describe("calculateMER - all dashboard species", () => {
  const allSpecies: [string, number, string][] = [
    ["Ringneck", 128.0, "Normal"],
    ["Cabeca de Ameixa", 73.0, "Normal"],
    ["Grande Alexandre", 255.0, "Normal"],
    ["Mustache", 156.0, "Normal"],
    ["Periquito Derbiana", 320.0, "Normal"],
    ["Papagaio do Congo", 400.0, "Normal"],
    ["Papagaio do Senegal", 155.0, "Normal"],
    ["Forpus", 33.0, "Normal"],
    ["Regente", 178.0, "Aumentado"],
    ["Principe de Galles", 92.0, "Aumentado"],
    ["Barrabam", 144.5, "Aumentado"],
    ["Papagaio Ecletus", 525.0, "Aumentado"],
    ["Papagaio Rei", 235.0, "Aumentado"],
    ["Red-winged", 165.0, "Aumentado"],
    ["Barnardi", 133.0, "Aumentado"],
    ["Port Lincoln", 133.0, "Aumentado"],
    ["Cacatua Alba", 550.0, "Aumentado"],
    ["Cacatua Galerita", 895.0, "Aumentado"],
    ["Cacatua Golfini", 300.0, "Aumentado"],
    ["Cacatua Moluca", 855.0, "Aumentado"],
    ["Cacatua Sulphurea", 344.0, "Aumentado"],
    ["Cacatua Galah", 335.0, "Aumentado"],
    ["Kakariki", 81.5, "Aumentado"],
    ["Hooded", 56.0, "Aumentado"],
    ["Red-rumped", 70.0, "Aumentado"],
    ["Neophema Asa-azul", 46.5, "Aumentado"],
    ["Turquasine", 40.5, "Aumentado"],
    ["Esplendido", 40.0, "Aumentado"],
    ["Bourke", 45.0, "Aumentado"],
    ["Rosella Adscitus", 107.5, "Aumentado"],
    ["Rosella Verde", 134.5, "Aumentado"],
    ["Rosella Pennat", 142.5, "Aumentado"],
    ["Rosella Eximius", 107.5, "Aumentado"],
    ["Rosella Icterotis", 62.5, "Aumentado"],
    ["Cacatua Pastinator", 630.0, "Aumentado"],
    ["Cacatua Oftalmica", 535.0, "Aumentado"],
  ];

  it.each(allSpecies)("%s (%sg, %s) produces positive MER", (name, weight, metab) => {
    const mer = calculateMER(weight, metab, 1.0, "gaiola-interna");
    expect(mer).toBeGreaterThan(0);
  });

  it.each(allSpecies)("%s (%sg, %s) MER scales with environment", (name, weight, metab) => {
    const merGI = calculateMER(weight, metab, 1.0, "gaiola-interna");
    const merVVI = calculateMER(weight, metab, 1.0, "viveiro-voo-interno");
    const merVL = calculateMER(weight, metab, 1.0, "vida-livre");
    expect(merVVI).toBeGreaterThan(merGI);
    expect(merVL).toBeGreaterThan(merVVI);
  });

  it("Aumentado species have higher MER than Normal at same weight", () => {
    const merNormal = calculateMER(128, "Normal", 1.0, "gaiola-interna");
    const merAumentado = calculateMER(128, "Aumentado", 1.0, "gaiola-interna");
    expect(merAumentado).toBeGreaterThan(merNormal);
    const ratio = merAumentado / merNormal;
    expect(ratio).toBeCloseTo(711 / 647, 2);
  });

  it("heavier species have higher MER (allometric scaling)", () => {
    const merForpus = calculateMER(33, "Normal", 1.0, "gaiola-interna");
    const merRingneck = calculateMER(128, "Normal", 1.0, "gaiola-interna");
    const merCongo = calculateMER(400, "Normal", 1.0, "gaiola-interna");
    expect(merRingneck).toBeGreaterThan(merForpus);
    expect(merCongo).toBeGreaterThan(merRingneck);
  });
});

// ============================================================
// 5. kcalToGrams Tests
// ============================================================
describe("kcalToGrams", () => {
  it("converts kcal to grams correctly", () => {
    expect(kcalToGrams(30.5, 3050)).toBeCloseTo(10, 2);
  });

  it("returns 0 for zero energy food", () => {
    expect(kcalToGrams(30.5, 0)).toBe(0);
  });

  it("returns 0 for negative energy food", () => {
    expect(kcalToGrams(30.5, -100)).toBe(0);
  });
});

// ============================================================
// 6. Formula Correctness - Mathematical Verification
// ============================================================
describe("Formula correctness", () => {
  it("uses exponent 0.73 (NOT 0.75)", () => {
    const mer = calculateMER(128, "Normal", 1.0, "gaiola-interna");
    const expected_073 = 647 * Math.pow(0.128, 0.73) / 4.184;
    const expected_075 = 647 * Math.pow(0.128, 0.75) / 4.184;
    expect(mer).toBeCloseTo(expected_073, 4);
    expect(Math.abs(mer - expected_075)).toBeGreaterThan(0.1);
  });

  it("uses kJ to kcal conversion factor 4.184", () => {
    const mer = calculateMER(128, "Normal", 1.0, "gaiola-interna");
    const mer_kj = 647 * Math.pow(0.128, 0.73);
    expect(mer).toBeCloseTo(mer_kj / 4.184, 4);
  });

  it("K_env is additive (NOT multiplicative)", () => {
    const merGI = calculateMER(128, "Normal", 1.0, "gaiola-interna");
    const merVVI = calculateMER(128, "Normal", 1.0, "viveiro-voo-interno");
    const ratio = merVVI / merGI;
    // Additive: (647+92)/647 = 1.1422
    expect(ratio).toBeCloseTo((647 + 92) / 647, 3);
    // NOT multiplicative 1.25
    expect(Math.abs(ratio - 1.25)).toBeGreaterThan(0.05);
  });
});
