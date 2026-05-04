import Link from 'next/link';

const catalogLinks = [
  { label: 'Куртки', href: '/catalog?category=jackets' },
  { label: 'Худи', href: '/catalog?category=hoodies' },
  { label: 'Футболки', href: '/catalog?category=t-shirts' },
  { label: 'Штаны', href: '/catalog?category=pants' },
  { label: 'Шорты', href: '/catalog?category=shorts' },
] as const;

const companyLinks = [
  { label: 'О нас', href: '#' },
  { label: 'Блог', href: '/blog' },
  { label: 'Контакты', href: '#' },
] as const;

const supportLinks = [
  { label: 'Доставка', href: '#' },
  { label: 'Возврат', href: '#' },
  { label: 'FAQ', href: '#' },
] as const;

const socialLinks = [
  { label: 'Instagram', href: '#' },
  { label: 'Telegram', href: '#' },
] as const;

type FooterSection = {
  title: string;
  links: ReadonlyArray<{ label: string; href: string }>;
};

const sections: FooterSection[] = [
  { title: 'Каталог', links: catalogLinks },
  { title: 'Компания', links: companyLinks },
  { title: 'Поддержка', links: supportLinks },
  { title: 'Связь', links: socialLinks },
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
                    <Link
                      href={link.href}
                      className="text-sm text-stone-300 transition-colors hover:text-white"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-stone-700 pt-8 sm:flex-row">
          <p className="text-sm text-stone-400">
            © 2026 Tanar. Все права защищены.
          </p>
          <p className="text-sm text-stone-400">Алматы, Казахстан</p>
        </div>
      </div>
    </footer>
  );
}
