import type { MetadataRoute } from "next";

// Внутренняя CRM клуба — в поиске ей не место.
export default function robots(): MetadataRoute.Robots {
  return { rules: { userAgent: "*", disallow: "/" } };
}
