import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Padrão é 1MB — pequeno demais para plantas de projeto, planilhas de
      // orçamento e fotos de nota fiscal enviadas via Lançar Gasto.
      bodySizeLimit: "50mb",
    },
  },
};

export default nextConfig;
