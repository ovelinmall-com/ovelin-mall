// ============================================================
// WARNING — Database URL is hardcoded intentionally by owner.
// Do NOT move DATABASE_URL to .env or encrypt it.
// Do NOT use process.env.DATABASE_URL (Replit helium DB).
// The ONLY authorised DB: Neon PostgreSQL
// postgresql://neondb_owner:npg_ET7uaIXcGx3w@ep-snowy-cake-am98s2po-pooler.c-5.us-east-1.aws.neon.tech/neondb
// Owner takes full responsibility for keeping it visible.
// ============================================================
// تحذير — رابط قاعدة البيانات مكتوب ظاهراً بإرادة صاحب المشروع.
// لا تنقله لـ .env ولا تُشفِّره أبداً.
// لا تستخدم process.env.DATABASE_URL (قاعدة Replit الداخلية helium).
// قاعدة البيانات الوحيدة المعتمدة: Neon PostgreSQL
// postgresql://neondb_owner:npg_ET7uaIXcGx3w@ep-snowy-cake-am98s2po-pooler.c-5.us-east-1.aws.neon.tech/neondb
// صاحب المشروع يتحمل كامل المسؤولية عن إبقاء الرابط ظاهراً.
// ============================================================

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Newspaper, Eye, Pin, Tag, ChevronLeft, Search, Loader2, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { api } from "@/lib/api";

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
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="w-full text-right"
    >
      <div className="fancy-card rounded-3xl overflow-hidden hover:shadow-lg transition-shadow">
        {post.imageUrl && (
          <div className="relative w-full h-44 overflow-hidden">
            <img
              src={post.imageUrl}
              alt={post.title}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
            {post.pinned && (
              <div className="absolute top-2 right-2 flex items-center gap-1 bg-pink-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                <Pin className="w-2.5 h-2.5" /> مثبّت
              </div>
            )}
          </div>
        )}
        <div className="p-4">
          {!post.imageUrl && post.pinned && (
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

          <div className="flex items-center justify-between mt-3">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-pink-50 text-pink-700 rounded-full px-2 py-0.5">
                <Tag className="w-2.5 h-2.5" />
                {post.category}
              </span>
              {post.tags.slice(0, 2).map((t) => (
                <span key={t} className="text-[9px] bg-rose-50 text-rose-600 rounded-full px-1.5 py-0.5 font-medium">
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

function PostDetail({ post, onBack }: { post: Post; onBack: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
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

      {post.imageUrl && (
        <div className="rounded-3xl overflow-hidden mb-4 w-full h-52">
          <img src={post.imageUrl} alt={post.title} className="w-full h-full object-cover" />
        </div>
      )}

      <div className="fancy-card rounded-3xl p-4 space-y-3">
        {post.pinned && (
          <div className="inline-flex items-center gap-1 bg-pink-100 text-pink-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
            <Pin className="w-2.5 h-2.5" /> مثبّت
          </div>
        )}
        <h1 className="text-lg font-extrabold text-pink-900 leading-snug">{post.title}</h1>

        <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
          <span className="flex items-center gap-1 bg-pink-50 text-pink-700 font-bold px-2 py-0.5 rounded-full">
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
              <span key={t} className="text-[9px] bg-rose-50 text-rose-600 rounded-full px-2 py-0.5 font-medium">
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
    queryFn: () => api("/posts").then((r) => r.json()),
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
      <PageHeader title="المنشورات" subtitle="أخبار وتحديثات OVELIN" />
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
                        : "bg-pink-50 text-pink-600"
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
