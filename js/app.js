/* ============================================================
   博客应用逻辑 - API 驱动版
   从后端 /api/articles 获取数据，渲染 lwn.net 风格页面
   ============================================================ */

/* ---------- Markdown 配置 ---------- */
if (typeof marked !== 'undefined') {
  marked.setOptions({ breaks: true, gfm: true });
}

// 重写 markdown 中的本地图片引用：picture/xxx.png → /picture/xxx.png
// 支持两种写法：![alt](picture/x.png) 和 ![alt](./picture/x.png)
// 已经是 /picture/... 的保持原样
function rewritePicturePaths(md) {
  if (!md) return md;
  return md
    // ![alt](picture/x.png)  或  ![alt](./picture/x.png)  →  !alt](/picture/x.png)
    .replace(/!\[([^\]]*)\]\((\.?\/)?picture\/([^)]+)\)/g, '![$1](/picture/$3)')
    // <img src="picture/x.png"> 或 <img src="./picture/x.png">
    .replace(/(<img\s+[^>]*?src=["'])(\.?\/)?picture\/([^"']+)(["'][^>]*?>)/g, '$1/picture/$3$4');
}

// 渲染 markdown 中的数学公式（KaTeX）
// 在 marked 解析后的 DOM 树里自动识别 $$..$$ 和 $..$ 并替换
function renderMathIn(el) {
  if (typeof window === 'undefined') return;
  if (!el) return; // 没有目标节点直接退出，避免后续对 null 调用
  // 等 KaTeX 库加载完（最多重试 60 次 = 3 秒；超时则放弃，避免 CDN 挂掉时无限循环）
  let retries = 0;
  const tryRender = () => {
    if (typeof window.renderMathInElement === 'function') {
      try {
        window.renderMathInElement(el, {
          delimiters: [
            { left: '$$', right: '$$', display: true },
            { left: '$',  right: '$',  display: false }
          ],
          throwOnError: false
        });
      } catch (e) { /* 静默 */ }
    } else if (retries++ < 60) {
      // KaTeX 还没加载完，50ms 后重试
      setTimeout(tryRender, 50);
    }
    // 超过重试上限就放弃：CDN 挂了或被防火墙挡住
  };
  tryRender();
}

function renderMarkdown(md) {
  if (typeof marked !== 'undefined') return marked.parse(rewritePicturePaths(md));
  const esc = rewriteMarkdownEscaped(md).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  return '<p>' + esc.replace(/\n\n/g, '</p><p>') + '</p>';
}
// 降级路径也走一遍路径重写（避免 marked 缺失时图片显示为外链）
function rewriteMarkdownEscaped(md) { return rewritePicturePaths(md || ''); }

/* ---------- API 调用 ----------
   一律带 cache: 'no-store'，避免浏览器把上一份的
   列表/评论缓存发给 bfcache 恢复后的页面，用户因此看到旧评论数。
   后退时由 pageshow 监听器重新调用 renderXxxPage()，配合此选项
   保证拿到的是服务器当前的真实数据。 */
async function fetchArticles() {
  const res = await fetch('/api/articles', { cache: 'no-store' });
  return res.json();
}

async function fetchArticle(id) {
  const res = await fetch('/api/articles/' + id, { cache: 'no-store' });
  return res.json();
}

async function fetchTagIndex() {
  const res = await fetch('/api/tags', { cache: 'no-store' });
  return res.json();
}

/* ---------- 日期格式化（复刻 lwn.net 格式） ---------- */
function formatDate(dateStr, time, weekday) {
  const d = new Date(dateStr);
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const m = months[d.getMonth()] || 'Jan';
  const day = d.getDate();
  const year = d.getFullYear();
  return `Posted ${m} ${day}, ${year} ${time || ''} (${weekday || ''})`;
}

/* ---------- 共享布局 ---------- */
function renderLayout(targetBodyContent, sidebarCats) {
  // 默认 6 个分类 + 动态从 articles 提取的分类，去重排序，截断前 10 个
  const defaultCats = ["Kernel","Security","Development","Distributions","Briefs","Announcements"];
  const merged = [...new Set([...defaultCats, ...(sidebarCats || [])])];
  const finalCats = merged.slice(0, 10);
  const catsHTML = finalCats.map(c =>
    `<li><a href="search.html?cats=${encodeURIComponent(c)}">${escapeHtml(c)}</a></li>`
  ).join('');

  const layout = `
<div id="menu">
  <a href="index.html" aria-label="返回首页">
    <img class="logo" src="css/logo.jpg" alt="SUN Notes">
    <span class="logo">SUN<br>.Notes</span>
    <span class="logobl">来自开源世界的观察</span>
  </a>
  <div class="navmenu-container">
    <ul class="navmenu">
      <li><a class="navmenu" href="#t"><b>内容</b></a>
        <ul>
          <li><a href="index.html">首页</a></li>
          <li><a href="tags.html">标签分类</a></li>
          <li><a href="search.html">搜索</a></li>
          <li class="cats-sep"><hr></li>
          ${catsHTML}
          <li><a href="about.html">关于</a></li>
          <li><hr></li>
          <li><a href="admin.html">写作入口</a></li>
          <li><a href="about.html#contact">联系方式</a></li>
        </ul>
      </li>
    </ul>
  </div>
</div>
<div class="topnav-spacer"></div>
<div class="top-banner not-print"></div>
<div class="topnav-container">
  <div class="not-handset topnav-row">
    <div class="topnav-left">
      <form action="search.html" method="get" class="loginform" onsubmit="window.location.href='search.html?q='+encodeURIComponent(this.q.value);return false;">
        <label><b>搜索：</b> <input type="text" name="q" value="" size="12" id="searchbox" placeholder="关键词..." /></label>
        <input type="submit" value="搜索" />
      </form> |
      <form action="about.html" class="loginform"><input type="submit" value="关于" /></form> |
      <form action="tags.html" class="loginform"><input type="submit" value="标签" /></form> |
      <form action="admin.html" class="loginform"><input type="submit" value="写作" /></form> |
      <form action="index.html" class="loginform"><input type="submit" value="首页" /></form>
    </div>
  </div>
  <div class="handset-only">
    <a href="index.html"><b>首页</b></a> /
    <a href="search.html"><b>搜索</b></a> /
    <a href="about.html"><b>关于</b></a> /
    <a href="tags.html"><b>标签</b></a> /
    <a href="admin.html"><b>写作</b></a>
  </div>
</div>
${targetBodyContent}
<br clear="all">
<center>
  <P>
  <span class="ReallySmall">
  Copyright &copy; 2026, SUN Notes<br>
  本站文章版权归原作者所有<br>
  </span>
</center>
`;
  document.body.innerHTML = layout;

}

/* ---------- 文章列表项 HTML ---------- */
function articleListingHTML(article) {
  const subMark = article.subscription ? '[<span class="Subscription">$</span>] ' : '';
  const metaLine = `<span class="Smaller">[${article.category}] ${formatDate(article.date, article.time, article.weekday)} by ${article.author}</span>`;
  const fullStory = article.comments > 0
    ? `<a href="article.html?id=${article.id}">Full Story</a> (<a href="article.html?id=${article.id}#Comments">comments: ${article.comments}</a>)`
    : `<a href="article.html?id=${article.id}">Comments (none posted)</a>`;
  return `
    <h2 class="Headline">${subMark}<a href="article.html?id=${article.id}" style="color:inherit;text-decoration:none;">${escapeHtml(article.title)}</a></h2>
    <div class="BlurbListing">
      ${metaLine}
      <p>${escapeHtml(article.summary)}
      <p>${fullStory}
      <p>
    </div>
  `;
}

/* ---------- 首页：LWN archive 风格，按"期"分组 ----------
   版式：每期一个带下划线的标题（H3 SummaryHL），下面是该期全部文章的
   bullet 列表——每篇文章独立一条（不再按 category 桶合并到一行）。
   按发布时间倒序。顶部保留搜索框用于关键词 + 分类筛选。 */

// ISO 周编号：YYYY 第几周
function getISOWeek(dateStr) {
  const d = new Date(dateStr);
  const target = new Date(d.valueOf());
  const dayNr = (d.getDay() + 6) % 7; // 周一=0
  target.setDate(target.getDate() - dayNr + 3); // 跳到当周周四
  const firstThursday = target.valueOf();
  target.setMonth(0, 1);
  if (target.getDay() !== 4) {
    target.setMonth(0, 1 + ((4 - target.getDay()) + 7) % 7);
  }
  const week = 1 + Math.ceil((firstThursday - target) / 604800000);
  return [d.getFullYear(), week];
}

function getISOWeekKey(dateStr) {
  const [y, w] = getISOWeek(dateStr);
  return y + '-W' + String(w).padStart(2, '0');
}

function formatEditionDate(dateStr) {
  const d = new Date(dateStr);
  const months = ['January','February','March','April','May','June',
                  'July','August','September','October','November','December'];
  return months[d.getMonth()] + ' ' + d.getDate() + ', ' + d.getFullYear();
}

// 列表里的单条文章 bullet：标题链接 + 一行小字元数据
function homeArticleBullet(article) {
  const subMark = article.subscription
    ? '<span class="Subscription" title="订阅精选">$</span> '
    : '';
  const cat = escapeHtml(article.category || 'Other');
  const time = article.time ? ' ' + article.time : '';
  const dateLine = article.date + time + (article.weekday ? ' (' + article.weekday + ')' : '') + ' by ' + escapeHtml(article.author || 'anonymous');
  const commentHTML = article.comments > 0
    ? ' · <a href="article.html?id=' + article.id + '#Comments">评论 ' + article.comments + '</a>'
    : '';
  return '<li class="HomeArticle">' + subMark
    + '<a href="article.html?id=' + article.id + '">' + escapeHtml(article.title) + '</a>'
    + ' <span class="Smaller HomeArticleMeta">[' + cat + '] &middot; ' + escapeHtml(dateLine) + commentHTML + '</span>'
    + '</li>';
}

async function renderHomePage() {
  const articles = await fetchArticles();

  // 所有出现过的分类（用于搜索框多选）
  const allCats = [...new Set(articles.map(a => a.category).filter(Boolean))].sort();

  // 按 ISO 周分组；组内按发布时间倒序（新文章在前）；组间按 key 降序
  const groupsByKey = new Map();
  for (const a of articles) {
    if (!a.date) continue;
    const key = getISOWeekKey(a.date);
    if (!groupsByKey.has(key)) groupsByKey.set(key, []);
    groupsByKey.get(key).push(a);
  }
  const sortedKeys = [...groupsByKey.keys()].sort().reverse();

  // 每期渲染：标题 + 每篇文章独立 bullet 一条
  const editionsHTML = sortedKeys.map(key => {
    const list = groupsByKey.get(key).slice().sort((a, b) =>
      (b.date + ' ' + (b.time || '')).localeCompare(a.date + ' ' + (a.time || ''))
    );
    const maxDate = list.reduce((m, a) => (a.date > m ? a.date : m), '');
    const itemsHTML = list.map(homeArticleBullet).join('\n');

    return `
      <div class="HomeEdition" id="ed-${key}">
        <h3 class="SummaryHL"><a name="${key}">SUN Notes Weekly Edition for ${formatEditionDate(maxDate)}</a></h3>
        <ul class="HomeEditionList">${itemsHTML}</ul>
      </div>
    `;
  }).join('\n');

  const sidebarCats = [...new Set(articles.map(a => a.category).filter(Boolean))];

  // 顶部介绍 + 完整的搜索框（关键词 + 多选分类 + 排序 + 提交）
  // 分类 checkbox 状态持久化到 localStorage：刷新页面或跨页跳回来都保持用户最近选择
  const PREFS_KEY = 'oss_home_search_cats';
  function readHomePrefs() {
    try { const raw = localStorage.getItem(PREFS_KEY); if (raw) return JSON.parse(raw) || null; }
    catch (e) {}
    return null;
  }
  const homePrefs = readHomePrefs();
  const catsCheckboxes = allCats.map(c => {
    // 首次访问 (null) → 全部 checked；之前存过 → 按 prefs 还原
    const checked = (homePrefs && (c in homePrefs)) ? (homePrefs[c] ? 'checked' : '') : 'checked';
    return '<label><input type="checkbox" name="cat" value="' + c + '" ' + checked + ' /> ' + c + '</label>';
  }).join('');

  const headerHTML = `
    <div class="PageHeadline"><h1>SUN Notes 文章归档</h1></div>
    <div class="ArticleText"><main>
      <p>这里按发布日期整理 SUN Notes 自创建以来的全部文章。最新发布在最上方。点击文章标题阅读全文。
      <p>也可以前往 <a href="search.html">搜索</a> 页面按关键词与分类筛选；或者 <a href="tags.html">标签页</a> 按主题浏览。
      <p>
      <div class="lwn-search-box">
        <form onsubmit="return submitSearchForm(this);">
          <div class="lwn-search-row">
            <span class="lwn-search-label"><b>Query：</b></span>
            <input type="text" name="q" size="40" autofocus placeholder="输入关键词搜索..." />
            <input type="submit" value="搜索" class="lwn-search-btn" />
          </div>
          <div class="lwn-search-row">
            <span class="lwn-search-label"><b>分类筛选：</b></span>
            <div class="lwn-cats" id="homeCatFilters">
              ${catsCheckboxes}
              <a href="#" onclick="
                var bs=this.parentNode.querySelectorAll('input[type=checkbox]');
                var all=Array.from(bs).every(function(b){return b.checked;});
                bs.forEach(function(b){b.checked=!all;});
                try {
                  var p={};
                  bs.forEach(function(b){p[b.value]=b.checked;});
                  localStorage.setItem('${PREFS_KEY}', JSON.stringify(p));
                } catch(e) {}
                return false;" style="margin-left:0.5em">全部切换</a>
            </div>
          </div>
          <div class="lwn-search-row">
            <span class="lwn-search-label"><b>排序：</b></span>
            <label><input type="radio" name="order" value="relevance" /> 相关度</label>
            <label><input type="radio" name="order" value="date" checked /> 日期</label>
          </div>
        </form>
      </div>
      <p style="color:var(--VLinkColor);font-size:smaller">目前共 ${articles.length} 篇文章，归档自 2026 年 8 月。</p>
      ${editionsHTML || '<div class="no-results">暂无文章。<a href="admin.html">前往写作入口</a>添加第一篇。</div>'}
    </main></div>
  `;

  const mainContent = `
<div class="maincolumn flexcol">
  <div class="middlecolumn">
    ${headerHTML}
  </div>
  <div class="rightcol not-print"></div>
</div>
  `;
  renderLayout(mainContent, sidebarCats);

  // 渲染完后绑定首页搜索框 checkbox 的 change 事件 → 同步 localStorage
  // 这样无论用户点 checkbox 还是点"全部切换"，都能把当前状态保存
  const cats = document.querySelectorAll('#homeCatFilters input[type=checkbox][name=cat]');
  cats.forEach(b => {
    b.addEventListener('change', () => {
      const prefs = {};
      cats.forEach(x => { prefs[x.value] = x.checked; });
      try { localStorage.setItem(PREFS_KEY, JSON.stringify(prefs)); } catch (e) {}
    });
  });
}

/* ---------- 文章详情 ---------- */
async function renderArticlePage() {
  const params = new URLSearchParams(window.location.search);
  const id = params.get('id') || 1;
  const requestedReturnUrl = params.get('from') || '';
  let returnUrl = '';
  try {
    const parsedReturnUrl = new URL(requestedReturnUrl, window.location.href);
    if (parsedReturnUrl.origin === window.location.origin && parsedReturnUrl.pathname.endsWith('/search.html')) {
      returnUrl = parsedReturnUrl.pathname + parsedReturnUrl.search;
    }
  } catch (e) {}

  // 并发拉：单篇 + 列表 + 评论
  let article = null;
  let allArticles = [];
  let comments = [];
  try {
    [article, allArticles, comments] = await Promise.all([
      fetchArticle(id).catch(() => null),
      fetchArticles().catch(() => []),
      fetchComments(id).catch(() => [])
    ]);
  } catch (e) { /* 失败时使用默认值 */ }

  if (!article || article.error) {
    renderLayout(`
      <div class="maincolumn flexcol"><div class="middlecolumn">
        <div class="PageHeadline"><h1>文章未找到</h1></div>
        <div class="ArticleText"><main>
          <p>请求的文章不存在。请返回<a href="index.html">首页</a>浏览其他文章。</p>
        </main></div>
      </div><div class="rightcol not-print"></div></div>
    `, allArticles.map(a => a.category));
    return;
  }

  const subMark = article.subscription ? '[<span class="Subscription">$</span>] ' : '';
  const articleIndex = allArticles.findIndex(a => a.id === article.id);
  // 文章按发布时间倒序：左侧永远是较早文章，右侧永远是较新文章。
  const olderArticle = articleIndex >= 0 && articleIndex < allArticles.length - 1 ? allArticles[articleIndex + 1] : null;
  const newerArticle = articleIndex > 0 ? allArticles[articleIndex - 1] : null;
  const navReturn = returnUrl ? '&from=' + encodeURIComponent(returnUrl) : '';
  const articleNav = `<p class="article-nav">${olderArticle ? '<a href="article.html?id=' + olderArticle.id + navReturn + '" title="阅读较早发布的文章">← 较早文章：' + escapeHtml(olderArticle.title) + '</a>' : '<span></span>'}${newerArticle ? '<a href="article.html?id=' + newerArticle.id + navReturn + '" title="阅读较新发布的文章">较新文章：' + escapeHtml(newerArticle.title) + ' →</a>' : '<span></span>'}</p>`;
  const tagsHTML = (article.tags || []).map(t =>
    `<a href="tags.html?tag=${t}" class="tag-badge">${t}</a>`
  ).join('');
  const categoryHTML = `<a class="category-badge" href="search.html?cats=${encodeURIComponent(article.category || '')}">${escapeHtml(article.category)}</a>`;
  const related = allArticles
    .filter(a => a.id !== article.id)
    .map(a => ({ article: a, score: (a.category === article.category ? 3 : 0) + (a.tags || []).filter(t => (article.tags || []).includes(t)).length }))
    .filter(x => x.score > 0)
    .sort((a, b) => b.score - a.score || (b.article.date + ' ' + b.article.time).localeCompare(a.article.date + ' ' + a.article.time))
    .slice(0, 3)
    .map(x => `<li><a href="article.html?id=${x.article.id}">${escapeHtml(x.article.title)}</a></li>`)
    .join('');
  const relatedHTML = related ? `<section class="related-articles"><h3 class="Headline">相关文章</h3><ul>${related}</ul></section>` : '';
  const parsedUpdated = article.updatedAt ? new Date(article.updatedAt) : null;
  const updatedText = parsedUpdated && !isNaN(parsedUpdated.getTime())
    ? parsedUpdated.toLocaleString('zh-CN')
    : formatDate(article.date, article.time, article.weekday);
  const returnHTML = returnUrl ? ` | <a href="${escapeHtml(returnUrl)}">返回搜索结果</a>` : '';

  const mainContent = `
<div id="readingProgress" aria-hidden="true"></div>
<div class="maincolumn flexcol">
  <div class="middlecolumn">
    <div class="PageHeadline"><h1>${subMark}${escapeHtml(article.title)}</h1></div>
    <div class="ArticleText"><main>
      <div class="article-meta">
        ${categoryHTML}
        ${formatDate(article.date, article.time, article.weekday)} by <b>${escapeHtml(article.author)}</b>
        | <a href="index.html">返回列表</a>${returnHTML}
        <br><span>最后更新：${escapeHtml(updatedText)}</span>
      </div>
      ${articleNav}
      <div class="markdown-body">${renderMarkdown(article.content)}</div>
      ${relatedHTML}
      <a name="Comments"></a>
      <h2 class="Headline">评论 (${comments.length})</h2>
      <div id="commentList" class="comment-list">
        ${renderCommentList(comments)}
      </div>
      <h3 class="Headline">发表评论</h3>
      <form id="commentForm" class="comment-form" onsubmit="return submitComment(event, ${article.id});">
        <table class="Form">
          <tr>
            <td><b>署名：</b></td>
            <td><input type="text" name="author" size="30" maxlength="50" placeholder="你的名字（可留空用 anonymous）"></td>
          </tr>
          <tr>
            <td valign="top"><b>内容：</b></td>
            <td><textarea name="content" rows="5" cols="60" maxlength="5000" placeholder="说点什么...（支持简单换行）"></textarea></td>
          </tr>
          <tr>
            <td></td>
            <td>
              <input type="submit" value="提交评论">
              <span id="commentMsg" class="Smaller"></span>
            </td>
          </tr>
        </table>
      </form>
      <h2 class="Headline">标签</h2>
      <div class="BlurbListing">${tagsHTML}</div>
    </main></div>
  </div>
  <div class="rightcol not-print" id="articleRight"></div>
</div>
  `;
  renderLayout(mainContent, [...new Set(allArticles.map(a => a.category))]);
  document.title = `${article.title} [SUN Notes]`;
  setupReadingProgress();
  // 渲染数学公式（KaTeX）+ 目录（TOC）+ 代码高亮（hljs）
  setTimeout(() => {
    const body = document.querySelector('.markdown-body');
    if (!body) return;
    renderMathIn(body);
    const right = document.getElementById('articleRight');
    if (right) {
      const tocHTML = buildArticleToc(body);
      if (tocHTML) right.innerHTML = tocHTML;
    }
    highlightCodeBlocks(body);
    setupImageLightbox(body);
  }, 0);
}

function setupReadingProgress() {
  const bar = document.getElementById('readingProgress');
  const update = () => {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    bar.style.width = (max > 0 ? Math.min(100, window.scrollY / max * 100) : 0) + '%';
  };
  window.addEventListener('scroll', update, { passive: true });
  update();
}

function setupImageLightbox(body) {
  body.querySelectorAll('img').forEach(image => {
    image.title = image.title || '点击放大';
    image.addEventListener('click', () => {
      const overlay = document.createElement('div');
      overlay.className = 'image-lightbox';
      overlay.innerHTML = '<img src="' + escapeHtml(image.src) + '" alt="' + escapeHtml(image.alt || '') + '"><button type="button" aria-label="关闭">关闭</button>';
      const close = () => overlay.remove();
      overlay.addEventListener('click', event => { if (event.target === overlay) close(); });
      overlay.querySelector('button').addEventListener('click', close);
      document.body.appendChild(overlay);
    });
  });
}

/* ---------- 目录 + 代码高亮 helpers ---------- */
// 把标题文本生成 URL 友好 slug：保留中文 unicode，空格和特殊字符转 -
function slugify(text) {
  let s = String(text || '').trim().toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\w\u4e00-\u9fff-]+/g, '')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
  return s || ('h-' + Math.random().toString(36).slice(2, 7));
}

// 在 markdown 渲染后的 DOM 树里找 h2/h3/h4，给它们加 id 并返回目录 HTML
function buildArticleToc(markdownBodyEl) {
  if (!markdownBodyEl) return '';
  // 收集所有 h2/h3/h4 —— 标题层级决定缩进
  const heads = markdownBodyEl.querySelectorAll('h2, h3, h4');
  if (!heads.length) return '';
  const items = [];
  const used = new Set();
  heads.forEach(h => {
    const text = (h.textContent || '').trim();
    if (!text) return;
    // 过滤掉评论相关章节
    if (/评论|发表/.test(text)) return;
    let baseId = slugify(text);
    let id = baseId, n = 2;
    while (used.has(id)) id = baseId + '-' + (n++);
    used.add(id);
    h.id = id;
    // h2 不缩进，h3 缩进中等，h4 缩进最大
    const cls = h.tagName === 'H2' ? 'article-toc-h2'
              : h.tagName === 'H3' ? 'article-toc-h3'
              : 'article-toc-h4';
    items.push(`<li class="${cls}"><a href="#${encodeURIComponent(id)}">${escapeHtml(text)}</a></li>`);
  });
  if (!items.length) return '';
  return `<div class="SideBox article-toc"><p class="Header">本文目录</p><ul class="NoBullet spacylist">${items.join('')}</ul></div>`;
}

// 代码块高亮（标记后立刻可调；hljs 还没加载时最多重试 60 次，约 3 秒）
function highlightCodeBlocks(el) {
  if (!el) return;
  function tryHighlight(retries) {
    if (typeof window.hljs !== 'undefined') {
      el.querySelectorAll('pre code').forEach(b => {
        try { window.hljs.highlightElement(b); } catch (e) { /* 静默 */ }
        if (!b.parentElement.querySelector('.copy-code')) {
          const button = document.createElement('button');
          button.className = 'copy-code';
          button.type = 'button';
          button.textContent = '复制代码';
          button.addEventListener('click', async () => {
            try { await navigator.clipboard.writeText(b.textContent); button.textContent = '已复制'; }
            catch (err) { button.textContent = '复制失败'; }
            setTimeout(() => { button.textContent = '复制代码'; }, 1200);
          });
          b.parentElement.style.position = 'relative';
          b.parentElement.appendChild(button);
        }
      });
    } else if (retries < 60) {
      setTimeout(() => tryHighlight(retries + 1), 50);
    }
  }
  tryHighlight(0);
}

/* ---------- 评论 ---------- */
async function fetchComments(articleId) {
  const res = await fetch('/api/articles/' + articleId + '/comments', { cache: 'no-store' });
  return res.json();
}

function renderCommentList(comments) {
  if (!comments.length) {
    return '<div class="BlurbListing"><p><i>暂无评论，欢迎抢沙发。</i></p></div>';
  }
  return comments.map(c => `
    <div class="comment-item">
      <div class="comment-head">
        <b>${escapeHtml(c.author || 'anonymous')}</b>
        <span class="Smaller">${formatDate(c.date, c.time, c.weekday)}</span>
      </div>
      <div class="comment-body">${formatCommentBody(c.content)}</div>
    </div>
  `).join('');
}

function formatCommentBody(text) {
  // 简单换行 + 链接 + 防 XSS
  const esc = escapeHtml(text || '');
  return esc
    .replace(/\r\n|\r|\n/g, '<br>')
    .replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" rel="nofollow">$1</a>');
}

window.submitComment = async function(e, articleId) {
  e.preventDefault();
  const form = e.target;
  const author = (form.author.value || '').trim();
  const content = (form.content.value || '').trim();
  if (!content) {
    document.getElementById('commentMsg').innerHTML = ' <i style="color:#a44">内容不能为空</i>';
    return false;
  }
  const btn = form.querySelector('input[type=submit]');
  btn.disabled = true; const oldText = btn.value; btn.value = '提交中...';
  try {
    const res = await fetch('/api/articles/' + articleId + '/comments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ author, content })
    });
    const data = await res.json();
    if (res.ok) {
      // 重新拉评论列表刷新显示
      const list = await fetchComments(articleId);
      document.getElementById('commentList').innerHTML = renderCommentList(list);
      // 更新标题旁的计数
      const headH2 = document.querySelector('a[name="Comments"] + h2.Headline');
      if (headH2) headH2.textContent = '评论 (' + list.length + ')';
      form.reset();
      document.getElementById('commentMsg').innerHTML = ' <i style="color:#393">已提交</i>';
    } else {
      document.getElementById('commentMsg').innerHTML = ' <i style="color:#a44">' + escapeHtml(data.error || '提交失败') + '</i>';
    }
  } catch (err) {
    document.getElementById('commentMsg').innerHTML = ' <i style="color:#a44">' + escapeHtml(err.message) + '</i>';
  } finally {
    btn.disabled = false; btn.value = oldText;
  }
  return false;
};

/* ---------- 搜索页 ---------- */
// 共享：从某个 form 收集 q + 选中的 cats，跳转到搜索页
window.submitSearchForm = function(form) {
  var q = form.querySelector('[name=q]').value;
  var cs = Array.from(form.querySelectorAll('[name=cat]:checked')).map(function(c){return c.value;});
  var orderEl = form.querySelector('[name=order]:checked');
  var order = orderEl ? orderEl.value : 'date';
  // 始终传 cats，包括空值；空值代表用户明确取消了全部分类。
  var url = 'search.html?q=' + encodeURIComponent(q)
    + '&cats=' + encodeURIComponent(cs.join(','))
    + '&order=' + encodeURIComponent(order);
  window.location.href = url;
  return false;
};

async function renderSearchPage() {
  const params = new URLSearchParams(window.location.search);
  const query = params.get('q') || '';
  const cat = params.get('cat') || '';        // 单选，向后兼容
  const cats = (params.get('cats') || '').split(',').map(s => s.trim()).filter(Boolean);
  const hasCatsParam = params.has('cats');
  const order = params.get('order') === 'relevance' ? 'relevance' : 'date';

  let allArticles = [];
  try {
    allArticles = await fetchArticles();
  } catch (e) {
    allArticles = [];
  }

  // 动态提取所有分类：从文章中提取 + 合并硬编码默认（保证默认6个分类即使无文章也展示）
  const defaultCats = ["Kernel","Security","Development","Distributions","Briefs","Announcements"];
  const dynCats = [...new Set(allArticles.map(a => a.category))];
  const allCats = [...new Set([...defaultCats, ...dynCats])].sort();

  // 当前选中的分类集合（小写）
  const catsSet = new Set(cats.map(c => c.toLowerCase()));
  if (cat) catsSet.add(cat.toLowerCase());
  const hasFilter = catsSet.size > 0;

  // 过滤逻辑
  let results = allArticles;
  if (query) {
    const q = query.toLowerCase();
    results = results.filter(a =>
      String(a.title || '').toLowerCase().includes(q) ||
      String(a.summary || '').toLowerCase().includes(q) ||
      (a.tags || []).some(t => String(t).toLowerCase().includes(q)) ||
      String(a.category || '').toLowerCase().includes(q) ||
      String(a.author || '').toLowerCase().includes(q)
    );
  }
  if (hasCatsParam && catsSet.size === 0) {
    results = [];
  } else if (catsSet.size) {
    results = results.filter(a => catsSet.has(String(a.category || '').toLowerCase()));
  }

  function articleDateValue(article) {
    return (article.date || '') + ' ' + (article.time || '');
  }

  function relevanceScore(article, term) {
    if (!term) return 0;
    const q = term.toLowerCase();
    const title = String(article.title || '').toLowerCase();
    const summary = String(article.summary || '').toLowerCase();
    const tags = (article.tags || []).map(t => String(t).toLowerCase()).join(' ');
    const category = String(article.category || '').toLowerCase();
    const author = String(article.author || '').toLowerCase();
    let score = 0;
    if (title === q) score += 1000;
    if (title.includes(q)) score += 500;
    if (tags.includes(q)) score += 250;
    if (summary.includes(q)) score += 100;
    if (category.includes(q)) score += 50;
    if (author.includes(q)) score += 25;
    return score;
  }

  results.sort((a, b) => {
    if (order === 'relevance' && query) {
      const scoreDiff = relevanceScore(b, query) - relevanceScore(a, query);
      if (scoreDiff) return scoreDiff;
    }
    return articleDateValue(b).localeCompare(articleDateValue(a));
  });

  let resultsHTML = '';
  if (query || cat || cats.length) {
    if (results.length === 0) {
      resultsHTML = `<div class="no-results">未找到匹配 "${escapeHtml(query || (cats.join(',') || cat))}" 的文章。</div>`;
    } else {
      resultsHTML = results.map(a => {
        const subMark = a.subscription ? '[<span class="Subscription">$</span>] ' : '';
        return `
          <div class="search-result">
            <h3 class="Headline">${subMark}<a href="article.html?id=${a.id}&from=${encodeURIComponent(window.location.href)}" style="color:inherit;text-decoration:none;">${highlightMatch(a.title, query)}</a></h3>
            <div class="Smaller" style="margin:0.2em 0 0.6em 0;color:var(--VLinkColor)">
              [${a.category}] ${formatDate(a.date, a.time, a.weekday)} by ${a.author}${a.comments ? ' · <a href="article.html?id='+a.id+'#Comments" style="color:var(--VLinkColor)">评论 '+a.comments+'</a>' : ''}
            </div>
            <p style="margin:0 0 0.4em 0">${highlightMatch(a.summary, query)}</p>
            <a href="article.html?id=${a.id}&from=${encodeURIComponent(window.location.href)}">Full Story</a>
          </div>
        `;
      }).join('\n');
    }
  }

  const mainContent = `
<div class="maincolumn flexcol">
  <div class="middlecolumn">
    <div class="PageHeadline"><h1>搜索文章归档</h1></div>
    <div class="ArticleText"><main>
      欢迎使用 SUN Notes 搜索引擎。
      <p>在这里可以搜索全部内容。将搜索字符串用引号括起可搜索连续词组。
      <p>
      <blockquote>
      <form onsubmit="return submitSearchForm(this);">
      <table class="Form">
        <tr><td valign="top"><b>查询：</b></td>
          <td valign="top"><input type="text" name="q" value="${escapeHtml(query)}" size="40" autofocus /></td></tr>
        <tr><td valign="top"><b>分类筛选：</b></td>
          <td valign="top">
            <div class="lwn-cats">
              ${allCats.map(c => {
                const lc = c.toLowerCase();
                const checked = hasFilter || hasCatsParam ? (catsSet.has(lc) ? 'checked' : '') : 'checked';
                return `<label><input type="checkbox" name="cat" value="${c}" ${checked} /> ${c}</label>`;
              }).join('')}
              <a href="#" onclick="
                var bs=this.parentNode.querySelectorAll('input[type=checkbox]');
                var all=Array.from(bs).every(function(b){return b.checked;});
                bs.forEach(function(b){b.checked=!all;});
                return false;" style="margin-left:0.5em">全部切换</a>
            </div>
          </td></tr>
        <tr><td valign="top"><b>排序：</b></td>
          <td valign="top">
            <label><input type="radio" name="order" value="relevance" ${order === 'relevance' ? 'checked' : ''} /> 相关度</label>
            <label><input type="radio" name="order" value="date" ${order === 'date' ? 'checked' : ''} /> 日期</label>
          </td></tr>
        <tr><td valign="top"><b></b></td>
          <td valign="top"><input type="submit" value="搜索" /> <a href="search.html">清除筛选</a></td></tr>
      </table>
      </form>
      </blockquote>
      ${query || cat || cats.length ? `<h2 class="Headline">搜索结果${query ? '："' + escapeHtml(query) + '"' : ''}${cats.length ? ' [分类: ' + escapeHtml(cats.join(', ')) + ']' : ''}${cat && !cats.length ? ' [分类: ' + escapeHtml(cat) + ']' : ''}</h2><div class="BlurbListing">${resultsHTML}</div>` : ''}
    </main></div>
  </div>
  <div class="rightcol not-print"></div>
</div>
  `;
  renderLayout(mainContent, [...new Set(allArticles.map(a => a.category))]);
}

/* ---------- 标签页 ---------- */
async function renderTagsPage() {
  const params = new URLSearchParams(window.location.search);
  const tag = params.get('tag') || '';

  const [tagMap, allArticles] = await Promise.all([
    fetchTagIndex(),
    fetchArticles()
  ]);
  let contentHTML = '';

  if (tag && tagMap[tag]) {
    const tagData = tagMap[tag];
    const articles = tagData.articles;
    contentHTML = `
      <h2 class="Headline">标签: ${escapeHtml(tag)} (${articles.length} 篇文章)</h2>
      <div class="BlurbListing">${articles.map(articleListingHTML).join('\n')}</div>
      <p><a href="tags.html">&lt;-- 返回所有标签</a></p>
    `;
  } else {
    const tagCloud = Object.entries(tagMap)
      .sort((a, b) => b[1].count - a[1].count)
      .map(([t, data]) => {
        const size = Math.min(2.5, 1 + data.count * 0.2);
        return `<span class="tag-cloud-item"><a href="tags.html?tag=${t}" class="tag-badge" style="font-size:${size}em">${t} (${data.count})</a></span>`;
      }).join('');

    // 分类索引
    const catMap = {};
    allArticles.forEach(a => {
      if (!catMap[a.category]) catMap[a.category] = [];
      catMap[a.category].push(a);
    });
    const catList = Object.entries(catMap)
      .sort((a, b) => b[1].length - a[1].length)
      .map(([c, articles]) => `
        <h3 class="SummaryHL"><a href="search.html?cats=${encodeURIComponent(c)}">${c}</a> (${articles.length})</h3>
        <div class="BlurbListing">${articles.slice(0, 3).map(articleListingHTML).join('\n')}</div>
      `).join('');

    contentHTML = `
      <h2 class="Headline">标签云</h2>
      <div class="BlurbListing" style="line-height:2.5">${tagCloud}</div>
      <h2 class="Headline">按分类浏览</h2>
      ${catList}
    `;
  }

  const mainContent = `
<div class="maincolumn flexcol">
  <div class="middlecolumn">
    <div class="PageHeadline"><h1>标签分类</h1></div>
    <div class="ArticleText"><main>${contentHTML}</main></div>
  </div>
  <div class="rightcol not-print"></div>
</div>
  `;
  renderLayout(mainContent, [...new Set(allArticles.map(a => a.category))]);
}

/* ---------- 关于页 ---------- */
function renderAboutPage() {
  const aboutMarkdown = `## 关于 SUN Notes

**SUN Notes** 是我记录学习过程的个人博客，主要分享阅读开源代码时的理解与感悟，也记录自己做项目时遇到的问题、实践过程和一路上的思考。

### 站点理念

这里既是学习笔记，也是一个整理思路的地方。我会记录对技术的探索、对开源项目的观察、自己做项目时的心路历程，以及在实践中形成的想法和总结。内容不一定完整或成熟，但希望它们能够真实地留下每一步学习和思考的痕迹。

### 内容范围

| 分类 | 说明 |
|------|------|
| Kernel | Linux 内核开发、补丁、版本发布 |
| Security | 安全漏洞、安全更新、安全公告 |
| Development | 开发工具、编程语言、开发实践 |
| Distributions | 各大 Linux 发行版的动态 |
| Briefs | 社区简讯和短消息 |
| Announcements | 公告、会议、活动 |

### Markdown 支持

所有文章正文均使用 Markdown 编写，支持标题、列表、引用、代码块、表格等。

### 写作入口

本站提供独立的<a href="admin.html">写作入口</a>，支持 Markdown 实时预览编辑。

### 联系方式<a name="contact"></a>

邮箱：[sunshixx@gmail.com](mailto:sunshixx@gmail.com)

GitHub：[github.com/sunshixx](https://github.com/sunshixx)
`;

  const mainContent = `
<div class="maincolumn flexcol">
  <div class="middlecolumn">
    <div class="PageHeadline"><h1>关于 SUN Notes</h1></div>
    <div class="ArticleText"><main>
      <div class="markdown-body">${renderMarkdown(aboutMarkdown)}</div>
    </main></div>
  </div>
  <div class="rightcol not-print"></div>
</div>
  `;
  renderLayout(mainContent);
  // 渲染数学公式（KaTeX）
  setTimeout(() => renderMathIn(document.querySelector('.markdown-body')), 0);
}

/* ---------- 工具函数 ---------- */
function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function highlightMatch(text, query) {
  if (!query) return escapeHtml(text);
  const escaped = escapeHtml(text);
  const q = escapeHtml(query);
  const re = new RegExp('(' + q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'gi');
  return escaped.replace(re, '<span class="SearchMatch">$1</span>');
}

/* ---------- 页面路由 ----------
   关键：标志首次渲染是否完成，避免 pageshow 在初次加载时重复跑 init。 */
let _initialRenderDone = false;
async function init() {
  const page = document.body.getAttribute('data-page');
  try {
    switch (page) {
      case 'home':    await renderHomePage(); break;
      case 'article': await renderArticlePage(); break;
      case 'search':  await renderSearchPage(); break;
      case 'tags':    await renderTagsPage(); break;
      case 'about':   renderAboutPage(); break;
      default:        await renderHomePage();
    }
  } catch (e) {
    console.error('渲染失败:', e);
    renderLayout(`
      <div class="maincolumn flexcol"><div class="middlecolumn">
        <div class="PageHeadline"><h1>加载失败</h1></div>
        <div class="ArticleText"><main>
          <p>页面加载出错：${escapeHtml(e.message)}</p>
          <p>请确认后端服务器正在运行（<code>node server.js</code>）。</p>
        </main></div>
      </div><div class="rightcol not-print"></div></div>
    `);
  } finally {
    _initialRenderDone = true;
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

// 浏览器后退 / bfcache 恢复时自动刷新数据
// 旧实现只在 e.persisted === true 时重渲染，导致不支持 bfcache（iOS Safari、
// 某些页面 unload 事件禁用缓存）的场景下评论数永远不更新。
// 这里改为：只要不是首次加载（_initialRenderDone === true），就重新拉一遍。
window.addEventListener('pageshow', () => {
  if (!_initialRenderDone) return;  // 初次加载交给 DOMContentLoaded / 同步分支
  requestAnimationFrame(() => init());
});
