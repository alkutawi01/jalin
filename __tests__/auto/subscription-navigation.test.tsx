import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { test } from "node:test";
import { publicNavLinks, SiteNavLinks } from "../../src/components/reader/nav-links";
import MobileNavMenu from "../../src/components/reader/MobileNavMenu";
import AccountPanel from "../../src/components/reader/AccountPanel";
import { purchaseStatus } from "../../src/lib/subscription/prices";

test("desktop and phone menus show a single active subscription link only when buying is available", () => {
  for (const visitor of [false, true]) {
    for (const enabled of [false, true]) {
      for (const variant of ["bar", "list"] as const) {
        const html = renderToStaticMarkup(<SiteNavLinks active="langgan" className="test-nav" links={publicNavLinks(visitor, enabled)} variant={variant} />);
        assert.equal((html.match(/href="\/beli"/g) ?? []).length, enabled ? 1 : 0);
        if (enabled) assert.match(html, /aria-current="page" href="\/beli">Langgan</);
        assert.match(html, /href="\/editorial"/);
        assert.match(html, /href="\/tentang"/);
        if (variant === "list") assert.equal(html.includes('href="/kategori/cerpen"'), !visitor);
        else assert.equal(html.includes("Kandungan"), !visitor); // Desktop category links live in the closed popover.
      }
      const mobile = renderToStaticMarkup(<MobileNavMenu visitor={visitor} purchasesEnabled={enabled} />);
      assert.equal((mobile.match(/href="\/beli"/g) ?? []).length, enabled ? 1 : 0);
      assert.match(mobile, /<summary>Menu<\/summary>/);
    }
  }
});

test("incomplete purchase configuration keeps the subscription menu link hidden", () => {
  // Only fabricated values are supplied; no environment file or network is read.
  const complete = { READER_ACCOUNTS_ENABLED: "yes", PURCHASES_ENABLED: "yes", PAYMENT_PROVIDER: "chip", CHIP_SECRET_KEY: "fixture", CHIP_BRAND_ID: "00000000-0000-0000-0000-000000000001", PLAN_PRICES_MYR: "1=15,6=30,12=50" };
  assert.equal(purchaseStatus(complete).enabled, true);
  for (const key of ["READER_ACCOUNTS_ENABLED", "PURCHASES_ENABLED", "CHIP_SECRET_KEY", "CHIP_BRAND_ID", "PLAN_PRICES_MYR"] as const) {
    const state = purchaseStatus({ ...complete, [key]: "" });
    assert.equal(state.enabled, false);
    assert.equal(publicNavLinks(false, state.enabled).some((link) => link.href === "/beli"), false);
  }
});

test("account purchase link follows server availability while redeem, status and dates remain visible", () => {
  const props: React.ComponentProps<typeof AccountPanel> = {
    email: "reader@example.invalid", displayName: null,
    access: { state: "subscribed", endsAt: "2027-12-31T12:00:00Z", currentPeriodEndsAt: "2027-12-31T12:00:00Z" },
    thisDeviceId: "fixture", devices: [], trialAvailable: false, history: [], reading: [], saved: [],
    prefs: { fontSizePx: 18, lineHeightX100: 175, textWidthCh: 68, theme: "cerah", fontFamily: "serif", dimPercent: 0 },
  };
  for (const enabled of [false, true]) {
    const html = renderToStaticMarkup(<AccountPanel {...props} purchasesEnabled={enabled} />);
    assert.equal((html.match(/href="\/beli"/g) ?? []).length, enabled ? 1 : 0);
    if (enabled) assert.match(html, />Beli kod<\/a>/);
    assert.match(html, /href="\/tebus">Tebus kod langganan<\/a>/);
    assert.match(html, /Langganan aktif sehingga/);
    assert.match(html, /2027/);
  }
});
