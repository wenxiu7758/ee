/**
 * 锄大地 (Big Two / Big 2) types and definitions
 */

export type Suit = 'spade' | 'heart' | 'club' | 'diamond';

export interface Card {
  id: string;          // e.g. "spade-2", "diamond-3"
  suit: Suit;
  rank: string;        // "3".."10", "J", "Q", "K", "A", "2"
  displayRank: string; // "3", "10", "J", "Q", "K", "A", "2"
  rankValue: number;   // 3..15 (3=3, ..., A=14, 2=15)
  suitValue: number;   // diamond=1, club=2, heart=3, spade=4
  totalValue: number;  // rankValue * 10 + suitValue
  color: 'red' | 'black';
}

export type HandType =
  | 'PASS'
  | 'SINGLE'          // 单张
  | 'PAIR'            // 对子
  | 'TRIPLE'          // 三条
  | 'STRAIGHT'        // 顺子 (五张)
  | 'FLUSH'           // 同花 (五张)
  | 'FULL_HOUSE'      // 葫芦 (三带二)
  | 'FOUR_OF_A_KIND'  // 铁支 (四带一)
  | 'STRAIGHT_FLUSH'; // 同花顺 (五张)

export interface CardHand {
  type: HandType;
  cards: Card[];
  categoryWeight: number; // 1 for single/pair/triple, 10=Straight, 20=Flush, 30=FullHouse, 40=FourOfAKind, 50=StraightFlush
  primaryValue: number;   // Used for comparing hands of the same type/category
  suitValue: number;      // Used for comparing suits
}

export interface Player {
  id: string;
  name: string;
  cards: Card[];
  isAI: boolean;
  score: number;       // 金币 / 积分
  avatar: string;
  position: 'bottom' | 'left' | 'top' | 'right'; // 4 玩家方位
  accumulatedCards: number; // 累计剩牌张数 (整场累加，满100张大结算)
  rankTitle?: string;
  lastActionText?: string;
}

export type GamePhase =
  | 'LOBBY'             // 游戏大厅
  | 'DEALING'           // 洗牌发牌
  | 'PLAYING'           // 出牌对战
  | 'ROUND_SUMMARY'     // 局小结 (打完一局累加剩牌张数)
  | 'MATCH_SETTLEMENT'  // 场大结算 (满100张四舍五入大结算)
  | 'YANSAN_SETTLEMENT' // 烟三找朋友专属大结算
  | 'GAME_OVER';        // 结算

export type GameType = 'chudadi' | 'yansan';

export interface RoomConfig {
  id: string;
  name: string;
  tag: string;
  baseScore: number;     // 底分
  entryMin: number;      // 准入豆数
  maxMultiplier: number; // 封顶倍数
  colorTheme: string;
  badge: string;
  mode: 'classic' | 'express' | 'master'; // 经典场 / 快速场 / 雀圣至尊场
  gameType?: GameType;   // 'chudadi' | 'yansan'
  subTier?: '5-10' | '10-20' | '20-40';   // 烟三的三种场次
}

export interface UserProfile {
  nickname: string;
  avatar: string;
  coins: number;         // 锄大地金币
  diamonds: number;      // 钻石
  wins: number;
  losses: number;
  title: string;
  lastCheckinDate?: string;
  hasCheckedInToday?: boolean;
}

export interface PlayHistoryItem {
  playerId: string;
  playerName: string;
  isAI: boolean;
  action: 'PLAY' | 'PASS';
  hand?: CardHand;
  timestamp: number;
}

export interface YansanFriendship {
  hasDualSpadeHolder: boolean; // 是否独保 (同一玩家持有黑桃A与黑桃3)
  spadeAHolderIndex: number;   // 黑桃A持有者玩家索引 (0..3)
  spade3HolderIndex: number;   // 黑桃3持有者玩家索引 (0..3)
  spadeAPlayed: boolean;       // 黑桃A是否已打出
  spade3Played: boolean;       // 黑桃3是否已打出
  spadeTeamIndexes: number[];  // 黑桃盟友队索引 (例如 [0, 2] 或 [1])
  civilianTeamIndexes: number[]; // 平民队索引 (例如 [1, 3] 或 [0, 2, 3])
}

export type YansanOutcomeType =
  | 'SPADE_FULL_WIN'    // 黑桃队全胜 (1324/3124/1342/3142: 1和3各+10分, 2和4各-10分)
  | 'SPADE_HALF_WIN'    // 黑桃队半胜 (1234/3214/1432/3412: 1和3各+5分, 2和4各-5分)
  | 'CIVILIAN_FULL_WIN' // 平民队全胜 (2413/2431/4213/4231: 2和4各+10分, 1和3各-10分)
  | 'CIVILIAN_HALF_WIN' // 平民队半胜 (2341/4321/2143/4123: 2和4各+5分, 1和3各-5分)
  | 'DRAW'              // 打和 (1423/1243/3421/3241/2134/2314/4132/4312: 各0分)
  | 'SOLO_FULL_WIN'     // 独保全胜 (独保第1个打完: +30分, 其余各-10分)
  | 'SOLO_HALF_WIN'     // 独保半胜 (独保第2个打完: +15分, 其余各-5分)
  | 'SOLO_HALF_LOSS'    // 独保半输 (独保第3个打完: -15分, 其余各+5分)
  | 'SOLO_FULL_LOSS';   // 独保全输 (其余3人先打完: -30分, 其余各+10分)

export interface YansanGameResult {
  outcome: YansanOutcomeType;
  title: string;
  description: string;
  finishOrder: number[]; // 出完手牌顺序 (玩家索引 0..3)
  pointsMap: Record<number, number>; // 各玩家点数得分 (如 10, -10, 5, 0, 30...)
  coinChanges: Record<number, number>; // 各玩家金币/积分变动
  isSolo: boolean;
  soloPlayerIndex?: number;
  spadeTeam: number[];
  civilianTeam: number[];
}

export interface GameState {
  phase: GamePhase;
  room: RoomConfig;
  players: Player[];           // 4 玩家
  currentPlayerIndex: number;  // 当前出牌玩家 (0, 1, 2, 3)
  starterCardId: string;       // 首出必备牌 (如第1局为 "diamond-2"，之后为上一局赢家)
  isFirstTrick: boolean;       // 是否是该局首出
  lastValidHand: {
    playerId: string;
    hand: CardHand;
  } | null;
  passCount: number;           // 连续 Pass 计数
  trickLeaderIndex: number;    // 当前轮领牌玩家
  history: PlayHistoryItem[];
  winnerIndex: number | null;  // 本局胜利玩家 (首个跑完或主要赢家)
  lastRoundWinnerIndex: number | null; // 上局胜利玩家
  matchNumber: number;         // 第几场
  roundNumber: number;         // 第几局
  multiplier: number;
  finishedRankOrder?: number[]; // 玩家出完手牌名次顺序 (例如 [0, 2])
  yansanFriendship?: YansanFriendship; // 烟三找朋友阵营数据
  yansanResult?: YansanGameResult | null; // 烟三专属游戏结果
}
