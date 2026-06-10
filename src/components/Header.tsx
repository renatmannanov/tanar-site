import Link from 'next/link';
import Logo from './Logo';
import MobileNav from './MobileNav';
import CartButton from './cart/CartButton';

const navLinks = [
  { label: 'Каталог', href: '/catalog' },
  { label: 'Блог', href: '/blog' },
  { label: 'О бренде', href: '/#story' },
  { label: 'Контакты', href: '/contacts' },
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
        <nav className="hidden items-center gap-8 lg:flex">
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

        {/* Cart is visible on all breakpoints, next to the burger on mobile */}
        <div className="flex items-center gap-1">
          <CartButton />
          <MobileNav />
        </div>
      </div>
    </header>
  );
}
