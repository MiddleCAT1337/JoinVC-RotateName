import { readFileSync } from 'node:fs';
import { dirname, isAbsolute, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { isTimeInRange, parseTimeToMinutes } from './schedule.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = join(__dirname, '..');

const SNOWFLAKE_RE = /^\d{17,20}$/;
const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;
const MAX_NICK_LENGTH = 32;
const MINUTES_PER_DAY = 24 * 60;

function assertString(value, field) {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`${field} must be a non-empty string`);
  }
}

function validateTimeField(value, field) {
  assertString(value, field);
  if (!TIME_RE.test(value)) {
    throw new Error(`${field} must be HH:mm (00:00–23:59), got "${value}"`);
  }
}

function rangesOverlap(a, b) {
  for (let m = 0; m < MINUTES_PER_DAY; m += 1) {
    const inA = isTimeInRange(m, a.fromMin, a.toMin);
    const inB = isTimeInRange(m, b.fromMin, b.toMin);
    if (inA && inB) {
      return true;
    }
  }
  return false;
}

function validateScheduleEntry(entry, guildLabel, index) {
  const prefix = `${guildLabel} schedule[${index}]`;
  if (!entry || typeof entry !== 'object') {
    throw new Error(`${prefix} must be an object`);
  }
  validateTimeField(entry.from, `${prefix}.from`);
  validateTimeField(entry.to, `${prefix}.to`);
  assertString(entry.name, `${prefix}.name`);

  if (entry.name.length > MAX_NICK_LENGTH) {
    throw new Error(
      `${prefix}.name must be at most ${MAX_NICK_LENGTH} characters (Discord limit)`,
    );
  }
}

function validateGuild(guild, index) {
  const guildLabel = `guilds[${index}]`;
  if (!guild || typeof guild !== 'object') {
    throw new Error(`${guildLabel} must be an object`);
  }
  assertString(guild.guildId, `${guildLabel}.guildId`);
  if (!SNOWFLAKE_RE.test(guild.guildId)) {
    throw new Error(`${guildLabel}.guildId must be a Discord snowflake id`);
  }
  if (guild.defaultName !== undefined) {
    assertString(guild.defaultName, `${guildLabel}.defaultName`);
    if (guild.defaultName.length > MAX_NICK_LENGTH) {
      throw new Error(
        `${guildLabel}.defaultName must be at most ${MAX_NICK_LENGTH} characters`,
      );
    }
  }
  if (guild.voiceChannelId !== undefined) {
    assertString(guild.voiceChannelId, `${guildLabel}.voiceChannelId`);
    if (!SNOWFLAKE_RE.test(guild.voiceChannelId)) {
      throw new Error(`${guildLabel}.voiceChannelId must be a Discord snowflake id`);
    }
  }
  if (!Array.isArray(guild.schedule) || guild.schedule.length === 0) {
    throw new Error(`${guildLabel}.schedule must be a non-empty array`);
  }

  guild.schedule.forEach((entry, i) => validateScheduleEntry(entry, guildLabel, i));

  const parsed = guild.schedule.map((entry, i) => ({
    index: i,
    fromMin: parseTimeToMinutes(entry.from),
    toMin: parseTimeToMinutes(entry.to),
  }));

  for (let i = 0; i < parsed.length; i += 1) {
    for (let j = i + 1; j < parsed.length; j += 1) {
      if (rangesOverlap(parsed[i], parsed[j])) {
        throw new Error(
          `${guildLabel}.schedule[${parsed[i].index}] and [${parsed[j].index}] overlap — each minute must belong to at most one range`,
        );
      }
    }
  }
}

export function validateConfig(raw) {
  if (!raw || typeof raw !== 'object') {
    throw new Error('Config root must be a JSON object');
  }

  assertString(raw.token, 'token');

  if (!Array.isArray(raw.guilds) || raw.guilds.length === 0) {
    throw new Error('Config must include a non-empty "guilds" array');
  }

  raw.guilds.forEach((guild, i) => validateGuild(guild, i));

  return raw;
}

function resolveConfigPath(configPath) {
  const envPath = process.env.CONFIG_PATH;
  if (configPath) {
    return isAbsolute(configPath) ? configPath : resolve(PROJECT_ROOT, configPath);
  }
  if (envPath) {
    return isAbsolute(envPath) ? envPath : resolve(PROJECT_ROOT, envPath);
  }
  return join(PROJECT_ROOT, 'config.json');
}

export function loadConfig(configPath) {
  const resolvedPath = resolveConfigPath(configPath);
  let raw;
  try {
    raw = JSON.parse(readFileSync(resolvedPath, 'utf8'));
  } catch (err) {
    throw new Error(`Failed to read config at ${resolvedPath}: ${err.message}`);
  }

  validateConfig(raw);

  return {
    token: raw.token.trim(),
    guilds: raw.guilds.map((g) => ({
      guildId: g.guildId,
      voiceChannelId: g.voiceChannelId,
      defaultName: g.defaultName,
      schedule: g.schedule.map((s) => ({ from: s.from, to: s.to, name: s.name })),
    })),
  };
}

export { MAX_NICK_LENGTH, PROJECT_ROOT };
