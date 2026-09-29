/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    // Uploaded/generated visuals live in Vercel Blob (public store).
    remotePatterns: [{ protocol: "https", hostname: "*.public.blob.vercel-storage.com" }]
  }
};

export default nextConfig;
