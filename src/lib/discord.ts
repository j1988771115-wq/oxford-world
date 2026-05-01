// .trim() 防 Vercel env 帶 \n
const DISCORD_BOT_TOKEN = (process.env.DISCORD_BOT_TOKEN || "").trim();
const DISCORD_GUILD_ID = (process.env.DISCORD_GUILD_ID || "").trim();
const DISCORD_PRO_ROLE_ID = (process.env.DISCORD_PRO_ROLE_ID || "").trim();

const DISCORD_API = "https://discord.com/api/v10";

async function discordFetch(path: string, options: RequestInit = {}) {
  const res = await fetch(`${DISCORD_API}${path}`, {
    ...options,
    headers: {
      Authorization: `Bot ${DISCORD_BOT_TOKEN}`,
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (!res.ok) {
    const error = await res.text();
    console.error(`Discord API error: ${res.status}`, error);
    return null;
  }

  if (res.status === 204) return {};
  return res.json();
}

export async function addProRole(discordUserId: string) {
  if (!DISCORD_BOT_TOKEN || !DISCORD_GUILD_ID || !DISCORD_PRO_ROLE_ID) {
    console.warn("Discord env vars not configured, skipping role assignment");
    return false;
  }

  const result = await discordFetch(
    `/guilds/${DISCORD_GUILD_ID}/members/${discordUserId}/roles/${DISCORD_PRO_ROLE_ID}`,
    { method: "PUT" }
  );

  return result !== null;
}

export async function removeProRole(discordUserId: string) {
  if (!DISCORD_BOT_TOKEN || !DISCORD_GUILD_ID || !DISCORD_PRO_ROLE_ID) {
    return false;
  }

  const result = await discordFetch(
    `/guilds/${DISCORD_GUILD_ID}/members/${discordUserId}/roles/${DISCORD_PRO_ROLE_ID}`,
    { method: "DELETE" }
  );

  return result !== null;
}

export async function sendChannelMessage(channelId: string, content: string) {
  return discordFetch(`/channels/${channelId}/messages`, {
    method: "POST",
    body: JSON.stringify({ content }),
  });
}

interface OrderNotificationParams {
  buyerEmail: string;
  buyerName?: string | null;
  itemTitle: string;
  amount: number;
  orderType: "course" | "subscription";
  merchantOrderNo: string;
  proBundleDays?: number;
}

/** 寄新訂單通知到內部 Discord 頻道。env: DISCORD_ORDER_CHANNEL_ID 未設定則 skip。 */
export async function notifyOrderToDiscord(p: OrderNotificationParams): Promise<boolean> {
  const channelId = process.env.DISCORD_ORDER_CHANNEL_ID;
  if (!channelId || !DISCORD_BOT_TOKEN) {
    console.warn("Discord order notification skipped (channel/bot not configured)");
    return false;
  }

  const emoji = p.orderType === "course" ? "💎" : "✨";
  const typeLabel = p.orderType === "course" ? "課程購買" : "Pro 訂閱";
  const buyer = p.buyerName ? `${p.buyerName} <${p.buyerEmail}>` : p.buyerEmail;
  const bundle = p.proBundleDays ? `\n🎁 加贈 Pro **${p.proBundleDays} 天**` : "";

  const content =
    `${emoji} **新${typeLabel}**\n` +
    `**項目**：${p.itemTitle}\n` +
    `**金額**：NT$${p.amount.toLocaleString()}\n` +
    `**買家**：${buyer}\n` +
    `**訂單**：\`${p.merchantOrderNo}\`${bundle}`;

  const result = await sendChannelMessage(channelId, content);
  return result !== null;
}

export function generateInviteUrl() {
  // Fallback invite URL — replace with your actual Discord invite
  return `https://discord.gg/your-invite`;
}
