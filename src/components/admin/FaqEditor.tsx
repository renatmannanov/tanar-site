'use client';

import { useState, useTransition } from 'react';
import type { FaqItem } from '@/core/site/client';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Label } from './ui/Label';
import { AutoTextarea } from './ui/AutoTextarea';
import { ConfirmButton } from './ui/ConfirmButton';

type Actions = {
  create: (input: {
    question: string;
    answer: string;
    sortOrder: number;
  }) => Promise<{ error?: string }>;
  update: (
    id: string,
    input: { question: string; answer: string; sortOrder: number },
  ) => Promise<{ error?: string }>;
  remove: (id: string) => Promise<{ error?: string }>;
};

type Props = {
  initial: FaqItem[];
  actions: Actions;
};

export default function FaqEditor({ initial, actions }: Props) {
  const [items, setItems] = useState<FaqItem[]>(initial);
  const [error, setError] = useState<string | undefined>();
  const [pending, startTransition] = useTransition();

  // New-item draft.
  const [newQ, setNewQ] = useState('');
  const [newA, setNewA] = useState('');

  function patch(id: string, field: keyof FaqItem, value: string | number) {
    setItems((list) =>
      list.map((it) => (it.id === id ? { ...it, [field]: value } : it)),
    );
  }

  function run(fn: () => Promise<{ error?: string }>) {
    setError(undefined);
    startTransition(async () => {
      const result = await fn();
      if (result.error) setError(result.error);
    });
  }

  function onSave(item: FaqItem) {
    run(() =>
      actions.update(item.id, {
        question: item.question,
        answer: item.answer,
        sortOrder: item.sortOrder,
      }),
    );
  }

  function onDelete(id: string) {
    setItems((list) => list.filter((it) => it.id !== id));
    run(() => actions.remove(id));
  }

  function onAdd() {
    if (!newQ.trim() || !newA.trim()) {
      setError('Заполните вопрос и ответ.');
      return;
    }
    const nextOrder =
      items.reduce((max, it) => Math.max(max, it.sortOrder), -1) + 1;
    run(async () => {
      const result = await actions.create({
        question: newQ.trim(),
        answer: newA.trim(),
        sortOrder: nextOrder,
      });
      if (!result.error) {
        setNewQ('');
        setNewA('');
      }
      return result;
    });
  }

  const sorted = [...items].sort((a, b) => a.sortOrder - b.sortOrder);

  return (
    <div className="space-y-8">
      {error && <p className="text-sm text-red-600">{error}</p>}

      {/* Existing items */}
      <ul className="space-y-6" data-testid="faq-list">
        {sorted.map((item) => (
          <li
            key={item.id}
            className="space-y-3 rounded-md border border-gray-200 p-4"
          >
            <div className="flex items-start gap-3">
              <div className="flex-1 space-y-1">
                <Label htmlFor={`q-${item.id}`}>Вопрос</Label>
                <Input
                  id={`q-${item.id}`}
                  value={item.question}
                  onChange={(e) => patch(item.id, 'question', e.target.value)}
                />
              </div>
              <div className="w-20 space-y-1">
                <Label htmlFor={`o-${item.id}`}>Порядок</Label>
                <Input
                  id={`o-${item.id}`}
                  type="number"
                  value={item.sortOrder}
                  onChange={(e) =>
                    patch(item.id, 'sortOrder', Number(e.target.value))
                  }
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label htmlFor={`a-${item.id}`}>Ответ</Label>
              <AutoTextarea
                id={`a-${item.id}`}
                value={item.answer}
                onChange={(e) => patch(item.id, 'answer', e.target.value)}
              />
            </div>
            <div className="flex justify-end gap-3">
              <ConfirmButton
                variant="secondary"
                title="Удалить вопрос?"
                description={item.question}
                onConfirm={() => onDelete(item.id)}
                disabled={pending}
              >
                Удалить
              </ConfirmButton>
              <Button onClick={() => onSave(item)} disabled={pending}>
                Сохранить
              </Button>
            </div>
          </li>
        ))}
      </ul>

      {/* Add new */}
      <div className="space-y-3 rounded-md border border-dashed border-gray-300 p-4">
        <h2 className="text-sm font-semibold text-gray-900">Новый вопрос</h2>
        <div className="space-y-1">
          <Label htmlFor="new-q">Вопрос</Label>
          <Input
            id="new-q"
            value={newQ}
            onChange={(e) => setNewQ(e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="new-a">Ответ</Label>
          <AutoTextarea
            id="new-a"
            value={newA}
            onChange={(e) => setNewA(e.target.value)}
          />
        </div>
        <Button onClick={onAdd} disabled={pending}>
          Добавить
        </Button>
      </div>
    </div>
  );
}
