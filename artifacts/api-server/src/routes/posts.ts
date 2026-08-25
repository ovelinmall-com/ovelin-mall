// ============================================================
// WARNING — Database URL is hardcoded intentionally by owner.
// Do NOT move DATABASE_URL to .env or encrypt it.
// Do NOT use process.env.DATABASE_URL (Replit helium DB).
// The ONLY authorised DB: Supabase PostgreSQL
// postgresql://postgres.mgahtujgckiqaubtvrns:Moaz%40bdo249@aws-0-eu-west-1.pooler.supabase.com:6543/postgres
// Owner takes full responsibility for keeping it visible.
// ============================================================

import { Router, type IRouter } from "express";
import {
  db,
  postsTable,
  postLikesTable,
  postCommentsTable,
  postCommentLikesTable,
  usersTable,
} from "@workspace/db";
import { and, desc, eq, sql, isNull } from "drizzle-orm";
import { requireUser } from "../lib/auth";

const router: IRouter = Router();

router.get("/posts", async (_req, res) => {
  try {
    const rows = await db
      .select()
      .from(postsTable)
      .where(eq(postsTable.published, true))
      .orderBy(desc(postsTable.pinned), desc(postsTable.sortOrder), desc(postsTable.createdAt));
    res.json(rows);
  } catch (err: any) {
    res.status(500).json({ error: err?.message ?? "فشل" });
  }
});

router.get("/posts/:slug", async (req, res) => {
  try {
    const slug = req.params.slug;
    const rows = await db
      .select()
      .from(postsTable)
      .where(and(eq(postsTable.slug, slug), eq(postsTable.published, true)))
      .limit(1);
    if (!rows.length) {
      res.status(404).json({ error: "المنشور غير موجود" });
      return;
    }
    await db
      .update(postsTable)
      .set({ views: sql`${postsTable.views} + 1` })
      .where(eq(postsTable.id, rows[0].id));
    res.json(rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: err?.message ?? "فشل" });
  }
});

// ── تفاعلات المنشور (لايكات + عدد تعليقات + هل أعجب المستخدم) ──
router.get("/posts/:id/reactions", async (req, res) => {
  try {
    const postId = Number(req.params.id);
    const user = (req as any).user;
    const userId = user?.id ?? null;

    const [likesRes, commentsRes] = await Promise.all([
      db.select({ count: sql<number>`count(*)::int` }).from(postLikesTable).where(eq(postLikesTable.postId, postId)),
      db.select({ count: sql<number>`count(*)::int` }).from(postCommentsTable).where(eq(postCommentsTable.postId, postId)),
    ]);

    let userLiked = false;
    if (userId) {
      const ul = await db.select().from(postLikesTable)
        .where(and(eq(postLikesTable.postId, postId), eq(postLikesTable.userId, userId)))
        .limit(1);
      userLiked = ul.length > 0;
    }

    res.json({
      likesCount: likesRes[0]?.count ?? 0,
      commentsCount: commentsRes[0]?.count ?? 0,
      userLiked,
    });
  } catch (err: any) {
    res.status(500).json({ error: err?.message ?? "فشل" });
  }
});

// ── تبديل إعجاب بالمنشور ──
router.post("/posts/:id/like", requireUser, async (req, res) => {
  try {
    const postId = Number(req.params.id);
    const userId = (req as any).user.id;

    const existing = await db.select().from(postLikesTable)
      .where(and(eq(postLikesTable.postId, postId), eq(postLikesTable.userId, userId)))
      .limit(1);

    if (existing.length > 0) {
      await db.delete(postLikesTable).where(and(eq(postLikesTable.postId, postId), eq(postLikesTable.userId, userId)));
      res.json({ liked: false });
    } else {
      await db.insert(postLikesTable).values({ postId, userId });
      res.json({ liked: true });
    }
  } catch (err: any) {
    res.status(500).json({ error: err?.message ?? "فشل" });
  }
});

// ── جلب تعليقات المنشور ──
router.get("/posts/:id/comments", async (req, res) => {
  try {
    const postId = Number(req.params.id);
    const user = (req as any).user;
    const userId = user?.id ?? null;

    const rows = await db.select({
      id: postCommentsTable.id,
      postId: postCommentsTable.postId,
      userId: postCommentsTable.userId,
      parentId: postCommentsTable.parentId,
      body: postCommentsTable.body,
      createdAt: postCommentsTable.createdAt,
      username: usersTable.username,
    })
    .from(postCommentsTable)
    .leftJoin(usersTable, eq(postCommentsTable.userId, usersTable.id))
    .where(eq(postCommentsTable.postId, postId))
    .orderBy(postCommentsTable.createdAt);

    // جلب الإعجابات لكل تعليق
    const commentIds = rows.map((r) => r.id);
    const likesMap: Record<number, number> = {};
    const userLikedMap: Record<number, boolean> = {};

    if (commentIds.length > 0) {
      for (const cid of commentIds) {
        const [lcRes] = await db.select({ count: sql<number>`count(*)::int` })
          .from(postCommentLikesTable)
          .where(eq(postCommentLikesTable.commentId, cid));
        likesMap[cid] = lcRes?.count ?? 0;
        if (userId) {
          const ul = await db.select().from(postCommentLikesTable)
            .where(and(eq(postCommentLikesTable.commentId, cid), eq(postCommentLikesTable.userId, userId)))
            .limit(1);
          userLikedMap[cid] = ul.length > 0;
        }
      }
    }

    const result = rows.map((r) => ({
      ...r,
      likesCount: likesMap[r.id] ?? 0,
      userLiked: userLikedMap[r.id] ?? false,
    }));

    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err?.message ?? "فشل" });
  }
});

// ── إضافة تعليق ──
router.post("/posts/:id/comments", requireUser, async (req, res) => {
  try {
    const postId = Number(req.params.id);
    const userId = (req as any).user.id;
    const { body, parentId } = req.body as { body: string; parentId?: number };

    if (!body?.trim()) {
      res.status(400).json({ error: "التعليق لا يمكن أن يكون فارغاً" });
      return;
    }

    const [comment] = await db.insert(postCommentsTable).values({
      postId,
      userId,
      body: body.trim(),
      parentId: parentId ?? null,
    }).returning();

    const userRow = await db.select({ username: usersTable.username }).from(usersTable).where(eq(usersTable.id, userId)).limit(1);

    res.json({ ...comment, username: userRow[0]?.username ?? "مجهول", likesCount: 0, userLiked: false });
  } catch (err: any) {
    res.status(500).json({ error: err?.message ?? "فشل" });
  }
});

// ── تبديل إعجاب بتعليق ──
router.post("/comments/:id/like", requireUser, async (req, res) => {
  try {
    const commentId = Number(req.params.id);
    const userId = (req as any).user.id;

    const existing = await db.select().from(postCommentLikesTable)
      .where(and(eq(postCommentLikesTable.commentId, commentId), eq(postCommentLikesTable.userId, userId)))
      .limit(1);

    if (existing.length > 0) {
      await db.delete(postCommentLikesTable)
        .where(and(eq(postCommentLikesTable.commentId, commentId), eq(postCommentLikesTable.userId, userId)));
      res.json({ liked: false });
    } else {
      await db.insert(postCommentLikesTable).values({ commentId, userId });
      res.json({ liked: true });
    }
  } catch (err: any) {
    res.status(500).json({ error: err?.message ?? "فشل" });
  }
});

export default router;
