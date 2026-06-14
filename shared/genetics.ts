/**
 * Genética de Mutações — Ring Neck (Psittacula krameri)
 * 
 * Tabela de referência padronizada em português para parametrização
 * do sistema de cálculo genético.
 * 
 * Notação de splits: "Verde / Azul / Cleartail" = ave visualmente Verde,
 * portadora de Azul e Cleartail no sangue.
 * 
 * Regras:
 * - Espaços em branco na "/" são apenas formatação
 * - Fêmeas NÃO podem ser split para mutações ligadas ao sexo
 * - Machos podem ser split para qualquer mutação
 */

// ============================================================
// TIPOS DE HERANÇA
// ============================================================

export type InheritanceMode = 
  | "autosomal_recessive"    // Autossômica Recessiva
  | "autosomal_dominant"     // Autossômica Dominante  
  | "sex_linked_recessive"   // Ligada ao Sexo (Recessiva)
  | "sex_linked_dominant";   // Ligada ao Sexo (Dominante)

export type DominantDose = "none" | "sf" | "df"; // Simples Fator / Duplo Fator

export interface MutationLocus {
  id: string;
  name: string;              // Nome em português
  nameEn: string;            // Nome em inglês (referência)
  inheritance: InheritanceMode;
  alleles: MutationAllele[];
  description: string;
}

export interface MutationAllele {
  id: string;
  name: string;              // Nome em português
  nameEn: string;            // Nome em inglês
  isWildType: boolean;       // Se é o tipo selvagem (normal)
}

// ============================================================
// LOCI GENÉTICOS DO RING NECK
// ============================================================

export const RINGNECK_LOCI: MutationLocus[] = [
  // --- AUTOSSÔMICAS RECESSIVAS ---
  {
    id: "blue_series",
    name: "Série Azul",
    nameEn: "Blue Series",
    inheritance: "autosomal_recessive",
    description: "Controla a presença de psitacina (pigmento amarelo). Azul remove o amarelo, Turquesa reduz parcialmente.",
    alleles: [
      { id: "green", name: "Verde (Selvagem)", nameEn: "Green (Wild Type)", isWildType: true },
      { id: "blue", name: "Azul", nameEn: "Blue", isWildType: false },
      { id: "turquoise", name: "Turquesa", nameEn: "Turquoise", isWildType: false },
      { id: "aqua", name: "Aqua", nameEn: "Aqua", isWildType: false },
    ],
  },
  {
    id: "cleartail",
    name: "Cleartail",
    nameEn: "Cleartail",
    inheritance: "autosomal_recessive",
    description: "Remove melanina das penas da cauda e asas, deixando-as claras.",
    alleles: [
      { id: "normal", name: "Normal", nameEn: "Normal", isWildType: true },
      { id: "cleartail", name: "Cleartail", nameEn: "Cleartail", isWildType: false },
    ],
  },
  {
    id: "dilute",
    name: "Diluído",
    nameEn: "Dilute",
    inheritance: "autosomal_recessive",
    description: "Dilui a melanina em toda a plumagem, clareando a cor.",
    alleles: [
      { id: "normal", name: "Normal", nameEn: "Normal", isWildType: true },
      { id: "dilute", name: "Diluído", nameEn: "Dilute", isWildType: false },
    ],
  },
  {
    id: "nsino",
    name: "NSL Ino",
    nameEn: "Non Sex-Linked Ino",
    inheritance: "autosomal_recessive",
    description: "Remove melanina de forma não ligada ao sexo. Inclui variantes Bronze Fallow e Pastel.",
    alleles: [
      { id: "normal", name: "Normal", nameEn: "Normal", isWildType: true },
      { id: "nsino", name: "NSL Ino", nameEn: "NSL Ino", isWildType: false },
      { id: "bronze_fallow", name: "Bronze Fallow", nameEn: "Bronze Fallow", isWildType: false },
      { id: "pastel", name: "Pastel", nameEn: "Pastel", isWildType: false },
    ],
  },
  {
    id: "rec_pied",
    name: "Arlequim Recessivo",
    nameEn: "Recessive Pied",
    inheritance: "autosomal_recessive",
    description: "Manchas irregulares sem melanina na plumagem (herança recessiva).",
    alleles: [
      { id: "normal", name: "Normal", nameEn: "Normal", isWildType: true },
      { id: "rec_pied", name: "Arlequim Recessivo", nameEn: "Recessive Pied", isWildType: false },
    ],
  },
  {
    id: "clearhead_fallow",
    name: "Clearhead Fallow",
    nameEn: "Clearhead Fallow",
    inheritance: "autosomal_recessive",
    description: "Cabeça clara com olhos vermelhos, corpo com melanina reduzida.",
    alleles: [
      { id: "normal", name: "Normal", nameEn: "Normal", isWildType: true },
      { id: "clearhead_fallow", name: "Clearhead Fallow", nameEn: "Clearhead Fallow", isWildType: false },
    ],
  },
  {
    id: "dun_fallow",
    name: "Dun Fallow",
    nameEn: "Dun Fallow",
    inheritance: "autosomal_recessive",
    description: "Variante fallow com tom acastanhado (dun).",
    alleles: [
      { id: "normal", name: "Normal", nameEn: "Normal", isWildType: true },
      { id: "dun_fallow", name: "Dun Fallow", nameEn: "Dun Fallow", isWildType: false },
    ],
  },

  // --- AUTOSSÔMICAS DOMINANTES ---
  {
    id: "dark_factor",
    name: "Fator Escuro",
    nameEn: "Dark Factor",
    inheritance: "autosomal_dominant",
    description: "Escurece a cor base. SF = médio (ex: Cobalto), DF = escuro (ex: Malva).",
    alleles: [
      { id: "none", name: "Sem Fator Escuro", nameEn: "No Dark Factor", isWildType: true },
      { id: "sf", name: "Fator Escuro SF", nameEn: "Dark Factor SF", isWildType: false },
      { id: "df", name: "Fator Escuro DF", nameEn: "Dark Factor DF", isWildType: false },
    ],
  },
  {
    id: "violet",
    name: "Violeta",
    nameEn: "Violet",
    inheritance: "autosomal_dominant",
    description: "Adiciona tonalidade violeta. Mais visível em aves azuis com SF dark.",
    alleles: [
      { id: "none", name: "Sem Violeta", nameEn: "No Violet", isWildType: true },
      { id: "sf", name: "Violeta SF", nameEn: "Violet SF", isWildType: false },
      { id: "df", name: "Violeta DF", nameEn: "Violet DF", isWildType: false },
    ],
  },
  {
    id: "grey",
    name: "Cinza",
    nameEn: "Grey",
    inheritance: "autosomal_dominant",
    description: "Adiciona cinza à plumagem. Em aves verdes produz verde-cinza, em azuis produz cinza.",
    alleles: [
      { id: "none", name: "Sem Cinza", nameEn: "No Grey", isWildType: true },
      { id: "sf", name: "Cinza SF", nameEn: "Grey SF", isWildType: false },
      { id: "df", name: "Cinza DF", nameEn: "Grey DF", isWildType: false },
    ],
  },
  {
    id: "dom_pied",
    name: "Arlequim Dominante",
    nameEn: "Dominant Pied",
    inheritance: "autosomal_dominant",
    description: "Manchas sem melanina (herança dominante). DF = mais manchas que SF.",
    alleles: [
      { id: "none", name: "Sem Arlequim", nameEn: "No Pied", isWildType: true },
      { id: "sf", name: "Arlequim Dominante SF", nameEn: "Dominant Pied SF", isWildType: false },
      { id: "df", name: "Arlequim Dominante DF", nameEn: "Dominant Pied DF", isWildType: false },
    ],
  },

  // --- LIGADAS AO SEXO (RECESSIVAS) ---
  {
    id: "slino",
    name: "Ino (Lutino/Albino)",
    nameEn: "Sex-Linked Ino (Lutino/Albino)",
    inheritance: "sex_linked_recessive",
    description: "Remove toda melanina. Em verde = Lutino (amarelo). Em azul = Albino (branco). Inclui variantes Platinum e Pallid.",
    alleles: [
      { id: "normal", name: "Normal", nameEn: "Normal", isWildType: true },
      { id: "slino", name: "Ino (Lutino/Albino)", nameEn: "SL Ino", isWildType: false },
      { id: "platinum", name: "Platinum", nameEn: "Platinum", isWildType: false },
      { id: "pallid", name: "Pallid", nameEn: "Pallid", isWildType: false },
    ],
  },
  {
    id: "opaline",
    name: "Opalino",
    nameEn: "Opaline",
    inheritance: "sex_linked_recessive",
    description: "Redistribui melanina, criando padrão diferente nas asas e cabeça.",
    alleles: [
      { id: "normal", name: "Normal", nameEn: "Normal", isWildType: true },
      { id: "opaline", name: "Opalino", nameEn: "Opaline", isWildType: false },
    ],
  },
  {
    id: "cinnamon",
    name: "Canela",
    nameEn: "Cinnamon",
    inheritance: "sex_linked_recessive",
    description: "Converte melanina preta em marrom (canela), suavizando a cor.",
    alleles: [
      { id: "normal", name: "Normal", nameEn: "Normal", isWildType: true },
      { id: "cinnamon", name: "Canela", nameEn: "Cinnamon", isWildType: false },
    ],
  },
];

// ============================================================
// TABELA DE PARAMETRIZAÇÃO EM PORTUGUÊS
// ============================================================

/**
 * Mutações visuais disponíveis para seleção no formulário.
 * Organizadas por categoria de herança.
 */
export const VISUAL_MUTATIONS = {
  // Cores base (série azul)
  base: [
    { id: "green", label: "Verde" },
    { id: "blue", label: "Azul" },
    { id: "turquoise", label: "Turquesa" },
    { id: "aqua", label: "Aqua" },
  ],
  // Modificadores dominantes
  dominant: [
    { id: "dark_sf", label: "Fator Escuro SF" },
    { id: "dark_df", label: "Fator Escuro DF" },
    { id: "violet_sf", label: "Violeta SF" },
    { id: "violet_df", label: "Violeta DF" },
    { id: "grey_sf", label: "Cinza SF" },
    { id: "grey_df", label: "Cinza DF" },
    { id: "dom_pied_sf", label: "Arlequim Dominante SF" },
    { id: "dom_pied_df", label: "Arlequim Dominante DF" },
  ],
  // Recessivas autossômicas
  recessive: [
    { id: "cleartail", label: "Cleartail" },
    { id: "dilute", label: "Diluído" },
    { id: "nsino", label: "NSL Ino" },
    { id: "bronze_fallow", label: "Bronze Fallow" },
    { id: "pastel", label: "Pastel" },
    { id: "rec_pied", label: "Arlequim Recessivo" },
    { id: "clearhead_fallow", label: "Clearhead Fallow" },
    { id: "dun_fallow", label: "Dun Fallow" },
  ],
  // Ligadas ao sexo
  sexLinked: [
    { id: "slino", label: "Ino" },
    { id: "platinum", label: "Platinum" },
    { id: "pallid", label: "Pallid" },
    { id: "opaline", label: "Opalino" },
    { id: "cinnamon", label: "Canela" },
  ],
};

/**
 * Splits disponíveis para seleção.
 * Fêmeas NÃO podem ter splits ligados ao sexo.
 */
export const AVAILABLE_SPLITS = {
  // Splits autossômicos (disponíveis para machos e fêmeas)
  autosomal: [
    { id: "blue", label: "Azul" },
    { id: "turquoise", label: "Turquesa" },
    { id: "aqua", label: "Aqua" },
    { id: "cleartail", label: "Cleartail" },
    { id: "dilute", label: "Diluído" },
    { id: "nsino", label: "NSL Ino" },
    { id: "bronze_fallow", label: "Bronze Fallow" },
    { id: "pastel", label: "Pastel" },
    { id: "rec_pied", label: "Arlequim Recessivo" },
    { id: "clearhead_fallow", label: "Clearhead Fallow" },
    { id: "dun_fallow", label: "Dun Fallow" },
  ],
  // Splits ligados ao sexo (SOMENTE para machos)
  sexLinked: [
    { id: "slino", label: "Ino" },
    { id: "platinum", label: "Platinum" },
    { id: "pallid", label: "Pallid" },
    { id: "opaline", label: "Opalino" },
    { id: "cinnamon", label: "Canela" },
  ],
};

// ============================================================
// NOMES COMPOSTOS COMUNS (para exibição)
// ============================================================

/**
 * Combinações populares com nomes conhecidos no Brasil.
 * Usado para exibir o fenótipo de forma amigável.
 */
export const COMPOSITE_NAMES: Record<string, string> = {
  // Keys MUST be alphabetically sorted to match engine's [...visual].sort().join("+")
  // === Fator Escuro ===
  "blue+dark_sf": "Cobalto",
  "blue+dark_df": "Malva",
  "dark_sf+green": "Verde Escuro",
  "dark_df+green": "Oliva",
  // === Violeta ===
  "blue+violet_sf": "Violeta",
  "blue+dark_sf+violet_sf": "Violeta Cobalto",
  // === Ino (Lutino/Albino/Cremino) ===
  "blue+slino": "Albino",
  "green+slino": "Lutino",
  "slino+turquoise": "Cremino",
  "aqua+slino": "Cremino Aqua",
  // === Canela ===
  "blue+cinnamon": "Skyblue",
  "cinnamon+green": "Canela",
  "cinnamon+turquoise": "Canela Turquesa",
  "aqua+cinnamon": "Canela Aqua",
  // === Opalino ===
  "blue+opaline": "Opalino Azul",
  "green+opaline": "Opalino",
  "opaline+turquoise": "Opalino Turquesa",
  "aqua+opaline": "Opalino Aqua",
  // === Cleartail ===
  "blue+cleartail": "Clear Azul",
  "cleartail+green": "Clear Verde",
  "cleartail+turquoise": "Clear Turquesa",
  "aqua+cleartail": "Clear Aqua",
  // === Cinza ===
  "blue+grey_sf": "Cinza",
  "green+grey_sf": "Verde Cinza",
  "grey_sf+turquoise": "Turquesa Cinza",
  "aqua+grey_sf": "Aqua Cinza",
  // === Pallid ===
  "blue+pallid": "Pallid Azul",
  "green+pallid": "Pallid Verde",
  "pallid+turquoise": "Pallid Turquesa",
  "aqua+pallid": "Pallid Aqua",
  // === Pallid-ino ===
  "green+pallidino": "Pallid-ino Verde",
  "blue+pallidino": "Pallid-ino Azul",
  "pallidino+turquoise": "Pallid-ino Turquesa",
  // === Arlequim ===
  "green+rec_pied": "Arlequim Recessivo Verde",
  "blue+rec_pied": "Arlequim Recessivo Azul",
  "rec_pied+turquoise": "Arlequim Recessivo Turquesa",
  "aqua+rec_pied": "Arlequim Recessivo Aqua",
  "dom_pied_sf+green": "Arlequim Dominante Verde",
  "blue+dom_pied_sf": "Arlequim Dominante Azul",
  "dom_pied_sf+turquoise": "Arlequim Dominante Turquesa",
  // === Diluído ===
  "dilute+green": "Diluído Verde",
  "blue+dilute": "Diluído Azul",
  "dilute+turquoise": "Diluído Turquesa",
  // === NSL Ino ===
  "green+nsino": "NSL Ino Verde",
  "blue+nsino": "NSL Ino Azul",
  "nsino+turquoise": "NSL Ino Turquesa",
  // === Combinações Múltiplas Comuns ===
  // Silver = Cinza + Canela (azul + cinza + canela)
  "blue+cinnamon+grey_sf": "Silver",
  "cinnamon+green+grey_sf": "Canela Verde Cinza",
  "cinnamon+grey_sf+turquoise": "Silver Turquesa",
  // Skyblue combinações
  "blue+cinnamon+dark_sf": "Cobalto Canela",
  // Opalino + Canela
  "blue+cinnamon+opaline": "Opalino Canela Azul",
  "cinnamon+green+opaline": "Opalino Canela",
  "cinnamon+opaline+turquoise": "Opalino Canela Turquesa",
  // Ino combinações
  "blue+opaline+slino": "Albino Opalino",
  "green+opaline+slino": "Lutino Opalino",
  "opaline+slino+turquoise": "Cremino Opalino",
  "blue+cinnamon+slino": "Albino Canela",
  "cinnamon+green+slino": "Lutino Canela",
  "cinnamon+slino+turquoise": "Cremino Canela",
  // Violeta combinações
  "cinnamon+turquoise+violet_sf": "Violeta Canela Turquesa",
  "blue+cinnamon+violet_sf": "Violeta Canela",
  "cinnamon+green+violet_sf": "Violeta Canela Verde",
  // Cobalto combinações
  "dark_sf+turquoise": "Turquesa Cobalto",
  "cinnamon+dark_sf+turquoise": "Canela Turquesa Cobalto",
};

// ============================================================
// CABEÇA DE AMEIXA (Psittacula cyanocephala)
// ============================================================

/**
 * Mutações visuais disponíveis para Cabeça de Ameixa.
 * Atualmente apenas Verde (ancestral) e Verde Cinza (Greygreen).
 * 
 * Verde Cinza é autossômica DOMINANTE:
 * - SF e DF são ambos visuais (dominância completa)
 * - Não existe "split para cinza" (gene dominante)
 */
export const CABECA_AMEIXA_VISUAL_MUTATIONS = {
  base: [
    { id: "green", label: "Verde" },
  ],
  dominant: [
    { id: "grey_sf", label: "Verde Cinza SF" },
    { id: "grey_df", label: "Verde Cinza DF" },
  ],
  recessive: [] as { id: string; label: string }[],
  sexLinked: [] as { id: string; label: string }[],
};

/**
 * Splits disponíveis para Cabeça de Ameixa.
 * Como Verde Cinza é dominante, NÃO existe split para cinza.
 * Atualmente não há splits disponíveis para esta espécie.
 */
export const CABECA_AMEIXA_AVAILABLE_SPLITS = {
  autosomal: [] as { id: string; label: string }[],
  sexLinked: [] as { id: string; label: string }[],
};

/**
 * Nomes compostos para Cabeça de Ameixa.
 */
export const CABECA_AMEIXA_COMPOSITE_NAMES: Record<string, string> = {
  "green+grey_sf": "Verde Cinza",
  "green+grey_df": "Verde Cinza",
  "grey_sf": "Verde Cinza",
  "grey_df": "Verde Cinza",
};

// ============================================================
// SELEÇÃO POR ESPÉCIE
// ============================================================

export type SpeciesId = "psittacula-krameri" | "psittacula-cyanocephala";

export function getVisualMutationsForSpecies(speciesId: SpeciesId) {
  if (speciesId === "psittacula-cyanocephala") return CABECA_AMEIXA_VISUAL_MUTATIONS;
  return VISUAL_MUTATIONS;
}

export function getAvailableSplitsForSpecies(speciesId: SpeciesId) {
  if (speciesId === "psittacula-cyanocephala") return CABECA_AMEIXA_AVAILABLE_SPLITS;
  return AVAILABLE_SPLITS;
}

export function getCompositeNamesForSpecies(speciesId: SpeciesId) {
  if (speciesId === "psittacula-cyanocephala") return CABECA_AMEIXA_COMPOSITE_NAMES;
  return COMPOSITE_NAMES;
}

// ============================================================
// INTERFACE DO GENÓTIPO DA AVE
// ============================================================

export interface BirdGenotype {
  sex: "male" | "female";
  // Loci autossômicos (2 alelos cada)
  blueSeries: [string, string];      // ex: ["green", "blue"] = verde split azul
  cleartail: [string, string];
  dilute: [string, string];
  nsino: [string, string];
  recPied: [string, string];
  clearheadFallow: [string, string];
  dunFallow: [string, string];
  // Loci dominantes (dose)
  darkFactor: DominantDose;
  violet: DominantDose;
  grey: DominantDose;
  domPied: DominantDose;
  // Loci ligados ao sexo
  // Macho: [Z1, Z2], Fêmea: [Z, null] (W não carrega o gene)
  slino: [string, string | null];
  opaline: [string, string | null];
  cinnamon: [string, string | null];
}

// ============================================================
// FORMATO SIMPLIFICADO PARA ARMAZENAMENTO NO BANCO
// ============================================================

/**
 * Formato de armazenamento no banco de dados.
 * Armazena como JSON string no campo `genetics` da tabela plantel.
 * 
 * Exemplo:
 * {
 *   visual: ["green", "violet_sf", "opaline"],
 *   splits: ["blue", "cleartail"]
 * }
 */
export interface BirdGeneticsData {
  visual: string[];   // IDs das mutações visuais
  splits: string[];   // IDs dos splits (portador)
}

/**
 * Formata o genótipo para exibição no padrão do criatório.
 * Exemplo: "Verde / Azul / Arlequim Recessivo / Cleartail"
 */
export function formatGenotype(data: BirdGeneticsData): string {
  const allMutations = [
    ...VISUAL_MUTATIONS.base,
    ...VISUAL_MUTATIONS.dominant,
    ...VISUAL_MUTATIONS.recessive,
    ...VISUAL_MUTATIONS.sexLinked,
  ];
  
  const visualLabels = data.visual
    .map(id => allMutations.find(m => m.id === id)?.label || id)
    .filter(Boolean);
  
  const splitLabels = data.splits
    .map(id => {
      const found = [...AVAILABLE_SPLITS.autosomal, ...AVAILABLE_SPLITS.sexLinked]
        .find(s => s.id === id);
      return found?.label || id;
    })
    .filter(Boolean);

  if (splitLabels.length === 0) {
    return visualLabels.join(" ");
  }
  
  return `${visualLabels.join(" ")} / ${splitLabels.join(" / ")}`;
}
