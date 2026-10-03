export const educationConfig = {
  maxFileBytes: 20 * 1024 * 1024,
  maxPages: 50,
  maxSourceCharacters: 250_000,
  chunkCharacters: 18_000,
  freeGenerationsPerDay: 5,
  maxConcurrentExtractions: 2,
  maxConcurrentGenerations: 4,
};

export class EducationError extends Error {
  constructor(message: string, public status = 400) { super(message); }
}