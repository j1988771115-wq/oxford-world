const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
const DISCORD_GUILD_ID = process.env.DISCORD_GUILD_ID;
const DISCORD_PRO_ROLE_ID = process.env.DISCORD_PRO_ROLE_ID;

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

export function generateInviteUrl() {
  // Fallback invite URL — replace with your actual Discord invite
  return `https://discord.gg/your-invite`;
}
