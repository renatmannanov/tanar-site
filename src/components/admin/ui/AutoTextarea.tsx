'use client';

import { useLayoutEffect, useRef, type TextareaHTMLAttributes } from 'react';
import { cn } from './cn';

// Textarea that grows to fit its content (no inner scrollbar). Height tracks
// the value, so it resizes as the user types and on initial prefilled load.
export function AutoTextarea({
  className,
  value,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const ref = useRef<HTMLTextAreaElement>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, [value]);

  return (
    <textarea
      ref={ref}
      value={value}
      rows={1}
      className={cn(
        'w-full resize-none overflow-hidden rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 outline-none focus:border-gray-500 focus:ring-1 focus:ring-gray-500 disabled:bg-gray-100 disabled:text-gray-500',
        className,
      )}
      {...props}
    />
  );
}
