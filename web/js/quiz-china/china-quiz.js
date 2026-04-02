import { mountQuiz as mountQuizCore } from "../quiz/quiz-core.js";
import { CHINA_QUESTIONS } from "./questions.js";
import { gradeChina } from "./grades.js";

/**
 * 中国文化问答（30 题）
 */
export function mountChinaQuiz(container, { onBack }) {
  return mountQuizCore(container, {
    questions: CHINA_QUESTIONS,
    gradeFor: gradeChina,
    quizTitle: "中国文化知识问答",
    onBack,
  });
}
