import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { ADMIN_COOKIE, verifySessionToken } from '@/lib/admin-auth';
import LoginForm from './LoginForm';

// Login page is the one /admin route NOT guarded by requireAdmin (it must be
// reachable without a cookie). If already signed in, skip straight to catalog.
export default async function LoginPage() {
  const store = await cookies();
  if (verifySessionToken(store.get(ADMIN_COOKIE)?.value)) {
    redirect('/admin/catalog');
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 p-6">
      <div className="w-full max-w-sm rounded-lg border border-gray-200 bg-white p-8 shadow-sm">
        <h1 className="mb-6 text-lg font-semibold text-gray-900">Tanar — админка</h1>
        <LoginForm />
      </div>
    </main>
  );
}
