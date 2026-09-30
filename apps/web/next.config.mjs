/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  transpilePackages: ["@repo/ui"],
  // Old pages that moved: the FAQ is on /contact, services are on /about.
  async redirects() {
    return [
      // One address for search engines: www redirects to the main domain.
      {
        source: "/:path*",
        has: [{ type: "host", value: "www.jaxis-statlab.com" }],
        destination: "https://jaxis-statlab.com/:path*",
        permanent: true,
      },
      { source: "/faq", destination: "/contact#faq", permanent: true },
      { source: "/services", destination: "/about", permanent: true },
    ];
  },
  experimental: {
    optimizePackageImports: [
      "lucide-react",
      "three",
      "@react-three/drei",
      "@react-three/fiber",
      "gsap",
      "clsx",
      "tailwind-merge",
    ],
  },
  onDemandEntries: {
    maxInactiveAge: 60 * 1000,
    pagesBufferLength: 2,
  },
};

export default nextConfig;

