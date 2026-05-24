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
  /** Valor da venda em centavos (R$) */
  valueCents: int("valueCents"),
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
