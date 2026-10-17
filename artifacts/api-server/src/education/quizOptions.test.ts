import test from "node:test";
import assert from "node:assert/strict";
import type { EducationQuiz } from "@workspace/api-zod";
import { randomizeQuizOptions } from "./quizOptions";

const question: EducationQuiz["questions"][number] = {
  id: "question-1",
  type: "mcq",
  question: "Which pigment absorbs sunlight?",
  options: ["Chlorophyll", "Soil", "Oxygen", "Water"],
  correctAnswer: "Chlorophyll",
  explanation: "Chlorophyll absorbs sunlight.",
  difficulty: "easy",
  sourcePage: 7,
};

test("all 24 permutations are possible, with the answer equally represented in A, B, C and D", () => {
  const permutations = new Set<string>();
  const correctPositions = [0, 0, 0, 0];
  for (let a = 0; a < 4; a++) {
    for (let b = 0; b < 3; b++) {
      for (let c = 0; c < 2; c++) {
        const draws = [a, b, c];
        const bounds: number[] = [];
        const [shuffled] = randomizeQuizOptions([question], max => {
          bounds.push(max);
          return draws.shift()!;
        });
        assert.deepEqual(bounds, [4, 3, 2]);
        assert.equal(shuffled!.correctAnswer, question.correctAnswer);
        assert.deepEqual([...shuffled!.options].sort(), [...question.options].sort());
        assert.deepEqual({ ...shuffled, options: question.options }, question);
        permutations.add(JSON.stringify(shuffled!.options));
        correctPositions[shuffled!.options.indexOf(shuffled!.correctAnswer)]!++;
      }
    }
  }
  assert.equal(permutations.size, 24);
  assert.deepEqual(correctPositions, [6, 6, 6, 6]);
});

test("questions use independent draws, without rotating or forcing balanced answer positions", () => {
  const input = Array.from({ length: 10 }, (_, i) => ({ ...question, id: String(i) }));
  let calls = 0;
  const result = randomizeQuizOptions(input, max => { calls++; return max - 1; });
  assert.equal(calls, 30);
  // A valid random outcome may repeat: do not replace randomness with a cycle.
  assert.ok(result.every(q => q.options.indexOf(q.correctAnswer) === 0));
  assert.equal(new Set(result.map(q => q.id)).size, 10);
});

test("keeps source data immutable and leaves other question types and their answers untouched", () => {
  const others: EducationQuiz["questions"] = [
    { ...question, id: "boolean", type: "true-false", options: ["True", "False"], correctAnswer: "True" },
    { ...question, id: "short", type: "short-answer", options: [] },
    { ...question, id: "blank", type: "fill-blank", question: "____ absorbs sunlight.", options: [] },
  ];
  const input = [structuredClone(question), ...others];
  const before = structuredClone(input);
  Object.freeze(input[0]!.options);
  let calls = 0;
  const result = randomizeQuizOptions(input, () => { calls++; return 0; });
  assert.deepEqual(input, before);
  assert.notStrictEqual(result[0]!.options, input[0]!.options);
  assert.deepEqual(result.slice(1), others);
  assert.equal(calls, 3);
});

test("option text that is itself a letter remains the answer after reordering", () => {
  const input = { ...question, options: ["A", "B", "C", "D"], correctAnswer: "A" };
  const [result] = randomizeQuizOptions([input], () => 0);
  assert.deepEqual(result!.options, ["B", "C", "D", "A"]);
  assert.equal(result!.correctAnswer, "A");
  assert.equal(result!.options.indexOf(result!.correctAnswer), 3);
});
