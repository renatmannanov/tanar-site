// Legacy demo catalog — the final resting place of the former
// src/data/products.ts. Used by seed.ts to re-fill the dev DB with sample
// products. Self-contained: its own legacy shape, no dependency on the
// production catalog types (core/catalog). Replaced by the real catalog in a
// separate plan (see task_tracker/backlog/real-catalog-import.md).

type LegacyCategory = 'jackets' | 'hoodies' | 't-shirts' | 'pants' | 'shorts';
type LegacyModel = 'man' | 'girl';
type LegacyMarketplace = 'ozon' | 'kaspi';

type LegacyVariant = {
  id: string;
  label: string;
  hex: string;
  models: LegacyModel[];
  hasFlatShots?: boolean;
};

export type LegacyProduct = {
  slug: string;
  name: string;
  category: LegacyCategory;
  price: number;
  currency: 'KZT';
  description: string;
  specs: { label: string; value: string }[];
  gradient?: string;
  comingSoon?: boolean;
  variants?: LegacyVariant[];
  marketplaces?: Partial<Record<LegacyMarketplace, string>>;
};

export const products: LegacyProduct[] = [
  // ─── Jackets ───────────────────────────────────────────────────
  {
    slug: 'shell-jacket-khan',
    name: 'Куртка Хан Шелл',
    category: 'jackets',
    price: 149_900,
    currency: 'KZT',
    description:
      'Трёхслойная штормовая куртка для высотных восхождений. Проклеенные швы и минималистичный крой обеспечивают надёжную защиту от ветра и осадков.',
    specs: [
      { label: 'Материал', value: 'Gore-Tex Pro 3L' },
      { label: 'Вес', value: '460 г' },
      { label: 'Водостойкость', value: '28 000 мм' },
      { label: 'Паропроницаемость', value: '25 000 г/м²/24ч' },
      { label: 'Посадка', value: 'Регулярная' },
    ],
    gradient: 'from-slate-700 to-emerald-900',
    variants: [
      { id: 'darkblue', label: 'Тёмно-синий', hex: '#1e3a5f', models: ['girl'], hasFlatShots: true },
      { id: 'white', label: 'Белый', hex: '#f5f5f0', models: ['girl'] },
      { id: 'red', label: 'Красный', hex: '#a8332a', models: ['man'], hasFlatShots: true },
      { id: 'yellow', label: 'Жёлтый', hex: '#d4a73a', models: ['girl'] },
    ],
    // TODO: заменить на реальные ссылки от заказчицы
    marketplaces: {
      ozon: 'https://www.ozon.ru/',
      kaspi: 'https://kaspi.kz/shop/',
    },
  },
  {
    slug: 'light-jacket-tengri',
    name: 'Парка Тенгри',
    category: 'jackets',
    price: 179_900,
    currency: 'KZT',
    description:
      'Лёгкая ветровка-парка для межсезонья. Защищает от ветра и моросящего дождя, не сковывает движения, легко складывается в собственный карман.',
    specs: [
      { label: 'Материал', value: 'Pertex Quantum' },
      { label: 'Вес', value: '300 г' },
      { label: 'Водостойкость', value: '10 000 мм' },
      { label: 'Посадка', value: 'Регулярная' },
    ],
    gradient: 'from-stone-600 to-stone-900',
    variants: [
      { id: 'orange', label: 'Оранжевый', hex: '#d2691e', models: ['girl', 'man'] },
      { id: 'white', label: 'Белый', hex: '#f5f5f0', models: ['man'] },
    ],
  },

  // ─── Hoodies ───────────────────────────────────────────────────
  {
    slug: 'hoodie-alatau',
    name: 'Худи Алатау',
    category: 'hoodies',
    price: 24_900,
    currency: 'KZT',
    description:
      'Базовое унисекс-худи из плотного хлопка. Свободный крой, мягкая внутренняя начёска, капюшон на шнурке.',
    specs: [
      { label: 'Материал', value: 'Хлопок 320 г/м²' },
      { label: 'Посадка', value: 'Свободная унисекс' },
      { label: 'Капюшон', value: 'На шнурке' },
    ],
    gradient: 'from-emerald-800 to-stone-900',
    variants: [
      { id: 'green', label: 'Зелёный', hex: '#3a5a40', models: ['man', 'girl'] },
      { id: 'darkgrey', label: 'Тёмно-серый', hex: '#3d3d3d', models: ['man'] },
      { id: 'lightgrey', label: 'Светло-серый', hex: '#bdbdb5', models: ['girl'] },
    ],
  },
  {
    slug: 'hoodie-turgen',
    name: 'Худи Турген',
    category: 'hoodies',
    price: 26_900,
    currency: 'KZT',
    description:
      'Худи с приталенным кроем и двойным капюшоном. Мягкая внутренняя начёска, удлинённая спинка.',
    specs: [
      { label: 'Материал', value: 'Хлопок 280 г/м²' },
      { label: 'Посадка', value: 'Полуприталенная' },
      { label: 'Капюшон', value: 'Двойной' },
    ],
    gradient: 'from-rose-800 to-stone-900',
    variants: [
      { id: 'lightpink', label: 'Розовый', hex: '#e8b4b8', models: ['girl'] },
      { id: 'red', label: 'Красный', hex: '#a8332a', models: ['girl'] },
    ],
  },

  // ─── T-shirts ──────────────────────────────────────────────────
  {
    slug: 'tshirt-tanar',
    name: 'Футболка Танар',
    category: 't-shirts',
    price: 12_900,
    currency: 'KZT',
    description:
      'Базовая футболка с фирменным минималистичным принтом. Органический хлопок, шелкография, регулярная посадка.',
    specs: [
      { label: 'Материал', value: 'Органический хлопок 180 г/м²' },
      { label: 'Принт', value: 'Шелкография' },
      { label: 'Посадка', value: 'Регулярная' },
    ],
    gradient: 'from-stone-500 to-emerald-800',
    variants: [
      { id: 'blue', label: 'Синий', hex: '#4a6c8a', models: ['girl'] },
      { id: 'pink', label: 'Розовый', hex: '#d8a0a4', models: ['girl'] },
    ],
  },

  // ─── Pants (coming soon) ───────────────────────────────────────
  {
    slug: 'pants-charyn',
    name: 'Штаны Чарын',
    category: 'pants',
    price: 0,
    currency: 'KZT',
    description: 'Треккинговые штаны для многодневных походов. Скоро в продаже.',
    specs: [],
    gradient: 'from-emerald-700 to-slate-900',
    comingSoon: true,
  },
  {
    slug: 'pants-altyn-emel',
    name: 'Штаны Алтын-Эмель',
    category: 'pants',
    price: 0,
    currency: 'KZT',
    description: 'Лёгкие штаны для тёплого сезона. Скоро в продаже.',
    specs: [],
    gradient: 'from-amber-700 to-stone-800',
    comingSoon: true,
  },
  {
    slug: 'pants-kolsai',
    name: 'Штаны Кольсай',
    category: 'pants',
    price: 0,
    currency: 'KZT',
    description: 'Утеплённые штаны для холодных горных переходов. Скоро в продаже.',
    specs: [],
    gradient: 'from-stone-600 to-stone-900',
    comingSoon: true,
  },

  // ─── Shorts (coming soon) ──────────────────────────────────────
  {
    slug: 'shorts-burabai',
    name: 'Шорты Бурабай',
    category: 'shorts',
    price: 0,
    currency: 'KZT',
    description: 'Беговые шорты для трейлов. Скоро в продаже.',
    specs: [],
    gradient: 'from-amber-800 to-stone-900',
    comingSoon: true,
  },
  {
    slug: 'shorts-kaskelen',
    name: 'Шорты Каскелен',
    category: 'shorts',
    price: 0,
    currency: 'KZT',
    description: 'Многофункциональные шорты для походов и города. Скоро в продаже.',
    specs: [],
    gradient: 'from-emerald-800 to-stone-900',
    comingSoon: true,
  },
];
