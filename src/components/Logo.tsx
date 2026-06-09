import Image from 'next/image';
import Link from 'next/link';

type LogoProps = {
  variant?: 'light' | 'dark';
};

export default function Logo({ variant = 'dark' }: LogoProps) {
  const markSrc = variant === 'light' ? '/logo/mark-light.png' : '/logo/mark.png';
  // wordmark.png — чёрная надпись; на тёмном фоне инвертируем в белую
  const wordmarkClass = variant === 'light' ? 'invert' : '';

  return (
    <Link href="/" className="flex items-center gap-2.5 group" aria-label="Tanar — главная">
      <Image
        src={markSrc}
        alt=""
        width={42}
        height={24}
        priority
        className="h-6 w-auto shrink-0"
      />
      <Image
        src="/logo/wordmark.png"
        alt="Tanar"
        width={1703}
        height={213}
        priority
        className={`h-4 w-auto shrink-0 ${wordmarkClass}`}
      />
    </Link>
  );
}
