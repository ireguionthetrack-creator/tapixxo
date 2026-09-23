import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Las imágenes que se suben desde el editor viven en el bucket público de
    // Supabase. Permitimos únicamente ese origen para que Next las entregue
    // redimensionadas y en formatos modernos según cada pantalla.
    remotePatterns: [
      {
        protocol: "https",
        hostname: "hryhinxqajtxvzrmveyv.supabase.co",
        pathname: "/storage/v1/object/public/menu-images/**",
      },
    ],
    formats: ["image/avif", "image/webp"],
    qualities: [60, 70, 75],
    imageSizes: [64, 96, 128, 160, 256, 384],
  },
};

export default nextConfig;
