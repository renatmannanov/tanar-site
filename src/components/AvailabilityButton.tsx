'use client';

export default function AvailabilityButton() {
  return (
    <button
      type="button"
      onClick={() => alert('Скоро в продаже')}
      className="w-full rounded-lg bg-stone-900 px-8 py-4 text-base font-medium text-stone-50 transition-colors hover:bg-stone-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-900 focus-visible:ring-offset-2"
      data-testid="availability-button"
    >
      Узнать о наличии
    </button>
  );
}
