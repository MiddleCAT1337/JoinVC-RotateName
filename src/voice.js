import { ChannelType } from 'discord.js';
import {
  joinVoiceChannel,
  getVoiceConnection,
  VoiceConnectionStatus,
  entersState,
} from '@discordjs/voice';

const READY_MS = 30_000;

async function joinIdleVoice(client, guildId, voiceChannelId) {
  const guild = await client.guilds.fetch(guildId);
  const channel = await guild.channels.fetch(voiceChannelId);

  if (!channel) {
    throw new Error(`ไม่พบห้องเสียง ${voiceChannelId}`);
  }
  if (channel.type !== ChannelType.GuildVoice && channel.type !== ChannelType.GuildStageVoice) {
    throw new Error(`ช่อง ${voiceChannelId} ไม่ใช่ห้องเสียง`);
  }

  const connection = joinVoiceChannel({
    channelId: channel.id,
    guildId: guild.id,
    adapterCreator: guild.voiceAdapterCreator,
    selfMute: true,
    selfDeaf: true,
  });

  connection.on('error', (err) => {
    console.error(`[${guild.name}] voice: ${err.message}`);
  });

  connection.on(VoiceConnectionStatus.Disconnected, async () => {
    try {
      await Promise.race([
        entersState(connection, VoiceConnectionStatus.Signalling, 5_000),
        entersState(connection, VoiceConnectionStatus.Connecting, 5_000),
      ]);
    } catch {
      connection.destroy();
    }
  });

  await entersState(connection, VoiceConnectionStatus.Ready, READY_MS);
  console.log(`[${guild.name}] voice: อยู่ใน #${channel.name} (ปิดไมค์+ปิดหู)`);
}

export function startVoiceJoinInBackground(client, guilds) {
  for (const { guildId, voiceChannelId } of guilds) {
    if (!voiceChannelId) {
      continue;
    }
    joinIdleVoice(client, guildId, voiceChannelId).catch((err) => {
      console.error(`[guild ${guildId}] voice: ${err.message}`);
    });
  }
}

export function stopAllVoiceLoops(guilds) {
  for (const { guildId } of guilds) {
    getVoiceConnection(guildId)?.destroy();
  }
}
