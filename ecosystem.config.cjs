const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// 1. 智能定位游戏项目目录 (支持放置于 ~ 根目录、ee、dd 等任意项目目录，防止 git pull 时被覆盖)
let gameDir = __dirname;
if (fs.existsSync(path.resolve(__dirname, 'package.json')) && (fs.existsSync(path.resolve(__dirname, 'server.js')) || fs.existsSync(path.resolve(__dirname, 'server.ts')))) {
  gameDir = __dirname;
} else {
  // 扫描可能的子目录（如 ee, dd, chudadi 等）或包含 package.json 的子目录
  const searchBases = [__dirname, process.env.HOME].filter(Boolean);
  let found = false;
  for (const base of searchBases) {
    const candidateNames = ['ee', 'dd', 'chudadi', 'yansan', 'game'];
    for (const name of candidateNames) {
      const p = path.resolve(base, name);
      if (fs.existsSync(path.resolve(p, 'package.json'))) {
        gameDir = p;
        found = true;
        break;
      }
    }
    if (found) break;

    try {
      const items = fs.readdirSync(base, { withFileTypes: true });
      for (const item of items) {
        if (item.isDirectory() && !item.name.startsWith('.')) {
          const sub = path.resolve(base, item.name);
          if (fs.existsSync(path.resolve(sub, 'package.json')) && (fs.existsSync(path.resolve(sub, 'server.js')) || fs.existsSync(path.resolve(sub, 'server.ts')))) {
            gameDir = sub;
            found = true;
            break;
          }
        }
      }
    } catch (_) {}
    if (found) break;
  }
}

// 确保前端资源可用并保持最新：自动从预构建 web 目录同步到 dist
const distIndexPath = path.resolve(gameDir, 'dist', 'index.html');
const webIndexPath = path.resolve(gameDir, 'web', 'index.html');
if (fs.existsSync(webIndexPath)) {
  try {
    const distDirPath = path.resolve(gameDir, 'dist');
    if (!fs.existsSync(distDirPath)) fs.mkdirSync(distDirPath, { recursive: true });
    let shouldSync = !fs.existsSync(distIndexPath);
    if (!shouldSync) {
      try {
        const webMtime = fs.statSync(webIndexPath).mtimeMs;
        const distMtime = fs.statSync(distIndexPath).mtimeMs;
        if (webMtime >= distMtime) shouldSync = true;
      } catch (_) {
        shouldSync = true;
      }
    }
    if (shouldSync) {
      execSync('cp -rf web/* dist/', { cwd: gameDir });
    }
  } catch (_) {}
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
