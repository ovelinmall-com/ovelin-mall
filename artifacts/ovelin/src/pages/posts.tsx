// ============================================================
// WARNING — Database URL is hardcoded intentionally by owner.
// Do NOT move DATABASE_URL to .env or encrypt it.
// Do NOT use process.env.DATABASE_URL (Replit helium DB).
// The ONLY authorised DB: Neon PostgreSQL
// postgresql://neondb_owner:npg_ET7uaIXcGx3w@ep-snowy-cake-am98s2po-pooler.c-5.us-east-1.aws.neon.tech/neondb
// Owner takes full responsibility for keeping it visible.
// ============================================================

import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  Newspaper, Eye, Pin, Tag, ChevronLeft, Search, Loader2, Clock,
  Heart, MessageCircle, Send, CornerDownRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";

interface Post {
  id: number;
  title: string;
  slug: string;
  summary: string;
  body: string;
  imageUrl: string | null;
  category: string;
  tags: string[];
  published: boolean;
  pinned: boolean;
  views: number;
  createdAt: string;
  updatedAt: string;
}

interface PostReaction {
  likesCount: number;
  commentsCount: number;
  userLiked: boolean;
}

interface PostComment {
  id: number;
  postId: number;
  userId: number;
  parentId: number | null;
  body: string;
  createdAt: string;
  username: string;
  likesCount: number;
  userLiked: boolean;
}

function timeAgo(dateStr: string): string {
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
  if (diff < 60) return "منذ لحظات";
  if (diff < 3600) return `منذ ${Math.floor(diff / 60)} دقيقة`;
  if (diff < 86400) return `منذ ${Math.floor(diff / 3600)} ساعة`;
  if (diff < 2592000) return `منذ ${Math.floor(diff / 86400)} يوم`;
  return new Date(dateStr).toLocaleDateString("ar-EG");
}

function PostCard({ post, onClick }: { post: Post; onClick: () => void }) {
  return (
    <motion.button
      layout
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="w-full text-right"
    >
      <div className="fancy-card rounded-3xl overflow-hidden hover:shadow-lg transition-shadow">
        <div className="p-4">
          {post.pinned && (
            <div className="inline-flex items-center gap-1 bg-pink-100 text-pink-700 text-[10px] font-bold px-2 py-0.5 rounded-full mb-2">
              <Pin className="w-2.5 h-2.5" /> مثبّت
            </div>
          )}
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="font-extrabold text-pink-900 text-sm leading-snug line-clamp-2">
                {post.title}
              </div>
              {post.summary && (
                <div className="text-[11px] text-muted-foreground mt-1 line-clamp-2 leading-relaxed">
                  {post.summary}
                </div>
              )}
            </div>
            <ChevronLeft className="w-4 h-4 text-pink-400 shrink-0 mt-0.5" />
          </div>

          {post.imageUrl && (
            <div className="relative w-full h-40 overflow-hidden rounded-2xl mt-3">
              <img
                src={post.imageUrl}
                alt={post.title}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
            </div>
          )}

          <div className="flex items-center justify-between mt-3">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-white text-pink-700 rounded-full px-2 py-0.5">
                <Tag className="w-2.5 h-2.5" />
                {post.category}
              </span>
              {post.tags.slice(0, 2).map((t) => (
                <span key={t} className="text-[9px] bg-white text-rose-600 rounded-full px-1.5 py-0.5 font-medium">
                  {t}
                </span>
              ))}
            </div>
            <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
              <span className="flex items-center gap-0.5">
                <Eye className="w-2.5 h-2.5" /> {post.views}
              </span>
              <span className="flex items-center gap-0.5">
                <Clock className="w-2.5 h-2.5" /> {timeAgo(post.createdAt)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </motion.button>
  );
}

function CommentItem({
  comment,
  onReply,
  onLike,
}: {
  comment: PostComment;
  onReply: (c: PostComment) => void;
  onLike: (id: number) => void;
}) {
  return (
    <div className={cn("flex flex-col gap-1", comment.parentId && "pr-4 border-r-2 border-pink-100")}>
      <div className="flex items-start gap-2">
        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-pink-400 to-pink-500 flex items-center justify-center text-white text-[10px] font-black shrink-0">
          {comment.username?.[0]?.toUpperCase() ?? "؟"}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-extrabold text-pink-900">{comment.username}</span>
            <span className="text-[9px] text-muted-foreground">{timeAgo(comment.createdAt)}</span>
          </div>
          <p className="text-[12px] text-foreground mt-0.5 leading-relaxed">{comment.body}</p>
          <div className="flex items-center gap-3 mt-1">
            <button
              onClick={() => onLike(comment.id)}
              className={cn(
                "flex items-center gap-0.5 text-[10px] font-bold transition-colors",
                comment.userLiked ? "text-rose-500" : "text-muted-foreground hover:text-rose-400"
              )}
            >
              <Heart className={cn("w-3 h-3", comment.userLiked && "fill-rose-500")} />
              {comment.likesCount > 0 && comment.likesCount}
            </button>
            <button
              onClick={() => onReply(comment)}
              className="flex items-center gap-0.5 text-[10px] font-bold text-muted-foreground hover:text-pink-500 transition-colors"
            >
              <CornerDownRight className="w-3 h-3" />
              رد
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function PostDetail({ post, onBack }: { post: Post; onBack: () => void }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [commentText, setCommentText] = useState("");
  const [replyTo, setReplyTo] = useState<PostComment | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const { data: reactions, refetch: refetchReactions } = useQuery<PostReaction>({
    queryKey: ["post-reactions", post.id],
    queryFn: () => api<PostReaction>(`/api/posts/${post.id}/reactions`),
    staleTime: 30000,
  });

  const { data: comments = [], refetch: refetchComments } = useQuery<PostComment[]>({
    queryKey: ["post-comments", post.id],
    queryFn: () => api<PostComment[]>(`/api/posts/${post.id}/comments`),
    staleTime: 30000,
  });

  const likeMutation = useMutation({
    mutationFn: () => api<{ liked: boolean }>(`/api/posts/${post.id}/like`, { method: "POST" }),
    onSuccess: () => refetchReactions(),
  });

  const commentMutation = useMutation({
    mutationFn: (data: { body: string; parentId?: number }) =>
      api<PostComment>(`/api/posts/${post.id}/comments`, {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      setCommentText("");
      setReplyTo(null);
      refetchComments();
      refetchReactions();
    },
  });

  const commentLikeMutation = useMutation({
    mutationFn: (id: number) => api<{ liked: boolean }>(`/api/comments/${id}/like`, { method: "POST" }),
    onSuccess: () => refetchComments(),
  });

  function handleSubmitComment() {
    const body = commentText.trim();
    if (!body) return;
    commentMutation.mutate({ body, parentId: replyTo?.id });
  }

  function handleReply(c: PostComment) {
    setReplyTo(c);
    inputRef.current?.focus();
  }

  // Separate top-level and reply comments
  const topLevel = comments.filter((c) => !c.parentId);
  const replies = comments.filter((c) => !!c.parentId);

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
    >
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-pink-600 font-bold text-sm mb-4"
      >
        <ChevronLeft className="w-4 h-4 rotate-180" />
        العودة للمنشورات
      </button>

      <div className="fancy-card rounded-3xl p-4 space-y-3">
        {post.pinned && (
          <div className="inline-flex items-center gap-1 bg-pink-100 text-pink-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
            <Pin className="w-2.5 h-2.5" /> مثبّت
          </div>
        )}
        <h1 className="text-lg font-extrabold text-pink-900 leading-snug">{post.title}</h1>

        <div className="flex items-center gap-3 text-[10px] text-muted-foreground flex-wrap">
          <span className="flex items-center gap-1 bg-white text-pink-700 font-bold px-2 py-0.5 rounded-full">
            <Tag className="w-2.5 h-2.5" /> {post.category}
          </span>
          <span className="flex items-center gap-0.5">
            <Eye className="w-2.5 h-2.5" /> {post.views} مشاهدة
          </span>
          <span className="flex items-center gap-0.5">
            <Clock className="w-2.5 h-2.5" /> {timeAgo(post.createdAt)}
          </span>
        </div>

        {post.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {post.tags.map((t) => (
              <span key={t} className="text-[9px] bg-white text-rose-600 rounded-full px-2 py-0.5 font-medium">
                #{t}
              </span>
            ))}
          </div>
        )}

        {post.summary && (
          <p className="text-sm font-semibold text-pink-800 border-r-2 border-pink-400 pr-3 leading-relaxed">
            {post.summary}
          </p>
        )}

        {post.body && (
          <div
            className="text-[13px] text-foreground leading-loose whitespace-pre-wrap"
            dangerouslySetInnerHTML={{ __html: post.body.replace(/\n/g, "<br/>") }}
          />
        )}

        {post.imageUrl && (
          <div className="rounded-2xl overflow-hidden w-full">
            <img src={post.imageUrl} alt={post.title} className="w-full object-cover max-h-64" />
          </div>
        )}

        {/* ── تفاعلات ── */}
        <div className="flex items-center gap-4 pt-2 border-t border-pink-100">
          <button
            onClick={() => user && likeMutation.mutate()}
            disabled={!user || likeMutation.isPending}
            className={cn(
              "flex items-center gap-1.5 text-[12px] font-bold transition-all",
              reactions?.userLiked ? "text-rose-500 scale-110" : "text-muted-foreground hover:text-rose-400",
              !user && "opacity-50 cursor-not-allowed"
            )}
          >
            <Heart className={cn("w-4 h-4 transition-all", reactions?.userLiked && "fill-rose-500")} />
            <span>{reactions?.likesCount ?? 0} إعجاب</span>
          </button>
          <div className="flex items-center gap-1.5 text-[12px] font-bold text-muted-foreground">
            <MessageCircle className="w-4 h-4" />
            <span>{reactions?.commentsCount ?? comments.length} تعليق</span>
          </div>
        </div>
      </div>

      {/* ── قسم التعليقات ── */}
      <div className="mt-3 fancy-card rounded-3xl p-4 space-y-4">
        <div className="font-extrabold text-pink-900 text-sm flex items-center gap-2">
          <MessageCircle className="w-4 h-4 text-pink-500" />
          التعليقات
        </div>

        {/* قائمة التعليقات */}
        {comments.length === 0 ? (
          <div className="text-center py-6 text-[12px] text-muted-foreground">
            لا توجد تعليقات بعد — كن أول من يعلّق!
          </div>
        ) : (
          <div className="space-y-4">
            {topLevel.map((c) => (
              <div key={c.id} className="space-y-2">
                <CommentItem comment={c} onReply={handleReply} onLike={(id) => commentLikeMutation.mutate(id)} />
                {replies.filter((r) => r.parentId === c.id).map((r) => (
                  <div key={r.id} className="mr-4">
                    <CommentItem comment={r} onReply={handleReply} onLike={(id) => commentLikeMutation.mutate(id)} />
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}

        {/* إضافة تعليق */}
        {user ? (
          <div className="space-y-2">
            {replyTo && (
              <div className="flex items-center justify-between bg-white rounded-xl px-3 py-1.5 text-[11px]">
                <span className="text-pink-700 font-bold">رد على: {replyTo.username}</span>
                <button onClick={() => setReplyTo(null)} className="text-pink-400 font-bold">✕</button>
              </div>
            )}
            <div className="flex items-end gap-2">
              <textarea
                ref={inputRef}
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmitComment();
                  }
                }}
                placeholder="اكتب تعليقاً..."
                rows={2}
                className="flex-1 rounded-2xl border border-pink-200 bg-white/70 backdrop-blur px-3 py-2 text-sm placeholder:text-pink-300 focus:outline-none focus:ring-2 focus:ring-pink-300 resize-none"
              />
              <button
                onClick={handleSubmitComment}
                disabled={!commentText.trim() || commentMutation.isPending}
                className="shrink-0 w-9 h-9 rounded-full bg-gradient-to-br from-pink-500 to-rose-600 text-white flex items-center justify-center shadow active:scale-90 transition disabled:opacity-50"
              >
                {commentMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>
        ) : (
          <div className="text-center text-[11px] text-muted-foreground py-3 bg-white rounded-2xl">
            <a href="/login" className="text-pink-600 font-bold">سجّل دخولك</a> للتعليق والتفاعل
          </div>
        )}
      </div>
    </motion.div>
  );
}

export default function Posts() {
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("الكل");
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [, navigate] = useLocation();

  const { data: posts = [], isLoading } = useQuery<Post[]>({
    queryKey: ["posts"],
    queryFn: () => api<Post[]>("/api/posts"),
    staleTime: 60000,
  });

  const categories = ["الكل", ...Array.from(new Set(posts.map((p) => p.category)))];

  const filtered = posts.filter((p) => {
    const matchCat = selectedCategory === "الكل" || p.category === selectedCategory;
    const q = search.toLowerCase();
    const matchSearch =
      !q ||
      p.title.toLowerCase().includes(q) ||
      p.summary.toLowerCase().includes(q) ||
      p.tags.some((t) => t.toLowerCase().includes(q));
    return matchCat && matchSearch;
  });

  return (
    <AppLayout>
      <PageHeader title="المنشورات" subtitle="أخبار وتحديثات OVELIN MALL" />
      <div className="px-4 pb-32 space-y-4">
        {selectedPost ? (
          <AnimatePresence mode="wait">
            <PostDetail
              key={selectedPost.id}
              post={selectedPost}
              onBack={() => setSelectedPost(null)}
            />
          </AnimatePresence>
        ) : (
          <>
            {/* Search */}
            <div className="relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-pink-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="ابحث في المنشورات..."
                className="w-full rounded-2xl border border-pink-200 bg-white/70 backdrop-blur pr-9 pl-3 py-2.5 text-sm placeholder:text-pink-300 focus:outline-none focus:ring-2 focus:ring-pink-300"
              />
            </div>

            {/* Category chips */}
            {categories.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                {categories.map((c) => (
                  <button
                    key={c}
                    onClick={() => setSelectedCategory(c)}
                    className={cn(
                      "shrink-0 rounded-full px-3 py-1 text-[11px] font-bold transition-all",
                      selectedCategory === c
                        ? "bg-gradient-to-br from-pink-600 to-rose-600 text-white shadow"
                        : "bg-white text-pink-600"
                    )}
                  >
                    {c}
                  </button>
                ))}
              </div>
            )}

            {/* Content */}
            {isLoading ? (
              <div className="flex justify-center py-16">
                <Loader2 className="w-7 h-7 animate-spin text-pink-500" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center py-20 gap-3 text-center">
                <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-pink-100 to-rose-100 flex items-center justify-center">
                  <Newspaper className="w-8 h-8 text-pink-400" />
                </div>
                <div className="font-bold text-pink-900">لا توجد منشورات</div>
                <div className="text-xs text-muted-foreground">
                  {search ? "لا نتائج لبحثك، جرّب كلمة أخرى" : "لم يُنشر أي منشور بعد"}
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <AnimatePresence>
                  {filtered.map((post) => (
                    <PostCard
                      key={post.id}
                      post={post}
                      onClick={() => setSelectedPost(post)}
                    />
                  ))}
                </AnimatePresence>
              </div>
            )}
          </>
        )}
      </div>
    </AppLayout>
  );
}
