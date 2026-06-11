# Шаг 3: Табы «Товар» / «Маркетплейсы» в ProductForm

> Зависит от: шаг 1 (sku.marketplaces в ProductInput)
> Статус: [ ] pending

## Задача

Все правки — `src/components/admin/ProductForm.tsx` ('use client') + e2e.

### 1. Табы

- Состояние: `const [tab, setTab] = useState<'product' | 'marketplaces'>('product')`.
- Сразу под открывающим `<form>` — переключатель (кнопки `type="button"`,
  иначе клик сабмитит форму):
  ```tsx
  <div role="tablist" className="flex gap-1 border-b border-gray-200">
    <button type="button" role="tab" aria-selected={tab === 'product'}
      data-testid="tab-product" onClick={() => setTab('product')}
      className={...активный: border-b-2 border-gray-900 font-medium...}>Товар</button>
    <button type="button" role="tab" aria-selected={tab === 'marketplaces'}
      data-testid="tab-marketplaces" onClick={() => setTab('marketplaces')}
      className={...}>Маркетплейсы</button>
  </div>
  ```
- Панели: ВСЁ текущее содержимое формы (кроме футера с кнопками и `error`)
  обернуть в `<div hidden={tab !== 'product'}>`; новая панель —
  `<div hidden={tab !== 'marketplaces'}>`. Именно `hidden`-атрибут, НЕ
  conditional render и НЕ display-классы — инпуты остаются в DOM, state и
  скролл не теряются. Футер (Сохранить/Отмена/Удалить) и `error` — вне
  панелей, видны на обоих табах.
- Табы есть в обоих режимах (create/edit).

### 2. Перенос продуктовых полей

Секцию «Ссылка Kaspi / Ссылка Ozon» (`mp-kaspi`/`mp-ozon`, testid сохранить)
ПЕРЕНЕСТИ из панели «Товар» в начало панели «Маркетплейсы» с подписью-хелпером:
«Запасные ссылки товара — показываются, пока размер не выбран». `patchMarketplace`
не меняется.

### 3. Таблица SKU-ссылок

В панели «Маркетплейсы», под продуктовыми полями — по блоку на цвет
(заголовок `{v.colorLabel || v.colorId}`), внутри таблица:

| Размер (текст, `size / ruSize`) | Артикул (текст) | Ozon (Input) | Kaspi (Input) |

- Инпуты: `type="url"`, placeholder `https://…`,
  `data-testid="sku-mp-ozon"` / `data-testid="sku-mp-kaspi"` (повторяются —
  e2e адресует строку через `filter({ hasText: артикул })` по `<tr>`).
- Хелпер состояния (зеркало `patchMarketplace`, пустая строка удаляет ключ,
  пустая мапа → undefined):
  ```ts
  function patchSkuMarketplace(vi: number, si: number, key: 'kaspi' | 'ozon', value: string) {
    setForm((f) => ({ ...f, variants: f.variants.map((v, i) =>
      i === vi ? { ...v, skus: v.skus.map((s, j) => {
        if (j !== si) return s;
        const next = { ...s.marketplaces };
        if (value.trim() === '') delete next[key];
        else next[key] = value;
        return { ...s, marketplaces: Object.keys(next).length ? next : undefined };
      }) } : v,
    ) }));
  }
  ```
- Размер/артикул в таблице — read-only текст из form state (редактируются на
  табе «Товар»); SKU без артикула показывает «—».

### 4. e2e (`e2e/admin-marketplaces.spec.ts`)

- Существующие 3 теста: перед `fill(mp-kaspi/mp-ozon)` и перед проверкой
  значения добавить `await page.getByTestId('tab-marketplaces').click()`.
  Витринные ассерты не меняются (размер не выбран → продуктовая ссылка).
- Новый serial-блок «per-sku links» на sv7 (afterAll-db:seed уже восстанавливает
  каталог):
  1. Поведение табов: открыть edit → панель «Товар» видна, `sku-mp-ozon`
     отсутствует (hidden) → клик `tab-marketplaces` → таблица видна, поле
     `#name` НЕ видно → ввести ссылку в строку TANAR-001 → клик `tab-product`
     → клик `tab-marketplaces` → введённое значение на месте (state пережил
     переключение).
  2. Сохранение: ввести `https://kaspi.kz/shop/p/sku-test-001` в Kaspi строки
     TANAR-001 → Сохранить → reopen edit → таб → значение в инпуте.
     (Витринную подмену href проверяет шаг 4.)
  3. **Регрессия (тихое затирание, ревью #1):** после теста 2 reopen edit →
     НЕ заходя на таб «Маркетплейсы» поменять любое поле таба «Товар» (напр.
     описание) → Сохранить → reopen → таб «Маркетплейсы» → sku-ссылка
     TANAR-001 на месте (mapper передал sku.marketplaces, upsert не затёр).

> **Существующие URL-константы спека (`OZON_URL = 'https://www.ozon.ru/...'`)
> НЕ менять** — продуктовый уровень не валидируется по префиксу, «конфликт»
> с ozon.kz мнимый.

## Тесты

Поведенческие e2e выше (клик по табам — обязателен, компонент 'use client').
Могут сломаться: admin.spec `edit -> save persists` (форма обёрнута в панели —
поля `#name` остаются на табе «Товар», который активен по умолчанию: НЕ должен
сломаться); admin-crud-media (работает с полями таба «Товар» и фото — фото
остаются в панели «Товар»): прогнать оба.

## Команды для верификации

```bash
npm run typecheck && npm run lint && npm run build
npx playwright test e2e/admin-marketplaces.spec.ts e2e/admin.spec.ts e2e/admin-crud-media.spec.ts
npm run test:e2e
```

## Критерии готовности

- [ ] Таб переключается кликом; продуктовые поля ссылок — на табе «Маркетплейсы»
- [ ] Введённая sku-ссылка переживает переключение табов (e2e)
- [ ] Сохранение пишет sku.marketplaces в БД; reopen показывает значение (e2e)
- [ ] Существующие admin-спеки зелёные с минимальной правкой (только клики по табу)
- [ ] typecheck, lint, build, test:e2e — exit 0
