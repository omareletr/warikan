/** @type {import('next').NextConfig} */
const isNativeExport =
  process.env.NEXT_OUTPUT === "export" ||
  process.env.NEXT_PUBLIC_NATIVE_BUILD === "true";

const nextConfig = {
  // Normal Netlify builds intentionally do not use "output: export" because
  // @netlify/plugin-nextjs handles dynamic API routes (room + parse-receipt).
  ...(isNativeExport ? { output: "export" } : {}),

  // Keep images unoptimized since we don't use next/image in most places.
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
