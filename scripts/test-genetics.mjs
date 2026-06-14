/**
 * Teste manual: RN1 (Azul / Ino) x RN2 (Albina Turquesa)
 * 
 * RN1 = Macho Azul split Ino
 *   - Visual: azul
 *   - Splits: ino (slino) — sex-linked
 *   - Parblue: [blue, blue]
 *   - Ino: [normal, slino]
 * 
 * RN2 = Fêmea Albina Turquesa
 *   - "Albina Turquesa" = Turquesa + Ino visual
 *   - Visual: turquoise, slino
 *   - Splits: (nenhum — fêmea não pode ser split sex-linked)
 *   - Parblue: [turquoise, turquoise] — mas pode ser [turquoise, blue]!
 *   - Ino: [slino, null] (hemizigota)
 * 
 * CASO 1: Fêmea é turquesa/turquesa (homozigota)
 * CASO 2: Fêmea é turquesa/azul (heterozigota)
 * 
 * Resultado esperado CASO 2 (mais provável no criatório):
 * Parblue: pai [bl,bl] x mãe [tq,bl]
 *   → 50% turquesa/azul, 50% azul/azul
 * Ino: pai [normal, slino] x mãe [slino, null]
 *   → Machos: 50% normal/slino, 50% slino/slino
 *   → Fêmeas: 50% normal (Z normal do pai), 50% slino (Z slino do pai)
 * 
 * Filhotes esperados:
 * Machos:
 *   25% Turquesa/Azul split Ino (turquesa visual, portador azul e ino)
 *   25% Azul split Ino (azul visual, portador ino)
 *   25% Cremino Turquesa/Azul (turquesa + ino visual = cremino turquesa)
 *   25% Albino (azul + ino visual)
 * Fêmeas:
 *   25% Turquesa/Azul (turquesa visual, portadora azul)
 *   25% Azul (azul visual)
 *   25% Cremino Turquesa (turquesa + ino visual)
 *   25% Albina (azul + ino visual)
 */

import { calculateBreeding, dataToGenotype } from '../shared/geneticsEngine.ts';

// RN1: Macho Azul / Ino
const father = {
  visual: ["blue"],
  splits: ["slino"],
};

// RN2: Fêmea Albina Turquesa (turquesa/azul + ino)
// "Albina turquesa" = turquesa + ino → na verdade é "Cremino Turquesa" se verde base
// Mas como é turquesa + ino = cremino turquesa
// Porém Fernando disse "albina turquesa" — pode significar turquesa/azul + ino
const mother = {
  visual: ["turquoise", "slino"],
  splits: [], // Fêmea não pode ter splits sex-linked
};

console.log("=== CASO: RN1 (Azul / Ino) x RN2 (Albina Turquesa) ===\n");
console.log("Pai genótipo:", JSON.stringify(dataToGenotype(father, "macho"), null, 2));
console.log("\nMãe genótipo:", JSON.stringify(dataToGenotype(mother, "femea"), null, 2));

const result = calculateBreeding(father, mother);

console.log("\n=== PREVISÃO DE FILHOTES ===\n");
console.log(`Total de combinações: ${result.totalCombinations}\n`);

const machos = result.offspring.filter(o => o.sex === "macho");
const femeas = result.offspring.filter(o => o.sex === "femea");

console.log("--- MACHOS ---");
for (const m of machos) {
  console.log(`  ${(m.probability * 100).toFixed(1)}% - ${m.phenotype} | Genótipo: ${m.genotype}`);
}

console.log("\n--- FÊMEAS ---");
for (const f of femeas) {
  console.log(`  ${(f.probability * 100).toFixed(1)}% - ${f.phenotype} | Genótipo: ${f.genotype}`);
}

// Verificação: soma das probabilidades deve ser ~100%
const totalProb = result.offspring.reduce((sum, o) => sum + o.probability, 0);
console.log(`\nSoma total de probabilidades: ${(totalProb * 100).toFixed(1)}%`);

// Verificar que NÃO há "portador de turquesa" nos filhotes
// Turquesa/Azul deve ser VISUAL turquesa, não "portador de turquesa"
const wrongSplits = result.offspring.filter(o => o.splits.includes("turquoise"));
if (wrongSplits.length > 0) {
  console.log("\n❌ ERRO: Encontrados filhotes 'portadores de turquesa' — turquesa é DOMINANTE sobre azul!");
  for (const w of wrongSplits) {
    console.log(`  ${w.phenotype} | splits: ${w.splits.join(", ")}`);
  }
} else {
  console.log("\n✅ CORRETO: Nenhum filhote é 'portador de turquesa' — turquesa é dominante sobre azul!");
}

// Verificar que filhotes turquesa/azul aparecem como TURQUESA VISUAL
const turquoiseVisual = result.offspring.filter(o => o.visual.includes("turquoise"));
if (turquoiseVisual.length > 0) {
  console.log("✅ CORRETO: Filhotes turquesa/azul aparecem como TURQUESA VISUAL");
} else {
  console.log("❌ ERRO: Nenhum filhote turquesa visual encontrado");
}
