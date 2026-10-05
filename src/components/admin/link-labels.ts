/**
 * A `<label>` followed by a box in the same `.admin-form-group` but not tied to it (no `for`, not wrapping it) is read by a screen reader
 * as an unnamed field, and clicking the label does not focus the box. Many admin forms are written that way; this ties each such pair.
 * Returns how many pairs it linked.
 */
let counter = 0;

export function linkLabels(root: ParentNode): number {
  let linked = 0;
  root.querySelectorAll<HTMLElement>(".admin-form-group").forEach((group) => {
    const label = group.querySelector<HTMLLabelElement>(":scope > label");
    if (!label || label.htmlFor || label.querySelector("input,select,textarea")) return;
    const control = group.querySelector<HTMLElement>(":scope > input:not([type=hidden]):not([type=checkbox]):not([type=radio]), :scope > select, :scope > textarea");
    if (!control || control.getAttribute("aria-label") || control.getAttribute("aria-labelledby")) return;
    if (!control.id) control.id = `a-field-${++counter}`;
    label.htmlFor = control.id;
    linked++;
  });
  return linked;
}
