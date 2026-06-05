// FAQ content (iteration 1: in-code constant). /faq renders this list (step 4);
// the DB seed (iteration 2) imports it as default rows. Client-safe: plain data.
//
// Scope: text descriptions of conditions only — delivery/payment as ORDER LOGIC
// is Phase 3. Payment phrasing kept neutral by decision (no explicit Kaspi yet).

export type FaqItem = {
  question: string;
  answer: string;
};

export const FAQ_ITEMS: ReadonlyArray<FaqItem> = [
  {
    question: 'Как оформить заказ?',
    answer:
      'Свяжитесь с нами по телефону или в Instagram — поможем подобрать размер и оформить покупку. Корзина на сайте появится позже.',
  },
  {
    question: 'Доставка по Алматы?',
    answer:
      'Бесплатно, курьером, в квадрате Аль-Фараби — Саина — Рыскулова — Достык. Срок уточняется при оформлении.',
  },
  {
    question: 'Доставка по Казахстану?',
    answer:
      'Через Kaspi Магазин до ближайшего постамата. Стоимость — по тарифу службы доставки.',
  },
  {
    question: 'Доставка за пределы Казахстана?',
    answer: 'Оформляется через Ozon, по тарифам и правилам платформы Ozon.',
  },
  {
    question: 'Можно ли забрать самовывозом?',
    answer:
      'Да — ул. Розыбакиева, 205Д, Алматы. Маршрут уточняйте по телефону.',
  },
  {
    question: 'Возврат и обмен?',
    answer:
      'В течение 14 календарных дней с даты получения, если товар не использовался: бирки и этикетки целы, защитная лента не нарушена, упаковка сохранена. Оформление — по телефонам +7 701 744 38 73 или +7 707 722 05 06.',
  },
  {
    question: 'Как оплатить?',
    answer:
      'Способ оплаты уточняйте при оформлении заказа — менеджер подскажет доступные варианты.',
  },
  {
    question: 'Реквизиты бренда?',
    answer: 'ИП СУЛТАНГАЛИЕВА, БИН 770807401605.',
  },
];
