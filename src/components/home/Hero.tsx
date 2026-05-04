import Link from 'next/link';
import Image from 'next/image';

export default function Hero() {
  return (
    <section className="relative w-full aspect-[4/5] md:aspect-video max-h-[85vh] flex items-center justify-center overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0">
        <Image
          src="/images/home/hero.webp"
          alt=""
          fill
          priority
          sizes="100vw"
          quality={85}
          className="object-cover"
          style={{ objectPosition: 'center 65%' }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/20 to-black/40" />
      </div>

      {/* Content */}
      <div className="relative z-10 mx-auto max-w-4xl px-4 text-center text-white sm:px-6 lg:px-8">
        <h1 className="font-display text-4xl font-bold leading-tight tracking-tight md:text-7xl">
          Встречаем рассвет на&nbsp;высоте.
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-sm text-white/80 md:text-xl">
          Одежда и снаряжение, рождённое в предгорьях Хан&nbsp;Тенгри.
        </p>
        <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
          <Link
            href="/catalog"
            className="inline-flex h-12 items-center rounded-md bg-white px-8 text-sm font-semibold text-stone-900 transition-colors hover:bg-stone-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-stone-800"
          >
            Смотреть каталог
          </Link>
          <Link
            href="/#story"
            className="inline-flex h-12 items-center rounded-md border border-white/30 px-8 text-sm font-semibold text-white transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-stone-800"
          >
            О бренде
          </Link>
        </div>
      </div>
    </section>
  );
}
