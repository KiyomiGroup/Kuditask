"use client";
import { Modal } from "./Modal";
import { Button } from "./Button";

export function ConfirmDialog({
  open, onClose, onConfirm, title = "Are you sure?", description, confirmLabel = "Confirm", danger = false,
}: {
  open: boolean; onClose: () => void; onConfirm: () => void;
  title?: string; description?: string; confirmLabel?: string; danger?: boolean;
}) {
  return (
    <Modal open={open} onClose={onClose} title={title}>
      {description && <p className="text-body-md font-body-md text-on-surface-variant mb-space-lg">{description}</p>}
      <div className="flex justify-end gap-space-sm">
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button
          variant={danger ? "primary" : "secondary"}
          className={danger ? "!bg-status-error-fg !text-white hover:!brightness-110" : ""}
          onClick={onConfirm}
        >
          {confirmLabel}
        </Button>
      </div>
    </Modal>
  );
}
