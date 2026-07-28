// src/pages/admin/AdminAddonsPage.tsx
import { useEffect, useState, type FormEvent } from 'react';
import { Edit3, Plus, Save, Trash2, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import {
  AdminHeader,
  AdminNotice,
  EmptyState,
  dangerButtonClass,
  inputClass,
  labelClass,
  primaryButtonClass,
  secondaryButtonClass,
} from './AdminUi';

// --- أنواع ---
type AddonOption = {
  id: string;
  name: string;
  price: number;
  is_active: boolean;
  sort_order: number;
};

type Group = {
  id: string;
  name: string;
  selection_type: 'single' | 'multiple';
  min_selection: number;
  max_selection: number;
  is_required: boolean;
  sort_order: number;
  is_active: boolean;
  addon_options: AddonOption[];
};

// تحديد نوع form بشكل صريح لتجنب مشاكل الاتحاد
type FormState = {
  name: string;
  selection_type: 'single' | 'multiple';
  min_selection: string;
  max_selection: string;
  is_required: boolean;
  sort_order: string;
  is_active: boolean;
};

const emptyGroup: FormState = {
  name: '',
  selection_type: 'single', // القيمة الافتراضية
  min_selection: '0',
  max_selection: '1',
  is_required: false,
  sort_order: '0',
  is_active: true,
};

// --- المكون الرئيسي ---
export function AdminAddonsPage() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [form, setForm] = useState<FormState>(emptyGroup);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [optionName, setOptionName] = useState<Record<string, string>>({});
  const [optionPrice, setOptionPrice] = useState<Record<string, string>>({});

  // دالة مساعدة للتحقق من وجود supabase
  const requireSupabase = () => {
    if (!supabase) throw new Error('Supabase غير متاح');
    return supabase;
  };

  // تحميل المجموعات
  const loadGroups = async () => {
    try {
      const client = requireSupabase();
      const { data, error: err } = await client
        .from('addon_groups')
        .select(
          `
          id,
          name,
          selection_type,
          min_selection,
          max_selection,
          is_required,
          sort_order,
          is_active,
          addon_options (
            id,
            name,
            price,
            is_active,
            sort_order
          )
        `
        )
        .order('sort_order');

      if (err) {
        setError(err.message);
        return;
      }
      setGroups((data ?? []) as Group[]);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'حدث خطأ أثناء التحميل');
    }
  };

  useEffect(() => {
    void loadGroups();
  }, []);

  // حفظ المجموعة (إضافة أو تحديث)
  const saveGroup = async (e: FormEvent) => {
    e.preventDefault();
    try {
      const client = requireSupabase();
      const name = form.name.trim();
      if (!name) {
        setError('اسم مجموعة الإضافات مطلوب');
        return;
      }

      const payload = {
        name,
        selection_type: form.selection_type, // الآن النوع مطابق
        min_selection: Number(form.min_selection) || 0,
        max_selection: Math.max(1, Number(form.max_selection) || 1),
        is_required: form.is_required,
        sort_order: Number(form.sort_order) || 0,
        is_active: form.is_active,
      };

      let result;
      if (editingId) {
        result = await client
          .from('addon_groups')
          .update(payload)
          .eq('id', editingId);
      } else {
        result = await client.from('addon_groups').insert(payload);
      }

      if (result.error) {
        setError(result.error.message);
        return;
      }

      setSuccess('تم حفظ المجموعة');
      setOpen(false);
      setEditingId(null);
      setForm(emptyGroup);
      await loadGroups();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'حدث خطأ أثناء الحفظ');
    }
  };

  // إضافة خيار لمجموعة
  const addOption = async (groupId: string) => {
    try {
      const client = requireSupabase();
      const name = (optionName[groupId] ?? '').trim();
      const price = Number(optionPrice[groupId] ?? 0);

      if (!name) {
        setError('اكتب اسم الخيار');
        return;
      }

      const { error: err } = await client.from('addon_options').insert({
        group_id: groupId,
        name,
        price: Number.isFinite(price) && price >= 0 ? price : 0,
      });

      if (err) {
        setError(err.message);
        return;
      }

      setOptionName((prev) => ({ ...prev, [groupId]: '' }));
      setOptionPrice((prev) => ({ ...prev, [groupId]: '' }));
      await loadGroups();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'حدث خطأ أثناء إضافة الخيار');
    }
  };

  // حذف مجموعة
  const deleteGroup = async (id: string) => {
    if (!confirm('حذف المجموعة وكل خياراتها؟')) return;
    try {
      const client = requireSupabase();
      const { error: err } = await client
        .from('addon_groups')
        .delete()
        .eq('id', id);
      if (err) {
        setError(err.message);
        return;
      }
      await loadGroups();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'حدث خطأ أثناء الحذف');
    }
  };

  // حذف خيار
  const deleteOption = async (id: string) => {
    if (!confirm('حذف الخيار؟')) return;
    try {
      const client = requireSupabase();
      const { error: err } = await client
        .from('addon_options')
        .delete()
        .eq('id', id);
      if (err) {
        setError(err.message);
        return;
      }
      await loadGroups();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'حدث خطأ أثناء حذف الخيار');
    }
  };

  return (
    <section className="p-4 sm:p-6">
      <AdminHeader
        title="الإضافات والأحجام"
        description="أنشئ مجموعات مثل نوع الحليب، السكر، والإضافات المدفوعة."
        action={
          <button
            className={primaryButtonClass}
            onClick={() => {
              setEditingId(null);
              setForm(emptyGroup);
              setOpen(true);
            }}
          >
            <Plus className="ml-2 inline size-4" />
            مجموعة جديدة
          </button>
        }
      />

      <AdminNotice error={error} success={success} />

      {open && (
        <form
          onSubmit={(e) => void saveGroup(e)}
          className="mt-5 rounded-3xl bg-white p-5 shadow-sm"
        >
          <div className="mb-4 flex justify-between">
            <h2 className="font-black">مجموعة إضافات</h2>
            <button type="button" onClick={() => setOpen(false)}>
              <X className="size-5" />
            </button>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <label>
              <span className={labelClass}>الاسم</span>
              <input
                className={inputClass}
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </label>

            <label>
              <span className={labelClass}>نوع الاختيار</span>
              <select
                className={inputClass}
                value={form.selection_type}
                onChange={(e) =>
                  setForm({
                    ...form,
                    selection_type: e.target.value as 'single' | 'multiple',
                  })
                }
              >
                <option value="single">اختيار واحد</option>
                <option value="multiple">اختيارات متعددة</option>
              </select>
            </label>

            <label>
              <span className={labelClass}>الحد الأدنى</span>
              <input
                className={inputClass}
                type="number"
                min="0"
                value={form.min_selection}
                onChange={(e) =>
                  setForm({ ...form, min_selection: e.target.value })
                }
              />
            </label>

            <label>
              <span className={labelClass}>الحد الأعلى</span>
              <input
                className={inputClass}
                type="number"
                min="1"
                value={form.max_selection}
                onChange={(e) =>
                  setForm({ ...form, max_selection: e.target.value })
                }
              />
            </label>

            <label className="flex gap-2">
              <input
                type="checkbox"
                checked={form.is_required}
                onChange={(e) =>
                  setForm({ ...form, is_required: e.target.checked })
                }
              />
              إجباري
            </label>

            <label className="flex gap-2">
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={(e) =>
                  setForm({ ...form, is_active: e.target.checked })
                }
              />
              نشط
            </label>
          </div>

          <div className="mt-4">
            <button className={primaryButtonClass}>
              <Save className="ml-2 inline size-4" />
              حفظ
            </button>
          </div>
        </form>
      )}

      <div className="mt-5 space-y-4">
        {groups.length === 0 ? (
          <EmptyState>ما فيه مجموعات إضافات.</EmptyState>
        ) : (
          groups.map((g) => (
            <article key={g.id} className="rounded-3xl bg-white p-5 shadow-sm">
              <div className="flex justify-between gap-3">
                <div>
                  <h3 className="font-black">{g.name}</h3>
                  <p className="text-sm text-vibes-600">
                    {g.selection_type === 'single'
                      ? 'اختيار واحد'
                      : 'اختيارات متعددة'}
                    · {g.min_selection} إلى {g.max_selection}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    className={secondaryButtonClass}
                    onClick={() => {
                      setEditingId(g.id);
                      setForm({
                        name: g.name,
                        selection_type: g.selection_type,
                        min_selection: String(g.min_selection),
                        max_selection: String(g.max_selection),
                        is_required: g.is_required,
                        sort_order: String(g.sort_order),
                        is_active: g.is_active,
                      });
                      setOpen(true);
                    }}
                  >
                    <Edit3 className="size-4" />
                  </button>
                  <button
                    className={dangerButtonClass}
                    onClick={() => void deleteGroup(g.id)}
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              </div>

              <div className="mt-4 space-y-2">
                {g.addon_options.map((o) => (
                  <div
                    key={o.id}
                    className="flex items-center justify-between rounded-xl bg-vibes-50 p-3"
                  >
                    <span>
                      {o.name}{' '}
                      <b className="text-vibes-700">+{o.price} ريال</b>
                    </span>
                    <button
                      className={dangerButtonClass}
                      onClick={() => void deleteOption(o.id)}
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                ))}
              </div>

              <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_140px_auto]">
                <input
                  className={inputClass}
                  placeholder="اسم الخيار"
                  value={optionName[g.id] ?? ''}
                  onChange={(e) =>
                    setOptionName({ ...optionName, [g.id]: e.target.value })
                  }
                />
                <input
                  className={inputClass}
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="السعر"
                  value={optionPrice[g.id] ?? ''}
                  onChange={(e) =>
                    setOptionPrice({ ...optionPrice, [g.id]: e.target.value })
                  }
                />
                <button
                  className={primaryButtonClass}
                  onClick={() => void addOption(g.id)}
                >
                  إضافة خيار
                </button>
              </div>
            </article>
          ))
        )}
      </div>
    </section>
  );
}
