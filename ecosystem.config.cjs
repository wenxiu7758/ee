const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// 1. 智能定位游戏项目目录 (支持放置于 ~ 根目录或 dd 项目内，防止 git pull 时被覆盖)
let gameDir = __dirname;
if (fs.existsSync(path.resolve(__dirname, 'dd', 'package.json'))) {
  gameDir = path.resolve(__dirname, 'dd');
} else if (fs.existsSync(path.resolve(__dirname, 'package.json'))) {
  gameDir = __dirname;
} else if (process.env.HOME && fs.existsSync(path.resolve(process.env.HOME, 'dd', 'package.json'))) {
  gameDir = path.resolve(process.env.HOME, 'dd');
}

// 2. 自动检测并编译缺失或为空的 server.js
const serverJsPath = path.resolve(gameDir, 'server.js');
if (!fs.existsSync(serverJsPath) || fs.statSync(serverJsPath).size === 0) {
  try {
    execSync('node build-server.js', { stdio: 'inherit', cwd: gameDir });
  } catch (e) {
    console.warn('编译 server.js 提示:', e.message);
  }
}

// 3. 智能读取 .env 配置 (支持 ~/.env, dd/../.env, dd/.env)
const envPaths = [
  path.resolve(gameDir, '../.env'),
  path.resolve(gameDir, '.env'),
  process.env.HOME ? path.resolve(process.env.HOME, '.env') : null,
].filter(Boolean);

let envConfig = {};
for (const ep of envPaths) {
  if (fs.existsSync(ep)) {
    try {
      const content = fs.readFileSync(ep, 'utf8');
      content.split('\n').forEach(line => {
        const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
        if (match) {
          const key = match[1];
          let value = (match[2] || '').trim();
          if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
          if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
          envConfig[key] = value;
        }
      });
      break;
    } catch (_) {}
  }
}

const apps = [
  {
    name: 'chudadi-game',
    script: serverJsPath,
    cwd: gameDir,
    env: {
      NODE_ENV: 'production',
      PORT: envConfig.PORT || process.env.PORT || 8080,
      ...envConfig,
    },
    max_memory_restart: '200M',
    autorestart: true,
    restart_delay: 3000,
    watch: false,
  },
];

module.exports = {
  apps,
};
