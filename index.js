import cron from 'node-cron';
import { Client, GatewayIntentBits, Events } from 'discord.js';
import { loadConfig } from './src/config.js';
import { syncAllGuilds } from './src/sync.js';
import { startVoiceJoinInBackground, stopAllVoiceLoops } from './src/voice.js';
import { TIMEZONE } from './src/schedule.js';

let config;
try {
  config = loadConfig();
} catch (err) {
  console.error(`Config error: ${err.message}`);
  process.exit(1);
}

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates],
});

let cronTask = null;

client.once(Events.ClientReady, async (readyClient) => {
  console.log(`Logged in as ${readyClient.user.tag} (${TIMEZONE} schedule)`);
  await syncAllGuilds(client, config.guilds);
  startVoiceJoinInBackground(client, config.guilds);

  cronTask = cron.schedule(
    '* * * * *',
    () => {
      syncAllGuilds(client, config.guilds).catch((err) => {
        console.error(`Scheduled sync error: ${err.message}`);
      });
    },
    { timezone: TIMEZONE },
  );

  console.log('Minute scheduler started (Asia/Bangkok)');
});

client.on('error', (err) => {
  console.error(`Discord client error: ${err.message}`);
});

async function shutdown(signal) {
  console.log(`Shutting down (${signal})…`);
  if (cronTask) {
    cronTask.stop();
  }
  stopAllVoiceLoops(config.guilds);
  await new Promise((r) => setTimeout(r, 500));
  client.destroy();
  process.exit(0);
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

client.login(config.token).catch((err) => {
  console.error(`Login failed: ${err.message}`);
  process.exit(1);
});
