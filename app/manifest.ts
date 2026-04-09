import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Ravqen",
    short_name: "Ravqen",
    description:
      "Mobile-first guided training for commercial gym members who want structured solo workouts.",
    start_url: "/",
    display: "standalone",
    background_color: "#041014",
    theme_color: "#041014",
    icons: [
      {
        src: "/favicon.ico",
        sizes: "any",
        type: "image/x-icon",
      },
    ],
  };
}
