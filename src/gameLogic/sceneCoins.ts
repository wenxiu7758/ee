/**
 * Scene Required Coins Admission Logic
 * Calculates minimum required points/coins for Yansan, Shisanshui, and Mahjong scenes.
 */

export function getSceneRequiredCoins(gType: string, sMode: string): number {
  if (gType === 'yansan') {
    if (sMode === 'yansan-20-40') return 500;
    if (sMode === 'yansan-10-20') return 200;
    return 100;
  }
  if (gType === 'shisanshui') {
    if (sMode === 'eight-realtime' || sMode === 'eight-booking') return 500;
    if (sMode === 'shisanshui-10-20') return 200;
    return 100;
  }
  if (gType === 'mahjong') {
    if (sMode === 'mahjong-20-40') return 500;
    if (sMode === 'mahjong-10-20') return 200;
    return 100;
  }
  return 100;
}
