import { test } from "node:test";
import assert from "node:assert/strict";
import { decodeCsv, parseCsv } from "./index";

test("preserves quoted commas, escaped quotes, multiline cells and leading zeroes", () => {
  const result = parseCsv('Code,Description,Value\r\n001,"A, B","He said ""yes"""\r\n002,"line one\nline two",=SUM(A1:A2)');
  assert.deepEqual(result.rows[1], ["001", "A, B", 'He said "yes"']);
  assert.deepEqual(result.rows[2], ["002", "line one\nline two", "=SUM(A1:A2)"]);
});
test("detects common separators without counting quoted delimiters", () => {
  for (const delimiter of [",", ";", "\t", "|"]) {
    const text = `Code${delimiter}Value\n001${delimiter}"A, B; C|D"\n002${delimiter}Text`;
    assert.equal(parseCsv(text).delimiter, delimiter);
    assert.equal(parseCsv(text).rows[1][1], "A, B; C|D");
  }
});
test("supports one-column CSV and preserves ragged rows with blank trailing cells", () => {
  assert.equal(parseCsv("Heading\nFirst\nSecond").columnCount, 1);
  assert.deepEqual(parseCsv("A,B,C\n1,2\n3,4,5").rows[1], ["1", "2", ""]);
});
test("decodes UTF-8 BOM and UTF-16 BOM without changing Unicode values", () => {
  assert.equal(decodeCsv(new Uint8Array([0xef, 0xbb, 0xbf, ...Buffer.from("Name\nবাংলা")])), "Name\nবাংলা");
  const utf16 = Buffer.concat([Buffer.from([0xff, 0xfe]), Buffer.from("Name\nবাংলা", "utf16le")]);
  assert.equal(decodeCsv(utf16), "Name\nবাংলা");
});
test("rejects bad quoting, empty/binary input, unsupported separators and oversize data", () => {
  assert.throws(() => parseCsv('A,B\n"unterminated,2'), /invalid quoting/);
  assert.throws(() => parseCsv(" \n"), /empty/);
  assert.throws(() => decodeCsv(new Uint8Array([0xff, 0x01, 0x80])), /not readable/);
  assert.throws(() => parseCsv("A\0B"), /binary/);
  assert.throws(() => parseCsv("A,B", ":" as never), /separator/);
  assert.throws(() => parseCsv(Array(10002).fill("value").join("\n")), /too large/);
  assert.throws(() => parseCsv(Array(51).fill("value").join(",")), /too large/);
  assert.throws(() => parseCsv("A\n" + "x".repeat(10001)), /too long/);
});
