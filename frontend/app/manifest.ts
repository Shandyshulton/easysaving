import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "EasySaving",
    short_name: "EasySaving",
    description:
      "Dashboard keuangan pribadi untuk mencatat pemasukan, pengeluaran, rekening, kategori, dan laporan.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#047857",
    categories: ["finance", "productivity"],
    lang: "id",
    icons: [
      {
        src: "/logo-easysaving.png",
        sizes: "any",
        type: "image/png",
        purpose: "any"
      },
      {
        src: "/tab-easysaving.png",
        sizes: "any",
        type: "image/png",
        purpose: "any"
      },
      {
        src: "/tab-easysaving.png",
        sizes: "any",
        type: "image/png",
        purpose: "maskable"
      }
    ]
  };
}
