'use client';

import { useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  type MediaAsset,
  type PhotoSlot,
  type PhotoSlotKey,
  PHOTO_SLOTS,
  assetsBySlot,
  assetsOutsideGrid,
  hexDistance,
} from '@/core/media/client';
import type { ProductImageView } from '@/core/contracts';
import { Button } from './ui/Button';
import { ConfirmButton } from './ui/ConfirmButton';
import { Lightbox } from './ui/Lightbox';

const SOFT_MAX = 8;

/** Where a generated photo lands. view = the TARGET slot's angle. */
type GenTarget = {
  sourceId: string;
  variantId: string;
  view: ProductImageView;
  slug: string;
  productId: string;
};

/** A generate* result: a base64 preview held by the client until approved. */
type GenPreview = {
  error?: string;
  previewDataUrl?: string;
  role?: 'lifestyle' | 'flat';
};

export type MediaActions = {
  upload: (formData: FormData) => Promise<{ error?: string }>;
  remove: (id: string, slug: string) => Promise<{ error?: string }>;
  reorder: (
    items: { id: string; sortOrder: number }[],
    slug: string,
  ) => Promise<{ error?: string }>;
  setRole: (
    id: string,
    role: 'lifestyle' | 'flat',
    slug: string,
  ) => Promise<{ error?: string }>;
  generateFlat: (target: GenTarget) => Promise<GenPreview>;
  recolorFlat: (target: GenTarget & { hex: string }) => Promise<GenPreview>;
  recolorLifestyle: (target: GenTarget & { hex: string }) => Promise<GenPreview>;
  approveGenerated: (input: {
    previewDataUrl: string;
    variantId: string;
    view: ProductImageView;
    role: 'lifestyle' | 'flat';
    slug: string;
    productId: string;
    replaceId?: string;
  }) => Promise<{ error?: string }>;
};

/** Another color of the same product — a source pool for recolor. */
export type SiblingVariant = {
  variantId: string;
  colorLabel: string;
  hex: string;
  images: MediaAsset[];
};

type Props = {
  slug?: string;
  productId?: string;
  variant: { variantId: string; colorLabel: string; hex: string };
  images: MediaAsset[];
  siblings?: SiblingVariant[];
  actions?: MediaActions;
};

/** A generation candidate for one slot: recipe + source + label/sort. */
type Candidate = {
  kind: 'flat' | 'recolorFlat' | 'recolorLifestyle';
  source: MediaAsset;
  label: string;
  fromLabel?: string;
  rank: number;
};

/** One generated photo awaiting approval (held client-side, not persisted). */
type PreviewItem = {
  slot: PhotoSlot;
  candidate: Candidate;
  dataUrl: string;
  role: 'lifestyle' | 'flat';
};

export function VariantPhotos({
  slug,
  productId,
  variant,
  images,
  siblings = [],
  actions,
}: Props) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const pendingSlot = useRef<PhotoSlotKey | null>(null);
  const [openSlot, setOpenSlot] = useState<PhotoSlotKey | null>(null);
  // One or more generated photos awaiting a single approval decision. null when
  // nothing is pending. A batch ("сделать все") fills several items at once.
  const [preview, setPreview] = useState<PreviewItem[] | null>(null);
  // Full-size image shown in the lightbox (slot thumbnail or generation preview).
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
  const [error, setError] = useState<string | undefined>();
  const [pending, startTransition] = useTransition();

  if (!slug || !productId || !actions || !variant.variantId) {
    return (
      <div className="rounded-md border border-dashed border-gray-300 p-4 text-center text-sm text-gray-400">
        Сначала сохраните товар — затем здесь появится загрузка фото.
      </div>
    );
  }

  function run(fn: () => Promise<{ error?: string }>) {
    setError(undefined);
    startTransition(async () => {
      const result = await fn();
      if (result?.error) setError(result.error);
      else router.refresh();
    });
  }

  function pickInto(slotKey: PhotoSlotKey) {
    pendingSlot.current = slotKey;
    fileRef.current?.click();
  }

  function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    const slotKey = pendingSlot.current;
    pendingSlot.current = null;
    if (!file || !slotKey) {
      e.target.value = '';
      return;
    }
    const slot = PHOTO_SLOTS.find((s) => s.key === slotKey)!;
    const fd = new FormData();
    fd.set('file', file);
    fd.set('slug', slug!);
    fd.set('productId', productId!);
    fd.set('variantId', variant.variantId);
    fd.set('role', slot.role);
    fd.set('view', slot.view);
    run(() => actions!.upload(fd));
    e.target.value = '';
  }

  const bySlot = assetsBySlot(images);
  const outside = assetsOutsideGrid(images);
  const atMax = images.length >= SOFT_MAX;

  function siblingCandidates(
    role: 'lifestyle' | 'flat',
    view: ProductImageView,
  ): { asset: MediaAsset; sib: SiblingVariant }[] {
    const out: { asset: MediaAsset; sib: SiblingVariant }[] = [];
    for (const sib of siblings) {
      const asset = sib.images.find(
        (i) => (i.role ?? 'lifestyle') === role && i.view === view,
      );
      if (asset) out.push({ asset, sib });
    }
    return out;
  }

  /** Candidates for a slot (empty OR occupied). For flat: own life (recipe 1)
   *  then recolor from siblings (by hex). For lifestyle: recolor from siblings. */
  function candidatesFor(slot: PhotoSlot): Candidate[] {
    const list: Candidate[] = [];
    if (slot.role === 'flat') {
      const ownLife = bySlot[`life_${slot.view}` as PhotoSlotKey]?.[0];
      if (ownLife) {
        list.push({ kind: 'flat', source: ownLife, label: 'Сделать на белом', rank: 0 });
      }
      for (const { asset, sib } of siblingCandidates('flat', slot.view)) {
        list.push({
          kind: 'recolorFlat',
          source: asset,
          label: `Перекрасить из «${sib.colorLabel}»`,
          fromLabel: sib.colorLabel,
          rank: 1 + hexDistance(variant.hex, sib.hex),
        });
      }
    } else {
      for (const { asset, sib } of siblingCandidates('lifestyle', slot.view)) {
        list.push({
          kind: 'recolorLifestyle',
          source: asset,
          label: `Перекрасить из «${sib.colorLabel}»`,
          fromLabel: sib.colorLabel,
          rank: 1 + hexDistance(variant.hex, sib.hex),
        });
      }
    }
    return list.sort((a, b) => a.rank - b.rank);
  }

  /** Run one recipe → a PreviewItem (no persistence), or null on error. */
  async function runCandidate(
    slot: PhotoSlot,
    c: Candidate,
  ): Promise<PreviewItem | null> {
    const base: GenTarget = {
      sourceId: c.source.id,
      variantId: variant.variantId,
      view: slot.view,
      slug: slug!,
      productId: productId!,
    };
    let res: GenPreview;
    if (c.kind === 'flat') res = await actions!.generateFlat(base);
    else if (c.kind === 'recolorFlat')
      res = await actions!.recolorFlat({ ...base, hex: variant.hex });
    else res = await actions!.recolorLifestyle({ ...base, hex: variant.hex });

    if (res.error || !res.previewDataUrl || !res.role) {
      setError(res.error ?? 'Пустой результат генерации');
      return null;
    }
    return { slot, candidate: c, dataUrl: res.previewDataUrl, role: res.role };
  }

  /** Single-slot generation → show a one-item preview (NOT persisted yet). */
  function generate(slot: PhotoSlot, c: Candidate) {
    setOpenSlot(null);
    setError(undefined);
    startTransition(async () => {
      const item = await runCandidate(slot, c);
      if (item) setPreview([item]);
    });
  }

  /** "Оставить": persist EVERY previewed photo into its (empty) slot. To redo a
   *  slot the owner deletes the photo and generates again — no in-place replace. */
  function keepPreview() {
    if (!preview) return;
    const items = preview;
    setError(undefined);
    startTransition(async () => {
      for (const p of items) {
        const res = await actions!.approveGenerated({
          previewDataUrl: p.dataUrl,
          variantId: variant.variantId,
          view: p.slot.view,
          role: p.role,
          slug: slug!,
          productId: productId!,
        });
        if (res?.error) {
          setError(res.error);
          return; // stop on first failure; the rest stay in preview
        }
      }
      setPreview(null);
      router.refresh();
    });
  }

  /** "Перегенерировать": re-run every previewed item's recipe, replace previews. */
  function regenerate() {
    if (!preview) return;
    const items = preview;
    setError(undefined);
    startTransition(async () => {
      const next: PreviewItem[] = [];
      for (const p of items) {
        const item = await runCandidate(p.slot, p.candidate);
        if (!item) return; // error already surfaced; keep current previews
        next.push(item);
      }
      setPreview(next);
    });
  }

  function cancelPreview() {
    setPreview(null);
    setError(undefined);
  }

  // Batch "make all flats": every life_<view> with an empty paired flat → flat.
  const flatableViews = PHOTO_SLOTS.filter(
    (s) => s.role === 'flat' && bySlot[`life_${s.view}` as PhotoSlotKey]?.[0] && !bySlot[s.key][0],
  );
  /** Generate a flat for every flatable view, then show ALL previews at once for
   *  a single approval — nothing is saved until "Оставить". */
  function makeAllFlats() {
    setOpenSlot(null);
    setError(undefined);
    startTransition(async () => {
      const items: PreviewItem[] = [];
      for (const slot of flatableViews) {
        const life = bySlot[`life_${slot.view}` as PhotoSlotKey][0];
        const item = await runCandidate(slot, {
          kind: 'flat',
          source: life,
          label: 'Сделать на белом',
          rank: 0,
        });
        if (!item) return; // error surfaced; abort the batch
        items.push(item);
      }
      if (items.length > 0) setPreview(items);
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs text-gray-500">
        6 слотов: живое фото и «на белом» для каждого ракурса (спереди / сбоку / сзади).
        В пустом слоте можно загрузить фото или сгенерировать ИИ из подходящего источника.
      </p>

      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={onPick}
      />

      {flatableViews.length > 0 ? (
        <ConfirmButton
          variant="secondary"
          disabled={pending || atMax || !!preview}
          className="self-start"
          title={`Сгенерировать ${flatableViews.length} фото «на белом»?`}
          description={`ИИ создаст «на белом» для всех ракурсов с живым фото (${flatableViews.length} шт.). Результат покажем для проверки перед сохранением.`}
          confirmLabel="Сгенерировать"
          onConfirm={makeAllFlats}
        >
          ✨ Сделать все на белом ({flatableViews.length})
        </ConfirmButton>
      ) : null}

      {/* Preview panel — rendered OUTSIDE the slot <ul> so its <img> is never
          counted as a stored photo. Nothing is persisted until "Оставить". */}
      {preview ? (
        <div className="flex flex-col gap-2 rounded-md border border-indigo-200 bg-indigo-50/40 p-3">
          <p className="text-xs font-medium text-indigo-700">
            {preview.length > 1
              ? `Превью генерации (${preview.length}) — проверьте, прежде чем сохранить.`
              : `Превью генерации для «${preview[0].slot.label}» — проверьте, прежде чем сохранить.`}
          </p>
          <div className="flex items-start gap-4">
            {/* All generated photos in a row. Each shows its slot label and
                opens full-size in the lightbox on click. */}
            <div className="flex flex-wrap gap-3">
              {preview.map((p, i) => (
                <div key={p.slot.key} className="flex flex-col items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setLightboxSrc(p.dataUrl)}
                    title="Открыть в полный размер"
                    className="h-32 w-32 shrink-0 overflow-hidden rounded border border-gray-200 bg-white"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={p.dataUrl}
                      alt="превью"
                      data-testid={i === 0 ? 'gen-preview' : undefined}
                      className="h-full w-full cursor-zoom-in object-cover"
                    />
                  </button>
                  <span className="text-[10px] text-gray-500">{p.slot.label}</span>
                </div>
              ))}
            </div>
            {/* One set of actions for the whole batch, stacked in a column. */}
            <div className="flex flex-col gap-2">
              <Button type="button" disabled={pending} onClick={keepPreview}>
                Оставить
              </Button>
              <Button
                type="button"
                variant="secondary"
                disabled={pending}
                onClick={regenerate}
              >
                Перегенерировать
              </Button>
              <Button
                type="button"
                variant="ghost"
                disabled={pending}
                onClick={cancelPreview}
              >
                Отмена
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {/* 2×3 slot grid. Occupied slots render as <ul><li> so e2e counts of
          stored photos stay on `ul li`; empty tiles live outside the <ul>. */}
      <div className="grid grid-cols-3 gap-3">
        {PHOTO_SLOTS.map((slot) => {
          const asset = bySlot[slot.key][0];
          if (asset) {
            return (
              <ul key={slot.key} className="contents">
                <li className="group relative overflow-hidden rounded-md border border-gray-200">
                  <button
                    type="button"
                    onClick={() => setLightboxSrc(asset.url)}
                    title="Открыть в полный размер"
                    className="block aspect-square w-full bg-gray-100"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={asset.url}
                      alt={asset.alt ?? ''}
                      className="h-full w-full cursor-zoom-in object-cover"
                    />
                  </button>
                  <span className="absolute left-1 top-1 rounded bg-gray-900/80 px-1.5 py-0.5 text-[10px] font-medium text-white">
                    {slot.label}
                  </span>
                  {asset.aiGenerated ? (
                    <span
                      className="absolute right-1 top-1 rounded bg-indigo-600/90 px-1.5 py-0.5 text-[10px] font-medium text-white"
                      title="Изображение создано ИИ"
                    >
                      ИИ
                    </span>
                  ) : null}
                  <div className="absolute inset-x-0 bottom-0 flex items-center justify-end bg-black/40 px-1 py-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                    <ConfirmButton
                      variant="ghost"
                      disabled={pending}
                      className="px-1 py-0 text-white hover:bg-white/20"
                      title="Удалить фото?"
                      description="Фото будет удалено безвозвратно."
                      confirmLabel="Удалить фото"
                      onConfirm={() => run(() => actions!.remove(asset.id, slug!))}
                    >
                      ×
                    </ConfirmButton>
                  </div>
                </li>
              </ul>
            );
          }

          const candidates = candidatesFor(slot);
          const isOpen = openSlot === slot.key;
          return (
            <div
              key={slot.key}
              className="relative flex aspect-square flex-col items-center justify-center gap-1.5 rounded-md border border-dashed border-gray-300 p-2 text-center"
            >
              <span className="text-[11px] font-medium text-gray-500">{slot.label}</span>

              {candidates.length > 0 ? (
                <div className="relative">
                  <button
                    type="button"
                    disabled={pending || atMax || !!preview}
                    onClick={() => setOpenSlot(isOpen ? null : slot.key)}
                    className="rounded bg-gray-900/85 px-2 py-1 text-[11px] font-medium text-white hover:bg-gray-900 disabled:opacity-50"
                  >
                    ✨ Сгенерировать ▾
                  </button>

                  {isOpen ? (
                    <div className="absolute left-1/2 top-full z-10 mt-1 w-56 -translate-x-1/2 rounded-md border border-gray-200 bg-white p-2 text-left shadow-lg">
                      <p className="mb-1 px-1 text-[10px] uppercase tracking-wide text-gray-400">
                        Источник для «{slot.label}»
                      </p>
                      <ul className="flex flex-col gap-1">
                        {candidates.map((c) => (
                          <li key={`${c.kind}-${c.source.id}`}>
                            <button
                              type="button"
                              disabled={pending}
                              onClick={() => generate(slot, c)}
                              className="flex w-full items-center gap-2 rounded px-1 py-1 text-left hover:bg-gray-100 disabled:opacity-50"
                            >
                              <span className="h-9 w-9 shrink-0 overflow-hidden rounded bg-gray-100">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={c.source.url} alt="" className="h-full w-full object-cover" />
                              </span>
                              <span className="text-[11px] leading-tight text-gray-700">
                                {c.label}
                              </span>
                            </button>
                          </li>
                        ))}
                      </ul>
                      <button
                        type="button"
                        onClick={() => setOpenSlot(null)}
                        className="mt-1 w-full rounded px-1 py-0.5 text-[10px] text-gray-400 hover:text-gray-600"
                      >
                        отмена
                      </button>
                    </div>
                  ) : null}
                </div>
              ) : null}

              <button
                type="button"
                disabled={pending || atMax || !!preview}
                onClick={() => pickInto(slot.key)}
                title={atMax ? `Достаточно (макс ${SOFT_MAX})` : `Загрузить: ${slot.label}`}
                className="text-[11px] text-gray-400 hover:text-gray-600 disabled:opacity-50"
              >
                + загрузить
              </button>
            </div>
          );
        })}
      </div>

      {outside.length > 0 ? (
        <div className="flex flex-col gap-2 rounded-md border border-amber-200 bg-amber-50/50 p-3">
          <p className="text-xs text-amber-700">
            Фото без ракурса (вне сетки) — удалите или перезагрузите в нужный слот:
          </p>
          <ul className="grid grid-cols-3 gap-3 sm:grid-cols-4">
            {outside.map((img) => (
              <li
                key={img.id}
                className="group relative overflow-hidden rounded-md border border-gray-200"
              >
                <div className="aspect-square w-full bg-gray-100">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={img.url} alt={img.alt ?? ''} className="h-full w-full object-cover" />
                </div>
                <div className="absolute inset-x-0 bottom-0 flex items-center justify-end bg-black/40 px-1 py-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                  <ConfirmButton
                    variant="ghost"
                    disabled={pending}
                    className="px-1 py-0 text-white hover:bg-white/20"
                    title="Удалить фото?"
                    description="Фото будет удалено безвозвратно."
                    confirmLabel="Удалить фото"
                    onConfirm={() => run(() => actions!.remove(img.id, slug!))}
                  >
                    ×
                  </ConfirmButton>
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {error ? (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      ) : null}

      <Lightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} />
    </div>
  );
}
