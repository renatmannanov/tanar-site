# Шаг 4: Размеры / уход / бейдж на витрине

> Зависит от: нет (правит ProductDetail/ProductCard; независим от шагов 1-3).
> Статус: [ ] pending

## Задача

Показать покупателю существующие в БД, но скрытые данные: размеры активного цвета, блок «Уход» (care), бейдж label.badge.

### ProductDetail (`src/components/product/ProductDetail.tsx`) — страница товара
- **Размеры активного цвета:** после блока выбора цвета — список размеров. Брать `const sizes = activeVariant?.skus ?? []` (защита от undefined). Для каждого `sku`: `sku.size` + (если `sku.ruSize`) « / {ruSize}» → «M / 46». Просто перечень (чипы/строка), БЕЗ статуса наличия, БЕЗ кликабельности (Фаза 2/3). Заголовок «Размеры». Если `sizes.length === 0` — секцию не показывать.
  - `activeVariant` уже вычислен в компоненте. `activeVariant.skus` — `Sku[]` (поля size, ruSize?).
- **Бейдж label.badge:** рядом с названием (h1) или ценой — `product.label?.badge` (напр. «GORE-TEX®») как акцентная плашка. Показывать только если `label?.badge` непустой. (label.sub — опционально, можно как подпись; зафиксировано: показываем только badge как плашку, sub не обязателен.)
- **care (уход):** блок «Уход» после specs (или после описания). `product.care` — если непустой, показать заголовок «Уход» + текст (`whitespace-pre-line` если многострочный). Если пусто — не показывать.
- `coming_soon`-ветка (`ProductDetailComingSoon`) — размеры/care/бейдж НЕ обязательны (товар ещё не в продаже); не трогать или добавить бейдж по желанию. Зафиксировано: ComingSoon оставить как есть.

### ProductCard (`src/components/ProductCard.tsx`) — карточка каталога
- Бейдж `product.label?.badge` — уголок на фото (как `coming_soon`-бейдж «Скоро», но другой угол/стиль). Показывать только если `label?.badge` непустой И НЕ `coming_soon` (у coming_soon уже свой бейдж — не накладывать два; зафиксировано: если coming_soon → показываем только «Скоро», иначе → label.badge если есть).

## Тесты
- e2e: страница товара показывает размеры (size), бейдж badge, блок «Уход» (для товара с care). Карточка показывает badge. Шаг 5.
- Существующие витринные e2e не должны сломаться.

## Команды для верификации
```powershell
npm run db:up; npm run db:seed
npm run typecheck
npm run lint
npm run build
npm run dev
# вручную: /catalog/jacket-sv7-goretex → виден бейдж GORE-TEX®, список размеров активного цвета; /catalog → на карточке бейдж
```

## Критерии готовности
- [ ] ProductDetail: список размеров активного цвета (size + ruSize), меняется при смене цвета
- [ ] ProductDetail: бейдж label.badge (если есть), блок «Уход» (если care непустой)
- [ ] ProductCard: бейдж label.badge (если есть и не coming_soon)
- [ ] Боевой товар (jacket-sv7-goretex: badge=GORE-TEX®, есть размеры) — всё видно
- [ ] Витринные e2e не сломаны
- [ ] `npm run typecheck` + `npm run lint` + `npm run build` зелёные
- [ ] Коммит: `feat(catalog): show sizes, care, label badge on storefront`
