const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { test, expect } = require("@playwright/test");

const rootDir = path.resolve(__dirname, "..");

function readFile(relativePath) {
  return fs.readFileSync(path.join(rootDir, relativePath), "utf8");
}

function extractTemplateLiteral(source, variableName) {
  const declarationIndex = source.indexOf(`const ${variableName}`);
  if (declarationIndex === -1) {
    throw new Error(`${variableName} template literal was not found`);
  }

  const openTick = source.indexOf("`", declarationIndex);
  if (openTick === -1) {
    throw new Error(`${variableName} opening backtick was not found`);
  }

  const closeTick = source.indexOf("`", openTick + 1);
  if (closeTick === -1) {
    throw new Error(`${variableName} closing backtick was not found`);
  }

  return source.slice(openTick + 1, closeTick);
}

function normalizeLine(line) {
  return String(line || "").replace(/\r/g, "").trim();
}

function parseQuiz01Csv(text) {
  const rows = [];
  const lines = text.split("\n").map(normalizeLine).filter(Boolean);
  for (const line of lines) {
    if (line.startsWith("#")) continue;
    const parts = line.split(",");
    if (parts.length < 2) continue;
    const hangul = (parts[0] || "").trim();
    const kanji = (parts[1] || "").trim();
    const supplement = parts.slice(2).join(",").trim();
    if (!hangul || !kanji) continue;
    rows.push({ hangul, kanji, supplement });
  }
  return rows;
}

function parsePairGroups(text) {
  const groups = [];
  const lines = text.split("\n").map(normalizeLine).filter(Boolean);
  for (const line of lines) {
    const tokens = line.split(/\s+/).filter(Boolean);
    if (tokens.length) groups.push(tokens);
  }
  return groups;
}

function parseQuiz03Entries(text) {
  const entries = [];
  const lines = text.split("\n").map(normalizeLine).filter(Boolean);
  for (const line of lines) {
    if (line.startsWith("#")) continue;
    const hangul = line.split(/\s+/, 1)[0];
    const valuesText = line.slice(hangul.length).trim();
    const values = valuesText.split(",").map((value) => value.trim()).filter(Boolean);
    if (!hangul || values.length === 0) continue;
    entries.push({ hangul, values });
  }
  return entries;
}

function loadQuiz03OptionGroups(source) {
  const context = { window: {} };
  vm.runInNewContext(source, context);
  return context.window.QUIZ03_OPTION_GROUPS;
}

test.describe("Data integrity", () => {
  test("quiz01/02 data templates are valid and non-empty", async () => {
    const quiz01Source = readFile("quiz01-data.js");
    const quiz02Source = readFile("quiz02-data.js");
    const defaultCsv = extractTemplateLiteral(quiz01Source, "DEFAULT_CSV");
    const pair = extractTemplateLiteral(quiz02Source, "PAIR");

    const quiz01Rows = parseQuiz01Csv(defaultCsv);
    const pairGroups = parsePairGroups(pair);
    expect(quiz01Rows.length).toBeGreaterThan(0);
    expect(pairGroups.length).toBeGreaterThan(0);

    for (const row of quiz01Rows) {
      expect(row.hangul.length).toBeGreaterThan(0);
      expect(row.kanji.length).toBeGreaterThan(0);
    }

    for (const group of pairGroups) {
      expect(group.length).toBeGreaterThan(0);
    }
  });

  test("quiz02 pair groups cover all hangul chars used in quiz01", async () => {
    const quiz01Source = readFile("quiz01-data.js");
    const quiz02Source = readFile("quiz02-data.js");
    const quiz01Rows = parseQuiz01Csv(extractTemplateLiteral(quiz01Source, "DEFAULT_CSV"));
    const pairGroups = parsePairGroups(extractTemplateLiteral(quiz02Source, "PAIR"));

    const usedHangulChars = new Set();
    for (const row of quiz01Rows) {
      for (const char of Array.from(row.hangul)) {
        usedHangulChars.add(char);
      }
    }

    const pairChars = new Set(pairGroups.flat());
    const missingChars = Array.from(usedHangulChars).filter((char) => !pairChars.has(char));
    expect(missingChars).toEqual([]);
  });

  test("quiz03 data and option groups are consistent", async () => {
    const quiz03DataSource = readFile("quiz03-data.js");
    const quiz03OptionSource = readFile("quiz03-option.js");
    const defaultTxt = extractTemplateLiteral(quiz03DataSource, "DEFAULT_TXT");
    const entries = parseQuiz03Entries(defaultTxt);
    const optionGroups = loadQuiz03OptionGroups(quiz03OptionSource);

    expect(entries.length).toBeGreaterThan(0);
    expect(Array.isArray(optionGroups)).toBe(true);
    expect(optionGroups.length).toBeGreaterThan(0);

    const knownHangulWords = new Set(entries.map((entry) => entry.hangul));
    for (const entry of entries) {
      expect(entry.values.length).toBeGreaterThan(0);
    }

    for (const group of optionGroups) {
      expect(typeof group.name).toBe("string");
      expect(group.name.length).toBeGreaterThan(0);
      expect(Array.isArray(group.entries)).toBe(true);
      expect(group.entries.length).toBeGreaterThan(0);

      for (const entry of group.entries) {
        expect(typeof entry.hangul).toBe("string");
        expect(entry.hangul.length).toBeGreaterThan(0);
        expect(knownHangulWords.has(entry.hangul)).toBe(true);
        expect(Array.isArray(entry.values)).toBe(true);
        expect(entry.values.length).toBeGreaterThan(0);
      }
    }
  });
});
