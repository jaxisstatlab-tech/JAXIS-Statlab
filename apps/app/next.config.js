/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    optimizePackageImports: [
      "@tabler/icons-react",
      "@aws-sdk/client-s3",
      "@aws-sdk/s3-request-presigner",
      "@supabase/supabase-js",
      "zod",
      "resend",
    ],
  },
  onDemandEntries: {
    maxInactiveAge: 120 * 1000,
    pagesBufferLength: 5,
  },
};

export default nextConfig;

