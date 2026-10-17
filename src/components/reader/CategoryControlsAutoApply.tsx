"use client";

import { useEffect } from "react";

/**
 * Applies the sort and filter choices of a category list as soon as they are chosen, so the "Tapis" button is not needed (the form marks
 * itself `is-auto`, which hides the button; without JavaScript the form is a plain GET form and the button stays).
 * The form is submitted a moment after the last change: a keyboard user stepping through a closed select with the arrow keys changes it
 * on every press, and the page must not reload under them each time.
 */
const SETTLE_MS = 700;
/** On a wide screen (1200px and up) the bar keeps its button and nothing applies by itself; the CSS shows the button there too. */
const AUTO_QUERY = "(max-width: 1199px)";

export default function CategoryControlsAutoApply({ formId }: { formId: string }) {
  useEffect(() => {
    const form = document.getElementById(formId);
    if (!(form instanceof HTMLFormElement)) return;
    form.classList.add("is-auto");
    let timer: ReturnType<typeof setTimeout> | undefined;
    const onChange = (event: Event) => {
      if (!(event.target instanceof HTMLSelectElement) || !window.matchMedia(AUTO_QUERY).matches) return;
      clearTimeout(timer);
      timer = setTimeout(() => form.requestSubmit(), SETTLE_MS);
    };
    form.addEventListener("change", onChange);
    return () => {
      clearTimeout(timer);
      form.removeEventListener("change", onChange);
      form.classList.remove("is-auto");
    };
  }, [formId]);
  return null;
}
