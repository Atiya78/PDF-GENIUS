---
name: TypeScript preview and codegen compatibility
description: Replit JSX metadata transforms and Orval browser/Zod compatibility traps.
---

Explicit generic JSX tags can compile in TypeScript and the production build yet fail in the development preview. Prefer inferred component props (const type parameters and NoInfer where needed) over `<Component<Type> ...>`.

**Why:** Replit's metadata transform inserted data attributes between the component name and its generic argument, producing malformed JSX before Babel parsed it. A passing typecheck/build alone did not catch this preview-only failure.

**How to apply:** When adding typed components, confirm their module loads in the actual proxied Vite preview. Preserve strong typing through props rather than casting values to `never`.

Keep Orval's Zod target aligned with the workspace's installed major version. Multipart-generated shared models need browser File/Blob typings; generated request code using Headers.entries also needs DOM.Iterable.

**Why:** Orval 8 defaulted to Zod 4 constructs in a Zod 3 workspace. Adding multipart education contracts exposed separate missing browser-type libraries, even though the existing simple health contract had compiled.

**How to apply:** Check the actual generator output and workspace library versions when introducing new request shapes; do not manually patch generated files.