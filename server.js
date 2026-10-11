// server.ts
import express from "express";
import http from "http";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";
var envPaths = [
  path.resolve(process.cwd(), "../.env"),
  // Parent directory (Termux root above 'dd')
  path.resolve(process.cwd(), ".env"),
  // Current directory
  path.resolve(process.env.HOME || "/data/data/com.termux/files/home", ".env")
  // Termux home
];
var loadedEnvPath = "";
for (const envPath of envPaths) {
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
    loadedEnvPath = envPath;
    console.log(`\u2705 \u5DF2\u6210\u529F\u52A0\u8F7D .env \u914D\u7F6E\u6587\u4EF6: ${envPath}`);
    break;
  }
}
if (!loadedEnvPath) {
  console.log(`\u2139\uFE0F \u672A\u627E\u5230 .env \u914D\u7F6E\u6587\u4EF6\uFF0C\u5C06\u4F7F\u7528\u9ED8\u8BA4\u73AF\u5883\u53D8\u91CF\u6216\u7BA1\u7406\u63A7\u5236\u53F0\u914D\u7F6E`);
}
process.on("uncaughtException", (err) => {
  console.error("\u{1F6E1}\uFE0F [Uncaught Exception Handler] \u6355\u83B7\u672A\u5904\u7406\u5F02\u5E38\uFF0C\u4FDD\u62A4\u8FDB\u7A0B\u7EE7\u7EED\u8FD0\u884C:", err);
});
process.on("unhandledRejection", (reason, promise) => {
  console.error("\u{1F6E1}\uFE0F [Unhandled Rejection Handler] \u6355\u83B7\u672A\u5904\u7406\u7684 Promise Rejection:", reason);
});
var app = express();
app.use(express.json({ limit: "2mb" }));
var DATA_DIR = path.resolve("data");
var DATA_FILE = path.join(DATA_DIR, "db.json");
var DATA_TEMP = path.join(DATA_DIR, "db.json.tmp");
var ENV_BOT_TOKEN = process.env.BOT_TOKEN || process.env.TELEGRAM_BOT_TOKEN || process.env.TG_BOT_TOKEN || "";
var ENV_BOT_ID = process.env.BOT_ID || process.env.TELEGRAM_BOT_ID || process.env.TG_BOT_ID || (ENV_BOT_TOKEN.split(":")[0] || "");
var ENV_TG_API_HOST = process.env.TG_API_HOST || process.env.TELEGRAM_API_HOST || "https://api.telegram.org";
var ENV_SYNC_REMOTE_URL = process.env.SYNC_REMOTE_URL || process.env.REMOTE_URL || "";
var ENV_SYNC_SECRET = process.env.SYNC_SECRET_KEY || process.env.SYNC_SECRET || "chudadi_sync_secret_8888";
var ENV_NODE_ROLE = process.env.NODE_ROLE || (process.env.SERV00 ? "serv00_cloud" : process.env.TERMUX_VERSION ? "termux_local" : "standalone");
var ENV_NODE_NAME = process.env.NODE_NAME || (ENV_NODE_ROLE === "serv00_cloud" ? "Serv00-Cloud-Master" : ENV_NODE_ROLE === "termux_local" ? "Termux-Mobile-Node" : "ChuDaDi-Primary-Node");
var ENV_ENABLE_TG_BOT = process.env.ENABLE_TG_BOT !== void 0 ? process.env.ENABLE_TG_BOT === "true" : ENV_NODE_ROLE === "termux_local" ? false : true;
var DEFAULT_ADMIN_PHONE = "13800138000";
var defaultDb = {
  authorizedPhones: [
    DEFAULT_ADMIN_PHONE,
    "18888888888",
    "15999999999",
    "13333333333",
    "13666666666",
    "13999999999"
  ],
  users: {
    [DEFAULT_ADMIN_PHONE]: {
      phone: DEFAULT_ADMIN_PHONE,
      nickname: "\u9504\u795E\u5927\u53F8\u9A6C",
      password: "admin8",
      // 6 characters
      avatar: "\u{1F60E}",
      coins: 88888,
      diamonds: 888,
      wins: 66,
      losses: 12,
      isBotAdmin: true,
      createdAt: (/* @__PURE__ */ new Date()).toISOString(),
      updatedAt: (/* @__PURE__ */ new Date()).toISOString()
    },
    "18888888888": {
      phone: "18888888888",
      nickname: "\u8D4C\u5723\u963F\u661F",
      password: "123456",
      // 6 characters
      avatar: "\u{1F451}",
      coins: 5e4,
      diamonds: 500,
      wins: 30,
      losses: 10,
      isBotAdmin: false,
      createdAt: (/* @__PURE__ */ new Date()).toISOString(),
      updatedAt: (/* @__PURE__ */ new Date()).toISOString()
    }
  },
  botConfig: {
    token: ENV_BOT_TOKEN || "7890123456:AAFdExampleTokenForChuDaDiBot",
    botUsername: "@ChuDaDiGame_Bot",
    botId: ENV_BOT_ID || "7890123456",
    adminId: "123456789",
    webhookUrl: "https://example.com/api/bot/webhook"
  },
  syncConfig: {
    nodeRole: ENV_NODE_ROLE,
    nodeName: ENV_NODE_NAME,
    enableBotPolling: ENV_ENABLE_TG_BOT,
    remoteUrl: ENV_SYNC_REMOTE_URL,
    syncSecret: ENV_SYNC_SECRET,
    autoSync: true,
    autoSyncIntervalMinutes: 5,
    lastSyncTime: "",
    lastSyncStatus: "idle",
    lastSyncMessage: "\u7B49\u5F85\u540C\u6B65"
  },
  logs: [
    {
      id: "1",
      time: (/* @__PURE__ */ new Date()).toISOString(),
      type: "SYSTEM",
      message: loadedEnvPath ? `\u8F7D\u5165\u914D\u7F6E\u6587\u4EF6 ${loadedEnvPath}\uFF0C\u8282\u70B9\u89D2\u8272: ${ENV_NODE_ROLE}\uFF0C\u5355Bot\u6A21\u5F0F: ${ENV_ENABLE_TG_BOT ? "\u672C\u7AEF\u5E38\u9A7B\u62C9\u53D6" : "\u7531\u4E91\u7AEF\u62C9\u53D6"}` : `\u670D\u52A1\u542F\u52A8\uFF0C\u8282\u70B9\u89D2\u8272: ${ENV_NODE_ROLE}\uFF0C\u5355Bot\u6A21\u5F0F: ${ENV_ENABLE_TG_BOT ? "\u672C\u7AEF\u5E38\u9A7B\u62C9\u53D6" : "\u7531\u4E91\u7AEF\u62C9\u53D6"}`
    }
  ]
};
function loadDatabase() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (fs.existsSync(DATA_FILE)) {
      const data = fs.readFileSync(DATA_FILE, "utf-8");
      const parsed = JSON.parse(data);
      const merged = { ...defaultDb, ...parsed };
      if (!merged.syncConfig) {
        merged.syncConfig = { ...defaultDb.syncConfig };
      } else {
        merged.syncConfig = { ...defaultDb.syncConfig, ...merged.syncConfig };
      }
      if (ENV_BOT_TOKEN) merged.botConfig.token = ENV_BOT_TOKEN;
      if (ENV_BOT_ID) merged.botConfig.botId = ENV_BOT_ID;
      if (ENV_SYNC_REMOTE_URL && !merged.syncConfig.remoteUrl) merged.syncConfig.remoteUrl = ENV_SYNC_REMOTE_URL;
      if (process.env.SYNC_SECRET_KEY) merged.syncConfig.syncSecret = process.env.SYNC_SECRET_KEY;
      if (process.env.NODE_ROLE) merged.syncConfig.nodeRole = ENV_NODE_ROLE;
      if (process.env.ENABLE_TG_BOT !== void 0) {
        merged.syncConfig.enableBotPolling = process.env.ENABLE_TG_BOT === "true";
      }
      return merged;
    }
  } catch (err) {
    console.error("Error loading db.json:", err);
  }
  return defaultDb;
}
function saveDatabase(dbSchema) {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    const content = JSON.stringify(dbSchema, null, 2);
    fs.writeFileSync(DATA_TEMP, content, "utf-8");
    fs.renameSync(DATA_TEMP, DATA_FILE);
  } catch (err) {
    console.error("Error saving db.json atomically, trying direct write:", err);
    try {
      fs.writeFileSync(DATA_FILE, JSON.stringify(dbSchema, null, 2), "utf-8");
    } catch (fallbackErr) {
      console.error("Fatal error saving db.json:", fallbackErr);
    }
  }
}
var db = loadDatabase();
function addLog(type, message) {
  const logItem = {
    id: String(Date.now()),
    time: (/* @__PURE__ */ new Date()).toLocaleTimeString(),
    type,
    message
  };
  db.logs.unshift(logItem);
  if (db.logs.length > 100) db.logs = db.logs.slice(0, 100);
  saveDatabase(db);
}
var BOT_KEYBOARD = {
  keyboard: [
    [{ text: "\u{1F4F1} \u6388\u6743\u624B\u673A\u53F7" }, { text: "\u{1F4CB} \u6388\u6743\u5217\u8868" }],
    [{ text: "\u{1F465} \u73A9\u5BB6\u6E05\u5355" }, { text: "\u{1F4B0} \u5145\u503C\u79EF\u5206" }],
    [{ text: "\u{1F511} \u91CD\u7F6E\u5BC6\u7801" }, { text: "\u2139\uFE0F \u8FD0\u884C\u72B6\u6001" }]
  ],
  resize_keyboard: true,
  one_time_keyboard: false
};
function formatBotTokenPath(rawToken) {
  const clean = rawToken.trim();
  if (!clean) return "";
  if (clean.toLowerCase().startsWith("bot")) {
    return clean;
  }
  return `bot${clean}`;
}
async function sendTelegramMessage(chatId, text, botToken, includeKeyboard = true) {
  const token = botToken || db.botConfig.token;
  if (!token || token.includes("ExampleToken")) return;
  try {
    const tokenPath = formatBotTokenPath(token);
    const url = `${ENV_TG_API_HOST}/${tokenPath}/sendMessage`;
    const payload = {
      chat_id: chatId,
      text,
      parse_mode: "Markdown"
    };
    if (includeKeyboard) {
      payload.reply_markup = BOT_KEYBOARD;
    }
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
  } catch (err) {
    console.error("Failed to send Telegram message:", err);
  }
}
function processTelegramCommand(commandText, chatId = "123456789") {
  const cleanText = commandText.trim();
  const parts = cleanText.split(/\s+/);
  const cmd = parts[0].toLowerCase();
  const arg1 = parts[1] || "";
  const arg2 = parts[2] || "";
  if (cleanText === "\u{1F4F1} \u6388\u6743\u624B\u673A\u53F7") {
    return "\u{1F4F1} *\u624B\u673A\u53F7\u6CE8\u518C\u6388\u6743*\n\n\u8BF7\u53D1\u9001\u6307\u4EE4\uFF1A\n`/auth \u624B\u673A\u53F7`\n\n\u4F8B\u5982\uFF1A`/auth 13912345678`";
  }
  if (cleanText === "\u{1F4CB} \u6388\u6743\u5217\u8868") {
    return processTelegramCommand("/list", chatId);
  }
  if (cleanText === "\u{1F465} \u73A9\u5BB6\u6E05\u5355") {
    return processTelegramCommand("/users", chatId);
  }
  if (cleanText === "\u{1F4B0} \u5145\u503C\u79EF\u5206") {
    return "\u{1F4B0} *\u79EF\u5206\u5145\u503C\u529F\u80FD*\n\n\u8BF7\u53D1\u9001\u6307\u4EE4\uFF1A\n`/addcoins \u624B\u673A\u53F7 \u79EF\u5206\u6570\u91CF`\n\n\u4F8B\u5982\uFF1A`/addcoins 13800138000 50000`";
  }
  if (cleanText === "\u{1F511} \u91CD\u7F6E\u5BC6\u7801") {
    return "\u{1F511} *\u91CD\u7F6E\u73A9\u5BB6 6 \u4F4D\u6570\u5BC6\u7801*\n\n\u8BF7\u53D1\u9001\u6307\u4EE4\uFF1A\n`/resetpwd \u624B\u673A\u53F7 6\u4F4D\u65B0\u5BC6\u7801`\n\n\u4F8B\u5982\uFF1A`/resetpwd 13800138000 666888`";
  }
  if (cleanText === "\u2139\uFE0F \u8FD0\u884C\u72B6\u6001") {
    return processTelegramCommand("/info", chatId);
  }
  let replyText = "";
  switch (cmd) {
    case "/start":
    case "/menu":
    case "/help":
      replyText = "\u{1F916} *\u9504\u5927\u5730 Telegram \u7BA1\u7406\u63A7\u5236\u9762\u677F*\n\n\u5DF2\u4E3A\u4F60\u542F\u52A8\u5E95\u90E8**\u4EA4\u4E92\u6309\u952E\u83DC\u5355**\uFF0C\u4F60\u53EF\u4EE5\u76F4\u63A5\u70B9\u51FB\u4E0B\u65B9\u6309\u94AE\u6216\u53D1\u9001\u5FEB\u6377\u6307\u4EE4\uFF1A\n\n\u{1F539} `/auth \u624B\u673A\u53F7` - \u6388\u6743\u8BE5\u624B\u673A\u53F7\u6CE8\u518C\u8D26\u53F7\n\u{1F539} `/unauth \u624B\u673A\u53F7` - \u53D6\u6D88\u624B\u673A\u53F7\u6CE8\u518C\u6388\u6743\n\u{1F539} `/list` - \u67E5\u770B\u5DF2\u6388\u6743\u624B\u673A\u53F7\u6E05\u5355\n\u{1F539} `/users` - \u67E5\u770B\u73A9\u5BB6\u5217\u8868\u4E0E\u79EF\u5206\n\u{1F539} `/addcoins \u624B\u673A\u53F7 \u79EF\u5206` - \u5145\u503C\u6E38\u620F\u79EF\u5206\n\u{1F539} `/resetpwd \u624B\u673A\u53F7 6\u4F4D\u5BC6\u7801` - \u91CD\u7F6E\u5BC6\u7801\n\u{1F539} `/info` - \u67E5\u770B\u8282\u70B9\u8FD0\u884C\u72B6\u6001";
      break;
    case "/auth":
    case "/authorize":
      if (!arg1) {
        replyText = "\u274C \u683C\u5F0F\u9519\u8BEF\uFF01\u6B63\u786E\u683C\u5F0F\uFF1A`/auth \u624B\u673A\u53F7` \u4F8B\u5982\uFF1A`/auth 13988889999`";
      } else {
        if (!db.authorizedPhones.includes(arg1)) {
          db.authorizedPhones.push(arg1);
          saveDatabase(db);
          addLog("TG_BOT", `Telegram Bot \u6210\u529F\u6388\u6743\u624B\u673A\u53F7: ${arg1}`);
          replyText = `\u2705 \u6388\u6743\u6210\u529F\uFF01\u624B\u673A\u53F7 \`${arg1}\` \u5DF2\u83B7\u5F97\u6CE8\u518C\u6743\u9650\uFF0C\u73B0\u5728\u53EF\u5728\u6E38\u620F\u4E2D\u8FDB\u884C\u6CE8\u518C\u3002`;
        } else {
          replyText = `\u2139\uFE0F \u624B\u673A\u53F7 \`${arg1}\` \u4E4B\u524D\u5DF2\u7ECF\u83B7\u5F97\u8FC7\u6388\u6743\u3002`;
        }
      }
      break;
    case "/unauth":
    case "/revoke":
      if (!arg1) {
        replyText = "\u274C \u683C\u5F0F\u9519\u8BEF\uFF01\u6B63\u786E\u683C\u5F0F\uFF1A`/unauth \u624B\u673A\u53F7`";
      } else {
        db.authorizedPhones = db.authorizedPhones.filter((p) => p !== arg1);
        saveDatabase(db);
        addLog("TG_BOT", `Telegram Bot \u53D6\u6D88\u6388\u6743\u624B\u673A\u53F7: ${arg1}`);
        replyText = `\u{1F6D1} \u5DF2\u53D6\u6D88\u624B\u673A\u53F7 \`${arg1}\` \u7684\u6CE8\u518C\u6388\u6743\uFF01`;
      }
      break;
    case "/list":
      replyText = `\u{1F4CB} *\u5DF2\u6388\u6743\u624B\u673A\u53F7\u5217\u8868 (${db.authorizedPhones.length} \u4E2A)*:
` + db.authorizedPhones.map(
        (p, idx) => `${idx + 1}. \`${p}\` ${db.users[p] ? "\u2705 (\u5DF2\u6CE8\u518C: " + db.users[p].nickname + ")" : "\u23F3 (\u672A\u6CE8\u518C)"}`
      ).join("\n");
      break;
    case "/users":
      const userList = Object.values(db.users);
      replyText = `\u{1F465} *\u6CE8\u518C\u73A9\u5BB6\u5217\u8868 (${userList.length} \u4EBA)*:
` + userList.map(
        (u, idx) => `${idx + 1}. *${u.nickname}* (\`${u.phone}\`) - \u{1F4B0}${u.coins.toLocaleString()}\u79EF\u5206 [${u.isBotAdmin ? "\u{1F451}\u7BA1\u7406\u5458" : "\u73A9\u5BB6"}]`
      ).join("\n");
      break;
    case "/addcoins":
      if (!arg1 || !arg2 || isNaN(Number(arg2))) {
        replyText = "\u274C \u683C\u5F0F\u9519\u8BEF\uFF01\u6B63\u786E\u683C\u5F0F\uFF1A`/addcoins \u624B\u673A\u53F7 \u79EF\u5206\u6570\u91CF` \u4F8B\u5982 `/addcoins 13800138000 50000`";
      } else {
        const u = db.users[arg1];
        if (!u) {
          replyText = `\u274C \u672A\u627E\u5230\u624B\u673A\u53F7\u4E3A \`${arg1}\` \u7684\u73A9\u5BB6\uFF0C\u8BF7\u5148\u786E\u8BA4\u624B\u673A\u53F7\u3002`;
        } else {
          const delta = Number(arg2);
          u.coins += delta;
          u.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
          saveDatabase(db);
          addLog("TG_BOT", `TG \u5145\u503C\u73A9\u5BB6 ${u.nickname} \u79EF\u5206: ${delta}`);
          replyText = `\u{1F4B0} \u5145\u503C\u6210\u529F\uFF01\u73A9\u5BB6 *${u.nickname}* (\`${arg1}\`) \u5F53\u524D\u79EF\u5206\uFF1A\`${u.coins.toLocaleString()}\``;
        }
      }
      break;
    case "/resetpwd":
      if (!arg1 || !arg2 || arg2.length !== 6) {
        replyText = "\u274C \u683C\u5F0F\u9519\u8BEF\uFF01\u65B0\u5BC6\u7801\u5FC5\u987B\u4E3A 6 \u4F4D\u6570\u3002\u6B63\u786E\u683C\u5F0F\uFF1A`/resetpwd \u624B\u673A\u53F7 6\u4F4D\u65B0\u5BC6\u7801`";
      } else {
        const u = db.users[arg1];
        if (!u) {
          replyText = `\u274C \u672A\u627E\u5230\u624B\u673A\u53F7\u4E3A \`${arg1}\` \u7684\u73A9\u5BB6`;
        } else {
          u.password = arg2;
          u.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
          saveDatabase(db);
          addLog("TG_BOT", `TG \u91CD\u7F6E\u73A9\u5BB6 ${u.nickname} \u5BC6\u7801\u4E3A: ${arg2}`);
          replyText = `\u{1F511} \u5BC6\u7801\u91CD\u7F6E\u6210\u529F\uFF01\u73A9\u5BB6 *${u.nickname}* \u7684\u65B0\u5BC6\u7801\u8BBE\u4E3A\uFF1A\`${arg2}\``;
        }
      }
      break;
    case "/info":
      replyText = `\u2139\uFE0F *Telegram Bot \u8FD0\u884C\u72B6\u6001*
\u2022 \u8282\u70B9\u89D2\u8272: \`${db.syncConfig.nodeRole}\` (${db.syncConfig.nodeName}) 
\u2022 \u914D\u7F6E\u6587\u4EF6: \`${loadedEnvPath || "\u5185\u7F6E/\u73AF\u5883\u53D8\u91CF"}\` 
\u2022 Bot ID: \`${db.botConfig.botId || "7890123456"}\` 
\u2022 \u5355Bot\u5E38\u9A7B\u8F6E\u8BE2: \`${db.syncConfig.enableBotPolling ? "\u5DF2\u542F\u7528 (\u4E91\u7AEF\u5E38\u9A7B)" : "\u5DF2\u4F11\u7720 (\u7531\u4E91\u7AEF\u5E38\u9A7B)"}\` 
\u2022 \u6388\u6743\u624B\u673A\u53F7\u6570: \`${db.authorizedPhones.length}\` 
\u2022 \u6E38\u620F\u6CE8\u518C\u73A9\u5BB6: \`${Object.keys(db.users).length}\` 
\u2022 \u6570\u636E\u5BF9\u7AEF\u8282\u70B9: \`${db.syncConfig.remoteUrl || "\u672A\u914D\u7F6E"}\``;
      break;
    default:
      replyText = `\u{1F916} \u672A\u77E5\u547D\u4EE4: \`${cleanText}\`\u3002\u53D1\u9001 \`/help\` \u67E5\u770B\u952E\u76D8\u83DC\u5355\u4E0E\u6307\u4EE4\u8BF4\u660E\u3002`;
  }
  return replyText;
}
var lastUpdateId = 0;
var isPollingRunning = false;
async function startTelegramPolling() {
  const token = db.botConfig.token;
  if (!token || token.includes("ExampleToken")) {
    console.log("\u2139\uFE0F Telegram Bot Token \u672A\u914D\u7F6E\uFF0C\u53EF\u901A\u8FC7 .env \u8BBE\u7F6E BOT_TOKEN \u5F00\u542F\u8F6E\u8BE2");
    return;
  }
  if (db.syncConfig && db.syncConfig.enableBotPolling === false) {
    console.log(`\u2139\uFE0F [\u5355Bot\u6A21\u5F0F] \u5F53\u524D\u8282\u70B9 (${db.syncConfig.nodeName}) \u672A\u542F\u7528 TG \u8F6E\u8BE2 (\u5DF2\u7531\u4E91\u7AEF\u5E38\u9A7B\u8282\u70B9\u62C9\u53D6\uFF0C\u9632\u6B62 409 \u51B2\u7A81)`);
    return;
  }
  if (isPollingRunning) {
    return;
  }
  isPollingRunning = true;
  console.log(`\u{1F916} \u5F00\u59CB\u542F\u52A8 Telegram Bot \u5B9E\u65F6 Polling \u76D1\u542C (Bot ID: ${db.botConfig.botId}, Node: ${db.syncConfig.nodeName})...`);
  addLog("TG_POLLING", `Telegram Bot \u8F6E\u8BE2\u5DF2\u6FC0\u6D3B [\u8282\u70B9: ${db.syncConfig?.nodeName || "\u672C\u8282\u70B9"}]`);
  async function pollUpdates() {
    if (!isPollingRunning || db.syncConfig && db.syncConfig.enableBotPolling === false) {
      isPollingRunning = false;
      return;
    }
    try {
      const currentToken = db.botConfig.token;
      if (!currentToken || currentToken.includes("ExampleToken")) {
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
              console.log(`\u{1F4E9} \u6536\u5230 Telegram \u6765\u81EA ${chatId} \u7684\u6D88\u606F: ${text}`);
              const reply = processTelegramCommand(text, chatId);
              await sendTelegramMessage(chatId, reply, currentToken, true);
              const firstWord = text.trim().split(/\s+/)[0].toLowerCase();
              if (["/auth", "/authorize", "/unauth", "/revoke", "/addcoins", "/resetpwd"].includes(firstWord)) {
                hasChanges = true;
              }
            }
          }
          if (hasChanges) {
            triggerDebouncedSync();
          }
        }
      } else if (res.status === 409) {
        console.warn("\u26A0\uFE0F Telegram Bot \u51B2\u7A81 (409 Conflict): \u53E6\u4E00\u4E2A\u5B9E\u4F8B\u6B63\u5728\u62C9\u53D6\u8BE5 Bot Token\u3002\u5DF2\u6682\u505C\u5F53\u524D\u8F6E\u8BE2\u4EE5\u907F\u514D\u7ADE\u4E89\u3002");
        addLog("TG_CONFLICT", "\u68C0\u6D4B\u5230\u5176\u4ED6\u8282\u70B9\u5DF2\u5728\u8FD0\u884C\u6B64 Bot (409 Conflict)\uFF0C\u5F53\u524D\u8282\u70B9\u81EA\u52A8\u4F11\u7720");
        isPollingRunning = false;
        return;
      }
    } catch (err) {
    } finally {
      if (isPollingRunning && db.syncConfig?.enableBotPolling !== false) {
        setTimeout(pollUpdates, 2e3);
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
    addLog("TG_POLLING", "\u5DF2\u505C\u7528\u672C\u8282\u70B9\u7684 Telegram Bot \u8F6E\u8BE2");
    console.log("\u{1F6D1} Telegram Bot \u8F6E\u8BE2\u5DF2\u505C\u7528");
  }
}
function mergeDatabases(local, incoming) {
  const phoneSet = /* @__PURE__ */ new Set([
    ...local.authorizedPhones || [],
    ...incoming.authorizedPhones || []
  ]);
  const mergedPhones = Array.from(phoneSet);
  const addedPhones = mergedPhones.length - (local.authorizedPhones?.length || 0);
  const mergedUsers = { ...local.users || {} };
  const allUserPhones = /* @__PURE__ */ new Set([
    ...Object.keys(local.users || {}),
    ...Object.keys(incoming.users || {})
  ]);
  let mergedUsersCount = 0;
  for (const phone of allUserPhones) {
    const uLocal = local.users ? local.users[phone] : void 0;
    const uInc = incoming.users ? incoming.users[phone] : void 0;
    if (uLocal && !uInc) {
      mergedUsers[phone] = uLocal;
    } else if (!uLocal && uInc) {
      mergedUsers[phone] = uInc;
      mergedUsersCount++;
    } else if (uLocal && uInc) {
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
        updatedAt: new Date(Math.max(localTime, incTime, Date.now())).toISOString()
      };
      mergedUsersCount++;
    }
  }
  return {
    authorizedPhones: mergedPhones,
    users: mergedUsers,
    addedPhones,
    mergedUsersCount
  };
}
async function executeSync(action = "two-way") {
  const remoteUrl = (db.syncConfig.remoteUrl || "").trim().replace(/\/+$/, "");
  const syncSecret = (db.syncConfig.syncSecret || "").trim();
  if (!remoteUrl) {
    return { success: false, message: "\u672A\u914D\u7F6E\u5BF9\u7AEF\u670D\u52A1\u5668\u5730\u5740 (Remote URL)" };
  }
  db.syncConfig.lastSyncStatus = "syncing";
  db.syncConfig.lastSyncMessage = `\u6B63\u5728\u4E0E ${remoteUrl} \u5EFA\u7ACB\u540C\u6B65\u8FDE\u63A5...`;
  try {
    const payload = {
      action,
      senderNode: db.syncConfig.nodeName || "ChuDaDi-Node",
      senderRole: db.syncConfig.nodeRole,
      data: {
        authorizedPhones: db.authorizedPhones,
        users: db.users
      }
    };
    const targetUrl = `${remoteUrl}/api/sync/receive`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12e3);
    const res = await fetch(targetUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Sync-Secret": syncSecret
      },
      body: JSON.stringify(payload),
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      const errMsg = errData.error || `HTTP \u9519\u8BEF ${res.status}`;
      db.syncConfig.lastSyncStatus = "error";
      db.syncConfig.lastSyncMessage = `\u540C\u6B65\u5931\u8D25: ${errMsg}`;
      return { success: false, message: `\u5BF9\u7AEF\u54CD\u5E94\u9519\u8BEF: ${errMsg}` };
    }
    const resData = await res.json();
    if (!resData.success) {
      db.syncConfig.lastSyncStatus = "error";
      db.syncConfig.lastSyncMessage = resData.error || "\u540C\u6B65\u5931\u8D25";
      return { success: false, message: resData.error || "\u540C\u6B65\u5931\u8D25" };
    }
    if (action === "two-way" && resData.mergedData) {
      db.authorizedPhones = resData.mergedData.authorizedPhones;
      db.users = resData.mergedData.users;
    } else if (action === "pull" && resData.remoteData) {
      db.authorizedPhones = resData.remoteData.authorizedPhones;
      db.users = resData.remoteData.users;
    }
    const nowStr = (/* @__PURE__ */ new Date()).toLocaleTimeString();
    db.syncConfig.lastSyncTime = nowStr;
    db.syncConfig.lastSyncStatus = "success";
    const summaryMsg = `\u540C\u6B65\u5B8C\u6210 (${action}): \u6388\u6743\u624B\u673A ${db.authorizedPhones.length} \u4E2A, \u73A9\u5BB6\u8D26\u53F7 ${Object.keys(db.users).length} \u4F4D [\u5BF9\u7AEF: ${resData.nodeName || remoteUrl}]`;
    db.syncConfig.lastSyncMessage = summaryMsg;
    addLog("DATA_SYNC", summaryMsg);
    saveDatabase(db);
    return {
      success: true,
      message: summaryMsg,
      stats: {
        authorizedPhonesCount: db.authorizedPhones.length,
        usersCount: Object.keys(db.users).length,
        remoteNodeName: resData.nodeName
      }
    };
  } catch (err) {
    const errMsg = err.name === "AbortError" ? "\u8FDE\u63A5\u8D85\u65F6 (12\u79D2)" : err.message || "\u7F51\u7EDC\u8FDE\u63A5\u5931\u8D25";
    db.syncConfig.lastSyncStatus = "error";
    db.syncConfig.lastSyncMessage = `\u540C\u6B65\u5931\u8D25: ${errMsg}`;
    saveDatabase(db);
    return { success: false, message: `\u8FDE\u63A5\u5F02\u5E38: ${errMsg}` };
  }
}
var debouncedSyncTimer = null;
function triggerDebouncedSync() {
  if (!db.syncConfig || !db.syncConfig.autoSync || !db.syncConfig.remoteUrl) return;
  if (debouncedSyncTimer) clearTimeout(debouncedSyncTimer);
  debouncedSyncTimer = setTimeout(() => {
    executeSync("two-way").catch(() => {
    });
  }, 2500);
}
setInterval(() => {
  try {
    if (db.syncConfig && db.syncConfig.autoSync && db.syncConfig.remoteUrl) {
      executeSync("two-way").catch((err) => {
        console.error("Periodic auto-sync background error:", err.message);
      });
    }
  } catch (err) {
    console.error("Error in periodic auto-sync interval:", err);
  }
}, 5 * 60 * 1e3);
app.get("/api/bot/env-status", (req, res) => {
  return res.json({
    loadedEnvPath,
    botConfig: db.botConfig,
    authorizedPhonesCount: db.authorizedPhones.length,
    usersCount: Object.keys(db.users).length
  });
});
app.post("/api/bot/set-webhook", async (req, res) => {
  const { webhookUrl } = req.body || {};
  const token = db.botConfig.token;
  if (!token || token.includes("ExampleToken")) {
    return res.status(400).json({ error: "\u8BF7\u5148\u914D\u7F6E\u6709\u6548\u7684 Telegram BOT_TOKEN" });
  }
  const urlToSet = webhookUrl || db.botConfig.webhookUrl;
  if (!urlToSet) {
    return res.status(400).json({ error: "\u8BF7\u63D0\u4F9B Webhook URL \u5730\u5740" });
  }
  try {
    const tokenPath = formatBotTokenPath(token);
    const tgUrl = `${ENV_TG_API_HOST}/${tokenPath}/setWebhook?url=${encodeURIComponent(urlToSet)}`;
    const tgRes = await fetch(tgUrl);
    const tgData = await tgRes.json();
    if (tgData.ok) {
      db.botConfig.webhookUrl = urlToSet;
      saveDatabase(db);
      addLog("TG_WEBHOOK", `\u6CE8\u518C Telegram Webhook \u6210\u529F: ${urlToSet}`);
      return res.json({ success: true, message: `\u2705 \u6210\u529F\u7ED1\u5B9A Webhook \u5230: ${urlToSet}`, result: tgData });
    } else {
      return res.status(400).json({ error: tgData.description || "\u7ED1\u5B9A\u5931\u8D25" });
    }
  } catch (err) {
    return res.status(500).json({ error: err.message || "\u8BBE\u7F6E Webhook \u51FA\u9519" });
  }
});
app.get("/api/auth/check-phone", (req, res) => {
  const phone = String(req.query.phone || "").trim();
  if (!phone) {
    return res.status(400).json({ error: "\u8BF7\u63D0\u4F9B\u624B\u673A\u53F7" });
  }
  const isAuthorized = db.authorizedPhones.includes(phone);
  const isRegistered = !!db.users[phone];
  return res.json({
    phone,
    isAuthorized,
    isRegistered,
    message: isAuthorized ? isRegistered ? "\u8BE5\u624B\u673A\u53F7\u5DF2\u83B7\u5F97 TG \u6388\u6743\u4E14\u5DF2\u6CE8\u518C" : "\u8BE5\u624B\u673A\u53F7\u5DF2\u83B7\u5F97 TG \u6388\u6743\uFF0C\u53EF\u8FDB\u884C\u6CE8\u518C" : "\u8BE5\u624B\u673A\u53F7\u672A\u7ECF Telegram Bot \u6388\u6743\uFF0C\u65E0\u6CD5\u6CE8\u518C"
  });
});
app.post("/api/auth/register", (req, res) => {
  const { phone, nickname, password, avatar } = req.body || {};
  const cleanPhone = String(phone || "").trim();
  const cleanNickname = String(nickname || "").trim();
  const cleanPassword = String(password || "").trim();
  if (!cleanPhone || !cleanNickname || !cleanPassword) {
    return res.status(400).json({ error: "\u8BF7\u586B\u5199\u624B\u673A\u53F7\u3001\u6635\u79F0\u548C\u5BC6\u7801" });
  }
  if (!db.authorizedPhones.includes(cleanPhone)) {
    return res.status(403).json({
      error: "\u8BE5\u624B\u673A\u53F7\u672A\u83B7\u5F97 Telegram Bot \u6388\u6743\uFF01\u8BF7\u901A\u8FC7 Telegram \u673A\u5668\u4EBA\u6388\u6743\u540E\u518D\u8FDB\u884C\u6CE8\u518C\u3002"
    });
  }
  if (cleanPassword.length !== 6) {
    return res.status(400).json({ error: "\u5BC6\u7801\u5FC5\u987B\u4E3A 6 \u4F4D\u6570 (\u4E0D\u9650\u5927\u5C0F\u5199\u5B57\u6BCD\u6216\u6570\u5B57)" });
  }
  if (db.users[cleanPhone]) {
    return res.status(400).json({ error: "\u8BE5\u624B\u673A\u53F7\u5DF2\u6CE8\u518C\uFF0C\u8BF7\u76F4\u63A5\u767B\u5F55" });
  }
  const nowIso = (/* @__PURE__ */ new Date()).toISOString();
  const newUser = {
    phone: cleanPhone,
    nickname: cleanNickname,
    password: cleanPassword,
    avatar: avatar || "\u{1F60E}",
    coins: 3e4,
    diamonds: 300,
    wins: 0,
    losses: 0,
    isBotAdmin: cleanPhone === DEFAULT_ADMIN_PHONE,
    createdAt: nowIso,
    updatedAt: nowIso
  };
  db.users[cleanPhone] = newUser;
  addLog("REGISTER", `\u65B0\u7528\u6237\u6CE8\u518C: ${cleanNickname} (${cleanPhone})`);
  saveDatabase(db);
  triggerDebouncedSync();
  return res.json({
    success: true,
    user: newUser,
    message: "\u6CE8\u518C\u6210\u529F\uFF0C\u6B22\u8FCE\u52A0\u5165\u9504\u5927\u5730\uFF01"
  });
});
app.post("/api/auth/login", (req, res) => {
  const { phoneOrNickname, password } = req.body || {};
  const query = String(phoneOrNickname || "").trim();
  const cleanPassword = String(password || "").trim();
  if (!query || !cleanPassword) {
    return res.status(400).json({ error: "\u8BF7\u8F93\u5165\u624B\u673A\u53F7/\u6635\u79F0\u548C\u5BC6\u7801" });
  }
  const user = Object.values(db.users).find(
    (u) => u.phone === query || u.nickname === query
  );
  if (!user) {
    return res.status(404).json({ error: "\u8D26\u53F7\u4E0D\u5B58\u5728\uFF0C\u8BF7\u5148\u6838\u5BF9\u624B\u673A\u53F7\u6216\u8FDB\u884C\u6CE8\u518C" });
  }
  if (user.password.toLowerCase() !== cleanPassword.toLowerCase()) {
    return res.status(401).json({ error: "\u5BC6\u7801\u4E0D\u6B63\u786E\uFF0C\u5BC6\u7801\u4E3A 6 \u4F4D\u6570" });
  }
  addLog("LOGIN", `\u7528\u6237\u767B\u5F55: ${user.nickname} (${user.phone})`);
  return res.json({
    success: true,
    user,
    message: "\u767B\u5F55\u6210\u529F\uFF01"
  });
});
app.post("/api/auth/update-profile", (req, res) => {
  const { phone, coins, wins, losses, nickname, avatar } = req.body || {};
  if (!phone || !db.users[phone]) {
    return res.status(400).json({ error: "\u65E0\u6548\u7528\u6237" });
  }
  const user = db.users[phone];
  if (typeof coins === "number") user.coins = coins;
  if (typeof wins === "number") user.wins = wins;
  if (typeof losses === "number") user.losses = losses;
  if (nickname) user.nickname = nickname;
  if (avatar) user.avatar = avatar;
  user.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
  saveDatabase(db);
  triggerDebouncedSync();
  return res.json({ success: true, user });
});
app.post("/api/bot/authorize-phone", (req, res) => {
  const phone = String(req.body.phone || "").trim();
  if (!phone) {
    return res.status(400).json({ error: "\u8BF7\u8F93\u5165\u8981\u6388\u6743\u7684\u624B\u673A\u53F7" });
  }
  if (!db.authorizedPhones.includes(phone)) {
    db.authorizedPhones.push(phone);
    addLog("TG_BOT_AUTH", `\u7BA1\u7406\u5458/Bot \u6388\u6743\u65B0\u624B\u673A\u53F7: ${phone}`);
    saveDatabase(db);
    triggerDebouncedSync();
  }
  return res.json({
    success: true,
    phone,
    authorizedPhones: db.authorizedPhones,
    message: `\u624B\u673A\u53F7 ${phone} \u5DF2\u6210\u529F\u6388\u6743\uFF01`
  });
});
app.post("/api/bot/revoke-phone", (req, res) => {
  const phone = String(req.body.phone || "").trim();
  if (!phone) {
    return res.status(400).json({ error: "\u8BF7\u8F93\u5165\u624B\u673A\u53F7" });
  }
  db.authorizedPhones = db.authorizedPhones.filter((p) => p !== phone);
  addLog("TG_BOT_REVOKE", `\u53D6\u6D88\u6388\u6743\u624B\u673A\u53F7: ${phone}`);
  saveDatabase(db);
  triggerDebouncedSync();
  return res.json({
    success: true,
    phone,
    authorizedPhones: db.authorizedPhones,
    message: `\u5DF2\u53D6\u6D88\u624B\u673A\u53F7 ${phone} \u7684\u6388\u6743`
  });
});
app.get("/api/admin/users", (req, res) => {
  return res.json({
    users: Object.values(db.users),
    authorizedPhones: db.authorizedPhones,
    logs: db.logs,
    botConfig: db.botConfig,
    syncConfig: db.syncConfig,
    isBotPollingActive: isPollingRunning,
    loadedEnvPath
  });
});
app.post("/api/admin/modify-user", (req, res) => {
  const { phone, coins, password, isBotAdmin, action } = req.body || {};
  const user = db.users[phone];
  if (!user && action !== "CREATE_AND_AUTH") {
    return res.status(404).json({ error: "\u672A\u627E\u5230\u8BE5\u7528\u6237" });
  }
  if (action === "DELETE_USER") {
    delete db.users[phone];
    addLog("ADMIN_DELETE", `\u7BA1\u7406\u5458\u5220\u9664\u7528\u6237: ${phone}`);
    saveDatabase(db);
    triggerDebouncedSync();
    return res.json({ success: true, message: `\u5DF2\u5220\u9664\u7528\u6237 ${phone}` });
  }
  if (typeof coins === "number" && user) {
    user.coins = coins;
    user.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
    addLog("ADMIN_COINS", `\u4FEE\u6539\u7528\u6237 ${user.nickname} \u79EF\u5206: ${coins}`);
  }
  if (password && user) {
    if (password.length !== 6) {
      return res.status(400).json({ error: "\u65B0\u5BC6\u7801\u5FC5\u987B\u4E3A 6 \u4F4D\u6570" });
    }
    user.password = password;
    user.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
    addLog("ADMIN_PASSWORD", `\u91CD\u7F6E\u7528\u6237 ${user.nickname} \u5BC6\u7801\u4E3A: ${password}`);
  }
  if (typeof isBotAdmin === "boolean" && user) {
    user.isBotAdmin = isBotAdmin;
    user.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
    addLog("ADMIN_ROLE", `\u4FEE\u6539\u7528\u6237 ${user.nickname} Bot \u7BA1\u7406\u5458\u6743\u9650: ${isBotAdmin}`);
  }
  saveDatabase(db);
  triggerDebouncedSync();
  return res.json({ success: true, user, users: Object.values(db.users) });
});
app.post("/api/bot/config", (req, res) => {
  const { token, botUsername, botId, adminId, webhookUrl } = req.body || {};
  if (token !== void 0) db.botConfig.token = token;
  if (botUsername !== void 0) db.botConfig.botUsername = botUsername;
  if (botId !== void 0) db.botConfig.botId = botId;
  if (adminId !== void 0) db.botConfig.adminId = adminId;
  if (webhookUrl !== void 0) db.botConfig.webhookUrl = webhookUrl;
  addLog("BOT_CONFIG", "\u66F4\u65B0 Telegram Bot \u914D\u7F6E\u4FE1\u606F");
  saveDatabase(db);
  if (db.syncConfig.enableBotPolling) {
    startTelegramPolling();
  }
  return res.json({ success: true, botConfig: db.botConfig });
});
app.get("/api/bot/webhook", (req, res) => {
  return res.json({
    status: "ok",
    message: "\u2705 Telegram Bot Webhook \u63A5\u53E3\u670D\u52A1\u6B63\u5E38\u5728\u7EBF\uFF01\u8BF7\u5728 Telegram \u8F6F\u4EF6\u4E2D\u5411 Bot \u53D1\u9001\u6307\u4EE4\u8FDB\u884C\u5BF9\u8BB2\u3002",
    botId: db.botConfig.botId,
    botUsername: db.botConfig.botUsername,
    authorizedPhonesCount: db.authorizedPhones.length,
    usersCount: Object.keys(db.users).length
  });
});
app.post("/api/bot/webhook", async (req, res) => {
  const body = req.body || {};
  let commandText = "";
  let chatId = "";
  if (body.message && body.message.text) {
    commandText = body.message.text.trim();
    chatId = body.message.chat?.id || "";
  } else if (body.text) {
    commandText = String(body.text).trim();
  }
  if (!commandText) {
    return res.json({ status: "ignored", reason: "No text message" });
  }
  console.log(`\u{1F4E9} \u6536\u5230 Telegram Webhook \u6307\u4EE4 [Chat: ${chatId}]: ${commandText}`);
  addLog("TG_WEBHOOK", `\u63A5\u6536\u5230 Telegram Webhook \u6307\u4EE4: ${commandText}`);
  const replyText = processTelegramCommand(commandText, chatId || "123456789");
  const firstWord = commandText.split(/\s+/)[0].toLowerCase();
  if (["/auth", "/authorize", "/unauth", "/revoke", "/addcoins", "/resetpwd"].includes(firstWord)) {
    triggerDebouncedSync();
  }
  if (chatId) {
    sendTelegramMessage(chatId, replyText, db.botConfig.token, true).catch(() => {
    });
  }
  if (chatId) {
    return res.json({
      method: "sendMessage",
      chat_id: chatId,
      text: replyText,
      parse_mode: "Markdown",
      reply_markup: BOT_KEYBOARD
    });
  }
  return res.json({
    ok: true,
    replyText,
    authorizedPhones: db.authorizedPhones,
    usersCount: Object.keys(db.users).length
  });
});
app.get("/api/sync/status", (req, res) => {
  return res.json({
    syncConfig: db.syncConfig,
    isBotPollingActive: isPollingRunning,
    authorizedPhonesCount: db.authorizedPhones.length,
    usersCount: Object.keys(db.users).length
  });
});
app.post("/api/sync/config", (req, res) => {
  const {
    nodeRole,
    nodeName,
    enableBotPolling,
    remoteUrl,
    syncSecret,
    autoSync,
    autoSyncIntervalMinutes
  } = req.body || {};
  if (nodeRole !== void 0) db.syncConfig.nodeRole = nodeRole;
  if (nodeName !== void 0) db.syncConfig.nodeName = String(nodeName).trim();
  if (remoteUrl !== void 0) db.syncConfig.remoteUrl = String(remoteUrl).trim();
  if (syncSecret !== void 0) db.syncConfig.syncSecret = String(syncSecret).trim();
  if (autoSync !== void 0) db.syncConfig.autoSync = !!autoSync;
  if (autoSyncIntervalMinutes !== void 0) {
    db.syncConfig.autoSyncIntervalMinutes = Math.max(1, Number(autoSyncIntervalMinutes) || 5);
  }
  if (enableBotPolling !== void 0) {
    const prev = db.syncConfig.enableBotPolling;
    db.syncConfig.enableBotPolling = !!enableBotPolling;
    if (!prev && db.syncConfig.enableBotPolling) {
      startTelegramPolling();
    } else if (prev && !db.syncConfig.enableBotPolling) {
      stopTelegramPolling();
    }
  }
  addLog(
    "SYNC_CONFIG",
    `\u66F4\u65B0\u540C\u6B65\u914D\u7F6E [\u89D2\u8272: ${db.syncConfig.nodeRole}, \u8282\u70B9: ${db.syncConfig.nodeName}, Bot\u8F6E\u8BE2: ${db.syncConfig.enableBotPolling ? "\u5F00\u542F" : "\u5173\u95ED"}]`
  );
  saveDatabase(db);
  return res.json({
    success: true,
    syncConfig: db.syncConfig,
    isBotPollingActive: isPollingRunning
  });
});
app.post("/api/sync/toggle-bot", (req, res) => {
  const { enable } = req.body || {};
  const shouldEnable = enable !== void 0 ? !!enable : !db.syncConfig.enableBotPolling;
  db.syncConfig.enableBotPolling = shouldEnable;
  if (shouldEnable) {
    startTelegramPolling();
  } else {
    stopTelegramPolling();
  }
  addLog("TG_BOT_TOGGLE", `\u5207\u6362\u672C\u8282\u70B9 TG Bot \u8F6E\u8BE2: ${shouldEnable ? "\u5F00\u542F(\u4E91\u7AEF\u5E38\u9A7B)" : "\u505C\u7528(\u907F\u514D\u51B2\u7A81)"}`);
  saveDatabase(db);
  return res.json({
    success: true,
    enableBotPolling: db.syncConfig.enableBotPolling,
    isBotPollingActive: isPollingRunning,
    message: shouldEnable ? "\u2705 \u5DF2\u5F00\u542F\u672C\u8282\u70B9 Telegram Bot \u8F6E\u8BE2\uFF01" : "\u23F8\uFE0F \u5DF2\u6682\u505C\u672C\u8282\u70B9 Telegram Bot \u8F6E\u8BE2 (\u5EFA\u8BAE\u7531\u53E6\u4E00\u5E38\u9A7B\u8282\u70B9\u62C9\u53D6\uFF0C\u9632\u6B62 409 \u51B2\u7A81)"
  });
});
app.get("/api/sync/ping", (req, res) => {
  const incomingSecret = req.headers["x-sync-secret"] || req.query.secret;
  const configuredSecret = (db.syncConfig.syncSecret || "").trim();
  const secretValid = !configuredSecret || incomingSecret === configuredSecret;
  return res.json({
    ok: true,
    secretValid,
    nodeName: db.syncConfig.nodeName,
    nodeRole: db.syncConfig.nodeRole,
    botActive: isPollingRunning,
    authorizedPhonesCount: db.authorizedPhones.length,
    usersCount: Object.keys(db.users).length,
    serverTime: (/* @__PURE__ */ new Date()).toISOString()
  });
});
app.post("/api/sync/test-connection", async (req, res) => {
  const { remoteUrl, syncSecret } = req.body || {};
  const cleanUrl = String(remoteUrl || db.syncConfig.remoteUrl || "").trim().replace(/\/+$/, "");
  const cleanSecret = String(syncSecret !== void 0 ? syncSecret : db.syncConfig.syncSecret || "").trim();
  if (!cleanUrl) {
    return res.status(400).json({ error: "\u8BF7\u8F93\u5165\u5BF9\u7AEF\u670D\u52A1\u5668 URL \u5730\u5740 (\u5982 https://username.serv00.net \u6216 http://ip:8080)" });
  }
  const startTime = Date.now();
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 7e3);
    const testUrl = `${cleanUrl}/api/sync/ping?secret=${encodeURIComponent(cleanSecret)}`;
    const response = await fetch(testUrl, {
      headers: { "X-Sync-Secret": cleanSecret },
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    const latencyMs = Date.now() - startTime;
    if (!response.ok) {
      return res.status(400).json({
        error: `\u5BF9\u7AEF\u670D\u52A1\u8FD4\u56DE HTTP ${response.status}\uFF0C\u8BF7\u786E\u8BA4\u5BF9\u7AEF\u5DF2\u542F\u52A8\u8BE5\u7A0B\u5E8F\u4E14\u7AEF\u53E3\u5F00\u653E`,
        latencyMs
      });
    }
    const data = await response.json();
    if (!data.secretValid) {
      return res.status(401).json({
        error: "\u5BF9\u7AEF\u7F51\u7EDC\u5DF2\u8FDE\u901A\uFF0C\u4F46\u901A\u4FE1\u79D8\u94A5 (SYNC_SECRET_KEY) \u4E0D\u5339\u914D\uFF01\u8BF7\u786E\u4FDD\u4E24\u7AEF\u586B\u5199\u4E00\u81F4\u7684\u79D8\u94A5\u3002",
        latencyMs
      });
    }
    return res.json({
      success: true,
      latencyMs,
      remoteNode: data,
      message: `\u2705 \u7F51\u7EDC\u8FDE\u901A\u6B63\u5E38\uFF01\u5BF9\u7AEF: ${data.nodeName || cleanUrl} (${data.nodeRole}), \u5F80\u8FD4\u5EF6\u8FDF: ${latencyMs}ms`
    });
  } catch (err) {
    const latencyMs = Date.now() - startTime;
    const msg = err.name === "AbortError" ? "\u8FDE\u63A5\u8D85\u65F6 (7\u79D2)" : err.message || "\u7F51\u7EDC\u8FDE\u63A5\u4E0D\u53EF\u8FBE";
    return res.status(500).json({
      error: `\u65E0\u6CD5\u8FDE\u63A5\u5230 ${cleanUrl} (${msg})\u3002\u8BF7\u6838\u5BF9\u5730\u5740\u3001\u7AEF\u53E3\u3001\u4EE5\u53CA\u5916\u7F51\u7A7F\u900F\u72B6\u6001\u3002`,
      latencyMs
    });
  }
});
app.post("/api/sync/execute", async (req, res) => {
  const { action } = req.body || {};
  const syncAction = action === "push" || action === "pull" ? action : "two-way";
  const result = await executeSync(syncAction);
  return res.json(result);
});
app.post("/api/sync/receive", (req, res) => {
  const incomingSecret = req.headers["x-sync-secret"] || req.body.syncSecret;
  const configuredSecret = (db.syncConfig.syncSecret || "").trim();
  if (configuredSecret && incomingSecret !== configuredSecret) {
    addLog("SYNC_SECURITY", `\u62D2\u7EDD\u672A\u6388\u6743\u7684\u540C\u6B65\u8BF7\u6C42: \u79D8\u94A5\u4E0D\u5339\u914D (\u6765\u81EA ${req.ip})`);
    return res.status(401).json({ error: "\u901A\u4FE1\u79D8\u94A5 (Sync Secret Key) \u4E0D\u5339\u914D\uFF0C\u62D2\u7EDD\u6570\u636E\u540C\u6B65" });
  }
  const { action, senderNode, data } = req.body || {};
  if (!data || !Array.isArray(data.authorizedPhones) || typeof data.users !== "object") {
    return res.status(400).json({ error: "\u65E0\u6548\u7684\u6570\u636E\u8F7D\u8377\u683C\u5F0F" });
  }
  if (action === "push") {
    const mergeRes2 = mergeDatabases(
      { authorizedPhones: db.authorizedPhones, users: db.users },
      data
    );
    db.authorizedPhones = mergeRes2.authorizedPhones;
    db.users = mergeRes2.users;
    saveDatabase(db);
    addLog("DATA_SYNC", `\u63A5\u6536\u5230\u6765\u81EA [${senderNode || "\u5BF9\u7AEF"}] \u7684\u63A8\u9001\uFF0C\u5408\u5E76 ${mergeRes2.mergedUsersCount} \u4F4D\u73A9\u5BB6\u6570\u636E`);
    return res.json({
      success: true,
      nodeName: db.syncConfig.nodeName,
      message: "\u63A8\u9001\u6570\u636E\u5408\u5E76\u6210\u529F"
    });
  }
  if (action === "pull") {
    return res.json({
      success: true,
      nodeName: db.syncConfig.nodeName,
      remoteData: {
        authorizedPhones: db.authorizedPhones,
        users: db.users
      }
    });
  }
  const mergeRes = mergeDatabases(
    { authorizedPhones: db.authorizedPhones, users: db.users },
    data
  );
  db.authorizedPhones = mergeRes.authorizedPhones;
  db.users = mergeRes.users;
  db.syncConfig.lastSyncTime = (/* @__PURE__ */ new Date()).toLocaleTimeString();
  db.syncConfig.lastSyncStatus = "success";
  db.syncConfig.lastSyncMessage = `\u53CC\u5411\u540C\u6B65\u8FBE\u6210: \u6765\u81EA [${senderNode || "\u5BF9\u7AEF"}]`;
  saveDatabase(db);
  addLog("DATA_SYNC", `\u5B8C\u6210\u4E0E [${senderNode || "\u5BF9\u7AEF"}] \u7684\u53CC\u5411\u6570\u636E\u5BF9\u9F50\u5408\u5E76`);
  return res.json({
    success: true,
    nodeName: db.syncConfig.nodeName,
    nodeRole: db.syncConfig.nodeRole,
    mergedData: {
      authorizedPhones: db.authorizedPhones,
      users: db.users
    },
    message: "\u53CC\u5411\u5408\u5E76\u5BF9\u9F50\u6210\u529F"
  });
});
var activeRooms = {};
setInterval(() => {
  try {
    const now = Date.now();
    const maxAge = 6 * 3600 * 1e3;
    for (const code in activeRooms) {
      if (now - activeRooms[code].createdAt > maxAge) {
        delete activeRooms[code];
      }
    }
  } catch (err) {
    console.error("Error during activeRooms cleanup interval:", err);
  }
}, 30 * 60 * 1e3);
function generateRoomCode() {
  let code = "";
  do {
    code = Math.floor(1e5 + Math.random() * 9e5).toString();
  } while (activeRooms[code]);
  return code;
}
app.post("/api/rooms/create", (req, res) => {
  const { mode, roomName, baseScore, entryMin, hostName, hostPhone, avatar, isPrivate, passcode, allowBotFill } = req.body || {};
  const code = generateRoomCode();
  const newRoom = {
    code,
    mode: mode === "room-yansan" ? "room-yansan" : "room-chudadi",
    roomName: roomName || (mode === "room-yansan" ? "\u{1F525} \u70DF\u4E09\u706B\u7206\u623F" : "\u2660\uFE0F \u9504\u5927\u5730\u597D\u53CB\u573A"),
    baseScore: Number(baseScore) || (mode === "room-yansan" ? 2e3 : 1e3),
    entryMin: Number(entryMin) || (mode === "room-yansan" ? 2e3 : 100),
    hostName: hostName || "\u623F\u4E3B",
    hostPhone,
    isPrivate: !!isPrivate,
    passcode: passcode || "",
    allowBotFill: allowBotFill !== false,
    seats: [
      {
        position: "bottom",
        playerName: hostName || "\u623F\u4E3B",
        avatar: avatar || "\u{1F60E}",
        isHost: true,
        isAI: false,
        ready: true,
        phone: hostPhone
      },
      { position: "left", playerName: "\u7A7A\u4F4D", avatar: "\u2753", isHost: false, isAI: false, ready: false },
      { position: "top", playerName: "\u7A7A\u4F4D", avatar: "\u2753", isHost: false, isAI: false, ready: false },
      { position: "right", playerName: "\u7A7A\u4F4D", avatar: "\u2753", isHost: false, isAI: false, ready: false }
    ],
    createdAt: Date.now(),
    status: "WAITING"
  };
  activeRooms[code] = newRoom;
  addLog("ROOM_CREATE", `\u521B\u5EFA\u623F\u95F4 [${code}]: ${newRoom.roomName} (\u623F\u4E3B: ${hostName})`);
  return res.json({ success: true, room: newRoom });
});
app.get("/api/rooms/list", (_req, res) => {
  const list = Object.values(activeRooms).filter((r) => r.status === "WAITING");
  return res.json({ success: true, rooms: list });
});
app.get("/api/rooms/get/:code", (req, res) => {
  const code = String(req.params.code || "").trim();
  const room = activeRooms[code];
  if (!room) {
    return res.status(404).json({ error: "\u672A\u627E\u5230\u8BE5\u623F\u53F7\u5BF9\u5E94\u7684\u623F\u95F4\uFF0C\u8BF7\u68C0\u67E5 6 \u4F4D\u623F\u53F7" });
  }
  return res.json({ success: true, room });
});
app.post("/api/rooms/join", (req, res) => {
  const { code, playerName, avatar, phone, passcode } = req.body || {};
  const cleanCode = String(code || "").trim();
  const room = activeRooms[cleanCode];
  if (!room) {
    return res.status(404).json({ error: "\u623F\u53F7\u4E0D\u5B58\u5728\uFF0C\u8BF7\u6838\u5BF9 6 \u4F4D\u6570\u5B57\u623F\u53F7" });
  }
  if (room.status !== "WAITING") {
    return res.status(400).json({ error: "\u8BE5\u623F\u95F4\u5BF9\u5C40\u5DF2\u5F00\u59CB\u6216\u5DF2\u5173\u95ED" });
  }
  if (room.isPrivate && room.passcode && room.passcode !== String(passcode || "").trim()) {
    return res.status(403).json({ error: "\u623F\u95F4\u5BC6\u7801\u4E0D\u6B63\u786E" });
  }
  const emptySeatIndex = room.seats.findIndex((s) => s.playerName === "\u7A7A\u4F4D" || !s.isHost && s.isAI);
  if (emptySeatIndex === -1) {
    return res.status(400).json({ error: "\u623F\u95F4\u73A9\u5BB6\u5DF2\u6EE1 4 \u4EBA" });
  }
  const positions = ["bottom", "left", "top", "right"];
  room.seats[emptySeatIndex] = {
    position: positions[emptySeatIndex],
    playerName: playerName || "\u73A9\u5BB6",
    avatar: avatar || "\u{1F920}",
    isHost: false,
    isAI: false,
    ready: true,
    phone
  };
  addLog("ROOM_JOIN", `\u52A0\u5165\u623F\u95F4 [${cleanCode}]: ${playerName}`);
  return res.json({ success: true, room });
});
app.post("/api/rooms/add-bot", (req, res) => {
  const { code, seatIndex, botName, avatar } = req.body || {};
  const cleanCode = String(code || "").trim();
  const room = activeRooms[cleanCode];
  if (!room) return res.status(404).json({ error: "\u623F\u95F4\u4E0D\u5B58\u5728" });
  const idx = Number(seatIndex);
  if (idx < 1 || idx > 3) return res.status(400).json({ error: "\u65E0\u6548\u5EA7\u4F4D" });
  const positions = ["bottom", "left", "top", "right"];
  room.seats[idx] = {
    position: positions[idx],
    playerName: botName || `\u7535\u8111\xB7\u4EBA\u5076${idx}`,
    avatar: avatar || "\u{1F916}",
    isHost: false,
    isAI: true,
    ready: true
  };
  return res.json({ success: true, room });
});
app.post("/api/rooms/kick-seat", (req, res) => {
  const { code, seatIndex } = req.body || {};
  const cleanCode = String(code || "").trim();
  const room = activeRooms[cleanCode];
  if (!room) return res.status(404).json({ error: "\u623F\u95F4\u4E0D\u5B58\u5728" });
  const idx = Number(seatIndex);
  if (idx < 1 || idx > 3) return res.status(400).json({ error: "\u65E0\u6CD5\u66F4\u6539\u623F\u4E3B\u4F4D\u7F6E" });
  const positions = ["bottom", "left", "top", "right"];
  room.seats[idx] = {
    position: positions[idx],
    playerName: "\u7A7A\u4F4D",
    avatar: "\u2753",
    isHost: false,
    isAI: false,
    ready: false
  };
  return res.json({ success: true, room });
});
app.post("/api/rooms/start", (req, res) => {
  const { code } = req.body || {};
  const cleanCode = String(code || "").trim();
  const room = activeRooms[cleanCode];
  if (!room) return res.status(404).json({ error: "\u623F\u95F4\u4E0D\u5B58\u5728" });
  const readySeats = room.seats.filter((s) => s.playerName !== "\u7A7A\u4F4D" && s.ready);
  if (readySeats.length < 4) {
    return res.status(400).json({ error: "\u623F\u95F4\u5FC5\u987B\u51D1\u9F50 4 \u4F4D\u73A9\u5BB6\u624D\u53EF\u4EE5\u5F00\u5C40\uFF01" });
  }
  room.status = "PLAYING";
  addLog("ROOM_START", `\u623F\u95F4\u5F00\u5C40 [${cleanCode}]: ${room.roomName}`);
  return res.json({ success: true, room });
});
async function start() {
  let defaultPort = process.env.NODE_ENV === "production" ? 8080 : 3e3;
  let port = defaultPort;
  if (process.env.PORT) {
    port = Number(process.env.PORT);
  } else {
    const portArgIdx = process.argv.findIndex((arg) => arg === "--port" || arg === "-p");
    if (portArgIdx !== -1 && process.argv[portArgIdx + 1]) {
      port = Number(process.argv[portArgIdx + 1]);
    }
  }
  const PORT = port || defaultPort;
  const isProduction = process.env.NODE_ENV === "production";
  let staticPath = path.resolve("dist");
  const distIndex = path.join(path.resolve("dist"), "index.html");
  const webIndex = path.join(path.resolve("web"), "index.html");
  if (fs.existsSync(distIndex) && fs.existsSync(webIndex)) {
    try {
      const distMtime = fs.statSync(distIndex).mtimeMs;
      const webMtime = fs.statSync(webIndex).mtimeMs;
      staticPath = distMtime >= webMtime ? path.resolve("dist") : path.resolve("web");
    } catch (_) {
      staticPath = path.resolve("dist");
    }
  } else if (!fs.existsSync(distIndex) && fs.existsSync(webIndex)) {
    staticPath = path.resolve("web");
  }
  const httpServer = http.createServer(app);
  if (!isProduction) {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR === "true" ? false : { server: httpServer }
      },
      appType: "spa"
    });
    app.use(vite.middlewares);
    app.use("*", async (req, res, next) => {
      const url = req.originalUrl;
      try {
        let template = fs.readFileSync(path.resolve("index.html"), "utf-8");
        template = await vite.transformIndexHtml(url, template);
        res.status(200).set({
          "Content-Type": "text/html",
          "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
          "Pragma": "no-cache",
          "Expires": "0"
        }).end(template);
      } catch (e) {
        if (vite.ssrFixStacktrace) vite.ssrFixStacktrace(e);
        next(e);
      }
    });
  } else {
    app.use((req, res, next) => {
      const p = req.path;
      if (p === "/" || p === "/index.html" || p === "/sw.js" || p.endsWith(".webmanifest") || p.endsWith("manifest.json")) {
        res.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0");
        res.set("Pragma", "no-cache");
        res.set("Expires", "0");
      } else if (p.startsWith("/assets/")) {
        res.set("Cache-Control", "public, max-age=31536000, immutable");
      }
      next();
    });
    app.use(express.static(staticPath));
    app.get("*", (req, res) => {
      const indexPath = path.join(staticPath, "index.html");
      if (fs.existsSync(indexPath)) {
        res.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0");
        res.set("Pragma", "no-cache");
        res.set("Expires", "0");
        res.sendFile(indexPath);
      } else {
        res.status(200).send(`<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>\u7ECF\u51784\u4EBA\u9504\u5927\u5730 & \u70DF\u4E09</title></head>
<body style="background:#031d14;color:#e2e8f0;font-family:system-ui,sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;text-align:center;">
  <div style="background:rgba(20,83,57,0.9);border:1px solid #10b981;padding:2.5rem;border-radius:1rem;max-width:480px;box-shadow:0 10px 25px rgba(0,0,0,0.5);">
    <h2 style="color:#fbbf24;margin-top:0;">\u{1F680} \u9504\u5927\u5730\u670D\u52A1\u7AEF\u8FD0\u884C\u4E2D</h2>
    <p style="color:#cbd5e1;line-height:1.6;">\u68C0\u6D4B\u5230\u524D\u7AEF\u9759\u6001\u8D44\u6E90\u6B63\u5728\u51C6\u5907\u4E2D\u3002\u8BF7\u5728\u7EC8\u7AEF\u6267\u884C <code>npm run build</code> \u8FDB\u884C\u524D\u7AEF\u7F16\u8BD1\u6253\u5305\uFF0C\u6216\u7A0D\u540E\u5237\u65B0\u9875\u9762\u3002</p>
  </div>
</body>
</html>`);
      }
    });
  }
  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`\u{1F680} \u9504\u5927\u5730\u6E38\u620F\u670D\u52A1\u5668\u5DF2\u542F\u52A8: http://0.0.0.0:${PORT}`);
    if (loadedEnvPath) {
      console.log(`\u{1F4C4} \u5DF2\u8F7D\u5165 .env: ${loadedEnvPath}`);
    }
    startTelegramPolling();
  });
}
start();
