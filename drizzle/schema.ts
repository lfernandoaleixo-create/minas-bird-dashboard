import { int, json, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Dietas salvas — receitas nutricionais por espécie
 * Armazena a composição completa da dieta (ração, vegetais, frutas, proteicos)
 */
export const diets = mysqlTable("diets", {
  id: int("id").autoincrement().primaryKey(),
  /** ID legado (string) para compatibilidade com dados migrados do localStorage */
  legacyId: varchar("legacyId", { length: 64 }).notNull().unique(),
  /** Usuário que criou a dieta */
  userId: int("userId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  speciesId: varchar("speciesId", { length: 128 }).notNull(),
  speciesName: varchar("speciesName", { length: 255 }).notNull(),
  racaoId: varchar("racaoId", { length: 128 }).notNull(),
  racaoName: varchar("racaoName", { length: 255 }).notNull(),
  /** Segunda ração (opcional) — ID e nome */
  racao2Id: varchar("racao2Id", { length: 128 }),
  racao2Name: varchar("racao2Name", { length: 255 }),
  /** Porcentagem da 1ª ração (25, 50, 75 ou 100). A 2ª ração recebe 100 - racao1Pct */
  racao1Pct: int("racao1Pct").notNull().default(100),
  /** IDs dos vegetais selecionados */
  vegetaisIds: json("vegetaisIds").$type<string[]>().notNull(),
  /** IDs das frutas selecionadas */
  frutasIds: json("frutasIds").$type<string[]>().notNull(),
  /** IDs dos proteicos selecionados */
  proteicosIds: json("proteicosIds").$type<string[]>().notNull(),
  /** Peso da ave em gramas */
  weight: int("weight").notNull(),
  phaseId: varchar("phaseId", { length: 64 }).notNull(),
  enclosureId: varchar("enclosureId", { length: 64 }).notNull(),
  birdCount: int("birdCount").notNull().default(1),
  /** Observações adicionais sobre a dieta */
  notes: text("notes"),
  /** Cor da dieta para identificação visual (hex, ex: #4CAF50) */
  color: varchar("color", { length: 7 }),
  /** MER calculado (kcal/dia por ave) — armazenado como inteiro * 10 */
  merX10: int("merX10").notNull(),
  /** Total de gramas por ave — armazenado como inteiro * 10 */
  totalGramsX10: int("totalGramsX10").notNull(),
  /** Total de kcal por ave — armazenado como inteiro * 10 */
  totalKcalX10: int("totalKcalX10").notNull(),
  /** Itens detalhados da dieta (ração, vegetais, frutas, proteicos) */
  items: json("items").$type<{
    racao: DietItemJson[];
    vegetais: DietItemJson[];
    frutas: DietItemJson[];
    proteicos: DietItemJson[];
  }>().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export interface DietItemJson {
  foodId: string;
  foodName: string;
  grams: number;
  kcal: number;
  energyKcalPerKg: number;
}

export type Diet = typeof diets.$inferSelect;
export type InsertDiet = typeof diets.$inferInsert;

/**
 * Calendário de alimentação por espécie
 * Cada registro atribui uma dieta a um dia específico para uma espécie
 * dayKey no formato "ano-mês-dia", ex: "2026-1-5" para 5 de janeiro de 2026
 */
export const calendarEntries = mysqlTable("calendar_entries", {
  id: int("id").autoincrement().primaryKey(),
  /** Usuário que criou a entrada */
  userId: int("userId").notNull(),
  speciesId: varchar("speciesId", { length: 128 }).notNull(),
  /** Chave do dia no formato "ano-mês-dia", ex: "2026-1-5" */
  dayKey: varchar("dayKey", { length: 16 }).notNull(),
  /** ID legado da dieta (legacyId da tabela diets) */
  dietLegacyId: varchar("dietLegacyId", { length: 64 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type CalendarEntry = typeof calendarEntries.$inferSelect;
export type InsertCalendarEntry = typeof calendarEntries.$inferInsert;

/**
 * Ordem de prioridade dos módulos no mapa de progresso
 * Armazena a ordem de exibição dos módulos (menor sortOrder = maior prioridade)
 */
export const moduleOrder = mysqlTable("module_order", {
  id: int("id").autoincrement().primaryKey(),
  /** ID do módulo (ex: '__alimentacao__', 'viveiros-e-matrizes') */
  moduleId: varchar("moduleId", { length: 128 }).notNull().unique(),
  /** Ordem de exibição (0 = primeiro/mais prioritário) */
  sortOrder: int("sortOrder").notNull().default(0),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ModuleOrder = typeof moduleOrder.$inferSelect;
export type InsertModuleOrder = typeof moduleOrder.$inferInsert;

/**
 * Comentários dos funcionários nos tópicos do mapa de progresso
 * Cada registro é um comentário vinculado a um módulo + tópico
 * topicKey no formato "moduleId::topicIndex" (ex: "__alimentacao__::0")
 */
export const topicComments = mysqlTable("topic_comments", {
  id: int("id").autoincrement().primaryKey(),
  /** Chave do tópico: moduleId::topicOriginalIndex */
  topicKey: varchar("topicKey", { length: 255 }).notNull().unique(),
  /** Texto do comentário */
  comment: text("comment").notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type TopicComment = typeof topicComments.$inferSelect;
export type InsertTopicComment = typeof topicComments.$inferInsert;

/**
 * Cadastro de clientes do criatório
 * Armazena informações completas dos clientes (compradores de aves)
 */
export const clients = mysqlTable("clients", {
  id: int("id").autoincrement().primaryKey(),
  /** Nome completo do cliente */
  name: varchar("name", { length: 255 }).notNull(),
  /** Telefone principal (WhatsApp) */
  phone: varchar("phone", { length: 32 }).notNull(),
  /** Telefone secundário (opcional) */
  phone2: varchar("phone2", { length: 32 }),
  /** Email do cliente */
  email: varchar("email", { length: 320 }),
  /** CPF do cliente */
  cpf: varchar("cpf", { length: 14 }),
  /** Endereço completo */
  address: text("address"),
  /** Cidade */
  city: varchar("city", { length: 128 }),
  /** Estado (UF) */
  state: varchar("state", { length: 2 }),
  /** CEP */
  cep: varchar("cep", { length: 10 }),
  /** Espécies de interesse (JSON array de nomes) */
  speciesInterest: json("speciesInterest").$type<string[]>(),
  /** Como conheceu o criatório */
  referralSource: varchar("referralSource", { length: 128 }),
  /** Observações gerais */
  notes: text("notes"),
  /** Status do cliente: ativo, inativo, lista de espera */
  status: mysqlEnum("status", ["ativo", "inativo", "lista_espera"]).default("ativo").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Client = typeof clients.$inferSelect;
export type InsertClient = typeof clients.$inferInsert;

/**
 * Histórico de compras/vendas do cliente
 * Cada registro é uma transação (venda de ave)
 */
export const clientPurchases = mysqlTable("client_purchases", {
  id: int("id").autoincrement().primaryKey(),
  /** ID do cliente */
  clientId: int("clientId").notNull(),
  /** Espécie vendida */
  species: varchar("species", { length: 255 }).notNull(),
  /** Quantidade de aves */
  quantity: int("quantity").notNull().default(1),
  /** Valor total da venda em centavos (R$) */
  valueCents: int("valueCents"),
  /** Forma de pagamento */
  paymentMethod: mysqlEnum("paymentMethod", ["pix", "dinheiro", "cartao_debito", "cartao_credito", "boleto", "transferencia"]),
  /** Número de parcelas (1 = à vista) */
  installments: int("installments").default(1),
  /** Número da nota fiscal / recibo */
  invoiceNumber: varchar("invoiceNumber", { length: 64 }),
  /** Data da venda */
  saleDate: timestamp("saleDate").notNull(),
  /** Observações da venda */
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ClientPurchase = typeof clientPurchases.$inferSelect;
export type InsertClientPurchase = typeof clientPurchases.$inferInsert;

/**
 * Parcelas de uma venda
 * Cada registro é uma parcela com valor, vencimento e status de pagamento
 */
export const saleInstallments = mysqlTable("sale_installments", {
  id: int("id").autoincrement().primaryKey(),
  /** ID da venda (client_purchases) */
  purchaseId: int("purchaseId").notNull(),
  /** Número da parcela (1, 2, 3...) */
  installmentNumber: int("installmentNumber").notNull(),
  /** Valor da parcela em centavos */
  valueCents: int("valueCents").notNull(),
  /** Data de vencimento */
  dueDate: timestamp("dueDate").notNull(),
  /** Data em que foi pago (null = não pago) */
  paidAt: timestamp("paidAt"),
  /** Status da parcela */
  status: mysqlEnum("installmentStatus", ["pendente", "pago", "atrasado"]).default("pendente").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type SaleInstallment = typeof saleInstallments.$inferSelect;
export type InsertSaleInstallment = typeof saleInstallments.$inferInsert;

/**
 * Alimentos adicionados ao calendário geral (Alimentação Teste)
 * Cada registro é um alimento que foi adicionado a uma das 3 tabelas (vegetais, frutas, sementes)
 */
export const foodCalendarFoods = mysqlTable("food_calendar_foods", {
  id: int("id").autoincrement().primaryKey(),
  /** Nome do alimento */
  name: varchar("name", { length: 255 }).notNull(),
  /** Categoria: vegetais, frutas, sementes */
  category: varchar("category", { length: 64 }).notNull(),
  /** Qualidade: excelente, bom, pobre */
  quality: varchar("quality", { length: 32 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type FoodCalendarFood = typeof foodCalendarFoods.$inferSelect;
export type InsertFoodCalendarFood = typeof foodCalendarFoods.$inferInsert;

/**
 * Marcações (checks) do calendário geral
 * Cada registro indica que um alimento foi servido em um dia específico de um mês
 * checkKey no formato "YYYY-MM|foodName|day"
 */
export const foodCalendarChecks = mysqlTable("food_calendar_checks", {
  id: int("id").autoincrement().primaryKey(),
  /** Chave única: YYYY-MM|foodName|day */
  checkKey: varchar("checkKey", { length: 255 }).notNull().unique(),
  /** Marcado = true */
  checked: int("checked").notNull().default(1),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type FoodCalendarCheck = typeof foodCalendarChecks.$inferSelect;
export type InsertFoodCalendarCheck = typeof foodCalendarChecks.$inferInsert;

/**
 * Alimentos exclusivos por espécie no calendário
 * Cada registro é um alimento adicionado diretamente no card de uma espécie
 */
export const foodCalendarSpeciesFoods = mysqlTable("food_calendar_species_foods", {
  id: int("id").autoincrement().primaryKey(),
  /** ID da espécie */
  speciesId: varchar("speciesId", { length: 128 }).notNull(),
  /** Nome do alimento */
  name: varchar("name", { length: 255 }).notNull(),
  /** Categoria: racoes, vegetais, frutas, sementes */
  category: varchar("category", { length: 64 }).notNull(),
  /** Qualidade: excelente, bom, pobre */
  quality: varchar("quality", { length: 32 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type FoodCalendarSpeciesFood = typeof foodCalendarSpeciesFoods.$inferSelect;
export type InsertFoodCalendarSpeciesFood = typeof foodCalendarSpeciesFoods.$inferInsert;

/**
 * Marcações por espécie no calendário
 * checkKey no formato "YYYY-MM|foodName|day"
 */
export const foodCalendarSpeciesChecks = mysqlTable("food_calendar_species_checks", {
  id: int("id").autoincrement().primaryKey(),
  /** ID da espécie */
  speciesId: varchar("speciesId", { length: 128 }).notNull(),
  /** Chave: YYYY-MM|foodName|day */
  checkKey: varchar("checkKey", { length: 255 }).notNull(),
  /** Marcado = true */
  checked: int("checked").notNull().default(1),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type FoodCalendarSpeciesCheck = typeof foodCalendarSpeciesChecks.$inferSelect;
export type InsertFoodCalendarSpeciesCheck = typeof foodCalendarSpeciesChecks.$inferInsert;

/**
 * Fase selecionada por espécie no calendário
 */
export const foodCalendarSpeciesPhase = mysqlTable("food_calendar_species_phase", {
  id: int("id").autoincrement().primaryKey(),
  /** ID da espécie */
  speciesId: varchar("speciesId", { length: 128 }).notNull().unique(),
  /** ID da fase selecionada */
  phaseId: varchar("phaseId", { length: 64 }).notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type FoodCalendarSpeciesPhase = typeof foodCalendarSpeciesPhase.$inferSelect;
export type InsertFoodCalendarSpeciesPhase = typeof foodCalendarSpeciesPhase.$inferInsert;

/**
 * Configurações da calculadora de dieta por espécie
 * Armazena ração selecionada, % ração e multiplicador de recinto
 */
export const dietCalcConfig = mysqlTable("diet_calc_config", {
  id: int("id").autoincrement().primaryKey(),
  /** ID da espécie */
  speciesId: varchar("speciesId", { length: 128 }).notNull().unique(),
  /** ID da ração selecionada (null = nenhuma) */
  racaoId: varchar("racaoId", { length: 128 }),
  /** Porcentagem de ração (50-100) */
  racaoPct: int("racaoPct").notNull().default(70),
  /** Multiplicador do recinto (float * 100 para armazenar como int) */
  enclosureMultiplierX100: int("enclosureMultiplierX100").notNull().default(100),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type DietCalcConfig = typeof dietCalcConfig.$inferSelect;
export type InsertDietCalcConfig = typeof dietCalcConfig.$inferInsert;

/**
 * Ordem dos tópicos dentro de cada módulo no mapa de progresso
 * Substitui o localStorage "minas-bird-topic-order"
 */
export const topicOrder = mysqlTable("topic_order", {
  id: int("id").autoincrement().primaryKey(),
  /** ID do módulo */
  moduleId: varchar("moduleId", { length: 128 }).notNull().unique(),
  /** Array JSON com a ordem dos índices originais dos tópicos */
  orderJson: json("orderJson").$type<number[]>().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type TopicOrder = typeof topicOrder.$inferSelect;
export type InsertTopicOrder = typeof topicOrder.$inferInsert;

/**
 * Cadastro do plantel — aves do criatório
 * Cada registro é uma ave individual com anilha, espécie, sexo, etc.
 */
export const plantel = mysqlTable("plantel", {
  id: int("id").autoincrement().primaryKey(),
  /** ID da espécie (referencia feeding.ts species.id) */
  speciesId: varchar("speciesId", { length: 128 }).notNull(),
  /** Nome comum da espécie (desnormalizado para facilitar listagem) */
  speciesName: varchar("speciesName", { length: 255 }).notNull(),
  /** Código da ave (prefixo + número, ex: RN001) */
  ringNumber: varchar("ringNumber", { length: 64 }),
  /** Número da anilha física */
  anilha: varchar("anilha", { length: 64 }),
  /** Sexo da ave */
  sex: mysqlEnum("sex", ["macho", "femea", "indefinido"]).default("indefinido").notNull(),
  /** Data de nascimento / eclosão */
  birthDate: timestamp("birthDate"),
  /** Mutação / cor da ave */
  mutation: varchar("mutation", { length: 255 }),
  /** Origem da ave: nascido no criatório, comprado, doado, troca */
  origin: mysqlEnum("origin", ["nascido_criadouro", "comprado", "doado", "troca"]).default("nascido_criadouro").notNull(),
  /** Criatório de origem (se comprado/troca) */
  originBreeder: varchar("originBreeder", { length: 255 }),
  /** Status da ave no plantel */
  status: mysqlEnum("birdStatus", ["ativo", "vendido", "obito", "doado", "emprestado"]).default("ativo").notNull(),
  /** Recinto / viveiro onde está alojada */
  enclosure: varchar("enclosure", { length: 128 }),
  /** Peso atual em gramas */
  weightGrams: int("weightGrams"),
  /** ID do pai (referencia outra ave do plantel) */
  fatherId: int("fatherId"),
  /** ID da mãe (referencia outra ave do plantel) */
  motherId: int("motherId"),
  /** Número da Nota Fiscal (quando possui NF) */
  invoiceNumber: varchar("invoiceNumber", { length: 128 }),
  /** Observações gerais */
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Plantel = typeof plantel.$inferSelect;
export type InsertPlantel = typeof plantel.$inferInsert;

/**
 * Documentos anexados às aves do plantel (NF, certificados, exames, etc.)
 */
export const birdDocuments = mysqlTable("bird_documents", {
  id: int("id").autoincrement().primaryKey(),
  /** ID da ave no plantel */
  birdId: int("birdId").notNull(),
  /** Tipo do documento (nf, certificado_origem, atestado_saude, gta, sexagem, exame_sanidade, outro) */
  docType: varchar("docType", { length: 64 }).notNull(),
  /** Nome original do arquivo */
  fileName: varchar("fileName", { length: 255 }).notNull(),
  /** URL do arquivo no S3 */
  fileUrl: text("fileUrl").notNull(),
  /** Chave do arquivo no S3 */
  fileKey: varchar("fileKey", { length: 512 }).notNull(),
  /** MIME type */
  mimeType: varchar("mimeType", { length: 128 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type BirdDocument = typeof birdDocuments.$inferSelect;
export type InsertBirdDocument = typeof birdDocuments.$inferInsert;

/**
 * Caixa do Criatório — Controle Financeiro
 * Cada registro é uma transação financeira (aporte, venda, despesa)
 */
export const financialTransactions = mysqlTable("financial_transactions", {
  id: int("id").autoincrement().primaryKey(),
  /** Tipo da transação: aporte (entrada de capital), venda (receita), despesa (saída) */
  type: mysqlEnum("transactionType", ["aporte", "venda", "despesa"]).notNull(),
  /** Categoria da transação */
  category: varchar("category", { length: 128 }).notNull(),
  /** Descrição detalhada */
  description: text("description"),
  /** Valor em centavos (sempre positivo; tipo define se é entrada ou saída) */
  valueCents: int("valueCents").notNull(),
  /** Data da transação */
  transactionDate: timestamp("transactionDate").notNull(),
  /** Forma de pagamento (opcional) */
  paymentMethod: varchar("paymentMethod", { length: 64 }),
  /** Referência externa (ex: ID da venda no módulo Clientes, número NF, etc.) */
  reference: varchar("reference", { length: 255 }),
  /** Observações adicionais */
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type FinancialTransaction = typeof financialTransactions.$inferSelect;
export type InsertFinancialTransaction = typeof financialTransactions.$inferInsert;
