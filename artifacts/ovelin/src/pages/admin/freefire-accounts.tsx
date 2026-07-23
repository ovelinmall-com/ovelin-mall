import { useState, useEffect, useRef } from "react";
import { Link } from "wouter";
import {
  Plus, Trash2, Edit3, ArrowRight, Save, X,
  ImagePlus, Camera, GripVertical, Star, Loader2,
} from "lucide-react";
import { api, getApiUrl } from "@/lib/api";

interface FFAccount {
  id: number;
  account_name: string;
  price: number;
  status: "available" | "reserved" | "sold";
  cover_image: string;
  images: string[];
  level?: number;
  evo_weapons_count?: number;
  skins_count?: number;
  characters_count?: number;
  rank?: string;
  server?: string;
  description?: string;
  features?: string[];
  display_order: number;
}

const EMPTY: Omit<FFAccount, "id"> = {
  account_name: "", price: 0, status: "available",
  cover_image: "", images: [], display_order: 0,
};

const inp = "w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-bold text-gray-500">{label}</label>
      {children}
    </div>
  );
}

// ── Image Uploader ─────────────────────────────────────────────────────────────
interface UploadedImage { url: string; uploading?: boolean; error?: boolean; localPreview?: string }

function ImageUploader({
  images,
  onChange,
}: {
  images: UploadedImage[];
  onChange: React.Dispatch<React.SetStateAction<UploadedImage[]>>;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  const uploadFile = async (file: File): Promise<string> => {
    const fd = new FormData();
    fd.append("image", file);
    const res = await fetch(getApiUrl("/api/admin/freefire-accounts/upload-image"), {
      method: "POST",
      body: fd,
      credentials: "include",
    });
    if (!res.ok) throw new Error("فشل الرفع");
    const { url } = await res.json();
    return url;
  };

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const newImgs: UploadedImage[] = Array.from(files).map((f) => ({
      url: "",
      uploading: true,
      localPreview: URL.createObjectURL(f),
    }));
    onChange([...images, ...newImgs]);

    const base = images.length;
    await Promise.all(
      Array.from(files).map(async (file, i) => {
        try {
          const url = await uploadFile(file);
          onChange((prev: UploadedImage[]) => {
            const copy = [...prev];
            copy[base + i] = { url, uploading: false };
            return copy;
          });
        } catch {
          onChange((prev: UploadedImage[]) => {
            const copy = [...prev];
            copy[base + i] = { ...copy[base + i], uploading: false, error: true };
            return copy;
          });
        }
      }),
    );
  };

  const remove = (idx: number) => {
    onChange(images.filter((_, i) => i !== idx));
  };

  const setCover = (idx: number) => {
    if (idx === 0) return;
    const copy = [...images];
    const [item] = copy.splice(idx, 1);
    copy.unshift(item);
    onChange(copy);
  };

  return (
    <div className="space-y-3">
      {/* Grid of uploaded images */}
      {images.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {images.map((img, idx) => (
            <div key={idx} className="group relative aspect-square overflow-hidden rounded-xl bg-gray-100">
              {/* Preview */}
              <img
                src={img.localPreview ?? img.url}
                alt=""
                className={`h-full w-full object-cover transition-opacity ${img.uploading ? "opacity-50" : "opacity-100"}`}
              />
              {/* Cover badge */}
              {idx === 0 && (
                <span className="absolute left-1 top-1 flex items-center gap-0.5 rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-bold text-white shadow">
                  <Star className="h-2.5 w-2.5 fill-white" /> غلاف
                </span>
              )}
              {/* Uploading spinner */}
              {img.uploading && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                  <Loader2 className="h-6 w-6 animate-spin text-white" />
                </div>
              )}
              {/* Error */}
              {img.error && (
                <div className="absolute inset-0 flex items-center justify-center bg-red-500/70 text-xs font-bold text-white">
                  فشل الرفع
                </div>
              )}
              {/* Actions overlay */}
              {!img.uploading && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-black/50 opacity-0 transition-opacity group-active:opacity-100 sm:group-hover:opacity-100">
                  {idx !== 0 && (
                    <button
                      type="button"
                      onClick={() => setCover(idx)}
                      className="rounded-full bg-white/90 px-2 py-1 text-[10px] font-bold text-primary"
                    >
                      اجعلها غلاف
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => remove(idx)}
                    className="flex h-7 w-7 items-center justify-center rounded-full bg-red-500/90"
                  >
                    <X className="h-3.5 w-3.5 text-white" />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add images button */}
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-pink-200 bg-pink-50/50 py-4 text-sm font-bold text-primary transition-colors active:bg-pink-100"
      >
        <Camera className="h-5 w-5" />
        {images.length === 0 ? "أضف صور الحساب" : "أضف المزيد من الصور"}
      </button>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
        // allow picking from camera or gallery on mobile
      />

      {images.length > 0 && (
        <p className="text-center text-[11px] text-gray-400">
          اضغط على أي صورة لحذفها أو جعلها غلاف • الصورة الأولى هي الغلاف
        </p>
      )}
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────
export default function AdminFreefireAccounts() {
  const [accounts, setAccounts] = useState<FFAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<FFAccount | null>(null);
  const [form, setForm] = useState<Omit<FFAccount, "id">>(EMPTY);
  const [images, setImages] = useState<UploadedImage[]>([]);
  const [saving, setSaving] = useState(false);
  const [featuresText, setFeaturesText] = useState("");
  const [error, setError] = useState("");

  const load = () => {
    setLoading(true);
    fetch(getApiUrl("/api/freefire-accounts"), { credentials: "include" })
      .then((r) => r.json())
      .then((d) => setAccounts(Array.isArray(d) ? d : []))
      .catch(() => setAccounts([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const openNew = () => {
    setEditing(null);
    setForm(EMPTY);
    setImages([]);
    setFeaturesText("");
    setError("");
    setShowForm(true);
  };

  const openEdit = (a: FFAccount) => {
    setEditing(a);
    setForm({ ...a });
    // build UploadedImage list: cover first, then extras
    const all = [a.cover_image, ...(a.images ?? [])].filter(Boolean);
    setImages(all.map((url) => ({ url })));
    setFeaturesText((a.features ?? []).join("\n"));
    setError("");
    setShowForm(true);
  };

  const f = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) =>
    setForm((p) => ({ ...p, [k]: v }));

  const save = async () => {
    const readyImgs = images.filter((i) => i.url && !i.uploading && !i.error);
    if (!form.account_name || !form.price) {
      setError("اسم الحساب والسعر مطلوبان");
      return;
    }
    if (images.some((i) => i.uploading)) {
      setError("انتظر حتى تنتهي الصور من الرفع");
      return;
    }
    const cover_image = readyImgs[0]?.url ?? "";
    const extraImages = readyImgs.slice(1).map((i) => i.url);

    setSaving(true);
    setError("");
    try {
      const payload = {
        ...form,
        cover_image,
        images: extraImages,
        features: featuresText.split("\n").map((s) => s.trim()).filter(Boolean),
      };
      if (editing) {
        await api(`/api/admin/freefire-accounts/${editing.id}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
      } else {
        await api("/api/admin/freefire-accounts", {
          method: "POST",
          body: JSON.stringify(payload),
        });
      }
      setShowForm(false);
      load();
    } catch (e: any) {
      setError(e?.message ?? "حدث خطأ");
    } finally {
      setSaving(false);
    }
  };

  const del = async (id: number) => {
    if (!confirm("حذف الحساب؟")) return;
    await api(`/api/admin/freefire-accounts/${id}`, { method: "DELETE" });
    load();
  };

  const STATUS_LABEL: Record<string, string> = {
    available: "متوفر", reserved: "محجوز", sold: "مباع",
  };
  const STATUS_COLOR: Record<string, string> = {
    available: "bg-green-100 text-green-700",
    reserved: "bg-amber-100 text-amber-700",
    sold: "bg-gray-100 text-gray-500",
  };

  return (
    <div dir="rtl" className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary to-pink-500 px-4 pb-5 pt-10">
        <Link href="/admin">
          <button className="mb-3 flex items-center gap-1 text-sm text-white/80">
            <ArrowRight className="h-4 w-4" /> لوحة التحكم
          </button>
        </Link>
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-black text-white">حسابات Free Fire</h1>
          <button
            onClick={openNew}
            className="flex items-center gap-1.5 rounded-full bg-white px-4 py-2 text-sm font-bold text-primary shadow-lg active:scale-95"
          >
            <Plus className="h-4 w-4" /> إضافة حساب
          </button>
        </div>
      </div>

      {/* List */}
      <div className="space-y-3 px-4 pt-4">
        {loading && (
          <div className="flex justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        )}
        {!loading && accounts.length === 0 && (
          <div className="py-20 text-center text-gray-400">
            <ImagePlus className="mx-auto mb-3 h-12 w-12 opacity-30" />
            <p>لا توجد حسابات — اضغط «إضافة حساب»</p>
          </div>
        )}
        {accounts.map((a) => (
          <div
            key={a.id}
            className="flex items-center gap-3 rounded-2xl bg-white p-3 shadow-sm ring-1 ring-gray-100"
          >
            {a.cover_image ? (
              <img
                src={a.cover_image}
                alt={a.account_name}
                className="h-16 w-16 flex-shrink-0 rounded-xl object-cover"
              />
            ) : (
              <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-xl bg-pink-50">
                <ImagePlus className="h-6 w-6 text-primary/40" />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate font-bold text-gray-900">{a.account_name}</p>
              <p className="text-sm font-semibold text-primary">{a.price.toLocaleString()} ج.س</p>
              <div className="mt-0.5 flex items-center gap-1.5">
                <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${STATUS_COLOR[a.status] ?? STATUS_COLOR.available}`}>
                  {STATUS_LABEL[a.status] ?? a.status}
                </span>
                {a.images && a.images.length > 0 && (
                  <span className="text-xs text-gray-400">{a.images.length + 1} صور</span>
                )}
              </div>
            </div>
            <div className="flex flex-shrink-0 gap-2">
              <button
                onClick={() => openEdit(a)}
                className="rounded-xl bg-blue-50 p-2 text-blue-600 active:scale-95"
              >
                <Edit3 className="h-4 w-4" />
              </button>
              <button
                onClick={() => del(a.id)}
                className="rounded-xl bg-red-50 p-2 text-red-500 active:scale-95"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowForm(false)} />
          <div className="relative z-10 max-h-[94vh] w-full overflow-y-auto rounded-t-3xl bg-gray-50 pb-8">
            {/* Modal header */}
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-100 bg-white px-5 py-4">
              <h2 className="text-lg font-black text-gray-900">
                {editing ? "تعديل الحساب" : "إضافة حساب جديد"}
              </h2>
              <button
                onClick={() => setShowForm(false)}
                className="rounded-full bg-gray-100 p-2 active:scale-90"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4 px-5 pt-5">
              {/* ── صور الحساب ── */}
              <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-100">
                <p className="mb-3 text-sm font-black text-gray-800">📸 صور الحساب</p>
                <ImageUploader images={images} onChange={setImages} />
              </div>

              {/* ── المعلومات الأساسية ── */}
              <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-100 space-y-3">
                <p className="text-sm font-black text-gray-800">📋 المعلومات الأساسية</p>
                <Field label="اسم الحساب *">
                  <input
                    className={inp}
                    value={form.account_name}
                    onChange={(e) => f("account_name", e.target.value)}
                    placeholder="مثال: حساب ماسي نادر"
                  />
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="السعر (ج.س) *">
                    <input
                      className={inp}
                      type="number"
                      inputMode="numeric"
                      value={form.price || ""}
                      onChange={(e) => f("price", Number(e.target.value))}
                    />
                  </Field>
                  <Field label="الحالة">
                    <select
                      className={inp}
                      value={form.status}
                      onChange={(e) => f("status", e.target.value as FFAccount["status"])}
                    >
                      <option value="available">متوفر</option>
                      <option value="reserved">محجوز</option>
                      <option value="sold">مباع</option>
                    </select>
                  </Field>
                </div>
              </div>

              {/* ── إحصائيات ── */}
              <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-100 space-y-3">
                <p className="text-sm font-black text-gray-800">🏆 إحصائيات الحساب</p>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="المستوى">
                    <input className={inp} type="number" inputMode="numeric"
                      value={form.level ?? ""}
                      onChange={(e) => f("level", e.target.value ? Number(e.target.value) : undefined)} />
                  </Field>
                  <Field label="أسلحة Evo">
                    <input className={inp} type="number" inputMode="numeric"
                      value={form.evo_weapons_count ?? ""}
                      onChange={(e) => f("evo_weapons_count", e.target.value ? Number(e.target.value) : undefined)} />
                  </Field>
                  <Field label="عدد السكنات">
                    <input className={inp} type="number" inputMode="numeric"
                      value={form.skins_count ?? ""}
                      onChange={(e) => f("skins_count", e.target.value ? Number(e.target.value) : undefined)} />
                  </Field>
                  <Field label="عدد الشخصيات">
                    <input className={inp} type="number" inputMode="numeric"
                      value={form.characters_count ?? ""}
                      onChange={(e) => f("characters_count", e.target.value ? Number(e.target.value) : undefined)} />
                  </Field>
                  <Field label="الرتبة">
                    <input className={inp} value={form.rank ?? ""}
                      onChange={(e) => f("rank", e.target.value || undefined)} placeholder="Heroic" />
                  </Field>
                  <Field label="السيرفر">
                    <input className={inp} value={form.server ?? ""}
                      onChange={(e) => f("server", e.target.value || undefined)} placeholder="ME" />
                  </Field>
                </div>
              </div>

              {/* ── وصف ومميزات ── */}
              <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-100 space-y-3">
                <p className="text-sm font-black text-gray-800">📝 وصف ومميزات</p>
                <Field label="وصف الحساب">
                  <textarea
                    className={inp + " min-h-[80px] resize-none"}
                    value={form.description ?? ""}
                    onChange={(e) => f("description", e.target.value || undefined)}
                    placeholder="وصف مختصر عن الحساب..."
                  />
                </Field>
                <Field label="المميزات (كل ميزة في سطر)">
                  <textarea
                    className={inp + " min-h-[70px] resize-none"}
                    value={featuresText}
                    onChange={(e) => setFeaturesText(e.target.value)}
                    placeholder={"بدون قفل جهاز\nحساب قديم وموثوق\nتسليم فوري"}
                  />
                </Field>
              </div>

              {/* ── الترتيب ── */}
              <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-100">
                <Field label="الترتيب (رقم أقل = يظهر أولاً)">
                  <input className={inp} type="number" inputMode="numeric"
                    value={form.display_order}
                    onChange={(e) => f("display_order", Number(e.target.value))} />
                </Field>
              </div>

              {/* Error */}
              {error && (
                <div className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-600 ring-1 ring-red-100">
                  {error}
                </div>
              )}

              {/* Save */}
              <button
                onClick={save}
                disabled={saving || images.some((i) => i.uploading)}
                className="w-full rounded-full bg-gradient-to-r from-primary to-pink-500 py-4 text-base font-bold text-white shadow-lg shadow-primary/30 transition-all active:scale-95 disabled:opacity-50"
              >
                {saving ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" /> جاري الحفظ…
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    <Save className="h-4 w-4" />
                    {editing ? "حفظ التعديلات" : "إضافة الحساب"}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
