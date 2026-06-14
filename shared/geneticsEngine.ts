/**
 * Motor de Cálculo Genético — Ring Neck (Psittacula krameri)
 * 
 * CORRIGIDO: Implementa lógica de série alélica para o locus Parblue
 * e para o locus Ino (sex-linked).
 * 
 * Regras fundamentais:
 * - Aves: Macho = ZZ, Fêmea = ZW
 * - Fêmeas NÃO podem ser split para mutações ligadas ao sexo (cromossomo W não carrega)
 * - Locus Parblue: série alélica Verde > Aqua > Turquesa > Azul (MESMO locus!)
 * - Locus Ino (sex-linked): série alélica Normal > Pallid > Ino (MESMO locus!)
 * - Turquesa é DOMINANTE sobre Azul (ave tq/bl = VISUAL turquesa!)
 * - Aqua é DOMINANTE sobre Turquesa e Azul
 */

import type { BirdGeneticsData } from "./genetics";
import { AVAILABLE_SPLITS, VISUAL_MUTATIONS, COMPOSITE_NAMES } from "./genetics";

// ============================================================
// TIPOS
// ============================================================

export interface OffspringResult {
  phenotype: string;         // Descrição visual (ex: "Turquesa Opalino")
  genotype: string;          // Genótipo completo (ex: "Turquesa / Azul / Ino")
  probability: number;       // Probabilidade (0 a 1)
  sex: "macho" | "femea" | "ambos";
  visual: string[];          // IDs das mutações visuais
  splits: string[];          // IDs dos splits
}

export interface BreedingPrediction {
  father: { visual: string[]; splits: string[] };
  mother: { visual: string[]; splits: string[] };
  offspring: OffspringResult[];
  totalCombinations: number;
}

// ============================================================
// HIERARQUIA DE DOMINÂNCIA — SÉRIE ALÉLICA PARBLUE
// ============================================================

/**
 * Hierarquia de dominância do locus Parblue:
 * Verde (selvagem) > Aqua > Turquesa > Azul
 * 
 * Cada ave tem 2 alelos neste locus. O fenótipo é determinado pelo
 * alelo MAIS DOMINANTE:
 * - verde/qualquer = Verde (visual), o outro é split
 * - aqua/turquesa = Aqua (visual)
 * - aqua/azul = Aqua (visual)
 * - turquesa/azul = TURQUESA VISUAL (NÃO é "portador de turquesa"!)
 * - azul/azul = Azul (visual)
 */
const PARBLUE_DOMINANCE: Record<string, number> = {
  "green": 3,    // Mais dominante
  "aqua": 2,
  "turquoise": 1,
  "blue": 0,     // Mais recessivo
};

function getParblueVisual(allele1: string, allele2: string): { visual: string; split: string | null } {
  const norm1 = allele1 === "normal" ? "green" : allele1;
  const norm2 = allele2 === "normal" ? "green" : allele2;
  
  const dom1 = PARBLUE_DOMINANCE[norm1] ?? 3;
  const dom2 = PARBLUE_DOMINANCE[norm2] ?? 3;
  
  if (dom1 >= dom2) {
    // allele1 é dominante ou igual
    if (norm1 === norm2) {
      return { visual: norm1, split: null }; // Homozigoto
    }
    return { visual: norm1, split: norm2 }; // Heterozigoto, o recessivo é split
  } else {
    return { visual: norm2, split: norm1 };
  }
}

// ============================================================
// HIERARQUIA DE DOMINÂNCIA — LOCUS INO (SEX-LINKED)
// ============================================================

/**
 * Hierarquia do locus Ino (sex-linked):
 * Normal (+) > Pallid (ino^pd) > Ino
 * 
 * Pallid e Ino são alelos do MESMO locus!
 * - normal/normal = Normal
 * - normal/pallid = Normal split Pallid (macho)
 * - normal/ino = Normal split Ino (macho)
 * - pallid/pallid = Pallid visual (macho)
 * - pallid/ino = Pallid visual split Ino (macho) — chamado "Pallidino"
 * - ino/ino = Ino visual (macho)
 * - Fêmea: hemizigota (só 1 alelo)
 */
const INO_DOMINANCE: Record<string, number> = {
  "normal": 2,   // Mais dominante
  "pallid": 1,
  "slino": 0,    // Mais recessivo
  "platinum": 1, // Platinum = variante de pallid (mesmo nível)
};

function getInoVisual(allele1: string, allele2: string | null): { visual: string | null; split: string | null } {
  if (allele2 === null) {
    // Fêmea hemizigota
    if (allele1 === "normal") return { visual: null, split: null };
    return { visual: allele1, split: null };
  }
  
  const dom1 = INO_DOMINANCE[allele1] ?? 2;
  const dom2 = INO_DOMINANCE[allele2] ?? 2;
  
  if (allele1 === "normal" && allele2 === "normal") {
    return { visual: null, split: null };
  }
  
  // Caso especial: Pallid/Ino = Pallid-ino (co-dominância intermediária)
  // Segundo psittacula-world: "Pallid behaves co-dominant towards Ino"
  // Pallid-ino é um fenótipo INTERMEDIÁRIO (mais claro que Pallid, com marcas reduzidas)
  const sorted = [allele1, allele2].sort();
  if ((sorted[0] === "pallid" && sorted[1] === "slino") ||
      (sorted[0] === "platinum" && sorted[1] === "slino")) {
    return { visual: "pallidino", split: null }; // Fenótipo intermediário
  }
  
  if (dom1 >= dom2) {
    if (allele1 === "normal") {
      return { visual: null, split: allele2 }; // Normal split X
    }
    if (allele1 === allele2) {
      return { visual: allele1, split: null }; // Homozigoto visual
    }
    return { visual: allele1, split: allele2 }; // Heterozigoto
  } else {
    if (allele2 === "normal") {
      return { visual: null, split: allele1 };
    }
    return { visual: allele2, split: allele1 };
  }
}

// ============================================================
// LÓGICA DE HERANÇA POR TIPO
// ============================================================

interface AllelePair {
  allele1: string;
  allele2: string;
  probability: number;
}

/**
 * Cruzamento genérico de 2 alelos (Punnett 2x2).
 * Funciona para qualquer locus autossômico (recessivo ou série alélica).
 */
function crossTwoAlleles(
  fatherAlleles: [string, string],
  motherAlleles: [string, string]
): AllelePair[] {
  const combos = [
    [fatherAlleles[0], motherAlleles[0]],
    [fatherAlleles[0], motherAlleles[1]],
    [fatherAlleles[1], motherAlleles[0]],
    [fatherAlleles[1], motherAlleles[1]],
  ];
  
  const grouped = new Map<string, number>();
  for (const [a, b] of combos) {
    // Normalizar ordem para consistência
    const key = [a, b].sort().join("|");
    grouped.set(key, (grouped.get(key) || 0) + 0.25);
  }
  
  const results: AllelePair[] = [];
  for (const [key, prob] of Array.from(grouped)) {
    const [allele1, allele2] = key.split("|");
    results.push({ allele1, allele2, probability: prob });
  }
  
  return results;
}

/**
 * Autossômica Dominante: dose (none, sf, df)
 */
function crossAutosomalDominant(
  fatherDose: string,
  motherDose: string
): { dose: string; probability: number }[] {
  const fatherCopies = fatherDose === "df" ? 2 : fatherDose === "sf" ? 1 : 0;
  const motherCopies = motherDose === "df" ? 2 : motherDose === "sf" ? 1 : 0;
  
  const fatherGives: [number, number][] = fatherCopies === 0 ? [[0, 1.0]] :
                    fatherCopies === 1 ? [[0, 0.5], [1, 0.5]] :
                    [[1, 1.0]];
  const motherGives: [number, number][] = motherCopies === 0 ? [[0, 1.0]] :
                    motherCopies === 1 ? [[0, 0.5], [1, 0.5]] :
                    [[1, 1.0]];
  
  const grouped = new Map<number, number>();
  for (const [fg, fp] of fatherGives) {
    for (const [mg, mp] of motherGives) {
      const total = fg + mg;
      grouped.set(total, (grouped.get(total) || 0) + fp * mp);
    }
  }
  
  const results: { dose: string; probability: number }[] = [];
  for (const [copies, prob] of Array.from(grouped)) {
    const dose = copies === 0 ? "none" : copies === 1 ? "sf" : "df";
    results.push({ dose, probability: prob });
  }
  
  return results;
}

/**
 * Ligada ao Sexo:
 * Macho ZZ: [Z1, Z2]
 * Fêmea ZW: [Z, null] (W não carrega o gene)
 * 
 * Filhotes machos recebem 1 Z do pai + 1 Z da mãe
 * Filhotes fêmeas recebem 1 Z do pai + W da mãe (só o Z do pai importa)
 */
function crossSexLinked(
  fatherAlleles: [string, string],
  motherAllele: string
): { males: AllelePair[]; females: { allele: string; probability: number }[] } {
  // Machos: Z do pai (50% cada) + Z da mãe
  const maleCombos = [
    { allele1: fatherAlleles[0], allele2: motherAllele, probability: 0.5 },
    { allele1: fatherAlleles[1], allele2: motherAllele, probability: 0.5 },
  ];
  
  const maleGrouped = new Map<string, number>();
  for (const combo of maleCombos) {
    const key = [combo.allele1, combo.allele2].sort().join("|");
    maleGrouped.set(key, (maleGrouped.get(key) || 0) + combo.probability);
  }
  const males: AllelePair[] = [];
  for (const [key, prob] of Array.from(maleGrouped)) {
    const [allele1, allele2] = key.split("|");
    males.push({ allele1, allele2, probability: prob });
  }
  
  // Fêmeas: Z do pai (50% cada) + W (hemizigota)
  const femaleGrouped = new Map<string, number>();
  femaleGrouped.set(fatherAlleles[0], (femaleGrouped.get(fatherAlleles[0]) || 0) + 0.5);
  femaleGrouped.set(fatherAlleles[1], (femaleGrouped.get(fatherAlleles[1]) || 0) + 0.5);
  
  const females = Array.from(femaleGrouped.entries()).map(([allele, probability]) => ({ allele, probability }));
  
  return { males, females };
}

// ============================================================
// CONVERSÃO DE DADOS DO FORMULÁRIO PARA GENÓTIPO INTERNO
// ============================================================

interface InternalGenotype {
  sex: "male" | "female";
  // Locus Parblue (série alélica: green > aqua > turquoise > blue)
  parblue: [string, string];
  // Autossômicas recessivas simples
  cleartail: [string, string];
  dilute: [string, string];
  nsino: [string, string];
  recPied: [string, string];
  clearheadFallow: [string, string];
  dunFallow: [string, string];
  // Dominantes
  darkFactor: string;
  violet: string;
  grey: string;
  domPied: string;
  // Ligadas ao sexo
  inoLocus: [string, string | null]; // Série alélica: normal > pallid > ino
  opaline: [string, string | null];
  cinnamon: [string, string | null];
}

/**
 * Converte dados do formulário (visual[] + splits[]) para genótipo interno.
 * 
 * REGRA CRUCIAL para Parblue:
 * - Se visual contém "blue" → ave é azul visual → parblue = [blue, blue]
 * - Se visual contém "turquoise" → pode ser tq/tq ou tq/bl
 *   - Se splits contém "blue" → parblue = [turquoise, blue]
 *   - Senão → parblue = [turquoise, turquoise]
 * - Se visual contém "aqua" → pode ser aq/aq, aq/tq, ou aq/bl
 *   - Se splits contém "turquoise" → parblue = [aqua, turquoise]
 *   - Se splits contém "blue" → parblue = [aqua, blue]
 *   - Senão → parblue = [aqua, aqua]
 * - Se visual contém "green" (ou nenhum dos acima) → pode ser +/+, +/bl, +/tq, +/aq
 *   - Verificar splits para o segundo alelo
 * 
 * REGRA CRUCIAL para Ino (sex-linked):
 * - Ino e Pallid são ALELOS DO MESMO LOCUS
 * - Se visual contém "slino" → macho: [slino, slino], fêmea: [slino, null]
 * - Se visual contém "pallid" → macho: pode ser pallid/pallid ou pallid/ino
 * - Se splits contém "slino" → macho: [normal, slino] ou [pallid, slino]
 */
export function dataToGenotype(data: BirdGeneticsData, sex: "macho" | "femea"): InternalGenotype {
  const isMale = sex === "macho";
  const visual = data.visual || [];
  const splits = data.splits || [];
  
  // --- PARBLUE LOCUS (série alélica) ---
  let parblue: [string, string];
  const parblueAlleles = ["aqua", "turquoise", "blue"];
  const visualParblue = visual.find(v => parblueAlleles.includes(v));
  const splitParblue = splits.find(s => parblueAlleles.includes(s));
  
  if (visualParblue) {
    // Ave mostra uma mutação parblue visual
    if (splitParblue) {
      // Tem split indicado — heterozigota
      parblue = [visualParblue, splitParblue];
    } else {
      // Sem split — assume homozigota
      parblue = [visualParblue, visualParblue];
    }
  } else {
    // Ave é verde (selvagem) — verificar splits
    if (splitParblue) {
      parblue = ["green", splitParblue];
    } else {
      parblue = ["green", "green"];
    }
  }
  
  // --- INO LOCUS (sex-linked, série alélica: normal > pallid > ino) ---
  let inoLocus: [string, string | null];
  const inoAlleles = ["slino", "pallid", "platinum"];
  const visualIno = visual.find(v => inoAlleles.includes(v));
  const splitIno = splits.find(s => inoAlleles.includes(s));
  
  if (isMale) {
    if (visualIno) {
      if (splitIno) {
        // Ex: pallid visual split ino → [pallid, slino]
        inoLocus = [visualIno, splitIno];
      } else {
        // Homozigoto visual
        inoLocus = [visualIno, visualIno];
      }
    } else {
      if (splitIno) {
        inoLocus = ["normal", splitIno];
      } else {
        inoLocus = ["normal", "normal"];
      }
    }
  } else {
    // Fêmea hemizigota
    if (visualIno) {
      inoLocus = [visualIno, null];
    } else {
      inoLocus = ["normal", null];
    }
  }
  
  // --- OPALINE (sex-linked simples) ---
  let opaline: [string, string | null];
  if (isMale) {
    if (visual.includes("opaline")) {
      opaline = ["opaline", "opaline"];
    } else if (splits.includes("opaline")) {
      opaline = ["normal", "opaline"];
    } else {
      opaline = ["normal", "normal"];
    }
  } else {
    opaline = visual.includes("opaline") ? ["opaline", null] : ["normal", null];
  }
  
  // --- CINNAMON (sex-linked simples) ---
  let cinnamon: [string, string | null];
  if (isMale) {
    if (visual.includes("cinnamon")) {
      cinnamon = ["cinnamon", "cinnamon"];
    } else if (splits.includes("cinnamon")) {
      cinnamon = ["normal", "cinnamon"];
    } else {
      cinnamon = ["normal", "normal"];
    }
  } else {
    cinnamon = visual.includes("cinnamon") ? ["cinnamon", null] : ["normal", null];
  }
  
  // --- RECESSIVAS SIMPLES ---
  function getSimpleRecessive(alleleId: string): [string, string] {
    if (visual.includes(alleleId)) return [alleleId, alleleId];
    if (splits.includes(alleleId)) return ["normal", alleleId];
    return ["normal", "normal"];
  }
  
  // --- DOMINANTES ---
  function getDominantDose(sfId: string, dfId: string): string {
    if (visual.includes(dfId)) return "df";
    if (visual.includes(sfId)) return "sf";
    return "none";
  }
  
  return {
    sex: isMale ? "male" : "female",
    parblue,
    cleartail: getSimpleRecessive("cleartail"),
    dilute: getSimpleRecessive("dilute"),
    nsino: getSimpleRecessive("nsino"),
    recPied: getSimpleRecessive("rec_pied"),
    clearheadFallow: getSimpleRecessive("clearhead_fallow"),
    dunFallow: getSimpleRecessive("dun_fallow"),
    darkFactor: getDominantDose("dark_sf", "dark_df"),
    violet: getDominantDose("violet_sf", "violet_df"),
    grey: getDominantDose("grey_sf", "grey_df"),
    domPied: getDominantDose("dom_pied_sf", "dom_pied_df"),
    inoLocus,
    opaline,
    cinnamon,
  };
}

// ============================================================
// MOTOR PRINCIPAL DE CÁLCULO
// ============================================================

interface OffspringGenotype {
  probability: number;
  sex: "macho" | "femea";
  visual: string[];
  splits: string[];
}

/**
 * Calcula a previsão de filhotes para um casal.
 */
export function calculateBreeding(
  fatherData: BirdGeneticsData,
  motherData: BirdGeneticsData
): BreedingPrediction {
  const father = dataToGenotype(fatherData, "macho");
  const mother = dataToGenotype(motherData, "femea");
  
  // --- Locus Parblue (série alélica, cruzamento normal 2x2) ---
  const parblueResults = crossTwoAlleles(father.parblue, mother.parblue);
  
  // --- Autossômicas Recessivas Simples ---
  const cleartailResults = crossTwoAlleles(father.cleartail, mother.cleartail);
  const diluteResults = crossTwoAlleles(father.dilute, mother.dilute);
  const nsinoResults = crossTwoAlleles(father.nsino, mother.nsino);
  const recPiedResults = crossTwoAlleles(father.recPied, mother.recPied);
  const clearheadResults = crossTwoAlleles(father.clearheadFallow, mother.clearheadFallow);
  const dunResults = crossTwoAlleles(father.dunFallow, mother.dunFallow);
  
  // --- Autossômicas Dominantes ---
  const darkResults = crossAutosomalDominant(father.darkFactor, mother.darkFactor);
  const violetResults = crossAutosomalDominant(father.violet, mother.violet);
  const greyResults = crossAutosomalDominant(father.grey, mother.grey);
  const domPiedResults = crossAutosomalDominant(father.domPied, mother.domPied);
  
  // --- Ligadas ao Sexo ---
  const inoSL = crossSexLinked(
    father.inoLocus as [string, string],
    mother.inoLocus[0]
  );
  const opalineSL = crossSexLinked(
    father.opaline as [string, string],
    mother.opaline[0]
  );
  const cinnamonSL = crossSexLinked(
    father.cinnamon as [string, string],
    mother.cinnamon[0]
  );
  
  const allOffspring: OffspringGenotype[] = [];
  
  // --- Gerar combinações para MACHOS (50% dos filhotes) ---
  for (const pb of parblueResults) {
    for (const ct of cleartailResults) {
      for (const dil of diluteResults) {
        for (const nsi of nsinoResults) {
          for (const rp of recPiedResults) {
            for (const ch of clearheadResults) {
              for (const dn of dunResults) {
                for (const dk of darkResults) {
                  for (const vl of violetResults) {
                    for (const gr of greyResults) {
                      for (const dp of domPiedResults) {
                        for (const ino of inoSL.males) {
                          for (const op of opalineSL.males) {
                            for (const cn of cinnamonSL.males) {
                              const prob = pb.probability * ct.probability * dil.probability *
                                nsi.probability * rp.probability * ch.probability * dn.probability *
                                dk.probability * vl.probability * gr.probability * dp.probability *
                                ino.probability * op.probability * cn.probability * 0.5;
                              
                              if (prob < 0.0001) continue;
                              
                              const visual: string[] = [];
                              const splits: string[] = [];
                              
                              // PARBLUE — usar hierarquia de dominância
                              const pbResult = getParblueVisual(pb.allele1, pb.allele2);
                              visual.push(pbResult.visual);
                              if (pbResult.split) splits.push(pbResult.split);
                              
                              // Recessivas simples
                              interpretSimpleRecessive(ct, "cleartail", visual, splits);
                              interpretSimpleRecessive(dil, "dilute", visual, splits);
                              interpretSimpleRecessive(nsi, "nsino", visual, splits);
                              interpretSimpleRecessive(rp, "rec_pied", visual, splits);
                              interpretSimpleRecessive(ch, "clearhead_fallow", visual, splits);
                              interpretSimpleRecessive(dn, "dun_fallow", visual, splits);
                              
                              // Dominantes
                              const dkV = interpretDominant(dk.dose, "dark_sf", "dark_df");
                              if (dkV) visual.push(dkV);
                              const vlV = interpretDominant(vl.dose, "violet_sf", "violet_df");
                              if (vlV) visual.push(vlV);
                              const grV = interpretGrey(gr.dose);
                              if (grV) visual.push(grV);
                              const dpV = interpretDominant(dp.dose, "dom_pied_sf", "dom_pied_df");
                              if (dpV) visual.push(dpV);
                              
                              // INO LOCUS (sex-linked, série alélica) — machos ZZ
                              const inoResult = getInoVisual(ino.allele1, ino.allele2);
                              if (inoResult.visual) visual.push(inoResult.visual);
                              if (inoResult.split) splits.push(inoResult.split);
                              
                              // Opaline (sex-linked simples) — machos ZZ
                              if (op.allele1 !== "normal" && op.allele1 === op.allele2) {
                                visual.push("opaline");
                              } else if (op.allele1 !== "normal" || op.allele2 !== "normal") {
                                splits.push("opaline");
                              }
                              
                              // Cinnamon (sex-linked simples) — machos ZZ
                              if (cn.allele1 !== "normal" && cn.allele1 === cn.allele2) {
                                visual.push("cinnamon");
                              } else if (cn.allele1 !== "normal" || cn.allele2 !== "normal") {
                                splits.push("cinnamon");
                              }
                              
                              allOffspring.push({ probability: prob, sex: "macho", visual, splits });
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }
  
  // --- Gerar combinações para FÊMEAS (50% dos filhotes) ---
  for (const pb of parblueResults) {
    for (const ct of cleartailResults) {
      for (const dil of diluteResults) {
        for (const nsi of nsinoResults) {
          for (const rp of recPiedResults) {
            for (const ch of clearheadResults) {
              for (const dn of dunResults) {
                for (const dk of darkResults) {
                  for (const vl of violetResults) {
                    for (const gr of greyResults) {
                      for (const dp of domPiedResults) {
                        for (const ino of inoSL.females) {
                          for (const op of opalineSL.females) {
                            for (const cn of cinnamonSL.females) {
                              const prob = pb.probability * ct.probability * dil.probability *
                                nsi.probability * rp.probability * ch.probability * dn.probability *
                                dk.probability * vl.probability * gr.probability * dp.probability *
                                ino.probability * op.probability * cn.probability * 0.5;
                              
                              if (prob < 0.0001) continue;
                              
                              const visual: string[] = [];
                              const splits: string[] = [];
                              
                              // PARBLUE — usar hierarquia de dominância
                              const pbResult = getParblueVisual(pb.allele1, pb.allele2);
                              visual.push(pbResult.visual);
                              if (pbResult.split) splits.push(pbResult.split);
                              
                              // Recessivas simples
                              interpretSimpleRecessive(ct, "cleartail", visual, splits);
                              interpretSimpleRecessive(dil, "dilute", visual, splits);
                              interpretSimpleRecessive(nsi, "nsino", visual, splits);
                              interpretSimpleRecessive(rp, "rec_pied", visual, splits);
                              interpretSimpleRecessive(ch, "clearhead_fallow", visual, splits);
                              interpretSimpleRecessive(dn, "dun_fallow", visual, splits);
                              
                              // Dominantes
                              const dkV = interpretDominant(dk.dose, "dark_sf", "dark_df");
                              if (dkV) visual.push(dkV);
                              const vlV = interpretDominant(vl.dose, "violet_sf", "violet_df");
                              if (vlV) visual.push(vlV);
                              const grV = interpretGrey(gr.dose);
                              if (grV) visual.push(grV);
                              const dpV = interpretDominant(dp.dose, "dom_pied_sf", "dom_pied_df");
                              if (dpV) visual.push(dpV);
                              
                              // INO LOCUS (sex-linked, série alélica) — fêmeas hemizigotas
                              const inoFemale = getInoVisual(ino.allele, null);
                              if (inoFemale.visual) visual.push(inoFemale.visual);
                              
                              // Opaline — fêmeas hemizigotas
                              if (op.allele !== "normal") visual.push("opaline");
                              
                              // Cinnamon — fêmeas hemizigotas
                              if (cn.allele !== "normal") visual.push("cinnamon");
                              
                              allOffspring.push({ probability: prob, sex: "femea", visual, splits });
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }
  
  // Agrupar resultados iguais
  const grouped = new Map<string, OffspringGenotype>();
  for (const o of allOffspring) {
    const key = `${o.sex}|${o.visual.sort().join(",")}|${o.splits.sort().join(",")}`;
    const existing = grouped.get(key);
    if (existing) {
      existing.probability += o.probability;
    } else {
      grouped.set(key, { ...o });
    }
  }
  
  // Converter para resultado final (probabilidade em porcentagem 0-100)
  const offspring: OffspringResult[] = Array.from(grouped.values())
    .map(o => ({
      phenotype: buildPhenotypeName(o.visual),
      genotype: buildGenotypeName(o.visual, o.splits),
      probability: Math.round(o.probability * 10000) / 100, // Converte para % (ex: 0.25 -> 25%)
      sex: o.sex,
      visual: o.visual,
      splits: o.splits,
    }))
    .filter(o => o.probability >= 0.1) // Filtrar < 0.1%
    .sort((a, b) => b.probability - a.probability);
  
  return {
    father: fatherData,
    mother: motherData,
    offspring,
    totalCombinations: offspring.length,
  };
}

// ============================================================
// HELPERS
// ============================================================

function interpretSimpleRecessive(pair: AllelePair, alleleId: string, visual: string[], splits: string[]) {
  const { allele1, allele2 } = pair;
  if (allele1 !== "normal" && allele1 === allele2) {
    visual.push(alleleId); // Homozigoto = visual
  } else if (allele1 !== "normal" && allele2 === "normal") {
    splits.push(alleleId); // Heterozigoto = split
  } else if (allele2 !== "normal" && allele1 === "normal") {
    splits.push(alleleId);
  }
  // Se ambos são "normal", nada a adicionar
}

function interpretDominant(dose: string, sfId: string, dfId: string): string | null {
  // Para Grey: dominância COMPLETA (SF e DF produzem mesmo visual)
  // Para Dark/Violet/DomPied: dominância INCOMPLETA (SF ≠ DF)
  if (dose === "df") return dfId;
  if (dose === "sf") return sfId;
  return null;
}

/**
 * Grey é dominância COMPLETA: SF e DF produzem o mesmo fenótipo visual.
 * Usamos grey_sf para ambos na saída visual (simplificação).
 */
function interpretGrey(dose: string): string | null {
  if (dose === "df" || dose === "sf") return "grey_sf"; // Mesmo visual
  return null;
}

// ============================================================
// FORMATAÇÃO DE NOMES
// ============================================================

const ALL_MUTATIONS = [
  ...VISUAL_MUTATIONS.base,
  ...VISUAL_MUTATIONS.dominant,
  ...VISUAL_MUTATIONS.recessive,
  ...VISUAL_MUTATIONS.sexLinked,
];

const ALL_SPLITS = [...AVAILABLE_SPLITS.autosomal, ...AVAILABLE_SPLITS.sexLinked];

function getMutationLabel(id: string): string {
  return ALL_MUTATIONS.find(m => m.id === id)?.label || 
         ALL_SPLITS.find(s => s.id === id)?.label || 
         id;
}

function buildPhenotypeName(visual: string[]): string {
  if (visual.length === 0) return "Verde";
  
  // Check for composite names (exact match)
  const sortedKey = [...visual].sort().join("+");
  if (COMPOSITE_NAMES[sortedKey]) {
    return COMPOSITE_NAMES[sortedKey];
  }
  
  // For multi-mutation combos without a composite name:
  // Remove 'green' from display if there are other mutations (green is implied as base)
  const displayVisual = visual.length > 1 
    ? visual.filter(v => v !== 'green')
    : visual;
  
  // Try composite name without green
  if (displayVisual.length !== visual.length) {
    const noGreenKey = [...displayVisual].sort().join("+");
    if (COMPOSITE_NAMES[noGreenKey]) {
      return COMPOSITE_NAMES[noGreenKey];
    }
  }
  
  return displayVisual.map(getMutationLabel).join(" ");
}

function buildGenotypeName(visual: string[], splits: string[]): string {
  // Use the phenotype name for the visual part (handles composite names)
  const visualPart = buildPhenotypeName(visual);
  if (splits.length === 0) return visualPart;
  const splitsPart = splits.map(getMutationLabel).join(" / ");
  return `${visualPart} / ${splitsPart}`;
}

// ============================================================
// CABEÇA DE AMEIXA — Motor simplificado (apenas locus Grey)
// ============================================================

/**
 * Calcula a previsão de filhotes para Cabeça de Ameixa.
 * 
 * Atualmente só possui o locus Grey (Verde Cinza):
 * - Autossômica dominante com dominância COMPLETA
 * - SF e DF são ambos visualmente Verde Cinza
 * - Não existe split para cinza (gene dominante)
 * - Não é ligada ao sexo (machos e fêmeas iguais)
 * 
 * Cenários:
 * - Verde x Verde = 100% Verde
 * - Verde Cinza SF x Verde = 50% Verde Cinza SF + 50% Verde
 * - Verde Cinza SF x Verde Cinza SF = 25% Verde Cinza DF + 50% Verde Cinza SF + 25% Verde
 * - Verde Cinza DF x Verde = 100% Verde Cinza SF
 * - Verde Cinza DF x Verde Cinza SF = 50% Verde Cinza DF + 50% Verde Cinza SF
 * - Verde Cinza DF x Verde Cinza DF = 100% Verde Cinza DF
 */
export function calculateBreedingCabecaAmeixa(
  fatherData: BirdGeneticsData,
  motherData: BirdGeneticsData
): BreedingPrediction {
  // Extrair dose do grey de cada progenitor
  const fatherGrey = getGreyDoseFromData(fatherData);
  const motherGrey = getGreyDoseFromData(motherData);
  
  // Cruzar locus grey (autossômico dominante)
  const greyResults = crossAutosomalDominant(fatherGrey, motherGrey);
  
  // Não há diferença entre machos e fêmeas (não é sex-linked)
  const offspring: OffspringResult[] = greyResults.map(gr => {
    const visual: string[] = ["green"]; // Sempre verde como base
    
    // Grey é dominância COMPLETA: SF e DF = mesmo fenótipo visual "Verde Cinza"
    // Mas internamente guardamos se é SF ou DF para cálculos futuros
    if (gr.dose === "sf") {
      visual.push("grey_sf");
    } else if (gr.dose === "df") {
      visual.push("grey_df");
    }
    
    const phenotype = gr.dose === "none" ? "Verde" : "Verde Cinza";
    const genotypeDetail = gr.dose === "sf" ? "Verde Cinza SF" :
                           gr.dose === "df" ? "Verde Cinza DF" : "Verde";
    
    return {
      phenotype,
      genotype: genotypeDetail,
      probability: Math.round(gr.probability * 10000) / 100, // Converte para %
      sex: "ambos" as const,
      visual,
      splits: [], // Não existe split para dominante
    };
  }).filter(o => o.probability >= 0.1);
  
  return {
    father: fatherData,
    mother: motherData,
    offspring,
    totalCombinations: offspring.length,
  };
}

/**
 * Extrai a dose de grey dos dados do formulário.
 */
function getGreyDoseFromData(data: BirdGeneticsData): string {
  const visual = data.visual || [];
  if (visual.includes("grey_df")) return "df";
  if (visual.includes("grey_sf")) return "sf";
  return "none";
}

// ============================================================
// FUNÇÃO UNIVERSAL COM SELEÇÃO POR ESPÉCIE
// ============================================================

/**
 * Calcula previsão de filhotes para qualquer espécie suportada.
 * Seleciona automaticamente o motor correto com base no speciesId.
 */
export function calculateBreedingForSpecies(
  fatherData: BirdGeneticsData,
  motherData: BirdGeneticsData,
  speciesId: string
): BreedingPrediction {
  if (speciesId === "psittacula-cyanocephala") {
    return calculateBreedingCabecaAmeixa(fatherData, motherData);
  }
  // Default: Ring Neck
  return calculateBreeding(fatherData, motherData);
}

// ============================================================
// FUNÇÃO SIMPLIFICADA (alias)
// ============================================================

export function calculateBreedingSimplified(
  fatherData: BirdGeneticsData,
  motherData: BirdGeneticsData
): BreedingPrediction {
  return calculateBreeding(fatherData, motherData);
}
