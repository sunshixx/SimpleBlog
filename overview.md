# SUN Notes 个人学习博客

SUN Notes 用来记录个人学习、阅读开源代码的感悟、项目实践过程和技术思考。

## 页面

| 页面 | 功能 |
|------|------|
| `index.html` | 按发布日期浏览文章 |
| `article.html?id=N` | 阅读文章、发表评论 |
| `search.html` | 关键词、分类和排序搜索 |
| `tags.html` | 标签云和分类浏览 |
| `about.html` | 博客说明和联系方式 |
| `admin.html` | 管理员发布、编辑、删除文章和管理图片/评论 |

## 技术方案

- 零 npm 依赖，使用 Node.js 内置 HTTP 服务
- 文章存储在 `db/articles/{id}.md`
- 评论存储在 `db/comments/{id}.json`
- 图片存储在 `picture/`
- Markdown 使用本地 `marked.min.js` 渲染
- 代码块使用 highlight.js 浏览器构建版高亮
- 管理员写操作使用短期 token，公开浏览和评论不需要登录

## 启动

```powershell
node server.js
```

访问 `http://localhost:8080/`。管理员入口是 `http://localhost:8080/admin.html`。

管理员密码默认读取 `db/config.json`，生产或换机时建议使用环境变量：

```powershell
$env:SUN_ADMIN_PASSWORD = 'change-me'
node server.js
```

详细换机、备份和故障排查说明见 [README.md](README.md)。
