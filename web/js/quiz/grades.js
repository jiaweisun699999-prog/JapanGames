/** 30 题制通用等级（日本卷评语） */
export function gradeJapan(score) {
  if (score >= 27) {
    return {
      rank: "S",
      title: "日本通 · 上段",
      comment:
        "对日本社会、文化与常识掌握扎实，细节也抓得准。若有机会实地旅行，建议再深入地方史与方言，乐趣会加倍。",
    };
  }
  if (score >= 23) {
    return {
      rank: "A",
      title: "博学旅人",
      comment:
        "整体正确率很高，已具备自助游与深度阅读的基础。可再补强历史年号与礼仪细节，向 S 迈进。",
    };
  }
  if (score >= 19) {
    return {
      rank: "B",
      title: "认真观光客",
      comment:
        "常见知识点掌握不错，仍有若干易混项。建议把错题里的「解释」记成小笔记，二次测验会轻松许多。",
    };
  }
  if (score >= 15) {
    return {
      rank: "C",
      title: "入门练习生",
      comment:
        "基础框架有了，但不少题需要再消化。可从饮食、节日、礼仪三类开始各记 5 条，循序渐进。",
    };
  }
  return {
    rank: "D",
    title: "需要加油",
    comment:
      "别灰心，文化题本来就容易混。建议先通读错题解析，再挑感兴趣的类别做专题学习。",
  };
}
