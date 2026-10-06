import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "HikeMazi",
    short_name: "HikeMazi",
    description: "Βρες πεζοπορίες, γνώρισε παρέα και ανέβα βουνό μαζί.",
    start_url: "/",
    display: "standalone",
    background_color: "#f3f0e8",
    theme_color: "#16251c",
    lang: "el",
    categories: ["social", "sports", "travel"]
  };
}
