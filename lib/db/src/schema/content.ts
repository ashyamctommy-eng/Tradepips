import {
  index,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./trading";

export const blogPostStatusEnum = pgEnum("blog_post_status", ["DRAFT", "PUBLISHED"]);

export const blogPostsTable = pgTable(
  "blog_posts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    slug: varchar("slug", { length: 180 }).notNull(),
    title: varchar("title", { length: 180 }).notNull(),
    excerpt: varchar("excerpt", { length: 320 }).notNull(),
    body: text("body").notNull(),
    category: varchar("category", { length: 64 }).notNull(),
    status: blogPostStatusEnum("status").notNull().default("DRAFT"),
    authorId: uuid("author_id").references(() => usersTable.id, { onDelete: "set null" }),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    uniqueIndex("blog_posts_slug_idx").on(table.slug),
    index("blog_posts_status_published_idx").on(table.status, table.publishedAt),
    index("blog_posts_category_idx").on(table.category),
  ],
);

export const platformSettingsTable = pgTable("platform_settings", {
  key: varchar("key", { length: 80 }).primaryKey(),
  value: text("value").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const insertBlogPostSchema = createInsertSchema(blogPostsTable).omit({
  id: true,
  authorId: true,
  publishedAt: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertBlogPost = z.infer<typeof insertBlogPostSchema>;
export type BlogPost = typeof blogPostsTable.$inferSelect;
export type PlatformSetting = typeof platformSettingsTable.$inferSelect;
