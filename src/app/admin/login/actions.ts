'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import {
  ADMIN_COOKIE,
  createSessionToken,
  verifyPassword,
} from '@/lib/admin-auth';

export type LoginState = { error?: string };

// Signature shaped for useActionState: (prevState, formData).
// Next 15: cookies() is async — always `await cookies()`.
export async function loginAction(
  _prevState: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const password = formData.get('password');
  if (!verifyPassword(typeof password === 'string' ? password : undefined)) {
    return { error: 'Неверный пароль' };
  }

  const store = await cookies();
  store.set(ADMIN_COOKIE, createSessionToken(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
  });

  // redirect() throws a control-flow exception — keep it OUT of try/catch.
  redirect('/admin/catalog');
}

export async function logoutAction(): Promise<void> {
  const store = await cookies();
  store.delete(ADMIN_COOKIE);
  redirect('/admin/login');
}
