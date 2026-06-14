/**
 * Motor de Cálculo Genético — Ring Neck (Psittacula krameri)
 * 
 * Implementa lógica de Punnett Square para cada locus genético,
 * combinando resultados de todos os loci para prever filhotes.
 * 
 * Regras fundamentais:
 * - Aves: Macho = ZZ, Fêmea = ZW
 * - Fêmeas NÃO podem ser split para mutações ligadas ao sexo (cromossomo W não carrega)
 * - Mutações autossômicas: ambos os sexos herdam igualmente
 * - Mutações dominantes: SF = 1 cópia, DF = 2 cópias
 */

import type { BirdGeneticsData } from "./genetics";
import { RINGNECK_LOCI, AVAILABLE_SPLITS, VISUAL_MUTATIONS, COMPOSITE_NAMES } from "./genetics";

// ============================================================
// TIPOS
// ============================================================

export interface OffspringResult {
  phenotype: string;         // Descrição visual (ex: "Azul Opalino")
  genotype: string;          // Genótipo completo (ex: "Azul / Ino / Cleartail")
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
// LÓGICA DE HERANÇA POR TIPO
// ============================================================

interface AllelePair {
  allele1: string;
  allele2: string;
  probability: number;
}

/**
 * Autossômica Recessiva: Punnett square 2x2
 * Pai [A, B] x Mãe [C, D] → AC, AD, BC, BD (cada 25%)
 */
function crossAutosomalRecessive(
  fatherAlleles: [string, string],
  motherAlleles: [string, string]
): AllelePair[] {
  const results: AllelePair[] = [];
  const combos = [
    [fatherAlleles[0], motherAlleles[0]],
    [fatherAlleles[0], motherAlleles[1]],
    [fatherAlleles[1], motherAlleles[0]],
    [fatherAlleles[1], motherAlleles[1]],
  ];
  
  // Agrupar combinações iguais
  const grouped = new Map<string, number>();
  for (const [a, b] of combos) {
    // Normalizar ordem (menor primeiro para consistência)
    const key = [a, b].sort().join("|");
    grouped.set(key, (grouped.get(key) || 0) + 0.25);
  }
  
  for (const [key, prob] of Array.from(grouped)) {
    const [allele1, allele2] = key.split("|");
    results.push({ allele1, allele2, probability: prob });
  }
  
  return results;
}

/**
 * Autossômica Dominante: dose (none, sf, df)
 * none=0 cópias, sf=1 cópia, df=2 cópias
 */
function crossAutosomalDominant(
  fatherDose: string,
  motherDose: string
): { dose: string; probability: number }[] {
  const fatherCopies = fatherDose === "df" ? 2 : fatherDose === "sf" ? 1 : 0;
  const motherCopies = motherDose === "df" ? 2 : motherDose === "sf" ? 1 : 0;
  
  // Cada pai contribui 0 ou 1 cópia
  // Pai com 0 cópias: sempre dá 0
  // Pai com 1 cópia (sf): 50% dá 0, 50% dá 1
  // Pai com 2 cópias (df): sempre dá 1
  const fatherGives = fatherCopies === 0 ? [[0, 1.0]] :
                      fatherCopies === 1 ? [[0, 0.5], [1, 0.5]] :
                      [[1, 1.0]];
  const motherGives = motherCopies === 0 ? [[0, 1.0]] :
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
 * Ligada ao Sexo (Recessiva):
 * Macho ZZ: [Z1, Z2]
 * Fêmea ZW: [Z, null] (W não carrega o gene)
 * 
 * Filhotes machos recebem 1 Z do pai + 1 Z da mãe
 * Filhotes fêmeas recebem 1 Z do pai + W da mãe (só o Z do pai importa)
 */
function crossSexLinked(
  fatherAlleles: [string, string],  // ZZ
  motherAllele: string              // Z (o único que importa, W não carrega)
): { males: AllelePair[]; females: { allele: string; probability: number }[] } {
  // Machos: Z do pai (50% cada) + Z da mãe (sempre o mesmo)
  const maleResults: AllelePair[] = [];
  const maleCombos = [
    { allele1: fatherAlleles[0], allele2: motherAllele, probability: 0.5 },
    { allele1: fatherAlleles[1], allele2: motherAllele, probability: 0.5 },
  ];
  
  // Agrupar machos iguais
  const maleGrouped = new Map<string, number>();
  for (const combo of maleCombos) {
    const key = [combo.allele1, combo.allele2].sort().join("|");
    maleGrouped.set(key, (maleGrouped.get(key) || 0) + combo.probability);
  }
  for (const [key, prob] of Array.from(maleGrouped)) {
    const [allele1, allele2] = key.split("|");
    maleResults.push({ allele1, allele2, probability: prob });
  }
  
  // Fêmeas: Z do pai (50% cada) + W (não carrega = hemizigota)
  const femaleResults = [
    { allele: fatherAlleles[0], probability: 0.5 },
    { allele: fatherAlleles[1], probability: 0.5 },
  ];
  
  // Agrupar fêmeas iguais
  const femaleGrouped = new Map<string, number>();
  for (const f of femaleResults) {
    femaleGrouped.set(f.allele, (femaleGrouped.get(f.allele) || 0) + f.probability);
  }
  const females = Array.from(femaleGrouped.entries()).map(([allele, probability]) => ({ allele, probability }));
  
  return { males: maleResults, females };
}

// ============================================================
// CONVERSÃO DE DADOS DO BANCO PARA GENÓTIPO INTERNO
// ============================================================

interface InternalGenotype {
  sex: "male" | "female";
  // Autossômicas recessivas
  blueSeries: [string, string];
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
  slino: [string, string | null];
  opaline: [string, string | null];
  cinnamon: [string, string | null];
}

/**
 * Converte dados do banco (visual[] + splits[]) para genótipo interno.
 */
export function dataToGenotype(data: BirdGeneticsData, sex: "macho" | "femea"): InternalGenotype {
  const isMale = sex === "macho";
  const visual = data.visual || [];
  const splits = data.splits || [];
  
  // Helper: para um locus recessivo, determinar os 2 alelos
  function getRecessiveAlleles(visualId: string, locusAlleleIds: string[]): [string, string] {
    const wildType = "normal";
    const hasVisual = visual.some(v => locusAlleleIds.includes(v));
    const hasSplit = splits.some(s => locusAlleleIds.includes(s));
    
    if (hasVisual) {
      const mutant = visual.find(v => locusAlleleIds.includes(v))!;
      return [mutant, mutant]; // Homozigoto (visual)
    }
    if (hasSplit) {
      const splitAllele = splits.find(s => locusAlleleIds.includes(s))!;
      return [wildType, splitAllele]; // Heterozigoto (split)
    }
    return [wildType, wildType]; // Normal
  }
  
  // Helper: para locus dominante
  function getDominantDose(sfId: string, dfId: string): string {
    if (visual.includes(dfId)) return "df";
    if (visual.includes(sfId)) return "sf";
    return "none";
  }
  
  // Helper: para locus ligado ao sexo
  function getSexLinkedAlleles(alleleIds: string[]): [string, string | null] {
    const wildType = "normal";
    const hasVisual = visual.some(v => alleleIds.includes(v));
    const hasSplit = splits.some(s => alleleIds.includes(s));
    
    if (isMale) {
      // Macho ZZ
      if (hasVisual) {
        const mutant = visual.find(v => alleleIds.includes(v))!;
        return [mutant, mutant]; // Homozigoto visual
      }
      if (hasSplit) {
        const splitAllele = splits.find(s => alleleIds.includes(s))!;
        return [wildType, splitAllele]; // Split (heterozigoto)
      }
      return [wildType, wildType]; // Normal
    } else {
      // Fêmea ZW — não pode ser split, só visual ou normal
      if (hasVisual) {
        const mutant = visual.find(v => alleleIds.includes(v))!;
        return [mutant, null]; // Hemizigota visual
      }
      return [wildType, null]; // Normal
    }
  }
  
  return {
    sex: isMale ? "male" : "female",
    // Autossômicas recessivas
    blueSeries: getRecessiveAlleles("blue_series", ["blue", "turquoise", "aqua"]),
    cleartail: getRecessiveAlleles("cleartail", ["cleartail"]),
    dilute: getRecessiveAlleles("dilute", ["dilute"]),
    nsino: getRecessiveAlleles("nsino", ["nsino", "bronze_fallow", "pastel"]),
    recPied: getRecessiveAlleles("rec_pied", ["rec_pied"]),
    clearheadFallow: getRecessiveAlleles("clearhead_fallow", ["clearhead_fallow"]),
    dunFallow: getRecessiveAlleles("dun_fallow", ["dun_fallow"]),
    // Dominantes
    darkFactor: getDominantDose("dark_sf", "dark_df"),
    violet: getDominantDose("violet_sf", "violet_df"),
    grey: getDominantDose("grey_sf", "grey_df"),
    domPied: getDominantDose("dom_pied_sf", "dom_pied_df"),
    // Ligadas ao sexo
    slino: getSexLinkedAlleles(["slino", "platinum", "pallid"]),
    opaline: getSexLinkedAlleles(["opaline"]),
    cinnamon: getSexLinkedAlleles(["cinnamon"]),
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
 * Retorna todas as combinações possíveis com probabilidades.
 */
export function calculateBreeding(
  fatherData: BirdGeneticsData,
  motherData: BirdGeneticsData
): BreedingPrediction {
  const father = dataToGenotype(fatherData, "macho");
  const mother = dataToGenotype(motherData, "femea");
  
  // Para cada locus, calcular as possibilidades
  // Depois combinar tudo (produto cartesiano)
  
  // --- Autossômicas Recessivas ---
  const blueResults = crossAutosomalRecessive(father.blueSeries, mother.blueSeries);
  const cleartailResults = crossAutosomalRecessive(father.cleartail, mother.cleartail);
  const diluteResults = crossAutosomalRecessive(father.dilute, mother.dilute);
  const nsinoResults = crossAutosomalRecessive(father.nsino, mother.nsino);
  const recPiedResults = crossAutosomalRecessive(father.recPied, mother.recPied);
  const clearheadResults = crossAutosomalRecessive(father.clearheadFallow, mother.clearheadFallow);
  const dunResults = crossAutosomalRecessive(father.dunFallow, mother.dunFallow);
  
  // --- Autossômicas Dominantes ---
  const darkResults = crossAutosomalDominant(father.darkFactor, mother.darkFactor);
  const violetResults = crossAutosomalDominant(father.violet, mother.violet);
  const greyResults = crossAutosomalDominant(father.grey, mother.grey);
  const domPiedResults = crossAutosomalDominant(father.domPied, mother.domPied);
  
  // --- Ligadas ao Sexo ---
  const slinoSL = crossSexLinked(
    father.slino as [string, string],
    mother.slino[0]
  );
  const opalineSL = crossSexLinked(
    father.opaline as [string, string],
    mother.opaline[0]
  );
  const cinnamonSL = crossSexLinked(
    father.cinnamon as [string, string],
    mother.cinnamon[0]
  );
  
  // Combinar todos os loci para machos e fêmeas separadamente
  const allOffspring: OffspringGenotype[] = [];
  
  // Helper para interpretar resultado de um locus recessivo
  function interpretRecessive(pair: AllelePair, locusId: string): { visual: string | null; split: string | null } {
    const { allele1, allele2 } = pair;
    if (allele1 !== "normal" && allele1 === allele2) {
      return { visual: allele1, split: null }; // Homozigoto mutante = visual
    }
    if (allele1 !== "normal" && allele2 === "normal") {
      return { visual: null, split: allele1 }; // Heterozigoto = split
    }
    if (allele2 !== "normal" && allele1 === "normal") {
      return { visual: null, split: allele2 }; // Heterozigoto = split
    }
    if (allele1 !== "normal" && allele2 !== "normal" && allele1 !== allele2) {
      // Compound heterozygote (rare) — show first as visual
      return { visual: allele1, split: allele2 };
    }
    return { visual: null, split: null }; // Normal
  }
  
  // Helper para interpretar dominante
  function interpretDominant(dose: string, sfId: string, dfId: string): string | null {
    if (dose === "df") return dfId;
    if (dose === "sf") return sfId;
    return null;
  }
  
  // Gerar combinações para MACHOS (50% dos filhotes)
  for (const blue of blueResults) {
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
                        for (const sl of slinoSL.males) {
                          for (const op of opalineSL.males) {
                            for (const cn of cinnamonSL.males) {
                              const prob = blue.probability * ct.probability * dil.probability *
                                nsi.probability * rp.probability * ch.probability * dn.probability *
                                dk.probability * vl.probability * gr.probability * dp.probability *
                                sl.probability * op.probability * cn.probability * 0.5; // 50% machos
                              
                              if (prob < 0.0001) continue; // Skip negligible
                              
                              const visual: string[] = [];
                              const splits: string[] = [];
                              
                              // Blue series
                              const blueInt = interpretRecessive(blue, "blue_series");
                              if (blueInt.visual) visual.push(blueInt.visual);
                              if (blueInt.split) splits.push(blueInt.split);
                              if (!blueInt.visual) visual.push("green"); // Default verde
                              
                              // Cleartail
                              const ctInt = interpretRecessive(ct, "cleartail");
                              if (ctInt.visual) visual.push("cleartail");
                              if (ctInt.split) splits.push("cleartail");
                              
                              // Dilute
                              const dilInt = interpretRecessive(dil, "dilute");
                              if (dilInt.visual) visual.push("dilute");
                              if (dilInt.split) splits.push("dilute");
                              
                              // NSIno
                              const nsiInt = interpretRecessive(nsi, "nsino");
                              if (nsiInt.visual) visual.push(nsiInt.visual);
                              if (nsiInt.split) splits.push(nsiInt.split);
                              
                              // Rec Pied
                              const rpInt = interpretRecessive(rp, "rec_pied");
                              if (rpInt.visual) visual.push("rec_pied");
                              if (rpInt.split) splits.push("rec_pied");
                              
                              // Clearhead Fallow
                              const chInt = interpretRecessive(ch, "clearhead_fallow");
                              if (chInt.visual) visual.push("clearhead_fallow");
                              if (chInt.split) splits.push("clearhead_fallow");
                              
                              // Dun Fallow
                              const dnInt = interpretRecessive(dn, "dun_fallow");
                              if (dnInt.visual) visual.push("dun_fallow");
                              if (dnInt.split) splits.push("dun_fallow");
                              
                              // Dominantes
                              const dkV = interpretDominant(dk.dose, "dark_sf", "dark_df");
                              if (dkV) visual.push(dkV);
                              const vlV = interpretDominant(vl.dose, "violet_sf", "violet_df");
                              if (vlV) visual.push(vlV);
                              const grV = interpretDominant(gr.dose, "grey_sf", "grey_df");
                              if (grV) visual.push(grV);
                              const dpV = interpretDominant(dp.dose, "dom_pied_sf", "dom_pied_df");
                              if (dpV) visual.push(dpV);
                              
                              // Sex-linked (machos ZZ)
                              // SLino
                              if (sl.allele1 !== "normal" && sl.allele1 === sl.allele2) {
                                visual.push(sl.allele1);
                              } else if (sl.allele1 !== "normal" && sl.allele2 === "normal") {
                                splits.push(sl.allele1);
                              } else if (sl.allele2 !== "normal" && sl.allele1 === "normal") {
                                splits.push(sl.allele2);
                              }
                              
                              // Opaline
                              if (op.allele1 !== "normal" && op.allele1 === op.allele2) {
                                visual.push("opaline");
                              } else if (op.allele1 !== "normal" || op.allele2 !== "normal") {
                                if (!(op.allele1 !== "normal" && op.allele1 === op.allele2)) {
                                  splits.push("opaline");
                                }
                              }
                              
                              // Cinnamon
                              if (cn.allele1 !== "normal" && cn.allele1 === cn.allele2) {
                                visual.push("cinnamon");
                              } else if (cn.allele1 !== "normal" || cn.allele2 !== "normal") {
                                if (!(cn.allele1 !== "normal" && cn.allele1 === cn.allele2)) {
                                  splits.push("cinnamon");
                                }
                              }
                              
                              // Remove "green" if there's a blue-series visual
                              const blueSeriesVisuals = ["blue", "turquoise", "aqua"];
                              if (visual.some(v => blueSeriesVisuals.includes(v))) {
                                const greenIdx = visual.indexOf("green");
                                if (greenIdx >= 0) visual.splice(greenIdx, 1);
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
  
  // Gerar combinações para FÊMEAS (50% dos filhotes)
  for (const blue of blueResults) {
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
                        for (const sl of slinoSL.females) {
                          for (const op of opalineSL.females) {
                            for (const cn of cinnamonSL.females) {
                              const prob = blue.probability * ct.probability * dil.probability *
                                nsi.probability * rp.probability * ch.probability * dn.probability *
                                dk.probability * vl.probability * gr.probability * dp.probability *
                                sl.probability * op.probability * cn.probability * 0.5; // 50% fêmeas
                              
                              if (prob < 0.0001) continue;
                              
                              const visual: string[] = [];
                              const splits: string[] = [];
                              
                              // Blue series
                              const blueInt = interpretRecessive(blue, "blue_series");
                              if (blueInt.visual) visual.push(blueInt.visual);
                              if (blueInt.split) splits.push(blueInt.split);
                              if (!blueInt.visual) visual.push("green");
                              
                              // Cleartail
                              const ctInt = interpretRecessive(ct, "cleartail");
                              if (ctInt.visual) visual.push("cleartail");
                              if (ctInt.split) splits.push("cleartail");
                              
                              // Dilute
                              const dilInt = interpretRecessive(dil, "dilute");
                              if (dilInt.visual) visual.push("dilute");
                              if (dilInt.split) splits.push("dilute");
                              
                              // NSIno
                              const nsiInt = interpretRecessive(nsi, "nsino");
                              if (nsiInt.visual) visual.push(nsiInt.visual);
                              if (nsiInt.split) splits.push(nsiInt.split);
                              
                              // Rec Pied
                              const rpInt = interpretRecessive(rp, "rec_pied");
                              if (rpInt.visual) visual.push("rec_pied");
                              if (rpInt.split) splits.push("rec_pied");
                              
                              // Clearhead Fallow
                              const chInt = interpretRecessive(ch, "clearhead_fallow");
                              if (chInt.visual) visual.push("clearhead_fallow");
                              if (chInt.split) splits.push("clearhead_fallow");
                              
                              // Dun Fallow
                              const dnInt = interpretRecessive(dn, "dun_fallow");
                              if (dnInt.visual) visual.push("dun_fallow");
                              if (dnInt.split) splits.push("dun_fallow");
                              
                              // Dominantes
                              const dkV = interpretDominant(dk.dose, "dark_sf", "dark_df");
                              if (dkV) visual.push(dkV);
                              const vlV = interpretDominant(vl.dose, "violet_sf", "violet_df");
                              if (vlV) visual.push(vlV);
                              const grV = interpretDominant(gr.dose, "grey_sf", "grey_df");
                              if (grV) visual.push(grV);
                              const dpV = interpretDominant(dp.dose, "dom_pied_sf", "dom_pied_df");
                              if (dpV) visual.push(dpV);
                              
                              // Sex-linked (fêmeas ZW — hemizigota, sem split possível)
                              if (sl.allele !== "normal") {
                                visual.push(sl.allele);
                              }
                              if (op.allele !== "normal") {
                                visual.push("opaline");
                              }
                              if (cn.allele !== "normal") {
                                visual.push("cinnamon");
                              }
                              
                              // Remove "green" if there's a blue-series visual
                              const blueSeriesVisuals = ["blue", "turquoise", "aqua"];
                              if (visual.some(v => blueSeriesVisuals.includes(v))) {
                                const greenIdx = visual.indexOf("green");
                                if (greenIdx >= 0) visual.splice(greenIdx, 1);
                              }
                              
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
  
  // Agrupar resultados iguais (mesmo fenótipo + genótipo + sexo)
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
  
  // Converter para resultado final
  const offspring: OffspringResult[] = Array.from(grouped.values())
    .map(o => ({
      phenotype: buildPhenotypeName(o.visual),
      genotype: buildGenotypeName(o.visual, o.splits),
      probability: Math.round(o.probability * 10000) / 10000, // 4 casas
      sex: o.sex,
      visual: o.visual,
      splits: o.splits,
    }))
    .filter(o => o.probability >= 0.001) // Mínimo 0.1%
    .sort((a, b) => b.probability - a.probability);
  
  return {
    father: fatherData,
    mother: motherData,
    offspring,
    totalCombinations: offspring.length,
  };
}

// ============================================================
// HELPERS DE FORMATAÇÃO
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
  if (visual.length === 0) return "Normal (Verde)";
  
  // Check for composite names
  const sortedKey = visual.sort().join("+");
  if (COMPOSITE_NAMES[sortedKey]) {
    return COMPOSITE_NAMES[sortedKey];
  }
  
  // Build from individual labels
  return visual.map(getMutationLabel).join(" ");
}

function buildGenotypeName(visual: string[], splits: string[]): string {
  const visualPart = visual.map(getMutationLabel).join(" ");
  if (splits.length === 0) return visualPart || "Normal";
  const splitsPart = splits.map(getMutationLabel).join(" / ");
  return `${visualPart || "Normal"} / ${splitsPart}`;
}

// ============================================================
// FUNÇÃO SIMPLIFICADA PARA CRUZAMENTOS COMUNS
// ============================================================

/**
 * Calcula previsão simplificada para casos onde apenas poucos loci estão envolvidos.
 * Otimizado para não iterar sobre loci que são normais em ambos os pais.
 */
export function calculateBreedingSimplified(
  fatherData: BirdGeneticsData,
  motherData: BirdGeneticsData
): BreedingPrediction {
  // Usar o cálculo completo — a otimização de "skip negligible" já cuida da performance
  return calculateBreeding(fatherData, motherData);
}
