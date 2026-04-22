import Link from 'next/link';
import Logo from './Logo';

const navLinks = [
  { label: 'Каталог', href: '/catalog' },
  { label: 'Блог', href: '/blog' },
  { label: 'О бренде', href: '/#story' },
  { label: 'Контакты', href: '/#footer' },
] as const;

export default function Header() {
  return (
    <header
      data-testid="site-header"
      className="sticky top-0 z-50 h-16 border-b border-stone-200 bg-stone-50/80 backdrop-blur"
    >
      <div className="mx-auto flex h-full max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Logo />

        {/* Desktop nav */}
        <nav className="hidden items-center gap-8 md:flex">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm font-medium text-stone-600 transition-colors hover:text-stone-900"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Mobile burger — dropdown in step_10 */}
        <button
          type="button"
          aria-label="Открыть меню"
          className="inline-flex items-center justify-center rounded-md p-2 text-stone-600 hover:bg-stone-100 hover:text-stone-900 md:hidden"
        >
          <svg
            className="h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"
            />
          </svg>
        </button>
      </div>
    </header>
  );
}
