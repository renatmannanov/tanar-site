'use client';

import { useState, useTransition } from 'react';
import { CATEGORIES, type ProductInput } from '@/core/catalog';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Textarea } from './ui/Textarea';
import { Select } from './ui/Select';
import { Label } from './ui/Label';

const STATUSES: { value: string; label: string }[] = [
  { value: 'draft', label: 'Черновик' },
  { value: 'published', label: 'Опубликован' },
  { value: 'archived', label: 'Архив' },
  { value: 'coming_soon', label: 'Скоро' },
];

const EMPTY_INPUT: ProductInput = {
  slug: '',
  name: '',
  category: CATEGORIES[0].id,
  status: 'draft',
  priceBase: 0,
  description: '',
  variants: [
    { colorId: '', colorLabel: '', hex: '#888888', skus: [{ size: '', stockQty: 0 }] },
  ],
};

type Props = {
  mode: 'create' | 'edit';
  initial?: ProductInput;
  action: (input: ProductInput) => Promise<{ error?: string }>;
};

export default function ProductForm({ mode, initial, action }: Props) {
  const [form, setForm] = useState<ProductInput>(initial ?? EMPTY_INPUT);
  const [error, setError] = useState<string | undefined>();
  const [pending, startTransition] = useTransition();

  function patch(p: Partial<ProductInput>) {
    setForm((f) => ({ ...f, ...p }));
  }

  function patchVariant(vi: number, p: Partial<ProductInput['variants'][number]>) {
    setForm((f) => ({
      ...f,
      variants: f.variants.map((v, i) => (i === vi ? { ...v, ...p } : v)),
    }));
  }

  function patchSku(
    vi: number,
    si: number,
    p: Partial<ProductInput['variants'][number]['skus'][number]>,
  ) {
    setForm((f) => ({
      ...f,
      variants: f.variants.map((v, i) =>
        i === vi ? { ...v, skus: v.skus.map((s, j) => (j === si ? { ...s, ...p } : s)) } : v,
      ),
    }));
  }

  function addVariant() {
    setForm((f) => ({
      ...f,
      variants: [
        ...f.variants,
        { colorId: '', colorLabel: '', hex: '#888888', skus: [{ size: '', stockQty: 0 }] },
      ],
    }));
  }

  function removeVariant(vi: number) {
    setForm((f) => ({ ...f, variants: f.variants.filter((_, i) => i !== vi) }));
  }

  function addSku(vi: number) {
    setForm((f) => ({
      ...f,
      variants: f.variants.map((v, i) =>
        i === vi ? { ...v, skus: [...v.skus, { size: '', stockQty: 0 }] } : v,
      ),
    }));
  }

  function removeSku(vi: number, si: number) {
    setForm((f) => ({
      ...f,
      variants: f.variants.map((v, i) =>
        i === vi ? { ...v, skus: v.skus.filter((_, j) => j !== si) } : v,
      ),
    }));
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(undefined);
    startTransition(async () => {
      const result = await action(form);
      // On success the server action redirects (throws) — we only get here on error.
      if (result?.error) setError(result.error);
    });
  }

  return (
    <form onSubmit={onSubmit} className="flex max-w-3xl flex-col gap-6">
      {/* Core fields */}
      <section className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1">
          <Label htmlFor="slug">Slug (URL, не редактируется)</Label>
          <Input id="slug" value={form.slug} readOnly={mode === 'edit'} aria-readonly={mode === 'edit'} />
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor="name">Название</Label>
          <Input id="name" value={form.name} onChange={(e) => patch({ name: e.target.value })} />
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor="category">Категория</Label>
          <Select
            id="category"
            value={form.category}
            onChange={(e) => patch({ category: e.target.value as ProductInput['category'] })}
          >
            {CATEGORIES.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </Select>
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor="status">Статус</Label>
          <Select
            id="status"
            value={form.status ?? 'draft'}
            onChange={(e) => patch({ status: e.target.value as ProductInput['status'] })}
          >
            {STATUSES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </Select>
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor="priceBase">Цена (KZT)</Label>
          <Input
            id="priceBase"
            type="number"
            value={form.priceBase}
            onChange={(e) => patch({ priceBase: Number(e.target.value) })}
          />
        </div>
      </section>

      <div className="flex flex-col gap-1">
        <Label htmlFor="description">Описание</Label>
        <Textarea
          id="description"
          rows={4}
          value={form.description}
          onChange={(e) => patch({ description: e.target.value })}
        />
      </div>

      <section className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1">
          <Label htmlFor="badge">Бейдж (label.badge)</Label>
          <Input
            id="badge"
            value={form.label?.badge ?? ''}
            onChange={(e) =>
              patch({ label: { badge: e.target.value, sub: form.label?.sub ?? '' } })
            }
          />
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor="sub">Подпись бейджа (label.sub)</Label>
          <Input
            id="sub"
            value={form.label?.sub ?? ''}
            onChange={(e) =>
              patch({ label: { badge: form.label?.badge ?? '', sub: e.target.value } })
            }
          />
        </div>
      </section>

      <div className="flex flex-col gap-1">
        <Label htmlFor="care">Уход</Label>
        <Textarea
          id="care"
          rows={2}
          value={form.care ?? ''}
          onChange={(e) => patch({ care: e.target.value })}
        />
      </div>

      {/* Variants */}
      <section className="flex flex-col gap-4">
        <h2 className="text-sm font-semibold text-gray-700">Цвета и размеры</h2>
        {form.variants.map((v, vi) => (
          <div key={vi} className="rounded-md border border-gray-200 p-4">
            <div className="mb-3 flex items-end gap-3">
              <div className="flex flex-col gap-1">
                <Label>colorId</Label>
                <Input value={v.colorId} onChange={(e) => patchVariant(vi, { colorId: e.target.value })} />
              </div>
              <div className="flex flex-col gap-1">
                <Label>Название цвета</Label>
                <Input value={v.colorLabel} onChange={(e) => patchVariant(vi, { colorLabel: e.target.value })} />
              </div>
              <div className="flex flex-col gap-1">
                <Label>hex</Label>
                <input
                  type="color"
                  value={v.hex}
                  onChange={(e) => patchVariant(vi, { hex: e.target.value })}
                  className="h-9 w-12 rounded border border-gray-300"
                />
              </div>
              <Button
                type="button"
                variant="ghost"
                onClick={() => removeVariant(vi)}
                disabled={form.variants.length <= 1}
                className="ml-auto text-red-600"
              >
                Удалить цвет
              </Button>
            </div>

            <table className="w-full text-sm">
              <thead className="text-left text-gray-500">
                <tr>
                  <th className="py-1 font-medium">Размер</th>
                  <th className="py-1 font-medium">RU</th>
                  <th className="py-1 font-medium">Артикул</th>
                  <th className="py-1 font-medium">Остаток</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {v.skus.map((s, si) => (
                  <tr key={si}>
                    <td className="py-1 pr-2">
                      <Input value={s.size} onChange={(e) => patchSku(vi, si, { size: e.target.value })} />
                    </td>
                    <td className="py-1 pr-2">
                      <Input
                        value={s.ruSize ?? ''}
                        onChange={(e) => patchSku(vi, si, { ruSize: e.target.value })}
                      />
                    </td>
                    <td className="py-1 pr-2">
                      <Input
                        value={s.article ?? ''}
                        onChange={(e) => patchSku(vi, si, { article: e.target.value })}
                      />
                    </td>
                    <td className="py-1 pr-2">
                      <Input
                        type="number"
                        value={s.stockQty ?? 0}
                        onChange={(e) => patchSku(vi, si, { stockQty: Number(e.target.value) })}
                      />
                    </td>
                    <td className="py-1">
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => removeSku(vi, si)}
                        disabled={v.skus.length <= 1}
                        className="text-red-600"
                      >
                        ×
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <Button type="button" variant="secondary" onClick={() => addSku(vi)} className="mt-2">
              + Размер
            </Button>
          </div>
        ))}
        <Button type="button" variant="secondary" onClick={addVariant} className="self-start">
          + Цвет
        </Button>
      </section>

      {/* Photo slot — Plan C */}
      <section className="rounded-md border border-dashed border-gray-300 p-6 text-center text-sm text-gray-400">
        Загрузка фото — Доступно в Плане C
      </section>

      {error ? (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      ) : null}

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? 'Сохранение…' : mode === 'edit' ? 'Сохранить' : 'Создать'}
        </Button>
        <Button type="button" variant="secondary" disabled title="Доступно в Плане C" className="text-red-600">
          Удалить товар
        </Button>
      </div>
    </form>
  );
}
