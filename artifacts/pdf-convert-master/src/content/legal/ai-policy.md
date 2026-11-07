---
title: AI Usage Policy and Disclaimer
description: Which PDF Genius features use AI, their limitations, how AI requests are handled, and how to use the Education Zone responsibly.
---

## 1. Features that use AI

| Feature | What AI does | Provider |
| --- | --- | --- |
| Education Zone — quiz generator, exam paper generator, flashcards, notes maker, summarizer, mind map | Reads the text of your document and drafts study material | OpenAI models via OpenRouter |
| Education Zone — Ask your PDF | Finds relevant passages (using text embeddings) and writes an answer with page citations | OpenAI models via OpenRouter |
| Education Zone — PDF translator (Bangla–English) | Translates page text | OpenAI models via OpenRouter |
| AI image tools (background removal, image upscaling) | Runs an image model on your picture | Replicate |
| OCR (text recognition) | Recognises text in scanned pages | Tesseract, run on our own servers |

Conversions such as PDF to Word, merge, split and compress do not use generative AI.

## 2. Limitations

AI output is generated automatically and **can be wrong**. In particular it may:

- contain factual errors, wrong answers or answer keys that do not match the question;
- miss content, misread tables, formulas, handwriting or poor scans;
- produce translations that lose nuance, or citations that point to the wrong page;
- reflect biases in the underlying model;
- produce different results for the same document.

Upscaled images contain detail invented by the model and are not a faithful record of the original.

## 3. Human review is required

**Always review AI output before you rely on it, share it or use it with students.** Outputs are not professional, legal, medical, financial or academic advice, and are not certified by any school, university or exam board. Teachers are responsible for checking questions, marks and answer keys before using a generated paper. You are responsible for how you use the output.

## 4. Data handling for AI requests

- For Education tools, we extract the text of your document and send it with your request to OpenRouter, which routes it to OpenAI to generate the result. Source documents are processed transiently and are not stored as files; your generated history is kept for 24 hours.
- For AI image tools, the image is sent to Replicate to run the model, and the result is returned to you.
- Providers process this data to return a result under their own terms, including their retention rules. Do not submit content you are not allowed to share, or sensitive personal data you do not need processed.
- We do not use your documents or outputs for advertising.

More detail is in the [Privacy Policy](/privacy).
<!-- TODO: confirm — provider model-training and retention terms (OpenRouter/OpenAI, Replicate) before adding any "not used for training" statement. -->

## 5. Responsible use in the Education Zone

- Use generated quizzes, flashcards and notes to **study and practise**, not to replace reading the source.
- Follow your institution's rules on AI use and disclose AI help when required.
- Do not use the tools during a live exam or to complete assessed work dishonestly.
- Report harmful or clearly wrong output to [{{supportEmail}}](mailto:{{supportEmail}}) so we can improve it.

## 6. Ownership of outputs

Between you and us, you own the outputs you generate, subject to our [Terms](/terms) and the rights of anyone whose content you uploaded. AI output may be similar to output generated for other users and may not be protected by copyright in every country.
