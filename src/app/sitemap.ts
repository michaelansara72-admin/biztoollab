import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = "https://biztoollab.com";
  const lastModified = new Date();

  return [
    {
      url: baseUrl,
      lastModified,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${baseUrl}/calculators/laundromat-profit-calculator`,
      lastModified,
      changeFrequency: "monthly",
      priority: 0.9,
    },
    {
  url: `${baseUrl}/calculators/vending-machine-profit-calculator`,
  lastModified,
  changeFrequency: "monthly",
  priority: 0.9,
},
{
  url: `${baseUrl}/calculators/startup-cost-calculator`,
  lastModified,
  changeFrequency: "monthly",
  priority: 0.9,
},
{
  url: `${baseUrl}/calculators/break-even-calculator`,
  lastModified,
  changeFrequency: "monthly",
  priority: 0.9,
},
{
  url: `${baseUrl}/about`,
  lastModified,
  changeFrequency: "monthly",
  priority: 0.6,
},
    {
      url: `${baseUrl}/privacy`,
      lastModified,
      changeFrequency: "yearly",
      priority: 0.4,
    },
    {
      url: `${baseUrl}/terms`,
      lastModified,
      changeFrequency: "yearly",
      priority: 0.4,
    },
    {
      url: `${baseUrl}/contact`,
      lastModified,
      changeFrequency: "monthly",
      priority: 0.5,
    },
  ];
}