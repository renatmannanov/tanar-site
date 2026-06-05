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

const SOFT_MAX = 8;

/** Where a generated photo lands. view = the TARGET slot's angle (fix for the
 *  back-flat logo bug). Matches GenTarget in media-actions. */
type GenTarget = {
  sourceId: string;
  variantId: string;
  view: ProductImageView;
  slug: string;
  productId: string;
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
  generateFlat: (target: GenTarget) => Promise<{ error?: string }>;
  recolorFlat: (
    target: GenTarget & { hex: string },
  ) => Promise<{ error?: string }>;
  recolorLifestyle: (
    target: GenTarget & { hex: string },
  ) => Promise<{ error?: string }>;
};

/** Another color of the same product — a source pool for recolor. */
export type SiblingVariant = {
  variantId: string;
  colorLabel: string;
  hex: string;
  images: MediaAsset[];
};

type Props = {
  /** Edit-mode identifiers. Absent in create mode → "save first" placeholder. */
  slug?: string;
  productId?: string;
  variant: { variantId: string; colorLabel: string; hex: string };
  /** Images for THIS variant. */
  images: MediaAsset[];
  /** Other colors of this product — recolor sources (with color metadata). */
  siblings?: SiblingVariant[];
  actions?: MediaActions;
};

/**
 * A generation candidate for one empty slot: the recipe, the source photo, and
 * (for recolor) which sibling color it comes from. Rendered with a thumbnail so
 * the owner sees what they're generating from.
 */
type Candidate = {
  kind: 'flat' | 'recolorFlat' | 'recolorLifestyle';
  source: MediaAsset;
  /** Short button/row label. */
  label: string;
  /** Source color label (for recolor candidates), e.g. "Синий". */
  fromLabel?: string;
  /** Sort key: lower = preferred (recipe 1 first, then nearest hex). */
  rank: number;
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
  // The slot a pending file upload targets (role/view to write).
  const pendingSlot = useRef<PhotoSlotKey | null>(null);
  // Which empty slot has its candidate popover open (null = none).
  const [openSlot, setOpenSlot] = useState<PhotoSlotKey | null>(null);
  const [error, setError] = useState<string | undefined>();
  const [pending, startTransition] = useTransition();

  // No persisted variantId yet — either create mode (no productId) or a color
  // freshly added to the form but not saved.
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

  /** Sibling photo of the given role+view, paired with its color, if any. */
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

  /**
   * All generation candidates for an EMPTY slot, sorted by preference:
   *   1. recipe 1 (own life of the same angle) — rank 0,
   *   2. recolor from a sibling of the same role+angle — ranked by hex distance
   *      to this variant's color (nearest first; closer recolors glitch less).
   * Single candidate is still returned (shown, not auto-run). Empty → [].
   */
  function candidatesFor(slot: PhotoSlot): Candidate[] {
    const list: Candidate[] = [];
    if (slot.role === 'flat') {
      const ownLife = bySlot[`life_${slot.view}` as PhotoSlotKey]?.[0];
      if (ownLife) {
        list.push({
          kind: 'flat',
          source: ownLife,
          label: 'Сделать на белом',
          rank: 0,
        });
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

  /** Run a chosen candidate for a slot. */
  function generate(slot: PhotoSlot, c: Candidate) {
    setOpenSlot(null);
    const base: GenTarget = {
      sourceId: c.source.id,
      variantId: variant.variantId,
      view: slot.view,
      slug: slug!,
      productId: productId!,
    };
    if (c.kind === 'flat') {
      run(() => actions!.generateFlat(base));
    } else if (c.kind === 'recolorFlat') {
      run(() => actions!.recolorFlat({ ...base, hex: variant.hex }));
    } else {
      run(() => actions!.recolorLifestyle({ ...base, hex: variant.hex }));
    }
  }

  // ── Batch "make all flats": for every life_<view> whose paired flat_<view> is
  // empty, generate a flat (recipe 1). Sequential (cost / rate limits). Approval
  // per result is step 6. Shown only when there's at least one such pair.
  const flatableViews = PHOTO_SLOTS.filter(
    (s) => s.role === 'flat' && bySlot[`life_${s.view}` as PhotoSlotKey]?.[0] && !bySlot[s.key][0],
  );
  function makeAllFlats() {
    setOpenSlot(null);
    setError(undefined);
    startTransition(async () => {
      for (const slot of flatableViews) {
        const life = bySlot[`life_${slot.view}` as PhotoSlotKey][0];
        const res = await actions!.generateFlat({
          sourceId: life.id,
          variantId: variant.variantId,
          view: slot.view,
          slug: slug!,
          productId: productId!,
        });
        if (res?.error) {
          setError(res.error);
          break;
        }
      }
      router.refresh();
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
        <Button
          type="button"
          variant="secondary"
          disabled={pending || atMax}
          className="self-start"
          title="Сгенерировать «на белом» для всех ракурсов, где есть живое фото и пустой слот"
          onClick={makeAllFlats}
        >
          ✨ Сделать все на белом ({flatableViews.length})
        </Button>
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
                  <div className="aspect-square w-full bg-gray-100">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={asset.url}
                      alt={asset.alt ?? ''}
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <span className="absolute left-1 top-1 rounded bg-gray-900/80 px-1.5 py-0.5 text-[10px] font-medium text-white">
                    {slot.label}
                  </span>
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

          // Empty slot: candidate picker (popover) + manual upload.
          const candidates = candidatesFor(slot);
          const isOpen = openSlot === slot.key;
          return (
            <div
              key={slot.key}
              className="relative flex aspect-square flex-col items-center justify-center gap-1.5 rounded-md border border-dashed border-gray-300 p-2 text-center"
            >
              <span className="text-[11px] font-medium text-gray-500">
                {slot.label}
              </span>

              {candidates.length > 0 ? (
                <div className="relative">
                  <button
                    type="button"
                    disabled={pending || atMax}
                    onClick={() => setOpenSlot(isOpen ? null : slot.key)}
                    className="rounded bg-gray-900/85 px-2 py-1 text-[11px] font-medium text-white hover:bg-gray-900 disabled:opacity-50"
                  >
                    ✨ Сгенерировать ▾
                  </button>

                  {/* Candidate popover, absolute right under the button: every
                      valid source with a thumbnail, sorted (recipe 1, then
                      recolor nearest-hex). The owner sees what they generate
                      from instead of a silent first-match. */}
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
                                <img
                                  src={c.source.url}
                                  alt=""
                                  className="h-full w-full object-cover"
                                />
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
                disabled={pending || atMax}
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

      {/* Out-of-grid assets: legacy / hand-uploaded photos with no view. Shown
          only when present so a clean catalog has no clutter. */}
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
                  <img
                    src={img.url}
                    alt={img.alt ?? ''}
                    className="h-full w-full object-cover"
                  />
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
    </div>
  );
}
