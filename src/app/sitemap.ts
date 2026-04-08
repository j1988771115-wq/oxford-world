import { MetadataRoute } from "next";
import { getCourses } from "@/lib/actions/courses";

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://oxford-vision.com";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticPages = [
    { url: BASE_URL, lastModified: new Date(), changeFrequency: "weekly" as const, priority: 1 },
    { url: `${BASE_URL}/courses`, lastModified: new Date(), changeFrequency: "daily" as const, priority: 0.9 },
    { url: `${BASE_URL}/pricing`, lastModified: new Date(), changeFrequency: "monthly" as const, priority: 0.8 },
    { url: `${BASE_URL}/about`, lastModified: new Date(), changeFrequency: "monthly" as const, priority: 0.5 },
    { url: `${BASE_URL}/insights`, lastModified: new Date(), changeFrequency: "daily" as const, priority: 0.7 },
    { url: `${BASE_URL}/quiz`, lastModified: new Date(), changeFrequency: "monthly" as const, priority: 0.8 },
    { url: `${BASE_URL}/privacy`, lastModified: new Date(), changeFrequency: "yearly" as const, priority: 0.2 },
    { url: `${BASE_URL}/terms`, lastModified: new Date(), changeFrequency: "yearly" as const, priority: 0.2 },
  ];

  const courses = await getCourses();
  const coursePages = courses.map((c: { slug: string; created_at: string }) => ({
    url: `${BASE_URL}/courses/${c.slug}`,
    lastModified: new Date(c.created_at),
    changeFrequency: "weekly" as const,
    priority: 0.8,
  }));

  return [...staticPages, ...coursePages];
}
