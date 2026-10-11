import React, { useState, useEffect, useRef, useMemo } from 'react';
import { GameState, Card, CardHand, Player } from '../types/game';
import {
  SUIT_SYMBOLS,
  analyzeHand,
  canBeat,
  getHandDescription,
  sortCards,
  sortCardsByRank,
  sortCardsByMode,
  HandSortMode,
  calculateSettlement,
  getEffectiveCards,
  calculateMatchSettlement,
} from '../utils/chudadiRules';
import {
  analyzeYansanHand,
  canYansanBeat,
  sortYansanCardsDesc,
  sortYansanCardsAsc,
  sortYansanCardsByPattern,
  sortYansanCardsBySuit,
  initYansanFriendship,
  checkYansanGameOver,
  calculateYansanSettlement,
} from '../utils/yansanRules';
import {
  aiChoosePlay,
  chooseLeadingCards,
  findBeatingHands,
  getHintCandidates,
} from '../utils/chudadiAI';
import {
  aiChooseYansanPlay,
  findYansanBeatingHands,
  getYansanHintCandidates,
  chooseYansanLeadingCards,
} from '../utils/yansanAI';
import { sounds } from '../utils/audio';
import { useAppTheme } from '../utils/themeContext';
import { useLandscape } from './LandscapeWrapper';
import { SvgCard } from './SvgCard';
import { RoundSummaryModal, MatchSettlementModal, YansanSettlementModal } from './SettlementModals';
import { InGameChatModal, InGameChatTab } from './InGameChatModal';
import {
  Play,
  Trophy,
  Crown,
  User,
  Bot,
  Sparkles,
  Home,
  Flame,
  Volume2,
  VolumeX,
  MessageSquare,
  SlidersHorizontal,
  X,
  Shuffle,
  Mic,
  Send,
  Radio,
  AlertTriangle,
  Zap,
  Palette,
  Maximize2,
  Minimize2,
  RotateCcw,
  SkipForward,
  Lightbulb,
} from 'lucide-react';
import { voiceEngine, DIALECT_OPTIONS, VoiceDialect, ChatMessage } from '../utils/voiceSystem';

interface TabletopGameViewProps {
  gameState: GameState;
  onUpdateState: (newState: GameState) => void;
  onStartNewGame: () => void;
  onStartNewMatch?: () => void;
  onChangeTable?: () => void;
  onBackToLobby: () => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
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

const CHAT_EMOJIS = ['💣', '🌹', '☕', '🐔', '🍺', '👍'];

export const TabletopGameView: React.FC<TabletopGameViewProps> = ({
  gameState,
  onUpdateState,
  onStartNewGame,
  onStartNewMatch,
  onChangeTable,
  onBackToLobby,
  soundEnabled,
  onToggleSound,
}) => {
  const { theme, toggleTheme, themeConfig } = useAppTheme();
  const { isFullscreen, toggleFullscreen } = useLandscape();
  const [selectedCardIds, setSelectedCardIds] = useState<string[]>([]);
  const [speechBubble, setSpeechBubble] = useState<{ [playerId: string]: string }>({});
  const [passStatuses, setPassStatuses] = useState<{ [playerId: string]: { text: string; timestamp: number } }>({});
  const [countdown, setCountdown] = useState<number>(20);

  // Advanced interactive features: 手牌排序模式 (大小序 ➔ 点数序 ➔ 牌型序 ➔ 花色序)
  const [sortMode, setSortMode] = useState<HandSortMode>('DESC');
  const [hintIndex, setHintIndex] = useState<number>(0);
  const lastAutoHintTurnRef = useRef<string>('');
  const [isAutoPlay, setIsAutoPlay] = useState<boolean>(false);
  const [showChatModal, setShowChatModal] = useState<boolean>(false);
  const [customChatText, setCustomChatText] = useState<string>('');
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordingSec, setRecordingSec] = useState<number>(0);
  const [activeVoicePlayer, setActiveVoicePlayer] = useState<string | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatTab, setChatTab] = useState<InGameChatTab>('phrases');
  // Record all cards played by each player in the current round
  const [playedHistory, setPlayedHistory] = useState<{ [playerId: string]: Card[] }>({});
  // Record the latest hand of cards played by each player in the trick/round
  const [lastPlayedByPlayer, setLastPlayedByPlayer] = useState<{ [playerId: string]: Card[] }>({});
  // Track player who won trick without contest (unbeatable hand, e.g. ♠A)
  const [fastContinuedPlayerName, setFastContinuedPlayerName] = useState<string | null>(null);
  // Turn action counter to guarantee AI / autoplay turn triggers even on fast-continue
  const [turnStep, setTurnStep] = useState<number>(0);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const recordTimerRef = useRef<NodeJS.Timeout | null>(null);
  const pointerDownTimeRef = useRef<number>(0);
  const isHoldingRecordRef = useRef<boolean>(false);
  const isPointerDownRef = useRef<boolean>(false);
  const swipedCardsRef = useRef<Set<string>>(new Set());

  const currentPlayer = gameState.players[gameState.currentPlayerIndex];
  const isHumanCurrent = gameState.currentPlayerIndex === 0;

  // Drag selection listeners
  useEffect(() => {
    const handleUp = () => {
      isPointerDownRef.current = false;
      swipedCardsRef.current.clear();
    };
    window.addEventListener('pointerup', handleUp);
    return () => window.removeEventListener('pointerup', handleUp);
  }, []);

  const showBubble = (playerId: string, text: string) => {
    setSpeechBubble(prev => ({ ...prev, [playerId]: text }));
    setActiveVoicePlayer(playerId);
    setTimeout(() => {
      setActiveVoicePlayer(prev => (prev === playerId ? null : prev));
    }, 2400);
    setTimeout(() => {
      setSpeechBubble(prev => {
        const next = { ...prev };
        delete next[playerId];
        return next;
      });
    }, 3200);
  };

  const human = gameState.players[0] || { cards: [], name: '玩家', score: 0, position: 'bottom', id: 'player-0' };
  const botRight = gameState.players[1] || { cards: [], name: '东家', score: 0, position: 'right', id: 'player-1', avatar: '🐱' };
  const botTop = gameState.players[2] || { cards: [], name: '北家', score: 0, position: 'top', id: 'player-2', avatar: '👑' };
  const botLeft = gameState.players[3] || { cards: [], name: '西家', score: 0, position: 'left', id: 'player-3', avatar: '🤖' };

  const isYansan = gameState.room.gameType === 'yansan' || gameState.room.id.startsWith('room-yansan');

  // 当前玩家所有可出的提示候选组合 (跟牌压制牌或领牌开局推荐牌)
  const hintCandidates = useMemo(() => {
    if (!isHumanCurrent || gameState.phase !== 'PLAYING') return [];
    if (!human.cards || human.cards.length === 0) return [];
    if (isYansan) {
      return getYansanHintCandidates(
        human.cards,
        gameState.lastValidHand,
        gameState.isFirstTrick,
        gameState.starterCardId || 'diamond-4'
      );
    }
    return getHintCandidates(
      human.cards,
      gameState.lastValidHand,
      gameState.isFirstTrick,
      gameState.starterCardId
    );
  }, [
    isHumanCurrent,
    gameState.phase,
    human.cards,
    gameState.lastValidHand,
    gameState.isFirstTrick,
    gameState.starterCardId,
    isYansan,
  ]);

  // 轮到出牌且有可出的牌时才显示提示按钮 (无压制牌时不显示)
  const shouldShowHintButton = isHumanCurrent && gameState.phase === 'PLAYING' && hintCandidates.length > 0;

  const currentHumanTurnKey = `${gameState.roundNumber}-${gameState.matchNumber}-${gameState.currentPlayerIndex}-${gameState.lastValidHand ? gameState.lastValidHand.playerId + '-' + gameState.lastValidHand.hand.cards.map(c => c.id).join('') : 'lead'}-${turnStep}`;

  // 轮到出牌处理：
  // 1. 【报单剩 1 张牌专属自动化】：
  //    - 如果要不起，自动点“过”；
  //    - 如果要得起（或自由出牌），自动打出最后这张牌直接赢！
  // 2. 多张手牌常规轮次：自动弹起最优压制牌，要不起时清空弹起并提示，由玩家自主决定点击“过”或出牌
  useEffect(() => {
    if (!isHumanCurrent || gameState.phase !== 'PLAYING') {
      return;
    }

    if (lastAutoHintTurnRef.current !== currentHumanTurnKey) {
      lastAutoHintTurnRef.current = currentHumanTurnKey;
      setHintIndex(0);

      // 【核心规则】：只在剩最后 1 张牌（报单）时，才触发自动点“过”和自动出牌获胜
      if (human.cards.length === 1) {
        // A. 剩 1 张牌且要不起 ➔ 自动点“过”
        if (
          gameState.lastValidHand &&
          gameState.lastValidHand.playerId !== 'player-0' &&
          hintCandidates.length === 0
        ) {
          setSelectedCardIds([]);
          showBubble('player-0', '只剩1张要不起，自动过');
          const passTimer = setTimeout(() => {
            executePass(0);
          }, 550);
          return () => clearTimeout(passTimer);
        }

        // B. 剩 1 张牌且要得起（或可自由出牌） ➔ 自动出牌绝杀！
        if (hintCandidates.length > 0) {
          const lastCardHand = hintCandidates[0];
          setSelectedCardIds(lastCardHand.cards.map(c => c.id));
          sounds.playClick();
          showBubble('player-0', `最后1张牌！自动打出【${lastCardHand.cards[0].rank}】！`);
          const playTimer = setTimeout(() => {
            executePlay(0, lastCardHand.cards, lastCardHand);
            setSelectedCardIds([]);
          }, 500);
          return () => clearTimeout(playTimer);
        }
      }

      // 常规手牌（多于 1 张牌）：
      // 有压制牌时自动弹起第 1 组最优候选牌，绝不自动点过
      if (hintCandidates.length > 0) {
        const firstTarget = hintCandidates[0];
        setSelectedCardIds(firstTarget.cards.map(c => c.id));
        sounds.playClick();
        showBubble(
          'player-0',
          hintCandidates.length > 1
            ? `提示 (1/${hintCandidates.length})：出【${getHandDescription(firstTarget)}】`
            : `提示：出【${getHandDescription(firstTarget)}】`
        );
      } else {
        // 多张手牌且要不起：清空选中并温和提示，保留玩家手动点击“过”的控制权
        setSelectedCardIds([]);
        if (gameState.lastValidHand && gameState.lastValidHand.playerId !== 'player-0') {
          showBubble('player-0', '没有大过上家的牌，请过！');
        }
      }
    }
  }, [isHumanCurrent, gameState.phase, currentHumanTurnKey, hintCandidates, gameState.lastValidHand, human.cards.length]);

  // Reset played history and pass statuses on each new round / match
  useEffect(() => {
    setPlayedHistory({});
    setLastPlayedByPlayer({});
    setPassStatuses({});
    setFastContinuedPlayerName(null);
    setHintIndex(0);
    lastAutoHintTurnRef.current = '';
    setTurnStep(s => s + 1);
  }, [gameState.roundNumber, gameState.matchNumber, gameState.phase === 'LOBBY', gameState.phase === 'DEALING']);

  // Turn Countdown Timer
  useEffect(() => {
    if (gameState.phase === 'LOBBY' || gameState.phase === 'GAME_OVER' || gameState.phase === 'DEALING') {
      return;
    }

    let initialCountdown = isHumanCurrent ? (isAutoPlay ? 2 : 20) : 3;
    setCountdown(initialCountdown);

    if (timerRef.current) clearInterval(timerRef.current);

    timerRef.current = setInterval(() => {
      initialCountdown -= 1;
      if (initialCountdown <= 0) {
        if (timerRef.current) clearInterval(timerRef.current);
        setCountdown(0);
        if (isHumanCurrent) {
          handleTimeoutAction();
        }
      } else {
        setCountdown(initialCountdown);
      }
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [gameState.currentPlayerIndex, gameState.phase, isAutoPlay, turnStep]);

  // Clear pass status for active player when their turn starts so avatar image restores
  useEffect(() => {
    if (gameState.phase === 'PLAYING') {
      const curPlayer = gameState.players[gameState.currentPlayerIndex];
      if (curPlayer && passStatuses[curPlayer.id]) {
        setPassStatuses(prev => {
          const next = { ...prev };
          delete next[curPlayer.id];
          return next;
        });
      }
    }
  }, [gameState.currentPlayerIndex, gameState.phase]);

  // Timeout action for human
  const handleTimeoutAction = () => {
    if (gameState.phase === 'PLAYING') {
      if (gameState.lastValidHand && gameState.lastValidHand.playerId !== 'player-0') {
        handleHumanPass();
      } else {
        // Leading turn timeout: auto play lowest legal lead card
        const human = gameState.players[0];
        const opening = isYansan
          ? chooseYansanLeadingCards(
              human.cards,
              gameState.isFirstTrick,
              gameState.starterCardId || 'diamond-4',
              gameState.players,
              human.id
            )
          : chooseLeadingCards(
              human.cards,
              gameState.isFirstTrick,
              gameState.starterCardId,
              gameState.players,
              human.id
            );
        if (opening.length > 0) {
          const h = isYansan ? analyzeYansanHand(opening) : analyzeHand(opening);
          if (h) executePlay(0, opening, h);
        }
      }
    }
  };

  // Card Selection logic
  const toggleSelectCard = (cardId: string) => {
    sounds.playClick();
    setSelectedCardIds(prev =>
      prev.includes(cardId) ? prev.filter(id => id !== cardId) : [...prev, cardId]
    );
  };

  const handleCardClick = (cardId: string, e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    toggleSelectCard(cardId);
  };

  const handleCardPointerDown = (cardId: string) => {
    isPointerDownRef.current = true;
    swipedCardsRef.current = new Set([cardId]);
  };

  const handleCardPointerEnter = (cardId: string) => {
    if (isPointerDownRef.current && !swipedCardsRef.current.has(cardId)) {
      swipedCardsRef.current.add(cardId);
      toggleSelectCard(cardId);
    }
  };

  const handleTouchStart = (cardId: string) => {
    swipedCardsRef.current = new Set([cardId]);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    if (!touch) return;
    const elem = document.elementFromPoint(touch.clientX, touch.clientY);
    const cardElem = elem?.closest('[data-card-id]');
    const cardId = cardElem?.getAttribute('data-card-id');
    if (cardId && !swipedCardsRef.current.has(cardId)) {
      swipedCardsRef.current.add(cardId);
      toggleSelectCard(cardId);
    }
  };

  const handleTouchEnd = () => {
    swipedCardsRef.current.clear();
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameState.phase !== 'PLAYING' || !isHumanCurrent || isAutoPlay) return;
      if (e.key === 'Enter') {
        if (selectedCardIds.length > 0) {
          handleHumanPlay();
        }
      } else if (e.key === 'p' || e.key === 'P' || e.key === ' ') {
        if (gameState.lastValidHand && gameState.lastValidHand.playerId !== 'player-0') {
          e.preventDefault();
          handleHumanPass();
        }
      } else if (e.key === 'Escape') {
        setSelectedCardIds([]);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameState.phase, isHumanCurrent, isAutoPlay, selectedCardIds, gameState.lastValidHand]);

  // Human Play Card
  const handleHumanPlay = () => {
    if (gameState.phase !== 'PLAYING' || !isHumanCurrent) return;
    const human = gameState.players[0];
    const cardsToPlay = human.cards.filter(c => selectedCardIds.includes(c.id));

    if (cardsToPlay.length === 0) return;

    // Check if first trick requires starter card (diamond-4 for Yansan, diamond-2 for Chudadi)
    if (gameState.isFirstTrick && gameState.starterCardId && !cardsToPlay.some(c => c.id === gameState.starterCardId)) {
      sounds.playPass();
      showBubble('player-0', isYansan ? '首出必须包含方块4 (♦4)！' : '首出必须包含方块2 (♦2)！');
      return;
    }

    const hand = isYansan ? analyzeYansanHand(cardsToPlay) : analyzeHand(cardsToPlay);
    if (!hand) {
      sounds.playPass();
      showBubble('player-0', isYansan ? '不符合烟三牌型规则！' : '不符合锄大地牌型规则！');
      return;
    }

    // Check if can beat current trick on table (only when there is an active opponent hand on table)
    if (
      gameState.lastValidHand &&
      gameState.lastValidHand.playerId !== human.id
    ) {
      const beatsLast = isYansan
        ? canYansanBeat(gameState.lastValidHand.hand, hand)
        : canBeat(gameState.lastValidHand.hand, hand);

      if (!beatsLast) {
        sounds.playPass();
        showBubble('player-0', `压不过【${getHandDescription(gameState.lastValidHand.hand)}】！`);
        return;
      }
    }

    executePlay(0, cardsToPlay, hand);
    setSelectedCardIds([]);
  };

  const handleHumanPass = () => {
    if (
      gameState.phase !== 'PLAYING' ||
      !isHumanCurrent ||
      !gameState.lastValidHand ||
      gameState.lastValidHand.playerId === 'player-0'
    ) {
      return;
    }
    sounds.playPass();
    executePass(0);
    setSelectedCardIds([]);
  };

  // 手动点击提示：循环切换不同的压制牌组合
  const handleHint = () => {
    if (hintCandidates.length === 0) return;
    sounds.playClick();

    const nextIdx = (hintIndex + 1) % hintCandidates.length;
    setHintIndex(nextIdx);
    const target = hintCandidates[nextIdx];
    setSelectedCardIds(target.cards.map(c => c.id));

    showBubble(
      'player-0',
      hintCandidates.length > 1
        ? `提示 (${nextIdx + 1}/${hintCandidates.length})：出【${getHandDescription(target)}】`
        : `提示：出【${getHandDescription(target)}】`
    );
  };

  // Send fast chat phrase or voice
  const handleSendChat = (phrase: string, audioUrl?: string, durationSec?: number) => {
    const isVoiceMsg = !!audioUrl;
    showBubble('player-0', phrase);
    sounds.playClick();

    const human = gameState.players[0];
    const newMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      senderId: 'player-0',
      senderName: human.name,
      avatar: '😎',
      type: isVoiceMsg ? 'voice' : phrase.length <= 2 && CHAT_EMOJIS.includes(phrase) ? 'emoji' : 'text',
      content: phrase,
      audioUrl,
      durationSec: durationSec || (isVoiceMsg ? 2 : undefined),
      timestamp: Date.now(),
    };

    setChatMessages(prev => [...prev.slice(-15), newMsg]);

    if (isVoiceMsg && audioUrl) {
      voiceEngine.playAudio(audioUrl);
    } else if (!isVoiceMsg) {
      if (phrase === '💣') {
        sounds.playBomb();
      } else if (phrase === '👍' || phrase === '🌹') {
        sounds.playWin();
      } else {
        sounds.speak(phrase, 'player-0');
      }
    }

    // AI bot simulated voice response
    setTimeout(() => {
      const botIdx = Math.floor(Math.random() * 3) + 1; // 1, 2, or 3
      const bot = gameState.players[botIdx];
      const botReplies = [
        '哈哈，看我这把怎么打！',
        '别急别急，大牌在后头！',
        '牌打得不错嘛！',
        '稳住，这把我们必胜！',
        '配合太默契了，赞！',
        '收到收到，看我的压轴王牌！',
      ];
      const reply = botReplies[Math.floor(Math.random() * botReplies.length)];
      showBubble(bot.id, reply);
      sounds.speak(reply, bot.id);

      const botMsg: ChatMessage = {
        id: `msg-${Date.now()}`,
        senderId: bot.id,
        senderName: bot.name,
        avatar: bot.avatar,
        type: 'text',
        content: reply,
        timestamp: Date.now(),
      };
      setChatMessages(prev => [...prev.slice(-15), botMsg]);
    }, 1500);
  };

  // Start Voice Recording (最长20秒，如果不点击“点击发送语音”，满20秒就自动发送)
  const handleStartRecord = async () => {
    // If already in recording state, tapping completes and sends!
    if (isRecording) {
      handleStopRecord();
      return;
    }

    try {
      setIsRecording(true);
      setRecordingSec(0);
      sounds.playClick();
      const res = await voiceEngine.startRecording();
      if (res.success) {
        if (recordTimerRef.current) clearInterval(recordTimerRef.current);
        recordTimerRef.current = setInterval(() => {
          setRecordingSec(prev => {
            if (prev >= 19) {
              // 满20秒自动发送
              if (recordTimerRef.current) {
                clearInterval(recordTimerRef.current);
                recordTimerRef.current = null;
              }
              setTimeout(() => {
                handleStopRecord();
              }, 0);
              return 20;
            }
            return prev + 1;
          });
        }, 1000);
      } else {
        setIsRecording(false);
        const msg = res.message || '麦克风暂不可用';
        showBubble('player-0', `⚠️ ${msg}`);
      }
    } catch {
      setIsRecording(false);
      showBubble('player-0', '⚠️ 麦克风无法访问，可使用快捷短语/战术呼叫');
    }
  };

  // Stop Voice Recording and Send
  const handleStopRecord = async () => {
    if (recordTimerRef.current) {
      clearInterval(recordTimerRef.current);
      recordTimerRef.current = null;
    }
    setIsRecording(false);
    const result = await voiceEngine.stopRecording();
    if (result && result.audioUrl) {
      handleSendChat(`🎙️ 语音消息 (${result.durationSec}")`, result.audioUrl, result.durationSec);
    }
  };

  // Cancel Voice Recording without sending
  const handleCancelRecord = () => {
    if (recordTimerRef.current) {
      clearInterval(recordTimerRef.current);
      recordTimerRef.current = null;
    }
    setIsRecording(false);
    voiceEngine.cancelRecording();
    showBubble('player-0', '已取消录音');
  };

  // Execute Play Action
  const executePlay = (playerIdx: number, cards: Card[], hand: CardHand) => {
    const player = gameState.players[playerIdx];

    // If starting a new trick (leader free turn because lastValidHand is null),
    // clear pass statuses and clear previous trick cards so only this active lead shows
    const isLeadingNewTrick = !gameState.lastValidHand;

    // Reset or clear pass status
    setPassStatuses(prev => {
      if (isLeadingNewTrick) return {};
      if (!prev[player.id]) return prev;
      const next = { ...prev };
      delete next[player.id];
      return next;
    });

    // Reset or update cards shown in avatars for this trick
    // When leading a new trick, clear old cards from other players so only THIS player's active lead shows
    setLastPlayedByPlayer(prev => {
      if (isLeadingNewTrick) {
        return { [player.id]: cards };
      }
      return {
        ...prev,
        [player.id]: cards,
      };
    });

    setFastContinuedPlayerName(null);
    if (isLeadingNewTrick) {
      setPassStatuses({});
    }

    setPlayedHistory(prev => ({
      ...prev,
      [player.id]: [...(prev[player.id] || []), ...cards],
    }));

    // Play card sound & Voice speech
    sounds.playCard();
    sounds.speakHand(hand.type, cards, !!gameState.lastValidHand, player.id);

    // Play bomb sound effect for big hands without popping up banner
    if (hand.type === 'STRAIGHT_FLUSH' || hand.type === 'FOUR_OF_A_KIND') {
      sounds.playBomb();
    }

    const remainingCards = player.cards.filter(c => !cards.some(tc => tc.id === c.id));
    const newPlayers = [...gameState.players];
    newPlayers[playerIdx] = {
      ...player,
      cards: remainingCards,
    };

    // Alarm warnings: 头像边框红蓝交替闪烁，保留语音播报与警报音
    if (remainingCards.length === 2) {
      sounds.playAlarm();
      setTimeout(() => sounds.speak('我就剩两张牌啦！', player.id), 300);
    } else if (remainingCards.length === 1) {
      sounds.playAlarm();
      setTimeout(() => sounds.speak('我就剩一张牌啦！', player.id), 300);
    }

    // Check if player cleared hand
    if (remainingCards.length === 0) {
      if (isYansan) {
        // 烟三找朋友规则：记录打完牌的玩家顺序
        const currentRankOrder = gameState.finishedRankOrder || [];
        const newRankOrder = currentRankOrder.includes(playerIdx)
          ? currentRankOrder
          : [...currentRankOrder, playerIdx];

        // 检查是否达成烟三终局条件 (全胜/半胜/独保达成/决出前三名等)
        const gameOverCheck = checkYansanGameOver(
          newRankOrder,
          gameState.yansanFriendship,
          newPlayers,
          gameState.room.baseScore
        );

        if (gameOverCheck.isGameOver) {
          handleGameOver(playerIdx, newPlayers, hand, newRankOrder);
          return;
        }

        // 游戏尚未结束！打完牌的玩家进入等待，剩余未打完玩家继续争夺
        sounds.playClick();
        if (playerIdx === 0) {
          sounds.playWin();
          showBubble('player-0', `手牌已出完！第 ${newRankOrder.length} 名！静待盟友结算！`);
        } else {
          showBubble(player.id, `出完手牌！第 ${newRankOrder.length} 名！`);
        }

        // 将出牌权顺延至下一个手牌未打完的玩家
        let nextTurn = (playerIdx + 1) % 4;
        let loopCount = 0;
        while (newPlayers[nextTurn].cards.length === 0 && loopCount < 4) {
          nextTurn = (nextTurn + 1) % 4;
          loopCount++;
        }

        setTurnStep(s => s + 1);
        onUpdateState({
          ...gameState,
          players: newPlayers,
          finishedRankOrder: newRankOrder,
          currentPlayerIndex: nextTurn,
          lastValidHand: { playerId: player.id, hand },
          passCount: 0,
          isFirstTrick: false,
          trickLeaderIndex: playerIdx,
        });
        return;
      } else {
        // 锄大地规则：率先打完手牌者胜出
        handleGameOver(playerIdx, newPlayers, hand);
        return;
      }
    }

    // --- 【极致体验】全场无压制推论判定 ---
    // 全场无压制按四个玩家已经打出的牌推论：
    // 即全场其余三位玩家手中尚未打出的牌，即使相互换牌（将三家剩余手牌合并为一体），也无法组成任何能大过当前 hand 的合法牌型。
    // 例如打出三个A（此时全场无人能打出更大三张），即使其他三位玩家相互换牌也打不起，无需等待，直接继续出牌；
    // 反之如果打出三个K，即使当前三位玩家各自的手牌都要不起，但由于全场其余牌中可能凑出三个A，依然需要玩家轮流点“过”才能继续出牌！
    const otherPlayers = newPlayers.filter((_, idx) => idx !== playerIdx);
    const pooledOtherCards = otherPlayers.flatMap(other => other.cards || []);
    const beatingHandsFromPool = isYansan
      ? findYansanBeatingHands(pooledOtherCards, hand)
      : findBeatingHands(pooledOtherCards, hand);
    const isUnbeatable = beatingHandsFromPool.length === 0;

    if (isUnbeatable) {
      // 全场其余三位玩家即使相互换牌也打不起（例如黑桃A，或黑桃A已出后的红桃A，或全场最大的三张/对子/同花顺等）
      // 其余玩家头像框直接显示 "过"，该玩家无需等待其他玩家，直接继续出牌！
      const autoPassStatuses: { [pid: string]: { text: string; timestamp: number } } = {};
      otherPlayers.forEach(other => {
        autoPassStatuses[other.id] = { text: '过', timestamp: Date.now() };
      });
      setPassStatuses(autoPassStatuses);
      setFastContinuedPlayerName(player.id === 'player-0' ? '你' : player.name);

      setTurnStep(s => s + 1);

      // 直接把出牌权保持在当前玩家手中，获得自由领牌权（lastValidHand: null）直接继续出牌！
      onUpdateState({
        ...gameState,
        players: newPlayers,
        currentPlayerIndex: playerIdx, // 依然是该玩家出牌！无需多余等待！
        lastValidHand: null,          // 获得自由领牌权，直接继续出牌！
        passCount: 0,
        isFirstTrick: false,
        trickLeaderIndex: playerIdx,
      });
      return;
    }

    // 正常轮转：全场牌池中理论上仍有可能打得起此牌，轮流出牌或点“过”
    setTurnStep(s => s + 1);
    const nextTurn = (playerIdx + 1) % 4;
    onUpdateState({
      ...gameState,
      players: newPlayers,
      currentPlayerIndex: nextTurn,
      lastValidHand: { playerId: player.id, hand },
      passCount: 0,
      isFirstTrick: false,
      trickLeaderIndex: playerIdx,
    });
  };

  // Execute Pass Action
  const executePass = (playerIdx: number) => {
    const player = gameState.players[playerIdx];
    sounds.playPass();
    sounds.speak('过', player.id);

    // Record '过' on player's avatar frame
    const passLabel = '过';
    setPassStatuses(prev => ({
      ...prev,
      [player.id]: { text: passLabel, timestamp: Date.now() },
    }));

    const newPassCount = gameState.passCount + 1;
    let nextLastValid = gameState.lastValidHand;
    let nextLeader = gameState.trickLeaderIndex;

    // When all other active players pass in a row, remaining active leader gets free lead!
    // Active players are players who still have cards
    const activePlayersCount = gameState.players.filter(p => p.cards && p.cards.length > 0).length;
    const leaderHasCards = typeof nextLeader === 'number' && gameState.players[nextLeader].cards && gameState.players[nextLeader].cards.length > 0;
    const requiredPassCount = leaderHasCards ? Math.max(1, activePlayersCount - 1) : Math.max(1, activePlayersCount);

    let nextTurn = (playerIdx + 1) % 4;
    // Skip players with 0 cards
    let loop = 0;
    while (gameState.players[nextTurn].cards.length === 0 && loop < 4) {
      nextTurn = (nextTurn + 1) % 4;
      loop++;
    }

    if (newPassCount >= requiredPassCount || newPassCount >= 3) {
      nextLastValid = null;
      if (typeof nextLeader === 'number' && gameState.players[nextLeader].cards.length > 0) {
        nextTurn = nextLeader;
      } else {
        // If previous leader has already finished their cards, passing turn goes to next active player
        let activeTurn = typeof nextLeader === 'number' ? (nextLeader + 1) % 4 : (playerIdx + 1) % 4;
        let l = 0;
        while (gameState.players[activeTurn].cards.length === 0 && l < 4) {
          activeTurn = (activeTurn + 1) % 4;
          l++;
        }
        nextTurn = activeTurn;
        nextLeader = activeTurn;
      }
      setTimeout(() => {
        setPassStatuses({});
      }, 1200);
    }

    setTurnStep(s => s + 1);

    onUpdateState({
      ...gameState,
      currentPlayerIndex: nextTurn,
      passCount: newPassCount >= requiredPassCount || newPassCount >= 3 ? 0 : newPassCount,
      lastValidHand: nextLastValid,
      trickLeaderIndex: nextLeader,
    });
  };

  // Game Over Round / Match Handler
  const handleGameOver = (
    winnerIdx: number,
    finalPlayers: Player[],
    finalHand: CardHand,
    finalRankOrder?: number[]
  ) => {
    const winner = finalPlayers[winnerIdx];

    if (isYansan) {
      // 烟三找朋友专属算分与结算
      const rankOrder = finalRankOrder || gameState.finishedRankOrder || [winnerIdx];
      const yansanResult = calculateYansanSettlement(
        rankOrder,
        gameState.yansanFriendship,
        gameState.room.baseScore,
        finalPlayers
      );

      const settledPlayers = finalPlayers.map((p, idx) => {
        const change = yansanResult.coinChanges[idx] || 0;
        return {
          ...p,
          score: Math.max(0, p.score + change),
        };
      });

      const humanPoints = yansanResult.pointsMap[0] || 0;
      if (humanPoints > 0) {
        sounds.playWin();
        sounds.playCoins();
        sounds.speak(`本局大捷！${yansanResult.title}！`, 'player-0');
      } else if (humanPoints < 0) {
        sounds.playLose();
        sounds.speak(`本局遗憾！${yansanResult.title}！`, 'player-0');
      } else {
        sounds.playClick();
        sounds.speak('本局平局打和，互不输赢！', 'player-0');
      }

      onUpdateState({
        ...gameState,
        players: settledPlayers,
        phase: 'YANSAN_SETTLEMENT',
        winnerIndex: winnerIdx,
        finishedRankOrder: rankOrder,
        yansanResult,
      });
      return;
    }

    // Calculate effective cards for this round and accumulate for each player (Chudadi)
    const updatedPlayers = finalPlayers.map((p, idx) => {
      const rawCount = p.cards ? p.cards.length : 0;
      const effRound = getEffectiveCards(rawCount).effective;
      const prevAcc = p.accumulatedCards || 0;
      return {
        ...p,
        accumulatedCards: prevAcc + effRound,
      };
    });

    // Check if any player's accumulated cards >= 100 (Triggers Match Final Settlement!)
    const matchEnded = updatedPlayers.some(p => p.accumulatedCards >= 100);

    if (matchEnded) {
      // Calculate final match score settlement with rounding to tens (四舍五入)
      const matchSettlements = calculateMatchSettlement(updatedPlayers, gameState.room.baseScore);
      const settledPlayers = updatedPlayers.map((p, idx) => {
        const st = matchSettlements.find(s => s.playerIndex === idx);
        return {
          ...p,
          score: st ? st.finalScore : p.score,
        };
      });

      if (winner.id === 'player-0') {
        sounds.playWin();
        sounds.playCoins();
        sounds.speak('比赛结束！大结算发分啦！', 'player-0');
      } else {
        sounds.playLose();
        sounds.speak('比赛结束，大结算算分啦！', 'player-0');
      }

      onUpdateState({
        ...gameState,
        players: settledPlayers,
        phase: 'MATCH_SETTLEMENT',
        winnerIndex: winnerIdx,
      });
    } else {
      // Round Summary (Keep playing, accumulate cards, winner leads next round!)
      if (winner.id === 'player-0') {
        sounds.playWin();
        sounds.speak('本局胜利！下局由我优先出牌！', 'player-0');
      } else {
        sounds.playClick();
        sounds.speak(`本局结束，下局由${winner.name}优先出牌！`, 'player-0');
      }

      onUpdateState({
        ...gameState,
        players: updatedPlayers,
        phase: 'ROUND_SUMMARY',
        winnerIndex: winnerIdx,
      });
    }
  };

  // AUTOPLAY LOGIC FOR HUMAN
  useEffect(() => {
    if (!isAutoPlay || !isHumanCurrent || gameState.phase !== 'PLAYING') {
      return;
    }

    const timer = setTimeout(() => {
      const human = gameState.players[0];
      const play = isYansan
        ? aiChooseYansanPlay(
            human,
            human.cards,
            gameState.lastValidHand,
            gameState.players,
            gameState.isFirstTrick,
            gameState.starterCardId || 'diamond-4'
          )
        : aiChoosePlay(
            human,
            human.cards,
            gameState.lastValidHand,
            gameState.players,
            gameState.isFirstTrick,
            gameState.starterCardId,
            playedHistory
          );

      if (play.length === 0) {
        executePass(0);
      } else {
        const hand = isYansan ? analyzeYansanHand(play) : analyzeHand(play);
        if (hand) {
          executePlay(0, play, hand);
        } else {
          executePass(0);
        }
      }
    }, 800);

    return () => clearTimeout(timer);
  }, [isAutoPlay, isHumanCurrent, gameState.phase, gameState.currentPlayerIndex, gameState.lastValidHand, turnStep, playedHistory, isYansan]);

  // AI PLAYERS TURN
  useEffect(() => {
    if (isHumanCurrent || gameState.phase !== 'PLAYING') {
      return;
    }

    const curr = gameState.players[gameState.currentPlayerIndex];
    if (!curr || !curr.isAI) return;

    const timer = setTimeout(() => {
      const cardsToPlay = isYansan
        ? aiChooseYansanPlay(
            curr,
            curr.cards,
            gameState.lastValidHand,
            gameState.players,
            gameState.isFirstTrick,
            gameState.starterCardId || 'diamond-4',
            gameState.yansanFriendship
          )
        : aiChoosePlay(
            curr,
            curr.cards,
            gameState.lastValidHand,
            gameState.players,
            gameState.isFirstTrick,
            gameState.starterCardId,
            playedHistory
          );

      if (cardsToPlay.length === 0) {
        executePass(gameState.currentPlayerIndex);
      } else {
        const hand = isYansan ? analyzeYansanHand(cardsToPlay) : analyzeHand(cardsToPlay);
        if (hand) {
          executePlay(gameState.currentPlayerIndex, cardsToPlay, hand);
        } else {
          executePass(gameState.currentPlayerIndex);
        }
      }
    }, 1100);

    return () => clearTimeout(timer);
  }, [gameState.currentPlayerIndex, gameState.phase, gameState.lastValidHand, turnStep, isHumanCurrent, isYansan]);

  const displayedHumanCards = isYansan
    ? sortMode === 'DESC'
      ? sortYansanCardsDesc(human.cards)
      : sortMode === 'ASC'
      ? sortYansanCardsAsc(human.cards)
      : sortMode === 'PATTERN'
      ? sortYansanCardsByPattern(human.cards)
      : sortYansanCardsBySuit(human.cards)
    : sortCardsByMode(human.cards, sortMode);

  // Real-time analysis of player's currently selected cards
  const selectedCardsList = human.cards.filter(c => selectedCardIds.includes(c.id));
  const analyzedSelectedHand = selectedCardsList.length > 0
    ? isYansan
      ? analyzeYansanHand(selectedCardsList)
      : analyzeHand(selectedCardsList)
    : null;
  const canPlaySelectedHand =
    analyzedSelectedHand !== null &&
    (!gameState.isFirstTrick || !gameState.starterCardId || selectedCardsList.some(c => c.id === gameState.starterCardId)) &&
    (!gameState.lastValidHand || gameState.lastValidHand.playerId === human.id || (
      isYansan
        ? canYansanBeat(gameState.lastValidHand.hand, analyzedSelectedHand)
        : canBeat(gameState.lastValidHand.hand, analyzedSelectedHand)
    ));

  // Helper to render played cards inside each player's avatar frame (supports up to 12 cards)
  const renderAvatarCards = (playerId: string, isVertical: boolean = false) => {
    const cards = playedHistory[playerId] || [];

    if (cards.length === 0) {
      return (
        <div className="flex items-center justify-center h-full text-[10px] sm:text-xs text-white/30 font-medium">
          未出牌
        </div>
      );
    }

    return (
      <div className="relative w-full h-full flex flex-col items-center justify-center overflow-hidden p-0.5">

        {/* Display all cards played (redesigned layout supporting up to 12 cards cleanly) */}
        {isVertical ? (
          // Left & Right players (vertical frame): 3 columns x 4 rows for up to 12 cards
          <div
            className={`w-full h-full overflow-y-auto overflow-x-hidden ${
              cards.length <= 2
                ? 'flex flex-col items-center justify-center gap-1'
                : cards.length <= 4
                ? 'grid grid-cols-2 gap-1 place-items-center content-center h-full'
                : cards.length <= 6
                ? 'grid grid-cols-2 gap-0.5 sm:gap-1 place-items-center content-center h-full'
                : 'grid grid-cols-3 gap-0.5 sm:gap-1 place-items-center content-center h-full'
            }`}
            style={{ scrollbarWidth: 'none' }}
          >
            {cards.map((c, idx) => (
              <div
                key={c.id ? `${c.id}-${idx}` : idx}
                className={`flex flex-col items-center justify-center rounded-[3px] sm:rounded bg-gradient-to-b from-white via-white to-slate-100 shadow-[0_1px_3px_rgba(0,0,0,0.4)] border border-slate-300/90 shrink-0 select-none overflow-hidden ${
                  c.color === 'red' ? 'text-rose-600' : 'text-slate-950'
                } ${
                  cards.length <= 2
                    ? 'w-7 h-9 sm:w-8 sm:h-10 py-0'
                    : cards.length <= 4
                    ? 'w-6 h-8 sm:w-7 sm:h-9 py-0'
                    : cards.length <= 6
                    ? 'w-6 h-7.5 sm:w-6.5 sm:h-8.5 py-0'
                    : 'w-[21px] h-[26px] sm:w-[25px] sm:h-[31px] md:w-[27px] md:h-[33px] py-0'
                }`}
                title={`${c.suit} ${c.rank}`}
              >
                <span
                  className={`font-black leading-none tracking-tighter ${
                    cards.length <= 2
                      ? 'text-base sm:text-lg mb-0.5'
                      : cards.length <= 4
                      ? 'text-sm sm:text-base'
                      : cards.length <= 6
                      ? 'text-[13px] sm:text-sm md:text-base'
                      : 'text-[12px] sm:text-[13.5px] md:text-[14.5px]'
                  }`}
                >
                  {c.rank}
                </span>
                <span
                  className={`leading-none drop-shadow-xs font-black ${
                    cards.length <= 2
                      ? 'text-sm sm:text-base'
                      : cards.length <= 4
                      ? 'text-xs sm:text-sm'
                      : cards.length <= 6
                      ? 'text-xs sm:text-[13px] md:text-sm'
                      : 'text-[11px] sm:text-[12.5px] md:text-[13.5px]'
                  }`}
                >
                  {SUIT_SYMBOLS[c.suit]}
                </span>
              </div>
            ))}
          </div>
        ) : (
          // Top player (horizontal frame): 2 rows of up to 6 cards for up to 12 cards
          <div
            className={`w-full h-full overflow-y-auto overflow-x-hidden ${
              cards.length <= 5
                ? 'flex flex-row items-center justify-center gap-1 sm:gap-1.5'
                : 'grid grid-cols-6 gap-0.5 sm:gap-1 place-items-center content-center h-full'
            }`}
            style={{ scrollbarWidth: 'none' }}
          >
            {cards.map((c, idx) => (
              <div
                key={c.id ? `${c.id}-${idx}` : idx}
                className={`flex flex-col items-center justify-center rounded-[3px] sm:rounded bg-gradient-to-b from-white via-white to-slate-100 shadow-[0_1px_3px_rgba(0,0,0,0.4)] border border-slate-300/90 shrink-0 select-none overflow-hidden ${
                  c.color === 'red' ? 'text-rose-600' : 'text-slate-950'
                } ${
                  cards.length <= 5
                    ? 'w-6 h-8 sm:w-7 sm:h-9 py-0'
                    : 'w-[20px] h-[26px] sm:w-[24px] sm:h-[31px] md:w-[26px] md:h-[33px] py-0'
                }`}
                title={`${c.suit} ${c.rank}`}
              >
                <span
                  className={`font-black leading-none tracking-tighter ${
                    cards.length <= 5
                      ? 'text-sm sm:text-base'
                      : 'text-[12px] sm:text-[13.5px] md:text-[14.5px]'
                  }`}
                >
                  {c.rank}
                </span>
                <span
                  className={`leading-none drop-shadow-xs font-black ${
                    cards.length <= 5
                      ? 'text-xs sm:text-sm'
                      : 'text-[11px] sm:text-[12.5px] md:text-[13.5px]'
                  }`}
                >
                  {SUIT_SYMBOLS[c.suit]}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  // Render player status badge under avatar frame (shows '过' when passed, flashing police strobe when 1 or 2 cards left, or card count)
  const renderPlayerStatusPill = (player: Player) => {
    const hasPassed = !!passStatuses[player.id];
    const cardCount = player.cards ? player.cards.length : 0;
    const isAlert = cardCount === 1 || cardCount === 2;

    if (hasPassed) {
      return (
        <span
          className="absolute -bottom-3 left-1/2 -translate-x-1/2 px-3 sm:px-3.5 py-0.5 sm:py-1 rounded-full border-2 border-amber-300 bg-gradient-to-b from-slate-900 via-slate-950 to-black text-amber-300 font-black text-xs sm:text-sm shadow-xl flex items-center justify-center whitespace-nowrap z-20 animate-in zoom-in-90 duration-150 tracking-wider"
          title={`${player.name} 本轮选择 不要/过`}
        >
          过
        </span>
      );
    }

    if (isAlert) {
      return (
        <span
          className="absolute -bottom-3.5 left-1/2 -translate-x-1/2 px-2.5 sm:px-3.5 py-0.5 sm:py-1 rounded-full border-2 font-black font-mono text-[11px] sm:text-xs shadow-2xl flex items-center justify-center whitespace-nowrap z-20 animate-police-badge cursor-default tracking-tight scale-105"
          title={`报警！${player.name} 仅剩 ${cardCount} 张牌！`}
        >
          🚨{cardCount === 1 ? '报单1张' : '报双2张'}
        </span>
      );
    }

    return (
      <span
        className={`absolute -bottom-2.5 left-1/2 -translate-x-1/2 px-2.5 sm:px-3 py-0.5 rounded-full border font-black font-mono text-[10px] sm:text-[11px] shadow-md flex items-center justify-center whitespace-nowrap z-20 transition-all ${
          theme === 'deep-green'
            ? 'bg-[#0f402c] text-emerald-200 border-emerald-400/60'
            : 'bg-[#0f3f5f] text-cyan-200 border-cyan-400/60'
        }`}
        title={`手牌剩余: ${cardCount}张`}
      >
        {cardCount}张
      </span>
    );
  };

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget && selectedCardIds.length > 0) {
          setSelectedCardIds([]);
        }
      }}
      className="w-full h-full flex flex-col justify-between p-0.5 sm:p-1.5 select-none"
    >
      {/* Tabletop Outer Border */}
      <div 
        className={`relative w-full h-full rounded-xl sm:rounded-2xl border sm:border-4 shadow-2xl overflow-hidden flex flex-col justify-between transition-colors duration-300 p-1 sm:p-2.5 ${
          theme === 'deep-green'
            ? 'border-[#0e3b28] bg-gradient-to-b from-[#186443] via-[#23855a] to-[#155b3c]'
            : 'border-[#0d344d] bg-gradient-to-b from-[#18608f] via-[#237eb5] to-[#14537c]'
        }`}
      >
        {/* Felt Glow Accent */}
        <div 
          className="absolute inset-0 pointer-events-none transition-all duration-300"
          style={{
            background: theme === 'deep-green'
              ? 'radial-gradient(ellipse at center, rgba(52,211,153,0.18) 0%, rgba(16,69,47,0.3) 85%)'
              : 'radial-gradient(ellipse at center, rgba(56,189,248,0.18) 0%, rgba(16,63,94,0.3) 85%)'
          }}
        />

        {/* TOP-LEFT: 4 个功能按钮 (大厅、全屏、音效、底分) */}
        <div className="absolute top-1.5 left-1.5 sm:top-2 sm:left-2 z-30 select-none flex items-center gap-1 sm:gap-1.5 md:gap-2">
          {/* 1. 大厅 */}
          <button
            onClick={() => {
              sounds.playClick();
              onBackToLobby();
            }}
            className="w-[42px] h-[42px] sm:w-[48px] sm:h-[48px] md:w-[54px] md:h-[54px] lg:w-[60px] lg:h-[60px] flex flex-col items-center justify-center rounded-xl sm:rounded-2xl bg-black/80 hover:bg-black/95 active:scale-95 text-emerald-300 border sm:border-2 border-emerald-400/40 shadow-lg transition-all cursor-pointer"
            title="返回大厅"
          >
            <Home className="w-4.5 h-4.5 sm:w-5 sm:h-5 md:w-5.5 md:h-5.5 lg:w-6 lg:h-6 text-amber-400" />
            <span className="text-[9px] sm:text-[10px] md:text-xs font-bold leading-none mt-0.5">大厅</span>
          </button>

          {/* 2. 全屏 */}
          <button
            onClick={() => {
              sounds.playClick();
              toggleFullscreen();
            }}
            className="w-[42px] h-[42px] sm:w-[48px] sm:h-[48px] md:w-[54px] md:h-[54px] lg:w-[60px] lg:h-[60px] flex flex-col items-center justify-center rounded-xl sm:rounded-2xl bg-black/80 hover:bg-black/95 active:scale-95 text-amber-300 border sm:border-2 border-amber-400/40 shadow-lg transition-all cursor-pointer"
            title={isFullscreen ? '退出全屏' : '全屏显示'}
          >
            {isFullscreen ? (
              <Minimize2 className="w-4.5 h-4.5 sm:w-5 sm:h-5 md:w-5.5 md:h-5.5 lg:w-6 lg:h-6 text-amber-400" />
            ) : (
              <Maximize2 className="w-4.5 h-4.5 sm:w-5 sm:h-5 md:w-5.5 md:h-5.5 lg:w-6 lg:h-6 text-amber-400" />
            )}
            <span className="text-[9px] sm:text-[10px] md:text-xs font-bold leading-none mt-0.5">
              {isFullscreen ? '退出' : '全屏'}
            </span>
          </button>

          {/* 3. 音效 */}
          <button
            onClick={onToggleSound}
            className={`w-[42px] h-[42px] sm:w-[48px] sm:h-[48px] md:w-[54px] md:h-[54px] lg:w-[60px] lg:h-[60px] flex flex-col items-center justify-center rounded-xl sm:rounded-2xl active:scale-95 transition-all border sm:border-2 shadow-lg cursor-pointer ${
              soundEnabled
                ? 'bg-black/80 hover:bg-black/95 text-emerald-300 border-emerald-400/40'
                : 'bg-slate-900 text-slate-500 border-slate-700'
            }`}
            title={soundEnabled ? '静音' : '开启音效'}
          >
            {soundEnabled ? (
              <Volume2 className="w-4.5 h-4.5 sm:w-5 sm:h-5 md:w-5.5 md:h-5.5 lg:w-6 lg:h-6 text-emerald-300" />
            ) : (
              <VolumeX className="w-4.5 h-4.5 sm:w-5 sm:h-5 md:w-5.5 md:h-5.5 lg:w-6 lg:h-6 text-slate-500" />
            )}
            <span className="text-[9px] sm:text-[10px] md:text-xs font-bold leading-none mt-0.5">
              {soundEnabled ? '音效' : '静音'}
            </span>
          </button>

          {/* 4. 底分 */}
          <div
            className="w-[42px] h-[42px] sm:w-[48px] sm:h-[48px] md:w-[54px] md:h-[54px] lg:w-[60px] lg:h-[60px] flex flex-col items-center justify-center rounded-xl sm:rounded-2xl bg-black/80 border sm:border-2 border-amber-500/50 text-amber-300 font-mono shadow-lg"
            title={`第${gameState.matchNumber || 1}场·第${gameState.roundNumber || 1}局 · 底分${gameState.room.baseScore}`}
          >
            <Flame className="w-4 h-4 sm:w-4.5 sm:h-4.5 md:w-5 md:h-5 lg:w-5.5 lg:h-5.5 text-amber-400" />
            <span className="text-[9px] sm:text-[10px] md:text-xs font-black leading-none mt-0.5">
              底{gameState.room.baseScore}
            </span>
          </div>
        </div>

        {/* TOP-RIGHT: 3 个功能按钮 (对讲/发送、短语、托管) */}
        <div className="absolute top-1.5 right-1.5 sm:top-2 sm:right-2 z-30 select-none flex items-center gap-1 sm:gap-1.5 md:gap-2">
          {/* 1. 对讲 / 录音发送按钮 (点击开始录音无弹窗；录音中变为“点击发送语音”，最长20秒满自动发送) */}
          <button
            onClick={() => {
              sounds.playClick();
              if (isRecording) {
                handleStopRecord();
              } else {
                handleStartRecord();
              }
            }}
            className={`flex items-center justify-center rounded-xl sm:rounded-2xl active:scale-95 select-none transition-all border sm:border-2 shadow-lg cursor-pointer ${
              isRecording
                ? 'w-auto px-2.5 sm:px-3.5 h-[44px] sm:h-[52px] md:h-[58px] lg:h-[64px] bg-red-600 hover:bg-red-500 text-white animate-pulse border-red-200 ring-2 ring-red-400 gap-1.5 sm:gap-2'
                : 'w-[44px] h-[44px] sm:w-[52px] sm:h-[52px] md:w-[58px] md:h-[58px] lg:w-[64px] lg:h-[64px] flex-col bg-black/80 hover:bg-black/95 text-amber-300 border-amber-400/40'
            }`}
            title={isRecording ? '点击立即发送语音' : '点击开始对讲录音 (最长20秒)'}
          >
            {isRecording ? (
              <>
                <Send className="w-4 h-4 sm:w-5 sm:h-5 text-white shrink-0 fill-current animate-bounce" />
                <div className="flex flex-col items-start leading-tight">
                  <span className="text-[10px] sm:text-[11.5px] md:text-xs font-black tracking-tight whitespace-nowrap text-white">
                    点击发送语音
                  </span>
                  <span className="text-[8px] sm:text-[9px] font-mono font-bold text-yellow-200">
                    {Math.max(0, 20 - recordingSec)}s (满20s自动发)
                  </span>
                </div>
              </>
            ) : (
              <>
                <Mic className="w-4.5 h-4.5 sm:w-5 sm:h-5 md:w-6 md:h-6 lg:w-6.5 lg:h-6.5 text-amber-400" />
                <span className="text-[9.5px] sm:text-[10.5px] md:text-xs font-bold leading-none mt-0.5">
                  对讲
                </span>
              </>
            )}
          </button>

          {/* 录音进行时快捷取消按钮 */}
          {isRecording && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleCancelRecord();
              }}
              className="px-2 h-[44px] sm:h-[52px] md:h-[58px] lg:h-[64px] rounded-xl sm:rounded-2xl bg-black/85 hover:bg-black text-white/80 hover:text-white border border-white/20 text-[10px] sm:text-xs font-bold flex items-center justify-center cursor-pointer transition-all active:scale-95 shadow"
              title="取消本次录音"
            >
              取消
            </button>
          )}

          {/* 2. 短语 */}
          <button
            onClick={() => setShowChatModal(true)}
            className="w-[44px] h-[44px] sm:w-[52px] sm:h-[52px] md:w-[58px] md:h-[58px] lg:w-[64px] lg:h-[64px] flex flex-col items-center justify-center rounded-xl sm:rounded-2xl bg-black/80 hover:bg-black/95 active:scale-95 text-amber-300 border sm:border-2 border-amber-400/40 shadow-lg transition-all relative cursor-pointer"
            title="快捷短语与表情"
          >
            <MessageSquare className="w-4.5 h-4.5 sm:w-5 sm:h-5 md:w-6 md:h-6 lg:w-6.5 lg:h-6.5 text-amber-400" />
            <span className="text-[9.5px] sm:text-[10.5px] md:text-xs font-bold leading-none mt-0.5">短语</span>
            {chatMessages.length > 0 && (
              <span className="absolute top-0.5 right-0.5 w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping" />
            )}
          </button>

          {/* 3. 托管 */}
          <button
            onClick={() => {
              sounds.playClick();
              setIsAutoPlay(prev => !prev);
            }}
            className={`w-[44px] h-[44px] sm:w-[52px] sm:h-[52px] md:w-[58px] md:h-[58px] lg:w-[64px] lg:h-[64px] flex flex-col items-center justify-center rounded-xl sm:rounded-2xl border sm:border-2 cursor-pointer font-black shadow-lg transition-all active:scale-95 ${
              isAutoPlay
                ? 'bg-amber-300 text-slate-950 animate-bounce border-white'
                : 'bg-gradient-to-b from-amber-400 via-amber-500 to-amber-600 hover:brightness-110 text-slate-950 border-yellow-200'
            }`}
            title="AI 自动托管"
          >
            <Bot className="w-4.5 h-4.5 sm:w-5 sm:h-5 md:w-6 md:h-6 lg:w-6.5 lg:h-6.5 text-slate-950 mb-0.5" />
            <span className="text-[9.5px] sm:text-[10.5px] md:text-xs font-black leading-none">
              {isAutoPlay ? '托管中' : '托管'}
            </span>
          </button>
        </div>

        {/* 3. CENTER-TOP PLAYER: 北家 (紧贴顶部上边，精美金属质感头像框，旁边紧靠原样累计牌数) */}
        <div className="relative z-20 flex flex-col items-center justify-start pt-0 shrink-0">
          <div className="relative flex items-center gap-2.5 sm:gap-4">
            {/* 累计牌数小方块 (烟三模式不显示，仅在锄大地模式下显示) */}
            {!isYansan && (
              <div className="flex flex-col items-center gap-0.5 sm:gap-1 bg-black/60 backdrop-blur-md p-1 rounded-xl border border-white/15 shadow-xl select-none">
                {/* Top: 北方 */}
                <div 
                  className={`w-6 h-6 sm:w-7 sm:h-7 flex items-center justify-center rounded-lg border font-mono font-black text-xs sm:text-sm shadow-md transition-all ${
                    (botTop.accumulatedCards || 0) >= 80
                      ? 'bg-red-950/95 border-red-500 text-red-300 animate-pulse ring-1 ring-red-400'
                      : (botTop.accumulatedCards || 0) >= 50
                      ? 'bg-amber-950/90 border-amber-400 text-amber-300'
                      : 'bg-black/85 border-white/25 text-emerald-300'
                  }`}
                  title={`北家累计输牌: ${botTop.accumulatedCards || 0}张`}
                >
                  {botTop.accumulatedCards || 0}
                </div>

                {/* Middle: 西方与东方贴近 (gap-0.5) */}
                <div className="flex items-center gap-0.5 sm:gap-1">
                  <div 
                    className={`w-6 h-6 sm:w-7 sm:h-7 flex items-center justify-center rounded-lg border font-mono font-black text-xs sm:text-sm shadow-md transition-all ${
                      (botLeft.accumulatedCards || 0) >= 80
                        ? 'bg-red-950/95 border-red-500 text-red-300 animate-pulse ring-1 ring-red-400'
                        : (botLeft.accumulatedCards || 0) >= 50
                        ? 'bg-amber-950/90 border-amber-400 text-amber-300'
                        : 'bg-black/85 border-white/25 text-emerald-300'
                    }`}
                    title={`西家累计输牌: ${botLeft.accumulatedCards || 0}张`}
                  >
                    {botLeft.accumulatedCards || 0}
                  </div>

                  <div 
                    className={`w-6 h-6 sm:w-7 sm:h-7 flex items-center justify-center rounded-lg border font-mono font-black text-xs sm:text-sm shadow-md transition-all ${
                      (botRight.accumulatedCards || 0) >= 80
                        ? 'bg-red-950/95 border-red-500 text-red-300 animate-pulse ring-1 ring-red-400'
                        : (botRight.accumulatedCards || 0) >= 50
                        ? 'bg-amber-950/90 border-amber-400 text-amber-300'
                        : 'bg-black/85 border-white/25 text-emerald-300'
                    }`}
                    title={`东家累计输牌: ${botRight.accumulatedCards || 0}张`}
                  >
                    {botRight.accumulatedCards || 0}
                  </div>
                </div>

                {/* Bottom: 南方 (自己) */}
                <div 
                  className={`w-6 h-6 sm:w-7 sm:h-7 flex items-center justify-center rounded-lg border font-mono font-black text-xs sm:text-sm shadow-md transition-all ${
                    (human.accumulatedCards || 0) >= 80
                      ? 'bg-red-950/95 border-red-500 text-red-300 animate-pulse ring-1 ring-red-400'
                      : (human.accumulatedCards || 0) >= 50
                      ? 'bg-amber-950/90 border-amber-400 text-amber-300'
                      : 'bg-black/85 border-amber-400/90 text-amber-300 ring-1 ring-amber-400/50'
                  }`}
                  title={`自己累计输牌: ${human.accumulatedCards || 0}张`}
                >
                  {human.accumulatedCards || 0}
                </div>
              </div>
            )}

            <div className="relative">
              {speechBubble[botTop.id] && (
                <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 whitespace-nowrap bg-white text-slate-900 text-xs font-black px-3.5 py-1 rounded-full shadow-2xl border-2 border-amber-400 z-30 animate-bounce flex items-center gap-1">
                  <Radio className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
                  <span>{speechBubble[botTop.id]}</span>
                </div>
              )}
              {/* 精美金属质感头像框 (顶部玩家：横向宽屏展示该玩家出过的牌，支持最多12张) */}
              <div className="p-0.5 sm:p-1 rounded-2xl sm:rounded-3xl bg-gradient-to-b from-amber-400/90 via-yellow-300/80 to-amber-600/90 shadow-2xl">
                <div
                  className={`w-38 h-22 sm:w-46 sm:h-24 md:w-50 md:h-26 rounded-xl sm:rounded-2xl flex flex-col items-center justify-center shadow-inner border-2 transition-all relative overflow-hidden p-1 ${
                    activeVoicePlayer === botTop.id
                      ? 'ring-4 ring-emerald-400 animate-pulse border-emerald-300'
                      : gameState.currentPlayerIndex === 2
                      ? 'border-2 border-red-500 ring-4 ring-red-500/80 shadow-[0_0_24px_rgba(239,68,68,0.95)] animate-pulse scale-105 bg-red-500/25'
                      : theme === 'deep-green'
                      ? 'border-emerald-400/80 bg-gradient-to-b from-[#165a3d] to-[#0a3020]'
                      : 'border-cyan-400/80 bg-gradient-to-b from-[#185c88] to-[#0b2f48]'
                  }`}
                >
                  {/* 仅展示该玩家打出的牌 (不显示昵称以防遮挡扑克牌) */}
                  {renderAvatarCards(botTop.id, false)}
                </div>
              </div>
              {/* 头像框下显示手牌数 / 过字 / 报单报双警灯闪烁 */}
              {renderPlayerStatusPill(botTop)}
            </div>

            {/* 圆形倒计时 (靠近上面玩家头像框，直径和累计牌数一样的高度) */}
            <div
              className={`w-[84px] h-[84px] sm:w-[100px] sm:h-[100px] rounded-full flex flex-col items-center justify-center select-none shadow-2xl transition-all border-2 sm:border-3 shrink-0 ${
                countdown <= 5
                  ? 'bg-gradient-to-br from-red-600 via-rose-700 to-red-950 border-red-400 text-yellow-300 ring-4 ring-red-500/80 shadow-[0_0_25px_rgba(239,68,68,0.95)] animate-pulse'
                  : 'bg-gradient-to-br from-amber-400/20 via-black/85 to-black/95 backdrop-blur-md border-amber-400/80 text-amber-300 ring-2 ring-amber-500/30 shadow-[0_0_20px_rgba(245,158,11,0.35)]'
              }`}
              title={`思考倒计时剩余 ${countdown} 秒`}
            >
              <span className="text-[10px] sm:text-[11px] font-black text-amber-300/80 tracking-widest leading-none mb-0.5">
                倒计时
              </span>
              <span className={`text-2xl sm:text-3xl md:text-4xl font-black font-mono leading-none tracking-tight ${countdown <= 5 ? 'text-yellow-200 animate-pulse' : 'text-amber-300'}`}>
                {countdown}
              </span>
              <span className="text-[9px] sm:text-[10px] font-extrabold text-amber-400/70 leading-none mt-0.5">
                SEC
              </span>
            </div>
          </div>

          {/* 玩家昵称：显示在头像框下方，绝不遮挡内部扑克牌 */}
          <div className="mt-3.5 flex items-center justify-center">
            <span 
              className="px-2.5 py-0.5 rounded-full bg-black/85 border border-amber-400/50 text-[10px] sm:text-[11px] font-black text-amber-200 shadow-md truncate max-w-[120px] text-center"
              title={botTop.name}
            >
              {botTop.name}
            </span>
          </div>
        </div>

        {/* 4-PLAYER ARENA: Left (西家紧贴最左边), Center Table Area (宽广出牌区), Right (东家紧贴最右边) */}
        <div className="relative z-10 flex items-center justify-between my-auto py-0.5 w-full px-0 sm:px-0.5 min-h-[140px] sm:min-h-[165px] md:min-h-[185px] flex-1 -translate-y-10 sm:-translate-y-12">
          {/* Left Player: 西家 (紧贴最左侧边缘) */}
          <div className="flex flex-col items-start pl-0 sm:pl-0.5 shrink-0 z-20">
            <div className="relative">
              {speechBubble[botLeft.id] && (
                <div className="absolute -top-11 left-1/2 -translate-x-1/2 whitespace-nowrap bg-white text-slate-900 text-xs font-black px-3.5 py-1 rounded-full shadow-2xl border-2 border-amber-400 z-30 animate-bounce flex items-center gap-1">
                  <Radio className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
                  <span>{speechBubble[botLeft.id]}</span>
                </div>
              )}
              {/* 精美金属质感头像框 (左边玩家：垂直宽屏，展示该玩家出过的牌，支持最多12张) */}
              <div className="p-0.5 sm:p-1 rounded-2xl sm:rounded-3xl bg-gradient-to-b from-amber-400/90 via-yellow-300/80 to-amber-600/90 shadow-2xl">
                <div
                  className={`w-24 h-36 sm:w-28 sm:h-42 md:w-30 md:h-46 rounded-xl sm:rounded-2xl flex flex-col items-center justify-center shadow-inner border-2 transition-all relative overflow-hidden p-1 ${
                    activeVoicePlayer === botLeft.id
                      ? 'ring-4 ring-emerald-400 animate-pulse border-emerald-300'
                      : gameState.currentPlayerIndex === 3
                      ? 'border-2 border-red-500 ring-4 ring-red-500/80 shadow-[0_0_24px_rgba(239,68,68,0.95)] animate-pulse scale-105 bg-red-500/25'
                      : theme === 'deep-green'
                      ? 'border-emerald-400/80 bg-gradient-to-b from-[#165a3d] to-[#0a3020]'
                      : 'border-cyan-400/80 bg-gradient-to-b from-[#185c88] to-[#0b2f48]'
                  }`}
                >
                  {/* 仅展示该玩家打出的牌 (不显示昵称以防遮挡扑克牌) */}
                  {renderAvatarCards(botLeft.id, true)}
                </div>
              </div>
              {/* 头像框下显示手牌数 / 过字 / 报单报双警灯闪烁 */}
              {renderPlayerStatusPill(botLeft)}
            </div>

            {/* 玩家昵称：显示在头像框下方，绝不遮挡内部扑克牌 */}
            <div className="mt-3.5 flex items-center justify-center w-full">
              <span 
                className="px-2 py-0.5 rounded-full bg-black/85 border border-amber-400/50 text-[10px] sm:text-[11px] font-black text-amber-200 shadow-md truncate max-w-[95px] text-center"
                title={botLeft.name}
              >
                {botLeft.name}
              </span>
            </div>
          </div>

          {/* Table Active Played Cards Area (出牌区：从左边玩家头像到右边玩家头像的开阔区域，大幅增高增宽) */}
          <div className="flex-1 relative w-full h-full min-h-[170px] sm:min-h-[195px] md:min-h-[215px] mx-1 sm:mx-2.5 pointer-events-none flex items-center">
            {gameState.lastValidHand ? (
              <div 
                className={`w-full flex transition-all duration-200 pointer-events-auto ${
                  gameState.lastValidHand.playerId === 'player-3' // 左边玩家(西家): 靠左侧展示
                    ? 'justify-start pl-1 sm:pl-3'
                    : gameState.lastValidHand.playerId === 'player-1' // 右边玩家(东家): 靠右侧展示
                    ? 'justify-end pr-1 sm:pr-3'
                    : 'justify-center' // 我(南家)和上面玩家(北家): 都在中间展示，上面玩家无需紧贴头像
                }`}
              >
                <div className="flex items-center gap-1 sm:gap-1.5 flex-wrap justify-center">
                  {gameState.lastValidHand.hand.cards.map((c, i) => (
                    <SvgCard
                      key={c.id || i}
                      card={c}
                      size="md"
                      className="animate-in fade-in zoom-in-95 duration-200 shadow-2xl ring-1 ring-black/40"
                    />
                  ))}
                </div>
              </div>
            ) : (
              <div className="w-full flex items-center justify-center">
                <div className={`text-center text-xs sm:text-sm border-2 border-dashed px-5 py-2.5 rounded-2xl pointer-events-auto font-medium shadow-sm ${
                  theme === 'deep-green'
                    ? 'text-emerald-100/90 border-emerald-300/40 bg-[#0f402c]/50'
                    : 'text-cyan-100/90 border-cyan-300/40 bg-[#0f3f5f]/50'
                }`}>
                  {fastContinuedPlayerName ? (
                    <span className="text-amber-300 font-bold flex items-center gap-1.5 justify-center">
                      <Sparkles className="w-4 h-4 text-amber-400 animate-spin" />
                      全场无人大过此牌，由 {fastContinuedPlayerName} 直接继续出牌！
                    </span>
                  ) : gameState.isFirstTrick ? (
                    isYansan
                      ? '♦4 (方块4) 首出！首出牌型中必须包含♦4 (找朋友模式：♠3与♠A为盟友)'
                      : '♦2 (方块2) 首出！首出牌型中必须包含♦2 (逆时针出牌)'
                  ) : (
                    '桌面无牌，轮到领牌者任意出牌'
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Right Player: 东家 (紧贴最右侧边缘) */}
          <div className="flex flex-col items-end pr-0 sm:pr-0.5 shrink-0 z-20">
            <div className="relative">
              {speechBubble[botRight.id] && (
                <div className="absolute -top-11 left-1/2 -translate-x-1/2 whitespace-nowrap bg-white text-slate-900 text-xs font-black px-3.5 py-1 rounded-full shadow-2xl border-2 border-amber-400 z-30 animate-bounce flex items-center gap-1">
                  <Radio className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
                  <span>{speechBubble[botRight.id]}</span>
                </div>
              )}
              {/* 精美金属质感头像框 (右边玩家：垂直宽屏，展示该玩家出过的牌，支持最多12张) */}
              <div className="p-0.5 sm:p-1 rounded-2xl sm:rounded-3xl bg-gradient-to-b from-amber-400/90 via-yellow-300/80 to-amber-600/90 shadow-2xl">
                <div
                  className={`w-24 h-36 sm:w-28 sm:h-42 md:w-30 md:h-46 rounded-xl sm:rounded-2xl flex flex-col items-center justify-center shadow-inner border-2 transition-all relative overflow-hidden p-1 ${
                    activeVoicePlayer === botRight.id
                      ? 'ring-4 ring-emerald-400 animate-pulse border-emerald-300'
                      : gameState.currentPlayerIndex === 1
                      ? 'border-2 border-red-500 ring-4 ring-red-500/80 shadow-[0_0_24px_rgba(239,68,68,0.95)] animate-pulse scale-105 bg-red-500/25'
                      : theme === 'deep-green'
                      ? 'border-emerald-400/80 bg-gradient-to-b from-[#165a3d] to-[#0a3020]'
                      : 'border-cyan-400/80 bg-gradient-to-b from-[#185c88] to-[#0b2f48]'
                  }`}
                >
                  {/* 仅展示该玩家打出的牌 (不显示昵称以防遮挡扑克牌) */}
                  {renderAvatarCards(botRight.id, true)}
                </div>
              </div>
              {/* 头像框下显示手牌数 / 过字 / 报单报双警灯闪烁 */}
              {renderPlayerStatusPill(botRight)}
            </div>

            {/* 玩家昵称：显示在头像框下方，绝不遮挡内部扑克牌 */}
            <div className="mt-3.5 flex items-center justify-center w-full">
              <span 
                className="px-2 py-0.5 rounded-full bg-black/85 border border-amber-400/50 text-[10px] sm:text-[11px] font-black text-amber-200 shadow-md truncate max-w-[95px] text-center"
                title={botRight.name}
              >
                {botRight.name}
              </span>
            </div>
          </div>
        </div>

        {/* BOTTOM SECTION: 底部控制与手牌区紧凑聚拢，左下/右下按钮紧密贴靠手牌两侧，触控更便捷，绝不遮挡手牌 */}
        <div className="relative z-25 flex items-end justify-center gap-1.5 sm:gap-2.5 md:gap-3.5 lg:gap-4.5 w-full max-w-full overflow-visible bg-transparent shrink-0 mt-auto px-1 sm:px-2 md:px-3 pb-4 sm:pb-6 md:pb-7 select-none pt-7 sm:pt-9 mb-1 sm:mb-2">
          {speechBubble['player-0'] && (
            <div className="absolute -top-6 left-1/2 -translate-x-1/2 whitespace-nowrap bg-gradient-to-r from-amber-400 to-yellow-300 text-slate-950 text-xs font-black px-4 py-1.5 rounded-full shadow-2xl border-2 border-white z-40 animate-bounce flex items-center gap-1.5 pointer-events-none">
              <Radio className="w-3.5 h-3.5 text-slate-950 animate-pulse" />
              <span>{speechBubble['player-0']}</span>
            </div>
          )}

          {/* 1. 左侧：提示与牌序按钮 (紧贴扑克牌左侧，总高度与手牌高度严格一致) */}
          <div className="flex flex-col justify-between h-[104px] sm:h-[128px] md:h-[152px] lg:h-[168px] w-20 sm:w-24 md:w-28 lg:w-30 shrink-0 z-30 select-none pb-0.5">
            {/* 提示按钮：仅在轮到出牌且有可出的压制牌时才显示；当隐藏时占据空位或由牌序撑满 */}
            {shouldShowHintButton ? (
              <>
                <button
                  onClick={handleHint}
                  className="w-full flex-1 mb-2 flex flex-col sm:flex-row items-center justify-center gap-1 px-1.5 sm:px-2 py-1 rounded-xl bg-gradient-to-b from-amber-400 via-amber-500 to-amber-600 hover:brightness-110 active:scale-95 text-slate-950 border-2 border-yellow-200 cursor-pointer text-xs sm:text-sm font-black shadow-lg transition-all animate-in fade-in zoom-in-95 duration-150 ring-1 ring-amber-300"
                  title={
                    hintCandidates.length > 1
                      ? `提示 (${hintIndex + 1}/${hintCandidates.length})：点击切换下一组压制牌`
                      : '智能提示可出牌型'
                  }
                >
                  <Lightbulb className="w-4 h-4 text-slate-950 fill-current animate-pulse shrink-0" />
                  <span className="truncate">
                    {hintCandidates.length > 1
                      ? `提示 (${hintIndex + 1}/${hintCandidates.length})`
                      : '提示'}
                  </span>
                </button>

                {/* 牌序切换按钮 */}
                <button
                  onClick={() => {
                    sounds.playClick();
                    setSortMode(prev => {
                      if (prev === 'DESC') {
                        showBubble('player-0', '📈 切换为：点数序 (从小到大 2➔A)');
                        return 'ASC';
                      } else if (prev === 'ASC') {
                        showBubble('player-0', '🎴 切换为：牌型序 (炸弹/三张/对子聚拢)');
                        return 'PATTERN';
                      } else if (prev === 'PATTERN') {
                        showBubble('player-0', '♠️ 切换为：花色序 (♠♥♣♦同花聚拢)');
                        return 'SUIT';
                      } else {
                        showBubble('player-0', '📊 切换为：大小序 (从大到小 A➔2)');
                        return 'DESC';
                      }
                    });
                  }}
                  className="w-full flex-1 flex flex-col sm:flex-row items-center justify-center gap-1 px-1.5 sm:px-2 py-1 rounded-xl bg-gradient-to-b from-amber-400 via-amber-500 to-amber-600 hover:brightness-110 active:scale-95 text-slate-950 border-2 border-yellow-200 cursor-pointer text-xs sm:text-sm font-black shadow-lg transition-all"
                  title="切换排序：大小序 (A➔2) ➔ 点数序 (2➔A) ➔ 牌型序 (对子聚拢) ➔ 花色序 (同花聚拢)"
                >
                  <SlidersHorizontal className="w-4 h-4 text-slate-950 shrink-0" />
                  <span className="truncate">
                    {sortMode === 'DESC'
                      ? '大小序'
                      : sortMode === 'ASC'
                      ? '点数序'
                      : sortMode === 'PATTERN'
                      ? '牌型序'
                      : '花色序'}
                  </span>
                </button>
              </>
            ) : (
              /* 未轮到出牌或无可出牌时不显示提示按钮，牌序按钮填满该区域 */
              <button
                onClick={() => {
                  sounds.playClick();
                  setSortMode(prev => {
                    if (prev === 'DESC') {
                      showBubble('player-0', '📈 切换为：点数序 (从小到大 2➔A)');
                      return 'ASC';
                    } else if (prev === 'ASC') {
                      showBubble('player-0', '🎴 切换为：牌型序 (炸弹/三张/对子聚拢)');
                      return 'PATTERN';
                    } else if (prev === 'PATTERN') {
                      showBubble('player-0', '♠️ 切换为：花色序 (♠♥♣♦同花聚拢)');
                      return 'SUIT';
                    } else {
                      showBubble('player-0', '📊 切换为：大小序 (从大到小 A➔2)');
                      return 'DESC';
                    }
                  });
                }}
                className="w-full h-full flex flex-col items-center justify-center gap-1.5 px-2 py-2 rounded-xl bg-gradient-to-b from-amber-400 via-amber-500 to-amber-600 hover:brightness-110 active:scale-95 text-slate-950 border-2 border-yellow-200 cursor-pointer text-xs sm:text-sm font-black shadow-lg transition-all"
                title="切换排序：大小序 (A➔2) ➔ 点数序 (2➔A) ➔ 牌型序 (对子聚拢) ➔ 花色序 (同花聚拢)"
              >
                <SlidersHorizontal className="w-5 h-5 text-slate-950" />
                <span className="font-extrabold">
                  {sortMode === 'DESC'
                    ? '📊 大小序'
                    : sortMode === 'ASC'
                    ? '📈 点数序'
                    : sortMode === 'PATTERN'
                    ? '🎴 牌型序'
                    : '♠️ 花色序'}
                </span>
                <span className="text-[10px] text-slate-900/80 font-bold">点击切换</span>
              </button>
            )}
          </div>

          {/* 2. 中间：13张手牌区 (稳定占位区，手牌变少时手牌居中展示，两侧按钮保持稳定不向中间挤靠) */}
          <div
            className="w-[360px] sm:w-[472px] md:w-[584px] lg:w-[644px] max-w-[calc(100vw-180px)] shrink-0 overflow-visible flex items-end justify-center px-0.5 sm:px-1 h-[104px] sm:h-[128px] md:h-[152px] lg:h-[168px]"
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            <div className="flex -space-x-12 sm:-space-x-14 md:-space-x-16 lg:-space-x-18 shrink-0 items-end pb-0.5">
              {displayedHumanCards.map((card, index) => {
                const isSelected = selectedCardIds.includes(card.id);
                return (
                  <div
                    key={card.id}
                    data-card-id={card.id}
                    onClick={(e) => handleCardClick(card.id, e)}
                    onPointerDown={() => handleCardPointerDown(card.id)}
                    onPointerEnter={() => handleCardPointerEnter(card.id)}
                    onTouchStart={() => handleTouchStart(card.id)}
                    style={{ zIndex: index + 1 }}
                    className="shrink-0 select-none cursor-pointer relative"
                  >
                    <SvgCard
                      card={card}
                      isSelected={isSelected}
                      size="lg"
                    />
                  </div>
                );
              })}
            </div>
          </div>

          {/* 3. 右侧：过 / 出牌 按钮 (紧贴扑克牌右侧，总高度与手牌高度严格一致) */}
          <div className="flex flex-col justify-between h-[104px] sm:h-[128px] md:h-[152px] lg:h-[168px] w-20 sm:w-24 md:w-28 lg:w-30 shrink-0 z-30 select-none pb-0.5">
            {isHumanCurrent && gameState.phase === 'PLAYING' ? (
              <>
                {/* 1. 过 按钮 */}
                {gameState.lastValidHand && gameState.lastValidHand.playerId !== 'player-0' ? (
                  <button
                    onClick={handleHumanPass}
                    className="w-full flex-1 mb-2 flex flex-col sm:flex-row items-center justify-center gap-1 px-2 py-1 rounded-xl bg-gradient-to-b from-amber-400 via-amber-500 to-amber-600 hover:brightness-110 active:scale-95 text-slate-950 border-2 border-yellow-200 cursor-pointer text-xs sm:text-sm font-black shadow-lg transition-all"
                    title="不要/过"
                  >
                    <SkipForward className="w-4 h-4 text-slate-950 shrink-0" />
                    <span>过</span>
                  </button>
                ) : (
                  <div
                    className="w-full flex-1 mb-2 flex items-center justify-center px-2 py-1 rounded-xl bg-amber-600/30 border border-amber-500/30 text-amber-950/70 select-none cursor-not-allowed text-xs sm:text-sm font-bold text-center"
                    title="领牌者必须出牌，不可过"
                  >
                    <span>领牌必出</span>
                  </div>
                )}

                {/* 2. 出牌 按钮 (纯粹整洁的“出牌”，不展示选中的牌型文本) */}
                <button
                  onClick={handleHumanPlay}
                  disabled={selectedCardIds.length === 0}
                  className={`w-full flex-1 flex flex-col sm:flex-row items-center justify-center gap-1.5 px-2 py-1 rounded-xl text-xs sm:text-sm font-black shadow-lg transition-all ${
                    canPlaySelectedHand
                      ? 'bg-gradient-to-b from-yellow-300 via-amber-400 to-amber-500 hover:brightness-110 active:scale-95 text-slate-950 border-2 border-yellow-200 shadow-[0_0_12px_rgba(251,191,36,0.9)] animate-pulse cursor-pointer'
                      : selectedCardIds.length > 0
                      ? 'bg-gradient-to-b from-amber-400 via-amber-500 to-amber-600 hover:brightness-110 active:scale-95 text-slate-950 border-2 border-yellow-200 cursor-pointer'
                      : 'bg-amber-800/30 border border-amber-700/30 text-amber-600/50 cursor-not-allowed'
                  }`}
                  title={canPlaySelectedHand ? '出牌' : selectedCardIds.length > 0 ? '打不起此牌' : '请先选牌'}
                >
                  <Play className={`w-4 h-4 shrink-0 ${canPlaySelectedHand ? 'text-slate-950 fill-current' : selectedCardIds.length > 0 ? 'text-slate-950' : 'text-amber-800/60'}`} />
                  <span className="font-extrabold tracking-wider">出牌</span>
                </button>
              </>
            ) : null}
          </div>
        </div>

        {/* Quick Chat Modal - Phrases, Emojis, Dialects, Tactical Calls & Voice History */}
        <InGameChatModal
          isOpen={showChatModal}
          onClose={() => setShowChatModal(false)}
          theme={theme}
          chatTab={chatTab}
          setChatTab={setChatTab}
          chatMessages={chatMessages}
          customChatText={customChatText}
          setCustomChatText={setCustomChatText}
          onSendChat={handleSendChat}
        />

        {/* 1. YANSAN SETTLEMENT FULL-SCREEN VIEW (烟三找朋友结算面板) */}
        {gameState.phase === 'YANSAN_SETTLEMENT' && (
          <YansanSettlementModal
            gameState={gameState}
            theme={theme}
            onBackToLobby={onBackToLobby}
            onStartNewGame={onStartNewGame}
          />
        )}

        {/* 2. ROUND SUMMARY FULL-SCREEN VIEW (局小结 - 全屏横屏战绩面板) */}
        {gameState.phase === 'ROUND_SUMMARY' && (
          <RoundSummaryModal
            gameState={gameState}
            theme={theme}
            onBackToLobby={onBackToLobby}
            onStartNewGame={onStartNewGame}
          />
        )}

        {/* 3. MATCH SETTLEMENT FULL-SCREEN VIEW (场大结算 - 满100张四舍五入大结算面板) */}
        {(gameState.phase === 'MATCH_SETTLEMENT' || (gameState.phase === 'GAME_OVER' && !isYansan)) && (
          <MatchSettlementModal
            gameState={gameState}
            theme={theme}
            onBackToLobby={onBackToLobby}
            onStartNewGame={onStartNewGame}
            onStartNewMatch={onStartNewMatch}
          />
        )}
      </div>
    </div>
  );
};
