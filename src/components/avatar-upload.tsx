"use client";

import { useState, useRef } from "react";
import { Camera } from "lucide-react";

interface AvatarUploadProps {
  currentUrl?: string | null;
  displayName?: string;
  onUploaded?: (url: string) => void;
}

export function AvatarUpload({
  currentUrl,
  displayName,
  onUploaded,
}: AvatarUploadProps) {
  const [avatarUrl, setAvatarUrl] = useState(currentUrl);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const initial = (displayName || "U")[0];

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError("");

    const formData = new FormData();
    formData.append("avatar", file);

    const res = await fetch("/api/avatar", {
      method: "POST",
      body: formData,
    });

    const data = await res.json();

    if (res.ok) {
      setAvatarUrl(data.url);
      onUploaded?.(data.url);
    } else {
      setError(data.error || "上傳失敗");
    }

    setUploading(false);
  };

  return (
    <div className="flex items-center gap-5">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className="relative group shrink-0"
      >
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt="頭像"
            className="w-20 h-20 rounded-2xl object-cover shadow-md"
          />
        ) : (
          <div className="w-20 h-20 rounded-2xl signature-gradient flex items-center justify-center text-white font-black text-2xl shadow-md">
            {initial}
          </div>
        )}
        <div className="absolute inset-0 rounded-2xl bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          <Camera size={20} className="text-white" />
        </div>
        {uploading && (
          <div className="absolute inset-0 rounded-2xl bg-black/60 flex items-center justify-center">
            <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </button>

      <div>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="text-secondary text-sm font-bold hover:underline disabled:opacity-50"
        >
          {uploading ? "上傳中..." : avatarUrl ? "更換頭像" : "上傳頭像"}
        </button>
        <p className="text-xs text-on-surface-variant mt-1">
          JPG、PNG，最大 2MB
        </p>
        {error && (
          <p className="text-xs text-red-500 mt-1">{error}</p>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleUpload}
        className="hidden"
      />
    </div>
  );
}
