# Шаг 8: Поля Kaspi/Ozon в форме товара (админка)

> Зависит от: нет (витринный рендер `MarketplaceLinks` и write-контракт уже существуют)
> Статус: [x] done

## Задача

Вся цепочка, кроме UI формы, уже готова: схема (`products.marketplaces` jsonb),
тип (`Product.marketplaces`), zod в `repository.ts:303`, маппер
(`product-mapper.ts: cleanMarketplaces` — выбрасывает пустые строки), витрина
(`MarketplaceLinks` в `ProductDetail`). Добавить ТОЛЬКО поля в
`src/components/admin/ProductForm.tsx`:

- Блок «Маркетплейсы» (после блока цены/статуса, до вариантов): два `<Input>` —
  «Ссылка Kaspi» (`data-testid="mp-kaspi"`), «Ссылка Ozon» (`data-testid="mp-ozon"`),
  placeholder `https://…`, `type="url"`.
- Биндинг: `form.marketplaces?.kaspi ?? ''` / `...ozon`; onChange →
  `patch({ marketplaces: { ...form.marketplaces, kaspi: value } })`.
  Пустые строки чистит существующий `cleanMarketplaces` — в форме только trim.
- `EMPTY_INPUT` не менять (`marketplaces` optional).

## Тесты

Новый отдельный спек `e2e/admin-marketplaces.spec.ts` (паттерн логина и
редактирования товара — скопировать из `admin-crud-media.spec.ts`; в сам
`admin-crud-media.spec.ts` НЕ дописывать):

- Открыть товар на edit → вставить `https://kaspi.kz/shop/p/test-123` в поле Kaspi →
  сохранить → на витринной карточке товара есть ссылка «Kaspi» с этим href
  (existing разметка `MarketplaceLinks`: текст из `MARKETPLACE_LABELS`).
- Очистить поле → сохранить → кнопки «Kaspi» на карточке нет.
- Поле Ozon — аналогично одним кейсом (заполнить → кнопка «Ozon» есть).

## Команды для верификации

```bash
npm run typecheck && npm run lint && npm run build
npx playwright test e2e/admin-marketplaces.spec.ts
npm run test:e2e
```

## Критерии готовности

- [ ] Ссылка, заполненная в админке, даёт кнопку на карточке; очищенная — убирает (e2e)
- [ ] География из шага 4 показывает сегмент «Казахстан — Kaspi» только при ссылке
      (покрыто ассертом в этом же e2e)
- [ ] typecheck, lint, build, test:e2e — exit 0
