import { SITE_CONTACTS } from '@/lib/site-contacts';

export const metadata = {
  title: 'Контакты — Tanar',
  description: 'Свяжитесь с Tanar: телефоны, Instagram, адрес магазина и самовывоз в Алматы.',
};

export default function ContactsPage() {
  const { phones, instagram, city, address, pickup } = SITE_CONTACTS;

  return (
    <section className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
      <h1 className="font-display text-4xl font-bold tracking-tight text-stone-900 sm:text-5xl">
        Контакты
      </h1>
      <p className="mt-4 text-lg text-stone-500">
        Поможем подобрать размер, ответим на вопросы и оформим заказ.
      </p>

      <address className="mt-12 grid gap-10 not-italic sm:grid-cols-2">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-stone-400">
            Телефоны
          </h2>
          <ul className="mt-3 space-y-2">
            {phones.map(phone => (
              <li key={phone.tel}>
                <a
                  href={`tel:${phone.tel}`}
                  className="text-lg text-stone-900 hover:text-stone-600"
                >
                  {phone.value}
                </a>
                <span className="ml-2 text-sm text-stone-400">{phone.label}</span>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-stone-400">
            Instagram
          </h2>
          <a
            href={instagram.url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-block text-lg text-stone-900 hover:text-stone-600"
          >
            {instagram.handle}
          </a>
        </div>

        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-stone-400">
            Адрес магазина
          </h2>
          <p className="mt-3 text-lg text-stone-900">
            {city}, {address}
          </p>
        </div>

        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-stone-400">
            Самовывоз
          </h2>
          <p className="mt-3 text-lg text-stone-900">{pickup}</p>
        </div>
      </address>
    </section>
  );
}
