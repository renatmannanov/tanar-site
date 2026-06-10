// wa.me click-to-chat helpers — the single source of WhatsApp-link logic.
// Client-safe (no deps, no 'use client'): used by server code (checkout
// action) and client components (footer link is server, buttons are client).

/** '+7 707 123-45-67' → '77071234567' (digits only, as wa.me requires). */
export function waPhoneDigits(phone: string): string {
  return phone.replace(/\D/g, '');
}

/** wa.me link with a prefilled message (URL-encoded). */
export function waLink(phone: string, text: string): string {
  return `https://wa.me/${waPhoneDigits(phone)}?text=${encodeURIComponent(text)}`;
}
