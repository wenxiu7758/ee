import React, { useState, useEffect } from 'react';
import { authStore, UserAccount, BotConfig, SyncConfig } from '../utils/authStore';
import { sounds } from '../utils/audio';
import { useAppTheme } from '../utils/themeContext';
import {
  ShieldCheck,
  Bot,
  Users,
  PhoneCall,
  Terminal,
  Settings,
  Plus,
  Trash2,
  Search,
  KeyRound,
  Coins,
  CheckCircle2,
  XCircle,
  X,
  Send,
  RefreshCw,
  Copy,
  AlertCircle,
  Award,
  Cloud,
  Smartphone,
  ArrowLeftRight,
  ArrowUpRight,
  ArrowDownLeft,
  Server,
  Globe,
  Radio,
  Check,
  Zap,
} from 'lucide-react';

interface BotAdminModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserAccount | null;
}

export const BotAdminModal: React.FC<BotAdminModalProps> = ({
  isOpen,
  onClose,
  currentUser,
}) => {
  const [activeTab, setActiveTab] = useState<'PHONES' | 'USERS' | 'SYNC' | 'SIMULATOR' | 'CONFIG'>('PHONES');

  // Data states
  const [authorizedPhones, setAuthorizedPhones] = useState<string[]>([]);
  const [users, setUsers] = useState<UserAccount[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [botConfig, setBotConfig] = useState<BotConfig>({
    token: '',
    botUsername: '',
    webhookUrl: '',
  });

  // Sync & Multi-Node States
  const [syncConfig, setSyncConfig] = useState<SyncConfig>({
    nodeRole: 'standalone',
    nodeName: 'ChuDaDi-Node',
    enableBotPolling: false,
    remoteUrl: '',
    syncSecret: 'chudadi_sync_secret_8888',
    autoSync: true,
    autoSyncIntervalMinutes: 5,
    lastSyncStatus: 'idle',
    lastSyncMessage: '等待同步',
  });
  const [isBotPollingActive, setIsBotPollingActive] = useState<boolean>(false);
  const [remoteUrlInput, setRemoteUrlInput] = useState('');
  const [syncSecretInput, setSyncSecretInput] = useState('');
  const [nodeNameInput, setNodeNameInput] = useState('');
  const [nodeRoleInput, setNodeRoleInput] = useState<'serv00_cloud' | 'termux_local' | 'standalone'>('standalone');
  const [autoSyncInput, setAutoSyncInput] = useState(true);

  // Sync execution and diagnostics
  const [isTestingConn, setIsTestingConn] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string; latencyMs?: number; remoteNode?: any } | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncActionMsg, setSyncActionMsg] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  // Phone tab states
  const [newPhoneInput, setNewPhoneInput] = useState('');
  const [phoneSearch, setPhoneSearch] = useState('');

  // User tab states
  const [userSearch, setUserSearch] = useState('');
  const [editingPhone, setEditingPhone] = useState<string | null>(null);
  const [editCoinVal, setEditCoinVal] = useState<number>(0);
  const [editPwdVal, setEditPwdVal] = useState<string>('');

  // Bot Simulator states
  const [simInput, setSimInput] = useState('');
  const [simMessages, setSimMessages] = useState<{ sender: 'user' | 'bot'; text: string; time: string }[]>([
    {
      sender: 'bot',
      text: '🤖 **Telegram Bot 管理器仿真控制台已就绪**\n\n可直接在下方输入 Telegram 指令测试：\n• `/auth 13912345678` 授权手机号\n• `/list` 查看已授权列表\n• `/users` 查看注册玩家',
      time: new Date().toLocaleTimeString(),
    },
  ]);

  const [botTokenInput, setBotTokenInput] = useState('');
  const [botUsernameInput, setBotUsernameInput] = useState('');
  const [copiedMsg, setCopiedMsg] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen]);

  const loadData = async () => {
    const data = await authStore.getAdminData();
    setAuthorizedPhones(data.authorizedPhones || []);
    setUsers(data.users || []);
    setLogs(data.logs || []);
    if (data.botConfig) {
      setBotConfig(data.botConfig);
      setBotTokenInput(data.botConfig.token || '');
      setBotUsernameInput(data.botConfig.botUsername || '');
    }
    if (data.syncConfig) {
      setSyncConfig(data.syncConfig);
      setRemoteUrlInput(data.syncConfig.remoteUrl || '');
      setSyncSecretInput(data.syncConfig.syncSecret || '');
      setNodeNameInput(data.syncConfig.nodeName || '');
      setNodeRoleInput(data.syncConfig.nodeRole || 'standalone');
      setAutoSyncInput(data.syncConfig.autoSync !== false);
    }
    if (data.isBotPollingActive !== undefined) {
      setIsBotPollingActive(data.isBotPollingActive);
    }
  };

  if (!isOpen) return null;

  // Add Authorized Phone
  const handleAddPhone = async () => {
    const cleanPhone = newPhoneInput.trim();
    if (!cleanPhone) return;
    sounds.playClick();
    await authStore.authorizePhone(cleanPhone);
    setNewPhoneInput('');
    loadData();
  };

  // Revoke Phone
  const handleRevokePhone = async (phoneToRevoke: string) => {
    if (!confirm(`确定要取消手机号 ${phoneToRevoke} 的注册授权吗？`)) return;
    sounds.playClick();
    await authStore.revokePhone(phoneToRevoke);
    loadData();
  };

  // Modify User Coins
  const handleSaveCoins = async (phone: string) => {
    sounds.playClick();
    await authStore.modifyUser(phone, 'UPDATE_COINS', { coins: editCoinVal });
    setEditingPhone(null);
    loadData();
  };

  // Reset User Password (6 characters)
  const handleResetPassword = async (phone: string) => {
    if (editPwdVal.length !== 6) {
      alert('❌ 重置密码必须恰好为 6 位数 (字母/数字)');
      return;
    }
    sounds.playClick();
    await authStore.modifyUser(phone, 'UPDATE_PASSWORD', { password: editPwdVal });
    alert(`✅ 已成功将手机号 ${phone} 的密码重置为：${editPwdVal}`);
    setEditingPhone(null);
    setEditPwdVal('');
    loadData();
  };

  // Delete User
  const handleDeleteUser = async (phone: string, nickname: string) => {
    if (!confirm(`确定要彻底删除玩家 [${nickname}] (${phone}) 的账号吗？`)) return;
    sounds.playClick();
    await authStore.modifyUser(phone, 'DELETE_USER');
    loadData();
  };

  // Send Command in Bot Simulator
  const handleSendSimCommand = async (customCmd?: string) => {
    const cmdText = customCmd || simInput.trim();
    if (!cmdText) return;

    sounds.playClick();
    const userMsgTime = new Date().toLocaleTimeString();
    setSimMessages(prev => [...prev, { sender: 'user', text: cmdText, time: userMsgTime }]);
    setSimInput('');

    const res = await authStore.sendBotCommand(cmdText);
    const botMsgTime = new Date().toLocaleTimeString();
    setSimMessages(prev => [
      ...prev,
      { sender: 'bot', text: res.replyText, time: botMsgTime },
    ]);

    // Refresh data in case phones/coins were changed
    loadData();
  };

  // Save Bot Config
  const handleSaveBotConfig = async () => {
    sounds.playClick();
    try {
      await fetch('/api/bot/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: botTokenInput,
          botUsername: botUsernameInput,
        }),
      });
      alert('✅ Telegram Bot 配置更新成功！');
      loadData();
    } catch {
      alert('配置更新完成');
    }
  };

  // Toggle Bot Polling on this Node (Single Bot Coordinator)
  const handleToggleBotPolling = async () => {
    sounds.playClick();
    const res = await authStore.toggleNodeBot(!syncConfig.enableBotPolling);
    setSyncConfig(prev => ({ ...prev, enableBotPolling: res.enableBotPolling }));
    setIsBotPollingActive(res.isBotPollingActive);
    setSyncActionMsg({
      type: res.enableBotPolling ? 'success' : 'info',
      text: res.message,
    });
    loadData();
  };

  // Save Sync Configuration
  const handleSaveSyncConfig = async () => {
    sounds.playClick();
    setSyncActionMsg(null);
    const res = await authStore.saveSyncConfig({
      nodeRole: nodeRoleInput,
      nodeName: nodeNameInput,
      remoteUrl: remoteUrlInput,
      syncSecret: syncSecretInput,
      autoSync: autoSyncInput,
    });
    if (res.success && res.syncConfig) {
      setSyncConfig(res.syncConfig);
      setSyncActionMsg({ type: 'success', text: '✅ 同步配置保存成功！' });
    } else {
      setSyncActionMsg({ type: 'error', text: res.error || '保存配置失败' });
    }
    loadData();
  };

  // Test Connection
  const handleTestConnection = async () => {
    sounds.playClick();
    setIsTestingConn(true);
    setTestResult(null);
    setSyncActionMsg(null);
    const res = await authStore.testSyncConnection(remoteUrlInput, syncSecretInput);
    setIsTestingConn(false);
    setTestResult(res);
  };

  // Execute Sync (Two-Way / Push / Pull)
  const handleExecuteSync = async (action: 'two-way' | 'push' | 'pull') => {
    sounds.playClick();
    setIsSyncing(true);
    setSyncActionMsg(null);
    const res = await authStore.executeSync(action);
    setIsSyncing(false);
    if (res.success) {
      setSyncActionMsg({ type: 'success', text: res.message });
      loadData();
    } else {
      setSyncActionMsg({ type: 'error', text: res.message });
    }
  };

  const usersMap = users.reduce((acc, u) => {
    acc[u.phone] = u;
    return acc;
  }, {} as Record<string, UserAccount>);

  const filteredPhones = authorizedPhones.filter(p => p.includes(phoneSearch.trim()));
  const filteredUsers = users.filter(
    u => u.phone.includes(userSearch.trim()) || u.nickname.includes(userSearch.trim())
  );

  const { theme } = useAppTheme();

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-lg z-50 flex items-center justify-center p-2 sm:p-4 select-none">
      <div 
        className={`border-2 rounded-3xl w-full max-w-4xl h-[92vh] max-h-[700px] overflow-hidden shadow-2xl relative flex flex-col transition-colors ${
          theme === 'deep-green'
            ? 'bg-[#145339] border-emerald-400/70 text-emerald-50'
            : 'bg-[#144f75] border-cyan-400/70 text-cyan-50'
        }`}
      >
        {/* Top Header */}
        <div 
          className={`p-3.5 sm:p-4 border-b flex items-center justify-between shrink-0 ${
            theme === 'deep-green'
              ? 'bg-[#0e3b28]/95 border-emerald-400/30'
              : 'bg-[#0e3752]/95 border-cyan-400/30'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-400 to-yellow-300 flex items-center justify-center text-slate-950 font-black shadow-lg">
              <Bot className="w-6 h-6 text-slate-950" />
            </div>
            <div>
              <h3 className="font-black text-lg text-amber-300 flex items-center gap-2">
                <span>Telegram Bot 管理员控制台</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 font-mono">
                  Super Admin
                </span>
              </h3>
              <p className="text-[11px] text-white/80">
                管理 TG Bot 授权手机号、玩家账号、6位密码与机器人指令
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              sounds.playClick();
              onClose();
            }}
            className="w-8 h-8 rounded-full bg-black/30 hover:bg-black/50 flex items-center justify-center text-white/80 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div 
          className={`flex border-b p-1.5 shrink-0 gap-1 overflow-x-auto ${
            theme === 'deep-green'
              ? 'bg-[#0a2e1f]/90 border-emerald-400/20'
              : 'bg-[#0a2b40]/90 border-cyan-400/20'
          }`}
        >
          <button
            onClick={() => {
              sounds.playClick();
              setActiveTab('PHONES');
            }}
            className={`px-3 py-2 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'PHONES'
                ? 'bg-amber-400 text-slate-950 shadow font-black'
                : 'text-white/70 hover:text-white'
            }`}
          >
            <PhoneCall className="w-4 h-4" />
            <span>📱 TG 授权手机号 ({authorizedPhones.length})</span>
          </button>

          <button
            onClick={() => {
              sounds.playClick();
              setActiveTab('USERS');
            }}
            className={`px-3 py-2 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'USERS'
                ? 'bg-amber-400 text-slate-950 shadow font-black'
                : 'text-white/70 hover:text-white'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>👥 玩家账号 ({users.length})</span>
          </button>

          <button
            onClick={() => {
              sounds.playClick();
              setActiveTab('SYNC');
            }}
            className={`px-3 py-2 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'SYNC'
                ? 'bg-amber-400 text-slate-950 shadow font-black'
                : 'text-white/70 hover:text-white'
            }`}
          >
            <ArrowLeftRight className="w-4 h-4 text-emerald-400" />
            <span>🔄 双机同步与单Bot</span>
          </button>

          <button
            onClick={() => {
              sounds.playClick();
              setActiveTab('SIMULATOR');
            }}
            className={`px-3 py-2 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'SIMULATOR'
                ? 'bg-amber-400 text-slate-950 shadow font-black'
                : 'text-white/70 hover:text-white'
            }`}
          >
            <Terminal className="w-4 h-4" />
            <span>🤖 Bot 指令仿真器</span>
          </button>

          <button
            onClick={() => {
              sounds.playClick();
              setActiveTab('CONFIG');
            }}
            className={`px-3 py-2 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'CONFIG'
                ? 'bg-amber-400 text-slate-950 shadow font-black'
                : 'text-white/70 hover:text-white'
            }`}
          >
            <Settings className="w-4 h-4" />
            <span>⚙️ 密钥与日志</span>
          </button>
        </div>

        {/* Tab Content Container */}
        <div 
          className={`flex-1 overflow-y-auto p-3 sm:p-4 space-y-3.5 ${
            theme === 'deep-green'
              ? 'bg-[#0e3b28]/60'
              : 'bg-[#0e3752]/60'
          }`}
        >
          {/* ================= TAB 1: AUTHORIZED PHONES ================= */}
          {activeTab === 'PHONES' && (
            <div className="space-y-4">
              {/* Add Phone Form & Search Bar */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                  <div className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                    <Plus className="w-4 h-4 text-amber-400" />
                    <span>新增授权手机号</span>
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      maxLength={11}
                      placeholder="输入手机号 (例: 13912345678)"
                      value={newPhoneInput}
                      onChange={e => setNewPhoneInput(e.target.value)}
                      className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white outline-none focus:border-amber-500 font-mono"
                    />
                    <button
                      onClick={handleAddPhone}
                      className="px-4 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black cursor-pointer shadow active:scale-95 transition-transform"
                    >
                      授权
                    </button>
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                  <div className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                    <Search className="w-4 h-4 text-slate-400" />
                    <span>搜索手机号</span>
                  </div>
                  <input
                    type="text"
                    placeholder="按手机号筛选..."
                    value={phoneSearch}
                    onChange={e => setPhoneSearch(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white outline-none focus:border-amber-500 font-mono"
                  />
                </div>
              </div>

              {/* Phones Table List */}
              <div className="border border-slate-800 rounded-2xl bg-slate-950 overflow-hidden">
                <div className="px-4 py-2.5 bg-slate-900/80 border-b border-slate-800 text-[11px] font-bold text-slate-400 grid grid-cols-12 gap-2">
                  <span className="col-span-1">#</span>
                  <span className="col-span-4">授权手机号</span>
                  <span className="col-span-4">注册状态 / 绑定账号</span>
                  <span className="col-span-3 text-right">操作</span>
                </div>

                <div className="divide-y divide-slate-800/60 max-h-[340px] overflow-y-auto">
                  {filteredPhones.map((phoneNum, idx) => {
                    const regUser = usersMap[phoneNum];
                    return (
                      <div
                        key={phoneNum}
                        className="px-4 py-2.5 text-xs grid grid-cols-12 gap-2 items-center hover:bg-slate-900/50 transition-colors"
                      >
                        <span className="col-span-1 font-mono text-slate-500">{idx + 1}</span>
                        <span className="col-span-4 font-mono font-bold text-amber-200">
                          {phoneNum}
                        </span>
                        <span className="col-span-4">
                          {regUser ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-500/30 text-[11px]">
                              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                              <span>{regUser.nickname}</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 text-[11px]">
                              <span>未注册</span>
                            </span>
                          )}
                        </span>
                        <span className="col-span-3 text-right">
                          <button
                            onClick={() => handleRevokePhone(phoneNum)}
                            className="px-2.5 py-1 rounded-lg bg-red-950/80 hover:bg-red-900 text-red-300 border border-red-500/30 text-[10px] font-bold cursor-pointer transition-all inline-flex items-center gap-1"
                          >
                            <Trash2 className="w-3 h-3" />
                            <span>取消授权</span>
                          </button>
                        </span>
                      </div>
                    );
                  })}

                  {filteredPhones.length === 0 && (
                    <div className="p-8 text-center text-xs text-slate-500">
                      暂无找到符合条件的授权手机号
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ================= TAB 2: PLAYER ACCOUNTS ================= */}
          {activeTab === 'USERS' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-3 bg-slate-950 p-2.5 rounded-2xl border border-slate-800">
                <div className="relative flex-1">
                  <input
                    type="text"
                    placeholder="按手机号或昵称搜索玩家..."
                    value={userSearch}
                    onChange={e => setUserSearch(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white outline-none focus:border-amber-500"
                  />
                </div>
                <button
                  onClick={loadData}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 font-bold flex items-center gap-1 cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>刷新</span>
                </button>
              </div>

              <div className="grid grid-cols-1 gap-3 max-h-[400px] overflow-y-auto">
                {filteredUsers.map(u => (
                  <div
                    key={u.phone}
                    className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 hover:border-slate-700 transition-all space-y-2.5"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-full bg-slate-900 border border-amber-500/40 flex items-center justify-center text-lg">
                          {u.avatar}
                        </div>
                        <div>
                          <div className="font-bold text-xs text-amber-200 flex items-center gap-2">
                            <span>{u.nickname}</span>
                            {u.isBotAdmin && (
                              <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 text-[9px] border border-amber-500/40 font-mono">
                                👑 Bot管理员
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono flex items-center gap-2">
                            <span>📱 {u.phone}</span>
                            <span>🔑 密码: <code className="text-cyan-300 bg-slate-900 px-1 rounded">{u.password}</code></span>
                          </div>
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="text-xs font-mono font-black text-yellow-300">
                          💰 {u.coins.toLocaleString()} 豆
                        </div>
                        <div className="text-[10px] text-emerald-400 font-mono">
                          {u.wins}胜 / {u.losses}负
                        </div>
                      </div>
                    </div>

                    {/* Inline Editor for Coins or Password */}
                    {editingPhone === u.phone ? (
                      <div className="p-2.5 rounded-xl bg-slate-900 border border-amber-500/40 space-y-2 animate-fadeIn">
                        <div className="flex items-center justify-between text-[11px] text-amber-300 font-bold">
                          <span>编辑玩家: {u.nickname}</span>
                          <button
                            onClick={() => setEditingPhone(null)}
                            className="text-slate-400 hover:text-white cursor-pointer"
                          >
                            ✕ 取消
                          </button>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-[10px] text-slate-400 mb-0.5">
                              修改欢乐豆数量:
                            </label>
                            <div className="flex gap-1">
                              <input
                                type="number"
                                value={editCoinVal}
                                onChange={e => setEditCoinVal(Number(e.target.value))}
                                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white font-mono"
                              />
                              <button
                                onClick={() => handleSaveCoins(u.phone)}
                                className="px-2 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white shrink-0 cursor-pointer"
                              >
                                保存
                              </button>
                            </div>
                          </div>

                          <div>
                            <label className="block text-[10px] text-slate-400 mb-0.5">
                              重置密码 (必须 6 位数):
                            </label>
                            <div className="flex gap-1">
                              <input
                                type="text"
                                maxLength={6}
                                value={editPwdVal}
                                onChange={e => setEditPwdVal(e.target.value)}
                                placeholder="6位数"
                                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white font-mono"
                              />
                              <button
                                onClick={() => handleResetPassword(u.phone)}
                                className="px-2 py-1 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-xs font-bold text-white shrink-0 cursor-pointer"
                              >
                                重置
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-end gap-2 border-t border-slate-800/80 pt-2">
                        <button
                          onClick={() => {
                            sounds.playClick();
                            setEditingPhone(u.phone);
                            setEditCoinVal(u.coins);
                            setEditPwdVal(u.password);
                          }}
                          className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 text-[10px] font-bold border border-amber-500/30 cursor-pointer"
                        >
                          ✏️ 修改豆数 / 密码
                        </button>

                        <button
                          onClick={() => handleDeleteUser(u.phone, u.nickname)}
                          className="px-2.5 py-1 rounded-lg bg-red-950/80 hover:bg-red-900 text-red-300 text-[10px] font-bold border border-red-500/30 cursor-pointer"
                        >
                          🗑️ 删除用户
                        </button>
                      </div>
                    )}
                  </div>
                ))}

                {filteredUsers.length === 0 && (
                  <div className="p-8 text-center text-xs text-slate-500">
                    暂无符合条件的玩家账号
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ================= TAB 3: DUAL-NODE SYNC & SINGLE BOT ================= */}
          {activeTab === 'SYNC' && (
            <div className="space-y-4">
              {/* Architecture Banner */}
              <div className="p-3.5 rounded-2xl bg-gradient-to-r from-emerald-950/80 via-slate-900 to-cyan-950/80 border border-emerald-500/40 shadow space-y-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ArrowLeftRight className="w-5 h-5 text-emerald-400" />
                    <span className="font-black text-sm text-amber-300">
                      Termux ⇋ Serv00 双机数据双向同步中心
                    </span>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-mono">
                    单 Bot 协同机制
                  </span>
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  采用「<b>云端常驻单 Bot + 移动游戏端 + 双机数据双向合并</b>」黄金架构：Telegram 官方限制同一 Token 不可多开轮询。Serv00 云端 7×24h 在线响应 TG 指令，手机 Termux 免去后台争抢与发热；两端数据时刻双向对齐！
                </p>
              </div>

              {/* CARD 1: SINGLE-BOT COORDINATOR */}
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-xs text-amber-300 flex items-center gap-1.5">
                    <Bot className="w-4 h-4 text-amber-400" />
                    <span>单 Bot 运行协调器 (Telegram Bot Polling)</span>
                  </h4>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-slate-400">本机角色:</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-lg font-bold font-mono border ${
                      syncConfig.nodeRole === 'serv00_cloud'
                        ? 'bg-cyan-950 text-cyan-300 border-cyan-500/40'
                        : syncConfig.nodeRole === 'termux_local'
                        ? 'bg-amber-950 text-amber-300 border-amber-500/40'
                        : 'bg-slate-800 text-slate-300 border-slate-700'
                    }`}>
                      {syncConfig.nodeRole === 'serv00_cloud'
                        ? '☁️ Serv00 云端常驻'
                        : syncConfig.nodeRole === 'termux_local'
                        ? '📱 Termux 手机本地'
                        : '💻 独立单机'}
                    </span>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <div className={`w-2.5 h-2.5 rounded-full ${
                        syncConfig.enableBotPolling
                          ? 'bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.8)]'
                          : 'bg-slate-600'
                      }`} />
                      <span className="text-xs font-bold text-white">
                        本机 Telegram 消息轮询状态：
                        {syncConfig.enableBotPolling ? (
                          <span className="text-emerald-400">【活跃运行中】</span>
                        ) : (
                          <span className="text-slate-400">【已休眠 (从属模式)】</span>
                        )}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400">
                      {syncConfig.enableBotPolling
                        ? '🟢 本机正在直接拉取 Telegram Bot 消息。如果在 Serv00 上运行，推荐保持此状态。'
                        : '⏸️ 本机已停止拉取 TG 消息，避免与云端争抢 409 Conflict。TG 授权与充值将通过双向同步自动拉取！'}
                    </p>
                  </div>

                  <button
                    onClick={handleToggleBotPolling}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold shrink-0 cursor-pointer transition-all border shadow ${
                      syncConfig.enableBotPolling
                        ? 'bg-slate-800 hover:bg-slate-700 text-amber-300 border-amber-500/30'
                        : 'bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-400/40'
                    }`}
                  >
                    {syncConfig.enableBotPolling ? '⏸️ 休眠本机轮询' : '▶️ 激活本机轮询'}
                  </button>
                </div>
              </div>

              {/* CARD 2: COUNTERPART CONNECTION CONFIG */}
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                <h4 className="font-bold text-xs text-amber-300 flex items-center gap-1.5">
                  <Server className="w-4 h-4 text-cyan-400" />
                  <span>对端节点互联与安全配置</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="block text-[10px] text-slate-400 mb-1">
                      本机节点角色:
                    </label>
                    <select
                      value={nodeRoleInput}
                      onChange={e => setNodeRoleInput(e.target.value as any)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-amber-500 cursor-pointer"
                    >
                      <option value="serv00_cloud">☁️ Serv00 云端常驻主控 (推荐运行 Bot)</option>
                      <option value="termux_local">📱 Termux 手机游戏端 (免争抢从属)</option>
                      <option value="standalone">💻 独立/单机开发测试</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] text-slate-400 mb-1">
                      本机节点标识名称:
                    </label>
                    <input
                      type="text"
                      value={nodeNameInput}
                      onChange={e => setNodeNameInput(e.target.value)}
                      placeholder="例: Termux-Phone-01 或 Serv00-Cloud"
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono outline-none focus:border-amber-500"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-[10px] text-slate-400">
                        对端服务器地址 (Remote URL):
                      </label>
                      <div className="flex gap-1 text-[10px]">
                        <button
                          onClick={() => setRemoteUrlInput('https://你的serv00用户名.serv00.net')}
                          className="text-cyan-400 hover:text-cyan-300 underline cursor-pointer"
                        >
                          填入 Serv00 域名示例
                        </button>
                        <span className="text-slate-600">|</span>
                        <button
                          onClick={() => setRemoteUrlInput('http://192.168.1.100:8080')}
                          className="text-amber-400 hover:text-amber-300 underline cursor-pointer"
                        >
                          填入局域网示例
                        </button>
                      </div>
                    </div>
                    <input
                      type="text"
                      value={remoteUrlInput}
                      onChange={e => setRemoteUrlInput(e.target.value)}
                      placeholder="例: https://mygame.serv00.net 或 http://192.168.1.88:8080"
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-cyan-200 font-mono outline-none focus:border-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] text-slate-400 mb-1">
                      双机通信密钥 (SYNC_SECRET_KEY):
                    </label>
                    <input
                      type="text"
                      value={syncSecretInput}
                      onChange={e => setSyncSecretInput(e.target.value)}
                      placeholder="两端必须填写完全一致的通信密钥"
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-amber-200 font-mono outline-none focus:border-amber-500"
                    />
                  </div>

                  <div className="flex items-center gap-2 pt-5">
                    <input
                      type="checkbox"
                      id="autoSyncCheck"
                      checked={autoSyncInput}
                      onChange={e => setAutoSyncInput(e.target.checked)}
                      className="w-4 h-4 rounded text-amber-500 bg-slate-900 border-slate-700 cursor-pointer"
                    />
                    <label htmlFor="autoSyncCheck" className="text-xs text-slate-200 cursor-pointer select-none">
                      开启自动同步 (数据变更时即刻推送，每5分钟后台双向对齐)
                    </label>
                  </div>
                </div>

                <div className="flex justify-end pt-1">
                  <button
                    onClick={handleSaveSyncConfig}
                    className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs cursor-pointer shadow transition-all"
                  >
                    保存同步配置
                  </button>
                </div>
              </div>

              {/* CARD 3: OPERATIONS & DIAGNOSTICS */}
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                <h4 className="font-bold text-xs text-amber-300 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Zap className="w-4 h-4 text-yellow-400" />
                    <span>即时同步与连通性测试</span>
                  </div>
                  {syncConfig.lastSyncTime && (
                    <span className="text-[10px] text-slate-400 font-mono">
                      上次同步: {syncConfig.lastSyncTime}
                    </span>
                  )}
                </h4>

                {/* Action Buttons Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <button
                    onClick={handleTestConnection}
                    disabled={isTestingConn || !remoteUrlInput}
                    className="p-3 rounded-xl bg-slate-900 hover:bg-slate-850 disabled:opacity-50 text-cyan-300 border border-cyan-500/30 flex flex-col items-center justify-center gap-1.5 cursor-pointer text-xs font-bold transition-all shadow"
                  >
                    <Globe className="w-4 h-4 text-cyan-400" />
                    <span>{isTestingConn ? '正在测试...' : '📡 测试连通性'}</span>
                  </button>

                  <button
                    onClick={() => handleExecuteSync('two-way')}
                    disabled={isSyncing || !remoteUrlInput}
                    className="p-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50 text-white border border-emerald-400/40 flex flex-col items-center justify-center gap-1.5 cursor-pointer text-xs font-black transition-all shadow-lg"
                  >
                    <ArrowLeftRight className="w-4 h-4 text-white" />
                    <span>{isSyncing ? '同步合并中...' : '🔄 立即双向合并'}</span>
                  </button>

                  <button
                    onClick={() => handleExecuteSync('push')}
                    disabled={isSyncing || !remoteUrlInput}
                    className="p-3 rounded-xl bg-slate-900 hover:bg-slate-850 disabled:opacity-50 text-amber-300 border border-amber-500/30 flex flex-col items-center justify-center gap-1.5 cursor-pointer text-xs font-bold transition-all shadow"
                  >
                    <ArrowUpRight className="w-4 h-4 text-amber-400" />
                    <span>{isSyncing ? '正在推送...' : '⬆️ 推送到对端'}</span>
                  </button>

                  <button
                    onClick={() => handleExecuteSync('pull')}
                    disabled={isSyncing || !remoteUrlInput}
                    className="p-3 rounded-xl bg-slate-900 hover:bg-slate-850 disabled:opacity-50 text-purple-300 border border-purple-500/30 flex flex-col items-center justify-center gap-1.5 cursor-pointer text-xs font-bold transition-all shadow"
                  >
                    <ArrowDownLeft className="w-4 h-4 text-purple-400" />
                    <span>{isSyncing ? '正在拉取...' : '⬇️ 从对端拉取'}</span>
                  </button>
                </div>

                {/* Test Result Box */}
                {testResult && (
                  <div className={`p-3 rounded-xl border text-xs font-mono space-y-1 ${
                    testResult.success
                      ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300'
                      : 'bg-red-950/60 border-red-500/40 text-red-300'
                  }`}>
                    <div className="font-bold flex items-center justify-between">
                      <span>{testResult.message}</span>
                      {testResult.latencyMs !== undefined && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-black/40">
                          {testResult.latencyMs}ms
                        </span>
                      )}
                    </div>
                    {testResult.remoteNode && (
                      <div className="text-[11px] text-slate-300 opacity-90">
                        对端节点: {testResult.remoteNode.nodeName} | 角色: {testResult.remoteNode.nodeRole} | TG Bot: {testResult.remoteNode.botActive ? '运行中' : '休眠'} | 玩家: {testResult.remoteNode.usersCount}人
                      </div>
                    )}
                  </div>
                )}

                {/* Sync Action Message */}
                {syncActionMsg && (
                  <div className={`p-3 rounded-xl border text-xs font-mono ${
                    syncActionMsg.type === 'success'
                      ? 'bg-emerald-950/80 border-emerald-500/50 text-emerald-200'
                      : syncActionMsg.type === 'error'
                      ? 'bg-red-950/80 border-red-500/50 text-red-200'
                      : 'bg-slate-900 border-slate-700 text-amber-200'
                  }`}>
                    {syncActionMsg.text}
                  </div>
                )}

                {/* Last Status Summary */}
                <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800/80 text-[11px] text-slate-300 space-y-1">
                  <div className="flex items-center justify-between text-slate-400 text-[10px]">
                    <span>同步状态追踪</span>
                    <span>
                      当前本地数据: <b>{authorizedPhones.length}</b> 个授权号 / <b>{users.length}</b> 位玩家
                    </span>
                  </div>
                  <div className="font-mono text-slate-200">
                    {syncConfig.lastSyncMessage || '尚未执行同步操作'}
                  </div>
                </div>
              </div>

              {/* CARD 4: TOPOLOGY & DEPLOYMENT TIP */}
              <div className="p-3 rounded-2xl bg-slate-950/70 border border-slate-800 text-[11px] text-slate-400 space-y-1.5">
                <div className="font-bold text-slate-300 flex items-center gap-1">
                  <span>💡 推荐使用流程</span>
                </div>
                <ol className="list-decimal list-inside space-y-1 text-slate-400 text-[10px]">
                  <li>在 <b>Serv00 云端</b>：按照文档部署并开启 PM2 守护，在 .env 填好 BOT_TOKEN 并启动 Bot；</li>
                  <li>在 <b>Termux 手机端</b>：打开此面板将对端地址设为 Serv00 域名，点击「测试连通性」；</li>
                  <li>平时有新玩家在 Telegram 找 Bot 授权时，Termux 手机端会自动双向同步，零延迟开玩！</li>
                </ol>
              </div>
            </div>
          )}

          {/* ================= TAB 4: BOT SIMULATOR ================= */}
          {activeTab === 'SIMULATOR' && (
            <div className="space-y-3 flex flex-col h-[420px]">
              {/* Quick Preset Buttons */}
              <div className="flex flex-wrap gap-1.5 bg-slate-950 p-2 rounded-2xl border border-slate-800 text-[10px]">
                <span className="text-slate-400 font-bold self-center mr-1">快捷指令:</span>
                <button
                  onClick={() => handleSendSimCommand('/help')}
                  className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-emerald-300 cursor-pointer font-mono"
                >
                  /help
                </button>
                <button
                  onClick={() => handleSendSimCommand('/list')}
                  className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 cursor-pointer font-mono"
                >
                  /list (查看授权)
                </button>
                <button
                  onClick={() => handleSendSimCommand('/users')}
                  className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-300 cursor-pointer font-mono"
                >
                  /users (查看玩家)
                </button>
                <button
                  onClick={() => handleSendSimCommand('/auth 13999887766')}
                  className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-emerald-400 cursor-pointer font-mono"
                >
                  /auth 13999887766
                </button>
              </div>

              {/* Chat Log Window */}
              <div className="flex-1 bg-slate-950 border border-slate-800 rounded-2xl p-3 overflow-y-auto space-y-3 font-mono text-xs">
                {simMessages.map((msg, i) => (
                  <div
                    key={i}
                    className={`flex flex-col ${
                      msg.sender === 'user' ? 'items-end' : 'items-start'
                    }`}
                  >
                    <div
                      className={`max-w-[85%] rounded-2xl p-3 whitespace-pre-wrap ${
                        msg.sender === 'user'
                          ? 'bg-amber-500 text-slate-950 font-bold rounded-tr-none'
                          : 'bg-slate-900 border border-slate-800 text-emerald-300 rounded-tl-none'
                      }`}
                    >
                      {msg.text}
                    </div>
                    <span className="text-[9px] text-slate-500 mt-1 px-1">{msg.time}</span>
                  </div>
                ))}
              </div>

              {/* Chat Input Bar */}
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="输入 Telegram 指令 (例: /auth 13800138000 或 /addcoins 13800138000 50000)"
                  value={simInput}
                  onChange={e => setSimInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSendSimCommand()}
                  className="flex-1 bg-slate-950 border border-slate-700 focus:border-amber-500 rounded-xl px-3 py-2 text-xs text-white outline-none font-mono"
                />
                <button
                  onClick={() => handleSendSimCommand()}
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs cursor-pointer shadow flex items-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5 text-slate-950" />
                  <span>发送</span>
                </button>
              </div>
            </div>
          )}

          {/* ================= TAB 4: CONFIG & LOGS ================= */}
          {activeTab === 'CONFIG' && (
            <div className="space-y-4">
              {/* Termux Root .env Status Banner */}
              <div className="p-3 rounded-2xl bg-slate-950 border border-emerald-500/40 text-xs text-slate-200 flex items-start gap-2.5 shadow">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <div className="font-bold text-emerald-300">
                    Termux 根目录 `.env` 配置文件加载状态
                  </div>
                  <div className="text-[11px] text-slate-300 font-mono">
                    系统会自动优先加载 <code className="text-amber-300 bg-slate-900 px-1 py-0.5 rounded">../.env</code> (即 Termux 根目录 ~/.env)。
                  </div>
                  <div className="text-[10px] text-slate-400">
                    只需配置两个变量：<code className="text-cyan-300">BOT_ID</code> 与 <code className="text-cyan-300">BOT_TOKEN</code> (或 <code className="text-cyan-300">TELEGRAM_BOT_TOKEN</code>)
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                <h4 className="font-bold text-xs text-amber-300 flex items-center gap-1.5">
                  <Bot className="w-4 h-4 text-amber-400" />
                  <span>Telegram Bot Webhook 与 API Token</span>
                </h4>

                <div>
                  <label className="block text-[10px] text-slate-400 mb-1">
                    Telegram Bot Token (Bot Father 获取):
                  </label>
                  <input
                    type="text"
                    value={botTokenInput}
                    onChange={e => setBotTokenInput(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-amber-200 font-mono outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-[10px] text-slate-400 mb-1">
                    Telegram Bot 用户名:
                  </label>
                  <input
                    type="text"
                    value={botUsernameInput}
                    onChange={e => setBotUsernameInput(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-amber-200 font-mono outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-[10px] text-slate-400 mb-1">
                    后端 Webhook 处理 URL:
                  </label>
                  <div className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-xs font-mono text-emerald-400 flex items-center justify-between">
                    <span>http://localhost:3000/api/bot/webhook</span>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText('http://localhost:3000/api/bot/webhook');
                        setCopiedMsg(true);
                        setTimeout(() => setCopiedMsg(false), 2000);
                      }}
                      className="text-xs text-amber-300 hover:text-white cursor-pointer flex items-center gap-1"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span>{copiedMsg ? '已复制!' : '复制'}</span>
                    </button>
                  </div>
                </div>

                <button
                  onClick={handleSaveBotConfig}
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs cursor-pointer shadow transition-all"
                >
                  保存 Telegram Bot 配置
                </button>
              </div>

              {/* System Logs */}
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                <h4 className="font-bold text-xs text-slate-300 flex items-center gap-1.5">
                  <Terminal className="w-4 h-4 text-emerald-400" />
                  <span>系统运行日志</span>
                </h4>
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 max-h-[160px] overflow-y-auto space-y-1.5 text-[11px] font-mono text-slate-300">
                  {logs.map((log, idx) => (
                    <div key={idx} className="flex gap-2 border-b border-slate-800/40 pb-1">
                      <span className="text-slate-500">[{log.time}]</span>
                      <span className="text-emerald-400 font-bold">[{log.type}]</span>
                      <span className="text-slate-200">{log.message}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="bg-slate-950 p-3 border-t border-slate-800 text-[10px] text-slate-400 flex items-center justify-between px-4 shrink-0">
          <span>当前账号: <b>{currentUser?.nickname || 'TG Bot 管理员'}</b> ({currentUser?.phone})</span>
          <span className="text-amber-400 font-mono">TG Bot Engine Active</span>
        </div>
      </div>
    </div>
  );
};
