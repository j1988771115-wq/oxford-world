"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createCourseOrder, createProSubscription } from "@/lib/actions/payment";
import { Loader2 } from "lucide-react";

function CheckoutForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const formRef = useRef<HTMLFormElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function initPayment() {
      const type = searchParams.get("type"); // "course" or "pro"
      const courseId = searchParams.get("courseId");
      const billing = searchParams.get("billing") as "monthly" | "yearly" | null;

      let result;

      if (type === "course" && courseId) {
        result = await createCourseOrder(courseId);
      } else if (type === "pro") {
        result = await createProSubscription(billing || "monthly");
      } else {
        setError("無效的結帳請求");
        return;
      }

      if ("error" in result && result.error) {
        setError(result.error);
        return;
      }

      if ("freeGranted" in result && result.freeGranted) {
        router.replace("/dashboard?welcome=legacy");
        return;
      }

      if ("paymentForm" in result && result.paymentForm) {
        const form = formRef.current;
        if (!form) return;

        form.action = result.paymentForm.action;
        form.method = "POST";
        form.innerHTML = "";

        for (const [key, value] of Object.entries(result.paymentForm.fields)) {
          const input = document.createElement("input");
          input.type = "hidden";
          input.name = key;
          input.value = value;
          form.appendChild(input);
        }

        form.submit();
      }
    }

    initPayment();
  }, [searchParams]);

  if (error) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-surface px-8">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto">
            <span className="text-2xl">!</span>
          </div>
          <h1 className="text-2xl font-bold text-on-surface">{error}</h1>
          <a
            href="/pricing"
            className="inline-block px-8 py-3 rounded-xl font-bold text-white signature-gradient hover:opacity-90 transition-opacity"
          >
            回到方案頁面
          </a>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-surface">
      <div className="text-center space-y-4">
        <Loader2 size={48} className="animate-spin text-secondary mx-auto" />
        <p className="text-on-surface-variant font-medium">正在導向藍新金流付款頁面...</p>
        <p className="text-on-surface-variant text-sm">請勿關閉此頁面</p>
      </div>
      <form ref={formRef} className="hidden" />
    </main>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen flex items-center justify-center bg-surface">
          <Loader2 size={48} className="animate-spin text-secondary" />
        </main>
      }
    >
      <CheckoutForm />
    </Suspense>
  );
}
