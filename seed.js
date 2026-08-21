/**
 * 种子脚本 - 从 js/data.js 中提取示例文章，导出为 db/articles/{id}.md
 * 运行: node seed.js
 *
 * 输出格式（每篇文章一个 .md 文件，带 YAML frontmatter）：
 *   ---
 *   id: 1
 *   title: ...
 *   ...
 *   ---
 *
 *   正文（Markdown）...
 *
 * 警告：会覆盖 db/articles/ 下同名 .md 文件。
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ARTICLES_DIR = path.join(__dirname, 'db', 'articles');
const DATA_JS = path.join(__dirname, 'js', 'data.js');

// 复用 server.js 里的 frontmatter 构造逻辑（保持格式一致）
function yamlValue(v) {
  if (v === null || v === undefined) return '""';
  if (typeof v === 'boolean') return v ? 'true' : 'false';
  if (typeof v === 'number') return String(v);
  if (Array.isArray(v)) {
    if (v.length === 0) return '[]';
    return '[' + v.map(x => String(x).replace(/,/g, '\\,')).join(', ') + ']';
  }
  const s = String(v);
  if (/[:#[\]{}&*?|<>'"%@`\n\r]/.test(s) || s !== s.trim() || s === '') {
    return '"' + s.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n') + '"';
  }
  return s;
}

function buildMarkdown(a) {
  const lines = ['---'];
  ['id','title','subscription','category','author','date','time','weekday','comments','tags','summary']
    .forEach(k => { if (a[k] !== undefined) lines.push(k + ': ' + yamlValue(a[k])); });
  lines.push('---');
  return lines.join('\n') + '\n\n' + (a.content || '') + '\n';
}

// 主流程
if (!fs.existsSync(DATA_JS)) {
  console.error('✗ 找不到 ' + DATA_JS);
  process.exit(1);
}

// 从 data.js 中提取 ARTICLES 数组（将 const 改为 var 以便沙箱可访问）
const dataContent = fs.readFileSync(DATA_JS, 'utf-8')
  .replace(/const ARTICLES/, 'var ARTICLES');
const sandbox = {};
vm.createContext(sandbox);
vm.runInContext(dataContent, sandbox);
const articles = sandbox.ARTICLES || [];

fs.mkdirSync(ARTICLES_DIR, { recursive: true });

let ok = 0, fail = 0;
articles.forEach(a => {
  try {
    const md = buildMarkdown(a);
    const file = path.join(ARTICLES_DIR, a.id + '.md');
    fs.writeFileSync(file, md, 'utf-8');
    ok++;
    console.log('  ✓ #' + a.id + ' ' + a.title + ' → ' + path.basename(file));
  } catch (e) {
    fail++;
    console.error('  ✗ #' + a.id + ' ' + a.title + ': ' + e.message);
  }
});

console.log('\n  种子导入完成: ' + ok + ' 成功, ' + fail + ' 失败');
console.log('  输出目录: ' + ARTICLES_DIR);
console.log('  启动服务器: node server.js');
