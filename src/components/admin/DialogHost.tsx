"use client";

import { useEffect, useRef, useState } from "react";
import { subscribeDialogs, type ConfirmRequest, type ToastMessage } from "../../lib/admin/dialogs";

/** Renders confirmation dialogs and toasts requested through lib/admin/dialogs. Mounted once in AdminShell. */
export default function DialogHost() {
  const [request, setRequest] = useState<ConfirmRequest | null>(null);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const confirmRef = useRef<HTMLButtonElement | null>(null);

  useEffect(
    () =>
      subscribeDialogs((event) => {
        if (event.type === "confirm") {
          setRequest(event.request);
        } else {
          setToasts((list) => [...list, event.toast]);
          window.setTimeout(() => setToasts((list) => list.filter((t) => t.id !== event.toast.id)), 4500);
        }
      }),
    []
  );

  useEffect(() => {
    if (!request) return;
    confirmRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") answer(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [request]);

  function answer(value: boolean) {
    request?.resolve(value);
    setRequest(null);
  }

  return (
    <>
      {request ? (
        <div className="a-modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && answer(false)}>
          <div className="a-modal" role="dialog" aria-modal="true" aria-labelledby="a-modal-title">
            <h2 id="a-modal-title">{request.title ?? "Sahkan tindakan"}</h2>
            <p>{request.message}</p>
            <div className="a-modal-actions">
              <button type="button" className="a-btn" onClick={() => answer(false)}>
                {request.cancelLabel ?? "Batal"}
              </button>
              <button
                ref={confirmRef}
                type="button"
                className={`a-btn ${request.danger ? "a-btn-danger" : "a-btn-primary"}`}
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
          <div key={t.id} className={`a-toast a-toast-${t.kind}`}>
            {t.message}
          </div>
        ))}
      </div>
    </>
  );
}
