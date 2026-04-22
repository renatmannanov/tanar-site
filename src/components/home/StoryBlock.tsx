import Placeholder from '@/components/Placeholder';

export default function StoryBlock() {
  return (
    <section
      id="story"
      className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8"
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
              Tanar — казахское слово, означающее «встречающая рассвет». Так
              называют момент, когда первый луч солнца касается вершины Хан
              Тенгри и превращает гранит в золото. Этот момент — наша
              философия: быть на высоте, когда это действительно важно.
            </p>
            <p>
              Мы проектируем одежду и снаряжение в Алматы, тестируем на
              маршрутах Тянь-Шаня и Алтая. Каждая модель проходит через руки
              альпинистов, трейлраннеров и фрирайдеров — людей, для которых
              горы не фон, а образ жизни.
            </p>
            <p>
              Наша цель — создать бренд, в котором функциональность встречает
              осознанный дизайн. Без лишнего, без компромиссов. Только то, что
              выдержит рассвет на четырёх тысячах.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
