/**
 * Headers sent with every response. No Content-Security-Policy yet: the pages carry inline JSON-LD and Next's own
 * inline scripts, so a CSP needs nonces and its own testing; the rest are safe as they are.
 */
export const securityHeaders = [
  // Nobody has a reason to put Jalin (or its admin) inside another site's frame.
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()" }
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false,
  // A second dev server (a test run, another session) can use its own build folder: NEXT_DIST_DIR=.next-test npx next dev -p 3100
  distDir: process.env.NEXT_DIST_DIR || ".next",
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  images: {
    // Uploaded/generated visuals live in Vercel Blob (public store).
    remotePatterns: [{ protocol: "https", hostname: "*.public.blob.vercel-storage.com" }],
    qualities: [75, 85]
  }
};

export default nextConfig;
