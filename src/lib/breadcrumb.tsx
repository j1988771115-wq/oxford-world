// 共用的 BreadcrumbList JSON-LD 元件
// Google 搜尋結果會用這個的 item.name 取代預設 URL 路徑顯示
// (例如「oxford-vision.com › sign-in」→「牛津視界 › 登入」)

interface Crumb {
  name: string;
  url?: string;
}

const SITE = "https://oxford-vision.com";

export function BreadcrumbJsonLd({ crumbs }: { crumbs: Crumb[] }) {
  const items = [
    { name: "牛津視界", url: SITE },
    ...crumbs.map((c) => ({ name: c.name, url: c.url ? `${SITE}${c.url.startsWith("/") ? c.url : "/" + c.url}` : undefined })),
  ];

  const json = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: it.name,
      ...(it.url ? { item: it.url } : {}),
    })),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(json) }}
    />
  );
}
