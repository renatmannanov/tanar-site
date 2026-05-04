# Step 4: Перепись src/data/products.ts под реальный каталог

> Статус: pending

## Цель

Полностью переписать `src/data/products.ts`. Удалить рюкзаки и аксессуары, добавить 7 реальных товаров (с цветовыми вариантами) и 5 заглушек "Скоро".

## Действия

Файл должен содержать ровно 12 продуктов в следующем порядке:

### Реальные (7 шт, с фотками)

#### 1. Куртка Хан Шелл
- slug: `shell-jacket-khan`
- category: `jackets`
- price: 149_900
- description: текущий ("Трёхслойная штормовая куртка для высотных восхождений…")
- specs: текущие (Gore-Tex Pro 3L и т.д.)
- gradient: `from-slate-700 to-emerald-900`
- variants:
  - `{ id: 'darkblue', label: 'Тёмно-синий', hex: '#1e3a5f', models: ['girl'] }` ← дефолтный
  - `{ id: 'white', label: 'Белый', hex: '#f5f5f0', models: ['girl'] }`
  - `{ id: 'red', label: 'Красный', hex: '#a8332a', models: ['man'] }`
  - `{ id: 'yellow', label: 'Жёлтый', hex: '#d4a73a', models: ['girl'] }`

#### 2. Парка Тенгри
- slug: `light-jacket-tengri`
- category: `jackets`
- price: 179_900
- description: переписать под "лёгкая парка/ветровка для межсезонья" (исходный текст про утеплённую парку — не подходит, это лёгкая модель)
- specs: подобрать под лёгкую парку (Pertex Quantum, вес ~300г, водостойкость ~10к)
- gradient: `from-stone-600 to-stone-900`
- variants:
  - `{ id: 'orange', label: 'Оранжевый', hex: '#d2691e', models: ['girl', 'man'] }` ← дефолтный, есть и м, и ж
  - `{ id: 'white', label: 'Белый', hex: '#f5f5f0', models: ['man'] }`

#### 3. Худи Алатау
- slug: `hoodie-alatau`
- category: `hoodies`
- price: 24_900
- description: придумать ("базовое унисекс-худи из плотного хлопка…")
- specs:
  - Материал: Хлопок 320 г/м²
  - Посадка: Свободная унисекс
  - Капюшон: На шнурке
- gradient: `from-emerald-800 to-stone-900`
- variants:
  - `{ id: 'green', label: 'Зелёный', hex: '#3a5a40', models: ['man', 'girl'] }` ← дефолтный
  - `{ id: 'darkgrey', label: 'Тёмно-серый', hex: '#3d3d3d', models: ['man'] }`
  - `{ id: 'lightgrey', label: 'Светло-серый', hex: '#bdbdb5', models: ['girl'] }`

#### 4. Худи Турген
- slug: `hoodie-turgen`
- category: `hoodies`
- price: 26_900
- description: придумать ("худи в женских цветах с приталенным кроем…")
- specs:
  - Материал: Хлопок 280 г/м²
  - Посадка: Полуприталенная
  - Капюшон: Двойной
- gradient: `from-rose-800 to-stone-900`
- variants:
  - `{ id: 'lightpink', label: 'Розовый', hex: '#e8b4b8', models: ['girl'] }` ← дефолтный
  - `{ id: 'red', label: 'Красный', hex: '#a8332a', models: ['girl'] }`

#### 5. Футболка Танар
- slug: `tshirt-tanar`
- category: `t-shirts`
- price: 12_900
- description: придумать ("базовая футболка с фирменным минималистичным принтом…")
- specs:
  - Материал: Органический хлопок 180 г/м²
  - Принт: Шелкография
  - Посадка: Регулярная
- gradient: `from-stone-500 to-emerald-800`
- variants:
  - `{ id: 'blue', label: 'Синий', hex: '#4a6c8a', models: ['girl'] }` ← дефолтный
  - `{ id: 'pink', label: 'Розовый', hex: '#d8a0a4', models: ['girl'] }`

### Заглушки "Скоро" (5 шт, comingSoon: true, без variants)

Переиспользуем gradient'ы и часть текстов от удалённых рюкзаков и аксессуаров.

#### 6. Штаны Чарын
- slug: `pants-charyn`
- category: `pants`
- price: 0 (показываем "Скоро в продаже" вместо цены)
- description: "Треккинговые штаны для многодневных походов. Скоро в продаже."
- specs: []
- gradient: `from-emerald-700 to-slate-900`
- comingSoon: true

#### 7. Штаны Алтын-Эмель
- slug: `pants-altyn-emel`
- category: `pants`
- price: 0
- description: "Лёгкие штаны для тёплого сезона. Скоро в продаже."
- specs: []
- gradient: `from-amber-700 to-stone-800`
- comingSoon: true

#### 8. Штаны Кольсай
- slug: `pants-kolsai`
- category: `pants`
- price: 0
- description: "Утеплённые штаны для холодных горных переходов. Скоро в продаже."
- specs: []
- gradient: `from-stone-600 to-stone-900`
- comingSoon: true

#### 9. Шорты Бурабай
- slug: `shorts-burabai`
- category: `shorts`
- price: 0
- description: "Беговые шорты для трейлов. Скоро в продаже."
- specs: []
- gradient: `from-amber-800 to-stone-900`
- comingSoon: true

#### 10. Шорты Каскелен
- slug: `shorts-kaskelen`
- category: `shorts`
- price: 0
- description: "Многофункциональные шорты для походов и города. Скоро в продаже."
- specs: []
- gradient: `from-emerald-800 to-stone-900`
- comingSoon: true

## Дополнительно: обновить Footer

`src/components/Footer.tsx` содержит хардкод ссылок на удалённые категории:

```ts
{ label: 'Рюкзаки', href: '/catalog?category=backpacks' },
{ label: 'Аксессуары', href: '/catalog?category=accessories' },
```

Заменить на новые категории:
```ts
{ label: 'Куртки', href: '/catalog?category=jackets' },
{ label: 'Худи', href: '/catalog?category=hoodies' },
{ label: 'Футболки', href: '/catalog?category=t-shirts' },
{ label: 'Штаны', href: '/catalog?category=pants' },
{ label: 'Шорты', href: '/catalog?category=shorts' },
```

Точное количество и какие именно категории показывать в футере — на твой вкус. Главное чтобы не было ссылок на `backpacks` / `accessories`.

## Критерии готовности

- [ ] `src/data/products.ts` содержит ровно 12 продуктов
- [ ] У 5 реальных товаров заполнен массив `variants` с минимум 1 элементом каждый, и для каждого варианта `models` непустой
- [ ] У 5 заглушек установлен `comingSoon: true` и `variants` отсутствует/пустой
- [ ] Все slug'и уникальны
- [ ] Все товары используют только новые категории: `jackets / hoodies / t-shirts / pants / shorts`
- [ ] `npm run typecheck` — exit 0
- [ ] `npm run lint` — exit 0
- [ ] `npm run images:check` — exit 0 (для всех variants × models есть файлы на диске)
- [ ] `src/components/Footer.tsx` не содержит ссылок на `backpacks` или `accessories`
- [ ] `grep -rn "backpacks\|accessories" src/ public/` — пусто (или только закомментировано)

## Verification

```bash
npm run typecheck
npm run lint
npm run images:check
node -e "import('./src/data/products.ts').then(m => console.log(m.products.length))" 2>&1 || \
  grep -c "slug:" src/data/products.ts
```

## Что НЕ делать

- НЕ менять структуру `Product` тип здесь (это step_2)
- НЕ удалять `gradient` у реальных товаров — пусть остаётся как фоллбек
- НЕ изобретать новые category id — только те, что добавлены в step_2
