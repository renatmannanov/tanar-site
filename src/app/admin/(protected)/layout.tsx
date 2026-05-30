import Link from 'next/link';
import { adminSections } from '../sections';
import { logoutAction } from '../login/actions';

// Admin shell for protected sections: sidebar (from the section registry) +
// Logout + content. Lives under the (protected) group so /admin/login does not
// inherit the sidebar. No auth-guard in the layout itself — each protected page
// calls requireAdmin() (defense in depth alongside middleware). The (protected)
// group does not affect URLs — catalog stays /admin/catalog.
export default function ProtectedLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="flex min-h-screen bg-gray-50 text-gray-900">
      <aside className="flex w-56 flex-col border-r border-gray-200 bg-white">
        <div className="border-b border-gray-200 px-4 py-4">
          <span className="text-sm font-semibold">Tanar — админка</span>
        </div>
        <nav className="flex flex-1 flex-col gap-1 p-2">
          {adminSections.map((section) =>
            section.enabled ? (
              <Link
                key={section.id}
                href={section.href}
                className="rounded-md px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
              >
                {section.label}
              </Link>
            ) : (
              <span
                key={section.id}
                aria-disabled="true"
                title="Скоро"
                className="cursor-not-allowed rounded-md px-3 py-2 text-sm text-gray-400"
              >
                {section.label}
              </span>
            ),
          )}
        </nav>
        <div className="border-t border-gray-200 p-2">
          <form action={logoutAction}>
            <button
              type="submit"
              className="w-full rounded-md px-3 py-2 text-left text-sm font-medium text-gray-700 hover:bg-gray-100"
            >
              Выйти
            </button>
          </form>
        </div>
      </aside>
      <div className="flex-1 p-6">{children}</div>
    </div>
  );
}
