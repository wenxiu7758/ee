import express from 'express';
import http from 'http';
import fs from 'fs';
import path from 'path';
import module from 'node:module';
import dotenv from 'dotenv';

// Patch createRequire for bundlers (like esbuild/vite) that pass '.' as __dirname to createRequire
const origCreateRequire = module.createRequire;
module.createRequire = function (target: string | URL) {
  if (typeof target === 'string' && (target === '.' || target === './' || !path.isAbsolute(target))) {
    try {
      new URL(target);
    } catch {
      target = path.resolve(process.cwd(), target, 'package.json');
    }
  }
  return origCreateRequire(target);
};

// ---------------- LOAD .ENV FROM MULTIPLE LOCATIONS ----------------
// Supports Termux root directory (~/.env or ../.env above 'dd') and local dir ('./.env')
const envPaths = [
  path.resolve(process.cwd(), '../.env'), // Parent directory (Termux root above 'dd')
  path.resolve(process.cwd(), '.env'),    // Current directory
  path.resolve(process.env.HOME || '/data/data/com.termux/files/home', '.env'), // Termux home
];

let loadedEnvPath = '';
for (const envPath of envPaths) {
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
    loadedEnvPath = envPath;
    console.log(`✅ 已成功加载 .env 配置文件: ${envPath}`);
    break;
  }
}

if (!loadedEnvPath) {
  console.log(`ℹ️ 未找到 .env 配置文件，将使用默认环境变量或管理控制台配置`);
}

// Process crash prevention handlers for Termux long-running stability
process.on('uncaughtException', (err) => {
  console.error('🛡️ [Uncaught Exception Handler] 捕获未处理异常，保护进程继续运行:', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('🛡️ [Unhandled Rejection Handler] 捕获未处理的 Promise Rejection:', reason);
});

const app = express();
app.use(express.json({ limit: '2mb' }));

// Path to persistent JSON store
const DATA_DIR = path.resolve('data');
const DATA_FILE = path.join(DATA_DIR, 'db.json');
const DATA_TEMP = path.join(DATA_DIR, 'db.json.tmp');

interface UserRecord {
  phone: string;
  nickname: string;
  password: string; // 6 characters
  avatar: string;
  coins: number;
  diamonds: number;
  wins: number;
  losses: number;
  isBotAdmin: boolean;
  createdAt: string;
  updatedAt?: string;
}

interface BotConfig {
  token: string;
  botUsername: string;
  botId: string;
  adminId: string;
  webhookUrl: string;
}

export interface SyncConfig {
  nodeRole: 'serv00_cloud' | 'termux_local' | 'standalone';
  nodeName: string;
  enableBotPolling: boolean; // In single bot mode: Serv00 cloud is true, Termux local is false
  remoteUrl: string; // Remote counterpart URL
  syncSecret: string; // Shared secret token
  autoSync: boolean; // Trigger sync on changes or interval
  autoSyncIntervalMinutes: number;
  lastSyncTime?: string;
  lastSyncStatus?: 'idle' | 'success' | 'error' | 'syncing';
  lastSyncMessage?: string;
}

interface DatabaseSchema {
  authorizedPhones: string[];
  users: Record<string, UserRecord>; // keyed by phone
  botConfig: BotConfig;
  syncConfig: SyncConfig;
  logs: { id: string; time: string; type: string; message: string }[];
}

// Environment Variables Resolution (Supports BOT_TOKEN, BOT_ID and TG_API_HOST)
const ENV_BOT_TOKEN = process.env.BOT_TOKEN || process.env.TELEGRAM_BOT_TOKEN || process.env.TG_BOT_TOKEN || '';
const ENV_BOT_ID = process.env.BOT_ID || process.env.TELEGRAM_BOT_ID || process.env.TG_BOT_ID || (ENV_BOT_TOKEN.split(':')[0] || '');
const ENV_TG_API_HOST = process.env.TG_API_HOST || process.env.TELEGRAM_API_HOST || 'https://api.telegram.org';

// Sync & Node Environment Variables
const ENV_SYNC_REMOTE_URL = process.env.SYNC_REMOTE_URL || process.env.REMOTE_URL || '';
const ENV_SYNC_SECRET = process.env.SYNC_SECRET_KEY || process.env.SYNC_SECRET || 'chudadi_sync_secret_8888';
const ENV_NODE_ROLE: 'serv00_cloud' | 'termux_local' | 'standalone' =
  (process.env.NODE_ROLE as any) ||
  (process.env.SERV00 ? 'serv00_cloud' : process.env.TERMUX_VERSION ? 'termux_local' : 'standalone');

const ENV_NODE_NAME = process.env.NODE_NAME || (
  ENV_NODE_ROLE === 'serv00_cloud' ? 'Serv00-Cloud-Master' :
  ENV_NODE_ROLE === 'termux_local' ? 'Termux-Mobile-Node' :
  'ChuDaDi-Primary-Node'
);

// Single Bot Mode Logic:
// If explicitly set, use it. Otherwise:
// - On Termux (termux_local): default false (avoid 409 conflict, Serv00 cloud handles polling)
// - On Serv00 / standalone: default true
const ENV_ENABLE_TG_BOT = process.env.ENABLE_TG_BOT !== undefined
  ? process.env.ENABLE_TG_BOT === 'true'
  : (ENV_NODE_ROLE === 'termux_local' ? false : true);

// Default admin phone
const DEFAULT_ADMIN_PHONE = '13800138000';

// Initial default database state
const defaultDb: DatabaseSchema = {
  authorizedPhones: [
    DEFAULT_ADMIN_PHONE,
    '18888888888',
    '15999999999',
    '13333333333',
    '13666666666',
    '13999999999',
  ],
  users: {
    [DEFAULT_ADMIN_PHONE]: {
      phone: DEFAULT_ADMIN_PHONE,
      nickname: '锄神大司马',
      password: 'admin8', // 6 characters
      avatar: '😎',
      coins: 88888,
      diamonds: 888,
      wins: 66,
      losses: 12,
      isBotAdmin: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    '18888888888': {
      phone: '18888888888',
      nickname: '赌圣阿星',
      password: '123456', // 6 characters
      avatar: '👑',
      coins: 50000,
      diamonds: 500,
      wins: 30,
      losses: 10,
      isBotAdmin: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  },
  botConfig: {
    token: ENV_BOT_TOKEN || '7890123456:AAFdExampleTokenForChuDaDiBot',
    botUsername: '@ChuDaDiGame_Bot',
    botId: ENV_BOT_ID || '7890123456',
    adminId: '123456789',
    webhookUrl: 'https://example.com/api/bot/webhook',
  },
  syncConfig: {
    nodeRole: ENV_NODE_ROLE,
    nodeName: ENV_NODE_NAME,
    enableBotPolling: ENV_ENABLE_TG_BOT,
    remoteUrl: ENV_SYNC_REMOTE_URL,
    syncSecret: ENV_SYNC_SECRET,
    autoSync: true,
    autoSyncIntervalMinutes: 5,
    lastSyncTime: '',
    lastSyncStatus: 'idle',
    lastSyncMessage: '等待同步',
  },
  logs: [
    {
      id: '1',
      time: new Date().toISOString(),
      type: 'SYSTEM',
      message: loadedEnvPath
        ? `载入配置文件 ${loadedEnvPath}，节点角色: ${ENV_NODE_ROLE}，单Bot模式: ${ENV_ENABLE_TG_BOT ? '本端常驻拉取' : '由云端拉取'}`
        : `服务启动，节点角色: ${ENV_NODE_ROLE}，单Bot模式: ${ENV_ENABLE_TG_BOT ? '本端常驻拉取' : '由云端拉取'}`,
    },
  ],
};

function loadDatabase(): DatabaseSchema {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (fs.existsSync(DATA_FILE)) {
      const data = fs.readFileSync(DATA_FILE, 'utf-8');
      const parsed = JSON.parse(data);
      const merged: DatabaseSchema = { ...defaultDb, ...parsed };

      // Ensure syncConfig exists and has latest defaults
      if (!merged.syncConfig) {
        merged.syncConfig = { ...defaultDb.syncConfig };
      } else {
        merged.syncConfig = { ...defaultDb.syncConfig, ...merged.syncConfig };
      }

      // Override with .env variables if explicitly given
      if (ENV_BOT_TOKEN) merged.botConfig.token = ENV_BOT_TOKEN;
      if (ENV_BOT_ID) merged.botConfig.botId = ENV_BOT_ID;
      if (ENV_SYNC_REMOTE_URL && !merged.syncConfig.remoteUrl) merged.syncConfig.remoteUrl = ENV_SYNC_REMOTE_URL;
      if (process.env.SYNC_SECRET_KEY) merged.syncConfig.syncSecret = process.env.SYNC_SECRET_KEY;
      if (process.env.NODE_ROLE) merged.syncConfig.nodeRole = ENV_NODE_ROLE;
      if (process.env.ENABLE_TG_BOT !== undefined) {
        merged.syncConfig.enableBotPolling = process.env.ENABLE_TG_BOT === 'true';
      }

      return merged;
    }
  } catch (err) {
    console.error('Error loading db.json:', err);
  }
  return defaultDb;
}

function saveDatabase(dbSchema: DatabaseSchema) {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    const content = JSON.stringify(dbSchema, null, 2);
    fs.writeFileSync(DATA_TEMP, content, 'utf-8');
    fs.renameSync(DATA_TEMP, DATA_FILE);
  } catch (err) {
    console.error('Error saving db.json atomically, trying direct write:', err);
    try {
      fs.writeFileSync(DATA_FILE, JSON.stringify(dbSchema, null, 2), 'utf-8');
    } catch (fallbackErr) {
      console.error('Fatal error saving db.json:', fallbackErr);
    }
  }
}

let db = loadDatabase();

function addLog(type: string, message: string) {
  const logItem = {
    id: String(Date.now()),
    time: new Date().toLocaleTimeString(),
    type,
    message,
  };
  db.logs.unshift(logItem);
  if (db.logs.length > 100) db.logs = db.logs.slice(0, 100);
  saveDatabase(db);
}

// ---------------- TELEGRAM BOT KEYBOARD & API CALLER ----------------
const BOT_KEYBOARD = {
  keyboard: [
    [{ text: '📱 授权手机号' }, { text: '📋 授权列表' }],
    [{ text: '👥 玩家清单' }, { text: '💰 充值积分' }],
    [{ text: '🔑 重置密码' }, { text: 'ℹ️ 运行状态' }],
  ],
  resize_keyboard: true,
  one_time_keyboard: false,
};

function formatBotTokenPath(rawToken: string): string {
  const clean = rawToken.trim();
  if (!clean) return '';
  if (clean.toLowerCase().startsWith('bot')) {
    return clean;
  }
  return `bot${clean}`;
}

async function sendTelegramMessage(
  chatId: string | number,
  text: string,
  botToken?: string,
  includeKeyboard: boolean = true
) {
  const token = botToken || db.botConfig.token;
  if (!token || token.includes('ExampleToken')) return;

  try {
    const tokenPath = formatBotTokenPath(token);
    const url = `${ENV_TG_API_HOST}/${tokenPath}/sendMessage`;
    const payload: any = {
      chat_id: chatId,
      text,
      parse_mode: 'Markdown',
    };
    if (includeKeyboard) {
      payload.reply_markup = BOT_KEYBOARD;
    }

    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch (err) {
    console.error('Failed to send Telegram message:', err);
  }
}

// Telegram Command & Reply Keyboard Processor
function processTelegramCommand(commandText: string, chatId: string | number = '123456789'): string {
  const cleanText = commandText.trim();
  const parts = cleanText.split(/\s+/);
  const cmd = parts[0].toLowerCase();
  const arg1 = parts[1] || '';
  const arg2 = parts[2] || '';

  // Handle Telegram Keyboard Button clicks
  if (cleanText === '📱 授权手机号') {
    return '📱 *手机号注册授权*\n\n请发送指令：\n`/auth 手机号`\n\n例如：`/auth 13912345678`';
  }
  if (cleanText === '📋 授权列表') {
    return processTelegramCommand('/list', chatId);
  }
  if (cleanText === '👥 玩家清单') {
    return processTelegramCommand('/users', chatId);
  }
  if (cleanText === '💰 充值积分') {
    return '💰 *积分充值功能*\n\n请发送指令：\n`/addcoins 手机号 积分数量`\n\n例如：`/addcoins 13800138000 50000`';
  }
  if (cleanText === '🔑 重置密码') {
    return '🔑 *重置玩家 6 位数密码*\n\n请发送指令：\n`/resetpwd 手机号 6位新密码`\n\n例如：`/resetpwd 13800138000 666888`';
  }
  if (cleanText === 'ℹ️ 运行状态') {
    return processTelegramCommand('/info', chatId);
  }

  let replyText = '';

  switch (cmd) {
    case '/start':
    case '/menu':
    case '/help':
      replyText =
        '🤖 *锄大地 Telegram 管理控制面板*\n\n' +
        '已为你启动底部**交互按键菜单**，你可以直接点击下方按钮或发送快捷指令：\n\n' +
        '🔹 `/auth 手机号` - 授权该手机号注册账号\n' +
        '🔹 `/unauth 手机号` - 取消手机号注册授权\n' +
        '🔹 `/list` - 查看已授权手机号清单\n' +
        '🔹 `/users` - 查看玩家列表与积分\n' +
        '🔹 `/addcoins 手机号 积分` - 充值游戏积分\n' +
        '🔹 `/resetpwd 手机号 6位密码` - 重置密码\n' +
        '🔹 `/info` - 查看节点运行状态';
      break;

    case '/auth':
    case '/authorize':
      if (!arg1) {
        replyText = '❌ 格式错误！正确格式：`/auth 手机号` 例如：`/auth 13988889999`';
      } else {
        if (!db.authorizedPhones.includes(arg1)) {
          db.authorizedPhones.push(arg1);
          saveDatabase(db);
          addLog('TG_BOT', `Telegram Bot 成功授权手机号: ${arg1}`);
          replyText = `✅ 授权成功！手机号 \`${arg1}\` 已获得注册权限，现在可在游戏中进行注册。`;
        } else {
          replyText = `ℹ️ 手机号 \`${arg1}\` 之前已经获得过授权。`;
        }
      }
      break;

    case '/unauth':
    case '/revoke':
      if (!arg1) {
        replyText = '❌ 格式错误！正确格式：`/unauth 手机号`';
      } else {
        db.authorizedPhones = db.authorizedPhones.filter(p => p !== arg1);
        saveDatabase(db);
        addLog('TG_BOT', `Telegram Bot 取消授权手机号: ${arg1}`);
        replyText = `🛑 已取消手机号 \`${arg1}\` 的注册授权！`;
      }
      break;

    case '/list':
      replyText =
        `📋 *已授权手机号列表 (${db.authorizedPhones.length} 个)*:\n` +
        db.authorizedPhones
          .map(
            (p, idx) =>
              `${idx + 1}. \`${p}\` ${db.users[p] ? '✅ (已注册: ' + db.users[p].nickname + ')' : '⏳ (未注册)'}`
          )
          .join('\n');
      break;

    case '/users':
      const userList = Object.values(db.users);
      replyText =
        `👥 *注册玩家列表 (${userList.length} 人)*:\n` +
        userList
          .map(
            (u, idx) =>
              `${idx + 1}. *${u.nickname}* (\`${u.phone}\`) - 💰${u.coins.toLocaleString()}积分 [${u.isBotAdmin ? '👑管理员' : '玩家'}]`
          )
          .join('\n');
      break;

    case '/addcoins':
      if (!arg1 || !arg2 || isNaN(Number(arg2))) {
        replyText = '❌ 格式错误！正确格式：`/addcoins 手机号 积分数量` 例如 `/addcoins 13800138000 50000`';
      } else {
        const u = db.users[arg1];
        if (!u) {
          replyText = `❌ 未找到手机号为 \`${arg1}\` 的玩家，请先确认手机号。`;
        } else {
          const delta = Number(arg2);
          u.coins += delta;
          u.updatedAt = new Date().toISOString();
          saveDatabase(db);
          addLog('TG_BOT', `TG 充值玩家 ${u.nickname} 积分: ${delta}`);
          replyText = `💰 充值成功！玩家 *${u.nickname}* (\`${arg1}\`) 当前积分：\`${u.coins.toLocaleString()}\``;
        }
      }
      break;

    case '/resetpwd':
      if (!arg1 || !arg2 || arg2.length !== 6) {
        replyText = '❌ 格式错误！新密码必须为 6 位数。正确格式：`/resetpwd 手机号 6位新密码`';
      } else {
        const u = db.users[arg1];
        if (!u) {
          replyText = `❌ 未找到手机号为 \`${arg1}\` 的玩家`;
        } else {
          u.password = arg2;
          u.updatedAt = new Date().toISOString();
          saveDatabase(db);
          addLog('TG_BOT', `TG 重置玩家 ${u.nickname} 密码为: ${arg2}`);
          replyText = `🔑 密码重置成功！玩家 *${u.nickname}* 的新密码设为：\`${arg2}\``;
        }
      }
      break;

    case '/info':
      replyText =
        `ℹ️ *Telegram Bot 运行状态*\n` +
        `• 节点角色: \`${db.syncConfig.nodeRole}\` (${db.syncConfig.nodeName}) \n` +
        `• 配置文件: \`${loadedEnvPath || '内置/环境变量'}\` \n` +
        `• Bot ID: \`${db.botConfig.botId || '7890123456'}\` \n` +
        `• 单Bot常驻轮询: \`${db.syncConfig.enableBotPolling ? '已启用 (云端常驻)' : '已休眠 (由云端常驻)'}\` \n` +
        `• 授权手机号数: \`${db.authorizedPhones.length}\` \n` +
        `• 游戏注册玩家: \`${Object.keys(db.users).length}\` \n` +
        `• 数据对端节点: \`${db.syncConfig.remoteUrl || '未配置'}\``;
      break;

    default:
      replyText = `🤖 未知命令: \`${cleanText}\`。发送 \`/help\` 查看键盘菜单与指令说明。`;
  }

  return replyText;
}

// ---------------- TELEGRAM BOT LONG POLLING LOOP ----------------
let lastUpdateId = 0;
let isPollingRunning = false;

async function startTelegramPolling() {
  const token = db.botConfig.token;
  if (!token || token.includes('ExampleToken')) {
    console.log('ℹ️ Telegram Bot Token 未配置，可通过 .env 设置 BOT_TOKEN 开启轮询');
    return;
  }

  // Check single-bot mode flag
  if (db.syncConfig && db.syncConfig.enableBotPolling === false) {
    console.log(`ℹ️ [单Bot模式] 当前节点 (${db.syncConfig.nodeName}) 未启用 TG 轮询 (已由云端常驻节点拉取，防止 409 冲突)`);
    return;
  }

  if (isPollingRunning) {
    return; // Polling loop is already active
  }
  isPollingRunning = true;

  console.log(`🤖 开始启动 Telegram Bot 实时 Polling 监听 (Bot ID: ${db.botConfig.botId}, Node: ${db.syncConfig.nodeName})...`);
  addLog('TG_POLLING', `Telegram Bot 轮询已激活 [节点: ${db.syncConfig?.nodeName || '本节点'}]`);

  async function pollUpdates() {
    if (!isPollingRunning || (db.syncConfig && db.syncConfig.enableBotPolling === false)) {
      isPollingRunning = false;
      return;
    }

    try {
      const currentToken = db.botConfig.token;
      if (!currentToken || currentToken.includes('ExampleToken')) {
        isPollingRunning = false;
        return;
      }
      const tokenPath = formatBotTokenPath(currentToken);
      const url = `${ENV_TG_API_HOST}/${tokenPath}/getUpdates?offset=${lastUpdateId + 1}&timeout=20`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        if (data.ok && Array.isArray(data.result)) {
          let hasChanges = false;
          for (const update of data.result) {
            lastUpdateId = Math.max(lastUpdateId, update.update_id);
            if (update.message && update.message.text) {
              const text = update.message.text;
              const chatId = update.message.chat.id;
              console.log(`📩 收到 Telegram 来自 ${chatId} 的消息: ${text}`);

              const reply = processTelegramCommand(text, chatId);
              await sendTelegramMessage(chatId, reply, currentToken, true);

              const firstWord = text.trim().split(/\s+/)[0].toLowerCase();
              if (['/auth', '/authorize', '/unauth', '/revoke', '/addcoins', '/resetpwd'].includes(firstWord)) {
                hasChanges = true;
              }
            }
          }
          if (hasChanges) {
            triggerDebouncedSync();
          }
        }
      } else if (res.status === 409) {
        console.warn('⚠️ Telegram Bot 冲突 (409 Conflict): 另一个实例正在拉取该 Bot Token。已暂停当前轮询以避免竞争。');
        addLog('TG_CONFLICT', '检测到其他节点已在运行此 Bot (409 Conflict)，当前节点自动休眠');
        isPollingRunning = false;
        return;
      }
    } catch (err) {
      // network timeout or offline
    } finally {
      if (isPollingRunning && db.syncConfig?.enableBotPolling !== false) {
        setTimeout(pollUpdates, 2000);
      } else {
        isPollingRunning = false;
      }
    }
  }

  pollUpdates();
}

function stopTelegramPolling() {
  if (isPollingRunning) {
    isPollingRunning = false;
    addLog('TG_POLLING', '已停用本节点的 Telegram Bot 轮询');
    console.log('🛑 Telegram Bot 轮询已停用');
  }
}

// ---------------- BI-DIRECTIONAL DATA MERGE & SYNC ENGINE ----------------
function mergeDatabases(
  local: { authorizedPhones: string[]; users: Record<string, UserRecord> },
  incoming: { authorizedPhones: string[]; users: Record<string, UserRecord> }
): {
  authorizedPhones: string[];
  users: Record<string, UserRecord>;
  addedPhones: number;
  mergedUsersCount: number;
} {
  // 1. Merge Authorized Phones (Set union)
  const phoneSet = new Set<string>([
    ...(local.authorizedPhones || []),
    ...(incoming.authorizedPhones || []),
  ]);
  const mergedPhones = Array.from(phoneSet);
  const addedPhones = mergedPhones.length - (local.authorizedPhones?.length || 0);

  // 2. Merge Users
  const mergedUsers: Record<string, UserRecord> = { ...(local.users || {}) };
  const allUserPhones = new Set<string>([
    ...Object.keys(local.users || {}),
    ...Object.keys(incoming.users || {}),
  ]);

  let mergedUsersCount = 0;

  for (const phone of allUserPhones) {
    const uLocal = local.users ? local.users[phone] : undefined;
    const uInc = incoming.users ? incoming.users[phone] : undefined;

    if (uLocal && !uInc) {
      mergedUsers[phone] = uLocal;
    } else if (!uLocal && uInc) {
      mergedUsers[phone] = uInc;
      mergedUsersCount++;
    } else if (uLocal && uInc) {
      // Both exist: compare timestamps
      const localTime = new Date(uLocal.updatedAt || uLocal.createdAt || 0).getTime();
      const incTime = new Date(uInc.updatedAt || uInc.createdAt || 0).getTime();

      const newer = incTime > localTime ? uInc : uLocal;
      const older = incTime > localTime ? uLocal : uInc;

      mergedUsers[phone] = {
        ...older,
        ...newer,
        // Safeguard user assets: pick maximal values to prevent accidental loss
        coins: Math.max(uLocal.coins || 0, uInc.coins || 0),
        diamonds: Math.max(uLocal.diamonds || 0, uInc.diamonds || 0),
        wins: Math.max(uLocal.wins || 0, uInc.wins || 0),
        losses: Math.max(uLocal.losses || 0, uInc.losses || 0),
        isBotAdmin: Boolean(uLocal.isBotAdmin || uInc.isBotAdmin),
        updatedAt: new Date(Math.max(localTime, incTime, Date.now())).toISOString(),
      };
      mergedUsersCount++;
    }
  }

  return {
    authorizedPhones: mergedPhones,
    users: mergedUsers,
    addedPhones,
    mergedUsersCount,
  };
}

async function executeSync(action: 'two-way' | 'push' | 'pull' = 'two-way'): Promise<{
  success: boolean;
  message: string;
  stats?: any;
}> {
  const remoteUrl = (db.syncConfig.remoteUrl || '').trim().replace(/\/+$/, '');
  const syncSecret = (db.syncConfig.syncSecret || '').trim();

  if (!remoteUrl) {
    return { success: false, message: '未配置对端服务器地址 (Remote URL)' };
  }

  db.syncConfig.lastSyncStatus = 'syncing';
  db.syncConfig.lastSyncMessage = `正在与 ${remoteUrl} 建立同步连接...`;

  try {
    const payload = {
      action,
      senderNode: db.syncConfig.nodeName || 'ChuDaDi-Node',
      senderRole: db.syncConfig.nodeRole,
      data: {
        authorizedPhones: db.authorizedPhones,
        users: db.users,
      },
    };

    const targetUrl = `${remoteUrl}/api/sync/receive`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000);

    const res = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Sync-Secret': syncSecret,
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      const errMsg = errData.error || `HTTP 错误 ${res.status}`;
      db.syncConfig.lastSyncStatus = 'error';
      db.syncConfig.lastSyncMessage = `同步失败: ${errMsg}`;
      return { success: false, message: `对端响应错误: ${errMsg}` };
    }

    const resData = await res.json();
    if (!resData.success) {
      db.syncConfig.lastSyncStatus = 'error';
      db.syncConfig.lastSyncMessage = resData.error || '同步失败';
      return { success: false, message: resData.error || '同步失败' };
    }

    // If two-way or pull, update local database
    if (action === 'two-way' && resData.mergedData) {
      db.authorizedPhones = resData.mergedData.authorizedPhones;
      db.users = resData.mergedData.users;
    } else if (action === 'pull' && resData.remoteData) {
      db.authorizedPhones = resData.remoteData.authorizedPhones;
      db.users = resData.remoteData.users;
    }

    const nowStr = new Date().toLocaleTimeString();
    db.syncConfig.lastSyncTime = nowStr;
    db.syncConfig.lastSyncStatus = 'success';
    const summaryMsg = `同步完成 (${action}): 授权手机 ${db.authorizedPhones.length} 个, 玩家账号 ${Object.keys(db.users).length} 位 [对端: ${resData.nodeName || remoteUrl}]`;
    db.syncConfig.lastSyncMessage = summaryMsg;

    addLog('DATA_SYNC', summaryMsg);
    saveDatabase(db);

    return {
      success: true,
      message: summaryMsg,
      stats: {
        authorizedPhonesCount: db.authorizedPhones.length,
        usersCount: Object.keys(db.users).length,
        remoteNodeName: resData.nodeName,
      },
    };
  } catch (err: any) {
    const errMsg = err.name === 'AbortError' ? '连接超时 (12秒)' : err.message || '网络连接失败';
    db.syncConfig.lastSyncStatus = 'error';
    db.syncConfig.lastSyncMessage = `同步失败: ${errMsg}`;
    saveDatabase(db);
    return { success: false, message: `连接异常: ${errMsg}` };
  }
}

// Debounced auto-sync trigger
let debouncedSyncTimer: NodeJS.Timeout | null = null;
function triggerDebouncedSync() {
  if (!db.syncConfig || !db.syncConfig.autoSync || !db.syncConfig.remoteUrl) return;
  if (debouncedSyncTimer) clearTimeout(debouncedSyncTimer);
  debouncedSyncTimer = setTimeout(() => {
    executeSync('two-way').catch(() => {});
  }, 2500);
}

// Background periodic sync
setInterval(() => {
  try {
    if (db.syncConfig && db.syncConfig.autoSync && db.syncConfig.remoteUrl) {
      executeSync('two-way').catch(err => {
        console.error('Periodic auto-sync background error:', err.message);
      });
    }
  } catch (err) {
    console.error('Error in periodic auto-sync interval:', err);
  }
}, 5 * 60 * 1000);

// ---------------- API ROUTES ----------------

// Get Bot Env Status
app.get('/api/bot/env-status', (req, res) => {
  return res.json({
    loadedEnvPath,
    botConfig: db.botConfig,
    authorizedPhonesCount: db.authorizedPhones.length,
    usersCount: Object.keys(db.users).length,
  });
});

// Set Webhook for Telegram Bot
app.post('/api/bot/set-webhook', async (req, res) => {
  const { webhookUrl } = req.body || {};
  const token = db.botConfig.token;

  if (!token || token.includes('ExampleToken')) {
    return res.status(400).json({ error: '请先配置有效的 Telegram BOT_TOKEN' });
  }

  const urlToSet = webhookUrl || db.botConfig.webhookUrl;
  if (!urlToSet) {
    return res.status(400).json({ error: '请提供 Webhook URL 地址' });
  }

  try {
    const tokenPath = formatBotTokenPath(token);
    const tgUrl = `${ENV_TG_API_HOST}/${tokenPath}/setWebhook?url=${encodeURIComponent(urlToSet)}`;
    const tgRes = await fetch(tgUrl);
    const tgData = await tgRes.json();

    if (tgData.ok) {
      db.botConfig.webhookUrl = urlToSet;
      saveDatabase(db);
      addLog('TG_WEBHOOK', `注册 Telegram Webhook 成功: ${urlToSet}`);
      return res.json({ success: true, message: `✅ 成功绑定 Webhook 到: ${urlToSet}`, result: tgData });
    } else {
      return res.status(400).json({ error: tgData.description || '绑定失败' });
    }
  } catch (err: any) {
    return res.status(500).json({ error: err.message || '设置 Webhook 出错' });
  }
});

// Check phone TG authorization status
app.get('/api/auth/check-phone', (req, res) => {
  const phone = String(req.query.phone || '').trim();
  if (!phone) {
    return res.status(400).json({ error: '请提供手机号' });
  }
  const isAuthorized = db.authorizedPhones.includes(phone);
  const isRegistered = !!db.users[phone];
  return res.json({
    phone,
    isAuthorized,
    isRegistered,
    message: isAuthorized
      ? isRegistered
        ? '该手机号已获得 TG 授权且已注册'
        : '该手机号已获得 TG 授权，可进行注册'
      : '该手机号未经 Telegram Bot 授权，无法注册',
  });
});

// User Registration
app.post('/api/auth/register', (req, res) => {
  const { phone, nickname, password, avatar } = req.body || {};

  const cleanPhone = String(phone || '').trim();
  const cleanNickname = String(nickname || '').trim();
  const cleanPassword = String(password || '').trim();

  if (!cleanPhone || !cleanNickname || !cleanPassword) {
    return res.status(400).json({ error: '请填写手机号、昵称和密码' });
  }

  // Check 1: Must be authorized by TG bot
  if (!db.authorizedPhones.includes(cleanPhone)) {
    return res.status(403).json({
      error: '该手机号未获得 Telegram Bot 授权！请通过 Telegram 机器人授权后再进行注册。',
    });
  }

  // Check 2: Password must be 6 characters
  if (cleanPassword.length !== 6) {
    return res.status(400).json({ error: '密码必须为 6 位数 (不限大小写字母或数字)' });
  }

  // Check 3: Check if phone already registered
  if (db.users[cleanPhone]) {
    return res.status(400).json({ error: '该手机号已注册，请直接登录' });
  }

  const nowIso = new Date().toISOString();
  const newUser: UserRecord = {
    phone: cleanPhone,
    nickname: cleanNickname,
    password: cleanPassword,
    avatar: avatar || '😎',
    coins: 30000,
    diamonds: 300,
    wins: 0,
    losses: 0,
    isBotAdmin: cleanPhone === DEFAULT_ADMIN_PHONE,
    createdAt: nowIso,
    updatedAt: nowIso,
  };

  db.users[cleanPhone] = newUser;
  addLog('REGISTER', `新用户注册: ${cleanNickname} (${cleanPhone})`);
  saveDatabase(db);
  triggerDebouncedSync();

  return res.json({
    success: true,
    user: newUser,
    message: '注册成功，欢迎加入锄大地！',
  });
});

// User Login
app.post('/api/auth/login', (req, res) => {
  const { phoneOrNickname, password } = req.body || {};
  const query = String(phoneOrNickname || '').trim();
  const cleanPassword = String(password || '').trim();

  if (!query || !cleanPassword) {
    return res.status(400).json({ error: '请输入手机号/昵称和密码' });
  }

  const user = Object.values(db.users).find(
    u => u.phone === query || u.nickname === query
  );

  if (!user) {
    return res.status(404).json({ error: '账号不存在，请先核对手机号或进行注册' });
  }

  if (user.password.toLowerCase() !== cleanPassword.toLowerCase()) {
    return res.status(401).json({ error: '密码不正确，密码为 6 位数' });
  }

  addLog('LOGIN', `用户登录: ${user.nickname} (${user.phone})`);
  return res.json({
    success: true,
    user,
    message: '登录成功！',
  });
});

// Update Profile
app.post('/api/auth/update-profile', (req, res) => {
  const { phone, coins, wins, losses, nickname, avatar } = req.body || {};
  if (!phone || !db.users[phone]) {
    return res.status(400).json({ error: '无效用户' });
  }

  const user = db.users[phone];
  if (typeof coins === 'number') user.coins = coins;
  if (typeof wins === 'number') user.wins = wins;
  if (typeof losses === 'number') user.losses = losses;
  if (nickname) user.nickname = nickname;
  if (avatar) user.avatar = avatar;
  user.updatedAt = new Date().toISOString();

  saveDatabase(db);
  triggerDebouncedSync();
  return res.json({ success: true, user });
});

// Authorize Phone
app.post('/api/bot/authorize-phone', (req, res) => {
  const phone = String(req.body.phone || '').trim();
  if (!phone) {
    return res.status(400).json({ error: '请输入要授权的手机号' });
  }

  if (!db.authorizedPhones.includes(phone)) {
    db.authorizedPhones.push(phone);
    addLog('TG_BOT_AUTH', `管理员/Bot 授权新手机号: ${phone}`);
    saveDatabase(db);
    triggerDebouncedSync();
  }

  return res.json({
    success: true,
    phone,
    authorizedPhones: db.authorizedPhones,
    message: `手机号 ${phone} 已成功授权！`,
  });
});

// Revoke Phone
app.post('/api/bot/revoke-phone', (req, res) => {
  const phone = String(req.body.phone || '').trim();
  if (!phone) {
    return res.status(400).json({ error: '请输入手机号' });
  }

  db.authorizedPhones = db.authorizedPhones.filter(p => p !== phone);
  addLog('TG_BOT_REVOKE', `取消授权手机号: ${phone}`);
  saveDatabase(db);
  triggerDebouncedSync();

  return res.json({
    success: true,
    phone,
    authorizedPhones: db.authorizedPhones,
    message: `已取消手机号 ${phone} 的授权`,
  });
});

// Get Admin Data
app.get('/api/admin/users', (req, res) => {
  return res.json({
    users: Object.values(db.users),
    authorizedPhones: db.authorizedPhones,
    logs: db.logs,
    botConfig: db.botConfig,
    syncConfig: db.syncConfig,
    isBotPollingActive: isPollingRunning,
    loadedEnvPath,
  });
});

// Modify User
app.post('/api/admin/modify-user', (req, res) => {
  const { phone, coins, password, isBotAdmin, action } = req.body || {};
  const user = db.users[phone];

  if (!user && action !== 'CREATE_AND_AUTH') {
    return res.status(404).json({ error: '未找到该用户' });
  }

  if (action === 'DELETE_USER') {
    delete db.users[phone];
    addLog('ADMIN_DELETE', `管理员删除用户: ${phone}`);
    saveDatabase(db);
    triggerDebouncedSync();
    return res.json({ success: true, message: `已删除用户 ${phone}` });
  }

  if (typeof coins === 'number' && user) {
    user.coins = coins;
    user.updatedAt = new Date().toISOString();
    addLog('ADMIN_COINS', `修改用户 ${user.nickname} 积分: ${coins}`);
  }

  if (password && user) {
    if (password.length !== 6) {
      return res.status(400).json({ error: '新密码必须为 6 位数' });
    }
    user.password = password;
    user.updatedAt = new Date().toISOString();
    addLog('ADMIN_PASSWORD', `重置用户 ${user.nickname} 密码为: ${password}`);
  }

  if (typeof isBotAdmin === 'boolean' && user) {
    user.isBotAdmin = isBotAdmin;
    user.updatedAt = new Date().toISOString();
    addLog('ADMIN_ROLE', `修改用户 ${user.nickname} Bot 管理员权限: ${isBotAdmin}`);
  }

  saveDatabase(db);
  triggerDebouncedSync();
  return res.json({ success: true, user, users: Object.values(db.users) });
});

// Update Bot Config
app.post('/api/bot/config', (req, res) => {
  const { token, botUsername, botId, adminId, webhookUrl } = req.body || {};
  if (token !== undefined) db.botConfig.token = token;
  if (botUsername !== undefined) db.botConfig.botUsername = botUsername;
  if (botId !== undefined) db.botConfig.botId = botId;
  if (adminId !== undefined) db.botConfig.adminId = adminId;
  if (webhookUrl !== undefined) db.botConfig.webhookUrl = webhookUrl;

  addLog('BOT_CONFIG', '更新 Telegram Bot 配置信息');
  saveDatabase(db);

  // Restart polling if token was changed and polling is enabled
  if (db.syncConfig.enableBotPolling) {
    startTelegramPolling();
  }

  return res.json({ success: true, botConfig: db.botConfig });
});

// Webhook GET Diagnostic route for browser testing
app.get('/api/bot/webhook', (req, res) => {
  return res.json({
    status: 'ok',
    message: '✅ Telegram Bot Webhook 接口服务正常在线！请在 Telegram 软件中向 Bot 发送指令进行对讲。',
    botId: db.botConfig.botId,
    botUsername: db.botConfig.botUsername,
    authorizedPhonesCount: db.authorizedPhones.length,
    usersCount: Object.keys(db.users).length,
  });
});

// Webhook Handler (Returns method: sendMessage directly in HTTP response JSON for zero-lag TG Webhook reply)
app.post('/api/bot/webhook', async (req, res) => {
  const body = req.body || {};
  let commandText = '';
  let chatId: string | number = '';

  if (body.message && body.message.text) {
    commandText = body.message.text.trim();
    chatId = body.message.chat?.id || '';
  } else if (body.text) {
    commandText = String(body.text).trim();
  }

  if (!commandText) {
    return res.json({ status: 'ignored', reason: 'No text message' });
  }

  console.log(`📩 收到 Telegram Webhook 指令 [Chat: ${chatId}]: ${commandText}`);
  addLog('TG_WEBHOOK', `接收到 Telegram Webhook 指令: ${commandText}`);
  const replyText = processTelegramCommand(commandText, chatId || '123456789');

  // Trigger sync if data may have changed
  const firstWord = commandText.split(/\s+/)[0].toLowerCase();
  if (['/auth', '/authorize', '/unauth', '/revoke', '/addcoins', '/resetpwd'].includes(firstWord)) {
    triggerDebouncedSync();
  }

  // Also try async background call as fallback
  if (chatId) {
    sendTelegramMessage(chatId, replyText, db.botConfig.token, true).catch(() => {});
  }

  // Telegram official Webhook direct response
  if (chatId) {
    return res.json({
      method: 'sendMessage',
      chat_id: chatId,
      text: replyText,
      parse_mode: 'Markdown',
      reply_markup: BOT_KEYBOARD,
    });
  }

  return res.json({
    ok: true,
    replyText,
    authorizedPhones: db.authorizedPhones,
    usersCount: Object.keys(db.users).length,
  });
});

// ---------------- SYNC & MULTI-NODE API ROUTES ----------------

// 1. Get Sync Status
app.get('/api/sync/status', (req, res) => {
  return res.json({
    syncConfig: db.syncConfig,
    isBotPollingActive: isPollingRunning,
    authorizedPhonesCount: db.authorizedPhones.length,
    usersCount: Object.keys(db.users).length,
  });
});

// 2. Update Sync Config
app.post('/api/sync/config', (req, res) => {
  const {
    nodeRole,
    nodeName,
    enableBotPolling,
    remoteUrl,
    syncSecret,
    autoSync,
    autoSyncIntervalMinutes,
  } = req.body || {};

  if (nodeRole !== undefined) db.syncConfig.nodeRole = nodeRole;
  if (nodeName !== undefined) db.syncConfig.nodeName = String(nodeName).trim();
  if (remoteUrl !== undefined) db.syncConfig.remoteUrl = String(remoteUrl).trim();
  if (syncSecret !== undefined) db.syncConfig.syncSecret = String(syncSecret).trim();
  if (autoSync !== undefined) db.syncConfig.autoSync = !!autoSync;
  if (autoSyncIntervalMinutes !== undefined) {
    db.syncConfig.autoSyncIntervalMinutes = Math.max(1, Number(autoSyncIntervalMinutes) || 5);
  }

  if (enableBotPolling !== undefined) {
    const prev = db.syncConfig.enableBotPolling;
    db.syncConfig.enableBotPolling = !!enableBotPolling;
    if (!prev && db.syncConfig.enableBotPolling) {
      startTelegramPolling();
    } else if (prev && !db.syncConfig.enableBotPolling) {
      stopTelegramPolling();
    }
  }

  addLog(
    'SYNC_CONFIG',
    `更新同步配置 [角色: ${db.syncConfig.nodeRole}, 节点: ${db.syncConfig.nodeName}, Bot轮询: ${db.syncConfig.enableBotPolling ? '开启' : '关闭'}]`
  );
  saveDatabase(db);

  return res.json({
    success: true,
    syncConfig: db.syncConfig,
    isBotPollingActive: isPollingRunning,
  });
});

// 3. Toggle TG Bot Polling on this Node (Single-Bot coordinator)
app.post('/api/sync/toggle-bot', (req, res) => {
  const { enable } = req.body || {};
  const shouldEnable = enable !== undefined ? !!enable : !db.syncConfig.enableBotPolling;

  db.syncConfig.enableBotPolling = shouldEnable;
  if (shouldEnable) {
    startTelegramPolling();
  } else {
    stopTelegramPolling();
  }

  addLog('TG_BOT_TOGGLE', `切换本节点 TG Bot 轮询: ${shouldEnable ? '开启(云端常驻)' : '停用(避免冲突)'}`);
  saveDatabase(db);

  return res.json({
    success: true,
    enableBotPolling: db.syncConfig.enableBotPolling,
    isBotPollingActive: isPollingRunning,
    message: shouldEnable
      ? '✅ 已开启本节点 Telegram Bot 轮询！'
      : '⏸️ 已暂停本节点 Telegram Bot 轮询 (建议由另一常驻节点拉取，防止 409 冲突)',
  });
});

// 4. Remote Node Ping Probe
app.get('/api/sync/ping', (req, res) => {
  const incomingSecret = req.headers['x-sync-secret'] || req.query.secret;
  const configuredSecret = (db.syncConfig.syncSecret || '').trim();

  const secretValid = !configuredSecret || incomingSecret === configuredSecret;
  return res.json({
    ok: true,
    secretValid,
    nodeName: db.syncConfig.nodeName,
    nodeRole: db.syncConfig.nodeRole,
    botActive: isPollingRunning,
    authorizedPhonesCount: db.authorizedPhones.length,
    usersCount: Object.keys(db.users).length,
    serverTime: new Date().toISOString(),
  });
});

// 5. Test Remote Connection
app.post('/api/sync/test-connection', async (req, res) => {
  const { remoteUrl, syncSecret } = req.body || {};
  const cleanUrl = String(remoteUrl || db.syncConfig.remoteUrl || '').trim().replace(/\/+$/, '');
  const cleanSecret = String(syncSecret !== undefined ? syncSecret : db.syncConfig.syncSecret || '').trim();

  if (!cleanUrl) {
    return res.status(400).json({ error: '请输入对端服务器 URL 地址 (如 https://username.serv00.net 或 http://ip:8080)' });
  }

  const startTime = Date.now();
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 7000);

    const testUrl = `${cleanUrl}/api/sync/ping?secret=${encodeURIComponent(cleanSecret)}`;
    const response = await fetch(testUrl, {
      headers: { 'X-Sync-Secret': cleanSecret },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    const latencyMs = Date.now() - startTime;

    if (!response.ok) {
      return res.status(400).json({
        error: `对端服务返回 HTTP ${response.status}，请确认对端已启动该程序且端口开放`,
        latencyMs,
      });
    }

    const data = await response.json();
    if (!data.secretValid) {
      return res.status(401).json({
        error: '对端网络已连通，但通信秘钥 (SYNC_SECRET_KEY) 不匹配！请确保两端填写一致的秘钥。',
        latencyMs,
      });
    }

    return res.json({
      success: true,
      latencyMs,
      remoteNode: data,
      message: `✅ 网络连通正常！对端: ${data.nodeName || cleanUrl} (${data.nodeRole}), 往返延迟: ${latencyMs}ms`,
    });
  } catch (err: any) {
    const latencyMs = Date.now() - startTime;
    const msg = err.name === 'AbortError' ? '连接超时 (7秒)' : (err.message || '网络连接不可达');
    return res.status(500).json({
      error: `无法连接到 ${cleanUrl} (${msg})。请核对地址、端口、以及外网穿透状态。`,
      latencyMs,
    });
  }
});

// 6. Execute Sync (Initiator endpoint)
app.post('/api/sync/execute', async (req, res) => {
  const { action } = req.body || {};
  const syncAction = action === 'push' || action === 'pull' ? action : 'two-way';
  const result = await executeSync(syncAction);
  return res.json(result);
});

// 7. Receive Sync Payload (Counterpart receiver endpoint)
app.post('/api/sync/receive', (req, res) => {
  const incomingSecret = req.headers['x-sync-secret'] || req.body.syncSecret;
  const configuredSecret = (db.syncConfig.syncSecret || '').trim();

  // Validate Secret
  if (configuredSecret && incomingSecret !== configuredSecret) {
    addLog('SYNC_SECURITY', `拒绝未授权的同步请求: 秘钥不匹配 (来自 ${req.ip})`);
    return res.status(401).json({ error: '通信秘钥 (Sync Secret Key) 不匹配，拒绝数据同步' });
  }

  const { action, senderNode, data } = req.body || {};
  if (!data || !Array.isArray(data.authorizedPhones) || typeof data.users !== 'object') {
    return res.status(400).json({ error: '无效的数据载荷格式' });
  }

  if (action === 'push') {
    const mergeRes = mergeDatabases(
      { authorizedPhones: db.authorizedPhones, users: db.users },
      data
    );
    db.authorizedPhones = mergeRes.authorizedPhones;
    db.users = mergeRes.users;
    saveDatabase(db);
    addLog('DATA_SYNC', `接收到来自 [${senderNode || '对端'}] 的推送，合并 ${mergeRes.mergedUsersCount} 位玩家数据`);
    return res.json({
      success: true,
      nodeName: db.syncConfig.nodeName,
      message: '推送数据合并成功',
    });
  }

  if (action === 'pull') {
    return res.json({
      success: true,
      nodeName: db.syncConfig.nodeName,
      remoteData: {
        authorizedPhones: db.authorizedPhones,
        users: db.users,
      },
    });
  }

  // Bi-directional two-way merge
  const mergeRes = mergeDatabases(
    { authorizedPhones: db.authorizedPhones, users: db.users },
    data
  );
  db.authorizedPhones = mergeRes.authorizedPhones;
  db.users = mergeRes.users;
  db.syncConfig.lastSyncTime = new Date().toLocaleTimeString();
  db.syncConfig.lastSyncStatus = 'success';
  db.syncConfig.lastSyncMessage = `双向同步达成: 来自 [${senderNode || '对端'}]`;
  saveDatabase(db);

  addLog('DATA_SYNC', `完成与 [${senderNode || '对端'}] 的双向数据对齐合并`);

  return res.json({
    success: true,
    nodeName: db.syncConfig.nodeName,
    nodeRole: db.syncConfig.nodeRole,
    mergedData: {
      authorizedPhones: db.authorizedPhones,
      users: db.users,
    },
    message: '双向合并对齐成功',
  });
});

// ---------------- ROOM MANAGEMENT ENDPOINTS ----------------
interface RoomSeat {
  position: 'bottom' | 'left' | 'top' | 'right';
  playerName: string;
  avatar: string;
  isHost: boolean;
  isAI: boolean;
  ready: boolean;
  phone?: string;
}

interface RoomRecord {
  code: string; // 6-digit code, e.g. "883921"
  mode: 'room-chudadi' | 'room-yansan';
  roomName: string;
  baseScore: number;
  entryMin: number;
  hostName: string;
  hostPhone?: string;
  isPrivate: boolean;
  passcode?: string;
  allowBotFill: boolean;
  seats: RoomSeat[];
  createdAt: number;
  status: 'WAITING' | 'PLAYING' | 'CLOSED';
}

const activeRooms: Record<string, RoomRecord> = {};

// Clean up inactive/closed rooms older than 6 hours to prevent memory leaks
setInterval(() => {
  try {
    const now = Date.now();
    const maxAge = 6 * 3600 * 1000; // 6 hours
    for (const code in activeRooms) {
      if (now - activeRooms[code].createdAt > maxAge) {
        delete activeRooms[code];
      }
    }
  } catch (err) {
    console.error('Error during activeRooms cleanup interval:', err);
  }
}, 30 * 60 * 1000);

// Helper: Generate unique 6-digit Room Code
function generateRoomCode(): string {
  let code = '';
  do {
    code = Math.floor(100000 + Math.random() * 900000).toString();
  } while (activeRooms[code]);
  return code;
}

// Create Room Endpoint
app.post('/api/rooms/create', (req, res) => {
  const { mode, roomName, baseScore, entryMin, hostName, hostPhone, avatar, isPrivate, passcode, allowBotFill } = req.body || {};

  const code = generateRoomCode();
  const newRoom: RoomRecord = {
    code,
    mode: mode === 'room-yansan' ? 'room-yansan' : 'room-chudadi',
    roomName: roomName || (mode === 'room-yansan' ? '🔥 烟三火爆房' : '♠️ 锄大地好友场'),
    baseScore: Number(baseScore) || (mode === 'room-yansan' ? 2000 : 1000),
    entryMin: Number(entryMin) || (mode === 'room-yansan' ? 2000 : 100),
    hostName: hostName || '房主',
    hostPhone,
    isPrivate: !!isPrivate,
    passcode: passcode || '',
    allowBotFill: allowBotFill !== false,
    seats: [
      {
        position: 'bottom',
        playerName: hostName || '房主',
        avatar: avatar || '😎',
        isHost: true,
        isAI: false,
        ready: true,
        phone: hostPhone,
      },
      { position: 'left', playerName: '空位', avatar: '❓', isHost: false, isAI: false, ready: false },
      { position: 'top', playerName: '空位', avatar: '❓', isHost: false, isAI: false, ready: false },
      { position: 'right', playerName: '空位', avatar: '❓', isHost: false, isAI: false, ready: false },
    ],
    createdAt: Date.now(),
    status: 'WAITING',
  };

  activeRooms[code] = newRoom;
  addLog('ROOM_CREATE', `创建房间 [${code}]: ${newRoom.roomName} (房主: ${hostName})`);

  return res.json({ success: true, room: newRoom });
});

// List Public Waiting Rooms
app.get('/api/rooms/list', (_req, res) => {
  const list = Object.values(activeRooms).filter(r => r.status === 'WAITING');
  return res.json({ success: true, rooms: list });
});

// Get Room by Code
app.get('/api/rooms/get/:code', (req, res) => {
  const code = String(req.params.code || '').trim();
  const room = activeRooms[code];
  if (!room) {
    return res.status(404).json({ error: '未找到该房号对应的房间，请检查 6 位房号' });
  }
  return res.json({ success: true, room });
});

// Join Room by Code
app.post('/api/rooms/join', (req, res) => {
  const { code, playerName, avatar, phone, passcode } = req.body || {};
  const cleanCode = String(code || '').trim();
  const room = activeRooms[cleanCode];

  if (!room) {
    return res.status(404).json({ error: '房号不存在，请核对 6 位数字房号' });
  }

  if (room.status !== 'WAITING') {
    return res.status(400).json({ error: '该房间对局已开始或已关闭' });
  }

  if (room.isPrivate && room.passcode && room.passcode !== String(passcode || '').trim()) {
    return res.status(403).json({ error: '房间密码不正确' });
  }

  // Find empty seat
  const emptySeatIndex = room.seats.findIndex(s => s.playerName === '空位' || (!s.isHost && s.isAI));
  if (emptySeatIndex === -1) {
    return res.status(400).json({ error: '房间玩家已满 4 人' });
  }

  const positions: ('bottom' | 'left' | 'top' | 'right')[] = ['bottom', 'left', 'top', 'right'];
  room.seats[emptySeatIndex] = {
    position: positions[emptySeatIndex],
    playerName: playerName || '玩家',
    avatar: avatar || '🤠',
    isHost: false,
    isAI: false,
    ready: true,
    phone,
  };

  addLog('ROOM_JOIN', `加入房间 [${cleanCode}]: ${playerName}`);
  return res.json({ success: true, room });
});

// Add AI Bot to Empty Seat
app.post('/api/rooms/add-bot', (req, res) => {
  const { code, seatIndex, botName, avatar } = req.body || {};
  const cleanCode = String(code || '').trim();
  const room = activeRooms[cleanCode];

  if (!room) return res.status(404).json({ error: '房间不存在' });

  const idx = Number(seatIndex);
  if (idx < 1 || idx > 3) return res.status(400).json({ error: '无效座位' });

  const positions: ('bottom' | 'left' | 'top' | 'right')[] = ['bottom', 'left', 'top', 'right'];
  room.seats[idx] = {
    position: positions[idx],
    playerName: botName || `电脑·人偶${idx}`,
    avatar: avatar || '🤖',
    isHost: false,
    isAI: true,
    ready: true,
  };

  return res.json({ success: true, room });
});

// Kick Player / Remove Bot
app.post('/api/rooms/kick-seat', (req, res) => {
  const { code, seatIndex } = req.body || {};
  const cleanCode = String(code || '').trim();
  const room = activeRooms[cleanCode];

  if (!room) return res.status(404).json({ error: '房间不存在' });

  const idx = Number(seatIndex);
  if (idx < 1 || idx > 3) return res.status(400).json({ error: '无法更改房主位置' });

  const positions: ('bottom' | 'left' | 'top' | 'right')[] = ['bottom', 'left', 'top', 'right'];
  room.seats[idx] = {
    position: positions[idx],
    playerName: '空位',
    avatar: '❓',
    isHost: false,
    isAI: false,
    ready: false,
  };

  return res.json({ success: true, room });
});

// Start Room Game
app.post('/api/rooms/start', (req, res) => {
  const { code } = req.body || {};
  const cleanCode = String(code || '').trim();
  const room = activeRooms[cleanCode];

  if (!room) return res.status(404).json({ error: '房间不存在' });

  // Verify all 4 seats are ready
  const readySeats = room.seats.filter(s => s.playerName !== '空位' && s.ready);
  if (readySeats.length < 4) {
    return res.status(400).json({ error: '房间必须凑齐 4 位玩家才可以开局！' });
  }

  room.status = 'PLAYING';
  addLog('ROOM_START', `房间开局 [${cleanCode}]: ${room.roomName}`);

  return res.json({ success: true, room });
});

// ---------------- START SERVER ----------------
async function start() {
  // Support PORT env var, --port argument, or default to 3000 in dev / 8080 in standalone
  let defaultPort = process.env.NODE_ENV === 'production' ? 8080 : 3000;
  let port = defaultPort;
  if (process.env.PORT) {
    port = Number(process.env.PORT);
  } else {
    const portArgIdx = process.argv.findIndex(arg => arg === '--port' || arg === '-p');
    if (portArgIdx !== -1 && process.argv[portArgIdx + 1]) {
      port = Number(process.argv[portArgIdx + 1]);
    }
  }
  const PORT = port || defaultPort;

  const isProduction = process.env.NODE_ENV === 'production';
  // 生产环境下静态资源托管目录定位（优先选择最新编译产物）
  let staticPath = path.resolve('dist');
  const distIndexPath = path.resolve('dist', 'index.html');
  const webIndexPath = path.resolve('web', 'index.html');

  if (fs.existsSync(distIndexPath) && fs.existsSync(webIndexPath)) {
    try {
      const distMtime = fs.statSync(distIndexPath).mtimeMs;
      const webMtime = fs.statSync(webIndexPath).mtimeMs;
      staticPath = distMtime >= webMtime ? path.resolve('dist') : path.resolve('web');
    } catch (_) {
      staticPath = path.resolve('dist');
    }
  } else if (fs.existsSync(distIndexPath)) {
    staticPath = path.resolve('dist');
  } else if (fs.existsSync(webIndexPath)) {
    staticPath = path.resolve('web');
  }
  console.log(`📁 生产静态资源托管目录: ${staticPath}`);
  const httpServer = http.createServer(app);

  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR === 'true' ? false : { server: httpServer },
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
    app.use('*', async (req, res, next) => {
      const url = req.originalUrl;
      try {
        let template = fs.readFileSync(path.resolve('index.html'), 'utf-8');
        template = await vite.transformIndexHtml(url, template);
        res.status(200).set({
          'Content-Type': 'text/html',
          'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
          'Pragma': 'no-cache',
          'Expires': '0',
        }).end(template);
      } catch (e) {
        if (vite.ssrFixStacktrace) vite.ssrFixStacktrace(e as Error);
        next(e);
      }
    });
  } else {
    // 强制禁用 HTML、Service Worker 与 Manifest 缓存，防止浏览器/PWA 加载旧版本
    app.use((req, res, next) => {
      const p = req.path;
      if (p === '/' || p === '/index.html' || p === '/sw.js' || p.endsWith('.webmanifest') || p.endsWith('manifest.json')) {
        res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
        res.set('Pragma', 'no-cache');
        res.set('Expires', '0');
      } else if (p.startsWith('/assets/')) {
        res.set('Cache-Control', 'public, max-age=31536000, immutable');
      }
      next();
    });

    app.use(express.static(staticPath, {
      setHeaders: (res, filePath) => {
        if (filePath.endsWith('index.html') || filePath.endsWith('sw.js') || filePath.endsWith('manifest.json') || filePath.endsWith('manifest.webmanifest')) {
          res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
          res.setHeader('Pragma', 'no-cache');
          res.setHeader('Expires', '0');
        }
      }
    }));
    app.get('*', (req, res) => {
      const indexPath = path.join(staticPath, 'index.html');
      if (fs.existsSync(indexPath)) {
        res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
        res.set('Pragma', 'no-cache');
        res.set('Expires', '0');
        res.sendFile(indexPath);
      } else {
        res.status(200).send(`<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>经典4人锄大地 & 烟三</title></head>
<body style="background:#031d14;color:#e2e8f0;font-family:system-ui,sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;text-align:center;">
  <div style="background:rgba(20,83,57,0.9);border:1px solid #10b981;padding:2.5rem;border-radius:1rem;max-width:480px;box-shadow:0 10px 25px rgba(0,0,0,0.5);">
    <h2 style="color:#fbbf24;margin-top:0;">🚀 锄大地服务端运行中</h2>
    <p style="color:#cbd5e1;line-height:1.6;">检测到前端静态资源正在准备中。请在终端执行 <code>npm run build</code> 进行前端编译打包，或稍后刷新页面。</p>
  </div>
</body>
</html>`);
      }
    });
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 锄大地游戏服务器已启动: http://0.0.0.0:${PORT}`);
    if (loadedEnvPath) {
      console.log(`📄 已载入 .env: ${loadedEnvPath}`);
    }

    // Start Real Telegram Polling if token is present
    startTelegramPolling();
  });
}

start();
