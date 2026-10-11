import React from 'react';
import { voiceEngine, DIALECT_OPTIONS, ChatMessage } from '../utils/voiceSystem';
import { sounds } from '../utils/audio';
import { X, Mic, Send, Radio, Play, ShieldAlert, Volume2 } from 'lucide-react';

export type InGameChatTab = 'phrases' | 'tactical' | 'history' | 'dialect';

interface InGameChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  theme: string;
  chatTab: InGameChatTab;
  setChatTab: (tab: InGameChatTab) => void;
  chatMessages: ChatMessage[];
  customChatText: string;
  setCustomChatText: (text: string) => void;
  isRecording?: boolean;
  onStartRecord?: () => void;
  onStopRecord?: () => void;
  onSendChat: (phrase: string, audioUrl?: string, durationSec?: number) => void;
}

const CHAT_PHRASES = [
  '快点吧，我等的花儿都谢了！',
  '和你合作真是太愉快了！',
  '不要走，决战到天亮！',
  '你的牌打得也太好了！',
  '怎么又断线了！',
  '不好意思，这把我要跑清了！',
  '关门大吉，承让承让！',
  '一手臭牌，真是倒霉！',
];

const TACTICAL_RADIO_CALLS = [
  '呼叫队友！收到请回答，over！',
  '我这把牌贼好，你们顶住，over！',
  '对家出单还是出双？给个信号，over！',
  '别慌，我手手上是绝杀底牌，over！',
  '队友打得漂亮！这把稳了，over！',
  '收到收到，全力配合，over！',
];

const CHAT_EMOJIS = ['💣', '🌹', '☕', '🐔', '🍺', '👍'];

export const InGameChatModal: React.FC<InGameChatModalProps> = ({
  isOpen,
  onClose,
  theme,
  chatTab,
  setChatTab,
  chatMessages,
  customChatText,
  setCustomChatText,
  onSendChat,
}) => {
  if (!isOpen) return null;

  const handleSendTactical = (callText: string) => {
    sounds.playRadioBeep();
    onSendChat(`📻 ${callText}`);
    onClose();
  };

  return (
    <div
      className="absolute inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 select-none"
      onClick={onClose}
    >
      <div
        className={`w-full max-w-lg h-[90vh] max-h-[420px] rounded-3xl border shadow-2xl flex flex-col p-3 sm:p-4 overflow-hidden animate-in fade-in zoom-in-95 duration-200 transition-colors ${
          theme === 'deep-green'
            ? 'bg-[#0a2318] border-emerald-400/40 text-white'
            : 'bg-[#082030] border-cyan-400/40 text-white'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Tabs */}
        <div className="flex items-center justify-between border-b border-emerald-500/30 pb-2 mb-2 shrink-0">
          <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto custom-scrollbar">
            <span className="text-sm sm:text-base font-black text-amber-300 whitespace-nowrap">💬 互动</span>
            <div className="flex items-center bg-black/40 p-0.5 rounded-xl border border-white/10 shrink-0">
              <button
                onClick={() => setChatTab('phrases')}
                className={`px-2.5 sm:px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  chatTab === 'phrases'
                    ? 'bg-gradient-to-r from-amber-400 via-amber-300 to-yellow-400 text-slate-950 shadow font-black'
                    : 'text-white/70 hover:text-white'
                }`}
              >
                💬 快捷短语
              </button>
              <button
                onClick={() => setChatTab('tactical')}
                className={`px-2.5 sm:px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1 ${
                  chatTab === 'tactical'
                    ? 'bg-gradient-to-r from-amber-400 via-amber-300 to-yellow-400 text-slate-950 shadow font-black'
                    : 'text-white/70 hover:text-white'
                }`}
              >
                <Radio className="w-3 h-3 text-amber-400" />
                <span>战术呼叫</span>
              </button>
              <button
                onClick={() => setChatTab('history')}
                className={`px-2.5 sm:px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1 ${
                  chatTab === 'history'
                    ? 'bg-gradient-to-r from-amber-400 via-amber-300 to-yellow-400 text-slate-950 shadow font-black'
                    : 'text-white/70 hover:text-white'
                }`}
              >
                <Mic className="w-3 h-3" />
                <span>语音记录</span>
              </button>
              <button
                onClick={() => setChatTab('dialect')}
                className={`px-2.5 sm:px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  chatTab === 'dialect'
                    ? 'bg-gradient-to-r from-amber-400 via-amber-300 to-yellow-400 text-slate-950 shadow font-black'
                    : 'text-white/70 hover:text-white'
                }`}
              >
                🌐 方言配音
              </button>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/70 hover:text-white p-1.5 rounded-lg cursor-pointer transition-colors shrink-0 ml-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 1. 快捷短语与表情 */}
        {chatTab === 'phrases' && (
          <div className="flex flex-col gap-2 flex-1 min-h-0">
            {/* 表情栏 */}
            <div
              className={`flex items-center justify-around p-1.5 rounded-2xl border shrink-0 ${
                theme === 'deep-green'
                  ? 'bg-[#0e3b28]/95 border-emerald-400/30'
                  : 'bg-[#0e3752]/95 border-cyan-400/30'
              }`}
            >
              {CHAT_EMOJIS.map((emoji, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    onSendChat(emoji);
                    onClose();
                  }}
                  className="text-2xl hover:scale-125 transition-transform active:scale-95 cursor-pointer p-0.5"
                >
                  {emoji}
                </button>
              ))}
            </div>

            {/* 文字输入栏 */}
            <div
              className={`flex items-center gap-1.5 p-1.5 rounded-2xl border shrink-0 ${
                theme === 'deep-green'
                  ? 'bg-[#0e3b28]/95 border-emerald-400/30'
                  : 'bg-[#0e3752]/95 border-cyan-400/30'
              }`}
            >
              <input
                type="text"
                value={customChatText}
                onChange={(e) => setCustomChatText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && customChatText.trim()) {
                    onSendChat(customChatText.trim());
                    setCustomChatText('');
                    onClose();
                  }
                }}
                placeholder="输入文本，真人语音自动播报..."
                className="flex-1 bg-transparent px-2.5 py-1 text-xs text-white placeholder-white/40 focus:outline-none"
              />
              <button
                onClick={() => {
                  if (customChatText.trim()) {
                    onSendChat(customChatText.trim());
                    setCustomChatText('');
                    onClose();
                  }
                }}
                disabled={!customChatText.trim()}
                className="p-2 rounded-xl text-xs font-bold bg-amber-400 text-slate-950 shadow cursor-pointer disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* 常用短语列表 */}
            <div className="grid grid-cols-2 gap-1.5 flex-1 overflow-y-auto pr-1 custom-scrollbar">
              {CHAT_PHRASES.map((phrase, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    onSendChat(phrase);
                    onClose();
                  }}
                  className={`text-left px-2.5 py-1.5 rounded-xl border text-white text-[11px] font-bold transition-colors cursor-pointer flex items-center justify-between group ${
                    theme === 'deep-green'
                      ? 'bg-[#0e3b28]/80 hover:bg-[#114732] border-emerald-400/30'
                      : 'bg-[#0e3752]/80 hover:bg-[#12476b] border-cyan-400/30'
                  }`}
                >
                  <span className="flex items-center gap-1.5 truncate">
                    <Radio className="w-3 h-3 text-amber-400 shrink-0" />
                    <span className="truncate">{phrase}</span>
                  </span>
                  <span className="text-[10px] text-amber-300 opacity-0 group-hover:opacity-100 shrink-0 font-bold">
                    播报➔
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 2. 战术呼叫 (整合自对讲机面板) */}
        {chatTab === 'tactical' && (
          <div className="flex flex-col gap-2 flex-1 min-h-0">
            <div className="p-2 rounded-xl bg-amber-500/15 border border-amber-400/30 text-amber-300 text-[11px] flex items-center gap-2">
              <Radio className="w-4 h-4 text-amber-400 shrink-0 animate-pulse" />
              <span>模拟军用电台通讯，自带 Roger Beep 呼叫提示音，人机与牌友即时战术响应！</span>
            </div>

            <div className="grid grid-cols-2 gap-2 flex-1 overflow-y-auto pr-1 custom-scrollbar">
              {TACTICAL_RADIO_CALLS.map((call, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSendTactical(call)}
                  className={`text-left p-2.5 rounded-xl border text-white text-xs font-black transition-all cursor-pointer flex flex-col justify-between gap-1 group active:scale-95 shadow-md ${
                    theme === 'deep-green'
                      ? 'bg-gradient-to-b from-[#114932] to-[#0a2f20] hover:border-amber-400 border-emerald-400/40'
                      : 'bg-gradient-to-b from-[#114669] to-[#0a2e45] hover:border-amber-400 border-cyan-400/40'
                  }`}
                >
                  <div className="flex items-center gap-1.5 text-amber-400">
                    <Radio className="w-3.5 h-3.5 shrink-0" />
                    <span className="text-[10px] font-mono tracking-widest uppercase">TACTICAL #{idx + 1}</span>
                  </div>
                  <span className="text-white text-xs font-bold leading-snug">{call}</span>
                  <div className="flex items-center justify-between text-[10px] text-amber-300/80 pt-1 border-t border-white/10">
                    <span>📡 发送电台呼叫</span>
                    <span className="font-mono text-emerald-400">OVER ➔</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 3. 语音与互动记录 (整合重播试听与对讲录音) */}
        {chatTab === 'history' && (
          <div className="flex flex-col gap-2 flex-1 min-h-0">
            <div className="space-y-1.5 flex-1 overflow-y-auto pr-1 custom-scrollbar">
              {chatMessages.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-white/50 text-xs gap-2">
                  <Mic className="w-8 h-8 text-white/20" />
                  <span>暂无对讲语音或互动记录</span>
                  <span className="text-[11px] text-amber-400/70">右上角点击【对讲】即可随时开始录音发送！</span>
                </div>
              ) : (
                chatMessages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`p-2 rounded-xl text-xs text-white border flex items-center justify-between gap-2 ${
                      msg.audioUrl
                        ? 'bg-gradient-to-r from-red-950/60 to-black/80 border-red-500/50'
                        : theme === 'deep-green'
                        ? 'bg-[#0e3b28]/80 border-emerald-400/30'
                        : 'bg-[#0e3752]/80 border-cyan-400/30'
                    }`}
                  >
                    <div className="truncate flex items-center gap-1.5">
                      {msg.audioUrl ? (
                        <span className="px-1.5 py-0.5 rounded bg-red-600 text-white text-[9.5px] font-black shrink-0">
                          🎙️ 语音
                        </span>
                      ) : (
                        <span className="text-amber-400 shrink-0">💬</span>
                      )}
                      <span className="font-bold text-amber-300 shrink-0">{msg.senderName}: </span>
                      <span className="truncate">{msg.content}</span>
                    </div>

                    {msg.audioUrl && (
                      <button
                        onClick={() => voiceEngine.playAudio(msg.audioUrl!)}
                        className="px-2.5 py-1 rounded-lg bg-amber-400 hover:bg-amber-300 active:scale-95 text-slate-950 font-black text-[11px] inline-flex items-center gap-1 shadow cursor-pointer shrink-0 transition-transform"
                        title="点击重播录音"
                      >
                        <Play className="w-3 h-3 fill-current" />
                        <span>重播</span>
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* 4. 方言配音 */}
        {chatTab === 'dialect' && (
          <div className="flex-1 overflow-y-auto pr-1 custom-scrollbar">
            <div className="grid grid-cols-2 gap-2">
              {DIALECT_OPTIONS.map((d) => {
                const isActive = voiceEngine.dialect === d.id;
                return (
                  <button
                    key={d.id}
                    onClick={() => {
                      voiceEngine.setDialect(d.id);
                      sounds.speak(`已切换为${d.label}！`);
                    }}
                    className={`p-2 rounded-xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                      isActive
                        ? 'bg-amber-400 text-slate-950 border-amber-300 shadow font-black'
                        : theme === 'deep-green'
                        ? 'bg-[#0e3b28]/80 border-emerald-400/30 text-white hover:border-emerald-300'
                        : 'bg-[#0e3752]/80 border-cyan-400/30 text-white hover:border-cyan-300'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span className="text-base">{d.icon}</span>
                      <div className="truncate">
                        <div
                          className={`font-bold text-xs truncate ${
                            isActive ? 'text-slate-950' : 'text-white'
                          }`}
                        >
                          {d.label}
                        </div>
                        <div
                          className={`text-[9px] truncate ${
                            isActive ? 'text-slate-800' : 'text-white/60'
                          }`}
                        >
                          {d.desc}
                        </div>
                      </div>
                    </div>
                    <span
                      className={`text-[10px] font-bold shrink-0 ${
                        isActive ? 'text-slate-950' : 'text-amber-300'
                      }`}
                    >
                      {isActive ? '当前' : '选择'}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
