"use client";

export function EyesyCTAButton() {
  return (
    <button
      onClick={() => {
        const btn = document.querySelector(
          "[data-eyesy-trigger]"
        ) as HTMLButtonElement;
        if (btn) btn.click();
      }}
      className="signature-gradient text-white px-8 py-4 rounded-xl font-bold text-lg shadow-xl shadow-secondary/20 hover:scale-[1.02] transition-transform text-center cursor-pointer"
    >
      跟 Eyesy 聊聊
    </button>
  );
}
