'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

const navLinks = [
  { label: 'Каталог', href: '/catalog' },
  { label: 'Блог', href: '/blog' },
  { label: 'О бренде', href: '/#story' },
  { label: 'Контакты', href: '/contacts' },
] as const;

export default function MobileNav() {
  const [open, setOpen] = useState(false);

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, close]);

  return (
    <div className="lg:hidden">
      <button
        type="button"
        aria-label={open ? 'Закрыть меню' : 'Открыть меню'}
        aria-expanded={open}
        aria-controls="mobile-menu"
        onClick={() => setOpen(!open)}
        className="inline-flex items-center justify-center rounded-md p-2 text-stone-600 transition-colors hover:bg-stone-100 hover:text-stone-900"
      >
        <svg
          className="h-6 w-6"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
          aria-hidden="true"
        >
          {open ? (
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M6 18L18 6M6 6l12 12"
            />
          ) : (
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"
            />
          )}
        </svg>
      </button>

      {open && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 top-16 z-40 bg-black/20 backdrop-blur-sm"
            onClick={close}
            aria-hidden="true"
          />

          {/* Menu */}
          <nav
            id="mobile-menu"
            className="fixed inset-x-0 top-16 z-50 border-b border-stone-200 bg-stone-50 px-4 py-6 shadow-lg"
          >
            <ul className="flex flex-col gap-4">
              {navLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    onClick={close}
                    className="block text-base font-medium text-stone-700 transition-colors hover:text-stone-900"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </>
      )}
    </div>
  );
}
