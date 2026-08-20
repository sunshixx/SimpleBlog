# 个人博客网站 - OSS Notes

## 完成内容

基于 lwn.net 一比一复刻的 Linux/开源技术个人博客网站，采用纯 HTML/CSS/JS 静态站点方案。

### 页面清单
| 页面 | 文件 | 功能 |
|------|------|------|
| 首页 | `index.html` | 文章列表，复刻 lwn.net 首页双栏布局（精选长文 + 简讯） |
| 文章详情 | `article.html?id=N` | Markdown 渲染文章正文，含元数据、标签、评论区 |
| 搜索 | `search.html?q=关键词` | 复刻 lwn.net/Search/ 搜索表单，支持全文搜索和分类筛选 |
| 标签分类 | `tags.html` | 标签云 + 按分类浏览，支持单标签过滤 |
| 关于 | `about.html` | 关于页面，Markdown 渲染 |

### 设计复刻要点
- **配色**：白底 `#ffffff` / 侧边栏 `#f0f0f0` / 桃色标题栏 `#ffcc99` / 深蓝链接 `DarkBlue` / 绿色 Logo
- **布局**：左侧固定 9.6em 导航栏 + 顶部搜索条 + 主内容区（flex 双栏）+ 居中页脚
- **字体**：serif 衬线正文 + sans-serif Logo
- **组件**：`h2.Headline`（桃色标题条）、`BlurbListing`（摘要块）、`Smaller`（元数据）、`Subscription`（$标记）
- **响应式**：桌面左侧栏 / 移动端顶部栏，支持 `prefers-color-scheme` 暗色模式

### 技术方案
- **Markdown 渲染**：marked.js（本地文件，39KB，无需 CDN）
- **文章数据**：10 篇 Linux/开源技术主题文章（内核、安全、发行版、开发工具等）
- **零构建步骤**：纯静态文件，可直接用任意 HTTP 服务器运行

### 文章数据
| ID | 标题 | 分类 | 作者 |
|----|------|------|------|
| 1 | Linux 内核 7.2 版本正式发布 | Kernel | corbet |
| 2 | Debian 就 LLM 使用问题进行投票 | Distributions | jzb |
| 3 | 使用 pathlib 表示 Python 路径 | Development | jake |
| 4 | Fedora 为 AF_ALG 的终结做准备 | Distributions | jzb |
| 5 | BPF、持续测试与稳定内核 | Kernel | daroc |
| 6 | Arm 架构支持 128 位页表 | Kernel | corbet |
| 7 | Go 1.27 发布 | Development | jzb |
| 8 | Firefox 154.0 发布 | Development | corbet |
| 9 | GNU Poke 5.0 发布 | Development | jzb |
| 10 | 可引导构建：原因与方法 | Development | jake |

### 文件结构
```
blog/
├── index.html          # 首页
├── article.html        # 文章详情
├── search.html         # 搜索页
├── tags.html           # 标签分类
├── about.html          # 关于页面
├── css/
│   └── lwn.css         # 复刻 LWN.net 样式（含 CSS 变量、暗色模式）
├── js/
│   ├── marked.min.js   # Markdown 渲染库
│   ├── data.js         # 文章数据（10篇）
│   └── app.js          # 渲染逻辑（列表/详情/搜索/标签/关于）
```

### 运行方式
```bash
cd blog
# 使用 Node.js 内置 HTTP 服务器
node -e "require('http').createServer((q,s)=>{const f=require('fs');const p=q.url.split('?')[0];const t={'.html':'text/html','.css':'text/css','.js':'application/javascript'};f.readFile('.'+p,(e,d)=>{if(e){s.writeHead(404);s.end();return}s.writeHead(200,{'Content-Type':t[p.match(/\.\w+$/)?.[0]]||'text/plain'});s.end(d)})}).listen(8080,()=>console.log('http://localhost:8080'))"
```

### 自定义指南
- **修改文章**：编辑 `js/data.js` 中的 `ARTICLES` 数组
- **修改样式**：编辑 `css/lwn.css` 顶部的 CSS 变量
- **修改导航**：编辑 `js/app.js` 中的 `renderLayout()` 函数
