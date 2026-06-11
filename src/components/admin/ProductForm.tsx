'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { CATEGORIES, type ProductInput } from '@/core/catalog/client';
import { slugify } from '@/lib/slugify';
import type { MediaAsset } from '@/core/media/client';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Textarea } from './ui/Textarea';
import { AutoTextarea } from './ui/AutoTextarea';
import { Select } from './ui/Select';
import { Label } from './ui/Label';
import { ConfirmButton } from './ui/ConfirmButton';
import { VariantPhotos, type MediaActions } from './VariantPhotos';

/** Per-variant media bundle, keyed by colorId (stable across read/write). */
export type VariantMedia = { variantId: string; images: MediaAsset[] };

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
  /** Bound delete action (edit only). When present, the "Delete" button shows. */
  deleteAction?: () => Promise<{ error?: string }>;
  /** DB product id (edit only) — needed to attach uploaded media. */
  productId?: string;
  /** Per-variant media, keyed by colorId (edit only). */
  variantMedia?: Record<string, VariantMedia>;
  /** Bound media actions (edit only). */
  mediaActions?: MediaActions;
};

export default function ProductForm({
  mode,
  initial,
  action,
  deleteAction,
  productId,
  variantMedia,
  mediaActions,
}: Props) {
  const [form, setForm] = useState<ProductInput>(initial ?? EMPTY_INPUT);
  const [error, setError] = useState<string | undefined>();
  const [pending, startTransition] = useTransition();
  // Inactive tab panels stay mounted and are hidden via the `hidden` attribute
  // (NOT unmounted) — the inputs are controlled, but keeping the DOM preserves
  // scroll position and costs nothing. One form, one submit for both tabs.
  const [tab, setTab] = useState<'product' | 'marketplaces'>('product');

  function onDelete() {
    setError(undefined);
    startTransition(async () => {
      // On success the action redirects (throws) — we only get here on error.
      const result = await deleteAction!();
      if (result?.error) setError(result.error);
    });
  }

  function patch(p: Partial<ProductInput>) {
    setForm((f) => ({ ...f, ...p }));
  }

  // Empty/whitespace value removes the key; an empty map becomes undefined
  // (matches cleanMarketplaces in the read→write adapter).
  function patchMarketplace(key: 'kaspi' | 'ozon', value: string) {
    setForm((f) => {
      const next = { ...f.marketplaces };
      if (value.trim() === '') delete next[key];
      else next[key] = value;
      return { ...f, marketplaces: Object.keys(next).length ? next : undefined };
    });
  }

  // Per-SKU mirror of patchMarketplace: empty value removes the key, an empty
  // map becomes undefined (matches cleanMarketplaces in the read→write adapter).
  function patchSkuMarketplace(
    vi: number,
    si: number,
    key: 'kaspi' | 'ozon',
    value: string,
  ) {
    setForm((f) => ({
      ...f,
      variants: f.variants.map((v, i) =>
        i === vi
          ? {
              ...v,
              skus: v.skus.map((s, j) => {
                if (j !== si) return s;
                const next = { ...s.marketplaces };
                if (value.trim() === '') delete next[key];
                else next[key] = value;
                return {
                  ...s,
                  marketplaces: Object.keys(next).length ? next : undefined,
                };
              }),
            }
          : v,
      ),
    }));
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

  // specs is optional in ProductInput — always operate through (form.specs ?? []).
  function addSpec() {
    setForm((f) => ({ ...f, specs: [...(f.specs ?? []), { label: '', value: '' }] }));
  }

  function removeSpec(i: number) {
    setForm((f) => ({ ...f, specs: (f.specs ?? []).filter((_, j) => j !== i) }));
  }

  function patchSpec(i: number, p: Partial<{ label: string; value: string }>) {
    setForm((f) => ({
      ...f,
      specs: (f.specs ?? []).map((s, j) => (j === i ? { ...s, ...p } : s)),
    }));
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(undefined);
    // Drop spec rows with an empty label OR value so half-filled rows never reach
    // the DB. Filter on submit only (not in state) — otherwise a freshly added
    // blank row would vanish from the UI before the user types into it.
    const payload: ProductInput = {
      ...form,
      specs: (form.specs ?? []).filter(
        (s) => s.label.trim() !== '' && s.value.trim() !== '',
      ),
    };
    startTransition(async () => {
      const result = await action(payload);
      // On success the server action redirects (throws) — we only get here on error.
      if (result?.error) setError(result.error);
    });
  }

  return (
    <form onSubmit={onSubmit} className="flex max-w-3xl flex-col gap-6">
      <div role="tablist" className="flex gap-1 border-b border-gray-200">
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'product'}
          data-testid="tab-product"
          onClick={() => setTab('product')}
          className={`px-3 py-2 text-sm ${
            tab === 'product'
              ? '-mb-px border-b-2 border-gray-900 font-medium text-gray-900'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Товар
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'marketplaces'}
          data-testid="tab-marketplaces"
          onClick={() => setTab('marketplaces')}
          className={`px-3 py-2 text-sm ${
            tab === 'marketplaces'
              ? '-mb-px border-b-2 border-gray-900 font-medium text-gray-900'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Маркетплейсы
        </button>
      </div>

      {/* `hidden` alone is not enough: the `flex` utility outranks the UA
          [hidden]{display:none} rule, so the display class must be conditional
          too. Panels stay mounted either way — state and scroll survive. */}
      <div
        hidden={tab !== 'product'}
        className={tab === 'product' ? 'flex flex-col gap-6' : 'hidden'}
      >
      {/* Core fields */}
      <section className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1">
          <Label htmlFor="slug">
            {mode === 'edit'
              ? 'Slug (URL, не редактируется)'
              : 'Slug (генерируется из названия)'}
          </Label>
          <Input
            id="slug"
            value={form.slug}
            readOnly
            aria-readonly
            placeholder={mode === 'create' ? 'jacket-sv7-goretex' : undefined}
          />
          {mode === 'create' ? (
            <span className="text-xs text-gray-400">
              Формируется автоматически из названия. Если занят — добавится суффикс.
            </span>
          ) : null}
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor="name">Название</Label>
          <Input
            id="name"
            value={form.name}
            onChange={(e) =>
              patch(
                mode === 'create'
                  ? { name: e.target.value, slug: slugify(e.target.value) }
                  : { name: e.target.value },
              )
            }
          />
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
        <AutoTextarea
          id="description"
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

      {/* Specs — product characteristics table (material, weight, membrane, …). */}
      <section className="flex flex-col gap-3">
        <div>
          <h2 className="text-sm font-semibold text-gray-700">Характеристики</h2>
          <p className="text-xs text-gray-400">
            Материал, вес, мембрана и т.п. — показываются на странице товара таблицей.
          </p>
        </div>
        {(form.specs ?? []).map((s, i) => (
          <div key={i} className="flex items-end gap-3">
            <div className="flex flex-1 flex-col gap-1">
              <Label>Характеристика</Label>
              <Input
                value={s.label}
                placeholder="Материал"
                onChange={(e) => patchSpec(i, { label: e.target.value })}
              />
            </div>
            <div className="flex flex-1 flex-col gap-1">
              <Label>Значение</Label>
              <Input
                value={s.value}
                placeholder="GORE-TEX 3L"
                onChange={(e) => patchSpec(i, { value: e.target.value })}
              />
            </div>
            <Button
              type="button"
              variant="ghost"
              className="text-red-600"
              onClick={() => removeSpec(i)}
              aria-label="Удалить характеристику"
            >
              ×
            </Button>
          </div>
        ))}
        <Button type="button" variant="secondary" onClick={addSpec} className="self-start">
          + Характеристика
        </Button>
      </section>

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
              <ConfirmButton
                variant="ghost"
                disabled={form.variants.length <= 1}
                className="ml-auto text-red-600"
                title="Удалить цвет?"
                description={
                  <>
                    Цвет «{v.colorLabel || v.colorId || 'без названия'}» и все его размеры
                    будут удалены из формы. Изменение запишется в каталог только после «Сохранить».
                  </>
                }
                confirmLabel="Удалить цвет"
                onConfirm={() => removeVariant(vi)}
              >
                Удалить цвет
              </ConfirmButton>
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
                      <ConfirmButton
                        variant="ghost"
                        disabled={v.skus.length <= 1}
                        className="text-red-600"
                        title="Удалить размер?"
                        description={
                          <>
                            Размер «{s.size || '—'}» будет удалён из формы. Изменение запишется
                            в каталог только после «Сохранить».
                          </>
                        }
                        confirmLabel="Удалить размер"
                        onConfirm={() => removeSku(vi, si)}
                      >
                        ×
                      </ConfirmButton>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <Button type="button" variant="secondary" onClick={() => addSku(vi)} className="mt-2">
              + Размер
            </Button>

            {/* Photos for this color. Edit mode only (needs a persisted variantId). */}
            <div className="mt-4 border-t border-gray-100 pt-4">
              <h3 className="mb-2 text-xs font-semibold text-gray-700">Фото цвета</h3>
              <VariantPhotos
                slug={mode === 'edit' ? form.slug : undefined}
                productId={mode === 'edit' ? productId : undefined}
                variant={{
                  variantId: variantMedia?.[v.colorId]?.variantId ?? '',
                  colorLabel: v.colorLabel,
                  hex: v.hex,
                }}
                images={variantMedia?.[v.colorId]?.images ?? []}
                siblings={form.variants
                  .filter((sv) => sv.colorId !== v.colorId)
                  .map((sv) => ({
                    variantId: variantMedia?.[sv.colorId]?.variantId ?? '',
                    colorLabel: sv.colorLabel,
                    hex: sv.hex,
                    images: variantMedia?.[sv.colorId]?.images ?? [],
                  }))
                  .filter((s) => s.variantId && s.images.length > 0)}
                actions={mode === 'edit' ? mediaActions : undefined}
              />
            </div>
          </div>
        ))}
        <Button type="button" variant="secondary" onClick={addVariant} className="self-start">
          + Цвет
        </Button>
      </section>
      </div>

      <div
        hidden={tab !== 'marketplaces'}
        className={tab === 'marketplaces' ? 'flex flex-col gap-6' : 'hidden'}
      >
        <section className="flex flex-col gap-3">
          <div>
            <h2 className="text-sm font-semibold text-gray-700">Ссылки товара</h2>
            <p className="text-xs text-gray-400">
              Запасные ссылки товара — показываются, пока размер не выбран.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1">
              <Label htmlFor="mp-kaspi">Ссылка Kaspi</Label>
              <Input
                id="mp-kaspi"
                type="url"
                placeholder="https://…"
                data-testid="mp-kaspi"
                value={form.marketplaces?.kaspi ?? ''}
                onChange={(e) => patchMarketplace('kaspi', e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1">
              <Label htmlFor="mp-ozon">Ссылка Ozon</Label>
              <Input
                id="mp-ozon"
                type="url"
                placeholder="https://…"
                data-testid="mp-ozon"
                value={form.marketplaces?.ozon ?? ''}
                onChange={(e) => patchMarketplace('ozon', e.target.value)}
              />
            </div>
          </div>
        </section>

        {/* Per-SKU links (Kaspi lists every color+size as its own card). Size
            and article are read-only here — they are edited on the «Товар» tab. */}
        <section className="flex flex-col gap-4">
          <h2 className="text-sm font-semibold text-gray-700">Ссылки размеров</h2>
          {form.variants.map((v, vi) => (
            <div key={vi} className="rounded-md border border-gray-200 p-4">
              <h3 className="mb-2 text-xs font-semibold text-gray-700">
                {v.colorLabel || v.colorId || 'без названия'}
              </h3>
              <table className="w-full text-sm">
                <thead className="text-left text-gray-500">
                  <tr>
                    <th className="py-1 font-medium">Размер</th>
                    <th className="py-1 font-medium">Артикул</th>
                    <th className="py-1 font-medium">Ozon</th>
                    <th className="py-1 font-medium">Kaspi</th>
                  </tr>
                </thead>
                <tbody>
                  {v.skus.map((s, si) => (
                    <tr key={si}>
                      <td className="py-1 pr-2 whitespace-nowrap">
                        {s.ruSize ? `${s.size} / ${s.ruSize}` : s.size || '—'}
                      </td>
                      <td className="py-1 pr-2 whitespace-nowrap">{s.article || '—'}</td>
                      <td className="py-1 pr-2">
                        <Input
                          type="url"
                          placeholder="https://…"
                          data-testid="sku-mp-ozon"
                          value={s.marketplaces?.ozon ?? ''}
                          onChange={(e) =>
                            patchSkuMarketplace(vi, si, 'ozon', e.target.value)
                          }
                        />
                      </td>
                      <td className="py-1">
                        <Input
                          type="url"
                          placeholder="https://…"
                          data-testid="sku-mp-kaspi"
                          value={s.marketplaces?.kaspi ?? ''}
                          onChange={(e) =>
                            patchSkuMarketplace(vi, si, 'kaspi', e.target.value)
                          }
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </section>
      </div>

      {error ? (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      ) : null}

      <div className="flex items-center gap-3">
        <Button
          type="submit"
          disabled={pending || (mode === 'create' && form.slug.trim() === '')}
        >
          {pending ? 'Сохранение…' : mode === 'edit' ? 'Сохранить' : 'Создать'}
        </Button>
        <Link
          href="/admin/catalog"
          className="inline-flex items-center justify-center rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-900 transition-colors hover:bg-gray-50"
        >
          Отмена
        </Link>
        {deleteAction ? (
          <ConfirmButton
            variant="secondary"
            disabled={pending}
            className="ml-auto text-red-600"
            title="Удалить товар?"
            description="Товар, все цвета, размеры и фото будут удалены безвозвратно."
            confirmLabel="Удалить товар"
            onConfirm={onDelete}
          >
            Удалить товар
          </ConfirmButton>
        ) : null}
      </div>
    </form>
  );
}
