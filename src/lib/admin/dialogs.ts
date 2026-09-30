/**
 * In-page confirmation dialogs and toasts for admin (replace the browser's
 * window.confirm / alert). A tiny event bus: any client code can call
 * `confirmAction(...)` or `toast(...)`; <DialogHost /> in AdminShell shows them.
 */

export interface ConfirmOptions {
  title?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Style the confirm button as destructive (delete, archive, reject). */
  danger?: boolean;
}

export interface ConfirmRequest extends ConfirmOptions {
  id: number;
  message: string;
  resolve: (value: boolean) => void;
}

export type ToastKind = "success" | "error" | "info";

export interface ToastMessage {
  id: number;
  message: string;
  kind: ToastKind;
}

type Listener = (event: { type: "confirm"; request: ConfirmRequest } | { type: "toast"; toast: ToastMessage }) => void;

const listeners = new Set<Listener>();
let counter = 0;

export function subscribeDialogs(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Resolves true if the editor confirms. Without a host mounted it falls back to the browser dialog. */
export function confirmAction(message: string, options: ConfirmOptions = {}): Promise<boolean> {
  if (listeners.size === 0) {
    return Promise.resolve(typeof window !== "undefined" ? window.confirm(message) : false);
  }
  return new Promise((resolve) => {
    const request: ConfirmRequest = { id: ++counter, message, resolve, ...options };
    listeners.forEach((listener) => listener({ type: "confirm", request }));
  });
}

export function toast(message: string, kind: ToastKind = "info"): void {
  const item: ToastMessage = { id: ++counter, message, kind };
  listeners.forEach((listener) => listener({ type: "toast", toast: item }));
}
