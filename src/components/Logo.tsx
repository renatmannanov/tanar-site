import Link from 'next/link';

type LogoProps = {
  variant?: 'light' | 'dark';
};

export default function Logo({ variant = 'dark' }: LogoProps) {
  const textColor = variant === 'light' ? 'text-white' : 'text-stone-900';
  const subColor = variant === 'light' ? 'text-white/60' : 'text-stone-500';

  return (
    <Link href="/" className="flex items-center gap-3 group">
      <svg
        width={32}
        height={32}
        viewBox="0 0 32 32"
        fill="none"
        aria-hidden="true"
        className="shrink-0"
      >
        {/* Mountain silhouette */}
        <polygon
          points="16,2 30,28 2,28"
          className={variant === 'light' ? 'fill-white' : 'fill-stone-900'}
        />
        {/* Snow cap — jagged white line */}
        <polyline
          points="10,14 13,8 16,12 19,6 22,14"
          className={variant === 'light' ? 'stroke-stone-800' : 'stroke-white'}
          strokeWidth={1.5}
          fill="none"
          strokeLinejoin="round"
        />
      </svg>
      <div className="flex flex-col">
        <span
          className={`font-display text-lg font-bold uppercase tracking-widest leading-tight ${textColor}`}
        >
          Tanar
        </span>
        <span className={`text-xs uppercase tracking-wide ${subColor}`}>
          outdoor · kazakhstan
        </span>
      </div>
    </Link>
  );
}
