# Ring Neck (Indian Ringneck) - Genética de Mutações

## Fonte: psittaci-gencalc.com + gencalc.com

## Categorias de Herança Genética

### 1. Autossômica Recessiva (Autosomal Recessive)
Ambos os pais precisam carregar o gene para produzir filhotes visuais.
- NSLino (Non Sex-Linked Ino)
  - └ bronze fallow
  - └ pastel
- Blue (Azul)
  - └ turquoise (turquesa)
  - └ aqua
  - └ indigo
- Cleartail
- Clearhead fallow
- Dun fallow
- Rec. pied (pied recessivo)
- Rec. edged (edged recessivo)
- Dilute

### 2. Autossômica Dominante (Autosomal Dominant)
Apenas um gene é necessário para expressão visual. DF = duplo fator, SF = simples fator.
- Dark (fator escuro)
- Violet (violeta)
- Deep
- Grey (cinza)
- Misty
- Khaki
- Slaty
- Dom. pied (pied dominante)
- Spangle

### 3. Heterossômica Recessiva (Sex-Linked Recessive / Ligada ao sexo)
Herança ligada ao cromossomo Z. Machos podem ser split, fêmeas são visuais ou não carregam.
- SLino (Sex-Linked Ino = Lutino)
  - └ platinum
  - └ pallid
- Opaline
- Cinnamon

### 4. Heterossômica Dominante (Sex-Linked Dominant)
- SL edged (edged ligado ao sexo)

## Regras de Herança

### Cromossomos Sexuais em Aves
- Macho: ZZ
- Fêmea: ZW

### Autossômica Recessiva
- Visual x Visual = 100% Visual
- Visual x Split = 50% Visual + 50% Split
- Visual x Normal = 100% Split
- Split x Split = 25% Visual + 50% Split + 25% Normal
- Split x Normal = 50% Split + 50% Normal

### Autossômica Dominante
- DF x DF = 100% DF
- DF x SF = 50% DF + 50% SF
- DF x Normal = 100% SF
- SF x SF = 25% DF + 50% SF + 25% Normal
- SF x Normal = 50% SF + 50% Normal

### Ligada ao Sexo (Recessiva)
- Macho Visual x Fêmea Visual = 100% machos visuais + 100% fêmeas visuais
- Macho Visual x Fêmea Normal = 100% machos split + 100% fêmeas visuais
- Macho Split x Fêmea Visual = 50% machos visuais + 50% machos split + 50% fêmeas visuais + 50% fêmeas normais
- Macho Split x Fêmea Normal = 50% machos split + 50% machos normais + 50% fêmeas visuais + 50% fêmeas normais
- Macho Normal x Fêmea Visual = 100% machos split + 100% fêmeas normais
- Macho Normal x Fêmea Normal = 100% normais

## Mutações Comuns no Brasil (Ring Neck)
- Verde (selvagem/normal)
- Azul (recessivo)
- Lutino (ligado ao sexo)
- Violeta (dominante)
- Turquesa (recessivo, alelo do azul)
- Opalino (ligado ao sexo)
- Canela/Cinnamon (ligado ao sexo)
- Pallid/Lacewing (ligado ao sexo)
- Cleartail (recessivo)
- Pied (dominante ou recessivo)
- Dark (dominante - fator escuro)
- Cinza/Grey (dominante)
- Dilute (recessivo)

## Combinações Populares
- Azul + Violeta = Violeta Cobalto
- Azul + Dark SF = Cobalto
- Azul + Dark DF = Malva
- Verde + Dark SF = Verde Escuro
- Verde + Dark DF = Oliva
- Turquesa + Violeta = Turquesa Violeta
- Azul + Cleartail = Cleartail Azul
- Lutino + Azul (split) = possibilidade de Albino

## Calculadora Galpão das Aves (Brasil) - Mutações Disponíveis

### Machos:
ALBINO, AZUL TURQUESA, AZUL TURQUESA/CANELA, AZUL TURQUESA/INO, CINZA TURQUESA, CINZA/CANELA, CINZA/CANELA/INO, CINZA/INO, COBALTO/CANELA, CREMINO, LUTINO, LUTINO/AZUL, SILVER, SILVER TURQUESA, SKUBLUE TURQUESA, SKYBLUE, SKYBLUE TURQUESA, VERDE, VERDE CINZA/AZUL, VERDE CINZA/AZUL/CANELA, VERDE/AZUL, VERDE/AZUL/CANELA, VERDE/AZUL/INO, VERDE/CANELA, VIOLETA CANELA TURQUESA, VIOLETA/CANELA

## Resumo da Lógica da Calculadora

A calculadora genética funciona com base em:
1. Cada mutação tem um modo de herança (recessiva, dominante, ligada ao sexo)
2. Cada ave tem genótipo (visual + splits ocultos)
3. Para cada locus genético, aplica-se um quadrado de Punnett
4. Os resultados de todos os loci são multiplicados para dar as probabilidades finais
5. O sexo importa para mutações ligadas ao cromossomo Z (fêmeas ZW não podem ser split para sex-linked)

## Implementação Proposta para o Sistema Minas Bird

### Dados necessários por ave:
- Espécie
- Mutação visual (fenótipo)
- Splits conhecidos (genótipo oculto)
- Sexo

### Loci genéticos para Ring Neck (Indian Ringneck):
1. **Série Azul** (autossômico recessivo): verde (selvagem) vs azul vs turquesa vs aqua
2. **Ino** (ligado ao sexo recessivo): normal vs SLino (lutino/albino) vs platinum vs pallid
3. **Opalino** (ligado ao sexo recessivo): normal vs opaline
4. **Canela** (ligado ao sexo recessivo): normal vs cinnamon
5. **Fator Escuro** (autossômico dominante): 0 (claro) vs SF (médio) vs DF (escuro)
6. **Violeta** (autossômico dominante): 0 vs SF vs DF
7. **Cinza** (autossômico dominante): 0 vs SF vs DF
8. **Cleartail** (autossômico recessivo): normal vs cleartail
9. **Dilute** (autossômico recessivo): normal vs dilute
10. **Pied dominante** (autossômico dominante): 0 vs SF vs DF

### Algoritmo:
Para cada locus:
1. Determinar alelos do pai (2 alelos para autossômico, Z+Z para macho sex-linked)
2. Determinar alelos da mãe (2 alelos para autossômico, Z+W para fêmea sex-linked)
3. Calcular quadrado de Punnett → probabilidades por genótipo
4. Converter genótipo em fenótipo

Combinar todos os loci → produto cartesiano das probabilidades → resultado final com % de cada fenótipo+genótipo possível nos filhotes.
