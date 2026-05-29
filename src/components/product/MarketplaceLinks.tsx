import { MARKETPLACE_LABELS, type Marketplace } from '@/lib/product';

const MARKETPLACE_STYLES: Record<Marketplace, string> = {
  ozon: 'border-[#005bff] text-[#005bff] hover:bg-[#005bff] hover:text-white',
  kaspi: 'border-[#f14635] text-[#f14635] hover:bg-[#f14635] hover:text-white',
};

const MARKETPLACE_ORDER: Marketplace[] = ['kaspi', 'ozon'];

export default function MarketplaceLinks({
  marketplaces,
}: {
  marketplaces: Partial<Record<Marketplace, string>>;
}) {
  const entries = MARKETPLACE_ORDER.filter((m) => marketplaces[m]);
  if (entries.length === 0) return null;

  return (
    <div className="mt-4">
      <p className="mb-2 text-sm text-stone-500">Купить на маркетплейсе:</p>
      <div className="flex flex-wrap gap-3">
        {entries.map((m) => (
          <a
            key={m}
            href={marketplaces[m]}
            target="_blank"
            rel="noopener noreferrer"
            className={`flex-1 rounded-lg border-2 px-6 py-3 text-center text-base font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${MARKETPLACE_STYLES[m]}`}
          >
            {MARKETPLACE_LABELS[m]}
          </a>
        ))}
      </div>
    </div>
  );
}
