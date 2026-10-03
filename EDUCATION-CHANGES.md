# Education Zone file manifest

No existing conversion routes or conversion implementations were edited. Existing homepage sections remain in their original order, with one additional education section after Features. Responsive navigation uses the existing mobile menu below 1440px rather than shrinking or restyling desktop controls.

## Created

### Frontend — `artifacts/pdf-convert-master/`
- `README-EDUCATION.md`
- `src/pages/education/EducationHome.tsx`
- `src/pages/education/QuizGeneratorPage.tsx`
- `src/pages/education/FlashcardsPage.tsx`
- `src/components/education/EducationZoneSection.tsx`
- `src/components/education/EducationToolLayout.tsx`
- `src/components/education/ToolCard.tsx`
- `src/components/education/UploadBox.tsx`
- `src/components/education/OptionControls.tsx`
- `src/components/education/GenerationProgress.tsx`
- `src/components/education/ExportMenu.tsx`
- `src/components/education/QuizPlayer.tsx`
- `src/components/education/QuizEditor.tsx`
- `src/components/education/QuizWorkspace.tsx`
- `src/components/education/FlashcardDeck.tsx`
- `src/components/education/FlashcardGrid.tsx`
- `src/components/education/FlashcardWorkspace.tsx`
- `src/lib/education/educationTools.ts`
- `src/lib/education/useSource.ts`
- `src/lib/education/exportHelpers.ts`
- `src/lib/education/storage.ts`
- `src/lib/education/useTrack.ts`
- `src/lib/education/errors.ts`
- `src/lib/education/pendingFile.ts`

### Backend — `artifacts/api-server/src/education/`
- `config.ts`
- `source.ts`
- `ai.ts`
- `limits.ts`
- `exports.ts`
- `routes.ts`
- `education.test.ts`
- `assets/NotoSansBengali.ttf`
- `assets/OFL.txt`

### Shared database and generated models
- `lib/db/src/schema/education.ts`
- `lib/api-zod/src/generated/types/educationCard.ts`
- `lib/api-zod/src/generated/types/educationDeck.ts`
- `lib/api-zod/src/generated/types/educationErrorResponse.ts`
- `lib/api-zod/src/generated/types/educationEvent.ts`
- `lib/api-zod/src/generated/types/educationEventEvent.ts`
- `lib/api-zod/src/generated/types/educationEventTool.ts`
- `lib/api-zod/src/generated/types/educationExportInput.ts`
- `lib/api-zod/src/generated/types/educationExportInputFormat.ts`
- `lib/api-zod/src/generated/types/educationExportInputKind.ts`
- `lib/api-zod/src/generated/types/educationExtraction.ts`
- `lib/api-zod/src/generated/types/educationFlashcardInput.ts`
- `lib/api-zod/src/generated/types/educationFlashcardInputCount.ts`
- `lib/api-zod/src/generated/types/educationFlashcardInputLanguage.ts`
- `lib/api-zod/src/generated/types/educationFlashcardInputStyle.ts`
- `lib/api-zod/src/generated/types/educationPdfInput.ts`
- `lib/api-zod/src/generated/types/educationProblem.ts`
- `lib/api-zod/src/generated/types/educationQuestion.ts`
- `lib/api-zod/src/generated/types/educationQuestionDifficulty.ts`
- `lib/api-zod/src/generated/types/educationQuestionType.ts`
- `lib/api-zod/src/generated/types/educationQuiz.ts`
- `lib/api-zod/src/generated/types/educationQuizInput.ts`
- `lib/api-zod/src/generated/types/educationQuizInputCount.ts`
- `lib/api-zod/src/generated/types/educationQuizInputDifficulty.ts`
- `lib/api-zod/src/generated/types/educationQuizInputLanguage.ts`
- `lib/api-zod/src/generated/types/educationQuizInputQuestionTypesItem.ts`
- `lib/api-zod/src/generated/types/educationSourcePage.ts`
- `EDUCATION-CHANGES.md`
- `.agents/memory/typescript-preview-codegen.md`
- `.agents/memory/education-privacy-fonts.md`

## Changed existing files
- `artifacts/pdf-convert-master/src/App.tsx` — three lazy routes.
- `artifacts/pdf-convert-master/src/pages/Body.tsx` — one lazy homepage section.
- `artifacts/pdf-convert-master/src/pages/sections/NavigationSection.tsx` — education link and consistent responsive-menu breakpoint.
- `artifacts/pdf-convert-master/src/components/ToolsNavMenu.tsx` — space-safe navigation test IDs.
- `artifacts/pdf-convert-master/src/pages/sections/FooterSection.tsx` — education quick link.
- `artifacts/pdf-convert-master/src/components/RouteSeo.tsx` — education pages own their metadata.
- `artifacts/pdf-convert-master/src/config/publicPageSeo.json` — three public SEO routes.
- `artifacts/pdf-convert-master/src/pages/PrivacyPolicy.tsx` — additive website AI/local-study-storage disclosure.
- `artifacts/pdf-convert-master/public/sitemap.xml` — three URLs for the development preview.
- `artifacts/api-server/src/app.ts` — isolated education sub-app before the unchanged existing body/webhook parsers.
- `artifacts/api-server/package.json` — regression-test command and `tsx` development dependency.
- `lib/db/src/schema/index.ts` — additive quota-table export.
- `lib/api-spec/openapi.yaml` — education contracts; existing health contract retained.
- `lib/api-spec/orval.config.ts` — explicitly target workspace Zod 3.
- `lib/api-client-react/tsconfig.json` — DOM iterable typings for generated requests.
- `lib/api-zod/tsconfig.json` — browser-file typings for multipart contracts.
- `lib/api-client-react/src/generated/api.ts` — generated API hooks.
- `lib/api-client-react/src/generated/api.schemas.ts` — generated frontend models.
- `lib/api-zod/src/generated/api.ts` — generated runtime schemas.
- `lib/api-zod/src/generated/types/index.ts` — generated model exports.
- `lib/api-zod/src/generated/types/healthStatus.ts` — regenerated header only.
- `pnpm-workspace.yaml` and `pnpm-lock.yaml` — test dependency resolution.
- `railpack.json` — add Noto core fonts to existing build/runtime packages.
- `.agents/memory/MEMORY.md` — pointers to durable preview/codegen and privacy/font lessons.
- `.gitignore` — exclude downloaded OCR language-model cache.

## Generated build output
The existing prerender script reads `publicPageSeo.json`, so it required no changes. It generates education page snapshots, metadata/FAQ schemas and the production `dist/public/sitemap.xml` alongside all existing public pages. Build output is not source-controlled.

## Verification boundaries
Real PDF extraction, scanned OCR, upload/page limits, persistent daily quotas/refunds, DOCX/PDF exports and Bengali PDF font output have automated coverage. Strict AI JSON/retry/chunk tests use a local provider fixture. Live provider generation still requires `OPENAI_API_KEY`; no demo/fake response is installed in the application.

Browser checks passed for the hub upload shortcut, quiz scoring/retry/review/edit/delete, separate question/answer PDFs and DOCX, flashcard flip/keyboard/swipe/marks/review/edit/add/delete/shuffle, local deck/progress restoration and clearing, and real export downloads. Only the browser test's generation POST responses were fixture-backed. An unmocked 503 confirmed that source and all selected options remain intact. Copy reported success; clipboard reads and native print-dialog invocation were not verified.

An existing PDF-to-Word conversion produced a genuine DOCX with the correct server MIME/disposition. Its existing browser controls override the filename with the original `.pdf` name; this separate issue was proposed for follow-up rather than changing existing tool behavior.