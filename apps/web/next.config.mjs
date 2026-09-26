/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  // Old pages that moved: the FAQ is on /contact, services are on /about.
  async redirects() {
    return [
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

