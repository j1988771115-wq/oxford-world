"use client";

import { useState } from "react";
import { subscribeEmail } from "@/lib/actions/email";

export function EmailCaptureForm() {
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("loading");

    const formData = new FormData(e.currentTarget);
    const result = await subscribeEmail(formData);

    if (result.error) {
      setStatus("error");
      setErrorMsg(result.error);
    } else {
      setStatus("success");
    }
  }

  if (status === "success") {
    return (
      <div className="text-center py-4">
        <p className="text-green-600 font-medium">✓ 訂閱成功！每週會收到 AI 學習週報。</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <input
        type="email"
        name="email"
        required
        placeholder="your@email.com"
        className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
        disabled={status === "loading"}
      />
      <button
        type="submit"
        disabled={status === "loading"}
        className="bg-black text-white px-6 py-3 rounded-lg font-medium hover:bg-gray-800 transition whitespace-nowrap disabled:opacity-50"
      >
        {status === "loading" ? "送出中..." : "訂閱"}
      </button>
      {status === "error" && (
        <p className="text-red-500 text-sm mt-1">{errorMsg}</p>
      )}
    </form>
  );
}
