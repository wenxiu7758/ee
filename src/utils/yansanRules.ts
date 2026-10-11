/**
 * 烟三 (Yan San) 独立专属规则引擎
 * 
 * 核心规则定义：
 * 1. 点数大小：3 最大，然后是 2，然后是 A，然后是 K ... 最小是 4
 *    点数序列：3 > 2 > A > K > Q > J > 10 > 9 > 8 > 7 > 6 > 5 > 4
 *    数值映射：4(4) < 5(5) < ... < K(13) < A(14) < 2(15) < 3(16)
 * 2. 花色大小：黑桃 ♠(4) > 红桃 ♥(3) > 草花 ♣(2) > 方块 ♦(1)
 * 3. 首出规则：每局都是持有【方块 4 (♦4)】先出！且首出牌型中必须包含♦4！
 * 4. 牌型与锄大地一致：单张、对子、三条、顺子、同花、俘虏(三带二)、四带一、同花顺
 * 5. 顺子规则：
 *    - 烟三中 4 是最小，3 是最大
 *    - 顺子连续 5 张，如 4-5-6-7-8, 5-6-7-8-9, ..., 10-J-Q-K-A, J-Q-K-A-2, Q-K-A-2-3 (以3结尾最大顺子)
 */

import { Card, CardHand, HandType, Suit } from '../types/game';

export const YANSAN_SUIT_SYMBOLS: Record<Suit, string> = {
  spade: '♠',
  heart: '♥',
  club: '♣',
  diamond: '♦',
};

export const YANSAN_SUIT_NAMES: Record<Suit, string> = {
  spade: '黑桃',
  heart: '红桃',
  club: '草花',
  diamond: '方块',
};

export const YANSAN_SUIT_VALUES: Record<Suit, number> = {
  diamond: 1,
  club: 2,
  heart: 3,
  spade: 4,
};

export const YANSAN_RANK_DISPLAY: Record<string, string> = {
  '4': '4',
  '5': '5',
  '6': '6',
  '7': '7',
  '8': '8',
  '9': '9',
  '10': '10',
  'J': 'J',
  'Q': 'Q',
  'K': 'K',
  'A': 'A',
  '2': '2',
  '3': '3',
};

// 烟三点数映射：3最大(16)，2第二大(15)，A第三大(14)，K(13)... 4最小(4)
export const YANSAN_RANK_VALUES: Record<string, number> = {
  '4': 4,
  '5': 5,
  '6': 6,
  '7': 7,
  '8': 8,
  '9': 9,
  '10': 10,
  'J': 11,
  'Q': 12,
  'K': 13,
  'A': 14,
  '2': 15,
  '3': 16,
};

// 创建烟三 52 张标准扑克牌
export function createYansanDeck(): Card[] {
  const suits: Suit[] = ['diamond', 'club', 'heart', 'spade'];
  const ranks = ['4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A', '2', '3'];
  const deck: Card[] = [];

  for (const suit of suits) {
    for (const rank of ranks) {
      const rankVal = YANSAN_RANK_VALUES[rank];
      const suitVal = YANSAN_SUIT_VALUES[suit];
      deck.push({
        id: `${suit}-${rank}`,
        suit,
        rank,
        displayRank: YANSAN_RANK_DISPLAY[rank],
        rankValue: rankVal,
        suitValue: suitVal,
        totalValue: rankVal * 10 + suitVal,
        color: suit === 'heart' || suit === 'diamond' ? 'red' : 'black',
      });
    }
  }

  return deck;
}

// 烟三排序
export function sortYansanCardsAsc(cards: Card[]): Card[] {
  return [...cards].sort((a, b) => a.totalValue - b.totalValue);
}

export function sortYansanCards(cards: Card[]): Card[] {
  return sortYansanCardsAsc(cards);
}

export function sortYansanCardsDesc(cards: Card[]): Card[] {
  return [...cards].sort((a, b) => b.totalValue - a.totalValue);
}

export function sortYansanCardsByRank(cards: Card[]): Card[] {
  return [...cards].sort((a, b) => {
    if (a.rankValue !== b.rankValue) {
      return a.rankValue - b.rankValue;
    }
    return a.suitValue - b.suitValue;
  });
}

export function sortYansanCardsByPattern(cards: Card[]): Card[] {
  const counts: Record<number, number> = {};
  for (const c of cards) {
    counts[c.rankValue] = (counts[c.rankValue] || 0) + 1;
  }

  return [...cards].sort((a, b) => {
    const countA = counts[a.rankValue] || 0;
    const countB = counts[b.rankValue] || 0;
    if (countB !== countA) return countB - countA;
    if (b.rankValue !== a.rankValue) return b.rankValue - a.rankValue;
    return b.suitValue - a.suitValue;
  });
}

export function sortYansanCardsBySuit(cards: Card[]): Card[] {
  return [...cards].sort((a, b) => {
    if (b.suitValue !== a.suitValue) return b.suitValue - a.suitValue;
    return b.rankValue - a.rankValue;
  });
}

// 顺子合法牌型定义 (共 9 组，A2345 最小至 9 10 J Q K 最大，不允许 10-J-Q-K-A 与 J-Q-K-A-2)
// 顺子以单张最大的顺子大：A2345 最大单张是 5，23456 最大单张是 6 ... 910JQK 最大单张是 K
export const YANSAN_VALID_STRAIGHT_PATTERNS: {
  ranks: string[];
  topRank: string;
  weight: number;
}[] = [
  { ranks: ['A', '2', '3', '4', '5'], topRank: '5', weight: 5 },
  { ranks: ['2', '3', '4', '5', '6'], topRank: '6', weight: 6 },
  { ranks: ['3', '4', '5', '6', '7'], topRank: '7', weight: 7 },
  { ranks: ['4', '5', '6', '7', '8'], topRank: '8', weight: 8 },
  { ranks: ['5', '6', '7', '8', '9'], topRank: '9', weight: 9 },
  { ranks: ['6', '7', '8', '9', '10'], topRank: '10', weight: 10 },
  { ranks: ['7', '8', '9', '10', 'J'], topRank: 'J', weight: 11 },
  { ranks: ['8', '9', '10', 'J', 'Q'], topRank: 'Q', weight: 12 },
  { ranks: ['9', '10', 'J', 'Q', 'K'], topRank: 'K', weight: 13 },
];

// 检查烟三顺子
export function checkYansanStraight(cards: Card[]): {
  isStraight: boolean;
  highestCard: Card | null;
  straightWeight: number;
} {
  if (cards.length !== 5) return { isStraight: false, highestCard: null, straightWeight: 0 };

  const cardRanks = cards.map(c => c.rank);
  // 检查是否恰好有 5 张不重复的点数
  const uniqueRanksSet = new Set(cardRanks);
  if (uniqueRanksSet.size !== 5) {
    return { isStraight: false, highestCard: null, straightWeight: 0 };
  }

  for (const pattern of YANSAN_VALID_STRAIGHT_PATTERNS) {
    const isMatch = pattern.ranks.every(r => uniqueRanksSet.has(r));
    if (isMatch) {
      // 找到该顺子中单张最大的一张牌
      const topCard = cards.find(c => c.rank === pattern.topRank) || cards[0];
      return {
        isStraight: true,
        highestCard: topCard,
        straightWeight: pattern.weight * 10,
      };
    }
  }

  return { isStraight: false, highestCard: null, straightWeight: 0 };
}

// 烟三牌型解析
export function analyzeYansanHand(cards: Card[]): CardHand | null {
  if (!cards || cards.length === 0) return null;

  const count = cards.length;
  const sorted = sortYansanCards(cards);

  // 1 张：单张
  if (count === 1) {
    return {
      type: 'SINGLE',
      cards: sorted,
      categoryWeight: 1,
      primaryValue: sorted[0].rankValue,
      suitValue: sorted[0].suitValue,
    };
  }

  // 2 张：对子
  if (count === 2) {
    if (sorted[0].rankValue === sorted[1].rankValue) {
      const maxSuit = Math.max(sorted[0].suitValue, sorted[1].suitValue);
      return {
        type: 'PAIR',
        cards: sorted,
        categoryWeight: 1,
        primaryValue: sorted[0].rankValue,
        suitValue: maxSuit,
      };
    }
    return null;
  }

  // 3 张：三条
  if (count === 3) {
    if (sorted[0].rankValue === sorted[1].rankValue && sorted[1].rankValue === sorted[2].rankValue) {
      const maxSuit = Math.max(sorted[0].suitValue, sorted[1].suitValue, sorted[2].suitValue);
      return {
        type: 'TRIPLE',
        cards: sorted,
        categoryWeight: 1,
        primaryValue: sorted[0].rankValue,
        suitValue: maxSuit,
      };
    }
    return null;
  }

  // 4 张：禁止出纯四张
  if (count === 4) return null;

  // 5 张牌型组合
  if (count === 5) {
    const rankCounts: Record<number, Card[]> = {};
    for (const c of sorted) {
      if (!rankCounts[c.rankValue]) rankCounts[c.rankValue] = [];
      rankCounts[c.rankValue].push(c);
    }

    const uniqueRanks = Object.keys(rankCounts).map(Number);
    const isFlush = sorted.every(c => c.suit === sorted[0].suit);
    const { isStraight, highestCard: straightHighest, straightWeight } = checkYansanStraight(sorted);

    // 1. 同花顺 (Straight Flush): 权重 50
    // 黑桃 > 红桃 > 草花 > 方块
    if (isFlush && isStraight && straightHighest) {
      const flushSuitVal = sorted[0].suitValue;
      return {
        type: 'STRAIGHT_FLUSH',
        cards: sorted,
        categoryWeight: 50,
        primaryValue: flushSuitVal * 1000 + straightWeight,
        suitValue: flushSuitVal,
      };
    }

    // 2. 四带一 (Four of a Kind): 权重 40
    if (uniqueRanks.length === 2) {
      for (const r of uniqueRanks) {
        if (rankCounts[r].length === 4) {
          const maxSuit = Math.max(...rankCounts[r].map(c => c.suitValue));
          return {
            type: 'FOUR_OF_A_KIND',
            cards: sorted,
            categoryWeight: 40,
            primaryValue: r,
            suitValue: maxSuit,
          };
        }
      }
    }

    // 3. 俘虏 (Full House / 三带二): 权重 30
    if (uniqueRanks.length === 2) {
      for (const r of uniqueRanks) {
        if (rankCounts[r].length === 3) {
          const maxSuit = Math.max(...rankCounts[r].map(c => c.suitValue));
          return {
            type: 'FULL_HOUSE',
            cards: sorted,
            categoryWeight: 30,
            primaryValue: r,
            suitValue: maxSuit,
          };
        }
      }
    }

    // 4. 同花 (Flush): 权重 20
    if (isFlush) {
      const highestCard = sorted.reduce((max, c) => (c.totalValue > max.totalValue ? c : max), sorted[0]);
      return {
        type: 'FLUSH',
        cards: sorted,
        categoryWeight: 20,
        primaryValue: highestCard.suitValue * 100 + highestCard.rankValue,
        suitValue: highestCard.suitValue,
      };
    }

    // 5. 顺子 (Straight): 权重 10
    if (isStraight && straightHighest) {
      return {
        type: 'STRAIGHT',
        cards: sorted,
        categoryWeight: 10,
        primaryValue: straightWeight,
        suitValue: straightHighest.suitValue,
      };
    }

    return null;
  }

  return null;
}

// 烟三压牌比较 (Can Beat)
export function canYansanBeat(prevHand: CardHand, candidateHand: CardHand): boolean {
  if (!prevHand || !candidateHand) return false;

  const prevCount = prevHand.cards.length;
  const candidateCount = candidateHand.cards.length;

  if (prevCount !== 5 || candidateCount !== 5) {
    if (prevCount !== candidateCount || prevHand.type !== candidateHand.type) {
      return false;
    }
    if (candidateHand.primaryValue > prevHand.primaryValue) return true;
    if (candidateHand.primaryValue === prevHand.primaryValue) {
      return candidateHand.suitValue > prevHand.suitValue;
    }
    return false;
  }

  // 5张牌型
  if (candidateHand.categoryWeight > prevHand.categoryWeight) return true;
  if (candidateHand.categoryWeight === prevHand.categoryWeight) {
    if (candidateHand.primaryValue > prevHand.primaryValue) return true;
    if (candidateHand.primaryValue === prevHand.primaryValue) {
      return candidateHand.suitValue > prevHand.suitValue;
    }
    return false;
  }

  return false;
}

// --------------------------------------------------------------------------
// 烟三“找朋友”阵营划分与胜负结算逻辑
// 规则：
// 1. 拥有【黑桃3 (spade-3)】和【黑桃A (spade-A)】的两位玩家是朋友盟友！
// 2. 特殊情况：若同一位玩家同时拥有黑桃A和黑桃3，则该玩家独保 (1打3)！
// 3. 2打2胜负判定：
//    - 全胜 (+10分 / -10分)：一队包揽前两名 (1324/3124/1342/3142 或 2413/2431/4213/4231)
//    - 半胜 (+5分 / -5分)：一队获得第1名和第3名 (1234/3214/1432/3412 或 2341/4321/2143/4123)
//    - 打和 (0分)：一队第1和第4名，另一队第2和第3名 (1423/1243/3421/3241/2134/2314/4132/4312)
// 4. 独保 (1打3) 胜负判定：
//    - 独保第1个打完：全胜，得30分，其余3人各输10分
//    - 独保第2个打完：半胜，得15分，其余3人各输5分
//    - 独保第3个打完：半输，输15分，其余3人各得5分
//    - 其他3人先打完：全输，输30分，其余3人各得10分
// --------------------------------------------------------------------------

import { Player, YansanFriendship, YansanGameResult, YansanOutcomeType } from '../types/game';

/**
 * 初始化烟三每局的找朋友关系
 */
export function initYansanFriendship(players: Player[]): YansanFriendship {
  let spadeAIdx = 0;
  let spade3Idx = 0;

  players.forEach((p, idx) => {
    if (p.cards.some(c => c.id === 'spade-A')) {
      spadeAIdx = idx;
    }
    if (p.cards.some(c => c.id === 'spade-3')) {
      spade3Idx = idx;
    }
  });

  const hasDualSpadeHolder = spadeAIdx === spade3Idx;

  const spadeTeamIndexes = hasDualSpadeHolder ? [spadeAIdx] : [spadeAIdx, spade3Idx];
  const civilianTeamIndexes = [0, 1, 2, 3].filter(idx => !spadeTeamIndexes.includes(idx));

  return {
    hasDualSpadeHolder,
    spadeAHolderIndex: spadeAIdx,
    spade3HolderIndex: spade3Idx,
    spadeAPlayed: false,
    spade3Played: false,
    spadeTeamIndexes,
    civilianTeamIndexes,
  };
}

/**
 * 检查烟三当前出完手牌顺序是否达成游戏结束条件，并返回计算好的详细胜负结果
 */
export function checkYansanGameOver(
  finishOrder: number[],
  friendship: YansanFriendship | undefined,
  players: Player[],
  baseScore: number = 100
): { isGameOver: boolean; result?: YansanGameResult } {
  if (!friendship) return { isGameOver: false };
  const { hasDualSpadeHolder, spadeTeamIndexes, civilianTeamIndexes } = friendship;

  // 1. 独保 (1打3) 胜负判定
  if (hasDualSpadeHolder) {
    const soloIdx = spadeTeamIndexes[0];
    const civIndexes = civilianTeamIndexes;

    // 1.1 独保玩家第1个打完手牌 -> 全胜 (+30分, 其余各-10分)
    if (finishOrder[0] === soloIdx) {
      const fullOrder = [...finishOrder];
      [0, 1, 2, 3].forEach(idx => {
        if (!fullOrder.includes(idx)) fullOrder.push(idx);
      });

      const pointsMap: Record<number, number> = {};
      const coinChanges: Record<number, number> = {};
      pointsMap[soloIdx] = 30;
      coinChanges[soloIdx] = 30 * baseScore;
      civIndexes.forEach(cIdx => {
        pointsMap[cIdx] = -10;
        coinChanges[cIdx] = -10 * baseScore;
      });

      return {
        isGameOver: true,
        result: {
          outcome: 'SOLO_FULL_WIN',
          title: '🔥 独保全胜！独占鳌头！',
          description: `${players[soloIdx]?.name || '独保玩家'} 率先打完手牌夺得第1名！独保全胜斩获 +30 分，其余三家各扣 10 分！`,
          finishOrder: fullOrder,
          pointsMap,
          coinChanges,
          isSolo: true,
          soloPlayerIndex: soloIdx,
          spadeTeam: spadeTeamIndexes,
          civilianTeam: civilianTeamIndexes,
        },
      };
    }

    // 1.2 独保玩家第2个打完手牌 -> 半胜 (+15分, 其余各-5分)
    if (finishOrder.length >= 2 && finishOrder[1] === soloIdx) {
      const fullOrder = [...finishOrder];
      [0, 1, 2, 3].forEach(idx => {
        if (!fullOrder.includes(idx)) fullOrder.push(idx);
      });

      const pointsMap: Record<number, number> = {};
      const coinChanges: Record<number, number> = {};
      pointsMap[soloIdx] = 15;
      coinChanges[soloIdx] = 15 * baseScore;
      civIndexes.forEach(cIdx => {
        pointsMap[cIdx] = -5;
        coinChanges[cIdx] = -5 * baseScore;
      });

      return {
        isGameOver: true,
        result: {
          outcome: 'SOLO_HALF_WIN',
          title: '⚡ 独保半胜！稳居榜眼！',
          description: `${players[soloIdx]?.name || '独保玩家'} 第2个打完手牌！独保半胜获得 +15 分，其余三家各扣 5 分！`,
          finishOrder: fullOrder,
          pointsMap,
          coinChanges,
          isSolo: true,
          soloPlayerIndex: soloIdx,
          spadeTeam: spadeTeamIndexes,
          civilianTeam: civilianTeamIndexes,
        },
      };
    }

    // 1.3 独保玩家第3个打完手牌 -> 半输 (-15分, 其余各+5分)
    if (finishOrder.length >= 3 && finishOrder[2] === soloIdx) {
      const fullOrder = [...finishOrder];
      [0, 1, 2, 3].forEach(idx => {
        if (!fullOrder.includes(idx)) fullOrder.push(idx);
      });

      const pointsMap: Record<number, number> = {};
      const coinChanges: Record<number, number> = {};
      pointsMap[soloIdx] = -15;
      coinChanges[soloIdx] = -15 * baseScore;
      civIndexes.forEach(cIdx => {
        pointsMap[cIdx] = 5;
        coinChanges[cIdx] = 5 * baseScore;
      });

      return {
        isGameOver: true,
        result: {
          outcome: 'SOLO_HALF_LOSS',
          title: '⚠️ 独保半输！寡不敌众！',
          description: `${players[soloIdx]?.name || '独保玩家'} 第3个打完手牌！独保半输扣除 15 分，平民三家各获 +5 分！`,
          finishOrder: fullOrder,
          pointsMap,
          coinChanges,
          isSolo: true,
          soloPlayerIndex: soloIdx,
          spadeTeam: spadeTeamIndexes,
          civilianTeam: civilianTeamIndexes,
        },
      };
    }

    // 1.4 其余三名平民玩家都先打完了手牌 -> 独保全输 (-30分, 其余各+10分)
    const civFinishedCount = civIndexes.filter(c => finishOrder.includes(c)).length;
    if (civFinishedCount === 3) {
      const fullOrder = [...finishOrder, soloIdx];

      const pointsMap: Record<number, number> = {};
      const coinChanges: Record<number, number> = {};
      pointsMap[soloIdx] = -30;
      coinChanges[soloIdx] = -30 * baseScore;
      civIndexes.forEach(cIdx => {
        pointsMap[cIdx] = 10;
        coinChanges[cIdx] = 10 * baseScore;
      });

      return {
        isGameOver: true,
        result: {
          outcome: 'SOLO_FULL_LOSS',
          title: '💥 独保全输！平民完胜！',
          description: `平民阵营三位玩家全部先走！${players[soloIdx]?.name || '独保玩家'} 垫底全输扣除 30 分，平民三家各获 +10 分！`,
          finishOrder: fullOrder,
          pointsMap,
          coinChanges,
          isSolo: true,
          soloPlayerIndex: soloIdx,
          spadeTeam: spadeTeamIndexes,
          civilianTeam: civilianTeamIndexes,
        },
      };
    }

    // 独保尚未分出胜负，继续游戏
    return { isGameOver: false };
  }

  // 2. 找朋友 2对2 胜负判定 (黑桃A+黑桃3 vs 平民两位)
  const isSpade = (idx: number) => spadeTeamIndexes.includes(idx);
  const isCiv = (idx: number) => civilianTeamIndexes.includes(idx);

  // 2.1 检查前两名是否同一队伍 (全胜判定)
  if (finishOrder.length >= 2) {
    const p1 = finishOrder[0];
    const p2 = finishOrder[1];

    // A队 (黑桃队) 包揽前两名 -> 黑桃队全胜！(1324/3124/1342/3142)
    if (isSpade(p1) && isSpade(p2)) {
      const fullOrder = [...finishOrder];
      civilianTeamIndexes.forEach(c => {
        if (!fullOrder.includes(c)) fullOrder.push(c);
      });

      const pointsMap: Record<number, number> = {};
      const coinChanges: Record<number, number> = {};
      spadeTeamIndexes.forEach(s => {
        pointsMap[s] = 10;
        coinChanges[s] = 10 * baseScore;
      });
      civilianTeamIndexes.forEach(c => {
        pointsMap[c] = -10;
        coinChanges[c] = -10 * baseScore;
      });

      const s1Name = players[spadeTeamIndexes[0]]?.name || '黑桃盟友1';
      const s2Name = players[spadeTeamIndexes[1]]?.name || '黑桃盟友2';

      return {
        isGameOver: true,
        result: {
          outcome: 'SPADE_FULL_WIN',
          title: '♠️ 黑桃双雄 全胜大捷！',
          description: `【${s1Name}】与【${s2Name}】包揽前两名头二游！黑桃队全胜各得 10 分，平民队各输 10 分！`,
          finishOrder: fullOrder,
          pointsMap,
          coinChanges,
          isSolo: false,
          spadeTeam: spadeTeamIndexes,
          civilianTeam: civilianTeamIndexes,
        },
      };
    }

    // B队 (平民队) 包揽前两名 -> 平民队全胜！(2413/2431/4213/4231)
    if (isCiv(p1) && isCiv(p2)) {
      const fullOrder = [...finishOrder];
      spadeTeamIndexes.forEach(s => {
        if (!fullOrder.includes(s)) fullOrder.push(s);
      });

      const pointsMap: Record<number, number> = {};
      const coinChanges: Record<number, number> = {};
      civilianTeamIndexes.forEach(c => {
        pointsMap[c] = 10;
        coinChanges[c] = 10 * baseScore;
      });
      spadeTeamIndexes.forEach(s => {
        pointsMap[s] = -10;
        coinChanges[s] = -10 * baseScore;
      });

      const c1Name = players[civilianTeamIndexes[0]]?.name || '平民1';
      const c2Name = players[civilianTeamIndexes[1]]?.name || '平民2';

      return {
        isGameOver: true,
        result: {
          outcome: 'CIVILIAN_FULL_WIN',
          title: '🛡️ 平民阵营 全胜大捷！',
          description: `【${c1Name}】与【${c2Name}】包揽前两名头二游！平民队全胜各得 10 分，黑桃队各输 10 分！`,
          finishOrder: fullOrder,
          pointsMap,
          coinChanges,
          isSolo: false,
          spadeTeam: spadeTeamIndexes,
          civilianTeam: civilianTeamIndexes,
        },
      };
    }
  }

  // 2.2 决出前3名时，必定能确定半胜或打和
  if (finishOrder.length >= 3) {
    const p1 = finishOrder[0];
    const p2 = finishOrder[1];
    const p3 = finishOrder[2];

    const fullOrder = [...finishOrder];
    [0, 1, 2, 3].forEach(idx => {
      if (!fullOrder.includes(idx)) fullOrder.push(idx);
    });

    const pointsMap: Record<number, number> = {};
    const coinChanges: Record<number, number> = {};

    // 情况 1: 头游是黑桃队 (p1 ∈ Spade), 二游是平民队 (p2 ∈ Civilian)
    if (isSpade(p1) && isCiv(p2)) {
      if (isSpade(p3)) {
        // 三游是黑桃队 -> 黑桃队 1, 3名！半胜！(1234/3214/1432/3412)
        spadeTeamIndexes.forEach(s => {
          pointsMap[s] = 5;
          coinChanges[s] = 5 * baseScore;
        });
        civilianTeamIndexes.forEach(c => {
          pointsMap[c] = -5;
          coinChanges[c] = -5 * baseScore;
        });

        return {
          isGameOver: true,
          result: {
            outcome: 'SPADE_HALF_WIN',
            title: '♠️ 黑桃双雄 半胜夺魁！',
            description: `黑桃队分列第1名与第3名！黑桃队半胜各得 5 分，平民队各输 5 分！`,
            finishOrder: fullOrder,
            pointsMap,
            coinChanges,
            isSolo: false,
            spadeTeam: spadeTeamIndexes,
            civilianTeam: civilianTeamIndexes,
          },
        };
      } else {
        // 三游是平民队 -> 黑桃队 1, 4名，平民队 2, 3名！打和！(1423/1243/3421/3241)
        [0, 1, 2, 3].forEach(idx => {
          pointsMap[idx] = 0;
          coinChanges[idx] = 0;
        });

        return {
          isGameOver: true,
          result: {
            outcome: 'DRAW',
            title: '🤝 势均力敌 握手打和！',
            description: `黑桃队夺得第1与第4名，平民队位列第2与第3名！双方打和无输赢，各得 0 分！`,
            finishOrder: fullOrder,
            pointsMap,
            coinChanges,
            isSolo: false,
            spadeTeam: spadeTeamIndexes,
            civilianTeam: civilianTeamIndexes,
          },
        };
      }
    }

    // 情况 2: 头游是平民队 (p1 ∈ Civilian), 二游是黑桃队 (p2 ∈ Spade)
    if (isCiv(p1) && isSpade(p2)) {
      if (isCiv(p3)) {
        // 三游是平民队 -> 平民队 1, 3名！半胜！(2341/4321/2143/4123)
        civilianTeamIndexes.forEach(c => {
          pointsMap[c] = 5;
          coinChanges[c] = 5 * baseScore;
        });
        spadeTeamIndexes.forEach(s => {
          pointsMap[s] = -5;
          coinChanges[s] = -5 * baseScore;
        });

        return {
          isGameOver: true,
          result: {
            outcome: 'CIVILIAN_HALF_WIN',
            title: '🛡️ 平民阵营 半胜夺魁！',
            description: `平民队分列第1名与第3名！平民队半胜各得 5 分，黑桃队各输 5 分！`,
            finishOrder: fullOrder,
            pointsMap,
            coinChanges,
            isSolo: false,
            spadeTeam: spadeTeamIndexes,
            civilianTeam: civilianTeamIndexes,
          },
        };
      } else {
        // 三游是黑桃队 -> 平民队 1, 4名，黑桃队 2, 3名！打和！(2134/2314/4132/4312)
        [0, 1, 2, 3].forEach(idx => {
          pointsMap[idx] = 0;
          coinChanges[idx] = 0;
        });

        return {
          isGameOver: true,
          result: {
            outcome: 'DRAW',
            title: '🤝 势均力敌 握手打和！',
            description: `平民队位居第1与第4名，黑桃队稳守第2与第3名！双方打和无输赢，各得 0 分！`,
            finishOrder: fullOrder,
            pointsMap,
            coinChanges,
            isSolo: false,
            spadeTeam: spadeTeamIndexes,
            civilianTeam: civilianTeamIndexes,
          },
        };
      }
    }
  }

  // 尚未分出胜负，游戏继续进行！
  return { isGameOver: false };
}

/**
 * 结算烟三找朋友结果，如果 game over 判定返回了 result 则直接采用，否则根据最终排名补全结算
 */
export function calculateYansanSettlement(
  finishOrder: number[],
  friendship: YansanFriendship | undefined,
  baseScore: number,
  players: Player[]
): YansanGameResult {
  const check = checkYansanGameOver(finishOrder, friendship, players, baseScore);
  if (check.isGameOver && check.result) {
    return check.result;
  }

  // 兜底补齐：按现有已出完顺序 + 剩余玩家手牌张数少者在前的顺序
  const fullOrder = [...finishOrder];
  const remaining = [0, 1, 2, 3]
    .filter(i => !fullOrder.includes(i))
    .sort((a, b) => (players[a]?.cards?.length || 0) - (players[b]?.cards?.length || 0));
  fullOrder.push(...remaining);

  const finalCheck = checkYansanGameOver(fullOrder, friendship, players, baseScore);
  if (finalCheck.result) {
    return finalCheck.result;
  }

  // 终极平局兜底
  const pointsMap: Record<number, number> = { 0: 0, 1: 0, 2: 3, 3: 0 };
  const coinChanges: Record<number, number> = { 0: 0, 1: 0, 2: 0, 3: 0 };
  return {
    outcome: 'DRAW',
    title: '🤝 本局打和 握手言和',
    description: '双方各显神通，互不相让，本局握手言和，无输赢！',
    finishOrder: fullOrder,
    pointsMap,
    coinChanges,
    isSolo: !!friendship?.hasDualSpadeHolder,
    soloPlayerIndex: friendship?.spadeAHolderIndex,
    spadeTeam: friendship ? [friendship.spadeAHolderIndex, friendship.spade3HolderIndex] : [],
    civilianTeam: friendship ? [0, 1, 2, 3].filter(i => i !== friendship.spadeAHolderIndex && i !== friendship.spade3HolderIndex) : [],
  };
}
