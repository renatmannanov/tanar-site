import Link from 'next/link';
import Placeholder from '@/components/Placeholder';

export default function StoryBlock() {
  return (
    <section
      id="story"
      className="mx-auto max-w-7xl px-4 pt-20 sm:px-6 lg:px-8"
    >
      <div className="grid items-center gap-12 lg:grid-cols-2">
        {/* Image placeholder */}
        <Placeholder
          label="ХАН ТЕНГРИ"
          gradient="from-amber-800 via-stone-700 to-slate-900"
          aspect="portrait"
        />

        {/* Text */}
        <div>
          <h2 className="font-display text-3xl font-bold tracking-tight text-stone-900">
            Рождены в горах
          </h2>
          <div className="mt-6 space-y-4 text-stone-600 leading-relaxed">
            <p>
              Tanar — казахское слово, означающее «тот, кто встречает рассвет».
              Это человек, который ещё до восхода уже идёт по тропе, пока весь
              мир спит. Имя вдохновлено легендарным пиком Хан-Тенгри — его
              силуэт стал нашим логотипом.
            </p>
            <p>
              Мы создаём техническую и повседневную одежду для переменчивой
              погоды, ветра, дождя, высоты и движения. Каждая модель
              разрабатывается с учётом реальных условий казахстанских гор:
              мембраны Gore-Tex, ветровки-дождевики, беговые модели с
              SPF-защитой.
            </p>
            <p>
              Мы верим, что качественная техническая одежда должна быть
              доступной каждому, кто любит горы и outdoor-культуру в Казахстане.
              TANAR — это честное качество, функциональность и стиль без лишнего
              шума.
            </p>
          </div>
          <Link
            href="/blog/o-brende-tanar"
            className="mt-6 inline-block text-sm font-medium text-stone-900 underline-offset-4 hover:underline"
          >
            Читать о бренде →
          </Link>
        </div>
      </div>
    </section>
  );
}
