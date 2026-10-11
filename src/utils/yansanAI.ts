/**
 * 烟三 (Yan San) 宗师级 AI 决策与智能托管引擎
 * 针对烟三专属规则进行全方位深度优化与战术博弈建模：
 * 
 * 烟三规则核心特性：
 * 1. 点数大小：3 最大(16)，2 第二大(15)，A 第三大(14) ... 最小是 4(4)
 *    点数序列：4 < 5 < 6 < 7 < 8 < 9 < 10 < J < Q < K < A < 2 < 3
 * 2. 花色大小：黑桃 ♠(4) > 红桃 ♥(3) > 草花 ♣(2) > 方块 ♦(1)
 * 3. 牌皇王牌：♠3 为全场绝对最大单张 (Boss Card)
 * 4. 找朋友同盟：持 ♠3 与 ♠A 的两位玩家为同盟；若同一玩家兼持 ♠3 和 ♠A 则为【独保】(1打3)
 * 5. 首出必备牌：每局必须由持有【方块 4 (♦4)】的玩家首出，且首出牌型中必须包含 ♦4
 *    - 首出铁律：绝不能为了带 ♦4 而把四条 3 (全场第一炸弹)、四条 2、四条 A 等王牌炸弹拿去当四带一副牌打掉！
 *    - 首出带 ♦4 推荐：带 4 的顺子 (如 4-5-6-7-8, A-2-3-4-5) 优先甩 5 张小牌；或对 4、三条 4；或单张 ♦4
 * 6. 五张牌型：同花顺(50) > 四带一(40) > 俘虏/葫芦(30) > 同花(20) > 顺子(10)
 * 
 * 宗师级战术特性：
 * - 炸弹与核心王牌神圣保护 (绝对禁止拆散四条 3、四条 2 或首出浪费炸弹)
 * - 全局最优手牌拆解 (Multi-branch Hand Partitioning & Dynamic Evaluation)
 * - 找朋友阵营协同 (识别盟友放行、敌方封锁、独保控牌)
 * - 报单一/报双顶大防范 (杜绝送走敌方)
 * - 智能跟牌与适度放行 (Smart Pass & 保护整牌)
 * - 记忆化缓存加速 (LRU Combinatorial Memoization)
 */

import { Card, CardHand, HandType, Player, YansanFriendship } from '../types/game';
import {
  sortYansanCards,
  analyzeYansanHand,
  canYansanBeat,
  checkYansanStraight,
  YANSAN_VALID_STRAIGHT_PATTERNS,
  YANSAN_RANK_VALUES,
} from './yansanRules';

// ----------------------------------------------------
// 0. 性能优化：记忆化缓存
// ----------------------------------------------------
const yansanFiveCombosCache = new Map<string, CardHand[]>();
const yansanPartitionCache = new Map<string, YansanHandStructure>();

export function clearYansanAICaches() {
  yansanFiveCombosCache.clear();
  yansanPartitionCache.clear();
}

// ----------------------------------------------------
// 1. 牌型枚举与全局搜索算法
// ----------------------------------------------------

/**
 * 寻找所有可压制上家牌的合法牌型组合 (去重且按从小到大排序)
 */
export function findYansanBeatingHands(cards: Card[], prevHand: CardHand): CardHand[] {
  if (!cards || cards.length === 0 || !prevHand) return [];

  const candidates: CardHand[] = [];
  const sorted = sortYansanCards(cards);
  const reqCount = prevHand.cards.length;

  // 1. 单张 (Single)
  if (reqCount === 1) {
    for (const c of sorted) {
      const h = analyzeYansanHand([c]);
      if (h && canYansanBeat(prevHand, h)) {
        candidates.push(h);
      }
    }
    return candidates;
  }

  // 2. 对子 (Pair)
  if (reqCount === 2) {
    const rankGroups: Record<number, Card[]> = {};
    for (const c of sorted) {
      if (!rankGroups[c.rankValue]) rankGroups[c.rankValue] = [];
      rankGroups[c.rankValue].push(c);
    }

    const ranks = Object.keys(rankGroups).map(Number).sort((a, b) => a - b);
    for (const r of ranks) {
      const group = rankGroups[r];
      if (group.length >= 2) {
        for (let i = 0; i < group.length - 1; i++) {
          for (let j = i + 1; j < group.length; j++) {
            const h = analyzeYansanHand([group[i], group[j]]);
            if (h && canYansanBeat(prevHand, h)) {
              candidates.push(h);
              break;
            }
          }
          if (candidates.length > 0 && candidates[candidates.length - 1].primaryValue === r) {
            break;
          }
        }
      }
    }
    return candidates;
  }

  // 3. 三条 (Triple)
  if (reqCount === 3) {
    const rankGroups: Record<number, Card[]> = {};
    for (const c of sorted) {
      if (!rankGroups[c.rankValue]) rankGroups[c.rankValue] = [];
      rankGroups[c.rankValue].push(c);
    }

    const ranks = Object.keys(rankGroups).map(Number).sort((a, b) => a - b);
    for (const r of ranks) {
      const group = rankGroups[r];
      if (group.length >= 3) {
        for (let i = 0; i < group.length - 2; i++) {
          for (let j = i + 1; j < group.length - 1; j++) {
            for (let k = j + 1; k < group.length; k++) {
              const h = analyzeYansanHand([group[i], group[j], group[k]]);
              if (h && canYansanBeat(prevHand, h)) {
                candidates.push(h);
                break;
              }
            }
            if (candidates.length > 0 && candidates[candidates.length - 1].primaryValue === r) {
              break;
            }
          }
          if (candidates.length > 0 && candidates[candidates.length - 1].primaryValue === r) {
            break;
          }
        }
      }
    }
    return candidates;
  }

  // 4. 五张牌型 (Straight, Flush, Full House, Four of a Kind, Straight Flush)
  if (reqCount === 5 && sorted.length >= 5) {
    const allFiveHands = findAllYansanFiveCardCombos(sorted);
    const seenSignatures = new Set<string>();
    for (const h of allFiveHands) {
      if (canYansanBeat(prevHand, h)) {
        const sig = h.cards.map(c => c.id).sort().join(',');
        if (!seenSignatures.has(sig)) {
          seenSignatures.add(sig);
          candidates.push(h);
        }
      }
    }
    return candidates.sort((a, b) => {
      if (a.categoryWeight !== b.categoryWeight) return a.categoryWeight - b.categoryWeight;
      if (a.primaryValue !== b.primaryValue) return a.primaryValue - b.primaryValue;
      return a.suitValue - b.suitValue;
    });
  }

  return candidates;
}

/**
 * 找出烟三所有可能的五张合法牌型 (按由小到大、由弱到强排列，顺子 ➔ 同花 ➔ 俘虏 ➔ 四带一 ➔ 同花顺)
 */
export function findAllYansanFiveCardCombos(cards: Card[]): CardHand[] {
  if (!cards || cards.length < 5) return [];

  const cacheKey = cards.map(c => c.id).sort().join(',');
  const cached = yansanFiveCombosCache.get(cacheKey);
  if (cached) return cached;

  const results: CardHand[] = [];
  const seenSignatures = new Set<string>();
  const sorted = sortYansanCards(cards);

  const addHandIfValid = (handCards: Card[]) => {
    const h = analyzeYansanHand(handCards);
    if (h) {
      const sig = h.cards.map(c => c.id).sort().join(',');
      if (!seenSignatures.has(sig)) {
        seenSignatures.add(sig);
        results.push(h);
      }
    }
  };

  const rankGroups: Record<number, Card[]> = {};
  const suitGroups: Record<string, Card[]> = {};

  for (const c of sorted) {
    if (!rankGroups[c.rankValue]) rankGroups[c.rankValue] = [];
    rankGroups[c.rankValue].push(c);

    if (!suitGroups[c.suit]) suitGroups[c.suit] = [];
    suitGroups[c.suit].push(c);
  }

  // 1. 顺子 (Straight) - 权重 10
  for (const pattern of YANSAN_VALID_STRAIGHT_PATTERNS) {
    const hasAllRanks = pattern.ranks.every(r => sorted.some(c => c.rank === r));
    if (hasAllRanks) {
      const rankCardsList = pattern.ranks.map(r => sorted.filter(c => c.rank === r));
      for (const c0 of rankCardsList[0]) {
        for (const c1 of rankCardsList[1]) {
          for (const c2 of rankCardsList[2]) {
            for (const c3 of rankCardsList[3]) {
              for (const c4 of rankCardsList[4]) {
                addHandIfValid([c0, c1, c2, c3, c4]);
              }
            }
          }
        }
      }
    }
  }

  // 2. 同花与同花顺 (Flush & Straight Flush) - 权重 20 & 50
  for (const s of Object.keys(suitGroups)) {
    const sCards = suitGroups[s];
    if (sCards.length >= 5) {
      const combos = getSubCombinations(sCards, 5);
      for (const c of combos) {
        addHandIfValid(c);
      }
    }
  }

  // 3. 俘虏 / 葫芦 (Full House: 3+2) - 权重 30
  const tripRanks = Object.keys(rankGroups)
    .filter(r => rankGroups[Number(r)].length >= 3)
    .map(Number)
    .sort((a, b) => a - b);
  const pairRanks = Object.keys(rankGroups)
    .filter(r => rankGroups[Number(r)].length >= 2)
    .map(Number)
    .sort((a, b) => a - b);

  for (const t of tripRanks) {
    const tripCards = rankGroups[t];
    const tripCombos = getSubCombinations(tripCards, 3);
    for (const tc of tripCombos) {
      for (const p of pairRanks) {
        if (p !== t) {
          const pairCards = rankGroups[p];
          const pairCombos = getSubCombinations(pairCards, 2);
          for (const pc of pairCombos) {
            addHandIfValid([...tc, ...pc]);
          }
        }
      }
    }
  }

  // 4. 四带一 (Four of a Kind: 4+1) - 权重 40
  // 注意：四带一属于高杀伤力炸弹，仅配最小单张作为合法备选
  for (const rStr of Object.keys(rankGroups)) {
    const quad = rankGroups[Number(rStr)];
    if (quad.length === 4) {
      for (const single of sorted) {
        if (single.rankValue !== Number(rStr)) {
          addHandIfValid([...quad, single]);
        }
      }
    }
  }

  // 按牌型类别权重从小到大，相同类别按大小从小到大排序
  results.sort((a, b) => {
    if (a.categoryWeight !== b.categoryWeight) return a.categoryWeight - b.categoryWeight;
    if (a.primaryValue !== b.primaryValue) return a.primaryValue - b.primaryValue;
    return a.suitValue - b.suitValue;
  });

  if (yansanFiveCombosCache.size > 500) yansanFiveCombosCache.clear();
  yansanFiveCombosCache.set(cacheKey, results);
  return results;
}

function getSubCombinations<T>(arr: T[], k: number): T[][] {
  if (k === 0) return [[]];
  if (arr.length < k) return [];
  if (arr.length === k) return [arr];

  const head = arr[0];
  const tail = arr.slice(1);
  const withHead = getSubCombinations(tail, k - 1).map(c => [head, ...c]);
  const withoutHead = getSubCombinations(tail, k);

  return [...withHead, ...withoutHead];
}

// ----------------------------------------------------
// 2. 烟三专属全局手牌拆解模型 (Hand Partitioning)
// ----------------------------------------------------

export interface YansanHandStructure {
  hands: CardHand[];
  unpairedSingles: Card[];
  totalTurns: number;
  controlScore: number;
  brokenScore: number;
  hasQuadOfThrees: boolean; // 是否拥有四条3 (绝对王牌炸弹)
}

/**
 * 智能拆解手牌结构：
 * - 极度保护四条3、四条2、四条A等王牌炸弹，严禁拆成散牌
 * - 优先整合低顺子和低俘虏甩牌
 * - 评估手数与大牌控场分
 */
export function partitionYansanHand(cards: Card[]): YansanHandStructure {
  if (!cards || cards.length === 0) {
    return {
      hands: [],
      unpairedSingles: [],
      totalTurns: 0,
      controlScore: 0,
      brokenScore: 100,
      hasQuadOfThrees: false,
    };
  }

  const cacheKey = cards.map(c => c.id).sort().join(',');
  const cached = yansanPartitionCache.get(cacheKey);
  if (cached) return cached;

  const sorted = sortYansanCards(cards);
  let bestHands: CardHand[] = [];
  let bestUnpaired: Card[] = [];
  let bestTurns = 999;
  let bestScore = -99999;

  // 1. 识别并锁定炸弹 (4张同点数)，特别是四条3 (rankValue=16) 和四条2 (rankValue=15)
  const rankCounts: Record<number, Card[]> = {};
  for (const c of sorted) {
    if (!rankCounts[c.rankValue]) rankCounts[c.rankValue] = [];
    rankCounts[c.rankValue].push(c);
  }

  const quadRanks = Object.keys(rankCounts).filter(r => rankCounts[Number(r)].length === 4).map(Number);
  const hasQuadOfThrees = quadRanks.includes(16);

  // 提取所有五张牌型候选 (排除拿四条3去配散牌构成的四带一，四条3应当单独作为大杀器或正规四带一)
  const allFive = findAllYansanFiveCardCombos(sorted);

  // 过滤掉用高点数炸弹 (3、2) 配弱单张的五张牌，除非手牌只剩 5 张
  const reasonableFive = allFive.filter(h => {
    if (cards.length > 5 && h.type === 'FOUR_OF_A_KIND') {
      // 四条3或四条2不要在平时拆开
      if (h.primaryValue >= 15) return false;
    }
    return true;
  });

  const candidateBranches: CardHand[][] = [[]];
  for (const f of reasonableFive) {
    candidateBranches.push([f]);
  }

  // 尝试两个不冲突的五张组合
  if (sorted.length >= 10 && reasonableFive.length >= 2) {
    for (let i = 0; i < Math.min(reasonableFive.length, 6); i++) {
      for (let j = i + 1; j < Math.min(reasonableFive.length, 8); j++) {
        const h1 = reasonableFive[i];
        const h2 = reasonableFive[j];
        const set1 = new Set(h1.cards.map(c => c.id));
        if (!h2.cards.some(c => set1.has(c.id))) {
          candidateBranches.push([h1, h2]);
        }
      }
    }
  }

  for (const branchFive of candidateBranches) {
    const usedIds = new Set<string>();
    branchFive.forEach(h => h.cards.forEach(c => usedIds.add(c.id)));

    const remainingCards = sorted.filter(c => !usedIds.has(c.id));
    const currentHands: CardHand[] = [...branchFive];

    const branchRanks: Record<number, Card[]> = {};
    for (const c of remainingCards) {
      if (!branchRanks[c.rankValue]) branchRanks[c.rankValue] = [];
      branchRanks[c.rankValue].push(c);
    }

    const currentSingles: Card[] = [];

    for (const rStr of Object.keys(branchRanks)) {
      const group = branchRanks[Number(rStr)];
      if (group.length === 4) {
        // 四条若未组五张，优先配最小散牌组成完整的四带一炸弹，或拆为两对
        const minSingle = remainingCards.find(c => c.rankValue !== Number(rStr));
        if (minSingle && !usedIds.has(minSingle.id)) {
          currentHands.push(analyzeYansanHand([...group, minSingle])!);
        } else {
          currentHands.push(analyzeYansanHand([group[0], group[1]])!);
          currentHands.push(analyzeYansanHand([group[2], group[3]])!);
        }
      } else if (group.length === 3) {
        currentHands.push(analyzeYansanHand(group)!);
      } else if (group.length === 2) {
        currentHands.push(analyzeYansanHand(group)!);
      } else {
        currentHands.push(analyzeYansanHand([group[0]])!);
        currentSingles.push(group[0]);
      }
    }

    const turns = currentHands.length;

    // 结构打分：
    // 手数越少越好，每多一手 -30 分
    // 散牌惩罚：点数 <= 8 的弱单张每个 -25 分
    // 大牌奖励：♠3 牌皇 +80分, 其它3 +45分, 2 +25分, A +15分, ♠A +35分
    // 四条3炸弹额外奖励 +120 分！
    let score = 300 - turns * 30;

    for (const s of currentSingles) {
      if (s.rankValue <= 6) score -= 35;
      else if (s.rankValue <= 8) score -= 20;
      else if (s.rankValue === 16) score += 40; // 单张 3
    }

    for (const h of currentHands) {
      if (h.type === 'FOUR_OF_A_KIND') {
        if (h.primaryValue === 16) score += 120; // 四条3
        else score += 50;
      } else if (h.type === 'FULL_HOUSE') {
        score += 35;
      } else if (h.type === 'STRAIGHT' || h.type === 'FLUSH') {
        score += 25;
      }
      if (h.cards.some(c => c.id === 'spade-3')) score += 70; // ♠3
      if (h.cards.some(c => c.id === 'spade-A')) score += 35; // ♠A
    }

    if (score > bestScore || (score === bestScore && turns < bestTurns)) {
      bestScore = score;
      bestTurns = turns;
      bestHands = currentHands;
      bestUnpaired = currentSingles;
    }
  }

  let controlScore = 0;
  for (const c of cards) {
    if (c.id === 'spade-3') controlScore += 80;
    else if (c.rankValue === 16) controlScore += 45; // 3
    else if (c.rankValue === 15) controlScore += 25; // 2
    else if (c.rankValue === 14) controlScore += 15; // A
  }
  if (hasQuadOfThrees) controlScore += 150;

  const result: YansanHandStructure = {
    hands: bestHands,
    unpairedSingles: bestUnpaired,
    totalTurns: bestTurns,
    controlScore,
    brokenScore: bestScore,
    hasQuadOfThrees,
  };

  if (yansanPartitionCache.size > 500) yansanPartitionCache.clear();
  yansanPartitionCache.set(cacheKey, result);
  return result;
}

// ----------------------------------------------------
// 3. 终局必胜与连出规划 (Endgame Walk-off Solver)
// ----------------------------------------------------

function checkYansanWinningSequence(cards: Card[]): CardHand[] | null {
  if (!cards || cards.length === 0) return null;

  // 1. 如果整副手牌刚好可以作为一个合法牌型一次性出完
  const wholeHand = analyzeYansanHand(cards);
  if (wholeHand) {
    return [wholeHand];
  }

  // 2. 如果手牌拆解后恰好只有 2 手牌
  const partition = partitionYansanHand(cards);
  if (partition.hands.length === 2) {
    const hasSpade3 = cards.some(c => c.id === 'spade-3');
    if (hasSpade3) {
      const bossHand = partition.hands.find(h =>
        h.type === 'SINGLE' && h.cards.some(c => c.id === 'spade-3')
      );
      const otherHand = partition.hands.find(h => h !== bossHand);
      if (bossHand && otherHand) {
        // 先出另一手，再用 ♠3 绝对控场收官
        return [otherHand, bossHand];
      }
    }
  }

  return null;
}

// ----------------------------------------------------
// 4. 领牌出牌决策引擎 (Leading Cards Selector)
// ----------------------------------------------------

export function chooseYansanLeadingCards(
  cards: Card[],
  isFirstTrick: boolean = false,
  starterCardId: string = 'diamond-4',
  players: Player[] = [],
  selfPlayerId?: string
): Card[] {
  if (!cards || cards.length === 0) return [];

  const sorted = sortYansanCards(cards);

  // ----------------------------------------------------------
  // 【首出核心策略：严防四条3带♦4！智能安全利用方块4】
  // 规则：必须包含方块 4 (diamond-4)
  // 优先级：
  // 1. 包含 ♦4 的顺子 (如 4-5-6-7-8, A-2-3-4-5) ➔ 极品起手，一口气甩掉5张小牌！
  // 2. 包含 ♦4 的低阶俘虏 (三条4带一对) ➔ 甩5张牌，消耗底牌
  // 3. 包含 ♦4 的对子 (对4) ➔ [diamond-4, other-4]
  // 4. 包含 ♦4 的三条 (三条4)
  // 5. 单张 ♦4 ➔ 最稳妥、最标准的经典首发！
  // ⚠️ 铁律限制：绝对不允许首出打出【四带一】(特别是四条3带♦4、四条2带♦4、四条A带♦4)！
  // ----------------------------------------------------------
  if (isFirstTrick) {
    const starterCard = sorted.find(c => c.id === starterCardId) || sorted.find(c => c.rank === '4') || sorted[0];

    // A. 优先寻找包含 ♦4 的顺子 (五张连续小顺子)
    const fiveCombos = findAllYansanFiveCardCombos(sorted);
    const straightsWith4 = fiveCombos.filter(
      f => f.type === 'STRAIGHT' && f.cards.some(c => c.id === starterCard.id)
    );
    if (straightsWith4.length > 0) {
      // 优先选 weight 较小的顺子（比如 4-5-6-7-8 或 A-2-3-4-5）
      straightsWith4.sort((a, b) => a.primaryValue - b.primaryValue);
      return straightsWith4[0].cards;
    }

    // B. 检查是否有包含 ♦4 的三条 4 组成的俘虏 (三条4带一对，如 4-4-4 + 5-5)
    const rank4Cards = sorted.filter(c => c.rank === '4');
    if (rank4Cards.length === 3) {
      const fullHousesWith4 = fiveCombos.filter(
        f => f.type === 'FULL_HOUSE' && f.primaryValue === 4 && f.cards.some(c => c.id === starterCard.id)
      );
      if (fullHousesWith4.length > 0) {
        return fullHousesWith4[0].cards;
      }
    }

    // C. 检查是否有对 4 (对子带 ♦4)
    if (rank4Cards.length >= 2) {
      const other4 = rank4Cards.find(c => c.id !== starterCard.id);
      if (other4) {
        return [starterCard, other4];
      }
    }

    // D. 检查是否有三条 4
    if (rank4Cards.length >= 3) {
      return rank4Cards.slice(0, 3);
    }

    // E. 默认且最安全的首发：单张 ♦4
    // 坚决不打四带一！
    return [starterCard];
  }

  // ----------------------------------------------------------
  // 【常规领牌决策 (Regular Lead)】
  // ----------------------------------------------------------

  // 1. 终局一杆清台检查
  const winSeq = checkYansanWinningSequence(sorted);
  if (winSeq && winSeq.length > 0) {
    return winSeq[0].cards;
  }

  // 分析对手报单/报双危险状态
  const nextPlayer = getNextPlayer(players, selfPlayerId);
  const nextCardCount = nextPlayer ? (nextPlayer.cards ? nextPlayer.cards.length : 13) : 13;
  const isNextWarning1 = nextCardCount === 1;
  const isNextWarning2 = nextCardCount === 2;

  const anyOpponentWarning1 = players.some(
    p => p.id !== selfPlayerId && p.cards && p.cards.length === 1
  );

  const partition = partitionYansanHand(sorted);
  const { hands, unpairedSingles } = partition;

  // 2. 防范下家或对手报单：绝不出弱单张！
  if (isNextWarning1 || anyOpponentWarning1) {
    // 优先出五张牌型
    const fiveHands = hands.filter(h => h.categoryWeight >= 10 && h.type !== 'FOUR_OF_A_KIND');
    if (fiveHands.length > 0) {
      return fiveHands[0].cards;
    }

    // 其次出对子
    const pairHands = hands.filter(h => h.type === 'PAIR');
    if (pairHands.length > 0) {
      return pairHands[0].cards;
    }

    // 再次出三条
    const tripHands = hands.filter(h => h.type === 'TRIPLE');
    if (tripHands.length > 0) {
      return tripHands[0].cards;
    }

    // 若手里全是单张，必须出最大单张 (♠3 或大 3) 顶住，绝不送小单张！
    return [sorted[sorted.length - 1]];
  }

  // 3. 防范下家报双：避免发出小对子
  if (isNextWarning2) {
    const fiveHands = hands.filter(h => h.categoryWeight >= 10 && h.type !== 'FOUR_OF_A_KIND');
    if (fiveHands.length > 0) {
      return fiveHands[0].cards;
    }

    if (unpairedSingles.length > 0) {
      return [unpairedSingles[0]];
    }
  }

  // 4. 常规顺畅出牌：优先用成型的五张牌型 (顺子、低俘虏) 快速消减 5 张牌
  // 过滤掉珍贵的炸弹 (FOUR_OF_A_KIND) 和同花顺，留作防守
  const standardFives = hands.filter(h => h.categoryWeight <= 30);
  if (standardFives.length > 0) {
    return standardFives[0].cards;
  }

  // 5. 优先清理弱单张 (点数 <= 8 的单牌，如 4, 5, 6, 7, 8)
  const lowSingles = unpairedSingles.filter(c => c.rankValue <= 8);
  if (lowSingles.length > 0) {
    return [lowSingles[0]];
  }

  // 6. 优先出弱对子 (点数 <= 9 的对子)
  const lowPairs = hands.filter(h => h.type === 'PAIR' && h.primaryValue <= 9);
  if (lowPairs.length > 0) {
    return lowPairs[0].cards;
  }

  // 7. 出弱三条 (点数 <= 9)
  const lowTrips = hands.filter(h => h.type === 'TRIPLE' && h.primaryValue <= 9);
  if (lowTrips.length > 0) {
    return lowTrips[0].cards;
  }

  // 8. 按照手牌拆解中的第一手牌出牌 (保护 ♠3 不在第一手单出)
  if (hands.length > 0) {
    const safeHands = hands.filter(h => !h.cards.some(c => c.id === 'spade-3'));
    if (safeHands.length > 0) {
      return safeHands[0].cards;
    }
    return hands[0].cards;
  }

  // 兜底：出最小单张
  return [sorted[0]];
}

// ----------------------------------------------------
// 5. 跟牌与战术压制决策引擎 (Following / Beat Engine)
// ----------------------------------------------------

export function chooseYansanBeatingMove(
  cards: Card[],
  prevHand: CardHand,
  lastPlayerId: string,
  players: Player[],
  selfPlayer: Player,
  friendship?: YansanFriendship
): Card[] {
  const beatingCandidates = findYansanBeatingHands(cards, prevHand);
  if (beatingCandidates.length === 0) {
    return []; // 过牌 (PASS)
  }

  const sorted = sortYansanCards(cards);
  const selfIdx = players.findIndex(p => p.id === selfPlayer.id);
  const lastIdx = players.findIndex(p => p.id === lastPlayerId);

  // 1. 【一击必杀】如果跟出某一手可以直接出完手牌走人获胜，毫不犹豫直接出！
  for (const cand of beatingCandidates) {
    if (cand.cards.length === sorted.length) {
      return cand.cards;
    }
  }

  // 2. 【找朋友阵营协同判断】
  let isTeammate = false;
  if (friendship && selfIdx !== -1 && lastIdx !== -1) {
    if (!friendship.hasDualSpadeHolder) {
      const isSelfSpade = friendship.spadeTeamIndexes.includes(selfIdx);
      const isLastSpade = friendship.spadeTeamIndexes.includes(lastIdx);
      if (isSelfSpade === isLastSpade) {
        isTeammate = true;
      }
    }
  }

  // 如果上家是队友：
  if (isTeammate) {
    const teammatePlayer = players[lastIdx];
    const teammateCardCount = teammatePlayer?.cards?.length || 13;

    // A. 队友手牌很少 (剩 1~3 张)，全力保队友跑，主动过牌！
    if (teammateCardCount <= 3 && sorted.length > 3) {
      return [];
    }

    // B. 队友出的是大牌 (包含 3、2 或高阶俘虏/顺子)，主动放行！
    if (prevHand.primaryValue >= 15 || prevHand.categoryWeight >= 30) {
      return [];
    }
  }

  // 3. 【对手报单顶大】
  const nextPlayer = getNextPlayer(players, selfPlayer.id);
  const isNextWarning1 = nextPlayer && nextPlayer.cards && nextPlayer.cards.length === 1;
  const anyOpponentWarning1 = players.some(
    p => p.id !== selfPlayer.id && p.cards && p.cards.length === 1
  );

  if (prevHand.type === 'SINGLE' && (isNextWarning1 || anyOpponentWarning1)) {
    // 敌方报单，用最大单张封顶！
    const highestCandidate = beatingCandidates[beatingCandidates.length - 1];
    return highestCandidate.cards;
  }

  // 4. 【评估候选移动打分，保护炸弹与成型牌】
  const partition = partitionYansanHand(cards);
  const { hands, unpairedSingles } = partition;

  let bestCandidate: CardHand | null = null;
  let bestScore = -9999;

  for (const cand of beatingCandidates) {
    let score = 0;

    // A. 完整牌型匹配奖励 (+60)
    const isExactCombo = hands.some(h => {
      if (h.type !== cand.type || h.cards.length !== cand.cards.length) return false;
      const hIds = h.cards.map(c => c.id).sort().join(',');
      const cIds = cand.cards.map(c => c.id).sort().join(',');
      return hIds === cIds;
    });
    if (isExactCombo) score += 60;

    // B. 散牌单张消耗奖励 (+40)
    if (cand.type === 'SINGLE') {
      const isUnpaired = unpairedSingles.some(c => c.id === cand.cards[0].id);
      if (isUnpaired) score += 40;
    }

    // C. 炸弹神圣保护：严禁为了压普通单张/普通对子而把四条3或四条2拆开！
    if (cand.cards.some(c => c.rankValue === 16)) { // 包含 3
      const count3 = cards.filter(c => c.rankValue === 16).length;
      if (count3 === 4 && cand.type !== 'FOUR_OF_A_KIND') {
        score -= 200; // 绝对禁止拆散四条3！
      }
    }

    // D. 拆牌惩罚
    const brokenPenalty = calculateYansanBrokenPenalty(cand, cards);
    score -= brokenPenalty;

    // E. 牌面点数消耗惩罚：优先用贴近的小牌压制，避免大牌浪费
    const rankGap = cand.primaryValue - prevHand.primaryValue;
    score -= rankGap * 3;

    // F. ♠3 牌皇特别保护：手牌还多时保留 ♠3
    if (cand.cards.some(c => c.id === 'spade-3')) {
      if (sorted.length > 4) {
        score -= 40;
      } else {
        score += 30; // 残局可用 ♠3 绝杀控场
      }
    }

    // G. 炸弹 (四带一) 和同花顺压制：绝不在小局乱用炸弹
    if (cand.categoryWeight >= 40 && prevHand.categoryWeight < 30 && sorted.length > 5) {
      score -= 60;
    }

    if (score > bestScore) {
      bestScore = score;
      bestCandidate = cand;
    }
  }

  // 5. 【主动过牌权衡】：如果跟牌代价太高 (需要拆散炸弹或顺子)，且当前并不处于敌方报单危机中，选择 PASS
  if (bestScore < -50 && !anyOpponentWarning1 && sorted.length <= 8) {
    return [];
  }

  return bestCandidate ? bestCandidate.cards : beatingCandidates[0].cards;
}

function calculateYansanBrokenPenalty(cand: CardHand, allCards: Card[]): number {
  let penalty = 0;
  const candIds = new Set(cand.cards.map(c => c.id));
  const remaining = allCards.filter(c => !candIds.has(c.id));

  const origPartition = partitionYansanHand(allCards);
  const newPartition = partitionYansanHand(remaining);

  if (newPartition.totalTurns >= origPartition.totalTurns) {
    penalty += 35;
  }

  // 检查是否破坏了四条3炸弹
  if (origPartition.hasQuadOfThrees && !newPartition.hasQuadOfThrees) {
    penalty += 150;
  }

  // 检查是否破坏了五张成型牌
  const origFives = origPartition.hands.filter(h => h.categoryWeight >= 10).length;
  const newFives = newPartition.hands.filter(h => h.categoryWeight >= 10).length;
  if (newFives < origFives) {
    penalty += 60;
  }

  return penalty;
}

function getNextPlayer(players: Player[], currentId?: string): Player | null {
  if (!players || players.length === 0 || !currentId) return null;
  const idx = players.findIndex(p => p.id === currentId);
  if (idx === -1) return null;
  for (let step = 1; step <= 4; step++) {
    const nextIdx = (idx + step) % players.length;
    const cand = players[nextIdx];
    if (cand.cards && cand.cards.length > 0) {
      return cand;
    }
  }
  return players[(idx + 1) % players.length];
}

// ----------------------------------------------------
// 6. 玩家提示候选生成 (Hint Candidates)
// ----------------------------------------------------

export function getYansanHintCandidates(
  cards: Card[],
  lastValidHand: { playerId: string; hand: CardHand } | null,
  isFirstTrick: boolean = false,
  starterCardId: string = 'diamond-4'
): CardHand[] {
  if (!cards || cards.length === 0) return [];

  const sorted = sortYansanCards(cards);

  // 1. 接牌场景 (仅当需要压制对手打出的牌时)
  if (lastValidHand && lastValidHand.playerId !== 'player-0') {
    return findYansanBeatingHands(sorted, lastValidHand.hand);
  }

  // 2. 首出场景 (必须包含方块 4)
  if (isFirstTrick) {
    const starterCard = sorted.find(c => c.id === starterCardId) || sorted.find(c => c.rank === '4') || sorted[0];
    const results: CardHand[] = [];
    const seenSigs = new Set<string>();

    const addH = (h: CardHand | null) => {
      if (h) {
        const sig = h.cards.map(c => c.id).sort().join(',');
        if (!seenSigs.has(sig)) {
          seenSigs.add(sig);
          results.push(h);
        }
      }
    };

    // A. 包含 ♦4 的顺子 (排除炸弹四带一，严防首出炸弹)
    const fiveCombos = findAllYansanFiveCardCombos(sorted).filter(
      f => f.type !== 'FOUR_OF_A_KIND' && f.cards.some(c => c.id === starterCard.id)
    );
    fiveCombos.forEach(addH);

    // B. 包含 ♦4 的三条 4
    const rank4 = sorted.filter(c => c.rank === '4');
    if (rank4.length >= 3) {
      addH(analyzeYansanHand(rank4.slice(0, 3)));
    }

    // C. 包含 ♦4 的对 4
    if (rank4.length >= 2) {
      addH(analyzeYansanHand([starterCard, rank4.find(c => c.id !== starterCard.id)!]));
    }

    // D. 单张 ♦4
    addH(analyzeYansanHand([starterCard]));

    return results.length > 0 ? results : [analyzeYansanHand([starterCard])!];
  }

  // 3. 自由领牌场景
  const candidates: CardHand[] = [];
  const seenSigs = new Set<string>();

  const addH = (h: CardHand | null) => {
    if (h) {
      const sig = h.cards.map(c => c.id).sort().join(',');
      if (!seenSigs.has(sig)) {
        seenSigs.add(sig);
        candidates.push(h);
      }
    }
  };

  const partition = partitionYansanHand(sorted);

  // A. 五张成型牌
  const fiveHands = partition.hands.filter(h => h.categoryWeight >= 10 && h.type !== 'FOUR_OF_A_KIND');
  fiveHands.forEach(addH);

  // B. 弱散牌单张
  const lowSingles = partition.unpairedSingles;
  if (lowSingles.length > 0) {
    addH(analyzeYansanHand([lowSingles[0]]));
  }

  // C. 对子
  const pairHands = partition.hands.filter(h => h.type === 'PAIR');
  pairHands.forEach(addH);

  // D. 三条
  const tripHands = partition.hands.filter(h => h.type === 'TRIPLE');
  tripHands.forEach(addH);

  // E. 兜底最小单张
  addH(analyzeYansanHand([sorted[0]]));

  return candidates.length > 0 ? candidates : [analyzeYansanHand([sorted[0]])!];
}

// ----------------------------------------------------
// 7. 烟三 AI 主决策入口 (Master Decision Entry)
// ----------------------------------------------------

export function aiChooseYansanPlay(
  player: Player,
  cards: Card[],
  lastValidHand: { playerId: string; hand: CardHand } | null,
  players: Player[],
  isFirstTrick: boolean = false,
  starterCardId: string = 'diamond-4',
  friendship?: YansanFriendship
): Card[] {
  if (!cards || cards.length === 0) return [];

  // 1. 自由领牌 (本轮我是首出领牌者，或者桌面清空轮到我自由出牌)
  if (!lastValidHand || lastValidHand.playerId === player.id) {
    return chooseYansanLeadingCards(cards, isFirstTrick, starterCardId, players, player.id);
  }

  // 2. 跟牌压制 (接上家的牌)
  return chooseYansanBeatingMove(
    cards,
    lastValidHand.hand,
    lastValidHand.playerId,
    players,
    player,
    friendship
  );
}
