import { EducationError } from "../config";
import { educationConfig } from "../config";

type Waiting = { priority: number; entered: number; run: () => void };
const waiting: Waiting[] = [];
let running = 0;
function drain() {
  while (running < educationConfig.maxConcurrentGenerations && waiting.length) {
    const now = Date.now();
    // Age waiting requests so priority traffic cannot starve other customers.
    waiting.sort((a, b) => (b.priority + (now - b.entered) / 60_000) - (a.priority + (now - a.entered) / 60_000) || a.entered - b.entered);
    running++; waiting.shift()!.run();
  }
}
export function runEducationJob<T>(priority: number, task: () => Promise<T>, disconnected?: () => boolean): Promise<T> {
  if (waiting.length >= 40) return Promise.reject(new EducationError("The Education queue is full. Please retry shortly; no credits were charged.", 503));
  return new Promise<T>((resolve, reject) => {
    const entry: Waiting = { priority, entered: Date.now(), run: () => {
      clearTimeout(timer);
      if (disconnected?.()) { running--; reject(new EducationError("The request was disconnected. No credits were charged.", 499)); drain(); return; }
      void task().then(resolve, reject).finally(() => { running--; drain(); });
    } };
    const timer = setTimeout(() => {
      const index = waiting.indexOf(entry);
      if (index >= 0) { waiting.splice(index, 1); reject(new EducationError("The Education queue timed out. Please retry; no credits were charged.", 503)); }
    }, 90_000);
    timer.unref(); waiting.push(entry); drain();
  });
}
