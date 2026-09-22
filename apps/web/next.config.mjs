/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  experimental: {
    optimizePackageImports: [
      "lucide-react",
      "three",
      "@react-three/drei",
      "@react-three/fiber",
      "gsap",
      "lenis",
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

