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
} from '@/core/media/client';
import type { ProductImageView } from '@/core/contracts';
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

type Props = {
  /** Edit-mode identifiers. Absent in create mode → "save first" placeholder. */
  slug?: string;
  productId?: string;
  variant: { variantId: string; colorLabel: string; hex: string };
  /** Images for THIS variant. */
  images: MediaAsset[];
  /** Photos of OTHER variants of the same product — recolor sources. */
  siblingImages?: MediaAsset[];
  actions?: MediaActions;
};

/** A generation option offered for one empty slot. */
type GenOption = {
  /** Which recipe to run. */
  kind: 'flat' | 'recolorFlat' | 'recolorLifestyle';
  /** Source asset feeding the recipe. */
  source: MediaAsset;
  /** Button text shown on the slot. */
  label: string;
};

export function VariantPhotos({
  slug,
  productId,
  variant,
  images,
  siblingImages = [],
  actions,
}: Props) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  // The slot a pending file upload targets (role/view to write). Set on tile
  // click, read by onPick. Cleared after the picker fires.
  const pendingSlot = useRef<PhotoSlotKey | null>(null);
  const [error, setError] = useState<string | undefined>();
  const [pending, startTransition] = useTransition();

  // No persisted variantId yet — either create mode (no productId) or a color
  // freshly added to the form but not saved. Either way there's nothing to
  // attach photos to until the product/color is saved.
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
      else router.refresh(); // reflect the change immediately
    });
  }

  /** Open the file picker for a specific slot (writes its role/view). */
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
    e.target.value = ''; // allow re-picking the same file
  }

  const bySlot = assetsBySlot(images);
  const outside = assetsOutsideGrid(images);
  const atMax = images.length >= SOFT_MAX;

  // Sibling assets indexed by (role, view) → first match wins (deterministic by
  // the order they arrive, i.e. variant order). Explicit source picking with
  // thumbnails is step 5.3; here we pick the highest-priority candidate.
  function siblingFor(
    role: 'lifestyle' | 'flat',
    view: ProductImageView,
  ): MediaAsset | undefined {
    return siblingImages.find(
      (i) => (i.role ?? 'lifestyle') === role && i.view === view,
    );
  }

  /**
   * The generation option for an EMPTY slot, or null if no valid source exists.
   * Priority (step 5.2): recipe 1 (own life, same angle) > recolor from a
   * sibling of the right role/angle. The target view is fixed by the slot.
   */
  function genOptionFor(slot: PhotoSlot): GenOption | null {
    if (slot.role === 'flat') {
      // 1) own lifestyle of the same angle → flat (recipe 1).
      const ownLife = bySlot[`life_${slot.view}` as PhotoSlotKey]?.[0];
      if (ownLife) {
        return { kind: 'flat', source: ownLife, label: 'Сделать на белом' };
      }
      // 2) a sibling flat of the same angle → recolor (recipe 2).
      const sibFlat = siblingFor('flat', slot.view);
      if (sibFlat) {
        return {
          kind: 'recolorFlat',
          source: sibFlat,
          label: `Перекрасить из другого цвета`,
        };
      }
      return null;
    }
    // lifestyle slot: only a sibling lifestyle of the same angle → recolor (3).
    const sibLife = siblingFor('lifestyle', slot.view);
    if (sibLife) {
      return {
        kind: 'recolorLifestyle',
        source: sibLife,
        label: `Перекрасить из другого цвета`,
      };
    }
    return null;
  }

  /** Run the chosen generation for a slot. */
  function generate(slot: PhotoSlot, opt: GenOption) {
    const base: GenTarget = {
      sourceId: opt.source.id,
      variantId: variant.variantId,
      view: slot.view,
      slug: slug!,
      productId: productId!,
    };
    if (opt.kind === 'flat') {
      run(() => actions!.generateFlat(base));
    } else if (opt.kind === 'recolorFlat') {
      run(() => actions!.recolorFlat({ ...base, hex: variant.hex }));
    } else {
      run(() => actions!.recolorLifestyle({ ...base, hex: variant.hex }));
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs text-gray-500">
        6 слотов: живое фото и «на белом» для каждого ракурса (спереди / сбоку / сзади).
        В пустом слоте можно загрузить фото или сгенерировать ИИ из подходящего источника.
      </p>

      {/* Single hidden picker, reused by every slot tile. The target slot is
          remembered in pendingSlot before .click(). */}
      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={onPick}
      />

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

          // Empty slot: offer generation (if a source exists) + manual upload.
          const opt = genOptionFor(slot);
          return (
            <div
              key={slot.key}
              className="flex aspect-square flex-col items-center justify-center gap-1.5 rounded-md border border-dashed border-gray-300 p-2 text-center"
            >
              <span className="text-[11px] font-medium text-gray-500">
                {slot.label}
              </span>
              {opt ? (
                <button
                  type="button"
                  disabled={pending || atMax}
                  onClick={() => generate(slot, opt)}
                  title={
                    opt.kind === 'flat'
                      ? 'Сгенерировать студийное фото на белом из живого кадра этого цвета'
                      : 'Перекрасить фото подходящего ракурса из другого цвета'
                  }
                  className="rounded bg-gray-900/85 px-2 py-1 text-[11px] font-medium text-white hover:bg-gray-900 disabled:opacity-50"
                >
                  ✨ {opt.label}
                </button>
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

      {/* Out-of-grid assets: legacy / hand-uploaded photos with no view that
          don't fit a slot. Shown ONLY when present so a clean catalog has no
          clutter. The owner can delete them here. */}
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
