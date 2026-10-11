# 📱 经典4人锄大地 (Big Two) · GitHub 推送与 Termux 手机部署完整手把手保姆级教程

> 本教程专为将本项目推送到 **GitHub 仓库**，并在 **Android 手机 Termux 环境** 从零拉取、编译、部署与持久化常驻运行而量身编写。无论您是刚接触 Git 的新手还是资深玩家，跟随本指南均可实现“一次配置、永久稳定运行”。

---

## 📑 目录索引

- [阶段一：将所有项目文件推送到 GitHub 仓库](#阶段一将所有项目文件推送到-github-仓库)
  - [1.1 准备 GitHub 仓库](#11-准备-github-仓库)
  - [1.2 生成 GitHub Personal Access Token (PAT 密钥)](#12-生成-github-personal-access-token-pat-密钥)
  - [1.3 初始化本地 Git 仓库并提交代码](#13-初始化本地-git-仓库并提交代码)
  - [1.4 关联远程仓库并推送到 GitHub](#14-关联远程仓库并推送到-github)
  - [1.5 推送常见报错与解决对策](#15-推送常见报错与解决对策)
- [阶段二：Android 手机 Termux 安装与基础环境准备](#阶段二android-手机-termux-安装与基础环境准备)
  - [2.1 Termux 正确安装方式（避坑指南）](#21-termux-正确安装方式避坑指南)
  - [2.2 基础环境初始化与换源加速](#22-基础环境初始化与换源加速)
  - [2.3 安装必备开发组件 (Git, Node.js 等)](#23-安装必备开发组件-git-nodejs-等)
  - [2.4 申请存储权限与开启防休眠保活](#24-申请存储权限与开启防休眠保活)
- [阶段三：在 Termux 中拉取代码与配置隔离](#阶段三在-termux-中拉取代码与配置隔离)
  - [3.1 克隆 GitHub 项目仓库](#31-克隆-github-项目仓库)
  - [3.2 核心机制：配置与代码分离存储](#32-核心机制配置与代码分离存储)
  - [3.3 初始化与编辑配置文件 `~/.env`](#33-初始化与编辑配置文件-env)
- [阶段四：安装项目依赖与预构建编译](#阶段四安装项目依赖与预构建编译)
  - [4.1 安装 Node.js 项目依赖](#41-安装-nodejs-项目依赖)
  - [4.2 编译打包前端与服务端](#42-编译打包前端与服务端)
- [阶段五：启动游戏与后台持久化常驻运行](#阶段五启动游戏与后台持久化常驻运行)
  - [方式 1：一键自动脚本极速启动 (`./start.sh`)](#方式-1一键自动脚本极速启动-startsh)
  - [方式 2：PM2 进程后台持久化守护（强烈推荐）](#方式-2pm2-进程后台持久化守护强烈推荐)
  - [方式 3：Node.js 前台直接启动](#方式-3nodejs-前台直接启动)
- [阶段六：游戏访问与多人同屏/跨网联机](#阶段六游戏访问与多人同屏跨网联机)
  - [6.1 本机浏览器独立畅玩与 PWA 桌面应用](#61-本机浏览器独立畅玩与-pwa-桌面应用)
  - [6.2 同一 WiFi 局域网 / 手机热点联机对战](#62-同一-wifi-局域网--手机热点联机对战)
  - [6.3 Cloudflare Tunnel 免费公网隧道（随时随地外网联机）](#63-cloudflare-tunnel-免费公网隧道随时随地外网联机)
- [阶段七：后续日常拉取 GitHub 更新流程](#阶段七后续日常拉取-github-更新流程)
- [阶段八：Termux 高频常见问题排查 (FAQ)](#阶段八termux-高频常见问题排查-faq)

---

## 阶段一：将所有项目文件推送到 GitHub 仓库

### 1.1 准备 GitHub 仓库

1. 登录您的 [GitHub 账号](https://github.com/)。
2. 点击右上角 **`+`** 按钮，选择 **`New repository`**。
3. 填写仓库信息：
   - **Repository name**：例如 `dd` 或 `chudadi-game`。
   - **Visibility**：选择 **Public**（公开）或 **Private**（私有）。
   - **重要**：**不要** 勾选 *Add a README file*、*Add .gitignore* 或 *Choose a license*（保持仓库完全为空，避免推送时产生分支分叉冲突）。
4. 点击 **`Create repository`** 创建完成，复制仓库地址（例如 `https://github.com/您的用户名/dd.git`）。

---

### 1.2 生成 GitHub Personal Access Token (PAT 密钥)

> ⚠️ **关键注意**：GitHub 从 2021 年起已**彻底停止支持使用 GitHub 登录密码进行 `git push` 操作**。如果使用登录密码推送会报错 `Support for password authentication was removed`。必须生成专门的 Personal Access Token 作为密码！

1. 在 GitHub 任意页面，点击右上角个人头像 -> **`Settings`**。
2. 页面拉到最底部，左侧边栏点击 **`Developer settings`**。
3. 依次点击 **`Personal access tokens`** -> **`Tokens (classic)`**。
4. 点击右上角 **`Generate new token`** -> 选择 **`Generate new token (classic)`**。
5. 配置 Token：
   - **Note**：填写名称，如 `termux-dd-token`。
   - **Expiration**：有效期限，建议选择 `No expiration`（无期限）或 `90 days`。
   - **Select scopes**：勾选第一大项 **`repo`**（包含其下的所有子项），以获得代码提交和拉取权限。
6. 点击页面底部绿色按钮 **`Generate token`**。
7. **复制生成的以 `ghp_` 开头的 Token 字符串，并妥善保存在备忘录中**（该字符串离开页面后不会再次显示）。

---

### 1.3 初始化本地 Git 仓库并提交代码

打开您本地放置本项目源代码的终端（如电脑终端、VS Code 终端或本地 Linux 环境），进入项目根目录：

```bash
# 1. 切换到项目根目录
cd /你的项目文件路径

# 2. 如果尚未初始化 git，执行初始化（如果已有 .git 目录可跳过这步）
git init

# 3. 配置您的本地 Git 用户信息（首次使用必须配置，名字和邮箱随意填写）
git config user.name "你的GitHub用户名"
git config user.email "你的GitHub注册邮箱"

# 4. 检查 .gitignore 过滤项（确保已排除 node_modules 和大缓存文件）
# 本项目已默认配置好 .gitignore，会自动忽略 node_modules/、dist/、.env 等临时文件

# 5. 将所有项目文件添加到暂存区
git add .

# 6. 提交本地首个版本
git commit -m "feat: 经典4人锄大地 Web 完整版工程 (支持语音对讲/方言/PWA/Termux部署)"

# 7. 统一将主分支命名为 main
git branch -M main
```

---

### 1.4 关联远程仓库并推送到 GitHub

```bash
# 1. 添加远程仓库地址（请将下面的地址替换为您在 1.1 步中复制的实际仓库 URL）
git remote add origin https://github.com/您的用户名/您的仓库名.git

# 如果之前曾经添加过其它 origin，可以先更新地址：
# git remote set-url origin https://github.com/您的用户名/您的仓库名.git

# 2. 推送代码至 GitHub
git push -u origin main
```

**推送时的账号密码输入说明**：
- 当终端弹出 `Username for 'https://github.com':` 时，输入您的 **GitHub 用户名** 并按回车。
- 当终端弹出 `Password for 'https://...':` 时，**粘贴您在 1.2 步中生成的 Personal Access Token (以 ghp_ 开头)** 并按回车（Linux/Mac 终端输入密码时不显示任何星号，直接粘贴按回车即可）。

推送成功后终端会显示 `* [new branch] main -> main`，刷新 GitHub 仓库网页即可看到全部代码已经上传完毕！

---

### 1.5 推送常见报错与解决对策

1. **报错：`remote origin already exists`**：
   - 原因：之前已经配置过远程源。
   - 解决：执行 `git remote set-url origin https://github.com/您的用户名/您的仓库名.git` 重新绑定。
2. **报错：`Updates were rejected because the remote contains work that you do not have locally (non-fast-forward)`**：
   - 原因：新建仓库时勾选了创建 README 或 License，导致远端分支与本地不同步。
   - 解决：执行覆盖强制推送：
     ```bash
     git push -u origin main --force
     ```
3. **报错：`Authentication failed` / `Support for password authentication was removed`**：
   - 原因：密码输入了 GitHub 网页登录密码，未输入 Personal Access Token。
   - 解决：重新生成 PAT 密钥并在 Password 提示中粘贴。

---

## 阶段二：Android 手机 Termux 安装与基础环境准备

### 2.1 Termux 正确安装方式（避坑指南）

> 🚨 **千万不要从 Google Play 商店安装 Termux！**  
> Google Play 上的 Termux 版本早已于 2020 年停止维护，内置源全部失效，运行 `pkg update` 会报 404 错误。

- **推荐下载渠道**：
  - [F-Droid 官方下载页面](https://f-droid.org/zh_Hans/packages/com.termux/)（直接点击下载 APK 安装包）。
  - 或 [Termux 官方 GitHub Releases](https://github.com/termux/termux-app/releases) 下载最新的 `termux-app_v0.118.x+github-debug_arm64-v8a.apk`。

---

### 2.2 基础环境初始化与换源加速

打开手机上的 Termux 应用，依次执行：

```bash
# 1. 切换镜像源以加速国内下载（可选，出现交互图形界面时，用键盘上下方向键选 Mirrors by BFSU 或 TUNA，回车确定）
termux-change-repo

# 2. 全面更新基础包管理器（提示保留配置或覆盖时，直接按回车保持默认即可）
pkg update -y && pkg upgrade -y
```

---

### 2.3 安装必备开发组件 (Git, Node.js 等)

运行锄大地游戏服务端与代码拉取，需要安装以下工具链：

```bash
# 一次性安装 Node.js (内置 npm)、Git、Curl、Wget、OpenSSH 以及 Proot
pkg install -y git nodejs curl wget openssh proot
```

验证安装是否正常：
```bash
node -v   # 输出形如 v20.x 或 v22.x
npm -v    # 输出形如 10.x
git --version
```

---

### 2.4 申请存储权限与开启防休眠保活

手机系统自带激进的省电机制，为了防止锁屏或切换到后台时 Termux 被 Android 系统杀死，**必须**开启以下两项：

```bash
# 1. 申请手机内部存储访问权限（手机屏幕会弹出授权窗口，点击“允许”）
termux-setup-storage

# 2. 申请 CPU 唤醒锁（极其重要！通知栏会显示 Termux wake lock held 图标，锁屏不休眠）
termux-wake-lock
```

> 🔋 **系统电池白名单设置（至关重要）**：
> 打开您手机的【系统设置】 -> 【应用管理】 -> 找到 【Termux】 -> 【电池 / 耗电管理】：
> - 将后台运行限制调整为 **“无限制”** 或 **“允许后台高耗电”**、**“允许自启动与关联启动”**。

---

## 阶段三：在 Termux 中拉取代码与配置隔离

### 3.1 克隆 GitHub 项目仓库

在 Termux 中执行克隆命令：

```bash
# 确保在 Termux 用户的家目录 ~
cd ~

# 克隆仓库（将 URL 替换为您实际的 GitHub 仓库地址，将代码存入 dd 目录）
git clone https://github.com/您的用户名/您的仓库名.git dd

# 如果仓库为私有仓库 (Private)，可使用带 Token 的格式免密码直接克隆：
# git clone https://ghp_您的Token@github.com/您的用户名/您的仓库名.git dd

# 进入游戏目录
cd dd
```

---

### 3.2 核心机制：配置与代码分离存储

本项目专为 Termux 环境设计了**防覆盖隔离存储架构**：
- **上级目录 `~`（Termux 根目录）**：存放您的个人配置 `~/.env` 以及进程配置文件 `~/ecosystem.config.cjs`。
- **子目录 `~/dd`（游戏代码目录）**：仅存放 Git 源代码与构建编译文件。

**优势**：日后在 `~/dd` 目录中无论如何执行 `git pull`、`git checkout .` 甚至强制重置更新，都**绝对不会覆盖或丢失**您配置的端口、密钥与隧道 Token！

---

### 3.3 初始化与编辑配置文件 `~/.env`

```bash
# 1. 将模板复制到上级根目录 ~/.env 中长期保留
cp ~/dd/.env.example ~/.env

# 2. 将 PM2 配置文件复制到上级根目录 ~/ecosystem.config.cjs
cp ~/dd/ecosystem.config.cjs ~/ecosystem.config.cjs

# 3. 使用 nano 编辑器编辑 ~/.env 配置（或保持默认即可直接运行）
nano ~/.env
```

配置文件示例与参数说明：
```env
# 游戏服务监听端口（默认 8080）
PORT=8080

# Cloudflare Tunnel 专属 Token（选填，若不填会自动分配免费临时公网隧道）
CLOUDFLARE_TUNNEL_TOKEN=""

# 是否由 PM2 同时托管手机 SSHD 服务（默认 false）
ENABLE_SSHD=false
```
*提示：在 nano 编辑器中，修改完成后按快捷键 `Ctrl + O` 再按回车保存，按 `Ctrl + X` 退出。*

---

## 阶段四：安装项目依赖与预构建编译

### 4.1 安装 Node.js 项目依赖

```bash
cd ~/dd

# 国内网络如果较慢，可选择先设置 npm 淘宝/腾讯国内镜像源（可选）：
npm config set registry https://registry.npmmirror.com

# 安装依赖（必须添加 --legacy-peer-deps 确保顺利兼容全部 UI 与音频组件）
npm install --legacy-peer-deps
```

---

### 4.2 编译打包前端与服务端

```bash
cd ~/dd

# 编译打包前端 Vite 资源，并预编译生成 server.js 服务端入口
npm run build
```

编译成功后，终端将输出：
- `✓ built in x.xxs`（生成 `dist/` 静态网页资源）
- `📦 正在打包生成 server.js...`
- `✅ 成功构建并更新 server.js！`

> 💡 **为什么必须预编译 `server.js`？**  
> 在 Android ARM64 架构下，直接使用动态 TypeScript 运行时 (`tsx`) 容易因内存溢出产生 Exit 139 崩溃错误。本项目通过 `npm run build` 生成轻量级原生 JavaScript `server.js`，启动速度达毫秒级，且内存占用仅约 30MB~50MB！

---

## 阶段五：启动游戏与后台持久化常驻运行

您可以根据自身使用习惯选择以下任意一种启动方式：

### 方式 1：一键自动脚本极速启动 (`./start.sh`)（小白最爱）

本项目已贴心地内置了全自动化启动脚本，自动处理环境变量、自动申请防休眠锁、自动检测局域网 IP：

```bash
cd ~/dd

# 赋予执行权限并直接启动
chmod +x start.sh
./start.sh
```

终端将打印：
```text
==============================================================
🎮 经典4人锄大地 Web 版 (Big Two) 启动准备就绪！
👉 本机浏览器访问:       http://localhost:8080
👉 同 WiFi / 局域网访问:  http://192.168.1.100:8080
==============================================================
```
按键盘 `Ctrl + C` 可随时退出脚本。

---

### 方式 2：PM2 进程后台持久化守护（强烈推荐）

使用 PM2 守护进程，即使您将 Termux 退到后台、手机锁屏、或者网络临时断开，游戏服务器也不会中断，非常适合长期当服务器使用：

```bash
# 1. 全局安装 pm2
npm install -g pm2

# 2. 回到家目录，一键启动生态守护
cd ~
pm2 start ecosystem.config.cjs

# 3. 保存当前的运行列表（下次打开 Termux 自动恢复）
pm2 save
```

**PM2 常用管理操作速查**：
```bash
# 查看当前运行状态（chudadi-game 状态显示 online 即为正常）
pm2 status

# 查看游戏实时运行日志
pm2 logs chudadi-game

# 重启游戏服务
pm2 restart chudadi-game

# 停止游戏服务
pm2 stop chudadi-game
```

---

### 方式 3：Node.js 前台直接启动

```bash
cd ~/dd
PORT=8080 npm start
```

---

## 阶段六：游戏访问与多人同屏/跨网联机

### 6.1 本机浏览器独立畅玩与 PWA 桌面应用

1. 打开部署该游戏的 Android 手机自带浏览器（如 Chrome、Edge、Via 或系统自带浏览器）。
2. 在地址栏输入：`http://localhost:8080` 回车即可进入游戏！
3. **PWA 添加到桌面主屏幕**：
   - 点击浏览器右上角菜单（三个点或设置）。
   - 选择 **“添加到主屏幕”** 或 **“安装应用”**。
   - 手机桌面会生成【锄大地】图标，点击图标即可**全屏、无地址栏、横屏沉浸式秒开启动**！

---

### 6.2 同一 WiFi 局域网 / 手机热点联机对战

无需连接外部互联网，只要大家连同一个 WiFi，或者连接您手机开启的“个人移动热点”：

1. 在 Termux 中执行以下命令查看手机在局域网中的 IP 地址：
   ```bash
   ip -4 addr show | grep inet | grep -v '127.0.0.1'
   ```
   （通常形如 `192.168.1.105` 或 `192.168.43.1`）。
2. 告诉身边的朋友，他们在各自的手机或平板浏览器中输入：
   ```text
   http://192.168.1.105:8080
   ```
3. 所有人即可进入同一个牌局联机，支持麦克风对讲与方言战术互动！

---

### 6.3 Cloudflare Tunnel 免费公网隧道（随时随地外网联机）

如果您想和身在异地的朋友联机，可以使用免费的 Cloudflare Tunnel 进行内网穿透（无需公网 IP，无需设置路由器端口映射）：

#### 步骤 1：下载官方适配 Termux 的 cloudflared 二进制
```bash
# 下载 ARM64 官方二进制放入 Termux 系统路径
curl -L -o $PREFIX/bin/cloudflared https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-arm64

# 赋予执行权限
chmod +x $PREFIX/bin/cloudflared
```

#### 步骤 2：配置 DNS 解析（解决 Android 下 DNS 拒绝报错）
```bash
mkdir -p $PREFIX/etc
cat << 'EOF' > $PREFIX/etc/resolv.conf
nameserver 1.1.1.1
nameserver 223.5.5.5
nameserver 114.114.114.114
EOF
```

#### 步骤 3：启动免费临时隧道
```bash
termux-chroot cloudflared tunnel --edge-ip-version 4 --protocol http2 --url http://localhost:8080
```
启动后终端中会打印出形如：
`https://xxxxxxxx.trycloudflare.com` 的公共网址。把该网址发送给朋友，不论身在何处都可以点击直接加入对局！

---

## 阶段七：后续日常拉取 GitHub 更新流程

当您在 GitHub 仓库中更新了新代码（例如修复了 Bug 或增加了新牌局功能），在手机 Termux 里只需要执行简单 3 步即可平滑升级：

```bash
cd ~/dd

# 1. 从 GitHub 抓取最新代码并合并
git checkout .
git pull

# 2. 重新编译打包最新版本
npm run build

# 3. 重启服务（若使用 PM2 守护）
pm2 restart chudadi-game
```
*因为您的 `~/.env` 配置文件保存在上级根目录，所以拉取代码绝不会丢失配置，放心大胆升级！*

---

## 阶段八：Termux 高频常见问题排查 (FAQ)

### Q1: 提示 `EADDRINUSE: address already in use :::8080` 端口被占用？
- **原因**：之前运行的服务未正常关闭，仍在后台占用 8080 端口。
- **解决办法**：
  ```bash
  # 查找并杀死占用 8080 端口的进程
  fuser -k 8080/tcp || kill -9 $(lsof -t -i:8080)
  ```
  或者在 `~/.env` 中将 `PORT=8080` 改为 `PORT=8888`。

---

### Q2: `npm install` 报错 `ERESOLVE unable to resolve dependency tree`？
- **原因**：React 19 与部分辅助包的 Peer 依赖严格校验机制。
- **解决办法**：必须带上 `--legacy-peer-deps` 参数：
  ```bash
  npm install --legacy-peer-deps
  ```

---

### Q3: 运行 `npm run build` 报内存不足 `JavaScript heap out of memory`？
- **原因**：部分配置较低的手机默认给 Node.js 分配的 V8 内存配额过低。
- **解决办法**：在运行 build 前临时增加内存上限：
  ```bash
  export NODE_OPTIONS="--max-old-space-size=1024"
  npm run build
  ```

---

### Q4: 手机锁屏几分钟后，浏览器打不开网页了？
- **原因**：手机系统杀死了 Termux 后台进程或切断了 WiFi 休眠唤醒。
- **解决办法**：
  1. 在 Termux 执行 `termux-wake-lock`。
  2. 手机系统设置中，务必将 Termux 的电池管理设为 **“允许无限制后台运行”**。
  3. 部分品牌手机（华为/小米/vivo/OPPO）需要锁住 Termux 后台卡片（在多任务后台卡片上下拉加锁）。

---

### Q5: Cloudflared 报错 `lookup ... connection refused`？
- **原因**：Android 缺少标准 Linux `/etc/resolv.conf` 导致 Go 程序 DNS 解析失败。
- **解决办法**：
  在启动 cloudflared 时使用 `termux-chroot` 命令前缀，并在 `$PREFIX/etc/resolv.conf` 中填入公共 DNS（详见阶段六 6.3 节）。

---

### Q6: 运行 `npm run build` 报错 `Cannot find module @rollup/rollup-android-arm64`？
- **原因**：Termux (Android) 环境下 npm 存在对可选依赖的已知 Bug (#4828)，导致 Rollup 原生二进制未自动安装。
- **解决办法**：
  1. **免构建直接运行（推荐）**：本项目已随仓库附带完整的预构建静态资源 `web/`，在 Termux 下**完全无需手动运行 `npm run build`**！直接运行 `./start.sh` 或 `npm start` 即可秒级启动。
  2. **如果确实想重新编译**：更新最新代码（`git pull`）后，`vite.config.ts` 已内置 Termux 自动容灾降级机制，再次执行 `npm run build` 即可顺利完成打包！

---

🎉 **祝您在手机 Termux 上部署顺利，与好友畅享经典 4 人锄大地的博弈乐趣！**
