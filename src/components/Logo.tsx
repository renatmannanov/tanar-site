import Image from 'next/image';
import Link from 'next/link';

type LogoProps = {
  variant?: 'light' | 'dark';
};

export default function Logo({ variant = 'dark' }: LogoProps) {
  const textColor = variant === 'light' ? 'text-white' : 'text-stone-900';
  const markSrc = variant === 'light' ? '/logo/mark-light.png' : '/logo/mark.png';

  return (
    <Link href="/" className="flex items-center gap-2 group" aria-label="Tanar — главная">
      <Image
        src={markSrc}
        alt=""
        width={42}
        height={24}
        priority
        className="h-6 w-auto shrink-0"
      />
      <span
        className={`font-display text-xl font-bold uppercase tracking-widest leading-none ${textColor}`}
      >
        Tanar
      </span>
    </Link>
  );
}
