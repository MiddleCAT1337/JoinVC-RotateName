import { resolveDisplayName, nowBangkok } from './schedule.js';

const GUILD_SYNC_DELAY_MS = 350;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function formatDiscordError(err) {
  const parts = [err.message];
  if (err.code) {
    parts.push(`code=${err.code}`);
  }
  if (err.status) {
    parts.push(`http=${err.status}`);
  }
  return parts.join(' ');
}

export async function syncGuild(client, guildConfig) {
  const { guildId, schedule, defaultName } = guildConfig;
  const targetName = resolveDisplayName(schedule, defaultName, nowBangkok());

  let guild;
  try {
    guild = await client.guilds.fetch(guildId);
  } catch {
    throw new Error(`Guild ${guildId}: bot is not in this server or id is invalid`);
  }

  const me = await guild.members.fetchMe();
  const currentNick = me.nickname ?? me.user.username;

  console.log(
    `[${guild.name}] schedule → "${targetName}" (now ${nowBangkok().toFormat('HH:mm')} Bangkok, current "${currentNick}")`,
  );

  if (currentNick === targetName) {
    return { guildId, guildName: guild.name, changed: false, name: targetName };
  }

  try {
    await guild.members.editMe({ nick: targetName });
  } catch (err) {
    throw new Error(
      `${formatDiscordError(err)} — ตรวจสิทธิ์บอทในเซิร์ฟ: Change Nickname`,
    );
  }

  const verified = await guild.members.fetchMe({ force: true });
  const after = verified.nickname ?? verified.user.username;
  if (after !== targetName) {
    console.warn(
      `[${guild.name}] API ตั้งชื่อแล้วแต่ Discord คืนค่า "${after}" — ลองรีเฟรช Discord / ดูในรายชื่อสมาชิกเซิร์ฟ (ไม่ใช่ชื่อแอป global)`,
    );
  } else {
    console.log(`[${guild.name}] nickname updated → "${after}"`);
  }

  return { guildId, guildName: guild.name, changed: true, name: after };
}

export async function syncAllGuilds(client, guilds) {
  const results = [];
  for (const guildConfig of guilds) {
    try {
      results.push(await syncGuild(client, guildConfig));
    } catch (err) {
      console.error(`[guild ${guildConfig.guildId}] sync failed: ${err.message}`);
      results.push({
        guildId: guildConfig.guildId,
        error: err.message,
      });
    }
    await sleep(GUILD_SYNC_DELAY_MS);
  }
  return results;
}
