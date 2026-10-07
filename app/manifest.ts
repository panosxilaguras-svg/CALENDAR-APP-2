import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "ORIVATIS",
    short_name: "ORIVATIS",
    description: "Βρες πεζοπορίες, γνώρισε παρέα και ανέβα βουνό μαζί.",
    start_url: "/",
    display: "standalone",
    background_color: "#f3f0e8",
    theme_color: "#16251c",
    lang: "el",
    categories: ["social", "sports", "travel"],
    icons: [
      { src: "/orivatis-icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" }
    ]
  };
}
