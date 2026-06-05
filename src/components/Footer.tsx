import Link from 'next/link';
import { getSiteSettings } from '@/core/site';

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

type FooterLink = { label: string; href: string; external?: boolean };

type FooterSection = {
  title: string;
  links: ReadonlyArray<FooterLink>;
};

/** tel: href from a display phone string (strip everything but digits/+). */
function telHref(phone: string): string {
  return `tel:${phone.replace(/[^\d+]/g, '')}`;
}

export default async function Footer() {
  const settings = await getSiteSettings();

  // «Связь»: phones as tel: links + Instagram (external). Empty fields skipped.
  const contactLinks: FooterLink[] = [];
  for (const phone of [
    { value: settings.phone1, name: settings.phone1Name },
    { value: settings.phone2, name: settings.phone2Name },
  ]) {
    if (phone.value) {
      contactLinks.push({
        label: phone.name ? `${phone.value} · ${phone.name}` : phone.value,
        href: telHref(phone.value),
        external: true,
      });
    }
  }
  if (settings.instagram) {
    contactLinks.push({
      label: 'Instagram',
      href: settings.instagram,
      external: true,
    });
  }

  const sections: FooterSection[] = [
    { title: 'Каталог', links: catalogLinks },
    { title: 'Компания', links: companyLinks },
    { title: 'Поддержка', links: supportLinks },
    ...(contactLinks.length
      ? [{ title: 'Связь', links: contactLinks } satisfies FooterSection]
      : []),
  ];

  // Bottom-bar address line: «<address>, <city>, Казахстан», skipping empties.
  // «Казахстан» stays as a literal so the location is always present.
  const locationParts = [settings.address, settings.city, 'Казахстан'].filter(
    Boolean,
  );

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
            {settings.ipName && (
              <p className="mt-1 text-xs text-stone-500">
                {settings.ipName}
                {settings.bin ? ` · БИН ${settings.bin}` : ''}
              </p>
            )}
            <p className="mt-1 text-xs text-stone-600">made by raymann</p>
          </div>
          <p className="text-sm text-stone-400">{locationParts.join(', ')}</p>
        </div>
      </div>
    </footer>
  );
}
