/** 30 题制 · 中国文化卷评语 */
export function gradeChina(score) {
  if (score >= 27) {
    return {
      rank: "S",
      title: "通古今 · 识人文",
      comment:
        "对历史脉络、典籍常识与当代国情均有较好把握。可再选读地方志或艺术史专著，把「知道」沉淀为「理解」。",
    };
  }
  if (score >= 23) {
    return {
      rank: "A",
      title: "博学多识",
      comment:
        "基础扎实，易混点已不多。建议结合博物馆与非遗专题，把书本知识与实物对照，记忆会更牢。",
    };
  }
  if (score >= 19) {
    return {
      rank: "B",
      title: "认真好学",
      comment:
        "常见考点掌握尚可，个别题目还需辨析。可把错题按「朝代 / 地理 / 节俗」分类整理，便于复习。",
    };
  }
  if (score >= 15) {
    return {
      rank: "C",
      title: "夯实基础中",
      comment:
        "大框架已有，细节尚弱。不妨从朝代顺序、行政区划与四大发明等「骨架」先记牢，再填血肉。",
    };
  }
  return {
    rank: "D",
    title: "再接再厉",
    comment:
      "文化常识需要日积月累。建议先通读解析，再每天做少量题目，比一次刷完更有效。",
  };
}
