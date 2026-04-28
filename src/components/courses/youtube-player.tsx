"use client";

function extractYouTubeId(url: string): string | null {
  const patterns = [
    /youtu\.be\/([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
  ];
  for (const re of patterns) {
    const m = url.match(re);
    if (m) return m[1];
  }
  return null;
}

export function YouTubePlayer({ url, title }: { url: string; title: string }) {
  const id = extractYouTubeId(url);
  if (!id) {
    return (
      <div className="w-full h-full flex items-center justify-center text-slate-400">
        <p>影片網址無法解析</p>
      </div>
    );
  }
  const src = `https://www.youtube.com/embed/${id}?rel=0&modestbranding=1`;
  return (
    <iframe
      src={src}
      title={title}
      className="w-full aspect-video"
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
      allowFullScreen
    />
  );
}
