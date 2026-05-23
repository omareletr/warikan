/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "export",

  // Next.js image optimisation requires a server — disabled for static export.
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
