# Шаг 4: Заготовка контракта core/media

> Зависит от: нет (изолированный файл media/index.ts). В Ralph loop выполнять строго в порядке PLAN.md — НЕ переставлять.
> Статус: [ ] pending

## Задача

Заложить **контракт** модуля `core/media` (типы и порты-интерфейсы), который оживёт в Плане C (реальная sharp-загрузка). Сейчас — только публичный API без реализации, чтобы План C добавлял имплементацию, не меняя сигнатуры, и чтобы media-picker в Плане B мог типизироваться.

`src/core/media/index.ts` (сейчас `export {};`):

```ts
import type { MediaScope, ProductImageView, ProductImageModel } from '@/core/contracts';

/** Stored image asset. Mirrors media_assets table (read projection). */
export type MediaAsset = {
  id: string;
  scope: MediaScope;            // 'product' | 'site' | 'blog'
  url: string;
  sortOrder: number;
  productId?: string;
  variantId?: string;
  view?: ProductImageView;
  model?: ProductImageModel | 'flat';
  role?: 'lifestyle' | 'flat';
  key?: string;                 // for site/blog scope
  alt?: string;
};

/** Input for uploading/registering an asset. File handling — phase C. */
export type MediaUploadInput = {
  scope: MediaScope;
  productId?: string;
  variantId?: string;
  key?: string;
  alt?: string;
};

/**
 * Port for media storage. Implementation (sharp pipeline → public/, DB row)
 * lands in Plan C. Defined here so admin media-picker (Plan B) can type against it.
 */
export interface MediaStore {
  list(filter: { scope: MediaScope; productId?: string }): Promise<MediaAsset[]>;
  upload(file: Uint8Array, input: MediaUploadInput): Promise<MediaAsset>;
  remove(id: string): Promise<void>;
}
```

> Никакой реализации `MediaStore` — только интерфейс. Реальный класс + sharp + insert в media_assets — План C.

## Тесты
- Только `typecheck` (типы валидны, импорт contracts через границу ок).

## Команды для верификации

```powershell
npm run typecheck            # типы media компилируются
npm run lint                 # граница: media импортит только @/core/contracts
```

## Критерии готовности

- [ ] `core/media/index.ts` экспортит `MediaAsset`, `MediaUploadInput`, `MediaStore`
- [ ] Нет реализации (только типы/интерфейс)
- [ ] media импортит только из `@/core/contracts` (граница)
- [ ] `npm run typecheck` + `npm run lint` зелёные
- [ ] Коммит: `feat(media): contract skeleton (MediaAsset, MediaStore port) for phases B/C`
