# Genética Correta do Ring Neck — Série Azul (Parblue Locus)

## LOCUS PARBLUE (Psittacina) — MESMO LOCUS, ALELOS MÚLTIPLOS

O Ring Neck tem **UM ÚNICO LOCUS** que controla a redução de psittacina (pigmento amarelo/vermelho).
Neste locus existem **4 alelos** com a seguinte hierarquia de dominância:

```
Verde (Selvagem/+) > Aqua > Turquesa > Azul
```

### Relação de dominância:
- **Verde (+)** = Selvagem = dominante sobre todos
- **Aqua** = Recessivo ao Verde, DOMINANTE sobre Turquesa e Azul
- **Turquesa** = Recessivo ao Verde e Aqua, DOMINANTE sobre Azul
- **Azul** = Recessivo a TODOS (mais recessivo da série)

### Fonte: psittacula-world.com
- Aqua: "Autosomal recessive with respect to the Wildtype and Dominant with respect to Blue and Turquoise"
- Turquoise: "Autosomal recessive with respect to the Wildtype and Dominant with respect to Blue"
- Blue: "Autosomal recessive"

### Fonte: IndianRingNeck.com forum
- "Blue, turquoise and acqua are supposed to be different alleles of the same locus, presenting an order of dominance as follows: acqua > turquoise > blue"

## IMPLICAÇÃO PARA O CÁLCULO:

### Caso do Fernando: RN1 (Azul / Ino) x RN2 (Albina Turquesa)

- RN1 = Macho Azul split Ino
  - Locus Parblue: bl/bl (homozigoto azul)
  - Locus Ino (sex-linked): Ino/+ (split ino)
  
- RN2 = Fêmea Albina Turquesa (= Turquesa + Ino)
  - Locus Parblue: tq/bl (heterozigota turquesa/azul) — porque é ALBINA, ou seja, tem Ino que mascara, mas a base é turquesa. Se fosse tq/tq seria turquesa pura.
  - Locus Ino (sex-linked): Ino (fêmea é hemizigota)

### Cruzamento Parblue (bl/bl x tq/bl):
- 50% tq/bl = Turquesa (visual) split Azul
- 50% bl/bl = Azul (visual)

### NÃO É "todos portadores de turquesa"!
O erro anterior era tratar Turquesa como gene separado recessivo. Na realidade:
- Turquesa é DOMINANTE sobre Azul
- São alelos do MESMO locus
- Um filhote tq/bl é VISUALMENTE Turquesa (não "portador")

## OUTROS LOCI INDEPENDENTES (genes separados):

| Locus | Alelos | Herança |
|-------|--------|---------|
| Parblue | +, aqua, turquoise, blue | Série alélica (mesmo locus) |
| Dark Factor | +, D | Incompleta dominante (SF/DF) |
| Violet | +, V | Incompleta dominante (SF/DF) |
| Grey | +, Gr | Completa dominante |
| Ino | +, ino | Sex-linked recessivo |
| Cinnamon | +, cin | Sex-linked recessivo |
| Opaline | +, op | Sex-linked recessivo |
| Pallid | +, pal | Sex-linked recessivo |
| Cleartail | +, ct | Autossômico recessivo |
| Dilute | +, dil | Autossômico recessivo |
| NSL Ino | +, nsl | Autossômico recessivo |
| Rec. Pied | +, rp | Autossômico recessivo |
| Dom. Pied | +, dp | Autossômico dominante (SF/DF) |
| Bronze Fallow | +, bf | Autossômico recessivo |
| Clearhead Fallow | +, chf | Autossômico recessivo |

## REGRAS PARA O ENGINE:

1. **Locus Parblue** = série alélica com 4 alelos. Cada ave tem 2 alelos neste locus.
   - Verde/Verde = Verde
   - Verde/Aqua = Verde (split aqua)
   - Verde/Turquesa = Verde (split turquesa)
   - Verde/Azul = Verde (split azul)
   - Aqua/Aqua = Aqua visual
   - Aqua/Turquesa = Aqua visual (split turquesa? não, é Aqua pois aqua > turquesa)
   - Aqua/Azul = Aqua visual
   - Turquesa/Turquesa = Turquesa visual
   - Turquesa/Azul = Turquesa visual (NÃO é "split turquesa"! É VISUALMENTE turquesa!)
   - Azul/Azul = Azul visual

2. **Notação de split** para série alélica:
   - Verde / Azul = Verde com alelo azul oculto
   - Verde / Turquesa = Verde com alelo turquesa oculto
   - Turquesa/Azul = Turquesa VISUAL (o azul está "oculto" mas a ave É turquesa)
   - Na prática, split só faz sentido quando o alelo dominante mascara o recessivo

3. **Loci sex-linked**: Fêmeas são hemizigotas (só 1 alelo). Machos têm 2 alelos.

4. **Loci autossômicos recessivos simples**: Cada ave tem 2 alelos (+/+ = normal, +/m = split, m/m = visual)

## LOCI SEX-LINKED — INFORMAÇÃO CRUCIAL

Segundo MUTAVI (Inte Onsman, 2006):

### Locus INO (sex-linked):
- Alelos: ino+ (selvagem) > ino^pd (pallid) > ino
- Dominância: ino+ > pallid > ino
- Ino e Pallid são ALELOS DO MESMO LOCUS!
- Macho: pode ser ino/ino, pallid/ino (pallidino), pallid/pallid
- Fêmea: hemizigota (só 1 alelo) — ino OU pallid

### Locus CINNAMON (sex-linked):
- SEPARADO do locus Ino
- Pode estar no MESMO cromossomo Z (linked/type 1) ou em Z diferentes (type 2)
- Cinnamon é um locus independente no cromossomo Z

### Locus OPALINE (sex-linked):
- SEPARADO dos outros (locus próprio no cromossomo Z)
- Pesquisas indicam que Opaline é independente de Ino e Cinnamon

### RESUMO DOS LOCI SEX-LINKED:
| Locus | Alelos | Notas |
|-------|--------|-------|
| Ino | +, pallid, ino | Série alélica (pallid = ino parcial) |
| Cinnamon | +, cin | Locus separado no Z |
| Opaline | +, op | Locus separado no Z |

**IMPORTANTE**: Ino e Pallid NÃO são loci separados! São alelos do MESMO locus!
Um macho NÃO pode ser split para Ino E Pallid ao mesmo tempo no sentido de ter ambos ocultos — ele tem 2 alelos nesse locus (pode ser pallid/ino = pallidino).

## CONFIRMAÇÃO FINAL DE MÚLTIPLAS FONTES:

### AFA Watchbird (artigo científico):
> "When one parent bird contributes a turquoise gene and the other a blue gene, the resulting offspring will be visually turquoise, because turquoise is dominant over blue."

### GenCalc.com (calculadora de referência):
- Na interface: "bl; bl · blue; |_turquoise(parblue)"
- Turquoise é listado como alelo do locus blue (parblue)
- Ao selecionar "Turquoise" visual + "Blue" split = ave com genótipo tq/bl

### IndianRingNeck.com forum:
> "Select the 'Turquoise' under the VISUAL column and 'Blue' under the SPLITS TO column. This bird has one Turquoise gene and one Blue gene."
- Confirma: tq/bl = VISUAL turquesa (não "portador de turquesa")

### Conclusão para o caso do Fernando:
**RN1 (Azul/Ino) x RN2 (Albina Turquesa)**

Se RN2 é albina turquesa, ela é: Turquesa + Ino (sex-linked)
- Genótipo parblue: pode ser tq/tq ou tq/bl
- Se a fêmea é de linhagem turquesa pura: tq/tq
- Se a fêmea veio de cruzamento turquesa x azul: tq/bl

**Cenário 1: RN2 = tq/tq (turquesa pura)**
- Pai bl/bl x Mãe tq/tq
- Filhotes: 100% tq/bl = TODOS TURQUESA VISUAL (não "portadores"!)

**Cenário 2: RN2 = tq/bl (turquesa split azul)**
- Pai bl/bl x Mãe tq/bl
- Filhotes: 50% tq/bl (Turquesa visual) + 50% bl/bl (Azul visual)

Em NENHUM caso os filhotes seriam "portadores de turquesa" — Turquesa é DOMINANTE sobre Azul, então quem tem tq/bl É turquesa visual!
