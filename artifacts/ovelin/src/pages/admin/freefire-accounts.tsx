import { useState, useEffect } from "react";
import { Link } from "wouter";
import { Plus, Trash2, Edit3, ArrowRight, Save, X, ImagePlus } from "lucide-react";
import { getApiUrl } from "@/lib/api";

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

const empty: Omit<FFAccount, "id"> = {
  account_name: "", price: 0, status: "available",
  cover_image: "", images: [], display_order: 0,
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-bold text-gray-500 mb-1">{label}</label>
      {children}
    </div>
  );
}

const inp = "w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40";

export default function AdminFreefireAccounts() {
  const [accounts, setAccounts] = useState<FFAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<FFAccount | null>(null);
  const [form, setForm] = useState<Omit<FFAccount, "id">>(empty);
  const [saving, setSaving] = useState(false);
  const [featuresText, setFeaturesText] = useState("");
  const [imagesText, setImagesText] = useState("");

  const load = () => {
    setLoading(true);
    fetch(getApiUrl("/api/freefire-accounts"))
      .then(r => r.json()).then(setAccounts).catch(() => setAccounts([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const openNew = () => {
    setEditing(null);
    setForm(empty);
    setFeaturesText("");
    setImagesText("");
    setShowForm(true);
  };

  const openEdit = (a: FFAccount) => {
    setEditing(a);
    setForm({ ...a });
    setFeaturesText((a.features ?? []).join("\n"));
    setImagesText((a.images ?? []).join("\n"));
    setShowForm(true);
  };

  const save = async () => {
    setSaving(true);
    const payload = {
      ...form,
      features: featuresText.split("\n").map(s => s.trim()).filter(Boolean),
      images: imagesText.split("\n").map(s => s.trim()).filter(Boolean),
    };
    try {
      if (editing) {
        await fetch(getApiUrl(`/api/admin/freefire-accounts/${editing.id}`), {
          method: "PATCH", headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        await fetch(getApiUrl("/api/admin/freefire-accounts"), {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }
      setShowForm(false);
      load();
    } finally { setSaving(false); }
  };

  const del = async (id: number) => {
    if (!confirm("حذف الحساب؟")) return;
    await fetch(getApiUrl(`/api/admin/freefire-accounts/${id}`), { method: "DELETE" });
    load();
  };

  const f = (k: keyof typeof form, v: unknown) => setForm(p => ({ ...p, [k]: v }));

  return (
    <div dir="rtl" className="min-h-screen bg-gray-50 pb-12">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary to-pink-500 px-4 pt-10 pb-5">
        <Link href="/admin">
          <button className="flex items-center gap-1 text-white/80 text-sm mb-3">
            <ArrowRight className="h-4 w-4" /> لوحة التحكم
          </button>
        </Link>
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-black text-white">حسابات Free Fire</h1>
          <button onClick={openNew} className="flex items-center gap-1.5 bg-white text-primary rounded-full px-4 py-2 text-sm font-bold shadow-lg active:scale-95">
            <Plus className="h-4 w-4" /> إضافة
          </button>
        </div>
      </div>

      <div className="px-4 mt-4 space-y-3">
        {loading && <p className="text-center text-gray-400 py-10">جاري التحميل…</p>}
        {!loading && accounts.length === 0 && (
          <div className="text-center py-16 text-gray-400">
            <ImagePlus className="h-10 w-10 mx-auto mb-2 opacity-40" />
            لا توجد حسابات — اضغط إضافة
          </div>
        )}
        {accounts.map(a => (
          <div key={a.id} className="bg-white rounded-2xl p-4 shadow-sm ring-1 ring-gray-100 flex items-center gap-3">
            {a.cover_image && (
              <img src={a.cover_image} alt={a.account_name} className="h-14 w-14 rounded-xl object-cover flex-shrink-0" />
            )}
            <div className="flex-1 min-w-0">
              <p className="font-bold text-gray-900 truncate">{a.account_name}</p>
              <p className="text-sm text-primary font-semibold">{a.price.toLocaleString()} ج.س</p>
              <span className={`inline-block mt-0.5 text-xs font-bold px-2 py-0.5 rounded-full ${
                a.status === "available" ? "bg-green-100 text-green-700" :
                a.status === "reserved" ? "bg-amber-100 text-amber-700" : "bg-gray-100 text-gray-500"
              }`}>
                {a.status === "available" ? "متوفر" : a.status === "reserved" ? "محجوز" : "مباع"}
              </span>
            </div>
            <div className="flex gap-2 flex-shrink-0">
              <button onClick={() => openEdit(a)} className="p-2 rounded-xl bg-blue-50 text-blue-600 active:scale-95">
                <Edit3 className="h-4 w-4" />
              </button>
              <button onClick={() => del(a.id)} className="p-2 rounded-xl bg-red-50 text-red-600 active:scale-95">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowForm(false)} />
          <div className="relative z-10 w-full max-h-[90vh] overflow-y-auto rounded-t-3xl bg-white p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-black text-gray-900">{editing ? "تعديل الحساب" : "إضافة حساب"}</h2>
              <button onClick={() => setShowForm(false)} className="p-1.5 rounded-full bg-gray-100"><X className="h-4 w-4" /></button>
            </div>

            <div className="space-y-3">
              <Field label="اسم الحساب *">
                <input className={inp} value={form.account_name} onChange={e => f("account_name", e.target.value)} placeholder="اسم الحساب" />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="السعر (ج.س) *">
                  <input className={inp} type="number" value={form.price} onChange={e => f("price", Number(e.target.value))} />
                </Field>
                <Field label="الحالة">
                  <select className={inp} value={form.status} onChange={e => f("status", e.target.value)}>
                    <option value="available">متوفر</option>
                    <option value="reserved">محجوز</option>
                    <option value="sold">مباع</option>
                  </select>
                </Field>
              </div>
              <Field label="رابط الصورة الرئيسية">
                <input className={inp} value={form.cover_image} onChange={e => f("cover_image", e.target.value)} placeholder="https://..." />
              </Field>
              <Field label="روابط صور إضافية (كل رابط في سطر)">
                <textarea className={inp + " min-h-[60px]"} value={imagesText} onChange={e => setImagesText(e.target.value)} placeholder={"https://img1.jpg\nhttps://img2.jpg"} />
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field label="المستوى"><input className={inp} type="number" value={form.level ?? ""} onChange={e => f("level", e.target.value ? Number(e.target.value) : undefined)} /></Field>
                <Field label="أسلحة Evo"><input className={inp} type="number" value={form.evo_weapons_count ?? ""} onChange={e => f("evo_weapons_count", e.target.value ? Number(e.target.value) : undefined)} /></Field>
                <Field label="عدد السكنات"><input className={inp} type="number" value={form.skins_count ?? ""} onChange={e => f("skins_count", e.target.value ? Number(e.target.value) : undefined)} /></Field>
                <Field label="عدد الشخصيات"><input className={inp} type="number" value={form.characters_count ?? ""} onChange={e => f("characters_count", e.target.value ? Number(e.target.value) : undefined)} /></Field>
                <Field label="الرتبة"><input className={inp} value={form.rank ?? ""} onChange={e => f("rank", e.target.value || undefined)} placeholder="Heroic" /></Field>
                <Field label="السيرفر"><input className={inp} value={form.server ?? ""} onChange={e => f("server", e.target.value || undefined)} placeholder="ME" /></Field>
              </div>

              <Field label="وصف الحساب">
                <textarea className={inp + " min-h-[70px]"} value={form.description ?? ""} onChange={e => f("description", e.target.value || undefined)} />
              </Field>
              <Field label="المميزات (كل ميزة في سطر)">
                <textarea className={inp + " min-h-[60px]"} value={featuresText} onChange={e => setFeaturesText(e.target.value)} placeholder={"بدون قفل جهاز\nحساب قديم\n..."} />
              </Field>
              <Field label="الترتيب (رقم أصغر = يظهر أولاً)">
                <input className={inp} type="number" value={form.display_order} onChange={e => f("display_order", Number(e.target.value))} />
              </Field>
            </div>

            <button onClick={save} disabled={saving || !form.account_name || !form.price}
              className="mt-5 w-full rounded-full py-3.5 font-bold text-white bg-gradient-to-r from-primary to-pink-500 shadow-lg active:scale-95 disabled:opacity-50">
              {saving ? "جاري الحفظ…" : <span className="flex items-center justify-center gap-2"><Save className="h-4 w-4" /> حفظ</span>}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
