import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Ripzy",
    short_name: "Ripzy",
    description: "Premium modern e-commerce — curated electronics and workspace gear.",
    start_url: "/",
    display: "standalone",
    background_color: "#fbf8f7",
    theme_color: "#bf4268",
    icons: [
      { src: "/icons/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
      { src: "/icons/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "maskable" },
    ],
  };
}
