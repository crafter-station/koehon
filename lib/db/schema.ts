import { pgTable, varchar, timestamp, text, integer, unique, index, json } from "drizzle-orm/pg-core";
import { nanoid } from "nanoid";

export const resources = pgTable("resources", {
  id: varchar("id", { length: 21 })
    .primaryKey()
    .$defaultFn(() => nanoid()),
  title: varchar("title", { length: 255 }).notNull(),
  pdfUrl: varchar("pdf_url", { length: 512 }).notNull(),
  coverUrl: varchar("cover_url", { length: 512 }).notNull(),
  userId: varchar("user_id", { length: 255 }).notNull(),
  language: varchar("language", { length: 10 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const resourcePages = pgTable("resource_pages", {
  id: varchar("id", { length: 21 })
    .primaryKey()
    .$defaultFn(() => nanoid()),
  resourceId: varchar("resource_id", { length: 21 })
    .notNull()
    .references(() => resources.id, { onDelete: "cascade" }),
  page: integer("page").notNull(),
  language: varchar("language", { length: 10 }).notNull(),
  content: text("content").notNull(),
  audioUrl: varchar("audio_url", { length: 512 }).notNull(),
  audioDuration: integer("audio_duration").notNull().default(0), // Duration in seconds
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  // Unique constraint: one page per language per resource
  uniqueResourcePageLanguage: unique().on(table.resourceId, table.page, table.language),
  // Index for faster audio duration aggregation queries
  resourceIdIdx: index("resource_pages_resource_id_idx").on(table.resourceId),
}));

export const bookmarks = pgTable("bookmarks", {
  id: varchar("id", { length: 21 })
    .primaryKey()
    .$defaultFn(() => nanoid()),
  resourceId: varchar("resource_id", { length: 21 })
    .notNull()
    .references(() => resources.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 255 }).notNull(),
  page: integer("page").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  // Index for faster queries by resource
  resourceIdIdx: index("bookmarks_resource_id_idx").on(table.resourceId),
}));

export const userApiKeys = pgTable("user_api_keys", {
  id: varchar("id", { length: 21 })
    .primaryKey()
    .$defaultFn(() => nanoid()),
  apiKey: varchar("api_key", { length: 512 }).notNull(), // Increased for encrypted data (iv:encryptedData)
  provider: varchar("provider", { length: 50 }).notNull().default("openai"),
  userId: varchar("user_id", { length: 255 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  // Index for faster queries by user
  userIdIdx: index("user_api_keys_user_id_idx").on(table.userId),
  // Unique constraint: one API key per provider per user
  uniqueUserProvider: unique().on(table.userId, table.provider),
}));

export const userSettings = pgTable("user_settings", {
  id: varchar("id", { length: 21 })
    .primaryKey()
    .$defaultFn(() => nanoid()),
  userId: varchar("user_id", { length: 255 }).notNull().unique(),
  models: json("models").$type<{
    extractor: string;
    translator: string;
    audio_generator: string;
  }>().notNull().default({
    extractor: "openai",
    translator: "openai",
    audio_generator: "openai",
  }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index("user_settings_user_id_idx").on(table.userId),
}));

export type Resource = typeof resources.$inferSelect;
export type NewResource = typeof resources.$inferInsert;
export type ResourcePage = typeof resourcePages.$inferSelect;
export type NewResourcePage = typeof resourcePages.$inferInsert;
export type Bookmark = typeof bookmarks.$inferSelect;
export type NewBookmark = typeof bookmarks.$inferInsert;
export type UserApiKey = typeof userApiKeys.$inferSelect;
export type NewUserApiKey = typeof userApiKeys.$inferInsert;
export type UserSettings = typeof userSettings.$inferSelect;
export type NewUserSettings = typeof userSettings.$inferInsert;
