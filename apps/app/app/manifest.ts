import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "JAXIS StatLab Workspace",
    short_name: "JAXIS Studio",
    description: "Interactive statistical analysis tool, dataset workspace, and data modeling dashboard.",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#010114",
    theme_color: "#CC6600",
    icons: [
      {
        src: "/favicon-48x48.png",
        sizes: "48x48",
        type: "image/png",
      },
      {
        src: "/favicon-96x96.png",
        sizes: "96x96",
        type: "image/png",
      },
      {
        src: "/android-chrome-192x192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/android-chrome-512x512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}
