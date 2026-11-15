const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");

const root = path.resolve(__dirname, "..");
const copy = new Set();
const add = (text) => {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (normalized.length >= 2 && normalized.length <= 1500 && /[a-z]{2}/i.test(normalized) &&
      !/^(?:https?:|\/|@|\.\.\/)/.test(normalized)) copy.add(normalized);
};

function scan(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) { scan(file); continue; }
    if (!/\.tsx?$/.test(file)) continue;
    const source = ts.createSourceFile(file, fs.readFileSync(file, "utf8"), ts.ScriptTarget.Latest, true);
    function visit(node) {
      if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node) || ts.isJsxText(node) ||
          ts.isTemplateHead(node) || ts.isTemplateMiddle(node) || ts.isTemplateTail(node)) {
        add(node.text.replace(/&apos;/g, "'").replace(/&amp;/g, "&").replace(/&quot;/g, '"'));
      }
      ts.forEachChild(node, visit);
    }
    visit(source);
  }
}

for (const dir of ["app", "components", "lib"]) scan(path.join(root, dir));
fs.writeFileSync(path.join(root, "data", "interface-copy.json"), JSON.stringify([...copy].sort(), null, 2) + "\n");
