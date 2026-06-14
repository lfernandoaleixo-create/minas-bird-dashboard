# Genética do Cabeça de Ameixa (Psittacula cyanocephala)

## Fontes consultadas:
- psittacula-world.com (referência principal)
- GenCalc.com (calculadora genética)
- NeorniLab (testes de DNA)

## Mutações confirmadas e herança:

### Dominante:
- **Greygreen (Cinza Verde / Verde Cinza)** — Dominante autossômica
  - SF (fator simples) = Verde Cinza visual
  - DF (fator duplo) = Verde Cinza visual (mais intenso)
  - Nota: "Olive" é usado erroneamente; Olive = duplo fator escuro na série verde

### Autossômica Recessiva:
- **Azul (Blue)** — Muito rara, possivelmente extinta
- **Turquesa (Turquois Blue)** — Muito rara
  - Nota: "Provavelmente recessiva em relação ao tipo selvagem e Dominante em relação ao Azul"
  - Mesmo padrão do Ring Neck: série alélica Verde > Turquesa > Azul
- **Diluído (Dilute)** — "Yellow black-eyed", olhos escuros
- **Lutino Recessivo (Rec. Lutino / NSL Lutino)** — Difícil de criar
- **Faded (Pastel)** — Parece Canela mas mais amarelo, sem tom marrom
- **Arlequim Recessivo (Rec. Pied)** — Manchas por todo corpo

### Dominante:
- **Arlequim Dominante (Dom. Pied)** — Manchas por todo corpo

### Ligada ao Sexo (Sex-linked recessive):
- **Lutino SL** — Mais fácil de criar que o Rec. Lutino
- **Canela (Cinnamon)** — Erroneamente chamada "Isabel"
- **Opalino (Opaline)** — Marcas claras nas penas das asas

## PARA O PLANTEL DO FERNANDO (Verde + Verde Cinza):

### Cruzamentos possíveis:

1. **Verde x Verde** = 100% Verde
2. **Verde Cinza (SF) x Verde** = 50% Verde Cinza (SF) + 50% Verde
3. **Verde Cinza (SF) x Verde Cinza (SF)** = 25% Verde Cinza (DF) + 50% Verde Cinza (SF) + 25% Verde
4. **Verde Cinza (DF) x Verde** = 100% Verde Cinza (SF)
5. **Verde Cinza (DF) x Verde Cinza (SF)** = 50% Verde Cinza (DF) + 50% Verde Cinza (SF)
6. **Verde Cinza (DF) x Verde Cinza (DF)** = 100% Verde Cinza (DF)

### Regras do Cinza no Cabeça de Ameixa:
- Cinza (Grey/Greygreen) é **DOMINANTE** — igual ao Ring Neck
- SF e DF são visualmente similares (dominância completa) — difícil distinguir sem teste
- Não existe "split" de cinza — se tem o gene, mostra visualmente
- Ave verde NÃO pode ser portadora de cinza (é dominante)

### Conclusão para implementação:
- Para Verde e Verde Cinza, a lógica é IDÊNTICA ao Ring Neck
- O gene Cinza funciona da mesma forma em ambas as espécies
- Posso usar o mesmo engine com segurança para esse caso específico
