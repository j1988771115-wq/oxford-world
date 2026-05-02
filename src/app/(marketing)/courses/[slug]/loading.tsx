// 課程詳情 skeleton — TTFB 期間用戶看到結構而非白屏,體感變快
export default function CourseDetailLoading() {
  return (
    <main className="pt-12 pb-20 px-8 max-w-[1440px] mx-auto animate-pulse">
      {/* Breadcrumb skeleton */}
      <div className="h-4 w-48 bg-surface-container rounded mb-8" />
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
        {/* Left */}
        <div className="lg:col-span-7 space-y-12">
          <div>
            <div className="h-12 w-3/4 bg-surface-container rounded mb-4" />
            <div className="h-12 w-1/2 bg-surface-container rounded mb-6" />
            <div className="h-6 w-24 bg-surface-container rounded mb-4" />
            <div className="h-4 w-32 bg-surface-container rounded" />
          </div>
          <div>
            <div className="h-8 w-24 bg-surface-container rounded mb-4" />
            <div className="h-4 w-full bg-surface-container rounded mb-2" />
            <div className="h-4 w-full bg-surface-container rounded mb-2" />
            <div className="h-4 w-2/3 bg-surface-container rounded" />
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="h-48 bg-surface-container rounded-xl" />
            <div className="h-48 bg-surface-container rounded-xl" />
          </div>
          <div>
            <div className="h-8 w-32 bg-surface-container rounded mb-6" />
            <div className="space-y-3">
              {[...Array(9)].map((_, i) => (
                <div key={i} className="h-20 bg-surface-container rounded-xl" />
              ))}
            </div>
          </div>
        </div>
        {/* Right sidebar */}
        <div className="lg:col-span-5">
          <div className="bg-surface-container-lowest rounded-xl deep-diffusion overflow-hidden">
            <div className="aspect-video bg-surface-container" />
            <div className="p-8 space-y-6">
              <div className="h-12 w-40 bg-surface-container rounded" />
              <div className="space-y-3">
                <div className="h-14 bg-surface-container rounded-xl" />
                <div className="h-12 bg-surface-container rounded-xl" />
              </div>
              <div className="grid grid-cols-2 gap-4 pt-6 border-t border-outline-variant/20">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="h-12 bg-surface-container rounded" />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
