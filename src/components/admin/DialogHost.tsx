"use client";

import { useEffect, useRef, useState } from "react";
import { subscribeDialogs, type ConfirmRequest, type ToastMessage } from "../../lib/admin/dialogs";

/** How long a toast stays. A failure stays much longer than a success: it is the message the person most needs to read, and it can be closed. */
export const TOAST_MS = { success: 4500, info: 4500, error: 14000 } as const;

/** Renders confirmation dialogs and toasts requested through lib/admin/dialogs. Mounted once in AdminShell. */
export default function DialogHost() {
  const [request, setRequest] = useState<ConfirmRequest | null>(null);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const cancelRef = useRef<HTMLButtonElement | null>(null);
  const confirmRef = useRef<HTMLButtonElement | null>(null);
  const opener = useRef<HTMLElement | null>(null);

  const closeToast = (id: number) => setToasts((list) => list.filter((t) => t.id !== id));

  useEffect(
    () =>
      subscribeDialogs((event) => {
        if (event.type === "confirm") {
          opener.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
          setRequest(event.request);
        } else {
          setToasts((list) => [...list, event.toast]);
          window.setTimeout(() => closeToast(event.toast.id), TOAST_MS[event.toast.kind]);
        }
      }),
    []
  );

  useEffect(() => {
    if (!request) return;
    // A destructive question starts on Batal, so an Enter pressed out of habit cannot confirm it.
    (request.danger ? cancelRef : confirmRef).current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") return answer(false);
      if (e.key !== "Tab") return;
      // The dialog keeps the keyboard: Tab goes round its two buttons and never reaches the page behind.
      const first = cancelRef.current;
      const last = confirmRef.current;
      if (!first || !last) return;
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      } else if (document.activeElement !== first && document.activeElement !== last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [request]);

  function answer(value: boolean) {
    request?.resolve(value);
    setRequest(null);
    // Back to the button that asked, so the keyboard user is not dropped at the top of the page.
    const back = opener.current;
    opener.current = null;
    window.requestAnimationFrame(() => back?.focus?.());
  }

  return (
    <>
      {request ? (
        <div className="a-modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && answer(false)}>
          <div className="a-modal" role="dialog" aria-modal="true" aria-labelledby="a-modal-title">
            <h2 id="a-modal-title">{request.title ?? "Sahkan tindakan"}</h2>
            <p>{request.message}</p>
            <div className="a-modal-actions">
              <button ref={cancelRef} type="button" className="admin-btn" onClick={() => answer(false)}>
                {request.cancelLabel ?? "Batal"}
              </button>
              <button
                ref={confirmRef}
                type="button"
                className={`admin-btn ${request.danger ? "admin-btn-danger-solid" : "admin-btn-primary"}`}
                onClick={() => answer(true)}
              >
                {request.confirmLabel ?? "Teruskan"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
      <div className="a-toasts" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`a-toast a-toast-${t.kind}`} role={t.kind === "error" ? "alert" : undefined}>
            <span>{t.message}</span>
            {t.kind === "error" ? (
              <button type="button" className="a-toast-close" onClick={() => closeToast(t.id)} aria-label="Tutup pemberitahuan">
                Tutup
              </button>
            ) : null}
          </div>
        ))}
      </div>
    </>
  );
}
