/* ============================================================
   i18n 国际化 - 中/英 切换
   t(key) 读取当前语言字典；语言存 localStorage('oss_lang')。
   默认 zh。切换语言后触发 window.onI18nChange（由 app.js/admin.js 注册）。
   ============================================================ */

window.I18N = (function () {
  var lang = 'zh';
  try { lang = localStorage.getItem('oss_lang') || 'zh'; } catch (e) {}
  if (lang !== 'en') lang = 'zh';

  /* 按语言组织。key 直接用中文文案本身，en 给出英文翻译。
     支持 {n} / {id} 等占位符。 */
  var DICT = {
    zh: {},
    en: {
      /* ---- 布局 / 导航 ---- */
      '来自开源世界的观察': 'Observations from the Open Source World',
      '发布于 {date}': 'Posted {date}',
      '一月': 'Jan', '二月': 'Feb', '三月': 'Mar', '四月': 'Apr',
      '五月': 'May', '六月': 'Jun', '七月': 'Jul', '八月': 'Aug',
      '九月': 'Sep', '十月': 'Oct', '十一月': 'Nov', '十二月': 'Dec',
      '周日': 'Sun', '周一': 'Mon', '周二': 'Tue', '周三': 'Wed',
      '周四': 'Thu', '周五': 'Fri', '周六': 'Sat',
      '内容': 'Contents',
      '首页': 'Home',
      '标签分类': 'Tags',
      '搜索': 'Search',
      '关于': 'About',
      '写作入口': 'Write',
      '联系方式': 'Contact',
      '写作': 'Write',
      '搜索：': 'Search: ',
      '关键词...': 'keywords...',
      '标签': 'Tags',
      '返回博客': 'Back to blog',
      '退出': 'Logout',
      '本站文章版权归原作者所有': 'All articles are copyright their respective authors',
      'SUN Notes · 写作入口': 'SUN Notes · Write',
      '返回首页': 'Back to home',
      '写作活动': 'Writing Activity',
      '少': 'Less',
      '多': 'More',

      /* ---- 分类 ---- */
      '负载均衡': 'Load Balancing',
      '网络': 'Networking',
      '内核': 'Kernel',
      '安全': 'Security',
      '性能调优': 'Performance',
      '开发实践': 'Development',
      '随笔': 'Essays',
      '其他': 'Other',

      /* ---- 首页 ---- */
      'SUN Notes 文章归档': 'SUN Notes Article Archive',
      '这里按发布日期整理 SUN Notes 自创建以来的全部文章。最新发布在最上方。点击文章标题阅读全文。':
        'All SUN Notes articles since the beginning, ordered by publication date, newest first. Click a title to read the full article.',
      '也可以前往 {search} 页面按关键词与分类筛选；或者 {tags} 按主题浏览。':
        'You can also {search} by keyword and category, or browse by topic on the {tags} page.',
      '搜索页面': 'use the search page',
      '标签页': 'tags page',
      'Query：': 'Query:',
      '输入关键词搜索...': 'Enter keywords to search...',
      '分类筛选：': 'Filter by category:',
      '全部切换': 'Toggle all',
      '排序：': 'Sort by:',
      '相关度': 'Relevance',
      '日期': 'Date',
      '目前共 {n} 篇文章，归档自 2026 年 8 月。': 'Currently {n} articles, archived since August 2026.',
      '暂无文章。': 'No articles yet.',
      '前往写作入口': 'go to the writing entry',
      '添加第一篇。': 'to add the first one.',
      '订阅精选': 'Subscription featured',
      '评论 {n}': 'Comments ({n})',
      '评论 ({n})': 'Comments ({n})',
      '阅读全文': 'Full Story',
      '评论: {n}': 'comments: {n}',
      '暂无评论': 'Comments (none posted)',
      'SUN Notes 第 {d} 期': 'SUN Notes Weekly Edition for {d}',

      /* ---- 文章页 ---- */
      '文章未找到': 'Article not found',
      '请求的文章不存在。请返回首页浏览其他文章。': 'The requested article does not exist. Return to the home page to browse other articles.',
      '阅读较早发布的文章': 'Read an earlier article',
      '← 较早文章：': '← Earlier:',
      '阅读较新发布的文章': 'Read a newer article',
      '较新文章：': 'Newer: →',
      '相关文章': 'Related articles',
      '最后更新：': 'Last updated: ',
      '返回列表': 'Back to list',
      '返回搜索结果': 'Back to search results',
      '评论 ({n})': 'Comments ({n})',
      '发表评论': 'Post a comment',
      '署名：': 'Name: ',
      '你的名字（可留空用 anonymous）': 'Your name (leave blank for anonymous)',
      '内容：': 'Comment: ',
      '说点什么...（支持简单换行）': 'Say something... (line breaks are supported)',
      '提交评论': 'Submit',
      '暂无评论，欢迎抢沙发。': 'No comments yet - be the first to post!',
      '内容不能为空': 'Content cannot be empty',
      '提交中...': 'Submitting...',
      '已提交': 'Submitted',
      '提交失败': 'Submission failed',
      '点击放大': 'Click to enlarge',
      '关闭': 'Close',
      '本文目录': 'Table of Contents',
      '复制代码': 'Copy code',
      '已复制': 'Copied',
      '复制失败': 'Copy failed',

      /* ---- 搜索页 ---- */
      '搜索文章归档': 'Search Article Archive',
      '欢迎使用 SUN Notes 搜索引擎。': 'Welcome to the SUN Notes search engine.',
      '在这里可以搜索全部内容。将搜索字符串用引号括起可搜索连续词组。':
        'Search all content here. Wrap a search string in quotes to search for an exact phrase.',
      '查询：': 'Query:',
      '清除筛选': 'Clear filters',
      '搜索结果': 'Search results',
      '分类: ': 'Category: ',
      '未找到匹配 "{q}" 的文章。': 'No articles match "{q}".',

      /* ---- 标签页 ---- */
      '标签: {t} ({n} 篇文章)': 'Tag: {t} ({n} articles)',
      '返回所有标签': 'Back to all tags',
      '标签云': 'Tag cloud',
      '按分类浏览': 'Browse by category',

      /* ---- 错误页 ---- */
      '加载失败': 'Failed to load',
      '页面加载出错：': 'Error rendering page: ',
      '请确认后端服务器正在运行（{code}）。': 'Please make sure the backend server is running ({code}).',

      /* ---- 管理端 ---- */
      '写文章': 'Write an article',
      '标题': 'Title',
      '文章标题': 'Article title',
      '大类（方便索引）': 'Category (for indexing)',
      '作者': 'Author',
      '[$] 订阅标记': '[$] Subscription flag',
      '否': 'No',
      '是': 'Yes',
      '标签（逗号分隔，方便索引）': 'Tags (comma separated, for indexing)',
      '摘要（显示在列表页）': 'Summary (shown in the listing)',
      '一句话摘要': 'A one-line summary',
      '正文（Markdown）': 'Content (Markdown)',
      '插入图片': 'Insert image',
      '上传图片保存路径': 'Upload image save path',
      '编辑器（输入 Markdown 符号或代码字符可补全，Ctrl+Space 可打开全部提示）':
        'Editor (type Markdown symbols or code characters for completion, Ctrl+Space for all hints)',
      '在此输入 Markdown 正文... 可直接 Ctrl+V 粘贴图片，Ctrl+Enter 发布':
        'Type Markdown here... Paste images with Ctrl+V, publish with Ctrl+Enter',
      '实时预览': 'Live preview',
      '发布文章': 'Publish article',
      '保存草稿': 'Save draft',
      '预览文章': 'Preview article',
      '清空': 'Clear',
      '待发布草稿': 'Pending drafts',
      '已发布文章': 'Published articles',
      '未命名文章': 'Untitled article',
      ' - SUN Notes 预览': ' - SUN Notes Preview',
      '更新文章 #': 'Update article #',
      '草稿已保存 ': 'Draft saved ',
      '草稿已保存，已放入下方“待发布草稿”列表': 'Draft saved to the "pending drafts" list below',
      '草稿保存失败：': 'Draft save failed: ',
      '发现未保存的编辑内容（{t}），是否恢复？': 'Unsaved edits found ({t}). Restore?',
      '正在编辑待发布草稿': 'Editing pending draft',
      '预览窗口被浏览器拦截，请允许弹窗': 'Preview popup was blocked. Please allow popups.',
      '有未保存的修改，确定离开吗？': 'You have unsaved changes. Leave anyway?',
      '当前有未保存的修改，确定要清空吗？': 'You have unsaved changes. Clear anyway?',
      '已清空': 'Cleared',
      '正在保存中，请勿重复点击...': 'Saving in progress, please do not click again...',
      '标题和正文不能为空': 'Title and content are required',
      '作者不能为空': 'Author is required',
      '刚刚已发布相同内容，请稍后再试': 'Identical content was just published. Please try again later.',
      '保存中...': 'Saving...',
      '发布中...': 'Publishing...',
      '检测到重复内容，已忽略（已有 #{id}）': 'Duplicate content detected and ignored (already #{id})',
      '已更新！ID={id}': 'Updated! ID={id}',
      '已发布！ID={id}': 'Published! ID={id}',
      '立即编辑': 'edit now',
      '*预览区为空*': '*Preview is empty*',
      '保存失败：': 'Save failed: ',
      '加载中...': 'Loading...',
      '未命名草稿': 'Untitled draft',
      '待发布': 'pending',
      '继续编辑': 'Continue editing',
      '确定删除这个待发布草稿吗？': 'Delete this pending draft?',
      '删除草稿': 'Delete draft',
      '暂无待发布草稿。': 'No pending drafts.',
      '已发布文章加载失败：': 'Failed to load published articles: ',
      '更新文章': 'Update',
      '查看': 'View',
      '评论': 'Comments',
      '删除': 'Delete',
      '（已隐藏）': ' (hidden)',
      '恢复': 'Restore',
      '隐藏': 'Hide',
      '收起评论': 'Hide comments',
      '暂无评论。': 'No comments.',
      '评论已隐藏': 'Comment hidden',
      '评论已恢复': 'Comment restored',
      '确定删除这条评论吗？': 'Delete this comment?',
      '已删除评论': 'Comment deleted',
      '删除失败：': 'Delete failed: ',
      '已删除': 'Deleted',
      '正在编辑 #{id}': 'Editing #{id}',
      '确定删除这篇文章吗？\n注意：对应的评论也会一并清理。':
        'Delete this article?\nNote: its comments will also be deleted.',
      '当前有未保存的修改，切换到其他文章会丢失。确定切换吗？':
        'You have unsaved changes. Switching articles will lose them. Continue?',
      '当前有未保存的修改，切换到编辑模式会丢弃。确定切换吗？':
        'You have unsaved changes. Switching to edit mode will discard them. Continue?',
      '写作 - SUN Notes': 'Write - SUN Notes',
      '未授权': 'Unauthorized',
      '未命名文章 - SUN Notes 预览': 'Untitled - SUN Notes Preview',
      '粘贴上传中...': 'Uploading paste...',
      '已粘贴：': 'Pasted: ',
      '粘贴失败：': 'Paste failed: ',
      '未知错误': 'Unknown error',
      '上传中...': 'Uploading...',
      '已插入 {n} 张': 'Inserted {n}',
      '失败': 'Failed',
      '（{n} 张失败）': ' ({n} failed)',
      '请输入管理密码': 'Enter admin password',
      '密码': 'Password',
      '进入': 'Login',
      '密码错误': 'Wrong password',
      '文章标题': 'Article title',
      '**粗体**': '**bold**',
      '*斜体*': '*italic*',
      '[链接文字](https://)': '[link text](https://)',
      '![图片说明](picture/)': '![image caption](picture/)',

      /* ---- 关于页 ---- */
      '关于 SUN Notes': 'About SUN Notes'
    },
    about_markdown: {
      zh: `## 关于 SUN Notes

**SUN Notes** 是我记录学习过程的个人博客，主要分享阅读开源代码时的理解与感悟，也记录自己做项目时遇到的问题、实践过程和一路上的思考。

### 站点理念

这里既是学习笔记，也是一个整理思路的地方。我会记录对技术的探索、对开源项目的观察、自己做项目时的心路历程，以及在实践中形成的想法和总结。内容不一定完整或成熟，但希望它们能够真实地留下每一步学习和思考的痕迹。

### 内容范围

| 分类 | 说明 |
|------|------|
| 负载均衡 | 负载均衡架构、算法、四/七层转发、会话保持 |
| 网络 | 网络协议、TCP/IP、HTTP、TLS |
| 内核 | Linux 内核、网络栈、系统级实现 |
| 安全 | 安全防护、漏洞分析、证书与加密 |
| 性能调优 | 性能分析、压测、调优实践 |
| 开发实践 | 开发工具、编程语言、工程实践 |
| 随笔 | 日常记录、感想与杂谈 |

### Markdown 支持

所有文章正文均使用 Markdown 编写，支持标题、列表、引用、代码块、表格等。

### 写作入口

本站提供独立的<a href="admin.html">写作入口</a>，支持 Markdown 实时预览编辑。

### 联系方式<a name="contact"></a>

邮箱：[sunshixx@gmail.com](mailto:sunshixx@gmail.com)

GitHub：[github.com/sunshixx](https://github.com/sunshixx)`,
      en: `## About SUN Notes

**SUN Notes** is my personal blog documenting my learning journey. I share my understanding of open-source code, along with the problems, practices, and reflections from my own projects.

### Philosophy

This is both a study notebook and a place to organize my thoughts. I record my exploration of technology, observations of open-source projects, and the ideas formed through hands-on practice. Content may not always be complete or polished, but it genuinely captures each step of learning and thinking.

### Content Areas

| Category | Description |
|------|------|
| Load Balancing | LB architecture, algorithms, L4/L7 forwarding, session persistence |
| Networking | Protocols, TCP/IP, HTTP, TLS |
| Kernel | Linux kernel, network stack, system-level implementation |
| Security | Defenses, vulnerability analysis, certs & encryption |
| Performance | Profiling, load testing, tuning practice |
| Development | Tools, languages, engineering practice |
| Essays | Daily notes, thoughts, miscellany |

### Markdown Support

All articles are written in Markdown, supporting headings, lists, quotes, code blocks, tables, and more.

### Writing Entry

The site provides a separate <a href="admin.html">writing entry</a> with live Markdown preview editing.

### Contact<a name="contact"></a>

Email: [sunshixx@gmail.com](mailto:sunshixx@gmail.com)

GitHub: [github.com/sunshixx](https://github.com/sunshixx)`
    }
  };

  function t(key, params) {
    var s = (DICT[lang] && DICT[lang][key])
      || (DICT.about_markdown && DICT.about_markdown[lang] && key === 'about_markdown' ? DICT.about_markdown[lang] : null)
      || key;
    if (params) {
      Object.keys(params).forEach(function (k) {
        s = s.split('{' + k + '}').join(String(params[k]));
      });
    }
    return s;
  }

  function toggle() {
    lang = (lang === 'zh') ? 'en' : 'zh';
    try { localStorage.setItem('oss_lang', lang); } catch (e) {}
    if (document.documentElement) document.documentElement.lang = lang;
    if (window.onI18nChange) window.onI18nChange();
    return false;
  }

  return { get lang() { return lang; }, t: t, toggle: toggle };
})();

window.t = function (key, params) { return window.I18N.t(key, params); };
