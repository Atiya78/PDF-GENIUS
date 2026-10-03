import ts from "typescript";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const failures = [];
async function inspect(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      await inspect(file);
    } else if (/\.[jt]sx?$/.test(file)) {
      const text = await readFile(file, "utf8");
      const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true,
        file.endsWith("x") ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
      const visit = node => {
        // Check copy candidates (JSX text and quoted/template copy), not comments,
        // identifiers, or internal TODO notes written as source-code comments.
        if ((ts.isJsxText(node) || ts.isStringLiteral(node) ||
          ts.isNoSubstitutionTemplateLiteral(node) || ts.isTemplateHead(node) ||
          ts.isTemplateMiddle(node) || ts.isTemplateTail(node)) && /\bTODO\s*:/i.test(node.text)) {
          const line = source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1;
          failures.push(`${path.relative(root, file)}:${line}: development note in copy`);
        }
        ts.forEachChild(node, visit);
      };
      visit(source);
    }
  }
}
await inspect(path.join(root, "src"));
if (failures.length) {
  console.error(failures.join("\n"));
  process.exitCode = 1;
} else {
  console.log("Public-copy check passed (source-code TODO comments are allowed).");
}