'use client';

import { useState, type ReactNode } from 'react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from './Dialog';
import { Button, type ButtonProps } from './Button';

type Props = Omit<ButtonProps, 'onClick'> & {
  /** Called when the user confirms in the dialog. */
  onConfirm: () => void;
  /** Dialog title, e.g. "Удалить цвет?". */
  title: string;
  /** Optional longer explanation under the title. */
  description?: ReactNode;
  /** Confirm button label (default "Удалить"). */
  confirmLabel?: string;
  children: ReactNode;
};

// A button that asks for confirmation in a Radix Dialog before running its
// action. Used for destructive edits (remove color/size) and reusable for any
// future delete (Plan C: delete product).
export function ConfirmButton({
  onConfirm,
  title,
  description,
  confirmLabel = 'Удалить',
  children,
  ...buttonProps
}: Props) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button type="button" {...buttonProps} onClick={() => setOpen(true)}>
        {children}
      </Button>
      <DialogContent>
        <DialogTitle className="text-base font-semibold text-gray-900">{title}</DialogTitle>
        {description ? (
          <DialogDescription className="mt-2 text-sm text-gray-600">
            {description}
          </DialogDescription>
        ) : null}
        <div className="mt-6 flex justify-end gap-3">
          <DialogClose asChild>
            <Button type="button" variant="secondary">
              Отмена
            </Button>
          </DialogClose>
          <Button
            type="button"
            className="bg-red-600 text-white hover:bg-red-700"
            onClick={() => {
              setOpen(false);
              onConfirm();
            }}
          >
            {confirmLabel}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
