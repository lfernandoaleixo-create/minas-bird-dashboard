/**
 * Validação Completa do Engine Genético — Ring Neck
 * 
 * Testa cenários reais conhecidos e valida contra resultados esperados
 * baseados em fontes confiáveis (psittacula-world, AFA Watchbird, GenCalc)
 */

import { calculateBreeding, dataToGenotype } from "../shared/geneticsEngine.ts";

let passed = 0;
let failed = 0;

function test(name, fatherData, motherData, expectedResults) {
  const result = calculateBreeding(fatherData, motherData);
  const errors = [];
  
  // Verificar cada resultado esperado
  for (const expected of expectedResults) {
    const found = result.offspring.find(o => {
      const phenoMatch = expected.phenotype ? 
        o.phenotype.toLowerCase().includes(expected.phenotype.toLowerCase()) : true;
      const sexMatch = expected.sex ? o.sex === expected.sex : true;
      return phenoMatch && sexMatch;
    });
    
    if (!found) {
      errors.push(`  ❌ Esperado "${expected.phenotype}" (${expected.sex || "ambos"}) ~${expected.prob}% — NÃO ENCONTRADO`);
      // Mostrar o que foi gerado
      const similar = result.offspring.filter(o => !expected.sex || o.sex === expected.sex);
      if (similar.length > 0) {
        errors.push(`     Gerados: ${similar.map(o => `${o.phenotype} (${o.sex}) ${(o.probability*100).toFixed(1)}%`).join(", ")}`);
      }
    } else if (expected.prob !== undefined) {
      const actualProb = Math.round(found.probability * 100);
      const expectedProb = Math.round(expected.prob);
      if (Math.abs(actualProb - expectedProb) > 2) { // Tolerância de 2%
        errors.push(`  ⚠️ "${expected.phenotype}" (${expected.sex || found.sex}): esperado ~${expectedProb}%, obtido ${actualProb}%`);
      }
    }
  }
  
  // Verificar que NÃO existem resultados inesperados
  for (const unexpected of (expectedResults.filter(e => e.shouldNotExist))) {
    const found = result.offspring.find(o => 
      o.phenotype.toLowerCase().includes(unexpected.phenotype.toLowerCase()) &&
      (!unexpected.sex || o.sex === unexpected.sex)
    );
    if (found) {
      errors.push(`  ❌ "${unexpected.phenotype}" NÃO deveria existir mas foi gerado com ${(found.probability*100).toFixed(1)}%`);
    }
  }
  
  if (errors.length === 0) {
    console.log(`✅ ${name}`);
    passed++;
  } else {
    console.log(`❌ ${name}`);
    errors.forEach(e => console.log(e));
    // Mostrar todos os resultados para debug
    console.log(`   Todos os resultados (${result.offspring.length}):`);
    result.offspring.forEach(o => {
      console.log(`     ${o.phenotype} (${o.sex}) — ${(o.probability*100).toFixed(1)}% — splits: [${o.splits.join(",")}]`);
    });
    failed++;
  }
}

console.log("=== VALIDAÇÃO COMPLETA DO ENGINE GENÉTICO ===\n");

// ============================================================
// TESTE 1: Caso do Fernando — RN1 Azul/Ino x RN2 Albina Turquesa
// ============================================================
// RN1: Macho Azul split Ino → parblue=[blue,blue], ino=[normal,slino]
// RN2: Fêmea Albina Turquesa → Turquesa + Ino → parblue=[turquoise,blue] ou [turquoise,turquoise]?
// "Albina Turquesa" = ave visualmente branca/cremina com genótipo turquesa + ino
// Fêmea Ino (hemizigota) + Turquesa... mas se é ALBINA, precisa ser azul+ino
// Espera... "Albina Turquesa" = turquesa + ino = CREMINO (não albino!)
// Albino = azul + ino. Se é "Albina Turquesa" provavelmente é turquesa/azul + ino
// Resultado: Turquesa-ino = Cremino. Então ela é turquesa (tq/bl ou tq/tq) + ino
// Vou testar como turquesa/azul + ino (caso mais comum)

console.log("--- TESTE 1: Azul/Ino (M) x Cremina Turquesa (F) ---");
console.log("Pai: Azul visual, split Ino");
console.log("Mãe: Turquesa + Ino (Cremina) — assumindo tq/bl");
test(
  "Caso Fernando: Azul/Ino x Turquesa-Ino (Cremina tq/bl)",
  { visual: ["blue"], splits: ["slino"] },           // Pai: Azul split Ino
  { visual: ["turquoise", "slino"], splits: ["blue"] }, // Mãe: Turquesa/Azul + Ino
  [
    // Machos (50%):
    // Pai dá blue, Mãe dá turquoise ou blue
    // Ino: Pai dá normal ou slino, Mãe dá slino
    // Machos: tq/bl normal/slino (25%) = Turquesa split Ino+Azul
    //         bl/bl normal/slino (25%) = Azul split Ino
    { phenotype: "Turquesa", sex: "macho", prob: 12.5 },  // tq/bl, normal/slino
    { phenotype: "Azul", sex: "macho", prob: 12.5 },      // bl/bl, normal/slino
    // Machos Ino: tq/bl slino/slino = Cremino, bl/bl slino/slino = Albino
    // Mas pai é normal/slino, mãe dá slino → macho recebe normal(pai)+slino(mãe) ou slino(pai)+slino(mãe)
    // Pai [blue,blue] + Mãe [turquoise,blue]: filhos parblue = tq/bl(25%), bl/bl(25%), tq/bl(25%), bl/bl(25%)
    // Não! Pai [blue,blue] → sempre dá blue. Mãe [turquoise,blue] → dá turquoise(50%) ou blue(50%)
    // Parblue filhos: blue+turquoise(50%) = tq/bl = TURQUESA VISUAL, blue+blue(50%) = AZUL
    // Ino machos: Pai [normal,slino] → dá normal(50%) ou slino(50%). Mãe [slino,null] → dá slino
    // Machos: normal+slino(50%) = split ino, slino+slino(50%) = INO VISUAL
    // Combinando:
    // Turquesa split Ino (25%), Turquesa Ino/Cremino (25%), Azul split Ino (25%), Albino (25%)
    // WAIT - mas são 50% machos, então cada um é 12.5% do total
    { phenotype: "Turquesa", sex: "macho", prob: 12.5 },  // tq/bl, split ino
    { phenotype: "Azul", sex: "macho", prob: 12.5 },      // bl/bl, split ino
    // Fêmeas (50%):
    // Fêmeas recebem Z do pai. Pai [normal,slino] → fêmea recebe normal(50%) ou slino(50%)
    // Parblue: mesma lógica → tq/bl(50%) ou bl/bl(50%)
    // Fêmea normal + tq/bl = Turquesa, Fêmea normal + bl/bl = Azul
    // Fêmea ino + tq/bl = Cremina, Fêmea ino + bl/bl = Albina
    { phenotype: "Turquesa", sex: "femea", prob: 12.5 },
    { phenotype: "Azul", sex: "femea", prob: 12.5 },
  ]
);

// ============================================================
// TESTE 2: Verde/Azul x Verde/Azul (clássico mendeliano)
// ============================================================
console.log("\n--- TESTE 2: Verde/Azul x Verde/Azul ---");
console.log("Esperado: 25% Verde, 50% Verde/Azul, 25% Azul");
test(
  "Verde/Azul x Verde/Azul — clássico mendeliano",
  { visual: ["green"], splits: ["blue"] },
  { visual: ["green"], splits: ["blue"] },
  [
    // 25% Verde puro (green/green) — sem split
    // 50% Verde split Azul (green/blue)
    // 25% Azul (blue/blue)
    // Todos ambos sexos (autossômico)
    { phenotype: "Verde", sex: "macho", prob: 18.75 }, // 25%+50%=75% verde visual, /2 sexo = 37.5% mas split diferente
    { phenotype: "Azul", sex: "macho", prob: 12.5 },
    { phenotype: "Azul", sex: "femea", prob: 12.5 },
  ]
);

// ============================================================
// TESTE 3: Turquesa/Azul x Azul (Turquesa dominante sobre Azul)
// ============================================================
console.log("\n--- TESTE 3: Turquesa/Azul (M) x Azul (F) ---");
console.log("Esperado: 50% Turquesa/Azul, 50% Azul");
console.log("CRÍTICO: Turquesa é DOMINANTE sobre Azul — NÃO pode dar 'split turquesa'!");
test(
  "Turquesa/Azul x Azul — dominância turquesa",
  { visual: ["turquoise"], splits: ["blue"] },  // Macho: Turquesa visual (tq/bl)
  { visual: ["blue"], splits: [] },              // Fêmea: Azul (bl/bl)
  [
    // Pai dá: turquoise(50%) ou blue(50%)
    // Mãe dá: blue(100%)
    // Filhos: tq/bl(50%) = TURQUESA VISUAL, bl/bl(50%) = AZUL
    { phenotype: "Turquesa", sex: "macho", prob: 25 },
    { phenotype: "Turquesa", sex: "femea", prob: 25 },
    { phenotype: "Azul", sex: "macho", prob: 25 },
    { phenotype: "Azul", sex: "femea", prob: 25 },
  ]
);

// ============================================================
// TESTE 4: Lutino (M) x Verde (F) — sex-linked
// ============================================================
console.log("\n--- TESTE 4: Lutino (M) x Verde (F) ---");
console.log("Pai Lutino = verde + ino/ino (macho)");
console.log("Mãe Verde = verde + normal (fêmea)");
console.log("Esperado: Machos todos Verde/Ino, Fêmeas todas Lutino");
test(
  "Lutino x Verde — herança sex-linked clássica",
  { visual: ["green", "slino"], splits: [] },  // Pai: Lutino (green + ino/ino)
  { visual: ["green"], splits: [] },            // Mãe: Verde normal
  [
    // Pai [slino,slino] → sempre dá slino
    // Mãe [normal,null] → dá normal para machos
    // Machos: normal(mãe) + slino(pai) = normal/slino = SPLIT INO
    // Fêmeas: recebem Z do pai = slino → LUTINO (hemizigota)
    { phenotype: "Verde", sex: "macho", prob: 50 },  // Verde split Ino
    { phenotype: "Lutino", sex: "femea", prob: 50 }, // Fêmea Lutino
  ]
);

// ============================================================
// TESTE 5: Verde/Ino (M) x Lutino (F) — sex-linked
// ============================================================
console.log("\n--- TESTE 5: Verde/Ino (M) x Lutino (F) ---");
console.log("Esperado: 25% Verde/Ino (M), 25% Lutino (M), 25% Verde (F), 25% Lutino (F)");
test(
  "Verde/Ino x Lutino — sex-linked split",
  { visual: ["green"], splits: ["slino"] },     // Pai: Verde split Ino [normal,slino]
  { visual: ["green", "slino"], splits: [] },   // Mãe: Lutino [slino,null]
  [
    // Pai [normal,slino] → dá normal(50%) ou slino(50%)
    // Mãe [slino,null] → dá slino para machos
    // Machos: normal+slino(50%) = split ino, slino+slino(50%) = Lutino
    // Fêmeas: recebem Z do pai → normal(50%) = Verde, slino(50%) = Lutino
    { phenotype: "Verde", sex: "macho", prob: 25 },   // split ino
    { phenotype: "Lutino", sex: "macho", prob: 25 },
    { phenotype: "Verde", sex: "femea", prob: 25 },
    { phenotype: "Lutino", sex: "femea", prob: 25 },
  ]
);

// ============================================================
// TESTE 6: Azul/Ino (M) x Azul (F) — Albino test
// ============================================================
console.log("\n--- TESTE 6: Azul/Ino (M) x Azul (F) ---");
console.log("Esperado: Machos Azul/Ino + Azul, Fêmeas Azul + Albino");
test(
  "Azul/Ino x Azul — produzir albino",
  { visual: ["blue"], splits: ["slino"] },  // Pai: Azul split Ino [normal,slino]
  { visual: ["blue"], splits: [] },          // Mãe: Azul normal
  [
    // Pai [normal,slino] → normal(50%) ou slino(50%)
    // Mãe [normal,null] → normal para machos
    // Machos: normal+normal(50%) = Azul, normal+slino(50%) = Azul split Ino... 
    // WAIT: Mãe fêmea Azul normal = [normal, null] no ino locus
    // Machos recebem: Z do pai + Z da mãe → pai dá normal ou slino, mãe dá normal
    // Machos: normal(pai)+normal(mãe)=normal/normal, slino(pai)+normal(mãe)=slino/normal=split ino
    // Fêmeas recebem: Z do pai + W da mãe → pai dá normal(50%) ou slino(50%)
    // Fêmeas: normal = Azul, slino = Albino
    { phenotype: "Azul", sex: "macho", prob: 25 },     // normal/normal
    { phenotype: "Azul", sex: "macho", prob: 25 },     // split ino (still shows Azul)
    { phenotype: "Azul", sex: "femea", prob: 25 },
    { phenotype: "Albino", sex: "femea", prob: 25 },
  ]
);

// ============================================================
// TESTE 7: Verde Cinza SF (M) x Verde (F) — Grey dominante completo
// ============================================================
console.log("\n--- TESTE 7: Verde Cinza SF (M) x Verde (F) ---");
console.log("Esperado: 50% Verde Cinza, 50% Verde");
test(
  "Verde Cinza SF x Verde — grey dominante",
  { visual: ["green", "grey_sf"], splits: [] },
  { visual: ["green"], splits: [] },
  [
    // Grey SF x none → 50% SF, 50% none
    { phenotype: "Verde Cinza", sex: "macho", prob: 25 },
    { phenotype: "Verde Cinza", sex: "femea", prob: 25 },
    { phenotype: "Verde", sex: "macho", prob: 25 },
    { phenotype: "Verde", sex: "femea", prob: 25 },
  ]
);

// ============================================================
// TESTE 8: Cobalto (M) x Cobalto (F) — Dark Factor incompleto dominante
// ============================================================
console.log("\n--- TESTE 8: Cobalto (M) x Cobalto (F) ---");
console.log("Cobalto = Azul + Dark SF");
console.log("Esperado: 25% Azul, 50% Cobalto, 25% Malva");
test(
  "Cobalto x Cobalto — dark factor incompleto dominante",
  { visual: ["blue", "dark_sf"], splits: [] },
  { visual: ["blue", "dark_sf"], splits: [] },
  [
    // Dark SF x SF → 25% none, 50% SF, 25% DF
    { phenotype: "Azul", sex: "macho", prob: 12.5 },
    { phenotype: "Azul", sex: "femea", prob: 12.5 },
    { phenotype: "Cobalto", sex: "macho", prob: 25 },
    { phenotype: "Cobalto", sex: "femea", prob: 25 },
    { phenotype: "Malva", sex: "macho", prob: 12.5 },
    { phenotype: "Malva", sex: "femea", prob: 12.5 },
  ]
);

// ============================================================
// TESTE 9: Opalino Azul (M) x Verde (F) — sex-linked opaline
// ============================================================
console.log("\n--- TESTE 9: Opalino Azul (M) x Verde (F) ---");
console.log("Pai: Azul + Opalino (opaline/opaline)");
console.log("Mãe: Verde normal");
console.log("Esperado: Machos Verde/Azul/Opalino, Fêmeas Verde/Azul Opalino");
test(
  "Opalino Azul x Verde — sex-linked opaline + parblue",
  { visual: ["blue", "opaline"], splits: [] },  // Pai: Azul Opalino [opaline,opaline]
  { visual: ["green"], splits: [] },             // Mãe: Verde [normal,null]
  [
    // Parblue: Pai [blue,blue] + Mãe [green,green] → todos green/blue = VERDE split Azul
    // Opaline: Pai [opaline,opaline] → sempre dá opaline
    //   Machos: opaline(pai) + normal(mãe) = normal/opaline = SPLIT opaline
    //   Fêmeas: opaline(pai) + W = OPALINE VISUAL
    { phenotype: "Verde", sex: "macho", prob: 50 },      // Verde/Azul/Opalino (split)
    { phenotype: "Opalino Verde", sex: "femea", prob: 50 }, // Verde/Azul Opalino visual... hmm
    // Na verdade o fenótipo é "Verde" para machos (split opaline não mostra)
    // e "Opalino Verde" para fêmeas (opaline visual + verde/azul)
  ]
);

// ============================================================
// TESTE 10: Pallid/Ino (M) x Pallid (F) — co-dominância no locus ino
// ============================================================
console.log("\n--- TESTE 10: Pallid/Ino (M) x Pallid (F) ---");
console.log("Pai: Pallid visual split Ino [pallid,slino]");
console.log("Mãe: Pallid [pallid,null]");
console.log("Esperado: Machos 50% Pallid/Ino + 50% Ino, Fêmeas 50% Pallid + 50% Ino");
test(
  "Pallid/Ino x Pallid — co-dominância ino locus",
  { visual: ["green", "pallid"], splits: ["slino"] },  // Pai: Verde Pallid split Ino
  { visual: ["green", "pallid"], splits: [] },          // Mãe: Verde Pallid
  [
    // Pai [pallid,slino] → dá pallid(50%) ou slino(50%)
    // Mãe [pallid,null] → dá pallid para machos
    // Machos: pallid+pallid(50%) = Pallid, slino+pallid(50%) = Pallid-ino ou Pallid visual?
    // Segundo psittacula-world: pallid/ino = "Pallid-ino" (intermediário)
    // Fêmeas: recebem Z do pai → pallid(50%) = Pallid, slino(50%) = Lutino/Ino
    { phenotype: "Pallid", sex: "macho", prob: 25 },     // pallid/pallid
    { phenotype: "Lutino", sex: "femea", prob: 25 },     // slino hemizigota
  ]
);

// ============================================================
// TESTE 11: Turquesa (tq/tq) x Azul (bl/bl) — TODOS filhos Turquesa
// ============================================================
console.log("\n--- TESTE 11: Turquesa homozigoto x Azul ---");
console.log("CRÍTICO: TODOS os filhos devem ser Turquesa visual (tq/bl)!");
console.log("NENHUM deve ser 'split turquesa' ou 'portador de turquesa'!");
test(
  "Turquesa (tq/tq) x Azul — dominância total",
  { visual: ["turquoise"], splits: [] },  // Pai: Turquesa homozigoto [tq,tq]
  { visual: ["blue"], splits: [] },        // Mãe: Azul [bl,bl]
  [
    // Pai sempre dá turquoise, Mãe sempre dá blue
    // TODOS filhos = tq/bl = TURQUESA VISUAL
    { phenotype: "Turquesa", sex: "macho", prob: 50 },
    { phenotype: "Turquesa", sex: "femea", prob: 50 },
  ]
);

// ============================================================
// TESTE 12: Verde/Turquesa x Verde/Azul
// ============================================================
console.log("\n--- TESTE 12: Verde/Turquesa (M) x Verde/Azul (F) ---");
console.log("Esperado: Verde (vários splits), Turquesa visual (tq/bl)");
test(
  "Verde/Turquesa x Verde/Azul",
  { visual: ["green"], splits: ["turquoise"] },  // Pai: Verde split Turquesa [green,turquoise]
  { visual: ["green"], splits: ["blue"] },        // Mãe: Verde split Azul [green,blue]
  [
    // Pai dá: green(50%) ou turquoise(50%)
    // Mãe dá: green(50%) ou blue(50%)
    // Combinações:
    // green+green(25%) = Verde puro
    // green+blue(25%) = Verde/Azul
    // turquoise+green(25%) = Verde/Turquesa
    // turquoise+blue(25%) = TURQUESA VISUAL (tq dominante sobre bl!)
    { phenotype: "Verde", sex: "macho" },   // Vários verdes (puro, /azul, /turquesa)
    { phenotype: "Turquesa", sex: "macho", prob: 12.5 },  // tq/bl = Turquesa visual!
    { phenotype: "Turquesa", sex: "femea", prob: 12.5 },
  ]
);

// ============================================================
// RESUMO
// ============================================================
console.log("\n=== RESUMO ===");
console.log(`✅ Passou: ${passed}`);
console.log(`❌ Falhou: ${failed}`);
console.log(`Total: ${passed + failed}`);

if (failed > 0) {
  process.exit(1);
}
