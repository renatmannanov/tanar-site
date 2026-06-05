'use client';

import { useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  type MediaAsset,
  type PhotoSlotKey,
  PHOTO_SLOTS,
  assetsBySlot,
  assetsOutsideGrid,
} from '@/core/media/client';
import { Button } from './ui/Button';
import { ConfirmButton } from './ui/ConfirmButton';

const SOFT_MAX = 8;

/** Target identifying where a generated photo lands (matches media-actions). */
type GenTarget = {
  sourceId: string;
  variantId: string;
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
  /** Images for THIS variant, already sorted by sortOrder. */
  images: MediaAsset[];
  /** Photos of OTHER variants of the same product — recolor sources. */
  siblingImages?: MediaAsset[];
  actions?: MediaActions;
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

  // ── AI generation sources (step 5: first valid source; slot-bound source +
  // preview/approve come in steps 5.2/6) ──────────────────────────────────────
  const flatSource = images.find((i) => (i.role ?? 'lifestyle') === 'lifestyle');
  const recolorFlatSource = siblingImages.find((i) => i.role === 'flat');
  const recolorLifestyleSource = siblingImages.find(
    (i) => (i.role ?? 'lifestyle') === 'lifestyle',
  );
  const target: GenTarget = {
    sourceId: '', // filled per-action below
    variantId: variant.variantId,
    slug: slug!,
    productId: productId!,
  };

  function genFlat() {
    if (!flatSource) return;
    run(() => actions!.generateFlat({ ...target, sourceId: flatSource.id }));
  }
  function genRecolorFlat() {
    if (!recolorFlatSource) return;
    run(() =>
      actions!.recolorFlat({
        ...target,
        sourceId: recolorFlatSource.id,
        hex: variant.hex,
      }),
    );
  }
  function genRecolorLifestyle() {
    if (!recolorLifestyleSource) return;
    run(() =>
      actions!.recolorLifestyle({
        ...target,
        sourceId: recolorLifestyleSource.id,
        hex: variant.hex,
      }),
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs text-gray-500">
        6 слотов: живое фото и «на белом» для каждого ракурса (спереди / сбоку / сзади).
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
          // Empty slot: an "+ upload" tile. Generation buttons bind to slots in
          // step 5.2; for now this only uploads into the slot's role/view.
          return (
            <button
              key={slot.key}
              type="button"
              disabled={pending || atMax}
              onClick={() => pickInto(slot.key)}
              title={atMax ? `Достаточно (макс ${SOFT_MAX})` : `Загрузить: ${slot.label}`}
              className="flex aspect-square flex-col items-center justify-center gap-1 rounded-md border border-dashed border-gray-300 p-2 text-center text-[11px] text-gray-400 hover:border-gray-400 hover:text-gray-600 disabled:opacity-50"
            >
              <span className="text-lg leading-none">+</span>
              <span>{slot.label}</span>
            </button>
          );
        })}
      </div>

      {/* Out-of-grid assets: legacy / hand-uploaded photos with no view that
          don't fit a slot. Shown ONLY when present so a clean catalog has no
          clutter. The owner can delete or (later) assign them a slot. */}
      {outside.length > 0 ? (
        <div className="flex flex-col gap-2 rounded-md border border-amber-200 bg-amber-50/50 p-3">
          <p className="text-xs text-amber-700">
            Фото без ракурса (вне сетки) — назначьте ракурс или удалите:
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

      {/* AI generation — each button appears only when a valid source exists.
          flat uses this color's lifestyle shot; recolor-* pull a source from
          another color and tint to this color's hex. Slot-bound generation and
          preview/approve come in steps 5.2/6. */}
      {flatSource || recolorFlatSource || recolorLifestyleSource ? (
        <div className="flex flex-col gap-2 rounded-md border border-dashed border-gray-200 p-3">
          <p className="text-xs text-gray-500">
            ✨ Генерация фото ИИ. Результат добавится в галерею — проверьте глазами.
          </p>
          <div className="flex flex-wrap items-center gap-2">
            {flatSource ? (
              <Button
                type="button"
                variant="secondary"
                disabled={pending || atMax}
                title="Сделать студийное фото на белом фоне из живого кадра этого цвета"
                onClick={genFlat}
              >
                Сделать на белом
              </Button>
            ) : null}
            {recolorFlatSource ? (
              <Button
                type="button"
                variant="secondary"
                disabled={pending || atMax}
                title="Перекрасить готовое фото на белом из другого цвета в этот"
                onClick={genRecolorFlat}
              >
                Перекрасить фото на белом
              </Button>
            ) : null}
            {recolorLifestyleSource ? (
              <Button
                type="button"
                variant="secondary"
                disabled={pending || atMax}
                title="Перекрасить живой кадр из другого цвета в этот"
                onClick={genRecolorLifestyle}
              >
                Перекрасить живое фото
              </Button>
            ) : null}
          </div>
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
