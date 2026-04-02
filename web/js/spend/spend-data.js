import { PORTRAIT_URLS } from "./portrait-urls.js";

export const SPEND_BUDGET = 100_000_000;

/**
 * 50 位虚构人物卡（请自行替换为你有授权的图片 URL）
 * img 使用 picsum.photos 作为占位图：稳定 seed，避免每次刷新都变
 */
export const SPEND_PEOPLE = Array.from({ length: 50 }, (_, i) => {
  const id = String(i + 1).padStart(2, "0");
  const names = [
    "星野 澪",
    "佐藤 凛",
    "小川 结衣",
    "藤原 纱月",
    "森川 奈奈",
    "高桥 由梨",
    "松本 雫",
    "山口 千夏",
    "新井 诗织",
    "浅野 美咲",
  ];
  const name = `${names[i % names.length]} #${id}`;

  // 单价：200,000 ~ 2,000,000 / 天（整体提高 10 倍）
  const base = (20_000 + ((i * 13) % 181) * 1_000) * 10;
  const pricePerDay = Math.round(base / 1000) * 1000;

  const provided = Array.isArray(PORTRAIT_URLS) ? PORTRAIT_URLS : [];
  const localPng = `assets/portraits/p${id}.png`;
  const localJpg = `assets/portraits/p${id}.jpg`;
  const fallback = `https://picsum.photos/seed/kanto-spend-${id}/420/560`;
  const img = provided.length >= 50 ? provided[i] : localPng;


  return {
    id: `P${id}`,
    name,
    pricePerDay,
    img,
    localPng,
    localJpg,
    fallback,
  };
});

