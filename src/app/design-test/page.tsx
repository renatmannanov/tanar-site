import Placeholder from '@/components/Placeholder';
import { OUTDOOR_GRADIENTS } from '@/lib/gradients';

export default function DesignPage() {
  const aspects = ['square', 'portrait', 'landscape', 'wide'] as const;

  return (
    <div className="p-8 space-y-8">
      <h1 className="font-display text-3xl font-bold">Design Tokens</h1>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Aspect Ratios</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {aspects.map((aspect) => (
            <Placeholder key={aspect} label={aspect} aspect={aspect} />
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Gradients</h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {OUTDOOR_GRADIENTS.map((grad) => (
            <Placeholder key={grad} label={grad} gradient={grad} aspect="square" />
          ))}
        </div>
      </section>
    </div>
  );
}
