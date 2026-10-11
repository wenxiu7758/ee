import React from 'react';
import { GameState } from '../types/game';
import { getEffectiveCards, calculateMatchSettlement } from '../utils/chudadiRules';
import { Sparkles, Crown, Trophy, Home, Play } from 'lucide-react';

interface SettlementModalProps {
  gameState: GameState;
  theme: string;
  onBackToLobby: () => void;
  onStartNewGame: () => void;
  onStartNewMatch?: () => void;
}

export const RoundSummaryModal: React.FC<SettlementModalProps> = ({
  gameState,
  theme,
  onBackToLobby,
  onStartNewGame,
}) => {
  return (
    <div
      className={`absolute inset-0 z-50 flex flex-col justify-between p-2 sm:p-3 md:p-4 text-white select-none overflow-hidden animate-in fade-in zoom-in-98 duration-200 transition-colors duration-300 ${
        theme === 'deep-green'
          ? 'bg-gradient-to-b from-[#114732] via-[#165a3f] to-[#0e3b29]'
          : 'bg-gradient-to-b from-[#12476b] via-[#165680] to-[#0e3855]'
      }`}
    >
      {/* Top Header Bar */}
      <div className="flex items-center justify-between border-b border-emerald-400/30 pb-2 px-1 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-emerald-400/20 border border-emerald-400 flex items-center justify-center text-emerald-200 shadow-md">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm sm:text-base md:text-lg font-black text-white tracking-wide">
                ♠️ 烟三 · 第 <span className="text-amber-300">{gameState.roundNumber}</span> 局战报小结
              </h2>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold">
                底分 {gameState.room.baseScore.toLocaleString()} 积分
              </span>
            </div>
            <div className="text-[10px] sm:text-xs text-amber-300/90 font-medium">
              小局不扣总积分，剩牌张数已折算累加！满 <span className="text-white font-black underline">100张</span> 触发终局大结算！
            </div>
          </div>
        </div>

        {/* Winner Announcement Badge */}
        <div className="bg-amber-500/10 border border-amber-500/40 rounded-2xl px-3 py-1 text-right flex items-center gap-2">
          <Crown className="w-5 h-5 text-amber-400 shrink-0" />
          <div className="text-left">
            <div className="text-[10px] text-slate-300 leading-tight">本局头游获胜者</div>
            <div className="text-xs sm:text-sm font-black text-amber-300 truncate">
              {gameState.players[gameState.winnerIndex ?? 0]?.name}
            </div>
          </div>
        </div>
      </div>

      {/* 4 Players Horizontal Settlement Cards Grid */}
      <div className="flex-1 flex items-center justify-center min-h-0 py-2">
        <div className="grid grid-cols-4 gap-2 sm:gap-3 w-full max-w-6xl h-full items-stretch">
          {gameState.players.map((p, idx) => {
            const isWinner = idx === gameState.winnerIndex;
            const rawCount = p.cards ? p.cards.length : 0;
            const eff = getEffectiveCards(rawCount);
            const accCards = p.accumulatedCards || 0;
            const progressPct = Math.min(100, (accCards / 100) * 100);
            const isHuman = idx === 0;

            return (
              <div
                key={p.id}
                className={`rounded-2xl border p-2.5 sm:p-3 flex flex-col justify-between relative transition-all shadow-xl overflow-hidden ${
                  isWinner
                    ? 'bg-gradient-to-b from-amber-900/60 via-[#185e42] to-[#0f402c] border-amber-400/90 ring-2 ring-amber-400/40'
                    : isHuman
                    ? theme === 'deep-green'
                      ? 'bg-gradient-to-b from-[#185e42] to-[#0f402c] border-emerald-400/70'
                      : 'bg-gradient-to-b from-[#185c8a] to-[#0f3f5f] border-cyan-400/70'
                    : theme === 'deep-green'
                    ? 'bg-[#145339]/90 border-emerald-500/50'
                    : 'bg-[#144f75]/90 border-cyan-500/50'
                }`}
              >
                {/* Top Rank / Seat Indicator */}
                <div className="flex items-center justify-between pb-1.5 border-b border-emerald-900/50 shrink-0">
                  <div className="flex items-center gap-1.5 truncate">
                    <span className="text-base sm:text-lg">{p.avatar}</span>
                    <div className="truncate">
                      <div className="font-black text-xs text-white truncate flex items-center gap-1">
                        <span>{p.name}</span>
                        {isHuman && (
                          <span className="text-[9px] px-1 py-0.2 rounded bg-emerald-500/30 text-emerald-300 font-bold">
                            你
                          </span>
                        )}
                      </div>
                      <div className="text-[9px] text-emerald-200/70 font-mono">
                        {['南家', '东家', '北家', '西家'][idx]}
                      </div>
                    </div>
                  </div>

                  {isWinner ? (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 font-black shadow-md shrink-0 flex items-center gap-0.5">
                      <Crown className="w-3 h-3" />
                      <span>胜出 0张</span>
                    </span>
                  ) : (
                    <span
                      className={`text-[9px] px-1.5 py-0.5 rounded-md font-bold shrink-0 ${
                        eff.multiplier >= 4
                          ? 'bg-red-500/30 text-red-300 border border-red-500/50'
                          : eff.multiplier >= 2
                          ? 'bg-amber-500/30 text-amber-300 border border-amber-500/50'
                          : 'bg-slate-800/80 text-slate-300'
                      }`}
                    >
                      {eff.multiplier > 1 ? `${eff.multiplier}倍关门` : '正常1倍'}
                    </span>
                  )}
                </div>

                {/* Middle Card: Round Result Status */}
                <div className="my-auto py-1.5 text-center flex flex-col items-center justify-center gap-1">
                  {isWinner ? (
                    <>
                      <div className="w-10 h-10 rounded-full bg-amber-500/20 border border-amber-400 flex items-center justify-center text-amber-300 shadow-md">
                        <Trophy className="w-6 h-6" />
                      </div>
                      <div className="text-xs sm:text-sm font-black text-amber-300">
                        率先清空手牌！
                      </div>
                      <div className="text-[10px] text-emerald-300 font-bold bg-emerald-950/80 border border-emerald-500/40 rounded-lg px-2 py-0.5">
                        🚩 获第 {gameState.roundNumber + 1} 局首出权
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="text-[11px] text-slate-200">
                        本局剩牌: <strong className="text-white font-black text-sm">{rawCount}</strong> 张
                      </div>
                      <div className="text-xs font-black text-amber-300 bg-amber-950/60 border border-amber-500/40 rounded-xl px-2.5 py-1">
                        折算增加: <span className="text-base font-mono">+{eff.effective}</span> 张
                      </div>
                      <div className="text-[9px] text-amber-200/80">
                        {rawCount >= 13
                          ? '⚠️ 13张全关 (4倍惩罚)'
                          : rawCount >= 10
                          ? '⚠️ 10~12张 (3倍翻番)'
                          : rawCount >= 8
                          ? '⚠️ 8~9张 (2倍翻番)'
                          : '1~7张 (1倍计入)'}
                      </div>
                    </>
                  )}
                </div>

                {/* Bottom Gauge: Progress towards 100 accumulated cards */}
                <div className="pt-1.5 border-t border-emerald-900/50 shrink-0 space-y-1">
                  <div className="flex justify-between items-center text-[10px] font-mono">
                    <span className="text-slate-300">累计总剩牌:</span>
                    <span
                      className={`font-black text-xs ${
                        accCards >= 80
                          ? 'text-red-400'
                          : accCards >= 50
                          ? 'text-amber-300'
                          : 'text-emerald-300'
                      }`}
                    >
                      {accCards} / 100 张
                    </span>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full bg-[#031d14] rounded-full h-2 overflow-hidden border border-emerald-900/80">
                    <div
                      className={`h-full transition-all duration-500 rounded-full ${
                        accCards >= 80
                          ? 'bg-gradient-to-r from-orange-500 to-rose-600'
                          : accCards >= 50
                          ? 'bg-gradient-to-r from-yellow-500 to-amber-500'
                          : 'bg-gradient-to-r from-teal-400 to-emerald-500'
                      }`}
                      style={{ width: `${progressPct}%` }}
                    />
                  </div>

                  <div className="flex justify-between items-center text-[9px] text-slate-300">
                    <span>
                      {accCards >= 100
                        ? '🚨 已达100张大结算'
                        : `距结算还差 ${100 - accCards} 张`}
                    </span>
                    <span className="text-amber-300 font-mono font-bold">
                      结余: {p.score.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Bottom Rules Tip & Action Bar */}
      <div className="flex items-center justify-between pt-2 border-t border-emerald-500/30 px-1 gap-2 shrink-0">
        <div className="flex items-center gap-2">
          <button
            onClick={onBackToLobby}
            className={`px-3 py-2 rounded-xl font-bold text-xs cursor-pointer transition-all flex items-center gap-1.5 border ${
              theme === 'deep-green'
                ? 'bg-emerald-950/80 hover:bg-emerald-900 text-emerald-200 border-emerald-700/60'
                : 'bg-cyan-950/80 hover:bg-cyan-900 text-cyan-200 border-cyan-700/60'
            }`}
          >
            <Home className="w-3.5 h-3.5 text-amber-400" />
            <span>返回大厅</span>
          </button>
          <div className="hidden sm:flex text-[11px] text-emerald-200/80 items-center gap-1">
            <span>📢 下一局由【{gameState.players[gameState.winnerIndex ?? 0]?.name}】优先领牌首出！</span>
          </div>
        </div>

        {/* Big, High-Contrast Action Button - Always reachable */}
        <button
          onClick={onStartNewGame}
          className="px-6 py-2.5 sm:py-3 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-500 hover:brightness-110 text-slate-950 font-black text-xs sm:text-sm md:text-base shadow-xl shadow-emerald-500/30 cursor-pointer transition-all active:scale-95 flex items-center gap-2"
        >
          <Play className="w-4 h-4 fill-current text-slate-950" />
          <span>▶️ 继续下一局 (第 {gameState.roundNumber + 1} 局)</span>
        </button>
      </div>
    </div>
  );
};

export const MatchSettlementModal: React.FC<SettlementModalProps> = ({
  gameState,
  theme,
  onBackToLobby,
  onStartNewGame,
  onStartNewMatch,
}) => {
  const matchSettlements = calculateMatchSettlement(
    gameState.players,
    gameState.room.baseScore
  );

  // Sort to find champion
  const sortedIndices = [...gameState.players.keys()].sort((a, b) => {
    const stA = matchSettlements[a]?.coinChange || 0;
    const stB = matchSettlements[b]?.coinChange || 0;
    return stB - stA;
  });

  return (
    <div
      className={`absolute inset-0 z-50 flex flex-col justify-between p-2 sm:p-3 md:p-4 text-white select-none overflow-hidden animate-in fade-in zoom-in-98 duration-200 transition-colors duration-300 ${
        theme === 'deep-green'
          ? 'bg-gradient-to-b from-[#0a2318] via-[#0e3b29] to-[#041910]'
          : 'bg-gradient-to-b from-[#082030] via-[#0d3650] to-[#041624]'
      }`}
    >
      {/* Top Header Bar */}
      <div className="flex items-center justify-between border-b border-amber-600/40 pb-2 px-1 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-amber-400 to-yellow-200 flex items-center justify-center text-slate-950 shadow-lg shadow-amber-500/30">
            <Trophy className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm sm:text-base md:text-lg font-black text-white tracking-wide">
                🏆 第 <span className="text-amber-300">{gameState.matchNumber || 1}</span> 场终局大结算 (四舍五入到十位)
              </h2>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold">
                满 100 张触发
              </span>
            </div>
            <div className="text-[10px] sm:text-xs text-amber-300/90 font-medium">
              采用正宗 <span className="text-white font-black underline">四舍五入法 (如 84➔80, 85➔90)</span> 两两对减公平结算！
            </div>
          </div>
        </div>

        <div className="text-[11px] text-amber-400 font-mono font-bold bg-amber-950/60 border border-amber-500/40 rounded-xl px-3 py-1">
          底分: {gameState.room.baseScore.toLocaleString()} 积分/分
        </div>
      </div>

      {/* 4 Players Final Match Settlement Table Grid */}
      <div className="flex-1 flex items-center justify-center min-h-0 py-2">
        <div className="grid grid-cols-4 gap-2 sm:gap-3 w-full max-w-6xl h-full items-stretch">
          {gameState.players.map((p, idx) => {
            const st = matchSettlements[idx];
            const rankIndex = sortedIndices.indexOf(idx);
            const rankMedals = ['🥇 冠军', '🥈 亚军', '🥉 季军', '🎖️ 殿军'];
            const isChampion = rankIndex === 0;
            const isHuman = idx === 0;

            return (
              <div
                key={p.id}
                className={`rounded-2xl border p-2.5 sm:p-3 flex flex-col justify-between relative transition-all shadow-xl overflow-hidden ${
                  isChampion
                    ? 'bg-gradient-to-b from-amber-950/80 via-slate-900 to-slate-950 border-amber-400/90 ring-2 ring-amber-400/40'
                    : st.coinChange > 0
                    ? 'bg-gradient-to-b from-emerald-950/40 to-slate-900 border-emerald-500/50'
                    : 'bg-slate-900/90 border-slate-800'
                }`}
              >
                {/* Top Rank Badge */}
                <div className="flex items-center justify-between pb-1.5 border-b border-slate-800/60 shrink-0">
                  <div className="flex items-center gap-1.5 truncate">
                    <span className="text-base sm:text-lg">{p.avatar}</span>
                    <div className="truncate">
                      <div className="font-black text-xs text-white truncate flex items-center gap-1">
                        <span>{p.name}</span>
                        {isHuman && (
                          <span className="text-[9px] px-1 py-0.2 rounded bg-emerald-500/30 text-emerald-300 font-bold">
                            你
                          </span>
                        )}
                      </div>
                      <div className="text-[9px] text-slate-400 font-mono">
                        {['南家', '东家', '北家', '西家'][idx]}
                      </div>
                    </div>
                  </div>

                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-black shadow shrink-0 ${
                      isChampion
                        ? 'bg-gradient-to-r from-amber-400 to-yellow-300 text-slate-950'
                        : rankIndex === 1
                        ? 'bg-slate-300 text-slate-950'
                        : 'bg-slate-800 text-slate-300'
                    }`}
                  >
                    {rankMedals[rankIndex]}
                  </span>
                </div>

                {/* Middle: Coin Delta & Rounded Calculation */}
                <div className="my-auto py-2 text-center flex flex-col items-center justify-center gap-1">
                  <div className="text-[10px] text-slate-400 font-mono">
                    累计: <span className="text-amber-300 font-bold">{st.accumulatedCards}张</span> ➔ 四舍五入: <strong className="text-white font-black">{st.roundedCards}张</strong>
                  </div>

                  <div
                    className={`text-base sm:text-lg md:text-xl font-mono font-black ${
                      st.coinChange > 0
                        ? 'text-emerald-400'
                        : st.coinChange < 0
                        ? 'text-rose-400'
                        : 'text-amber-300'
                    }`}
                  >
                    {st.coinChange > 0 ? `+${st.coinChange.toLocaleString()}` : st.coinChange.toLocaleString()} 积分
                  </div>

                  <div className="text-[9px] text-slate-400 font-mono bg-black/40 border border-slate-800 rounded-lg px-2 py-1 w-full truncate">
                    公式: <code className="text-amber-300 font-bold">{st.formulaDesc}</code>
                  </div>
                </div>

                {/* Bottom Balance */}
                <div className="pt-1.5 border-t border-slate-800/60 shrink-0 flex justify-between items-center text-[10px]">
                  <span className="text-slate-400 font-mono">结余积分:</span>
                  <span className="font-mono font-black text-amber-300">
                    {st.finalScore.toLocaleString()}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Bottom Action Bar */}
      <div className="flex items-center justify-between pt-2 border-t border-amber-900/60 px-1 gap-2 shrink-0">
        <button
          onClick={onBackToLobby}
          className="px-3 py-2 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-slate-200 font-bold text-xs cursor-pointer transition-all flex items-center gap-1.5 border border-slate-700"
        >
          <Home className="w-3.5 h-3.5 text-slate-400" />
          <span>返回大厅</span>
        </button>

        <button
          onClick={onStartNewMatch || onStartNewGame}
          className="px-6 py-2.5 sm:py-3 rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-500 hover:brightness-110 text-slate-950 font-black text-xs sm:text-sm md:text-base shadow-xl shadow-amber-500/40 cursor-pointer transition-all active:scale-95 flex items-center gap-2"
        >
          <Trophy className="w-4 h-4 text-slate-950" />
          <span>🏆 开始新一场 (重置从♦2首出)</span>
        </button>
      </div>
    </div>
  );
};

export const YansanSettlementModal: React.FC<SettlementModalProps> = ({
  gameState,
  theme,
  onBackToLobby,
  onStartNewGame,
}) => {
  const result = gameState.yansanResult;
  const finishOrder = result?.finishOrder || [0, 1, 2, 3];
  const pointsMap = result?.pointsMap || {};
  const coinChanges = result?.coinChanges || {};
  const isSolo = !!result?.isSolo;
  const soloIdx = result?.soloPlayerIndex;
  const spadeTeam = result?.spadeTeam || [];
  const civilianTeam = result?.civilianTeam || [];

  return (
    <div
      className={`absolute inset-0 z-50 flex flex-col justify-between p-2 sm:p-3 md:p-4 text-white select-none overflow-hidden animate-in fade-in zoom-in-98 duration-200 transition-colors duration-300 ${
        theme === 'deep-green'
          ? 'bg-gradient-to-b from-[#114732] via-[#165a3f] to-[#0e3b29]'
          : 'bg-gradient-to-b from-[#12476b] via-[#165680] to-[#0e3855]'
      }`}
    >
      {/* Top Header Bar */}
      <div className="flex items-center justify-between border-b border-amber-500/40 pb-2 px-1 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-slate-950 shadow-md">
            <Crown className="w-5 h-5 text-slate-950" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm sm:text-base md:text-lg font-black text-white tracking-wide">
                🔥 烟三找朋友 · 第 <span className="text-amber-300">{gameState.roundNumber}</span> 局对局结果
              </h2>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold">
                {result?.title || '对局结算'}
              </span>
            </div>
            <div className="text-[10px] sm:text-xs text-amber-200/90 font-medium">
              ♠️ 黑桃3 与 ♠️ 黑桃A 结为盟友朋友！按手牌打完名次精准结算输赢！
            </div>
          </div>
        </div>

        {/* Room Base Score */}
        <div className="bg-black/60 border border-amber-500/40 rounded-2xl px-3 py-1 text-right flex items-center gap-2">
          <div className="text-right">
            <div className="text-[10px] text-slate-300 leading-tight">底分基数</div>
            <div className="text-xs sm:text-sm font-black text-amber-300">
              {gameState.room.baseScore.toLocaleString()} 积分/分
            </div>
          </div>
        </div>
      </div>

      {/* Outcome Banner */}
      <div className="px-1 py-1.5 shrink-0">
        <div className="w-full bg-black/50 border border-amber-400/50 rounded-xl px-3 py-1.5 flex items-center justify-between shadow-md">
          <div className="flex items-center gap-2 text-xs sm:text-sm font-bold text-amber-200">
            <Sparkles className="w-4 h-4 text-amber-400 animate-spin shrink-0" />
            <span>{result?.description || '本局胜负已决！'}</span>
          </div>
          <div className="text-[11px] font-mono font-bold text-white/80 shrink-0">
            走牌次序: {finishOrder.map(idx => (idx + 1)).join(' ➔ ')}
          </div>
        </div>
      </div>

      {/* 4 Players Horizontal Settlement Cards Grid */}
      <div className="flex-1 flex items-center justify-center min-h-0 py-1">
        <div className="grid grid-cols-4 gap-2 sm:gap-3 w-full max-w-6xl h-full items-stretch">
          {gameState.players.map((p, idx) => {
            const rankPosition = finishOrder.indexOf(idx); // 0=第1名, 1=第2名, 2=第3名, 3=第4名
            const rankMedals = ['🥇 头游第1名', '🥈 二游第2名', '🥉 三游第3名', '🎖️ 垫底第4名'];
            const rankLabel = rankPosition >= 0 ? rankMedals[rankPosition] : '未出完';

            const points = pointsMap[idx] || 0;
            const coins = coinChanges[idx] || 0;
            const isHuman = idx === 0;

            // 阵营划分
            let teamLabel = '🛡️ 平民联盟';
            let teamColor = 'bg-blue-500/20 text-blue-200 border-blue-400/40';
            if (isSolo) {
              if (idx === soloIdx) {
                teamLabel = '🔥 独保 (1打3)';
                teamColor = 'bg-orange-500/30 text-amber-300 border-orange-400/70 font-black';
              }
            } else {
              if (spadeTeam.includes(idx)) {
                const hasA = p.cards.some(c => c.id === 'spade-A') || friendshipHasCard(gameState, idx, 'spade-A');
                teamLabel = hasA ? '♠️ 黑桃盟友 (持♠A)' : '♠️ 黑桃盟友 (持♠3)';
                teamColor = 'bg-amber-500/30 text-amber-300 border-amber-400/70 font-black';
              }
            }

            return (
              <div
                key={p.id}
                className={`rounded-2xl border p-2.5 sm:p-3 flex flex-col justify-between relative transition-all shadow-xl overflow-hidden ${
                  points > 0
                    ? 'bg-gradient-to-b from-amber-900/60 via-[#185e42] to-[#0f402c] border-amber-400/90 ring-2 ring-amber-400/40'
                    : points < 0
                    ? 'bg-gradient-to-b from-rose-950/40 to-slate-900 border-red-500/50'
                    : theme === 'deep-green'
                    ? 'bg-[#145339]/90 border-emerald-500/50'
                    : 'bg-[#144f75]/90 border-cyan-500/50'
                }`}
              >
                {/* Top Rank / Seat Indicator */}
                <div className="flex items-center justify-between pb-1.5 border-b border-emerald-900/50 shrink-0">
                  <div className="flex items-center gap-1.5 truncate">
                    <span className="text-base sm:text-lg">{p.avatar}</span>
                    <div className="truncate">
                      <div className="font-black text-xs text-white truncate flex items-center gap-1">
                        <span>{p.name}</span>
                        {isHuman && (
                          <span className="text-[9px] px-1 py-0.2 rounded bg-emerald-500/30 text-emerald-300 font-bold">
                            你
                          </span>
                        )}
                      </div>
                      <div className="text-[9px] text-emerald-200/70 font-mono">
                        {['南家', '东家', '北家', '西家'][idx]}
                      </div>
                    </div>
                  </div>

                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-black shadow shrink-0 ${
                      rankPosition === 0
                        ? 'bg-gradient-to-r from-amber-400 to-yellow-300 text-slate-950'
                        : rankPosition === 1
                        ? 'bg-slate-200 text-slate-950'
                        : rankPosition === 2
                        ? 'bg-amber-700 text-white'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {rankLabel}
                  </span>
                </div>

                {/* Team Badge */}
                <div className="mt-1.5 mb-1 flex justify-center">
                  <span className={`text-[10px] px-2.5 py-0.5 rounded-full border ${teamColor}`}>
                    {teamLabel}
                  </span>
                </div>

                {/* Middle Card: Score and Points */}
                <div className="my-auto py-2 text-center flex flex-col items-center justify-center gap-1">
                  <div className="text-xs text-slate-200 font-bold">
                    胜负得分:{' '}
                    <span
                      className={`text-base sm:text-lg font-black font-mono ${
                        points > 0 ? 'text-amber-300' : points < 0 ? 'text-rose-400' : 'text-slate-300'
                      }`}
                    >
                      {points > 0 ? `+${points}` : points} 分
                    </span>
                  </div>

                  <div
                    className={`text-sm sm:text-base font-mono font-black ${
                      coins > 0 ? 'text-emerald-400' : coins < 0 ? 'text-rose-400' : 'text-slate-300'
                    }`}
                  >
                    {coins > 0 ? `+${coins.toLocaleString()}` : coins.toLocaleString()} 积分
                  </div>
                </div>

                {/* Bottom Balance */}
                <div className="pt-1.5 border-t border-emerald-900/50 shrink-0 flex justify-between items-center text-[10px]">
                  <span className="text-slate-400 font-mono">结余积分:</span>
                  <span className="font-mono font-black text-amber-300">
                    {p.score.toLocaleString()}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Bottom Action Bar */}
      <div className="flex items-center justify-between pt-2 border-t border-amber-500/30 px-1 gap-2 shrink-0">
        <button
          onClick={onBackToLobby}
          className={`px-3 py-2 rounded-xl font-bold text-xs cursor-pointer transition-all flex items-center gap-1.5 border ${
            theme === 'deep-green'
              ? 'bg-emerald-950/80 hover:bg-emerald-900 text-emerald-200 border-emerald-700/60'
              : 'bg-cyan-950/80 hover:bg-cyan-900 text-cyan-200 border-cyan-700/60'
          }`}
        >
          <Home className="w-3.5 h-3.5 text-amber-400" />
          <span>返回大厅</span>
        </button>

        <button
          onClick={onStartNewGame}
          className="px-6 py-2.5 sm:py-3 rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-500 hover:brightness-110 text-slate-950 font-black text-xs sm:text-sm md:text-base shadow-xl shadow-amber-500/30 cursor-pointer transition-all active:scale-95 flex items-center gap-2"
        >
          <Play className="w-4 h-4 fill-current text-slate-950" />
          <span>▶️ 继续下一局 (方块4首出)</span>
        </button>
      </div>
    </div>
  );
};

// 辅助检测某玩家初始是否持有某张黑桃牌
function friendshipHasCard(gameState: GameState, playerIdx: number, cardId: string): boolean {
  if (gameState.yansanFriendship) {
    if (cardId === 'spade-A') return gameState.yansanFriendship.spadeAHolderIndex === playerIdx;
    if (cardId === 'spade-3') return gameState.yansanFriendship.spade3HolderIndex === playerIdx;
  }
  return false;
}
