'use client';

import * as DialogPrimitive from '@radix-ui/react-dialog';

// Image lightbox: shows a photo at full size, scaled to fit the viewport.
// Built on Radix Dialog for free Esc-to-close, focus trap and portal. Closes on
// overlay click, the × button, or Esc. `src` null/undefined → nothing rendered.
type Props = {
  src: string | null;
  alt?: string;
  onClose: () => void;
};

export function Lightbox({ src, alt, onClose }: Props) {
  return (
    <DialogPrimitive.Root
      open={!!src}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/80" />
        <DialogPrimitive.Content
          className="fixed inset-0 z-50 flex items-center justify-center p-4 focus:outline-none"
          // Clicking the backdrop (the content wrapper, not the image) closes.
          onClick={onClose}
        >
          {/* Title is required by Radix for a11y; visually hidden. */}
          <DialogPrimitive.Title className="sr-only">
            Просмотр фото
          </DialogPrimitive.Title>
          {src ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={src}
              alt={alt ?? ''}
              // Stop propagation so clicking the image itself doesn't close.
              onClick={(e) => e.stopPropagation()}
              className="max-h-full max-w-full rounded object-contain shadow-2xl"
            />
          ) : null}
          <DialogPrimitive.Close
            className="absolute right-4 top-4 rounded bg-white/15 px-3 py-1 text-sm text-white hover:bg-white/25"
            aria-label="Закрыть"
          >
            ✕
          </DialogPrimitive.Close>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
