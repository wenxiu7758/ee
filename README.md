# 🔨 欢聚锄大地 (Big Two) · Web 横屏独立版

> 本项目是专为手机与桌面端打造的高品质 4 人 **锄大地 (Big Two / 步步高升)** 网页游戏。
> 采用 **全局固定 90° 旋转横屏** 架构，手机竖屏打开即自动铺满呈现沉浸式四人牌桌视界。支持正宗 52 张扑克牌规则（方块3首出、老二最大、五大五张牌型跨级压制、关门三倍暴击）、**点击实时麦克风录音与20秒自动发送**、**战术呼叫与语音消息回放**、**五大方言真人语音**、**PWA 渐进式独立桌面应用**，以及 **Android 手机 Termux 一键部署与 PM2 进程守护**！

---

## 📚 快速文档导航

- 📱 **[Android 手机 Termux 完整部署教程 (从 GitHub 推送到手机运行保姆级指南)](docs/deploy_termux.md)** ⭐ **强烈推荐**
- 🐧 **[Linux 服务器部署教程 (Ubuntu/Debian/CentOS/Systemd)](docs/deploy_linux.md)**
- 🌐 **[Serv00 免费虚拟主机部署教程 (FreeBSD/PM2/自带域名反代)](docs/deploy_serv00.md)**

---

## 🎮 核心玩法与特色特性

1. 🃏 **正宗 4 人锄大地规则**：
   - 标准 52 张牌，每人 13 张。
   - 点数大小：`2 > A > K > Q > J > 10 > 9 > 8 > 7 > 6 > 5 > 4 > 3`。
   - 花色大小：`黑桃 ♠ > 红心 ♥ > 梅花 ♣ > 方块 ♦`。
   - 首局持有 `♦3 (方块3)` 的玩家必须强制首出，且首出牌中必须包含 `♦3`。
2. 💥 **五大五张牌型压制层级**：
   - `同花顺 (Straight Flush)` > `铁支 (四条/Four of a Kind)` > `葫芦 (Full House)` > `同花 (Flush)` > `顺子 (Straight)`。
   - 高阶牌型可跨级压制低阶牌型（如铁支可直接压制同花或顺子）！
3. ⚡ **终盘倍数与关门暴击惩罚**：
   - **双倍惩罚**：牌局结束时，手牌剩余 10~12 张的输家，失分结算翻倍计算。
   - **关门三倍惩罚 (一张未出)**：手牌剩余 13 张（一张未出）的输家，直接触发 39 倍底分关门暴击！
   - 胜者以老二清牌倍数额外 x2，以铁支或同花顺清牌倍数额外 x4！
4. 🎙️ **实时语音对讲与战术呼叫**：
   - **极简麦克风录音**：点击右上角麦克风按钮即刻开始录音，按钮动态切换为“点击发送语音”，录音最长 20 秒，满 20 秒自动发送，无需任何多余弹窗阻碍出牌！
   - **短语与战术整合**：短语弹窗整合“快捷聊天短语”、“特种战术无线电呼叫”与“语音对讲历史记录回放”。
5. 🔊 **五大方言特色语音**：
   - 包含普通话、川味麻辣、粤语情怀、东北豪爽、二次元萌系五套语音包。
6. 📲 **PWA 独立全屏应用**：
   - 手机浏览器点击“添加到主屏幕”，即可免地址栏启动，支持离线环境畅玩。

---

## 📤 第一部分：如何将本项目代码完整推送到 GitHub 仓库

如果您在本地修改或下载了本项目文件，并准备推送到 GitHub 仓库：

### 1.1 准备工作：在 GitHub 新建仓库与获取访问 Token

1. 登录 [GitHub](https://github.com/)，点击右上角 `+` -> **`New repository`**。
2. 仓库名称填写如 `dd` 或 `chudadi-game`，选择公开 (Public) 或私有 (Private)，**不要勾选**创建 README 或 .gitignore（保持完全空白）。
3. **获取 Personal Access Token (PAT)**（因为 GitHub 不再支持使用密码 push）：
   - 点击 GitHub 头像 -> **`Settings`** -> 页面左下方 **`Developer settings`**。
   - 点击 **`Personal access tokens`** -> **`Tokens (classic)`** -> **`Generate new token (classic)`**。
   - 勾选 **`repo`** 权限，点击底部绿色生成按钮，**复制并保存以 `ghp_` 开头的 Token**。

### 1.2 本地执行推送命令

在本地存放本项目代码的根目录下打开终端，依次运行：

```bash
# 1. 初始化 Git 仓库
git init

# 2. 配置本地提交身份（首次使用 Git 必须配置）
git config user.name "你的GitHub用户名"
git config user.email "你的GitHub邮箱"

# 3. 添加全部文件（.gitignore 会自动过滤 node_modules、dist 等临时文件）
git add .

# 4. 提交本地版本
git commit -m "feat: 经典4人锄大地 Web 完整版工程与 Termux 一键部署支持"

# 5. 设置主分支为 main
git branch -M main

# 6. 添加您的 GitHub 远程仓库地址（请将下面的 URL 替换为您自己的仓库地址）
git remote add origin https://github.com/您的用户名/您的仓库名.git

# 7. 推送到 GitHub
git push -u origin main
```

> **输入凭证提示**：
> - `Username for 'https://github.com':` -> 输入您的 **GitHub 用户名**。
> - `Password for 'https://github.com':` -> **粘贴刚才复制的 Personal Access Token (`ghp_...`)**。

---

## 📱 第二部分：在手机 Termux 上拉取代码与一键部署

### 2.1 Termux 环境初始化

在 Android 手机上打开 Termux（请使用从 **F-Droid** 下载的最新版）：

```bash
# 1. 换源与更新
termux-change-repo
pkg update -y && pkg upgrade -y

# 2. 安装必要运行环境 (Node.js, Git, Curl, OpenSSH, Proot)
pkg install -y git nodejs curl wget openssh proot

# 3. 申请存储权限与开启 CPU 防休眠锁
termux-setup-storage
termux-wake-lock
```

### 2.2 拉取 GitHub 仓库与配置隔离

```bash
# 切换到 Termux 家目录
cd ~

# 克隆您的 GitHub 仓库到 dd 目录
git clone https://github.com/您的用户名/您的仓库名.git dd

# 进入游戏目录
cd dd

# 初始化持久化配置文件到上级目录（拉取代码不覆盖配置）
cp .env.example ~/.env
cp ecosystem.config.cjs ~/ecosystem.config.cjs
```

### 2.3 安装依赖与预构建打包

```bash
cd ~/dd

# 安装项目依赖（使用 --legacy-peer-deps 保证兼容性）
npm install --legacy-peer-deps

# 构建前端静态资源并预编译 server.js
npm run build
```

---

## 🚀 第三部分：启动游戏（三大启动方式自由选择）

### 方式 A：一键自动脚本极速启动 (`./start.sh`)（最推荐小白）

```bash
cd ~/dd
chmod +x start.sh
./start.sh
```
脚本会自动处理环境变量、检测局域网 IP 并打印访问网址。

### 方式 B：PM2 进程后台持久化守护（推荐长期运行）

```bash
# 全局安装 PM2
npm install -g pm2

# 在家目录启动后台常驻守护
cd ~
pm2 start ecosystem.config.cjs

# 保存当前状态（下次打开 Termux 自动恢复）
pm2 save
```

**PM2 常用命令**：
- 查看运行状态：`pm2 status`
- 查看实时日志：`pm2 logs chudadi-game`
- 重启游戏：`pm2 restart chudadi-game`
- 停止游戏：`pm2 stop chudadi-game`

### 方式 C：Node.js 直接前台运行

```bash
cd ~/dd
PORT=8080 npm start
```

---

## 🌐 第四部分：访问与联机指南

1. **手机本机畅玩**：
   - 打开手机自带浏览器访问：`http://localhost:8080`
   - 支持点击浏览器菜单“添加到主屏幕”，生成独立桌面图标全屏横屏运行。
2. **同 WiFi / 手机热点局域网联机**：
   - 启动脚本输出的局域网 IP（例如 `http://192.168.1.100:8080`）。
   - 好友连接同一个 WiFi 或连接您的手机热点后，在他们手机浏览器输入该地址即可一同开局！
3. **免费公网远程联机 (Cloudflare Tunnel)**：
   - 详见 **[Termux 详细教程第 6.3 节](docs/deploy_termux.md#63-cloudflare-tunnel-免费公网隧道随时随地外网联机)**，使用官方 `cloudflared` 生成临时公网域名 `https://xxxx.trycloudflare.com`，异地好友点击即玩。

---

## 🔄 第五部分：日常代码更新与一键同步

后续在 GitHub 上修改或更新代码后，手机 Termux 仅需执行以下命令即可平滑升级：

```bash
cd ~/dd

# 1. 拉取最新代码
git checkout .
git pull

# 2. 重新打包构建
npm run build

# 3. 重启 PM2 进程
pm2 restart chudadi-game
```

---

## ❓ 常见问题排查 (FAQ)

1. **端口被占用报错 `EADDRINUSE: address already in use :::8080`**：
   - 解决：执行 `fuser -k 8080/tcp` 强制释放端口，或在 `~/.env` 中修改 `PORT=8888`。
2. **手机锁屏后服务断开连接**：
   - 解决：执行 `termux-wake-lock`，并在手机系统设置中将 Termux 的电池管理调整为“允许无限制后台运行”。
3. **更详细的 DNS 报错修复与进阶排查**：
   - 请查看专门教程：**[docs/deploy_termux.md](docs/deploy_termux.md)**。

---

*祝您把把同花顺，局局锄大地！* 🎴✨
