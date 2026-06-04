'use client';

import { useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type { MediaAsset } from '@/core/media/client';
import { Button } from './ui/Button';
import { ConfirmButton } from './ui/ConfirmButton';

const SOFT_MIN = 3;
const SOFT_MAX = 8;

export type MediaActions = {
  upload: (formData: FormData) => Promise<{ error?: string }>;
  remove: (id: string, slug: string) => Promise<{ error?: string }>;
  reorder: (
    items: { id: string; sortOrder: number }[],
    slug: string,
  ) => Promise<{ error?: string }>;
};

type Props = {
  /** Edit-mode identifiers. Absent in create mode → "save first" placeholder. */
  slug?: string;
  productId?: string;
  variant: { variantId: string; colorLabel: string };
  /** Images for THIS variant, already sorted by sortOrder. */
  images: MediaAsset[];
  actions?: MediaActions;
};

export function VariantPhotos({ slug, productId, variant, images, actions }: Props) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
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

  function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.set('file', file);
    fd.set('slug', slug!);
    fd.set('productId', productId!);
    fd.set('variantId', variant.variantId);
    run(() => actions!.upload(fd));
    e.target.value = ''; // allow re-picking the same file
  }

  function move(index: number, dir: -1 | 1) {
    const target = index + dir;
    if (target < 0 || target >= images.length) return;
    // Swap the two, then renumber all sortOrders 0..n.
    const reordered = [...images];
    [reordered[index], reordered[target]] = [reordered[target], reordered[index]];
    const items = reordered.map((img, i) => ({ id: img.id, sortOrder: i }));
    run(() => actions!.reorder(items, slug!));
  }

  const tooFew = images.length < SOFT_MIN;
  const atMax = images.length >= SOFT_MAX;

  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs text-gray-500">
        Рекомендуем 4–6 фото: спереди, сзади, деталь, на модели.
      </p>

      {images.length > 0 ? (
        <ul className="grid grid-cols-3 gap-3 sm:grid-cols-4">
          {images.map((img, i) => (
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
              {i === 0 ? (
                <span className="absolute left-1 top-1 rounded bg-gray-900/80 px-1.5 py-0.5 text-[10px] font-medium text-white">
                  Главное
                </span>
              ) : null}
              <div className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-black/40 px-1 py-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                <div className="flex gap-0.5">
                  <button
                    type="button"
                    disabled={i === 0 || pending}
                    onClick={() => move(i, -1)}
                    className="rounded px-1 text-white disabled:opacity-30"
                    aria-label="Левее"
                  >
                    ←
                  </button>
                  <button
                    type="button"
                    disabled={i === images.length - 1 || pending}
                    onClick={() => move(i, 1)}
                    className="rounded px-1 text-white disabled:opacity-30"
                    aria-label="Правее"
                  >
                    →
                  </button>
                </div>
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
      ) : null}

      {tooFew ? (
        <p className="text-xs text-amber-600">
          Маловато фото (минимум {SOFT_MIN}). Сейчас: {images.length}.
        </p>
      ) : null}

      <div className="flex items-center gap-3">
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={onPick}
        />
        <Button
          type="button"
          variant="secondary"
          disabled={pending || atMax}
          title={atMax ? `Достаточно (макс ${SOFT_MAX})` : undefined}
          onClick={() => fileRef.current?.click()}
        >
          {pending ? 'Загрузка…' : '+ Добавить фото'}
        </Button>
        {/* Generator slot — disabled placeholder for a future feature. */}
        <Button type="button" variant="secondary" disabled title="Скоро">
          ✨ Сгенерировать на белом фоне
        </Button>
        {atMax ? (
          <span className="text-xs text-gray-400">Достаточно (макс {SOFT_MAX})</span>
        ) : null}
      </div>

      {error ? (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
