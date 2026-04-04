"use client";

import { useState } from "react";
import { subscribeEmail } from "@/lib/actions/email";

export function EmailCaptureForm() {
  const [status, setStatus] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle");
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
        <p className="text-emerald-400 font-bold">
          訂閱成功！每週會收到 AI 學習週報。
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <input
        type="email"
        name="email"
        required
        placeholder="輸入您的電子郵件"
        className="w-full bg-white/5 border border-white/10 rounded-xl px-6 py-5 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-secondary-container transition-all"
        disabled={status === "loading"}
      />
      <button
        type="submit"
        disabled={status === "loading"}
        className="signature-gradient text-white px-8 py-5 rounded-xl font-bold text-lg hover:brightness-110 active:scale-95 transition-all disabled:opacity-50"
      >
        {status === "loading" ? "送出中..." : "立即訂閱"}
      </button>
      {status === "error" && (
        <p className="text-red-400 text-sm">{errorMsg}</p>
      )}
    </form>
  );
}
