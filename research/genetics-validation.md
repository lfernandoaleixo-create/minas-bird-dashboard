# Validação Completa — Genética Ring Neck (Psittacula krameri)

## Fontes Consultadas:
1. AFA Watchbird Magazine (Fred Perry, Vol. 24 No. 3, 1997)
2. Psittacula-World.com (Z. Rana, referência internacional)
3. GenCalc.com (calculadora genética de referência)
4. IndianRingNeck.com forum
5. BirdTracks.io calculator

---

## LOCUS PARBLUE (Série Azul) — VALIDADO ✅

**Hierarquia de dominância**: Verde(+) > Aqua > Turquesa > Azul

| Genótipo | Fenótipo Visual | Fonte |
|----------|----------------|-------|
| +/+ | Verde | Todas |
| +/aqua | Verde (split aqua) | psittacula-world |
| +/tq | Verde (split turquesa) | psittacula-world |
| +/bl | Verde (split azul) | Todas |
| aqua/aqua | Aqua | psittacula-world |
| aqua/tq | Aqua | psittacula-world (aqua dom. sobre tq) |
| aqua/bl | Aqua | psittacula-world (aqua dom. sobre bl) |
| tq/tq | Turquesa | Todas |
| tq/bl | TURQUESA VISUAL | AFA Watchbird + GenCalc + forum |
| bl/bl | Azul | Todas |

**Regra crítica (AFA Watchbird)**: "A blue ringneck cannot be split to turquoise, because if even one allele possessed a turquoise gene matched to a blue gene, the bird will be visually turquoise."

**Regra (AFA Watchbird)**: "Whenever a turquoise gene matches up to a corresponding blue gene (Bb), the offspring will ALWAYS be visually turquoise."

---

## DARK FACTOR — VALIDADO ✅

**Herança**: Incompleta dominante (codominante)
**Fonte**: psittacula-world.com

| Genótipo | Fenótipo (série verde) | Fenótipo (série azul) | Fenótipo (série turquesa) |
|----------|----------------------|---------------------|--------------------------|
| +/+ | Verde | Azul | Turquesa |
| D/+ | Verde Escuro (Darkgreen) | Cobalto | Turquesa Cobalto |
| D/D | Oliva | Malva (Mauve) | Turquesa Malva |

**Nota importante**: "A Green bird with Violet is sometimes called Darkgreen, which is actually wrong."

---

## VIOLET FACTOR — VALIDADO ✅

**Herança**: Incompleta dominante
**Fonte**: psittacula-world.com

| Genótipo | Efeito |
|----------|--------|
| V/+ (SF) | Violeta Single Factor — modifica a cor base |
| V/V (DF) | Violeta Double Factor — mais intenso |

**Nota**: "Violet combined with Blue will result in visual Violets (Violet Blue)."
- SF Violet em Verde = Violet Green (confundido com Darkgreen)
- SF Violet em Azul = Violet Blue
- DF Violet em Azul = Violet (mais intenso)

---

## GREY FACTOR — VALIDADO ✅

**Herança**: Completa dominante (NÃO incompleta!)
**Fonte**: psittacula-world.com

| Genótipo | Efeito |
|----------|--------|
| Gr/+ | Cinza (Greygreen na série verde, Grey na série azul) |
| Gr/Gr | Mesmo visual que Gr/+ (dominância completa) |

**Nota**: "Dominant in Blue-series" — Grey se manifesta visualmente tanto em SF quanto DF.
**Nota do forum**: "It is not possible for Grey to be an allele of Blue or vice versa. One inherits dominant and the other recessive."

---

## INO LOCUS (Sex-linked) — VALIDADO ✅

**Herança**: Sex-linked recessivo
**Alelos no mesmo locus**: + (normal) > Pallid > Ino

**Fonte psittacula-world**: "Pallid behaves co-dominant towards Ino"
- Pallid/Pallid = Pallid visual
- Ino/Ino = Lutino/Albino visual
- Pallid/Ino = Pallid-ino (intermediário — "much duller and lighter than genuine Pallids, lack wing markings")

**Regra para fêmeas**: Hemizigotas — só 1 alelo (Ino OU Pallid OU +)

---

## CINNAMON — VALIDADO ✅

**Herança**: Sex-linked recessivo
**Locus**: SEPARADO do Ino (locus próprio no cromossomo Z)
**Fonte**: psittacula-world.com

---

## OPALINE — VALIDADO ✅

**Herança**: Sex-linked recessivo
**Locus**: SEPARADO do Ino e Cinnamon (locus próprio no Z)
**Fonte**: psittacula-world.com

---

## DOM. EDGED (Lacewing/Misty) — ATENÇÃO ⚠️

**Herança**: Incompleta dominante (sex-linked dominant!)
**Fonte psittacula-world**: "Inheritance seems to be co-dominant, but has been proven sex-linked dominant. Hens are always Single Factor and Cocks can be Single Factor and Double Factor."

**NOTA**: Este é um caso especial — sex-linked DOMINANTE (não recessivo como os outros sex-linked).

---

## MISTY — ATENÇÃO ⚠️

**Herança**: Incompleta dominante
**Fonte**: psittacula-world.com
**Nota**: "A remarkable mutation which still is rather unknown."

---

## LOCI AUTOSSÔMICOS RECESSIVOS SIMPLES — VALIDADOS ✅

| Mutação | Herança | Fonte |
|---------|---------|-------|
| Cleartail | Autossômica recessiva | psittacula-world |
| Dilute | Autossômica recessiva | psittacula-world |
| NSL Lutino (Rec. Lutino) | Autossômica recessiva | psittacula-world |
| Rec. Pied | Autossômica recessiva | psittacula-world |
| Bronze Fallow | Autossômica recessiva | psittacula-world |
| Clearhead Fallow | Autossômica recessiva | psittacula-world |
| Rec. Edged | Autossômica recessiva | psittacula-world |
| Grizzle | Autossômica recessiva | psittacula-world |

---

## DOM. PIED — VALIDADO ✅

**Herança**: Dominante (completa)
**Fonte**: psittacula-world.com

---

## CLEAR FLIGHT — ATENÇÃO ⚠️

**Herança**: "(In)Complete dominant" — incerta
**Fonte**: psittacula-world.com
**Nota**: "More research is needed"

---

## ERROS POTENCIAIS NO NOSSO ENGINE:

1. ✅ Parblue: série alélica correta (Verde > Aqua > Turquesa > Azul)
2. ⚠️ Grey: nosso engine trata como "none/SF/DF" mas deveria ser dominância COMPLETA (SF = DF visualmente)
3. ⚠️ Dom. Edged: não implementado — é sex-linked DOMINANTE (caso especial)
4. ⚠️ Misty: não implementado — incompleta dominante
5. ⚠️ Pallid/Ino: psittacula-world diz "co-dominant" entre si — Pallid-ino é intermediário
6. ⚠️ Rec. Lutino (NSL Ino): é SEPARADO do SL Ino — são loci diferentes!
7. ⚠️ Clear Flight: herança incerta, não deveria estar no cálculo

---

## CORREÇÕES NECESSÁRIAS NO ENGINE:

1. **Grey**: Mudar de "none/SF/DF" para "none/present" — dominância completa, SF e DF são iguais visualmente
2. **Pallid/Ino co-dominância**: Pallid/Ino = Pallid-ino (fenótipo intermediário, não Pallid puro nem Ino puro)
3. **NSL Ino vs SL Ino**: São genes DIFERENTES em loci DIFERENTES. NSL Ino = autossômico recessivo. SL Ino = sex-linked recessivo. Ambos produzem lutino/albino mas por mecanismos diferentes.
4. **Dom. Edged**: Se incluir, é sex-linked DOMINANTE (não recessivo)
