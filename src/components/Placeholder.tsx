import { gradientFromString } from '@/lib/gradients';

type PlaceholderProps = {
  label: string;
  gradient?: string;
  aspect?: 'square' | 'portrait' | 'landscape' | 'wide';
  className?: string;
};

const aspectClasses = {
  square: 'aspect-square',
  portrait: 'aspect-[3/4]',
  landscape: 'aspect-[4/3]',
  wide: 'aspect-[16/9]',
} as const;

export default function Placeholder({
  label,
  gradient,
  aspect = 'landscape',
  className = '',
}: PlaceholderProps) {
  const grad = gradient || gradientFromString(label);

  return (
    <div
      data-testid="placeholder"
      className={`relative overflow-hidden rounded-lg bg-gradient-to-br ${grad} ${aspectClasses[aspect]} ${className}`}
    >
      <span className="absolute inset-0 flex items-center justify-center text-white/80 text-sm font-medium uppercase tracking-wide px-4 text-center">
        {label}
      </span>
    </div>
  );
}
