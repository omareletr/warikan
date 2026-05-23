/** @type {import('next').NextConfig} */
const nextConfig = {
  // No "output: export" — @netlify/plugin-nextjs handles the deployment format
  // and requires server-side support for dynamic API routes (room + parse-receipt).

  // Keep images unoptimized since we don't use next/image in most places.
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
