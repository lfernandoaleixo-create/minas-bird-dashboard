/**
 * Testes — Calculadora Genética Cabeça de Ameixa (Psittacula cyanocephala)
 * 
 * Valida os 6 cenários de cruzamento Verde / Verde Cinza:
 * 1. Verde x Verde = 100% Verde
 * 2. Verde Cinza SF x Verde = 50% Verde Cinza + 50% Verde
 * 3. Verde Cinza SF x Verde Cinza SF = 25% Verde Cinza DF + 50% Verde Cinza SF + 25% Verde
 * 4. Verde Cinza DF x Verde = 100% Verde Cinza SF
 * 5. Verde Cinza DF x Verde Cinza SF = 50% Verde Cinza DF + 50% Verde Cinza SF
 * 6. Verde Cinza DF x Verde Cinza DF = 100% Verde Cinza DF
 * 
 * Regras:
 * - Verde Cinza é autossômica dominante com dominância COMPLETA
 * - SF e DF são ambos visualmente "Verde Cinza"
 * - Não existe split para cinza (gene dominante)
 * - Não é ligada ao sexo (resultado igual para machos e fêmeas)
 */
import { describe, it, expect } from "vitest";
import { calculateBreedingCabecaAmeixa, calculateBreedingForSpecies } from "./geneticsEngine";
import type { BirdGeneticsData } from "./genetics";
import { 
  CABECA_AMEIXA_VISUAL_MUTATIONS, 
  CABECA_AMEIXA_AVAILABLE_SPLITS,
  getVisualMutationsForSpecies,
  getAvailableSplitsForSpecies,
  getCompositeNamesForSpecies,
} from "./genetics";

// Helper: criar dados genéticos
function makeGenetics(visual: string[], splits: string[] = []): BirdGeneticsData {
  return { visual, splits };
}

describe("Cabeça de Ameixa — Dados de Mutação", () => {
  it("deve ter apenas Verde como cor base", () => {
    expect(CABECA_AMEIXA_VISUAL_MUTATIONS.base).toHaveLength(1);
    expect(CABECA_AMEIXA_VISUAL_MUTATIONS.base[0].id).toBe("green");
    expect(CABECA_AMEIXA_VISUAL_MUTATIONS.base[0].label).toBe("Verde");
  });

  it("deve ter apenas Verde Cinza SF e DF como dominantes", () => {
    expect(CABECA_AMEIXA_VISUAL_MUTATIONS.dominant).toHaveLength(2);
    expect(CABECA_AMEIXA_VISUAL_MUTATIONS.dominant[0].id).toBe("grey_sf");
    expect(CABECA_AMEIXA_VISUAL_MUTATIONS.dominant[0].label).toBe("Verde Cinza SF");
    expect(CABECA_AMEIXA_VISUAL_MUTATIONS.dominant[1].id).toBe("grey_df");
    expect(CABECA_AMEIXA_VISUAL_MUTATIONS.dominant[1].label).toBe("Verde Cinza DF");
  });

  it("não deve ter mutações recessivas", () => {
    expect(CABECA_AMEIXA_VISUAL_MUTATIONS.recessive).toHaveLength(0);
  });

  it("não deve ter mutações ligadas ao sexo", () => {
    expect(CABECA_AMEIXA_VISUAL_MUTATIONS.sexLinked).toHaveLength(0);
  });

  it("não deve ter splits disponíveis (dominante não tem split)", () => {
    expect(CABECA_AMEIXA_AVAILABLE_SPLITS.autosomal).toHaveLength(0);
    expect(CABECA_AMEIXA_AVAILABLE_SPLITS.sexLinked).toHaveLength(0);
  });
});

describe("Cabeça de Ameixa — Seleção por Espécie", () => {
  it("getVisualMutationsForSpecies retorna mutações corretas para Cabeça de Ameixa", () => {
    const mutations = getVisualMutationsForSpecies("psittacula-cyanocephala");
    expect(mutations).toBe(CABECA_AMEIXA_VISUAL_MUTATIONS);
  });

  it("getAvailableSplitsForSpecies retorna splits vazios para Cabeça de Ameixa", () => {
    const splits = getAvailableSplitsForSpecies("psittacula-cyanocephala");
    expect(splits.autosomal).toHaveLength(0);
    expect(splits.sexLinked).toHaveLength(0);
  });

  it("getCompositeNamesForSpecies retorna nomes compostos para Cabeça de Ameixa", () => {
    const names = getCompositeNamesForSpecies("psittacula-cyanocephala");
    expect(names["grey_sf"]).toBe("Verde Cinza");
    expect(names["grey_df"]).toBe("Verde Cinza");
  });

  it("getVisualMutationsForSpecies retorna Ring Neck para psittacula-krameri", () => {
    const mutations = getVisualMutationsForSpecies("psittacula-krameri");
    expect(mutations.base.length).toBeGreaterThan(1); // Ring Neck tem Verde, Azul, Turquesa, Aqua
  });
});

describe("Cabeça de Ameixa — Cenário 1: Verde x Verde", () => {
  it("deve produzir 100% Verde", () => {
    const father = makeGenetics(["green"]);
    const mother = makeGenetics(["green"]);
    const result = calculateBreedingCabecaAmeixa(father, mother);

    expect(result.offspring).toHaveLength(1);
    expect(result.offspring[0].phenotype).toBe("Verde");
    expect(result.offspring[0].genotype).toBe("Verde");
    expect(result.offspring[0].probability).toBe(100);
    expect(result.offspring[0].sex).toBe("ambos");
    expect(result.offspring[0].splits).toHaveLength(0);
  });
});

describe("Cabeça de Ameixa — Cenário 2: Verde Cinza SF x Verde", () => {
  it("deve produzir 50% Verde Cinza SF + 50% Verde", () => {
    const father = makeGenetics(["green", "grey_sf"]);
    const mother = makeGenetics(["green"]);
    const result = calculateBreedingCabecaAmeixa(father, mother);

    expect(result.offspring).toHaveLength(2);
    
    const verdeCinza = result.offspring.find(o => o.phenotype === "Verde Cinza");
    const verde = result.offspring.find(o => o.phenotype === "Verde");
    
    expect(verdeCinza).toBeDefined();
    expect(verdeCinza!.probability).toBe(50);
    expect(verdeCinza!.genotype).toBe("Verde Cinza SF");
    expect(verdeCinza!.sex).toBe("ambos");
    
    expect(verde).toBeDefined();
    expect(verde!.probability).toBe(50);
    expect(verde!.genotype).toBe("Verde");
    expect(verde!.sex).toBe("ambos");
  });

  it("deve funcionar com pai Verde e mãe Verde Cinza SF (invertido)", () => {
    const father = makeGenetics(["green"]);
    const mother = makeGenetics(["green", "grey_sf"]);
    const result = calculateBreedingCabecaAmeixa(father, mother);

    expect(result.offspring).toHaveLength(2);
    const verdeCinza = result.offspring.find(o => o.phenotype === "Verde Cinza");
    const verde = result.offspring.find(o => o.phenotype === "Verde");
    expect(verdeCinza!.probability).toBe(50);
    expect(verde!.probability).toBe(50);
  });
});

describe("Cabeça de Ameixa — Cenário 3: Verde Cinza SF x Verde Cinza SF", () => {
  it("deve produzir 25% DF + 50% SF + 25% Verde", () => {
    const father = makeGenetics(["green", "grey_sf"]);
    const mother = makeGenetics(["green", "grey_sf"]);
    const result = calculateBreedingCabecaAmeixa(father, mother);

    expect(result.offspring).toHaveLength(3);
    
    const df = result.offspring.find(o => o.genotype === "Verde Cinza DF");
    const sf = result.offspring.find(o => o.genotype === "Verde Cinza SF");
    const verde = result.offspring.find(o => o.phenotype === "Verde");
    
    expect(df).toBeDefined();
    expect(df!.probability).toBe(25);
    expect(df!.phenotype).toBe("Verde Cinza"); // DF visual = Verde Cinza
    
    expect(sf).toBeDefined();
    expect(sf!.probability).toBe(50);
    expect(sf!.phenotype).toBe("Verde Cinza"); // SF visual = Verde Cinza
    
    expect(verde).toBeDefined();
    expect(verde!.probability).toBe(25);
    expect(verde!.genotype).toBe("Verde");
  });

  it("probabilidades devem somar 100%", () => {
    const father = makeGenetics(["green", "grey_sf"]);
    const mother = makeGenetics(["green", "grey_sf"]);
    const result = calculateBreedingCabecaAmeixa(father, mother);
    const total = result.offspring.reduce((sum, o) => sum + o.probability, 0);
    expect(total).toBe(100);
  });
});

describe("Cabeça de Ameixa — Cenário 4: Verde Cinza DF x Verde", () => {
  it("deve produzir 100% Verde Cinza SF", () => {
    const father = makeGenetics(["green", "grey_df"]);
    const mother = makeGenetics(["green"]);
    const result = calculateBreedingCabecaAmeixa(father, mother);

    expect(result.offspring).toHaveLength(1);
    expect(result.offspring[0].phenotype).toBe("Verde Cinza");
    expect(result.offspring[0].genotype).toBe("Verde Cinza SF");
    expect(result.offspring[0].probability).toBe(100);
    expect(result.offspring[0].sex).toBe("ambos");
  });
});

describe("Cabeça de Ameixa — Cenário 5: Verde Cinza DF x Verde Cinza SF", () => {
  it("deve produzir 50% DF + 50% SF", () => {
    const father = makeGenetics(["green", "grey_df"]);
    const mother = makeGenetics(["green", "grey_sf"]);
    const result = calculateBreedingCabecaAmeixa(father, mother);

    expect(result.offspring).toHaveLength(2);
    
    const df = result.offspring.find(o => o.genotype === "Verde Cinza DF");
    const sf = result.offspring.find(o => o.genotype === "Verde Cinza SF");
    
    expect(df).toBeDefined();
    expect(df!.probability).toBe(50);
    expect(df!.phenotype).toBe("Verde Cinza");
    
    expect(sf).toBeDefined();
    expect(sf!.probability).toBe(50);
    expect(sf!.phenotype).toBe("Verde Cinza");
  });

  it("probabilidades devem somar 100%", () => {
    const father = makeGenetics(["green", "grey_df"]);
    const mother = makeGenetics(["green", "grey_sf"]);
    const result = calculateBreedingCabecaAmeixa(father, mother);
    const total = result.offspring.reduce((sum, o) => sum + o.probability, 0);
    expect(total).toBe(100);
  });
});

describe("Cabeça de Ameixa — Cenário 6: Verde Cinza DF x Verde Cinza DF", () => {
  it("deve produzir 100% Verde Cinza DF", () => {
    const father = makeGenetics(["green", "grey_df"]);
    const mother = makeGenetics(["green", "grey_df"]);
    const result = calculateBreedingCabecaAmeixa(father, mother);

    expect(result.offspring).toHaveLength(1);
    expect(result.offspring[0].phenotype).toBe("Verde Cinza");
    expect(result.offspring[0].genotype).toBe("Verde Cinza DF");
    expect(result.offspring[0].probability).toBe(100);
    expect(result.offspring[0].sex).toBe("ambos");
  });
});

describe("Cabeça de Ameixa — calculateBreedingForSpecies", () => {
  it("deve usar motor Cabeça de Ameixa quando speciesId é psittacula-cyanocephala", () => {
    const father = makeGenetics(["green", "grey_sf"]);
    const mother = makeGenetics(["green"]);
    const result = calculateBreedingForSpecies(father, mother, "psittacula-cyanocephala");

    expect(result.offspring).toHaveLength(2);
    expect(result.offspring.find(o => o.phenotype === "Verde Cinza")).toBeDefined();
    expect(result.offspring.find(o => o.phenotype === "Verde")).toBeDefined();
  });

  it("deve usar motor Ring Neck quando speciesId é psittacula-krameri", () => {
    // Ring Neck com verde split azul x verde split azul
    const father = makeGenetics(["green"], ["blue"]);
    const mother = makeGenetics(["green"], ["blue"]);
    const result = calculateBreedingForSpecies(father, mother, "psittacula-krameri");

    // Ring Neck deve ter machos e fêmeas separados (sex-linked logic)
    const hasMale = result.offspring.some(o => o.sex === "macho");
    const hasFemale = result.offspring.some(o => o.sex === "femea");
    expect(hasMale).toBe(true);
    expect(hasFemale).toBe(true);
  });

  it("Cabeça de Ameixa não deve ter splits nos resultados", () => {
    const father = makeGenetics(["green", "grey_sf"]);
    const mother = makeGenetics(["green", "grey_sf"]);
    const result = calculateBreedingForSpecies(father, mother, "psittacula-cyanocephala");

    for (const offspring of result.offspring) {
      expect(offspring.splits).toHaveLength(0);
    }
  });

  it("Cabeça de Ameixa deve ter sex = ambos (não sex-linked)", () => {
    const father = makeGenetics(["green", "grey_sf"]);
    const mother = makeGenetics(["green"]);
    const result = calculateBreedingForSpecies(father, mother, "psittacula-cyanocephala");

    for (const offspring of result.offspring) {
      expect(offspring.sex).toBe("ambos");
    }
  });
});

describe("Cabeça de Ameixa — Edge cases", () => {
  it("deve funcionar com dados vazios (sem visual = Verde)", () => {
    const father = makeGenetics([]);
    const mother = makeGenetics([]);
    const result = calculateBreedingCabecaAmeixa(father, mother);

    expect(result.offspring).toHaveLength(1);
    expect(result.offspring[0].phenotype).toBe("Verde");
    expect(result.offspring[0].probability).toBe(100);
  });

  it("deve ignorar splits (não existem para esta espécie)", () => {
    // Mesmo que alguém passe splits, o motor deve funcionar normalmente
    const father = makeGenetics(["green", "grey_sf"], ["blue"]); // split inválido para esta espécie
    const mother = makeGenetics(["green"]);
    const result = calculateBreedingCabecaAmeixa(father, mother);

    expect(result.offspring).toHaveLength(2);
    // Splits não devem afetar o resultado
    expect(result.offspring.find(o => o.phenotype === "Verde Cinza")!.probability).toBe(50);
  });
});
