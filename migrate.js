/**
 * 迁移脚本 - 把 db/articles.json 转为 db/articles/{id}.md（带 frontmatter）
 * 运行: node migrate.js
 *
 * 文件格式:
 *   ---
 *   id: 1
 *   title: 文章标题
 *   subscription: false
 *   category: 内核
 *   author: admin
 *   date: 2026-08-21
 *   time: 10:00:00 UTC
 *   weekday: Thu
 *   comments: 0
 *   tags: [kernel, linux]
 *   summary: 一句话摘要
 *   ---
 *
 *   正文（Markdown）...
 */

const fs = require('fs');
const path = require('path');

const SRC = path.join(__dirname, 'db', 'articles.json');
const OUT_DIR = path.join(__dirname, 'db', 'articles');

// 把字符串安全嵌入 YAML 值：含特殊字符的加双引号并转义
function yamlValue(v) {
  if (v === null || v === undefined) return '""';
  if (typeof v === 'boolean') return v ? 'true' : 'false';
  if (typeof v === 'number') return String(v);
  if (Array.isArray(v)) {
    if (v.length === 0) return '[]';
    // 标签数组用 flow 风格：[a, b, c]
    return '[' + v.map(x => String(x).replace(/,/g, '\\,')).join(', ') + ']';
  }
  // 字符串
  const s = String(v);
  // 含特殊字符（: # [ ] { } , & * ? | < > ' " % @ ` \n）就用双引号
  if (/[:#[\]{}&*?|<>'"%@`\n\r]/.test(s) || s !== s.trim() || s === '') {
    return '"' + s.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n') + '"';
  }
  return s;
}

function buildFrontmatter(a) {
  const lines = ['---'];
  lines.push('id: ' + yamlValue(a.id));
  lines.push('title: ' + yamlValue(a.title));
  lines.push('subscription: ' + yamlValue(a.subscription));
  lines.push('category: ' + yamlValue(a.category));
  lines.push('author: ' + yamlValue(a.author));
  lines.push('date: ' + yamlValue(a.date));
  lines.push('time: ' + yamlValue(a.time));
  lines.push('weekday: ' + yamlValue(a.weekday));
  lines.push('comments: ' + yamlValue(a.comments));
  lines.push('tags: ' + yamlValue(a.tags));
  lines.push('summary: ' + yamlValue(a.summary));
  lines.push('---');
  return lines.join('\n');
}

function buildMarkdown(a) {
  const fm = buildFrontmatter(a);
  const body = a.content || '';
  // frontmatter 后空一行再正文，避免某些解析器挑剔
  return fm + '\n\n' + body + '\n';
}

// 主流程
if (!fs.existsSync(SRC)) {
  console.error('✗ 找不到源文件: ' + SRC);
  process.exit(1);
}

const db = JSON.parse(fs.readFileSync(SRC, 'utf-8'));
const articles = db.articles || [];
fs.mkdirSync(OUT_DIR, { recursive: true });

let ok = 0, fail = 0;
articles.forEach(a => {
  try {
    const md = buildMarkdown(a);
    const file = path.join(OUT_DIR, a.id + '.md');
    fs.writeFileSync(file, md, 'utf-8');
    ok++;
    console.log(`  ✓ #${a.id} ${a.title} → ${path.basename(file)}`);
  } catch (e) {
    fail++;
    console.error(`  ✗ #${a.id} ${a.title}: ${e.message}`);
  }
});

console.log(`\n  迁移完成: ${ok} 成功, ${fail} 失败`);
console.log(`  输出目录: ${OUT_DIR}`);
console.log(`  下一个 ID: ${db.nextId || articles.length + 1}`);
