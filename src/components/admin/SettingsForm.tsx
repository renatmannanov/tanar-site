'use client';

import { useState, useTransition } from 'react';
import type { SiteSettings, SiteSettingsInput } from '@/core/site/client';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Label } from './ui/Label';

type Field = {
  key: keyof SiteSettings;
  label: string;
  hint?: string;
  placeholder?: string;
};

// Grouped for layout; the «реквизиты» group includes IBAN/bank which are stored
// but NOT shown on the storefront yet (Phase 3) — admin can still fill them.
const GROUPS: { title: string; fields: Field[] }[] = [
  {
    title: 'Контакты',
    fields: [
      { key: 'phone1', label: 'Телефон 1' },
      { key: 'phone1Name', label: 'Имя при телефоне 1', hint: 'напр. Айман' },
      { key: 'phone2', label: 'Телефон 2' },
      { key: 'phone2Name', label: 'Имя при телефоне 2', hint: 'напр. Милена' },
      {
        key: 'whatsapp',
        label: 'WhatsApp для заказов',
        hint: 'На этот номер приходят заказы из корзины',
        placeholder: '+7 707 000 00 00',
      },
      { key: 'instagram', label: 'Instagram (URL)', hint: 'https://instagram.com/...' },
      { key: 'email', label: 'Email', hint: 'пустой — не показывается на сайте' },
    ],
  },
  {
    title: 'Адрес',
    fields: [
      { key: 'city', label: 'Город' },
      { key: 'address', label: 'Адрес магазина' },
      { key: 'pickupInfo', label: 'Самовывоз' },
    ],
  },
  {
    title: 'Реквизиты',
    fields: [
      { key: 'ipName', label: 'ИП / название' },
      { key: 'bin', label: 'БИН' },
      { key: 'bankName', label: 'Банк', hint: 'не показывается на витрине (Фаза 3)' },
      { key: 'iban', label: 'IBAN', hint: 'не показывается на витрине (Фаза 3)' },
    ],
  },
];

type Props = {
  initial: SiteSettings;
  action: (input: SiteSettingsInput) => Promise<{ error?: string }>;
};

export default function SettingsForm({ initial, action }: Props) {
  const [form, setForm] = useState<SiteSettings>(initial);
  const [error, setError] = useState<string | undefined>();
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  function set(key: keyof SiteSettings, value: string) {
    setForm((f) => ({ ...f, [key]: value === '' ? null : value }));
    setSaved(false);
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(undefined);
    setSaved(false);
    startTransition(async () => {
      const result = await action(form);
      if (result.error) setError(result.error);
      else setSaved(true);
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-8">
      {GROUPS.map((group) => (
        <fieldset key={group.title} className="space-y-4">
          <legend className="text-sm font-semibold text-gray-900">
            {group.title}
          </legend>
          <div className="grid gap-4 sm:grid-cols-2">
            {group.fields.map((field) => (
              <div key={field.key} className="space-y-1">
                <Label htmlFor={field.key}>{field.label}</Label>
                <Input
                  id={field.key}
                  value={form[field.key] ?? ''}
                  placeholder={field.placeholder}
                  onChange={(e) => set(field.key, e.target.value)}
                />
                {field.hint && (
                  <p className="text-xs text-gray-400">{field.hint}</p>
                )}
              </div>
            ))}
          </div>
        </fieldset>
      ))}

      {error && <p className="text-sm text-red-600">{error}</p>}
      {saved && <p className="text-sm text-green-600">Сохранено.</p>}

      <Button type="submit" disabled={pending}>
        {pending ? 'Сохранение…' : 'Сохранить'}
      </Button>
    </form>
  );
}
