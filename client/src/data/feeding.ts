/**
 * Feeding Module Data — Minas Bird Dashboard
 * 39 espécies oficiais do formulário IEF/SisFauna
 * Dados nutricionais integrados do banco de dados do criatório
 * Tropical Craft Design
 */

export type FeedingStrategy =
  | "Granívoro"
  | "Frugívoro"
  | "Granívoro Seletivo"
  | "Nectarívoro"
  | "Onívoro"
  | "Herbívoro";

export type SpeciesGroup =
  | "Psittacula"
  | "Cacatua"
  | "Rosella"
  | "Neophema"
  | "Polytelis"
  | "Forpus"
  | "Australiano Pequeno"
  | "Australiano Médio"
  | "Africano Grande"
  | "Africano Médio"
  | "Frugívoro";

export type LifePeriod = "Manutenção" | "Reprodução" | "Crescimento" | "Muda";

export interface Species {
  id: string;
  scientificName: string;
  commonName: string;
  group: SpeciesGroup;
  feedingStrategy: FeedingStrategy;
  weightRange: { min: number; max: number }; // gramas
  kFactor: number; // para cálculo MER
  dailyRation: number; // gramas de ração por ave
  dailySalad: number; // gramas de salada por ave
  dailySeeds: number; // gramas de sementes por ave
  saladDays: number; // dias por semana que recebe salada (5 = seg-sex, 7 = todos)
  supplementDays: string[]; // dias que recebe suplemento
  notes: string;
  inCurrentFlock: boolean; // se está no plantel atual
  currentCount: number; // quantidade atual no criatório
}

export interface FoodItem {
  id: string;
  name: string;
  category: "Vegetal" | "Fruta" | "Semente" | "Ração" | "Suplemento" | "Proteína";
  energyKcal: number; // Kcal/Kg
  vitaminA: "Alta" | "Média" | "Baixa" | "Pobre";
  calcium: "Alto" | "Médio" | "Baixo";
  recommended: boolean;
  notes: string;
}

export interface DailyProtocol {
  dayOfWeek: string;
  morning: string[];
  afternoon: string[];
}

export interface GroupProtocol {
  groupId: string;
  groupName: string;
  species: string[]; // IDs das espécies
  rationPot: string;
  rationAmount: string;
  saladComposition: string[];
  weeklyProtocol: DailyProtocol[];
  importantNotes: string[];
}

// ============================================
// 39 ESPÉCIES OFICIAIS (Formulário IEF/SisFauna)
// ============================================

export const species: Species[] = [
  // --- PSITTACULA ---
  {
    id: "psittacula-krameri",
    scientificName: "Psittacula krameri",
    commonName: "Ringneck",
    group: "Psittacula",
    feedingStrategy: "Granívoro",
    weightRange: { min: 95, max: 143 },
    kFactor: 196,
    dailyRation: 15,
    dailySalad: 15,
    dailySeeds: 5,
    saladDays: 5,
    supplementDays: ["Segunda", "Quarta", "Sexta"],
    notes: "Espécie mais numerosa do plantel. Protocolo alimentar bem estabelecido.",
    inCurrentFlock: true,
    currentCount: 72,
  },
  {
    id: "psittacula-cyanocephala",
    scientificName: "Psittacula cyanocephala",
    commonName: "Cabeça de Ameixa",
    group: "Psittacula",
    feedingStrategy: "Granívoro",
    weightRange: { min: 56, max: 85 },
    kFactor: 196,
    dailyRation: 15,
    dailySalad: 15,
    dailySeeds: 5,
    saladDays: 5,
    supplementDays: ["Segunda", "Quarta", "Sexta"],
    notes: "Mesmo protocolo dos Ringnecks. Porte menor, monitorar peso.",
    inCurrentFlock: true,
    currentCount: 15,
  },
  {
    id: "psittacula-eupatria",
    scientificName: "Psittacula eupatria",
    commonName: "Alexandrino",
    group: "Psittacula",
    feedingStrategy: "Granívoro",
    weightRange: { min: 198, max: 258 },
    kFactor: 196,
    dailyRation: 15,
    dailySalad: 15,
    dailySeeds: 5,
    saladDays: 5,
    supplementDays: ["Segunda", "Quarta", "Sexta"],
    notes: "Maior das Psittaculas. Pode necessitar porção ligeiramente maior.",
    inCurrentFlock: true,
    currentCount: 7,
  },
  {
    id: "psittacula-alexandri",
    scientificName: "Psittacula alexandri",
    commonName: "Moustache",
    group: "Psittacula",
    feedingStrategy: "Granívoro",
    weightRange: { min: 100, max: 130 },
    kFactor: 196,
    dailyRation: 15,
    dailySalad: 15,
    dailySeeds: 5,
    saladDays: 5,
    supplementDays: ["Segunda", "Quarta", "Sexta"],
    notes: "Protocolo padrão Psittacula.",
    inCurrentFlock: true,
    currentCount: 5,
  },
  {
    id: "psittacula-derbiana",
    scientificName: "Psittacula derbiana",
    commonName: "Derbiano",
    group: "Psittacula",
    feedingStrategy: "Granívoro",
    weightRange: { min: 300, max: 350 },
    kFactor: 196,
    dailyRation: 20,
    dailySalad: 20,
    dailySeeds: 8,
    saladDays: 5,
    supplementDays: ["Segunda", "Quarta", "Sexta"],
    notes: "Maior Psittacula. Porção ajustada pelo porte. Monitorar consumo.",
    inCurrentFlock: false,
    currentCount: 0,
  },

  // --- POLYTELIS ---
  {
    id: "polytelis-anthopeplus",
    scientificName: "Polytelis anthopeplus",
    commonName: "Regente",
    group: "Polytelis",
    feedingStrategy: "Granívoro",
    weightRange: { min: 130, max: 175 },
    kFactor: 196,
    dailyRation: 15,
    dailySalad: 15,
    dailySeeds: 5,
    saladDays: 5,
    supplementDays: ["Segunda", "Quarta", "Sexta"],
    notes: "Recebe protocolo Psittacula por porte/metabolismo similar (recomendação veterinária).",
    inCurrentFlock: true,
    currentCount: 7,
  },
  {
    id: "polytelis-alexandrae",
    scientificName: "Polytelis alexandrae",
    commonName: "Príncipe de Gales",
    group: "Polytelis",
    feedingStrategy: "Granívoro",
    weightRange: { min: 92, max: 120 },
    kFactor: 196,
    dailyRation: 15,
    dailySalad: 15,
    dailySeeds: 5,
    saladDays: 5,
    supplementDays: ["Segunda", "Quarta", "Sexta"],
    notes: "Protocolo Psittacula. Ave delicada, monitorar consumo.",
    inCurrentFlock: false,
    currentCount: 0,
  },
  {
    id: "polytelis-swainsonii",
    scientificName: "Polytelis swainsonii",
    commonName: "Barraband",
    group: "Polytelis",
    feedingStrategy: "Granívoro",
    weightRange: { min: 133, max: 157 },
    kFactor: 196,
    dailyRation: 15,
    dailySalad: 15,
    dailySeeds: 5,
    saladDays: 5,
    supplementDays: ["Segunda", "Quarta", "Sexta"],
    notes: "Protocolo Psittacula.",
    inCurrentFlock: false,
    currentCount: 0,
  },

  // --- ECLECTUS (FRUGÍVORO) ---
  {
    id: "eclectus-roratus",
    scientificName: "Eclectus roratus",
    commonName: "Papagaio Ecletus",
    group: "Frugívoro",
    feedingStrategy: "Frugívoro",
    weightRange: { min: 355, max: 615 },
    kFactor: 196,
    dailyRation: 35,
    dailySalad: 25,
    dailySeeds: 5,
    saladDays: 7,
    supplementDays: ["Segunda", "Quarta", "Sexta"],
    notes: "Frugívoro com trato digestivo longo. Sensível a excesso de vitaminas artificiais, conservantes e corantes. Salada TODOS os dias.",
    inCurrentFlock: true,
    currentCount: 9,
  },

  // --- PAPAGAIO DO CONGO ---
  {
    id: "psittacus-erithacus",
    scientificName: "Psittacus erithacus",
    commonName: "Papagaio do Congo",
    group: "Africano Grande",
    feedingStrategy: "Granívoro",
    weightRange: { min: 402, max: 490 },
    kFactor: 196,
    dailyRation: 35,
    dailySalad: 25,
    dailySeeds: 5,
    saladDays: 7,
    supplementDays: ["Segunda", "Quarta", "Sexta"],
    notes: "Protocolo similar ao Ecletus pelo porte. Necessita enriquecimento ambiental. Suplementar cálcio.",
    inCurrentFlock: true,
    currentCount: 3,
  },

  // --- KING PARROT ---
  {
    id: "alisterus-scapularis",
    scientificName: "Alisterus scapularis",
    commonName: "Periquito King",
    group: "Australiano Médio",
    feedingStrategy: "Granívoro",
    weightRange: { min: 195, max: 275 },
    kFactor: 196,
    dailyRation: 25,
    dailySalad: 20,
    dailySeeds: 5,
    saladDays: 7,
    supplementDays: ["Segunda", "Quarta", "Sexta"],
    notes: "Australiano de médio porte. Aprecia frutas e vegetais frescos.",
    inCurrentFlock: true,
    currentCount: 1,
  },

  // --- REDWING ---
  {
    id: "aprosmictus-erythropterus",
    scientificName: "Aprosmictus erythropterus",
    commonName: "Periquito RedWing",
    group: "Australiano Médio",
    feedingStrategy: "Granívoro",
    weightRange: { min: 130, max: 170 },
    kFactor: 196,
    dailyRation: 20,
    dailySalad: 15,
    dailySeeds: 5,
    saladDays: 5,
    supplementDays: ["Segunda", "Quarta", "Sexta"],
    notes: "Australiano. Protocolo intermediário.",
    inCurrentFlock: false,
    currentCount: 0,
  },

  // --- BARNARDIUS ---
  {
    id: "barnardius-barnardi",
    scientificName: "Barnardius barnardi",
    commonName: "Barnard",
    group: "Australiano Médio",
    feedingStrategy: "Granívoro",
    weightRange: { min: 120, max: 150 },
    kFactor: 196,
    dailyRation: 15,
    dailySalad: 15,
    dailySeeds: 5,
    saladDays: 5,
    supplementDays: ["Segunda", "Quarta", "Sexta"],
    notes: "Rosella australiana. Protocolo padrão médio porte.",
    inCurrentFlock: false,
    currentCount: 0,
  },
  {
    id: "barnardius-zonarius",
    scientificName: "Barnardius zonarius",
    commonName: "Port Lincoln",
    group: "Australiano Médio",
    feedingStrategy: "Granívoro",
    weightRange: { min: 120, max: 200 },
    kFactor: 196,
    dailyRation: 18,
    dailySalad: 15,
    dailySeeds: 5,
    saladDays: 5,
    supplementDays: ["Segunda", "Quarta", "Sexta"],
    notes: "Maior que o Barnard. Ajustar porção pelo peso.",
    inCurrentFlock: false,
    currentCount: 0,
  },

  // --- CACATUAS ---
  {
    id: "cacatua-alba",
    scientificName: "Cacatua alba",
    commonName: "Cacatua Alba",
    group: "Cacatua",
    feedingStrategy: "Granívoro",
    weightRange: { min: 400, max: 800 },
    kFactor: 196,
    dailyRation: 40,
    dailySalad: 30,
    dailySeeds: 8,
    saladDays: 7,
    supplementDays: ["Segunda", "Quarta", "Sexta"],
    notes: "Cacatua grande. Necessita enriquecimento ambiental intenso. Tendência a obesidade.",
    inCurrentFlock: false,
    currentCount: 0,
  },
  {
    id: "cacatua-galerita",
    scientificName: "Cacatua galerita",
    commonName: "Cacatua Galerita",
    group: "Cacatua",
    feedingStrategy: "Granívoro",
    weightRange: { min: 815, max: 975 },
    kFactor: 196,
    dailyRation: 45,
    dailySalad: 35,
    dailySeeds: 10,
    saladDays: 7,
    supplementDays: ["Segunda", "Quarta", "Sexta"],
    notes: "Maior cacatua. Porção generosa. Monitorar peso e comportamento.",
    inCurrentFlock: false,
    currentCount: 0,
  },
  {
    id: "cacatua-goffiniana",
    scientificName: "Cacatua goffiniana",
    commonName: "Cacatua Goffini",
    group: "Cacatua",
    feedingStrategy: "Granívoro",
    weightRange: { min: 250, max: 390 },
    kFactor: 196,
    dailyRation: 30,
    dailySalad: 25,
    dailySeeds: 5,
    saladDays: 7,
    supplementDays: ["Segunda", "Quarta", "Sexta"],
    notes: "Menor cacatua. Muito ativa, necessita enriquecimento.",
    inCurrentFlock: false,
    currentCount: 0,
  },
  {
    id: "cacatua-moluccensis",
    scientificName: "Cacatua moluccensis",
    commonName: "Cacatua Moluca",
    group: "Cacatua",
    feedingStrategy: "Granívoro",
    weightRange: { min: 775, max: 1000 },
    kFactor: 196,
    dailyRation: 45,
    dailySalad: 35,
    dailySeeds: 10,
    saladDays: 7,
    supplementDays: ["Segunda", "Quarta", "Sexta"],
    notes: "Cacatua grande. Sensível emocionalmente. Dieta variada essencial.",
    inCurrentFlock: false,
    currentCount: 0,
  },
  {
    id: "cacatua-ophthalmica",
    scientificName: "Cacatua ophthalmica",
    commonName: "Cacatua Ophthalmica",
    group: "Cacatua",
    feedingStrategy: "Granívoro",
    weightRange: { min: 500, max: 600 },
    kFactor: 196,
    dailyRation: 35,
    dailySalad: 30,
    dailySeeds: 8,
    saladDays: 7,
    supplementDays: ["Segunda", "Quarta", "Sexta"],
    notes: "Cacatua rara. Protocolo padrão cacatua.",
    inCurrentFlock: false,
    currentCount: 0,
  },
  {
    id: "cacatua-pastinator",
    scientificName: "Cacatua pastinator",
    commonName: "Cacatua Pastinator",
    group: "Cacatua",
    feedingStrategy: "Granívoro",
    weightRange: { min: 450, max: 600 },
    kFactor: 196,
    dailyRation: 35,
    dailySalad: 30,
    dailySeeds: 8,
    saladDays: 7,
    supplementDays: ["Segunda", "Quarta", "Sexta"],
    notes: "Também conhecida como Sanguinea. Protocolo padrão cacatua.",
    inCurrentFlock: false,
    currentCount: 0,
  },
  {
    id: "cacatua-sulphurea",
    scientificName: "Cacatua sulphurea",
    commonName: "Cacatua Sulphurea",
    group: "Cacatua",
    feedingStrategy: "Granívoro",
    weightRange: { min: 300, max: 400 },
    kFactor: 196,
    dailyRation: 30,
    dailySalad: 25,
    dailySeeds: 5,
    saladDays: 7,
    supplementDays: ["Segunda", "Quarta", "Sexta"],
    notes: "Cacatua de crista amarela. Espécie criticamente ameaçada.",
    inCurrentFlock: false,
    currentCount: 0,
  },
  {
    id: "eolophus-roseicapillus",
    scientificName: "Eolophus roseicapillus",
    commonName: "Cacatua Galah",
    group: "Cacatua",
    feedingStrategy: "Granívoro",
    weightRange: { min: 270, max: 350 },
    kFactor: 196,
    dailyRation: 30,
    dailySalad: 25,
    dailySeeds: 5,
    saladDays: 7,
    supplementDays: ["Segunda", "Quarta", "Sexta"],
    notes: "Tendência forte a obesidade. Controlar gordura na dieta. Evitar girassol em excesso.",
    inCurrentFlock: false,
    currentCount: 0,
  },

  // --- KAKARIKI ---
  {
    id: "cyanoramphus-novaezelandiae",
    scientificName: "Cyanoramphus novaezelandiae",
    commonName: "Kakariki",
    group: "Australiano Pequeno",
    feedingStrategy: "Granívoro",
    weightRange: { min: 50, max: 113 },
    kFactor: 196,
    dailyRation: 12,
    dailySalad: 10,
    dailySeeds: 5,
    saladDays: 5,
    supplementDays: ["Segunda", "Quarta", "Sexta"],
    notes: "Ave muito ativa. Metabolismo acelerado. Forrageia no chão.",
    inCurrentFlock: false,
    currentCount: 0,
  },

  // --- FORPUS ---
  {
    id: "forpus-coelestis",
    scientificName: "Forpus coelestis",
    commonName: "Forpus Celeste",
    group: "Forpus",
    feedingStrategy: "Granívoro Seletivo",
    weightRange: { min: 25, max: 35 },
    kFactor: 196,
    dailyRation: 8,
    dailySalad: 5,
    dailySeeds: 3,
    saladDays: 5,
    supplementDays: ["Segunda", "Quarta", "Sexta"],
    notes: "Menor psitacídeo do plantel. Porções pequenas mas frequentes.",
    inCurrentFlock: false,
    currentCount: 0,
  },
  {
    id: "forpus-conspicillatus",
    scientificName: "Forpus conspicillatus",
    commonName: "Forpus Conspicillatus",
    group: "Forpus",
    feedingStrategy: "Granívoro Seletivo",
    weightRange: { min: 25, max: 35 },
    kFactor: 196,
    dailyRation: 8,
    dailySalad: 5,
    dailySeeds: 3,
    saladDays: 5,
    supplementDays: ["Segunda", "Quarta", "Sexta"],
    notes: "Similar ao Forpus Celeste. Mesmas necessidades nutricionais.",
    inCurrentFlock: false,
    currentCount: 0,
  },

  // --- NEOPHEMA ---
  {
    id: "neophema-chrysostoma",
    scientificName: "Neophema chrysostoma",
    commonName: "Neophema Asa Azul",
    group: "Neophema",
    feedingStrategy: "Granívoro",
    weightRange: { min: 40, max: 55 },
    kFactor: 196,
    dailyRation: 10,
    dailySalad: 8,
    dailySeeds: 5,
    saladDays: 5,
    supplementDays: ["Segunda", "Quarta", "Sexta"],
    notes: "Periquito australiano pequeno. Gosta de forragear no chão.",
    inCurrentFlock: false,
    currentCount: 0,
  },
  {
    id: "neophema-pulchella",
    scientificName: "Neophema pulchella",
    commonName: "Turquasine",
    group: "Neophema",
    feedingStrategy: "Granívoro",
    weightRange: { min: 37, max: 44 },
    kFactor: 196,
    dailyRation: 10,
    dailySalad: 8,
    dailySeeds: 5,
    saladDays: 5,
    supplementDays: ["Segunda", "Quarta", "Sexta"],
    notes: "Periquito delicado. Sensível a mudanças bruscas na dieta.",
    inCurrentFlock: false,
    currentCount: 0,
  },
  {
    id: "neophema-splendida",
    scientificName: "Neophema splendida",
    commonName: "Esplêndido",
    group: "Neophema",
    feedingStrategy: "Granívoro",
    weightRange: { min: 36, max: 44 },
    kFactor: 196,
    dailyRation: 10,
    dailySalad: 8,
    dailySeeds: 5,
    saladDays: 5,
    supplementDays: ["Segunda", "Quarta", "Sexta"],
    notes: "Periquito australiano colorido. Protocolo Neophema padrão.",
    inCurrentFlock: false,
    currentCount: 0,
  },
  {
    id: "neopsephotus-bourkii",
    scientificName: "Neopsephotus bourkii",
    commonName: "Bourke",
    group: "Neophema",
    feedingStrategy: "Granívoro",
    weightRange: { min: 42, max: 49 },
    kFactor: 196,
    dailyRation: 10,
    dailySalad: 8,
    dailySeeds: 5,
    saladDays: 5,
    supplementDays: ["Segunda", "Quarta", "Sexta"],
    notes: "Ave crepuscular. Mais ativa ao amanhecer e entardecer.",
    inCurrentFlock: false,
    currentCount: 0,
  },

  // --- ROSELLAS ---
  {
    id: "platycercus-adelaidae",
    scientificName: "Platycercus adelaidae",
    commonName: "Rosella Adelaide",
    group: "Rosella",
    feedingStrategy: "Granívoro",
    weightRange: { min: 100, max: 130 },
    kFactor: 196,
    dailyRation: 15,
    dailySalad: 12,
    dailySeeds: 5,
    saladDays: 5,
    supplementDays: ["Segunda", "Quarta", "Sexta"],
    notes: "Rosella de porte médio. Protocolo padrão Rosella.",
    inCurrentFlock: false,
    currentCount: 0,
  },
  {
    id: "platycercus-adscitus",
    scientificName: "Platycercus adscitus",
    commonName: "Rosella Adscitus",
    group: "Rosella",
    feedingStrategy: "Granívoro",
    weightRange: { min: 100, max: 130 },
    kFactor: 196,
    dailyRation: 15,
    dailySalad: 12,
    dailySeeds: 5,
    saladDays: 5,
    supplementDays: ["Segunda", "Quarta", "Sexta"],
    notes: "Rosella Pálida. Protocolo padrão Rosella.",
    inCurrentFlock: false,
    currentCount: 0,
  },
  {
    id: "platycercus-caledonicus",
    scientificName: "Platycercus caledonicus",
    commonName: "Rosella da Caledônia",
    group: "Rosella",
    feedingStrategy: "Granívoro",
    weightRange: { min: 90, max: 120 },
    kFactor: 196,
    dailyRation: 15,
    dailySalad: 12,
    dailySeeds: 5,
    saladDays: 5,
    supplementDays: ["Segunda", "Quarta", "Sexta"],
    notes: "Também chamada Rosella Verde. Protocolo padrão.",
    inCurrentFlock: false,
    currentCount: 0,
  },
  {
    id: "platycercus-elegans",
    scientificName: "Platycercus elegans",
    commonName: "Rosella Pennat",
    group: "Rosella",
    feedingStrategy: "Granívoro",
    weightRange: { min: 100, max: 170 },
    kFactor: 196,
    dailyRation: 15,
    dailySalad: 12,
    dailySeeds: 5,
    saladDays: 5,
    supplementDays: ["Segunda", "Quarta", "Sexta"],
    notes: "Rosella Carmesim. A maior das Rosellas.",
    inCurrentFlock: false,
    currentCount: 0,
  },
  {
    id: "platycercus-eximius",
    scientificName: "Platycercus eximius",
    commonName: "Rosella Eximius",
    group: "Rosella",
    feedingStrategy: "Granívoro",
    weightRange: { min: 95, max: 120 },
    kFactor: 196,
    dailyRation: 15,
    dailySalad: 12,
    dailySeeds: 5,
    saladDays: 5,
    supplementDays: ["Segunda", "Quarta", "Sexta"],
    notes: "Rosella Oriental. Protocolo padrão Rosella.",
    inCurrentFlock: false,
    currentCount: 0,
  },
  {
    id: "platycercus-flaveolus",
    scientificName: "Platycercus flaveolus",
    commonName: "Rosella Amarela",
    group: "Rosella",
    feedingStrategy: "Granívoro",
    weightRange: { min: 90, max: 120 },
    kFactor: 196,
    dailyRation: 15,
    dailySalad: 12,
    dailySeeds: 5,
    saladDays: 5,
    supplementDays: ["Segunda", "Quarta", "Sexta"],
    notes: "Protocolo padrão Rosella.",
    inCurrentFlock: false,
    currentCount: 0,
  },
  {
    id: "platycercus-icterotis",
    scientificName: "Platycercus icterotis",
    commonName: "Rosella Icterotis",
    group: "Rosella",
    feedingStrategy: "Granívoro",
    weightRange: { min: 54, max: 80 },
    kFactor: 196,
    dailyRation: 12,
    dailySalad: 10,
    dailySeeds: 5,
    saladDays: 5,
    supplementDays: ["Segunda", "Quarta", "Sexta"],
    notes: "Menor Rosella. Porção reduzida.",
    inCurrentFlock: false,
    currentCount: 0,
  },

  // --- LORINHO DO SENEGAL ---
  {
    id: "poicephalus-senegalus",
    scientificName: "Poicephalus senegalus",
    commonName: "Lorinho do Senegal",
    group: "Africano Médio",
    feedingStrategy: "Granívoro",
    weightRange: { min: 120, max: 170 },
    kFactor: 196,
    dailyRation: 20,
    dailySalad: 15,
    dailySeeds: 5,
    saladDays: 7,
    supplementDays: ["Segunda", "Quarta", "Sexta"],
    notes: "Papagaio africano de médio porte. Aprecia frutas e nozes.",
    inCurrentFlock: false,
    currentCount: 0,
  },

  // --- PERIQUITOS AUSTRALIANOS ---
  {
    id: "psephotellus-dissimilis",
    scientificName: "Psephotellus dissimilis",
    commonName: "Periquito Hooded",
    group: "Australiano Pequeno",
    feedingStrategy: "Granívoro",
    weightRange: { min: 50, max: 65 },
    kFactor: 196,
    dailyRation: 10,
    dailySalad: 8,
    dailySeeds: 5,
    saladDays: 5,
    supplementDays: ["Segunda", "Quarta", "Sexta"],
    notes: "Periquito australiano. Forrageia no chão. Precisa de espaço.",
    inCurrentFlock: false,
    currentCount: 0,
  },
  {
    id: "psephotus-haematonotus",
    scientificName: "Psephotus haematonotus",
    commonName: "Red Rumped",
    group: "Australiano Pequeno",
    feedingStrategy: "Granívoro",
    weightRange: { min: 55, max: 85 },
    kFactor: 196,
    dailyRation: 12,
    dailySalad: 10,
    dailySeeds: 5,
    saladDays: 5,
    supplementDays: ["Segunda", "Quarta", "Sexta"],
    notes: "Periquito resistente. Bom para iniciantes. Forrageia no chão.",
    inCurrentFlock: false,
    currentCount: 0,
  },
];

// ============================================
// ALIMENTOS RECOMENDADOS
// ============================================

export const foods: FoodItem[] = [
  // Vegetais
  { id: "couve", name: "Couve", category: "Vegetal", energyKcal: 490, vitaminA: "Alta", calcium: "Alto", recommended: true, notes: "Base da salada. Rica em cálcio e vitamina A." },
  { id: "cenoura", name: "Cenoura", category: "Vegetal", energyKcal: 410, vitaminA: "Alta", calcium: "Médio", recommended: true, notes: "Excelente fonte de betacaroteno. Ralar no ralo grosso." },
  { id: "jilo", name: "Jiló", category: "Vegetal", energyKcal: 230, vitaminA: "Baixa", calcium: "Baixo", recommended: false, notes: "Classificado como 'Pobre'. Substituir por batata doce ou abóbora." },
  { id: "pimenta", name: "Pimenta", category: "Vegetal", energyKcal: 300, vitaminA: "Alta", calcium: "Médio", recommended: true, notes: "Aves não sentem capsaicina. Usar com sementes." },
  { id: "batata-doce", name: "Batata Doce", category: "Vegetal", energyKcal: 860, vitaminA: "Alta", calcium: "Médio", recommended: true, notes: "Substituto recomendado para o jiló. Cozinhar levemente." },
  { id: "abobora", name: "Abóbora", category: "Vegetal", energyKcal: 260, vitaminA: "Alta", calcium: "Médio", recommended: true, notes: "Substituto recomendado para o jiló. Pode servir crua ou cozida." },
  { id: "brocolis", name: "Brócolis", category: "Vegetal", energyKcal: 340, vitaminA: "Alta", calcium: "Alto", recommended: true, notes: "Rico em cálcio e vitaminas. Servir cru ou levemente cozido." },
  { id: "beterraba", name: "Beterraba", category: "Vegetal", energyKcal: 430, vitaminA: "Média", calcium: "Médio", recommended: false, notes: "Classificada como 'Pobre' (Vol.3). Baixo valor nutricional para aves. Pode manchar penas claras." },
  { id: "agriao", name: "Agrião", category: "Vegetal", energyKcal: 110, vitaminA: "Alta", calcium: "Alto", recommended: true, notes: "Classificado como 'Bom' (Vol.3). Excelente Ca:P 2:1. Recomendado para Congo (Vol.5)." },
  { id: "mostarda", name: "Mostarda (Folha)", category: "Vegetal", energyKcal: 270, vitaminA: "Alta", calcium: "Alto", recommended: true, notes: "Classificada como 'Melhores' (Vol.3). Rica em cálcio e vitamina C. Recomendada para Congo (Vol.5)." },
  { id: "chicoria", name: "Chicória", category: "Vegetal", energyKcal: 230, vitaminA: "Alta", calcium: "Alto", recommended: true, notes: "Classificada como 'Melhores' (Vol.3). Rica em fibra e vitamina A." },
  { id: "acelga", name: "Acelga Suíça", category: "Vegetal", energyKcal: 190, vitaminA: "Alta", calcium: "Alto", recommended: true, notes: "Classificada como 'Melhores' (Vol.3). Rica em cálcio e vitamina C." },
  { id: "salsa", name: "Salsa", category: "Vegetal", energyKcal: 360, vitaminA: "Alta", calcium: "Alto", recommended: true, notes: "Classificada como 'Melhores' (Vol.3). Maior teor de vitamina C entre vegetais." },
  { id: "coentro", name: "Coentro", category: "Vegetal", energyKcal: 230, vitaminA: "Alta", calcium: "Médio", recommended: true, notes: "Classificado como 'Melhores' (Vol.3). Rico em vitamina A e C." },
  { id: "vagem", name: "Vagem", category: "Vegetal", energyKcal: 310, vitaminA: "Média", calcium: "Médio", recommended: true, notes: "Classificada como 'Bom' (Vol.3). Recomendada para Ringneck (Vol.5)." },
  { id: "ervilha-verde", name: "Ervilha Verde", category: "Vegetal", energyKcal: 810, vitaminA: "Média", calcium: "Médio", recommended: true, notes: "Classificada como 'Bom' (Vol.3). Boa fonte de proteína vegetal." },
  { id: "pimentao", name: "Pimentão", category: "Vegetal", energyKcal: 200, vitaminA: "Média", calcium: "Baixo", recommended: true, notes: "Classificado como 'Bom' (Vol.3). Rico em vitamina C. Todas as cores são seguras." },
  { id: "couve-flor", name: "Couve-flor", category: "Vegetal", energyKcal: 250, vitaminA: "Baixa", calcium: "Médio", recommended: true, notes: "Classificada como 'Bom' (Vol.3). Boa fonte de vitamina C." },
  { id: "abobrinha", name: "Abobrinha", category: "Vegetal", energyKcal: 210, vitaminA: "Baixa", calcium: "Baixo", recommended: true, notes: "Classificada como 'Bom' (Vol.3). Leve e hidratante." },
  { id: "milho-verde", name: "Milho Verde", category: "Vegetal", energyKcal: 860, vitaminA: "Baixa", calcium: "Baixo", recommended: true, notes: "Classificado como 'Bom' (Vol.3). Oferecer na espiga como enriquecimento." },
  { id: "nabo", name: "Nabo", category: "Vegetal", energyKcal: 280, vitaminA: "Baixa", calcium: "Médio", recommended: true, notes: "Classificado como 'Bom' (Vol.3). Boa fonte de vitamina C." },
  { id: "quiabo", name: "Quiabo", category: "Vegetal", energyKcal: 330, vitaminA: "Média", calcium: "Alto", recommended: true, notes: "Classificado como 'Bom' (Vol.3). Rico em cálcio e fibra." },
  { id: "repolho", name: "Repolho", category: "Vegetal", energyKcal: 250, vitaminA: "Baixa", calcium: "Médio", recommended: true, notes: "Classificado como 'Bom' (Vol.3). Boa fonte de vitamina C." },

  // Frutas
  { id: "mamao", name: "Mamão", category: "Fruta", energyKcal: 390, vitaminA: "Alta", calcium: "Médio", recommended: true, notes: "Excelente para Ecletus. Rico em enzimas digestivas." },
  { id: "manga", name: "Manga", category: "Fruta", energyKcal: 600, vitaminA: "Alta", calcium: "Baixo", recommended: true, notes: "Rica em vitamina A. Oferecer madura." },
  { id: "banana", name: "Banana", category: "Fruta", energyKcal: 890, vitaminA: "Baixa", calcium: "Baixo", recommended: true, notes: "Classificada como 'Pobre' (Vol.3). Usar com moderação. Recomendada para Caiques e Tuins (Vol.5)." },
  { id: "maca", name: "Maçã", category: "Fruta", energyKcal: 520, vitaminA: "Baixa", calcium: "Baixo", recommended: true, notes: "⚠️ SEMPRE remover sementes (contêm amigdalina/cianeto — RISCO DE MORTE). Servir com casca." },
  { id: "uva", name: "Uva", category: "Fruta", energyKcal: 690, vitaminA: "Baixa", calcium: "Baixo", recommended: true, notes: "Classificada como 'Pobre' (Vol.3). Usar com moderação. Oferecer sem sementes." },
  { id: "goiaba", name: "Goiaba", category: "Fruta", energyKcal: 680, vitaminA: "Alta", calcium: "Médio", recommended: true, notes: "Classificada como 'Melhores' (Vol.3). Excelente fonte de vitamina C. Pode ser oferecida inteira." },
  { id: "kiwi", name: "Kiwi", category: "Fruta", energyKcal: 610, vitaminA: "Baixa", calcium: "Médio", recommended: true, notes: "Classificado como 'Melhores' (Vol.3). Rico em vitamina C e E." },
  { id: "morango", name: "Morango", category: "Fruta", energyKcal: 320, vitaminA: "Baixa", calcium: "Baixo", recommended: true, notes: "Classificado como 'Melhores' (Vol.3). Rico em vitamina C." },
  { id: "laranja", name: "Laranja", category: "Fruta", energyKcal: 470, vitaminA: "Média", calcium: "Médio", recommended: true, notes: "Classificada como 'Melhores' (Vol.3). Rica em vitamina C. Oferecer em gomos." },
  { id: "abacaxi", name: "Abacaxi", category: "Fruta", energyKcal: 500, vitaminA: "Baixa", calcium: "Baixo", recommended: true, notes: "Classificado como 'Melhores' (Vol.3). Rico em vitamina C. Oferecer fresco." },
  { id: "maracuja", name: "Maracujá", category: "Fruta", energyKcal: 970, vitaminA: "Alta", calcium: "Médio", recommended: true, notes: "Classificado como 'Melhores' (Vol.3). Rico em vitamina A e fibra." },
  { id: "amora", name: "Amora", category: "Fruta", energyKcal: 430, vitaminA: "Baixa", calcium: "Médio", recommended: true, notes: "Classificada como 'Melhores' (Vol.3). Rica em vitamina E e antioxidantes." },
  { id: "toranja", name: "Toranja Vermelha", category: "Fruta", energyKcal: 420, vitaminA: "Alta", calcium: "Baixo", recommended: true, notes: "Classificada como 'Melhores' (Vol.3). Rica em vitamina A e C." },
  { id: "tangerina", name: "Tangerina", category: "Fruta", energyKcal: 530, vitaminA: "Média", calcium: "Médio", recommended: true, notes: "Classificada como 'Boa' (Vol.3). Boa fonte de vitamina C." },
  { id: "melancia", name: "Melancia", category: "Fruta", energyKcal: 300, vitaminA: "Média", calcium: "Baixo", recommended: true, notes: "Classificada como 'Boa' (Vol.3). Hidratante. Usar com moderação (muita água)." },
  { id: "framboesa", name: "Framboesa", category: "Fruta", energyKcal: 520, vitaminA: "Baixa", calcium: "Médio", recommended: true, notes: "Classificada como 'Boa' (Vol.3). Rica em fibra e vitamina E." },

  // Sementes
  { id: "girassol", name: "Semente de Girassol", category: "Semente", energyKcal: 5840, vitaminA: "Baixa", calcium: "Baixo", recommended: true, notes: "⚠️ NUNCA usar como base da dieta (Vol.5). Alto teor de gordura, baixo Ca:P. Causa obesidade e deficiências. Usar apenas como complemento." },
  { id: "painco", name: "Painço", category: "Semente", energyKcal: 3780, vitaminA: "Baixa", calcium: "Baixo", recommended: true, notes: "Base do mix de sementes. Boa fonte de energia." },
  { id: "aveia", name: "Aveia", category: "Semente", energyKcal: 3890, vitaminA: "Baixa", calcium: "Médio", recommended: true, notes: "Boa fonte de fibra e energia." },
  { id: "linhaca", name: "Linhaça", category: "Semente", energyKcal: 5340, vitaminA: "Baixa", calcium: "Médio", recommended: true, notes: "Rica em ômega-3. Presente na ração de alta proteína." },

  // Proteínas e Nozes
  { id: "amendoa", name: "Amêndoa", category: "Proteína", energyKcal: 5900, vitaminA: "Baixa", calcium: "Alto", recommended: true, notes: "Classificada como 'Melhores' (Vol.3). PRIORIDADE para Congo — rica em vitamina E (Vol.5)." },
  { id: "nozes", name: "Nozes", category: "Proteína", energyKcal: 6180, vitaminA: "Baixa", calcium: "Médio", recommended: true, notes: "Classificada como 'Melhores' (Vol.3). Rica em proteína e ômega-3." },
  { id: "castanha-para", name: "Castanha-do-pará", category: "Proteína", energyKcal: 6740, vitaminA: "Baixa", calcium: "Médio", recommended: true, notes: "Classificada como 'Melhores' (Vol.3). Rica em selênio. 1 unidade/semana para grandes." },
  { id: "macadamia", name: "Macadâmia", category: "Proteína", energyKcal: 7520, vitaminA: "Baixa", calcium: "Médio", recommended: true, notes: "Classificada como 'Melhores' (Vol.3). PRIORIDADE para Araras Azuis (Vol.5)." },
  { id: "quinoa", name: "Quinoa Cozida", category: "Proteína", energyKcal: 1200, vitaminA: "Baixa", calcium: "Médio", recommended: true, notes: "Classificada como 'Melhores' (Vol.3). Proteína completa. Excelente para todas as espécies." },
  { id: "ovo-cozido", name: "Ovo Cozido", category: "Proteína", energyKcal: 1550, vitaminA: "Média", calcium: "Médio", recommended: true, notes: "Obrigatório para Cacatuas 2-3x/semana (Vol.5). Fonte de proteína animal." },
  { id: "lentilha-broto", name: "Lentilha (Broto)", category: "Proteína", energyKcal: 1060, vitaminA: "Baixa", calcium: "Médio", recommended: true, notes: "Classificada como 'Melhores' (Vol.3). Rica em proteína e ferro." },
  { id: "ervilha-broto", name: "Ervilha (Broto)", category: "Proteína", energyKcal: 1240, vitaminA: "Baixa", calcium: "Médio", recommended: true, notes: "Classificada como 'Melhores' (Vol.3). Rica em proteína. Recomendada para Cacatuas (Vol.5)." },
  { id: "coco", name: "Coco (Polpa)", category: "Proteína", energyKcal: 3540, vitaminA: "Baixa", calcium: "Baixo", recommended: true, notes: "Classificado como 'Melhores' (Vol.3). Rico em gordura saudável. Bom para Araras." },

  // Ração
  { id: "racao-hp", name: "Ração Alta Proteína", category: "Ração", energyKcal: 3200, vitaminA: "Alta", calcium: "Alto", recommended: true, notes: "Para Psittaculas. 8% gordura. 15g/ave/dia." },
  { id: "racao-hp-breed", name: "Ração Alta Proteína Reprodução", category: "Ração", energyKcal: 3400, vitaminA: "Alta", calcium: "Alto", recommended: true, notes: "Para fase reprodutiva. Maior teor proteico." },
  { id: "racao-mini", name: "Ração Mini", category: "Ração", energyKcal: 3100, vitaminA: "Alta", calcium: "Alto", recommended: true, notes: "Para Ecletus, Congo, King. 35g/ave/dia." },

  // Suplementos
  { id: "supl-vitaminico", name: "Suplemento Vitamínico (Pote 5)", category: "Suplemento", energyKcal: 0, vitaminA: "Alta", calcium: "Alto", recommended: true, notes: "Colher média. Segunda, Quarta e Sexta." },
  { id: "supl-mineral", name: "Suplemento Mineral (Pote 6)", category: "Suplemento", energyKcal: 0, vitaminA: "Baixa", calcium: "Alto", recommended: true, notes: "Colher pequena. Apenas Quarta-feira." },
  { id: "bloco-mineral", name: "Bloco Mineral", category: "Suplemento", energyKcal: 0, vitaminA: "Baixa", calcium: "Alto", recommended: true, notes: "Fixo na gaiola. Trocar semanalmente." },
  { id: "osso-siba", name: "Osso de Síba", category: "Suplemento", energyKcal: 0, vitaminA: "Baixa", calcium: "Alto", recommended: true, notes: "Fonte de cálcio natural. Repor quando gasto." },
];

// ============================================
// ALIMENTOS TÓXICOS E PROIBIDOS (Vol.5 — RISCO DE MORTE)
// ============================================

export interface ToxicFood {
  name: string;
  substance: string;
  effect: string;
  severity: "Fatal" | "Grave" | "Inadequado";
}

export const toxicFoods: ToxicFood[] = [
  // FATAIS — Risco de morte
  { name: "Abacate (todas as partes)", substance: "Persina", effect: "Cardiotoxicidade, edema pulmonar, morte", severity: "Fatal" },
  { name: "Chocolate e cacau", substance: "Teobromina, cafeína", effect: "Arritmia cardíaca, convulsões, morte", severity: "Fatal" },
  { name: "Café e bebidas cafeinadas", substance: "Cafeína", effect: "Taquicardia, arritmia, morte", severity: "Fatal" },
  { name: "Cebola (crua ou cozida)", substance: "Compostos sulfurados", effect: "Destruição de hemácias, anemia hemolítica", severity: "Fatal" },
  { name: "Alho (cru ou cozido)", substance: "Alicina", effect: "Anemia hemolítica", severity: "Fatal" },
  { name: "Sementes de maçã, pêra, cereja", substance: "Amigdalina (cianeto)", effect: "Envenenamento por cianeto", severity: "Fatal" },
  { name: "Álcool", substance: "Etanol", effect: "Depressão do SNC, morte", severity: "Fatal" },
  // GRAVES — Risco significativo
  { name: "Sal e alimentos salgados", substance: "Sódio em excesso", effect: "Intoxicação por sódio, desidratação", severity: "Grave" },
  { name: "Amendoim com casca", substance: "Aflatoxinas (mofo)", effect: "Dano hepático e renal", severity: "Grave" },
  { name: "Alimentos mofados", substance: "Micotoxinas", effect: "Dano hepático e renal", severity: "Grave" },
  { name: "Tomate (folhas e caule)", substance: "Solanina", effect: "Intoxicação (polpa madura é segura em pequena qtd)", severity: "Grave" },
  { name: "Batata crua (partes verdes)", substance: "Solanina", effect: "Intoxicação (batata cozida é segura)", severity: "Grave" },
  // INADEQUADOS — Evitar
  { name: "Alface (todas as variedades)", substance: "Baixo valor nutricional", effect: "Pode causar diarreia, não nutre adequadamente", severity: "Inadequado" },
  { name: "Leite e derivados", substance: "Lactose", effect: "Aves não possuem lactase, causa diarreia", severity: "Inadequado" },
  { name: "Alimentos ultraprocessados", substance: "Conservantes, açúcares, sódio", effect: "Deficiências nutricionais, obesidade", severity: "Inadequado" },
  { name: "Sementes de girassol como BASE", substance: "Alto teor de gordura", effect: "Obesidade, deficiência de cálcio, doenças hepáticas", severity: "Inadequado" },
];

// ============================================
// RECOMENDAÇÕES ESPECÍFICAS POR GRUPO (Vol.5)
// ============================================

export interface GroupFoodRecommendation {
  groupId: string;
  groupName: string;
  priorityFoods: string[]; // IDs dos alimentos prioritários
  avoidFoods: string[]; // Alimentos a evitar para este grupo
  specialNotes: string[];
}

export const groupFoodRecommendations: GroupFoodRecommendation[] = [
  {
    groupId: "psittacula",
    groupName: "Ringneck e Psittacula",
    priorityFoods: ["cenoura", "brocolis", "couve", "pimentao", "vagem", "mamao", "manga", "goiaba", "maca", "quinoa"],
    avoidFoods: ["girassol como base", "excesso de nozes"],
    specialNotes: [
      "Estratégia: Granívoro — 70% ração, 15% vegetais, 10% frutas, 5% proteíco",
      "Sementes germinadas são excelentes como complemento",
      "Maçã: SEMPRE remover sementes (cianeto)",
      "Romã é bem aceita e rica em antioxidantes"
    ]
  },
  {
    groupId: "cacatua",
    groupName: "Cacatuas",
    priorityFoods: ["cenoura", "batata-doce", "brocolis", "couve", "ovo-cozido", "ervilha-broto", "lentilha-broto", "quinoa", "mamao", "goiaba"],
    avoidFoods: ["girassol como base (MUITO inadequado para Galah)", "nozes em excesso", "dieta exclusiva de sementes"],
    specialNotes: [
      "Estratégia: Onívoro — 70% ração, 15% vegetais, 5% frutas, 10% proteíco",
      "Ovo cozido OBRIGATÓRIO 2-3x/semana",
      "Galah: NUNCA girassol como base (obesidade)",
      "Leguminosas germinadas são essenciais"
    ]
  },
  {
    groupId: "frugivoro",
    groupName: "Ecletus e Frugívoros",
    priorityFoods: ["cenoura", "batata-doce", "abobora", "brocolis", "couve", "pimentao", "mamao", "manga", "goiaba", "maracuja", "kiwi"],
    avoidFoods: ["ração com corantes (MUITO inadequado)", "suplementos sintéticos de vitamina A (PERIGOSO)", "sementes oleaginosas em excesso"],
    specialNotes: [
      "Estratégia: Frugívoro — 40% ração, 35% vegetais, 20% frutas, 5% proteíco",
      "⚠️ NUNCA usar ração com corantes para Ecletus",
      "⚠️ NUNCA suplementar vitamina A sintética (hipervitaminose)",
      "Maior proporção de frutas e vegetais entre todos os grupos"
    ]
  },
  {
    groupId: "africano_grande",
    groupName: "Papagaio do Congo",
    priorityFoods: ["couve", "mostarda", "agriao", "brocolis", "cenoura", "batata-doce", "amendoa", "nozes", "castanha-para"],
    avoidFoods: ["dieta exclusiva de sementes", "excesso de gordura sem cálcio"],
    specialNotes: [
      "Estratégia: Granívoro Ara — 65% ração, 15% vegetais, 10% frutas, 10% nozes",
      "Amêndoa é PRIORIDADE — rica em vitamina E (prevenção de deficiência)",
      "Couve tem Ca:P 7,7:1 — essencial para Congo",
      "Castanha-do-pará: 1 unidade/semana (selênio)"
    ]
  },
  {
    groupId: "australiano_pequeno",
    groupName: "Calopsitas e Australianos Pequenos",
    priorityFoods: ["cenoura", "brocolis", "couve", "painco", "mamao", "maca"],
    avoidFoods: ["girassol como base (MUITO inadequado)", "dieta exclusiva de sementes", "nozes (muito calóricas)"],
    specialNotes: [
      "Estratégia: Granívoro — 80% ração, 10% vegetais, 5% frutas, 5% sementes",
      "Painço em cacho como enriquecimento",
      "Sementes germinadas são excelentes",
      "Maçã: SEMPRE remover sementes (cianeto)"
    ]
  },
  {
    groupId: "agapornis",
    groupName: "Agapornis",
    priorityFoods: ["cenoura", "brocolis", "couve", "mamao", "maca", "painco"],
    avoidFoods: ["sementes como base", "nozes (muito calóricas para porte pequeno)"],
    specialNotes: [
      "Estratégia: Granívoro Florívoro — 70% ração, 20% vegetais, 10% frutas",
      "Painço em cacho como enriquecimento",
      "Sementes germinadas são excelentes",
      "Maçã: SEMPRE remover sementes (cianeto)"
    ]
  },
  {
    groupId: "rosella",
    groupName: "Rosellas e Barnardius",
    priorityFoods: ["cenoura", "brocolis", "couve", "pimenta", "mamao", "goiaba"],
    avoidFoods: ["girassol como base", "excesso de nozes"],
    specialNotes: [
      "Estratégia: Granívoro — 70% ração, 15% vegetais, 10% frutas, 5% sementes",
      "Pimenta é bem aceita (aves não sentem capsaicina)",
      "Sementes germinadas como complemento"
    ]
  },
  {
    groupId: "neophema",
    groupName: "Neophemas e Bourke",
    priorityFoods: ["cenoura", "brocolis", "couve", "painco", "mamao"],
    avoidFoods: ["girassol como base", "nozes (muito calóricas)"],
    specialNotes: [
      "Estratégia: Granívoro — 80% ração, 10% vegetais, 5% frutas, 5% sementes",
      "Espécies pequenas — porções proporcionais ao peso",
      "Painço em cacho como enriquecimento"
    ]
  },
];

// ============================================
// PROTOCOLOS DE GRUPO
// ============================================

export const groupProtocols: GroupProtocol[] = [
  {
    groupId: "psittacula",
    groupName: "Psittaculas e Polytelis",
    species: [
      "psittacula-krameri", "psittacula-cyanocephala", "psittacula-eupatria",
      "psittacula-alexandri", "psittacula-derbiana",
      "polytelis-anthopeplus", "polytelis-alexandrae", "polytelis-swainsonii"
    ],
    rationPot: "Pote 1",
    rationAmount: "15g/ave/dia",
    saladComposition: ["Jiló (ou batata doce/abóbora)", "Cenoura ralada", "Couve picada", "Pimenta com sementes"],
    weeklyProtocol: [
      { dayOfWeek: "Segunda", morning: ["Trocar água + medicamentos", "15g ração (Pote 1)"], afternoon: ["Salada 15g/ave + 5g sementes (Pote 2)", "Suplemento vitamínico (Pote 5) — colher média"] },
      { dayOfWeek: "Terça", morning: ["Trocar água + medicamentos", "15g ração (Pote 1)"], afternoon: ["5g sementes (Pote 2) + pimenta triturada"] },
      { dayOfWeek: "Quarta", morning: ["Trocar água + medicamentos", "15g ração (Pote 1)"], afternoon: ["Salada 15g/ave + 5g sementes (Pote 2)", "Suplemento mineral (Pote 6) — colher pequena"] },
      { dayOfWeek: "Quinta", morning: ["Trocar água + medicamentos", "15g ração (Pote 1)"], afternoon: ["5g sementes (Pote 2) + pimenta triturada"] },
      { dayOfWeek: "Sexta", morning: ["Trocar água + medicamentos", "15g ração (Pote 1)"], afternoon: ["Salada 15g/ave + 5g sementes (Pote 2)", "Suplemento vitamínico (Pote 5) — colher média"] },
      { dayOfWeek: "Sábado", morning: ["Trocar água + medicamentos", "15g ração (Pote 1)"], afternoon: ["Apenas ração e água"] },
      { dayOfWeek: "Domingo", morning: ["Trocar água + medicamentos", "15g ração (Pote 1)"], afternoon: ["Apenas ração e água"] },
    ],
    importantNotes: [
      "Salada apenas de segunda a sexta",
      "Sábado e domingo: apenas ração e água",
      "Suplemento Pote 5 (vitamínico): Seg, Qua, Sex",
      "Suplemento Pote 6 (mineral): apenas Quarta",
      "Ração de alta proteína recomendada para TODOS os Psittaculas",
    ],
  },
  {
    groupId: "frugivoro",
    groupName: "Frugívoros (Ecletus, Congo, King)",
    species: ["eclectus-roratus", "psittacus-erithacus", "alisterus-scapularis"],
    rationPot: "Pote 4",
    rationAmount: "35g/ave/dia",
    saladComposition: ["Jiló (ou batata doce/abóbora)", "Cenoura ralada", "Couve picada", "Pimenta com sementes", "Frutas variadas (mamão, manga, goiaba)"],
    weeklyProtocol: [
      { dayOfWeek: "Segunda", morning: ["Trocar água + medicamentos", "35g ração (Pote 4)"], afternoon: ["Completar ração 35g", "Salada 25g/ave + 5g sementes", "Suplemento vitamínico (Pote 5)"] },
      { dayOfWeek: "Terça", morning: ["Trocar água + medicamentos", "35g ração (Pote 4)"], afternoon: ["Completar ração 35g", "Salada 25g/ave + 5g sementes"] },
      { dayOfWeek: "Quarta", morning: ["Trocar água + medicamentos", "35g ração (Pote 4)"], afternoon: ["Completar ração 35g", "Salada 25g/ave + 5g sementes", "Suplemento mineral (Pote 6)"] },
      { dayOfWeek: "Quinta", morning: ["Trocar água + medicamentos", "35g ração (Pote 4)"], afternoon: ["Completar ração 35g", "Salada 25g/ave + 5g sementes"] },
      { dayOfWeek: "Sexta", morning: ["Trocar água + medicamentos", "35g ração (Pote 4)"], afternoon: ["Completar ração 35g", "Salada 25g/ave + 5g sementes", "Suplemento vitamínico (Pote 5)"] },
      { dayOfWeek: "Sábado", morning: ["Trocar água + medicamentos", "35g ração (Pote 4)"], afternoon: ["Completar ração 35g", "Salada 25g/ave (sem pimenta)"] },
      { dayOfWeek: "Domingo", morning: ["Trocar água + medicamentos", "35g ração (Pote 4)"], afternoon: ["Completar ração 35g", "Salada 25g/ave (sem pimenta)"] },
    ],
    importantNotes: [
      "Salada TODOS os dias (7 dias por semana)",
      "Ecletus são sensíveis a vitaminas artificiais, conservantes e corantes",
      "Dieta deve ser rica em frutas e vegetais frescos",
      "Sábado e domingo: salada sem pimenta e sem suplemento",
      "Congo necessita suplementação extra de cálcio",
    ],
  },
  {
    groupId: "cacatua",
    groupName: "Cacatuas",
    species: [
      "cacatua-alba", "cacatua-galerita", "cacatua-goffiniana",
      "cacatua-moluccensis", "cacatua-ophthalmica", "cacatua-pastinator",
      "cacatua-sulphurea", "eolophus-roseicapillus"
    ],
    rationPot: "Pote 4",
    rationAmount: "30-45g/ave/dia (conforme porte)",
    saladComposition: ["Cenoura ralada", "Couve picada", "Brócolis", "Batata doce cozida", "Frutas variadas"],
    weeklyProtocol: [
      { dayOfWeek: "Segunda", morning: ["Trocar água + medicamentos", "Ração conforme porte"], afternoon: ["Salada 25-35g/ave + sementes", "Suplemento vitamínico"] },
      { dayOfWeek: "Terça", morning: ["Trocar água + medicamentos", "Ração conforme porte"], afternoon: ["Salada 25-35g/ave + sementes"] },
      { dayOfWeek: "Quarta", morning: ["Trocar água + medicamentos", "Ração conforme porte"], afternoon: ["Salada 25-35g/ave + sementes", "Suplemento mineral"] },
      { dayOfWeek: "Quinta", morning: ["Trocar água + medicamentos", "Ração conforme porte"], afternoon: ["Salada 25-35g/ave + sementes"] },
      { dayOfWeek: "Sexta", morning: ["Trocar água + medicamentos", "Ração conforme porte"], afternoon: ["Salada 25-35g/ave + sementes", "Suplemento vitamínico"] },
      { dayOfWeek: "Sábado", morning: ["Trocar água + medicamentos", "Ração conforme porte"], afternoon: ["Salada 25-35g/ave"] },
      { dayOfWeek: "Domingo", morning: ["Trocar água + medicamentos", "Ração conforme porte"], afternoon: ["Salada 25-35g/ave"] },
    ],
    importantNotes: [
      "Salada TODOS os dias (7 dias por semana)",
      "Galah: tendência forte a obesidade — controlar gordura",
      "Necessitam enriquecimento ambiental intenso",
      "Porção varia conforme porte: Goffini 30g, Alba/Galerita/Moluca 40-45g",
    ],
  },
  {
    groupId: "rosella",
    groupName: "Rosellas e Barnardius",
    species: [
      "platycercus-adelaidae", "platycercus-adscitus", "platycercus-caledonicus",
      "platycercus-elegans", "platycercus-eximius", "platycercus-flaveolus",
      "platycercus-icterotis", "barnardius-barnardi", "barnardius-zonarius"
    ],
    rationPot: "Pote 1",
    rationAmount: "12-18g/ave/dia (conforme porte)",
    saladComposition: ["Cenoura ralada", "Couve picada", "Brócolis", "Pimenta"],
    weeklyProtocol: [
      { dayOfWeek: "Segunda", morning: ["Trocar água + medicamentos", "Ração conforme porte"], afternoon: ["Salada 10-15g/ave + 5g sementes", "Suplemento vitamínico"] },
      { dayOfWeek: "Terça", morning: ["Trocar água + medicamentos", "Ração conforme porte"], afternoon: ["5g sementes + pimenta triturada"] },
      { dayOfWeek: "Quarta", morning: ["Trocar água + medicamentos", "Ração conforme porte"], afternoon: ["Salada 10-15g/ave + 5g sementes", "Suplemento mineral"] },
      { dayOfWeek: "Quinta", morning: ["Trocar água + medicamentos", "Ração conforme porte"], afternoon: ["5g sementes + pimenta triturada"] },
      { dayOfWeek: "Sexta", morning: ["Trocar água + medicamentos", "Ração conforme porte"], afternoon: ["Salada 10-15g/ave + 5g sementes", "Suplemento vitamínico"] },
      { dayOfWeek: "Sábado", morning: ["Trocar água + medicamentos", "Ração conforme porte"], afternoon: ["Apenas ração e água"] },
      { dayOfWeek: "Domingo", morning: ["Trocar água + medicamentos", "Ração conforme porte"], afternoon: ["Apenas ração e água"] },
    ],
    importantNotes: [
      "Protocolo similar aos Psittaculas",
      "Icterotis é menor — porção reduzida (12g)",
      "Port Lincoln pode necessitar porção maior (18g)",
      "Gostam de forragear — espalhar sementes no chão do viveiro",
    ],
  },
  {
    groupId: "neophema",
    groupName: "Neophemas e Bourke",
    species: [
      "neophema-chrysostoma", "neophema-pulchella", "neophema-splendida",
      "neopsephotus-bourkii"
    ],
    rationPot: "Pote 1",
    rationAmount: "10g/ave/dia",
    saladComposition: ["Cenoura ralada", "Couve picada", "Brócolis picado"],
    weeklyProtocol: [
      { dayOfWeek: "Segunda", morning: ["Trocar água + medicamentos", "10g ração"], afternoon: ["Salada 8g/ave + 5g sementes", "Suplemento vitamínico"] },
      { dayOfWeek: "Terça", morning: ["Trocar água + medicamentos", "10g ração"], afternoon: ["5g sementes"] },
      { dayOfWeek: "Quarta", morning: ["Trocar água + medicamentos", "10g ração"], afternoon: ["Salada 8g/ave + 5g sementes", "Suplemento mineral"] },
      { dayOfWeek: "Quinta", morning: ["Trocar água + medicamentos", "10g ração"], afternoon: ["5g sementes"] },
      { dayOfWeek: "Sexta", morning: ["Trocar água + medicamentos", "10g ração"], afternoon: ["Salada 8g/ave + 5g sementes", "Suplemento vitamínico"] },
      { dayOfWeek: "Sábado", morning: ["Trocar água + medicamentos", "10g ração"], afternoon: ["Apenas ração e água"] },
      { dayOfWeek: "Domingo", morning: ["Trocar água + medicamentos", "10g ração"], afternoon: ["Apenas ração e água"] },
    ],
    importantNotes: [
      "Aves pequenas e delicadas",
      "Bourke é crepuscular — mais ativo ao amanhecer e entardecer",
      "Sensíveis a mudanças bruscas na dieta",
      "Gostam de forragear no chão do viveiro",
    ],
  },
  {
    groupId: "pequenos",
    groupName: "Pequenos (Forpus, Kakariki, Red Rumped, Hooded)",
    species: [
      "forpus-coelestis", "forpus-conspicillatus",
      "cyanoramphus-novaezelandiae",
      "psephotellus-dissimilis", "psephotus-haematonotus"
    ],
    rationPot: "Pote 1",
    rationAmount: "8-12g/ave/dia",
    saladComposition: ["Cenoura ralada", "Couve picada", "Brócolis picado"],
    weeklyProtocol: [
      { dayOfWeek: "Segunda", morning: ["Trocar água + medicamentos", "Ração conforme porte"], afternoon: ["Salada 5-10g/ave + 3-5g sementes", "Suplemento vitamínico"] },
      { dayOfWeek: "Terça", morning: ["Trocar água + medicamentos", "Ração conforme porte"], afternoon: ["3-5g sementes"] },
      { dayOfWeek: "Quarta", morning: ["Trocar água + medicamentos", "Ração conforme porte"], afternoon: ["Salada 5-10g/ave + 3-5g sementes", "Suplemento mineral"] },
      { dayOfWeek: "Quinta", morning: ["Trocar água + medicamentos", "Ração conforme porte"], afternoon: ["3-5g sementes"] },
      { dayOfWeek: "Sexta", morning: ["Trocar água + medicamentos", "Ração conforme porte"], afternoon: ["Salada 5-10g/ave + 3-5g sementes", "Suplemento vitamínico"] },
      { dayOfWeek: "Sábado", morning: ["Trocar água + medicamentos", "Ração conforme porte"], afternoon: ["Apenas ração e água"] },
      { dayOfWeek: "Domingo", morning: ["Trocar água + medicamentos", "Ração conforme porte"], afternoon: ["Apenas ração e água"] },
    ],
    importantNotes: [
      "Forpus: menores psitacídeos — porções pequenas (8g ração)",
      "Kakariki: metabolismo acelerado — monitorar consumo",
      "Red Rumped e Hooded: forrageiros de chão",
    ],
  },
  {
    groupId: "africano",
    groupName: "Africanos (Senegal)",
    species: ["poicephalus-senegalus", "aprosmictus-erythropterus"],
    rationPot: "Pote 4",
    rationAmount: "20g/ave/dia",
    saladComposition: ["Cenoura ralada", "Couve picada", "Brócolis", "Frutas variadas"],
    weeklyProtocol: [
      { dayOfWeek: "Segunda", morning: ["Trocar água + medicamentos", "20g ração"], afternoon: ["Salada 15g/ave + 5g sementes", "Suplemento vitamínico"] },
      { dayOfWeek: "Terça", morning: ["Trocar água + medicamentos", "20g ração"], afternoon: ["Salada 15g/ave + 5g sementes"] },
      { dayOfWeek: "Quarta", morning: ["Trocar água + medicamentos", "20g ração"], afternoon: ["Salada 15g/ave + 5g sementes", "Suplemento mineral"] },
      { dayOfWeek: "Quinta", morning: ["Trocar água + medicamentos", "20g ração"], afternoon: ["Salada 15g/ave + 5g sementes"] },
      { dayOfWeek: "Sexta", morning: ["Trocar água + medicamentos", "20g ração"], afternoon: ["Salada 15g/ave + 5g sementes", "Suplemento vitamínico"] },
      { dayOfWeek: "Sábado", morning: ["Trocar água + medicamentos", "20g ração"], afternoon: ["Salada 15g/ave"] },
      { dayOfWeek: "Domingo", morning: ["Trocar água + medicamentos", "20g ração"], afternoon: ["Salada 15g/ave"] },
    ],
    importantNotes: [
      "Salada TODOS os dias (7 dias por semana)",
      "Apreciam frutas e nozes",
      "Enriquecimento ambiental importante",
    ],
  },
];

// ============================================
// RECOMENDAÇÕES DOS LIVROS POR GRUPO
// Sistema de sugestões baseado nos 5 volumes
// ============================================

export interface FeedingRecommendation {
  speciesId: string;
  rations: { id: string; name: string; reason: string; priority: "alta" | "media" | "baixa" }[];
  vegetables: { id: string; name: string; reason: string; priority: "alta" | "media" | "baixa" }[];
  fruits: { id: string; name: string; reason: string; priority: "alta" | "media" | "baixa" }[];
  saladBase: { id: string; name: string; reason: string; priority: "alta" | "media" | "baixa" }[];
  seeds: { id: string; name: string; reason: string; priority: "alta" | "media" | "baixa" }[];
  supplements: { id: string; name: string; reason: string; priority: "alta" | "media" | "baixa" }[];
  warnings: string[];
  bookReferences: string[];
}

// Recomendações por grupo — baseadas nos 5 volumes do Manual Minas Bird
const groupRecommendations: Record<string, Omit<FeedingRecommendation, "speciesId">> = {
  Psittacula: {
    rations: [
      { id: "racao-hp", name: "Ração Alta Proteína", reason: "8% gordura (girassol alto oleico + linhaça), melhor metionina/lisina, qualidade de penas superior", priority: "alta" },
      { id: "racao-hp-breed", name: "Ração Alta Proteína Reprodução", reason: "Usar apenas na fase reprodutiva — maior teor proteico para formação de ovos", priority: "media" },
    ],
    vegetables: [
      { id: "cenoura", name: "Cenoura", reason: "Excelente fonte de betacaroteno (pró-vitamina A). Ralar no ralo grosso", priority: "alta" },
      { id: "couve", name: "Couve", reason: "Rica em cálcio e vitamina A. Base da salada para granívoros", priority: "alta" },
      { id: "brocolis", name: "Brócolis", reason: "Alto teor de cálcio e vitaminas. Servir cru ou levemente cozido", priority: "alta" },
      { id: "batata-doce", name: "Batata Doce", reason: "Substituto superior ao jiló. Alta energia (860 Kcal/Kg) e vitamina A", priority: "alta" },
      { id: "abobora", name: "Abóbora", reason: "Substituto recomendado para jiló. Pode servir crua ou cozida", priority: "media" },
      { id: "pimenta", name: "Pimenta", reason: "Aves não sentem capsaicina. Rica em vitamina A. Usar com sementes", priority: "media" },
      { id: "beterraba", name: "Beterraba", reason: "Fonte de ferro. Pode manchar penas claras temporariamente", priority: "baixa" },
    ],
    fruits: [
      { id: "maca", name: "Maçã", reason: "Boa aceitação. Retirar sementes (contêm cianeto)", priority: "media" },
      { id: "goiaba", name: "Goiaba", reason: "Rica em vitamina C. Pode ser oferecida inteira", priority: "media" },
      { id: "uva", name: "Uva", reason: "Rica em antioxidantes. Oferecer sem sementes", priority: "baixa" },
    ],
    saladBase: [
      { id: "couve", name: "Couve picada", reason: "Base principal — rica em cálcio", priority: "alta" },
      { id: "cenoura", name: "Cenoura ralada", reason: "Betacaroteno essencial para coloração e imunidade", priority: "alta" },
      { id: "batata-doce", name: "Batata doce cozida", reason: "Energia e vitamina A — substitui jiló", priority: "alta" },
      { id: "pimenta", name: "Pimenta com sementes", reason: "Capsaicina não afeta aves, rica em vitamina A", priority: "media" },
    ],
    seeds: [
      { id: "girassol", name: "Semente de Girassol", reason: "Preferir alto oleico. Limitar quantidade (alta gordura)", priority: "media" },
      { id: "painco", name: "Painço", reason: "Base do mix. Boa fonte de energia", priority: "alta" },
      { id: "aveia", name: "Aveia", reason: "Fibra e energia equilibrada", priority: "media" },
      { id: "linhaca", name: "Linhaça", reason: "Ômega-3 para qualidade de penas", priority: "media" },
    ],
    supplements: [
      { id: "supl-vitaminico", name: "Suplemento Vitamínico (Pote 5)", reason: "Colher média. Segunda, Quarta e Sexta", priority: "alta" },
      { id: "supl-mineral", name: "Suplemento Mineral (Pote 6)", reason: "Colher pequena. Apenas Quarta-feira", priority: "alta" },
      { id: "bloco-mineral", name: "Bloco Mineral", reason: "Fixo na gaiola. Trocar semanalmente", priority: "media" },
    ],
    warnings: [
      "Jiló é classificado como 'Pobre' (230 Kcal/Kg, baixa vitamina A) — substituir por batata doce ou abóbora",
      "Salada apenas de segunda a sexta — fim de semana apenas ração e água",
      "Ração de alta proteína recomendada para TODOS os Psittaculas",
    ],
    bookReferences: ["Vol. 1 — Fundamentos (Cap. Metabolismo)", "Vol. 2 — Espécies (Psittacula)", "Vol. 3 — Alimentos (Vegetais)", "Vol. 5 — Guia Alimentar"],
  },
  Polytelis: {
    rations: [
      { id: "racao-hp", name: "Ração Alta Proteína", reason: "Mesmo protocolo dos Psittaculas por porte/metabolismo similar (recomendação veterinária)", priority: "alta" },
      { id: "racao-hp-breed", name: "Ração Alta Proteína Reprodução", reason: "Fase reprodutiva apenas", priority: "media" },
    ],
    vegetables: [
      { id: "cenoura", name: "Cenoura", reason: "Betacaroteno essencial. Ralar no ralo grosso", priority: "alta" },
      { id: "couve", name: "Couve", reason: "Cálcio e vitamina A. Base da salada", priority: "alta" },
      { id: "brocolis", name: "Brócolis", reason: "Cálcio e vitaminas. Cru ou levemente cozido", priority: "alta" },
      { id: "batata-doce", name: "Batata Doce", reason: "Alta energia e vitamina A", priority: "alta" },
      { id: "abobora", name: "Abóbora", reason: "Substituto do jiló", priority: "media" },
      { id: "pimenta", name: "Pimenta", reason: "Vitamina A. Usar com sementes", priority: "media" },
    ],
    fruits: [
      { id: "maca", name: "Maçã", reason: "Boa aceitação. Retirar sementes", priority: "media" },
      { id: "goiaba", name: "Goiaba", reason: "Vitamina C", priority: "media" },
    ],
    saladBase: [
      { id: "couve", name: "Couve picada", reason: "Base principal", priority: "alta" },
      { id: "cenoura", name: "Cenoura ralada", reason: "Betacaroteno", priority: "alta" },
      { id: "batata-doce", name: "Batata doce cozida", reason: "Energia e vitamina A", priority: "alta" },
    ],
    seeds: [
      { id: "painco", name: "Painço", reason: "Base do mix", priority: "alta" },
      { id: "girassol", name: "Semente de Girassol", reason: "Alto oleico. Moderar", priority: "media" },
      { id: "aveia", name: "Aveia", reason: "Fibra e energia", priority: "media" },
    ],
    supplements: [
      { id: "supl-vitaminico", name: "Suplemento Vitamínico (Pote 5)", reason: "Seg, Qua, Sex", priority: "alta" },
      { id: "supl-mineral", name: "Suplemento Mineral (Pote 6)", reason: "Apenas Quarta", priority: "alta" },
    ],
    warnings: [
      "Polytelis recebem protocolo Psittacula por porte/metabolismo similar",
      "Príncipe de Gales é ave delicada — monitorar consumo",
    ],
    bookReferences: ["Vol. 2 — Espécies (Polytelis)", "Vol. 5 — Guia Alimentar"],
  },
  "Frugívoro": {
    rations: [
      { id: "racao-mini", name: "Ração Mini", reason: "Formulação para frugívoros. 35g/ave/dia. Menor teor de conservantes", priority: "alta" },
    ],
    vegetables: [
      { id: "cenoura", name: "Cenoura", reason: "Betacaroteno. Essencial para Ecletus", priority: "alta" },
      { id: "couve", name: "Couve", reason: "Cálcio. Importante para trato digestivo longo", priority: "alta" },
      { id: "brocolis", name: "Brócolis", reason: "Cálcio e vitaminas", priority: "alta" },
      { id: "batata-doce", name: "Batata Doce", reason: "Energia e vitamina A", priority: "alta" },
      { id: "abobora", name: "Abóbora", reason: "Vitamina A e fibra", priority: "alta" },
      { id: "pimenta", name: "Pimenta", reason: "Vitamina A — apenas dias de semana", priority: "media" },
    ],
    fruits: [
      { id: "mamao", name: "Mamão", reason: "ESSENCIAL para Ecletus. Rico em enzimas digestivas e vitamina A", priority: "alta" },
      { id: "manga", name: "Manga", reason: "Rica em vitamina A. Oferecer madura. Excelente para frugívoros", priority: "alta" },
      { id: "goiaba", name: "Goiaba", reason: "Vitamina C e fibra. Pode ser oferecida inteira", priority: "alta" },
      { id: "banana", name: "Banana", reason: "Potássio. Moderar quantidade (alta em açúcar)", priority: "media" },
      { id: "maca", name: "Maçã", reason: "Boa aceitação. Retirar sementes", priority: "media" },
      { id: "uva", name: "Uva", reason: "Antioxidantes. Sem sementes", priority: "media" },
    ],
    saladBase: [
      { id: "couve", name: "Couve picada", reason: "Base — cálcio essencial", priority: "alta" },
      { id: "cenoura", name: "Cenoura ralada", reason: "Betacaroteno", priority: "alta" },
      { id: "mamao", name: "Mamão picado", reason: "Enzimas digestivas — fundamental para frugívoros", priority: "alta" },
      { id: "batata-doce", name: "Batata doce cozida", reason: "Energia e vitamina A", priority: "alta" },
    ],
    seeds: [
      { id: "girassol", name: "Semente de Girassol", reason: "Moderar — frugívoros precisam mais de frutas que sementes", priority: "baixa" },
      { id: "painco", name: "Painço", reason: "Complemento energético", priority: "media" },
    ],
    supplements: [
      { id: "supl-vitaminico", name: "Suplemento Vitamínico (Pote 5)", reason: "Seg, Qua, Sex — COM CAUTELA para Ecletus", priority: "alta" },
      { id: "supl-mineral", name: "Suplemento Mineral (Pote 6)", reason: "Apenas Quarta", priority: "alta" },
      { id: "osso-siba", name: "Osso de Síba", reason: "Cálcio natural. Repor quando gasto", priority: "media" },
    ],
    warnings: [
      "Ecletus são SENSÍVEIS a excesso de vitaminas artificiais, conservantes e corantes",
      "Trato digestivo longo — dieta DEVE ser rica em frutas e vegetais frescos",
      "Salada TODOS os dias (7 dias por semana), incluindo fim de semana",
      "Fim de semana: salada SEM pimenta e SEM suplemento",
    ],
    bookReferences: ["Vol. 2 — Espécies (Eclectus)", "Vol. 3 — Alimentos (Frutas)", "Vol. 5 — Guia Alimentar", "Artigo Eclectus (ACPERJ&BR)"],
  },
  "Africano Grande": {
    rations: [
      { id: "racao-mini", name: "Ração Mini", reason: "35g/ave/dia. Protocolo similar ao Ecletus pelo porte", priority: "alta" },
    ],
    vegetables: [
      { id: "cenoura", name: "Cenoura", reason: "Betacaroteno", priority: "alta" },
      { id: "couve", name: "Couve", reason: "Cálcio — Congo necessita suplementação extra", priority: "alta" },
      { id: "brocolis", name: "Brócolis", reason: "Alto cálcio — importante para Congo", priority: "alta" },
      { id: "batata-doce", name: "Batata Doce", reason: "Energia e vitamina A", priority: "alta" },
    ],
    fruits: [
      { id: "mamao", name: "Mamão", reason: "Enzimas digestivas e vitamina A", priority: "alta" },
      { id: "manga", name: "Manga", reason: "Vitamina A", priority: "alta" },
      { id: "goiaba", name: "Goiaba", reason: "Vitamina C", priority: "media" },
      { id: "banana", name: "Banana", reason: "Potássio. Moderar", priority: "media" },
    ],
    saladBase: [
      { id: "couve", name: "Couve picada", reason: "Cálcio essencial para Congo", priority: "alta" },
      { id: "cenoura", name: "Cenoura ralada", reason: "Betacaroteno", priority: "alta" },
      { id: "brocolis", name: "Brócolis picado", reason: "Cálcio extra", priority: "alta" },
    ],
    seeds: [
      { id: "girassol", name: "Semente de Girassol", reason: "Moderar quantidade", priority: "media" },
      { id: "painco", name: "Painço", reason: "Complemento", priority: "media" },
    ],
    supplements: [
      { id: "supl-vitaminico", name: "Suplemento Vitamínico (Pote 5)", reason: "Seg, Qua, Sex", priority: "alta" },
      { id: "supl-mineral", name: "Suplemento Mineral (Pote 6)", reason: "Apenas Quarta", priority: "alta" },
      { id: "osso-siba", name: "Osso de Síba", reason: "Cálcio natural — ESSENCIAL para Congo", priority: "alta" },
    ],
    warnings: [
      "Congo necessita suplementação EXTRA de cálcio (hipocalcemia comum)",
      "Necessita enriquecimento ambiental intenso",
      "Salada TODOS os dias (7 dias por semana)",
    ],
    bookReferences: ["Vol. 2 — Espécies (Psittacus)", "Vol. 3 — Alimentos", "Vol. 5 — Guia Alimentar"],
  },
  "Africano Médio": {
    rations: [
      { id: "racao-mini", name: "Ração Mini", reason: "20g/ave/dia", priority: "alta" },
    ],
    vegetables: [
      { id: "cenoura", name: "Cenoura", reason: "Betacaroteno", priority: "alta" },
      { id: "couve", name: "Couve", reason: "Cálcio e vitamina A", priority: "alta" },
      { id: "brocolis", name: "Brócolis", reason: "Cálcio e vitaminas", priority: "alta" },
      { id: "batata-doce", name: "Batata Doce", reason: "Energia", priority: "media" },
    ],
    fruits: [
      { id: "mamao", name: "Mamão", reason: "Vitamina A e enzimas", priority: "alta" },
      { id: "manga", name: "Manga", reason: "Vitamina A", priority: "media" },
      { id: "goiaba", name: "Goiaba", reason: "Vitamina C", priority: "media" },
    ],
    saladBase: [
      { id: "couve", name: "Couve picada", reason: "Base principal", priority: "alta" },
      { id: "cenoura", name: "Cenoura ralada", reason: "Betacaroteno", priority: "alta" },
      { id: "brocolis", name: "Brócolis picado", reason: "Cálcio", priority: "alta" },
    ],
    seeds: [
      { id: "girassol", name: "Semente de Girassol", reason: "Moderar", priority: "media" },
      { id: "painco", name: "Painço", reason: "Base do mix", priority: "alta" },
    ],
    supplements: [
      { id: "supl-vitaminico", name: "Suplemento Vitamínico (Pote 5)", reason: "Seg, Qua, Sex", priority: "alta" },
      { id: "supl-mineral", name: "Suplemento Mineral (Pote 6)", reason: "Apenas Quarta", priority: "alta" },
    ],
    warnings: [
      "Apreciam frutas e nozes",
      "Enriquecimento ambiental importante",
      "Salada TODOS os dias (7 dias por semana)",
    ],
    bookReferences: ["Vol. 2 — Espécies (Poicephalus)", "Vol. 5 — Guia Alimentar"],
  },
  Cacatua: {
    rations: [
      { id: "racao-mini", name: "Ração Mini", reason: "30-45g/ave/dia conforme porte. Goffini 30g, Alba/Galerita/Moluca 40-45g", priority: "alta" },
    ],
    vegetables: [
      { id: "cenoura", name: "Cenoura", reason: "Betacaroteno. Baixa caloria — bom para controle de peso", priority: "alta" },
      { id: "couve", name: "Couve", reason: "Cálcio essencial", priority: "alta" },
      { id: "brocolis", name: "Brócolis", reason: "Cálcio e vitaminas", priority: "alta" },
      { id: "batata-doce", name: "Batata Doce", reason: "Energia — moderar para Galah (tendência a obesidade)", priority: "media" },
      { id: "abobora", name: "Abóbora", reason: "Vitamina A e fibra", priority: "media" },
    ],
    fruits: [
      { id: "maca", name: "Maçã", reason: "Baixa caloria. Boa para controle de peso", priority: "alta" },
      { id: "goiaba", name: "Goiaba", reason: "Vitamina C", priority: "media" },
      { id: "mamao", name: "Mamão", reason: "Vitamina A", priority: "media" },
    ],
    saladBase: [
      { id: "cenoura", name: "Cenoura ralada", reason: "Baixa caloria e betacaroteno", priority: "alta" },
      { id: "couve", name: "Couve picada", reason: "Cálcio", priority: "alta" },
      { id: "brocolis", name: "Brócolis picado", reason: "Cálcio e vitaminas", priority: "alta" },
    ],
    seeds: [
      { id: "painco", name: "Painço", reason: "Menor teor de gordura que girassol", priority: "alta" },
      { id: "aveia", name: "Aveia", reason: "Fibra", priority: "media" },
      { id: "girassol", name: "Semente de Girassol", reason: "LIMITAR para Galah — tendência a obesidade", priority: "baixa" },
    ],
    supplements: [
      { id: "supl-vitaminico", name: "Suplemento Vitamínico", reason: "Seg, Qua, Sex", priority: "alta" },
      { id: "supl-mineral", name: "Suplemento Mineral", reason: "Apenas Quarta", priority: "alta" },
      { id: "bloco-mineral", name: "Bloco Mineral", reason: "Fixo na gaiola — desgaste do bico", priority: "alta" },
    ],
    warnings: [
      "Galah: tendência FORTE a obesidade — controlar gordura rigorosamente",
      "Necessitam enriquecimento ambiental INTENSO (destruição de brinquedos)",
      "Salada TODOS os dias (7 dias por semana)",
      "Porção varia conforme porte: Goffini 30g, Alba/Galerita/Moluca 40-45g",
    ],
    bookReferences: ["Vol. 2 — Espécies (Cacatua)", "Vol. 3 — Alimentos", "Vol. 4 — Tabelas", "Vol. 5 — Guia Alimentar"],
  },
  Rosella: {
    rations: [
      { id: "racao-hp", name: "Ração Alta Proteína", reason: "12-18g/ave/dia conforme porte. Icterotis 12g, Pennat/Port Lincoln 18g", priority: "alta" },
    ],
    vegetables: [
      { id: "cenoura", name: "Cenoura", reason: "Betacaroteno", priority: "alta" },
      { id: "couve", name: "Couve", reason: "Cálcio", priority: "alta" },
      { id: "brocolis", name: "Brócolis", reason: "Cálcio e vitaminas", priority: "alta" },
      { id: "pimenta", name: "Pimenta", reason: "Vitamina A", priority: "media" },
    ],
    fruits: [
      { id: "maca", name: "Maçã", reason: "Boa aceitação", priority: "media" },
      { id: "goiaba", name: "Goiaba", reason: "Vitamina C", priority: "media" },
    ],
    saladBase: [
      { id: "cenoura", name: "Cenoura ralada", reason: "Base", priority: "alta" },
      { id: "couve", name: "Couve picada", reason: "Cálcio", priority: "alta" },
      { id: "brocolis", name: "Brócolis picado", reason: "Vitaminas", priority: "alta" },
    ],
    seeds: [
      { id: "painco", name: "Painço", reason: "Base do mix", priority: "alta" },
      { id: "girassol", name: "Semente de Girassol", reason: "Moderar", priority: "media" },
      { id: "aveia", name: "Aveia", reason: "Fibra", priority: "media" },
    ],
    supplements: [
      { id: "supl-vitaminico", name: "Suplemento Vitamínico", reason: "Seg, Qua, Sex", priority: "alta" },
      { id: "supl-mineral", name: "Suplemento Mineral", reason: "Apenas Quarta", priority: "alta" },
    ],
    warnings: [
      "Protocolo similar aos Psittaculas",
      "Icterotis é menor — porção reduzida (12g)",
      "Port Lincoln pode necessitar porção maior (18g)",
      "Gostam de forragear — espalhar sementes no chão do viveiro",
    ],
    bookReferences: ["Vol. 2 — Espécies (Platycercus)", "Vol. 5 — Guia Alimentar"],
  },
  Neophema: {
    rations: [
      { id: "racao-hp", name: "Ração Alta Proteína", reason: "10g/ave/dia. Aves pequenas e delicadas", priority: "alta" },
    ],
    vegetables: [
      { id: "cenoura", name: "Cenoura", reason: "Betacaroteno. Ralar fino", priority: "alta" },
      { id: "couve", name: "Couve", reason: "Cálcio. Picar bem fino", priority: "alta" },
      { id: "brocolis", name: "Brócolis", reason: "Picar em pedaços pequenos", priority: "alta" },
    ],
    fruits: [
      { id: "maca", name: "Maçã", reason: "Picar em pedaços pequenos. Retirar sementes", priority: "media" },
      { id: "uva", name: "Uva", reason: "Cortar ao meio. Sem sementes", priority: "baixa" },
    ],
    saladBase: [
      { id: "cenoura", name: "Cenoura ralada fina", reason: "Betacaroteno", priority: "alta" },
      { id: "couve", name: "Couve picada fina", reason: "Cálcio", priority: "alta" },
      { id: "brocolis", name: "Brócolis picado fino", reason: "Vitaminas", priority: "alta" },
    ],
    seeds: [
      { id: "painco", name: "Painço", reason: "Base principal para aves pequenas", priority: "alta" },
      { id: "aveia", name: "Aveia", reason: "Fibra", priority: "media" },
      { id: "linhaca", name: "Linhaça", reason: "Ômega-3 para penas", priority: "media" },
    ],
    supplements: [
      { id: "supl-vitaminico", name: "Suplemento Vitamínico", reason: "Seg, Qua, Sex — dose pequena", priority: "alta" },
      { id: "supl-mineral", name: "Suplemento Mineral", reason: "Apenas Quarta — dose pequena", priority: "alta" },
    ],
    warnings: [
      "Aves PEQUENAS e DELICADAS — porções pequenas",
      "Bourke é crepuscular — mais ativo ao amanhecer e entardecer",
      "Sensíveis a mudanças bruscas na dieta — transição gradual",
      "Gostam de forragear no chão do viveiro",
    ],
    bookReferences: ["Vol. 2 — Espécies (Neophema)", "Vol. 5 — Guia Alimentar"],
  },
  Forpus: {
    rations: [
      { id: "racao-hp", name: "Ração Alta Proteína", reason: "8g/ave/dia. Menores psitacídeos", priority: "alta" },
    ],
    vegetables: [
      { id: "cenoura", name: "Cenoura", reason: "Ralar fino. Betacaroteno", priority: "alta" },
      { id: "couve", name: "Couve", reason: "Picar bem fino. Cálcio", priority: "alta" },
      { id: "brocolis", name: "Brócolis", reason: "Picar pequeno", priority: "media" },
    ],
    fruits: [
      { id: "maca", name: "Maçã", reason: "Picar pequeno. Retirar sementes", priority: "media" },
      { id: "banana", name: "Banana", reason: "Pequenos pedaços. Moderar", priority: "baixa" },
    ],
    saladBase: [
      { id: "cenoura", name: "Cenoura ralada fina", reason: "Base", priority: "alta" },
      { id: "couve", name: "Couve picada fina", reason: "Cálcio", priority: "alta" },
    ],
    seeds: [
      { id: "painco", name: "Painço", reason: "Base principal — tamanho ideal para Forpus", priority: "alta" },
      { id: "aveia", name: "Aveia", reason: "Complemento", priority: "media" },
    ],
    supplements: [
      { id: "supl-vitaminico", name: "Suplemento Vitamínico", reason: "Seg, Qua, Sex — dose mínima", priority: "alta" },
      { id: "supl-mineral", name: "Suplemento Mineral", reason: "Apenas Quarta — dose mínima", priority: "alta" },
    ],
    warnings: [
      "Menores psitacídeos do plantel — porções MUITO pequenas",
      "Metabolismo rápido — monitorar consumo diário",
    ],
    bookReferences: ["Vol. 2 — Espécies (Forpus)", "Vol. 5 — Guia Alimentar"],
  },
  "Australiano Pequeno": {
    rations: [
      { id: "racao-hp", name: "Ração Alta Proteína", reason: "10-12g/ave/dia conforme porte", priority: "alta" },
    ],
    vegetables: [
      { id: "cenoura", name: "Cenoura", reason: "Betacaroteno", priority: "alta" },
      { id: "couve", name: "Couve", reason: "Cálcio", priority: "alta" },
      { id: "brocolis", name: "Brócolis", reason: "Cálcio e vitaminas", priority: "alta" },
    ],
    fruits: [
      { id: "maca", name: "Maçã", reason: "Boa aceitação", priority: "media" },
      { id: "goiaba", name: "Goiaba", reason: "Vitamina C", priority: "media" },
    ],
    saladBase: [
      { id: "cenoura", name: "Cenoura ralada", reason: "Base", priority: "alta" },
      { id: "couve", name: "Couve picada", reason: "Cálcio", priority: "alta" },
    ],
    seeds: [
      { id: "painco", name: "Painço", reason: "Base do mix", priority: "alta" },
      { id: "girassol", name: "Semente de Girassol", reason: "Moderar", priority: "media" },
    ],
    supplements: [
      { id: "supl-vitaminico", name: "Suplemento Vitamínico", reason: "Seg, Qua, Sex", priority: "alta" },
      { id: "supl-mineral", name: "Suplemento Mineral", reason: "Apenas Quarta", priority: "alta" },
    ],
    warnings: [
      "Kakariki: metabolismo ACELERADO — monitorar consumo",
      "Red Rumped e Hooded: forrageiros de chão",
    ],
    bookReferences: ["Vol. 2 — Espécies (Psephotus/Cyanoramphus)", "Vol. 5 — Guia Alimentar"],
  },
  "Australiano Médio": {
    rations: [
      { id: "racao-hp", name: "Ração Alta Proteína", reason: "20-25g/ave/dia conforme porte", priority: "alta" },
    ],
    vegetables: [
      { id: "cenoura", name: "Cenoura", reason: "Betacaroteno", priority: "alta" },
      { id: "couve", name: "Couve", reason: "Cálcio", priority: "alta" },
      { id: "brocolis", name: "Brócolis", reason: "Cálcio e vitaminas", priority: "alta" },
      { id: "batata-doce", name: "Batata Doce", reason: "Energia", priority: "media" },
    ],
    fruits: [
      { id: "maca", name: "Maçã", reason: "Boa aceitação", priority: "media" },
      { id: "goiaba", name: "Goiaba", reason: "Vitamina C", priority: "media" },
      { id: "mamao", name: "Mamão", reason: "Vitamina A", priority: "media" },
    ],
    saladBase: [
      { id: "cenoura", name: "Cenoura ralada", reason: "Base", priority: "alta" },
      { id: "couve", name: "Couve picada", reason: "Cálcio", priority: "alta" },
      { id: "brocolis", name: "Brócolis picado", reason: "Vitaminas", priority: "alta" },
    ],
    seeds: [
      { id: "painco", name: "Painço", reason: "Base", priority: "alta" },
      { id: "girassol", name: "Semente de Girassol", reason: "Moderar", priority: "media" },
      { id: "aveia", name: "Aveia", reason: "Fibra", priority: "media" },
    ],
    supplements: [
      { id: "supl-vitaminico", name: "Suplemento Vitamínico", reason: "Seg, Qua, Sex", priority: "alta" },
      { id: "supl-mineral", name: "Suplemento Mineral", reason: "Apenas Quarta", priority: "alta" },
    ],
    warnings: [
      "King Parrot aprecia frutas e vegetais frescos",
      "RedWing: protocolo intermediário",
    ],
    bookReferences: ["Vol. 2 — Espécies (Alisterus/Aprosmictus)", "Vol. 5 — Guia Alimentar"],
  },
};

export function getRecommendationsForSpecies(speciesId: string): FeedingRecommendation | null {
  const sp = species.find(s => s.id === speciesId);
  if (!sp) return null;
  const rec = groupRecommendations[sp.group];
  if (!rec) return null;
  return { speciesId, ...rec };
}

// ============================================
// HELPERS
// ============================================

export function getSpeciesById(id: string): Species | undefined {
  return species.find(s => s.id === id);
}

export function getSpeciesByGroup(group: SpeciesGroup): Species[] {
  return species.filter(s => s.group === group);
}

export function getProtocolForSpecies(speciesId: string): GroupProtocol | undefined {
  return groupProtocols.find(p => p.species.includes(speciesId));
}

export function calculateMER(weightGrams: number, kFactor: number): number {
  const weightKg = weightGrams / 1000;
  return kFactor * Math.pow(weightKg, 0.75);
}

export function getDayOfWeekName(): string {
  const days = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
  return days[new Date().getDay()];
}

export function getTodayProtocol(protocol: GroupProtocol): DailyProtocol | undefined {
  const today = getDayOfWeekName();
  return protocol.weeklyProtocol.find(p => p.dayOfWeek === today);
}

export const speciesGroups: { id: SpeciesGroup; label: string; color: string }[] = [
  { id: "Psittacula", label: "Psittaculas", color: "emerald" },
  { id: "Polytelis", label: "Polytelis", color: "teal" },
  { id: "Frugívoro", label: "Frugívoros", color: "orange" },
  { id: "Africano Grande", label: "Africanos Grandes", color: "violet" },
  { id: "Africano Médio", label: "Africanos Médios", color: "purple" },
  { id: "Cacatua", label: "Cacatuas", color: "rose" },
  { id: "Rosella", label: "Rosellas", color: "blue" },
  { id: "Neophema", label: "Neophemas", color: "cyan" },
  { id: "Australiano Pequeno", label: "Australianos Pequenos", color: "lime" },
  { id: "Australiano Médio", label: "Australianos Médios", color: "sky" },
  { id: "Forpus", label: "Forpus", color: "indigo" },
];
