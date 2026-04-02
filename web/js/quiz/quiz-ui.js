import { mountQuiz as mountQuizCore } from "./quiz-core.js";
import { QUIZ_QUESTIONS } from "./questions.js";
import { gradeJapan } from "./grades.js";

/**
 * 日本文化问答（30 题）
 */
export function mountQuiz(container, { onBack }) {
  return mountQuizCore(container, {
    questions: QUIZ_QUESTIONS,
    gradeFor: gradeJapan,
    quizTitle: "日本文化知识问答",
    onBack,
  });
}
