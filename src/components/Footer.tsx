import Link from 'next/link';
import { SITE_CONTACTS } from '@/lib/site-contacts';

const catalogLinks = [
  { label: 'Куртки', href: '/catalog?category=jackets' },
  { label: 'Брюки', href: '/catalog?category=pants' },
  { label: 'Шорты', href: '/catalog?category=shorts' },
  { label: 'Футболки', href: '/catalog?category=tshirts' },
  { label: 'Поло', href: '/catalog?category=polo' },
] as const;

const companyLinks = [
  { label: 'О бренде', href: '/blog/o-brende-tanar' },
  { label: 'Блог', href: '/blog' },
  { label: 'Контакты', href: '/contacts' },
] as const;

const supportLinks = [{ label: 'FAQ', href: '/faq' }] as const;

// «Связь»: телефоны как tel:-ссылки + Instagram (внешняя). Адрес — текстом в
// нижней плашке (не как link-элемент: тип FooterSection держит только ссылки).
const contactLinks = [
  ...SITE_CONTACTS.phones.map((p) => ({
    label: `${p.value} · ${p.label}`,
    href: `tel:${p.tel}`,
    external: true,
  })),
  {
    label: 'Instagram',
    href: SITE_CONTACTS.instagram.url,
    external: true,
  },
] as const;

type FooterLink = { label: string; href: string; external?: boolean };

type FooterSection = {
  title: string;
  links: ReadonlyArray<FooterLink>;
};

const sections: FooterSection[] = [
  { title: 'Каталог', links: catalogLinks },
  { title: 'Компания', links: companyLinks },
  { title: 'Поддержка', links: supportLinks },
  { title: 'Связь', links: contactLinks },
];

export default function Footer() {
  return (
    <footer
      id="footer"
      data-testid="site-footer"
      className="bg-stone-900 py-16 text-stone-200"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Link columns */}
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {sections.map((section) => (
            <div key={section.title}>
              <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-stone-400">
                {section.title}
              </h3>
              <ul className="space-y-2">
                {section.links.map((link) => (
                  <li key={link.label}>
                    {link.external ? (
                      <a
                        href={link.href}
                        {...(link.href.startsWith('http')
                          ? { target: '_blank', rel: 'noopener noreferrer' }
                          : {})}
                        className="text-sm text-stone-300 transition-colors hover:text-white"
                      >
                        {link.label}
                      </a>
                    ) : (
                      <Link
                        href={link.href}
                        className="text-sm text-stone-300 transition-colors hover:text-white"
                      >
                        {link.label}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-stone-700 pt-8 sm:flex-row">
          <div className="text-center text-sm text-stone-400 sm:text-left">
            <p>© 2026 Tanar. Все права защищены.</p>
            <p className="mt-1 text-xs text-stone-500">
              {SITE_CONTACTS.legal.ipName} · БИН {SITE_CONTACTS.legal.bin}
            </p>
          </div>
          <p className="text-sm text-stone-400">
            {SITE_CONTACTS.address}, {SITE_CONTACTS.city}, Казахстан
          </p>
        </div>
      </div>
    </footer>
  );
}
