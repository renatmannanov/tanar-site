import { getSiteSettings } from '@/core/site';

export const metadata = {
  title: 'Контакты — Tanar',
  description: 'Свяжитесь с Tanar: телефоны, Instagram, адрес магазина и самовывоз в Алматы.',
};

// Live data from the DB — editable in the admin. Mirror the catalog: dynamic.
export const dynamic = 'force-dynamic';

export default async function ContactsPage() {
  const s = await getSiteSettings();
  const phones = [s.phone1, s.phone2].filter((p): p is string => Boolean(p));
  const location = [s.city, s.address].filter(Boolean).join(', ');

  return (
    <section className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
      <h1 className="font-display text-4xl font-bold tracking-tight text-stone-900 sm:text-5xl">
        Контакты
      </h1>
      <p className="mt-4 text-lg text-stone-500">
        Поможем подобрать размер, ответим на вопросы и оформим заказ.
      </p>

      <address className="mt-12 grid gap-10 not-italic sm:grid-cols-2">
        {phones.length > 0 && (
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-stone-400">
              Телефоны
            </h2>
            <ul className="mt-3 space-y-2">
              {phones.map(phone => (
                <li key={phone}>
                  <a
                    href={`tel:${phone.replace(/[^\d+]/g, '')}`}
                    className="text-lg text-stone-900 hover:text-stone-600"
                  >
                    {phone}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}

        {s.instagram && (
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-stone-400">
              Instagram
            </h2>
            <a
              href={s.instagram}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-block text-lg text-stone-900 hover:text-stone-600"
            >
              {s.instagram.replace(/^https?:\/\/(www\.)?instagram\.com\//, '@')}
            </a>
          </div>
        )}

        {location && (
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-stone-400">
              Адрес магазина
            </h2>
            <p className="mt-3 text-lg text-stone-900">{location}</p>
          </div>
        )}

        {s.pickupInfo && (
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-stone-400">
              Самовывоз
            </h2>
            <p className="mt-3 text-lg text-stone-900">{s.pickupInfo}</p>
          </div>
        )}
      </address>
    </section>
  );
}
