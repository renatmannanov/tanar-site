import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { ADMIN_COOKIE, verifySessionToken } from './admin-auth';

// Defense-in-depth guard for protected admin server pages and server actions.
// Kept separate from admin-auth.ts (pure crypto) so middleware can import the
// crypto core without pulling in next/headers + next/navigation.
// Next 15: cookies() is async.
export async function requireAdmin(): Promise<void> {
  const store = await cookies();
  if (!verifySessionToken(store.get(ADMIN_COOKIE)?.value)) {
    redirect('/admin/login');
  }
}
