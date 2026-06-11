import { MARKETPLACE_LABELS, type Marketplace } from '@/core/catalog/client';

const MARKETPLACE_STYLES: Record<Marketplace, string> = {
  ozon: 'border-[#005bff] text-[#005bff] hover:bg-[#005bff] hover:text-white',
  kaspi: 'border-[#f14635] text-[#f14635] hover:bg-[#f14635] hover:text-white',
};

const MARKETPLACE_ORDER: Marketplace[] = ['kaspi', 'ozon'];

const BUTTON_BASE =
  'flex-1 rounded-lg border-2 px-6 py-3 text-center text-base font-medium';

export default function MarketplaceLinks({
  marketplaces,
  showWhenEmpty = false,
}: {
  marketplaces: Partial<Record<Marketplace, string>>;
  /**
   * Render the block even when no link is currently active (all buttons grey).
   * The product page passes "this product is on a marketplace at all" here, so
   * buyers see the buttons before picking a size — they activate on selection.
   */
  showWhenEmpty?: boolean;
}) {
  const hasActive = MARKETPLACE_ORDER.some((m) => marketplaces[m]);
  if (!hasActive && !showWhenEmpty) return null;

  return (
    <div className="mt-6">
      <div className="flex flex-wrap gap-3">
        {MARKETPLACE_ORDER.map((m) =>
          marketplaces[m] ? (
            <a
              key={m}
              href={marketplaces[m]}
              target="_blank"
              rel="noopener noreferrer"
              className={`${BUTTON_BASE} transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${MARKETPLACE_STYLES[m]}`}
            >
              {MARKETPLACE_LABELS[m]}
            </a>
          ) : (
            // No link for the current selection yet (e.g. size not picked) —
            // a grey, non-interactive stand-in instead of a vanishing button.
            <span
              key={m}
              aria-disabled="true"
              data-testid={`mp-disabled-${m}`}
              className={`${BUTTON_BASE} cursor-not-allowed select-none border-stone-200 text-stone-400`}
            >
              {MARKETPLACE_LABELS[m]}
            </span>
          ),
        )}
      </div>
      <p className="mt-2 text-xs text-stone-400">
        * перейдите по ссылкам на маркетплейсы для покупки и доставки в удобное
        для вас место
      </p>
    </div>
  );
}
