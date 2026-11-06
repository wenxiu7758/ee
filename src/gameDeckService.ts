/**
 * Authoritative Server Game Deck & Wall Dealing Service
 * 
 * 核心保证：
 * 真实玩家进入相同场景/房间对局时，全员手牌与牌墙绝对 100% 出自同一副牌/同一牌池！
 * 1. 经典烟三 (Yansan)：权威 52 张单副扑克 (无大小王)，四位玩家各分 13 张，♦4首出，♠3与♠A暗盟
 * 2. 水镜十三水 (Shisanshui)：4人场标准 52 张扑克各 13 张；8人场两副扑克 104 张全发各 13 张
 * 3. 经典国标麻将 (Mahjong)：权威 136 张麻将牌墙，庄家抓 14 张，三家闲家各 13 张，牌墙余 83 张
 */

export interface YansanServerCard {
  id: string;
  rank: number; // 3..15 (15=2, 14=A, 13=K... 3=3)
  suitVal: number; // 4=♠, 3=♥, 2=♣, 1=♦
  label: string;
  suit: '♠' | '♥' | '♣' | '♦';
  isRed: boolean;
}

export interface YansanRoomDeal {
  gameType: 'yansan';
  dealId: string;
  deck: YansanServerCard[];
  seatCards: Record<number, YansanServerCard[]>;
  starterSeat: number; // 持有方块4首出的席位 (0..3)
  spade3Seat?: number;  // 持有黑桃3的席位 (0..3)
  spadeASeat?: number;  // 持有黑桃A的席位 (0..3)
  createdAt: number;
}

export interface SSSServerCard {
  id: string;
  rank: number; // 2..14 (14=A)
  suitVal: number; // 4=♠, 3=♥, 2=♣, 1=♦
  label: string;
  suit: '♠' | '♥' | '♣' | '♦';
  isRed: boolean;
}

export interface ShisanshuiRoomDeal {
  gameType: 'shisanshui';
  sceneMode: string;
  dealId: string;
  deckCount: number;
  deck: SSSServerCard[];
  seatCards: Record<number, SSSServerCard[]>;
  createdAt: number;
}

export interface MahjongServerTile {
  id: string;
  type: 'wan' | 'tiao' | 'tong' | 'zi';
  value: number; // 1..9 for wan/tiao/tong, 1..7 for zi (1=东,2=南,3=西,4=北,5=中,6=发,7=白)
  text: string;
  color?: string;
  isRedDragon?: boolean;
}

export interface MahjongRoomDeal {
  gameType: 'mahjong';
  sceneMode: string;
  dealId: string;
  dealerSeat: number; // 庄家席位 (0..3)
  dice: { d1: number; d2: number; sum: number };
  seatCards: Record<number, MahjongServerTile[]>;
  remainingWall: MahjongServerTile[];
  wallCount: number;
  createdAt: number;
}

export type AnyRoomDeal = YansanRoomDeal | ShisanshuiRoomDeal | MahjongRoomDeal;

// ==========================================
// 1. 烟三 (Yansan) 权威 52 张单副扑克发牌
// ==========================================
const YANSAN_SUITS: { suit: '♠' | '♥' | '♣' | '♦'; suitVal: number; isRed: boolean }[] = [
  { suit: '♠', suitVal: 4, isRed: false },
  { suit: '♥', suitVal: 3, isRed: true },
  { suit: '♣', suitVal: 2, isRed: false },
  { suit: '♦', suitVal: 1, isRed: true },
];

const YANSAN_RANKS = [
  { rank: 3, label: '3' }, { rank: 4, label: '4' }, { rank: 5, label: '5' },
  { rank: 6, label: '6' }, { rank: 7, label: '7' }, { rank: 8, label: '8' },
  { rank: 9, label: '9' }, { rank: 10, label: '10' }, { rank: 11, label: 'J' },
  { rank: 12, label: 'Q' }, { rank: 13, label: 'K' }, { rank: 14, label: 'A' },
  { rank: 15, label: '2' },
];

function getYansanRankWeight(rank: number): number {
  if (rank === 3) return 13;
  if (rank === 15) return 12; // 2
  if (rank === 14) return 11; // A
  if (rank === 13) return 10; // K
  if (rank === 12) return 9;  // Q
  if (rank === 11) return 8;  // J
  if (rank === 10) return 7;  // 10
  if (rank === 9) return 6;   // 9
  if (rank === 8) return 5;   // 8
  if (rank === 7) return 4;   // 7
  if (rank === 6) return 3;   // 6
  if (rank === 5) return 2;   // 5
  if (rank === 4) return 1;   // 4
  return 0;
}

function getYansanCardPower(c: YansanServerCard): number {
  return getYansanRankWeight(c.rank) * 10 + c.suitVal;
}

function sortYansanCards(cards: YansanServerCard[]): YansanServerCard[] {
  return [...cards].sort((a, b) => getYansanCardPower(b) - getYansanCardPower(a));
}

export function createYansanDeal(): YansanRoomDeal {
  const dealId = `ys-deal-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
  const pool: YansanServerCard[] = [];

  for (const r of YANSAN_RANKS) {
    for (const s of YANSAN_SUITS) {
      pool.push({
        id: `${r.label}-${s.suit}`,
        rank: r.rank,
        suitVal: s.suitVal,
        label: r.label,
        suit: s.suit,
        isRed: s.isRed,
      });
    }
  }

  // Fisher-Yates 洗牌
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }

  // 四席各分13张牌，严格保证出自同一副牌，零重复
  const seatCards: Record<number, YansanServerCard[]> = {
    0: sortYansanCards(pool.slice(0, 13)),
    1: sortYansanCards(pool.slice(13, 26)),
    2: sortYansanCards(pool.slice(26, 39)),
    3: sortYansanCards(pool.slice(39, 52)),
  };

  let starterSeat = 0;

  for (let s = 0; s < 4; s++) {
    const h = seatCards[s];
    if (h.some((c) => c.rank === 4 && c.suit === '♦')) {
      starterSeat = s;
    }
  }

  return {
    gameType: 'yansan',
    dealId,
    deck: pool,
    seatCards,
    starterSeat,
    createdAt: Date.now(),
  };
}

// ==========================================
// 2. 十三水 (Shisanshui) 权威 52张/104张 发牌
// ==========================================
const SSS_SUITS: { suit: '♠' | '♥' | '♣' | '♦'; suitVal: number; isRed: boolean }[] = [
  { suit: '♠', suitVal: 4, isRed: false },
  { suit: '♥', suitVal: 3, isRed: true },
  { suit: '♣', suitVal: 2, isRed: false },
  { suit: '♦', suitVal: 1, isRed: true },
];

const SSS_RANKS = [
  { rank: 2, label: '2' }, { rank: 3, label: '3' }, { rank: 4, label: '4' },
  { rank: 5, label: '5' }, { rank: 6, label: '6' }, { rank: 7, label: '7' },
  { rank: 8, label: '8' }, { rank: 9, label: '9' }, { rank: 10, label: '10' },
  { rank: 11, label: 'J' }, { rank: 12, label: 'Q' }, { rank: 13, label: 'K' },
  { rank: 14, label: 'A' },
];

export function createShisanshuiDeal(sceneMode: string): ShisanshuiRoomDeal {
  const isEight = sceneMode === 'eight-realtime' || sceneMode === 'eight-booking';
  const deckCount = isEight ? 2 : 1;
  const playerCount = isEight ? 8 : 4;
  const dealId = `sss-deal-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

  const pool: SSSServerCard[] = [];
  for (let d = 0; d < deckCount; d++) {
    for (const r of SSS_RANKS) {
      for (const s of SSS_SUITS) {
        pool.push({
          id: `${r.label}-${s.suit}-${d}`,
          rank: r.rank,
          suitVal: s.suitVal,
          label: r.label,
          suit: s.suit,
          isRed: s.isRed,
        });
      }
    }
  }

  // Fisher-Yates 洗牌
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }

  const seatCards: Record<number, SSSServerCard[]> = {};
  for (let p = 0; p < playerCount; p++) {
    const hand = pool.slice(p * 13, (p + 1) * 13);
    hand.sort((a, b) => b.rank - a.rank || b.suitVal - a.suitVal);
    seatCards[p] = hand;
  }

  return {
    gameType: 'shisanshui',
    sceneMode,
    dealId,
    deckCount,
    deck: pool,
    seatCards,
    createdAt: Date.now(),
  };
}

// ==========================================
// 3. 国标麻将 (Mahjong) 权威 136张牌墙 发牌
// ==========================================
const MAHJONG_TYPES: Array<'wan' | 'tiao' | 'tong'> = ['wan', 'tiao', 'tong'];
const MAHJONG_NUM_NAMES = ['', '一', '二', '三', '四', '五', '六', '七', '八', '九'];
const MAHJONG_TYPE_NAMES: Record<string, string> = { wan: '万', tiao: '条', tong: '筒' };
const MAHJONG_ZI_NAMES = ['', '东风', '南风', '西风', '北风', '红中', '发财', '白板'];

export function createMahjongDeal(sceneMode: string, customDealerSeat?: number): MahjongRoomDeal {
  const dealId = `mj-deal-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
  const pool: MahjongServerTile[] = [];

  // 1. 万、条、筒 各 1..9 (各4张 = 108张)
  for (const t of MAHJONG_TYPES) {
    for (let v = 1; v <= 9; v++) {
      for (let k = 0; k < 4; k++) {
        pool.push({
          id: `${t}-${v}-${k}`,
          type: t,
          value: v,
          text: `${MAHJONG_NUM_NAMES[v]}${MAHJONG_TYPE_NAMES[t]}`,
        });
      }
    }
  }

  // 2. 字牌 1..7 (东、南、西、北、中、发、白，各4张 = 28张)
  for (let v = 1; v <= 7; v++) {
    for (let k = 0; k < 4; k++) {
      pool.push({
        id: `zi-${v}-${k}`,
        type: 'zi',
        value: v,
        text: MAHJONG_ZI_NAMES[v],
        isRedDragon: v === 5,
      });
    }
  }

  // 108 + 28 = 136 张标准国标麻将牌
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }

  // 庄家掷双色子定开门与抓牌 (d1: 1..6, d2: 1..6)
  const d1 = Math.floor(1 + Math.random() * 6);
  const d2 = Math.floor(1 + Math.random() * 6);
  const dealerSeat = typeof customDealerSeat === 'number' ? customDealerSeat : 0;

  // 庄家抓 14 张，其余 3 席各抓 13 张 (共 53 张)
  const seatCards: Record<number, MahjongServerTile[]> = {};
  if (dealerSeat === 0) {
    seatCards[0] = pool.slice(0, 14);
    seatCards[1] = pool.slice(14, 27);
    seatCards[2] = pool.slice(27, 40);
    seatCards[3] = pool.slice(40, 53);
  } else if (dealerSeat === 1) {
    seatCards[0] = pool.slice(0, 13);
    seatCards[1] = pool.slice(13, 27);
    seatCards[2] = pool.slice(27, 40);
    seatCards[3] = pool.slice(40, 53);
  } else if (dealerSeat === 2) {
    seatCards[0] = pool.slice(0, 13);
    seatCards[1] = pool.slice(13, 26);
    seatCards[2] = pool.slice(26, 40);
    seatCards[3] = pool.slice(40, 53);
  } else {
    seatCards[0] = pool.slice(0, 13);
    seatCards[1] = pool.slice(13, 26);
    seatCards[2] = pool.slice(26, 39);
    seatCards[3] = pool.slice(39, 53);
  }

  const remainingWall = pool.slice(53); // 136 - 53 = 83 张

  return {
    gameType: 'mahjong',
    sceneMode,
    dealId,
    dealerSeat,
    dice: { d1, d2, sum: d1 + d2 },
    seatCards,
    remainingWall,
    wallCount: remainingWall.length,
    createdAt: Date.now(),
  };
}

// ==========================================
// 4. 统一调度入口
// ==========================================
export function generateRoomDeal(gameType: string, sceneMode: string, maxPlayers?: number): AnyRoomDeal {
  if (gameType === 'mahjong') {
    return createMahjongDeal(sceneMode);
  }
  if (gameType === 'shisanshui') {
    return createShisanshuiDeal(sceneMode);
  }
  // 默认经典烟三
  return createYansanDeal();
}
