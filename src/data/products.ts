import type { Product } from '@/lib/product';

export const products: Product[] = [
  // ─── Jackets (6) ───────────────────────────────────────────────
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
  },
  {
    slug: 'parka-tengri',
    name: 'Парка Тенгри',
    category: 'jackets',
    price: 179_900,
    currency: 'KZT',
    description:
      'Утеплённая парка для экстремальных холодов. Синтетический утеплитель сохраняет тепло даже во влажных условиях высокогорья.',
    specs: [
      { label: 'Материал', value: 'Pertex Shield 2.5L' },
      { label: 'Утеплитель', value: 'PrimaLoft Gold 200 г/м²' },
      { label: 'Вес', value: '820 г' },
      { label: 'Температурный режим', value: 'до −30°C' },
    ],
    gradient: 'from-stone-600 to-stone-900',
  },
  {
    slug: 'anorak-alatau',
    name: 'Анорак Алатау',
    category: 'jackets',
    price: 89_900,
    currency: 'KZT',
    description:
      'Лёгкий анорак через голову для весенних и осенних треков. Компактно складывается в собственный карман.',
    specs: [
      { label: 'Материал', value: 'Ripstop Nylon 30D' },
      { label: 'Вес', value: '290 г' },
      { label: 'Водостойкость', value: '10 000 мм' },
      { label: 'Капюшон', value: 'Регулируемый' },
    ],
    gradient: 'from-emerald-800 to-stone-900',
  },
  {
    slug: 'windbreaker-turgen',
    name: 'Ветровка Турген',
    category: 'jackets',
    price: 59_900,
    currency: 'KZT',
    description:
      'Ультралёгкая ветровка для пробежек и быстрых выходов. Светоотражающие элементы для безопасности на рассвете и закате.',
    specs: [
      { label: 'Материал', value: 'Pertex Quantum Air' },
      { label: 'Вес', value: '155 г' },
      { label: 'Посадка', value: 'Приталенная' },
    ],
    gradient: 'from-amber-800 to-stone-900',
  },
  {
    slug: 'vest-ile',
    name: 'Жилет Иле',
    category: 'jackets',
    price: 69_900,
    currency: 'KZT',
    description:
      'Утеплённый жилет как промежуточный слой или самостоятельная вещь. Пуховый наполнитель с гидрофобной обработкой.',
    specs: [
      { label: 'Материал', value: 'Ripstop Nylon 20D' },
      { label: 'Утеплитель', value: 'Гусиный пух 700FP' },
      { label: 'Вес', value: '210 г' },
      { label: 'Посадка', value: 'Регулярная' },
    ],
    gradient: 'from-neutral-600 to-slate-900',
  },
  {
    slug: 'insulated-jacket-aktau',
    name: 'Куртка Актау Инсулейтед',
    category: 'jackets',
    price: 129_900,
    currency: 'KZT',
    description:
      'Универсальная утеплённая куртка для города и гор. Эластичные боковые вставки не сковывают движения при активном использовании.',
    specs: [
      { label: 'Материал', value: 'Softshell 3L' },
      { label: 'Утеплитель', value: 'Climashield Apex 133 г/м²' },
      { label: 'Вес', value: '580 г' },
      { label: 'Водостойкость', value: '15 000 мм' },
      { label: 'Посадка', value: 'Регулярная' },
    ],
    gradient: 'from-stone-500 to-emerald-800',
  },

  // ─── Backpacks (5) ─────────────────────────────────────────────
  {
    slug: 'backpack-charyn-40l',
    name: 'Рюкзак Чарын 40L',
    category: 'backpacks',
    price: 79_900,
    currency: 'KZT',
    description:
      'Треккинговый рюкзак для многодневных походов по каньонам. Вентилируемая спинка и боковой доступ к основному отделению.',
    specs: [
      { label: 'Объём', value: '40 л' },
      { label: 'Вес', value: '1 250 г' },
      { label: 'Материал', value: 'Cordura 500D' },
      { label: 'Спинка', value: 'Tension Mesh' },
      { label: 'Дождевой чехол', value: 'В комплекте' },
    ],
    gradient: 'from-emerald-700 to-slate-900',
  },
  {
    slug: 'assault-merke-28l',
    name: 'Штурмовой Мерке 28L',
    category: 'backpacks',
    price: 59_900,
    currency: 'KZT',
    description:
      'Штурмовой рюкзак для однодневных восхождений. Минимум лишнего, максимум функциональности.',
    specs: [
      { label: 'Объём', value: '28 л' },
      { label: 'Вес', value: '780 г' },
      { label: 'Материал', value: 'Nylon 210D Ripstop' },
      { label: 'Крепление ледоруба', value: 'Есть' },
    ],
    gradient: 'from-slate-600 to-stone-800',
  },
  {
    slug: 'city-shymbulak-18l',
    name: 'Городской Шымбулак 18L',
    category: 'backpacks',
    price: 34_900,
    currency: 'KZT',
    description:
      'Компактный городской рюкзак с отделением для ноутбука. Лаконичный дизайн для офиса и прогулок.',
    specs: [
      { label: 'Объём', value: '18 л' },
      { label: 'Вес', value: '520 г' },
      { label: 'Отделение для ноутбука', value: 'До 15.6"' },
      { label: 'Материал', value: 'Recycled Polyester 300D' },
    ],
    gradient: 'from-neutral-700 to-emerald-900',
  },
  {
    slug: 'trekking-kolsai-55l',
    name: 'Треккинговый Кольсай 55L',
    category: 'backpacks',
    price: 99_900,
    currency: 'KZT',
    description:
      'Экспедиционный рюкзак для длительных автономных походов. Регулируемая подвеска подстраивается под любую длину торса.',
    specs: [
      { label: 'Объём', value: '55 л' },
      { label: 'Вес', value: '1 800 г' },
      { label: 'Материал', value: 'Cordura 1000D' },
      { label: 'Подвеска', value: 'Регулируемая по длине торса' },
      { label: 'Дождевой чехол', value: 'В комплекте' },
    ],
    gradient: 'from-stone-600 to-stone-900',
  },
  {
    slug: 'trail-running-burabai-12l',
    name: 'Беговой Бурабай 12L',
    category: 'backpacks',
    price: 29_900,
    currency: 'KZT',
    description:
      'Жилет-рюкзак для трейлраннинга. Плотно прилегает к телу и не раскачивается на спуске.',
    specs: [
      { label: 'Объём', value: '12 л' },
      { label: 'Вес', value: '320 г' },
      { label: 'Материал', value: 'Stretch Mesh' },
      { label: 'Фляги', value: '2 × 500 мл (в комплекте)' },
    ],
    gradient: 'from-amber-700 to-stone-800',
  },

  // ─── Accessories (5) ───────────────────────────────────────────
  {
    slug: 'beanie-burabai',
    name: 'Шапка Бурабай',
    category: 'accessories',
    price: 12_900,
    currency: 'KZT',
    description:
      'Тёплая шапка из мериносовой шерсти для зимних треков. Не колется и отлично отводит влагу.',
    specs: [
      { label: 'Материал', value: 'Merino Wool 100%' },
      { label: 'Вес', value: '65 г' },
      { label: 'Размер', value: 'Универсальный' },
    ],
    gradient: 'from-stone-600 to-stone-900',
  },
  {
    slug: 'gloves-zailiysky',
    name: 'Перчатки Заилийский',
    category: 'accessories',
    price: 18_900,
    currency: 'KZT',
    description:
      'Софтшелл перчатки с сенсорными кончиками пальцев. Надёжный хват и защита от ветра на перевалах.',
    specs: [
      { label: 'Материал', value: 'Softshell + флис' },
      { label: 'Сенсорные пальцы', value: 'Указательный + большой' },
      { label: 'Вес', value: '80 г (пара)' },
    ],
    gradient: 'from-slate-700 to-emerald-900',
  },
  {
    slug: 'buff-kaskelen',
    name: 'Бафф Каскелен',
    category: 'accessories',
    price: 7_900,
    currency: 'KZT',
    description:
      'Многофункциональный бафф из переработанного полиэстера. Носится как шарф, маска или повязка.',
    specs: [
      { label: 'Материал', value: 'Recycled Polyester' },
      { label: 'UPF-защита', value: '50+' },
      { label: 'Вес', value: '35 г' },
    ],
    gradient: 'from-emerald-800 to-stone-900',
  },
  {
    slug: 'belt-kapshagai',
    name: 'Ремень Капшагай',
    category: 'accessories',
    price: 9_900,
    currency: 'KZT',
    description:
      'Лёгкий ремень из нейлоновой стропы с алюминиевой пряжкой. Не звенит на досмотре в аэропорту.',
    specs: [
      { label: 'Материал', value: 'Nylon webbing 38 мм' },
      { label: 'Пряжка', value: 'Алюминий' },
      { label: 'Длина', value: 'Регулируемая до 120 см' },
    ],
    gradient: 'from-amber-800 to-stone-900',
  },
  {
    slug: 'sunglasses-altyn-emel',
    name: 'Очки Алтын-Эмель',
    category: 'accessories',
    price: 24_900,
    currency: 'KZT',
    description:
      'Спортивные солнцезащитные очки с поляризованными линзами. Прочная оправа из гриламида не ломается при изгибе.',
    specs: [
      { label: 'Линзы', value: 'Поляризованные, категория 3' },
      { label: 'Оправа', value: 'Grilamid TR90' },
      { label: 'Вес', value: '28 г' },
      { label: 'UVA/UVB защита', value: '100%' },
    ],
    gradient: 'from-neutral-600 to-slate-900',
  },

  // ─── T-shirts (5) ──────────────────────────────────────────────
  {
    slug: 'tee-logo',
    name: 'Футболка Логотип',
    category: 't-shirts',
    price: 14_900,
    currency: 'KZT',
    description:
      'Базовая футболка с принтом горы Хан Тенгри на груди. Органический хлопок, приятный к телу.',
    specs: [
      { label: 'Материал', value: 'Органический хлопок 180 г/м²' },
      { label: 'Принт', value: 'Шелкография' },
      { label: 'Посадка', value: 'Регулярная' },
    ],
    gradient: 'from-stone-500 to-emerald-800',
  },
  {
    slug: 'tee-khan-tengri',
    name: 'Футболка Хан Тенгри',
    category: 't-shirts',
    price: 16_900,
    currency: 'KZT',
    description:
      'Футболка с панорамой хребта Тенгри-Таг. Технический крой не стесняет движения при активных прогулках.',
    specs: [
      { label: 'Материал', value: 'Cotton/Polyester 60/40' },
      { label: 'Принт', value: 'DTG (прямая печать)' },
      { label: 'Посадка', value: 'Slim fit' },
    ],
    gradient: 'from-slate-600 to-stone-800',
  },
  {
    slug: 'longsleeve-sunrise',
    name: 'Лонгслив Восход',
    category: 't-shirts',
    price: 19_900,
    currency: 'KZT',
    description:
      'Лонгслив с градиентным принтом рассвета в горах. Подходит как для похода, так и для повседневной носки.',
    specs: [
      { label: 'Материал', value: 'Merino Blend 150 г/м²' },
      { label: 'UPF-защита', value: '30+' },
      { label: 'Посадка', value: 'Регулярная' },
    ],
    gradient: 'from-amber-700 to-stone-800',
  },
  {
    slug: 'tee-mountain-contour',
    name: 'Футболка Горный контур',
    category: 't-shirts',
    price: 14_900,
    currency: 'KZT',
    description:
      'Минималистичная футболка с контурной линией горного хребта. Лёгкая и дышащая ткань для жаркого лета.',
    specs: [
      { label: 'Материал', value: 'Хлопок 160 г/м²' },
      { label: 'Принт', value: 'Шелкография' },
      { label: 'Посадка', value: 'Relaxed fit' },
    ],
    gradient: 'from-emerald-700 to-slate-900',
  },
  {
    slug: 'tee-ridge-pocket',
    name: 'Футболка Ридж с карманом',
    category: 't-shirts',
    price: 15_900,
    currency: 'KZT',
    description:
      'Футболка с нагрудным карманом и вышитым логотипом. Плотный хлопок для прохладных вечеров у костра.',
    specs: [
      { label: 'Материал', value: 'Хлопок 200 г/м²' },
      { label: 'Карман', value: 'Нагрудный с вышивкой' },
      { label: 'Посадка', value: 'Регулярная' },
    ],
    gradient: 'from-neutral-700 to-emerald-900',
  },
] satisfies Product[];
