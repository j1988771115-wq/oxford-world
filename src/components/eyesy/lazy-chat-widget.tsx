"use client";

import dynamic from "next/dynamic";

// 對話面板含 @ai-sdk/react + stream parsing,共 ~200KB+ JS。
// 用 dynamic + ssr:false → 只在 client 端 hydrate 完才開始 fetch,不阻塞初始 render
// 不開聊天也不用付這 200KB cold-load 的代價。
const EyesyChatWidget = dynamic(
  () => import("./chat-widget").then((m) => m.EyesyChatWidget),
  { ssr: false }
);

export function LazyEyesyChatWidget() {
  return <EyesyChatWidget />;
}
