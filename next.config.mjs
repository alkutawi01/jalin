/**
 * Headers sent with every response. No Content-Security-Policy yet: the pages carry inline JSON-LD and Next's own
 * inline scripts, so a CSP needs nonces and its own testing; the rest are safe as they are.
 */
export const securityHeaders = [
  // Nobody has a reason to put Jalin (or its admin) inside another site's frame.
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
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
    // Hostinger release branch: Vercel added Strict-Transport-Security itself; Hostinger does not.
    return [{ source: "/:path*", headers: [...securityHeaders, { key: "Strict-Transport-Security", value: "max-age=63072000" }] }];
  },
  images: {
    // Uploaded/generated visuals live in Vercel Blob (public store).
    remotePatterns: [{ protocol: "https", hostname: "*.public.blob.vercel-storage.com" }],
    qualities: [75, 85],
    // Hostinger release branch: no image CDN in front, so optimised images must stay cached on the server. The default is 60 s, which
    // re-optimised every size every minute (about 1.4 s of CPU each). Visual file names carry a version and hash, so a year is safe.
    minimumCacheTTL: 31536000,
    // Fewer widths means fewer variants to generate on a shared CPU.
    deviceSizes: [640, 1080, 1920]
  }
};

export default nextConfig;
