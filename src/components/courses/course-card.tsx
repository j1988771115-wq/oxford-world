import Link from "next/link";

interface CourseCardProps {
  slug: string;
  title: string;
  description: string | null;
  instructor: string;
  price: number;
  category: string | null;
  thumbnailUrl: string | null;
}

export function CourseCard({
  slug,
  title,
  description,
  instructor,
  price,
  category,
  thumbnailUrl,
}: CourseCardProps) {
  return (
    <Link
      href={`/courses/${slug}`}
      className="group block rounded-xl border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow"
    >
      <div className="aspect-video bg-gray-100 relative">
        {thumbnailUrl ? (
          <img
            src={thumbnailUrl}
            alt={title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400">
            <svg
              className="w-12 h-12"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
              />
            </svg>
          </div>
        )}
        {category && (
          <span className="absolute top-2 left-2 bg-white/90 backdrop-blur-sm text-xs px-2 py-1 rounded-full text-gray-700">
            {category}
          </span>
        )}
      </div>
      <div className="p-4">
        <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors line-clamp-2">
          {title}
        </h3>
        {description && (
          <p className="text-sm text-gray-500 mt-1 line-clamp-2">
            {description}
          </p>
        )}
        <div className="flex items-center justify-between mt-3">
          <span className="text-sm text-gray-500">{instructor}</span>
          <span className="font-semibold text-gray-900">
            {price === 0 ? "免費" : `NT$${price.toLocaleString()}`}
          </span>
        </div>
      </div>
    </Link>
  );
}
