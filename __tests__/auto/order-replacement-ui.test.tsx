import assert from "node:assert/strict";
import { test } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { AppRouterContext, type AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";
import OrdersTable from "../../src/app/admin/langganan/pesanan/OrdersTable";

const router: AppRouterInstance = { back() {}, forward() {}, refresh() {}, push() {}, replace() {}, async prefetch() {} };
const fixture = {
  id: "00000000-0000-0000-0000-000000000001", reference: "JP-AAAAAAAAAA", months: 6, amountSen: 3000,
  email: "fixture@example.invalid", status: "PAID", deliveryStatus: "SENT", deliveryAttempts: 1,
  lastDeliveryError: null, serial: "FIXTURE-SERIAL", createdAt: "2026-11-06T00:00:00Z", paidAt: "2026-11-06T00:00:00Z", deliveredAt: "2026-11-06T00:00:00Z", note: null, canReplace: true,
};
const render = (orders: (typeof fixture)[]) => renderToStaticMarkup(<AppRouterContext.Provider value={router}><OrdersTable initialOrders={orders} /></AppRouterContext.Provider>);

test("only an eligible sent order offers replacement; pending orders offer retry", () => {
  const eligible = render([fixture]);
  assert.match(eligible, />Ganti kod e-mel<\/button>/);
  assert.doesNotMatch(eligible, />Hantar semula e-mel<\/button>/);
  assert.match(eligible, /Diterima penyedia e-mel/);
  for (const status of ["PENDING", "PAID", "CANCELLED"]) {
    const unavailable = render([{ ...fixture, status, canReplace: false }]);
    assert.doesNotMatch(unavailable, />Ganti kod e-mel<\/button>/);
  }
  const waiting = render([{ ...fixture, canReplace: false, deliveryStatus: "PENDING" }]);
  assert.match(waiting, />Hantar semula e-mel<\/button>/);
  assert.doesNotMatch(waiting, />Ganti kod e-mel<\/button>/);
});

test("phone cards retain all six visible labels and order details", () => {
  const html = render([fixture]);
  for (const label of ["Pesanan", "Tempoh", "Jumlah", "Status", "E-mel kod", "Tindakan"]) assert.ok(html.includes(`data-label="${label}"`));
  for (const detail of [fixture.reference, fixture.email, "6 bulan", "RM30.00"]) assert.ok(html.includes(detail));
  assert.doesNotMatch(html, /code_cipher|code_mac|canonical|undefined/);
});

test("the empty order list has no replacement action", () => {
  const html = render([]);
  assert.match(html, /Belum ada pesanan/);
  assert.doesNotMatch(html, /Ganti kod e-mel/);
});
