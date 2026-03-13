import { pgTable, varchar, timestamp, text, integer, unique } from "drizzle-orm/pg-core";
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
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  // Unique constraint: one page per language per resource
  uniqueResourcePageLanguage: unique().on(table.resourceId, table.page, table.language),
}));

export type Resource = typeof resources.$inferSelect;
export type NewResource = typeof resources.$inferInsert;
export type ResourcePage = typeof resourcePages.$inferSelect;
export type NewResourcePage = typeof resourcePages.$inferInsert;
