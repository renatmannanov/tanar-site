import { FAQ_ITEMS } from '@/lib/faq';

export const metadata = {
  title: 'Вопросы и ответы — Tanar',
  description: 'Частые вопросы о доставке, возврате, самовывозе и оплате Tanar.',
};

export default function FaqPage() {
  return (
    <section className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
      <h1 className="font-display text-4xl font-bold tracking-tight text-stone-900 sm:text-5xl">
        Частые вопросы
      </h1>
      <p className="mt-4 text-lg text-stone-500">
        Доставка, возврат, самовывоз и оплата.
      </p>

      <div className="mt-12 divide-y divide-stone-200 border-y border-stone-200">
        {FAQ_ITEMS.map(item => (
          <details key={item.question} className="group py-5">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-lg font-medium text-stone-900">
              {item.question}
              <span className="text-stone-400 transition-transform group-open:rotate-45">
                +
              </span>
            </summary>
            <p className="mt-3 text-stone-600 leading-relaxed">{item.answer}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
