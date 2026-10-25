import { and, desc, eq, ilike, or } from "drizzle-orm";
import { Router, type IRouter } from "express";
import {
  GetBlogPostParams,
  GetBlogPostResponse,
  GetBlogPostsQueryParams,
  GetBlogPostsResponse,
} from "@workspace/api-zod";
import { blogPostsTable, db } from "@workspace/db";

const router: IRouter = Router();

function serializePost(post: typeof blogPostsTable.$inferSelect) {
  return {
    id: post.id,
    slug: post.slug,
    title: post.title,
    excerpt: post.excerpt,
    body: post.body,
    category: post.category,
    status: post.status,
    createdAt: post.createdAt.toISOString(),
    updatedAt: post.updatedAt.toISOString(),
    publishedAt: post.publishedAt?.toISOString() ?? null,
  };
}

router.get("/v1/blog/posts", async (req, res): Promise<void> => {
  const parsed = GetBlogPostsQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid article filters." });
    return;
  }

  const filters = [eq(blogPostsTable.status, "PUBLISHED")];
  if (parsed.data.category) {
    filters.push(eq(blogPostsTable.category, parsed.data.category));
  }
  if (parsed.data.search?.trim()) {
    const term = `%${parsed.data.search.trim()}%`;
    const searchFilter = or(
      ilike(blogPostsTable.title, term),
      ilike(blogPostsTable.excerpt, term),
      ilike(blogPostsTable.body, term),
    );
    if (searchFilter) filters.push(searchFilter);
  }

  const posts = await db
    .select()
    .from(blogPostsTable)
    .where(and(...filters))
    .orderBy(desc(blogPostsTable.publishedAt), desc(blogPostsTable.createdAt))
    .limit(100);

  res.json(GetBlogPostsResponse.parse(posts.map(serializePost)));
});

router.get("/v1/blog/posts/:slug", async (req, res): Promise<void> => {
  const params = GetBlogPostParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid article slug." });
    return;
  }
  const [post] = await db
    .select()
    .from(blogPostsTable)
    .where(and(eq(blogPostsTable.slug, params.data.slug), eq(blogPostsTable.status, "PUBLISHED")))
    .limit(1);
  if (!post) {
    res.status(404).json({ error: "Article not found." });
    return;
  }
  res.json(GetBlogPostResponse.parse(serializePost(post)));
});

export default router;
