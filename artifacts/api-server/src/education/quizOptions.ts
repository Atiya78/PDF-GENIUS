import { randomInt } from "node:crypto";
import type { EducationQuiz } from "@workspace/api-zod";

// Shuffle once before the quiz is returned/saved, not on render or export.
// correctAnswer is the option text, so moving an option preserves its identity.
export function randomizeQuizOptions(
  questions: EducationQuiz["questions"],
  randomIndex: (maxExclusive: number) => number = randomInt,
): EducationQuiz["questions"] {
  return questions.map(question => {
    if (question.type !== "mcq") return question;
    const options = [...question.options];
    // Unbiased Fisher–Yates; each question gets independent random draws.
    for (let i = options.length - 1; i > 0; i--) {
      const j = randomIndex(i + 1);
      [options[i], options[j]] = [options[j]!, options[i]!];
    }
    return { ...question, options };
  });
}
