/* ============================================================
   文章数据 - Linux/开源技术博客
   仿 lwn.net 文章格式
   ============================================================ */

const ARTICLES = [
  {
    id: 1,
    title: "Linux 内核 7.2 版本正式发布",
    subscription: true,
    category: "Kernel",
    author: "corbet",
    date: "2026-08-17",
    time: "16:27 UTC",
    weekday: "Mon",
    comments: 13,
    tags: ["kernel", "release", "linux-7.2", "bpf", "btrfs"],
    summary: "Linus Torvalds 发布了 7.2 内核，这是内核历史上最繁忙的开发周期之一，新增了近 60 万行代码。本次发布包含 BPF 系统调用的通用属性支持、CPU 调度器的缓存感知负载均衡、Btrfs 文件系统的大页支持等重要特性。",
    content: `## Linux 内核 7.2 版本正式发布

Linus Torvalds 于 8 月 17 日发布了 **7.2 内核**，在发布公告中他提到，最后一周涌入的修复补丁数量仍然"比我希望的要多"。事实上，7.2 是内核历史上最繁忙的开发周期之一，新增了近 60 万行代码。

### 重要新特性

本次发布包含多项重要改进：

- **BPF 通用属性支持**：\`bpf()\` 系统调用新增了通用属性支持框架，使 BPF 程序能够更灵活地配置参数
- **缓存感知负载均衡**：CPU 调度器引入了缓存感知的负载均衡机制，在多核系统上显著提升性能
- **Btrfs 大页支持**：Btrfs 文件系统开始支持大页（large folio），减少内存开销
- **交换子系统改进**：进一步优化了 swap 子系统的性能
- **Landlock 安全模块增强**：改进了 Landlock 安全模块的功能
- **内联加密支持**：通过 \`dm-inlinecrypt\` 设备映射目标支持块设备内联加密硬件

> "Well, this last week of the release was - once again - bigger than I would have wished for, but hey, with the whole 'new normal' thing, if I delayed releases for that reason we'd probably never have a release at all."
> — Linus Torvalds

### 开发统计

7.2 开发周期的一些关键数据：

| 指标 | 数值 |
|------|------|
| 新增代码行 | ~600,000 |
| 删除代码行 | ~150,000 |
| 参与开发者 | 2,100+ |
| 合并补丁 | 15,000+ |
| 支持公司 | 350+ |

### 总结

7.2 内核的发布标志着 Linux 内核持续快速演进的又一个里程碑。随着 BPF、文件系统和调度器等子系统的不断成熟，Linux 在服务器、嵌入式和桌面领域的能力持续增强。

详见 [KernelNewbies 7.2 页面](https://kernelnewbies.org/Linux_7.2) 获取更多信息。`
  },
  {
    id: 2,
    title: "Debian 就 LLM 使用问题进行投票",
    subscription: true,
    category: "Distributions",
    author: "jzb",
    date: "2026-08-19",
    time: "17:36 UTC",
    weekday: "Wed",
    comments: 31,
    tags: ["debian", "ai", "llm", "governance", "policy"],
    summary: "Debian 项目正在就是否允许使用大语言模型（LLM）参与项目贡献进行投票。第一份提案明确禁止任何由 LLM 创建或协助创建的贡献，这引发了激烈的讨论和大量替代提案。开发者现在正在对八项提案进行投票。",
    content: `## Debian 就 LLM 使用问题进行投票

Debian 项目正在就是否允许使用**大语言模型**（LLM）来为项目做出贡献进行投票。这场讨论始于 Matthias Geiger 在 7 月下旬提交的第一份提案，该提案明确禁止任何由 LLM 创建或协助创建的 Debian 贡献。

### 八项提案

这场讨论引发了社区的激烈辩论，最终形成了**八项提案**，范围从完全禁止 LLM 辅助贡献到明确批准使用：

1. **完全禁止**：禁止任何 LLM 创建或协助的贡献
2. **有条件禁止**：禁止 LLM 贡献但允许用于文档翻译
3. **标注要求**：允许但必须明确标注 LLM 使用情况
4. **分类管理**：根据贡献类型分别管理
5. **明确批准**：明确允许 LLM 辅助贡献
6. **延迟决定**：暂不决定，设立工作组研究
7. **委托处理**：委托项目领导者决定
8. **以上皆非**：不采取任何政策

> "The first proposal would expressly forbid any contributions to Debian that are created by or with the assistance of LLMs."

### 社区反响

这场讨论反映了开源社区对 AI 工具的复杂态度：

- **支持禁止方**认为 LLM 生成的代码可能存在版权和许可问题
- **支持使用方**认为 AI 工具能提高效率，不应一刀切禁止
- **中间派**主张建立标注和审查机制

投票结果将对其他开源项目的 AI 政策产生重要影响。`
  },
  {
    id: 3,
    title: "使用 pathlib 表示 Python 路径",
    subscription: true,
    category: "Development",
    author: "jake",
    date: "2026-08-19",
    time: "15:03 UTC",
    weekday: "Wed",
    comments: 4,
    tags: ["python", "pathlib", "pycon", "tutorial"],
    summary: "在 PyCon US 2026 大会上，Trey Hunner 的演讲目标是让参会者停止用字符串表示文件系统路径，转而使用 pathlib。这对于长期使用字符串路径的 Python 用户来说是一个不小的转变。",
    content: `## 使用 pathlib 表示 Python 路径

在 **PyCon US 2026** 大会上，Trey Hunner 的演讲开宗明义：他的目标是让参会者停止用字符串表示文件系统路径，转而使用 \`pathlib\`。

### 为什么应该使用 pathlib

字符串路径在 Python 中长期存在且大部分情况下能用，但正是那个"大部分"让 Hunner 希望看到改变。

\`\`\`python
# 传统字符串方式
import os
path = "/home/user/data"
if os.path.exists(path):
    with open(os.path.join(path, "file.txt")) as f:
        content = f.read()

# pathlib 方式
from pathlib import Path
path = Path("/home/user/data")
if path.exists():
    content = (path / "file.txt").read_text()
\`\`\`

### pathlib 的优势

\`pathlib\` 提供了面向对象的路径操作接口：

- **更清晰的语法**：使用 \`/\` 运算符拼接路径
- **跨平台兼容**：自动处理路径分隔符差异
- **丰富的方法**：\`read_text()\`、\`write_text()\`、\`glob()\` 等
- **类型安全**：路径操作返回的仍然是 Path 对象

> "His goal was for attendees to stop representing filesystem paths as strings and to use pathlib instead."

### 进阶用法

\`\`\`python
from pathlib import Path

# 递归查找所有 Python 文件
for py_file in Path(".").rglob("*.py"):
    print(py_file)

# 路径组件访问
p = Path("/home/user/docs/readme.md")
print(p.parent)      # /home/user/docs
print(p.name)        # readme.md
print(p.suffix)      # .md
print(p.stem)        # readme
\`\`\`

Hunner 的演讲展示了 pathlib 中一些鲜为人知的强大功能，试图改变长期 Python 用户的习惯。`
  },
  {
    id: 4,
    title: "Fedora 为 AF_ALG 的终结做准备",
    subscription: true,
    category: "Distributions",
    author: "jzb",
    date: "2026-08-18",
    time: "13:48 UTC",
    weekday: "Tue",
    comments: 3,
    tags: ["fedora", "security", "kernel", "af_alg", "crypto"],
    summary: "Linux 内核的用户空间加密接口（AF_ALG）已被关联到多起高调安全事件。Fedora 项目计划在下一个发行版中限制 AF_ALG 的使用，以推动剩余用户为最终移除做好准备。",
    content: `## Fedora 为 AF_ALG 的终结做准备

Linux 内核的**用户空间加密接口**（\`AF_ALG\`）已被关联到多起近期高调安全事件，包括 Copy Fail 及其后续漏洞。该接口已于今年早些时候被**废弃**。

### 背景

\`AF_ALG\` 是内核 Crypto API 的用户空间接口，允许用户空间应用程序访问内核提供的加密算法。然而，这个接口存在多个安全问题：

- 缺乏完善的输入验证
- 竞态条件风险
- 与某些加密算法实现的不兼容

Eric Biggers 和其他内核开发者一直在**推动从内核中移除该接口**。

### Fedora 的计划

Fedora 项目计划在下一个 Fedora 发行版中限制 \`AF_ALG\` 的使用：

> "The Fedora Project is planning to restrict use of AF_ALG in the next Fedora release in the hopes of nudging remaining users of the API to prepare for its eventual removal."

### 迁移建议

依赖 \`AF_ALG\` 的应用应考虑以下替代方案：

1. **用户空间加密库**：如 GnuTLS、OpenSSL 等
2. **内核加密 API 的其他接口**：如 \`/dev/crypto\`
3. **硬件加速加密**：利用 CPU 的 AES-NI 指令集

开发者应尽快评估迁移路径，因为 AF_ALG 的移除已在内核路线图上。`
  },
  {
    id: 5,
    title: "BPF、持续测试与稳定内核",
    subscription: true,
    category: "Kernel",
    author: "daroc",
    date: "2026-08-14",
    time: "14:46 UTC",
    weekday: "Fri",
    comments: 10,
    tags: ["bpf", "testing", "ci", "stable-kernel", "lsfmmbpf"],
    summary: "Ihor Solodrai 和 Shung-Hsi Yu 在 2026 年 Linux 存储、文件系统、内存管理和 BPF 峰会上完成了关于测试的两场演讲。Solodrai 讨论了 BPF 持续集成测试的变化，Yu 讨论了在稳定内核中更全面测试 BPF 更新的需求。",
    content: `## BPF、持续测试与稳定内核

Ihor Solodrai 和 Shung-Hsi Yu 在 2026 年 **Linux 存储、文件系统、内存管理和 BPF 峰会**（LSFMMBPF）上完成了 BPF 赛道的收尾演讲，讨论了与测试相关的两场会议。

### BPF CI 测试的进展

Solodrai 讨论了 BPF 持续集成（CI）测试的变化：

- **测试覆盖率提升**：CI 测试已覆盖更多 BPF 子系统
- **自动化程度增强**：更多的自动化测试流程
- **反馈循环缩短**：开发者能更快获得测试结果

> "The BPF subsystem's CI tests are in a good place."

### 稳定内核中的 BPF 测试

Yu 讨论了在稳定内核中更全面测试 BPF 更新的需求：

- **回溯测试挑战**：新 BPF 功能需要向后移植到多个稳定内核版本
- **测试矩阵复杂**：不同内核版本 × 不同 BPF 功能 = 庞大测试矩阵
- **改进方向**：需要更好的测试覆盖策略

### 未来展望

两位演讲者都认为 BPF 子系统的 CI 测试目前状态良好，但仍有改进空间。未来可能的方向包括：

1. 扩展测试覆盖范围
2. 改进稳定内核的 BPF 回归测试
3. 增强测试工具的可观测性`
  },
  {
    id: 6,
    title: "Arm 架构支持 128 位页表",
    subscription: true,
    category: "Kernel",
    author: "corbet",
    date: "2026-08-13",
    time: "13:46 UTC",
    weekday: "Thu",
    comments: 7,
    tags: ["arm", "page-tables", "memory", "architecture"],
    summary: "处理器页表条目的大小直接限制了该处理器能访问的物理内存量。Arm 架构正在演进以支持更大的页表条目（PTE）。Anshuman Khandual 的补丁集为 Arm 添加了 128 位 PTE 支持。",
    content: `## Arm 架构支持 128 位页表

处理器页表条目（PTE）的大小直接限制了该处理器能够访问的物理内存量。

### 历史回顾

- **32 位时代**：PTE 限制为 4GB 内存——曾经看似无限，如今连一个基本的 AI "hello world" 应用都难以容纳
- **64 位时代**：大多数流行架构扩展到 64 位，某些 Arm 系统可使用 56 位访问高达 72PB 内存
- **128 位时代**：Arm 正在演进以支持更大的页表条目

### 补丁集详情

Anshuman Khandual 提交的[补丁集](https://lwn.net/ml/all/20260729122452.3797443-1-anshuman.khandual@arm.com)为 Arm 架构添加了 128 位 PTE 支持：

\`\`\`
// 简化的页表条目结构示意
struct pte_128 {
    uint64_t pte_low;   // 低 64 位：权限、物理地址低位等
    uint64_t pte_high;  // 高 64 位：扩展物理地址、属性等
};
\`\`\`

### 谁会受益？

> "Who will benefit from this capability is not entirely clear."

目前尚不完全清楚谁会从这项能力中受益：

- **超大内存系统**：未来可能需要超过 72PB 内存的场景
- **安全特性**：更大的 PTE 可存储更多元数据和校验信息
- **硬件扩展性**：为未来的内存技术预留空间

### 社区讨论

这一补丁集引发了关于实际需求与架构前瞻性之间平衡的讨论。一些开发者质疑在可预见的未来是否真的需要 128 位 PTE，而另一些人则认为提前做好准备是明智之举。`
  },
  {
    id: 7,
    title: "Go 1.27 发布",
    subscription: false,
    category: "Development",
    author: "jzb",
    date: "2026-08-19",
    time: "18:30 UTC",
    weekday: "Wed",
    comments: 0,
    tags: ["go", "release", "tools", "crypto", "json"],
    summary: "Go 1.27 已发布，带来了多项新工具、对 ML-DSA 后量子算法的支持、新的 JSON 处理包、语言更新等。",
    content: `## Go 1.27 发布

**Go 1.27**，Go 编程语言的最新版本，已正式发布。本次发布带来了多项重要更新。

### 新特性概览

#### 后量子密码学

Go 1.27 新增了对 **ML-DSA**（Module-Lattice-based Digital Signature Algorithm）后量子算法的支持：

\`\`\`go
import "crypto/mldsa"

// 生成 ML-DSA 密钥对
pub, priv, _ := mldsa.GenerateKey(nil)

// 签名
sig, _ := priv.Sign(nil, message, nil)

// 验证
valid := pub.Verify(sig, message, nil)
\`\`\`

#### JSON 处理包

新增了 JSON 处理包，提供更高效和灵活的 JSON 序列化/反序列化能力：

- 流式处理支持
- 更好的错误信息
- 性能优化

#### 新工具

本次发布包含了多项新的开发者工具，改善开发体验。

### 语言更新

Go 语言本身也有小幅更新，包括：

- 循环变量作用域改进（延续 1.22 的变更）
- 泛型相关的类型推断增强

### 总结

Go 1.27 继续推进语言的安全性和开发效率，后量子密码学的支持反映了 Go 团队对未来安全挑战的前瞻性布局。`
  },
  {
    id: 8,
    title: "Firefox 154.0 发布",
    subscription: false,
    category: "Development",
    author: "corbet",
    date: "2026-08-18",
    time: "21:15 UTC",
    weekday: "Tue",
    comments: 3,
    tags: ["firefox", "browser", "release", "security"],
    summary: "Firefox 154.0 已发布。更新包括将本地网络访问保护扩展到 WebSocket 连接、更灵活的按站点配置 Cookie 和数据清除等。",
    content: `## Firefox 154.0 发布

Firefox 154.0 已正式发布。

### 主要变更

#### 本地网络保护扩展

Firefox 将本地网络访问保护扩展到了 **WebSocket 连接**：

- 防止恶意网站通过 WebSocket 访问本地网络服务
- 保护用户内网设备免受 CSRF 类攻击
- 与 Chrome 的 Private Network Access 规范保持一致

#### Cookie 和数据清除改进

更灵活的**按站点配置** Cookie 和数据清除策略：

- 可为不同网站设置不同的数据保留策略
- 更精细的清除控制
- 改善用户隐私管理体验

### 安全修复

本次发布还包含了多项安全修复，建议所有用户尽快更新。

### 获取更新

- 官方下载：[firefox.com](https://www.firefox.com/)
- 发布说明：[Firefox 154.0 Release Notes](https://www.firefox.com/en-US/firefox/154.0/releasenotes/)`
  },
  {
    id: 9,
    title: "GNU Poke 5.0 发布",
    subscription: false,
    category: "Development",
    author: "jzb",
    date: "2026-08-17",
    time: "14:00 UTC",
    weekday: "Mon",
    comments: 0,
    tags: ["gnu", "poke", "binary", "tools", "release"],
    summary: "GNU Poke 5.0，一个二进制数据编辑器，已发布。本次发布包含 Poke 编译器的多项改进、Poke 语言的扩展以及运行时和标准库更新。",
    content: `## GNU Poke 5.0 发布

**GNU Poke** 5.0，一个强大的二进制数据编辑器，已正式发布。

### 什么是 GNU Poke？

GNU Poke 是一个交互式的二进制数据编辑器，允许用户：

- 以结构化方式查看和编辑二进制数据
- 使用 Poke 语言描述二进制数据格式（"pickle"）
- 对任意二进制文件进行探查、修改和转换

### 5.0 版本亮点

#### 编译器改进

Poke 编译器获得了多项优化：

- 更好的错误诊断
- 代码生成优化
- 编译速度提升

#### 语言扩展

Poke 语言新增了一些特性：

\`\`\`poke
// 定义一个结构体来描述 ELF 头
type Elf64_Ehdr = struct
{
  char[4] e_ident;
  uint16  e_type;
  uint16  e_machine;
  uint32  e_version;
  uint64  e_entry;
  uint64  e_phoff;
  uint64  e_shoff;
  uint32  e_flags;
  uint16  e_ehsize;
  uint16  e_phentsize;
  uint16  e_phnum;
  uint16  e_shentsize;
  uint16  e_shnum;
  uint16  e_shstrndx;
};
\`\`\`

#### 运行时和标准库

- 运行时性能改进
- 标准库新增更多实用的 pickle
- 文档完善

### 获取

官方网站：[jemarch.net/poke](https://www.jemarch.net/poke)`
  },
  {
    id: 10,
    title: "可引导构建：原因与方法",
    subscription: true,
    category: "Development",
    author: "jake",
    date: "2026-08-17",
    time: "16:12 UTC",
    weekday: "Mon",
    comments: 3,
    tags: ["bootstrappable", "builds", "fossy", "security", "toolchain"],
    summary: "在 FOSSY 2026 大会上，Timothy Sample 发表了关于可引导构建（bootstrappable builds）的演讲。可引导构建从一个能构建稍大程序的小程序开始，逐步构建出整个现代 Linux 用户空间，最终产生具有完全已知来源的代码。",
    content: `## 可引导构建：原因与方法

在 **FOSSY 2026**（自由及开源软件年度大会）上，Timothy Sample 发表了关于**可引导构建**（bootstrappable builds）的演讲。

### 什么是可引导构建？

可引导构建是**可复现构建**（reproducible builds）的近亲，但关注点不同：

> "A bootstrappable build is one that starts with a tiny program that can build another slightly larger program, which can build yet another, and so on, until the entirety of a modern Linux user space is built from a small seed."

简单来说：

1. 从一个**极小的种子程序**开始（几百行代码，可人工审计）
2. 种子程序构建一个稍大的程序
3. 该程序再构建更大的程序
4. 逐步迭代，直到构建出完整的现代 Linux 用户空间

### 为什么需要可引导构建？

#### 信任链问题

当今的 Linux 发行版依赖**预编译的二进制工具链**：

- 编译器（GCC、Rustc 等）本身是用编译器编译的
- 你信任的编译器编译出的程序，可能包含你不知道的行为
- " trusting trust" 攻击：编译器可以在编译过程中植入后门

#### 完全已知的来源

可引导构建最终产生的代码具有**完全理解的来源**：

\`\`\`
seed (人工审计) → stage0 → stage1 → ... → 完整工具链 → 用户空间
\`\`\`

不同于典型的 Linux 用户空间——其工具链二进制文件的来源并不完全透明。

### 与可复现构建的关系

| 特性 | 可复现构建 | 可引导构建 |
|------|-----------|-----------|
| 目标 | 确保相同输入产生相同输出 | 确保构建工具链的来源完全已知 |
| 关注点 | 构建过程的确定性 | 信任链的完整性 |
| 关系 | 互补 | 互补 |

### 社区进展

可引导构建社区（[bootstrappable.org](https://bootstrappable.org/)）正在推进多个项目：

- **GNU Mes**：一个极小的 Scheme 解释器，作为引导种子
- **M2-Planet**：用 Mes 编写的 C 子集编译器
- **Gnu Boot**：完整的可引导构建路径

LWN 两年前也曾[报道过这一话题](https://lwn.net/Articles/983340/)，如今社区已取得显著进展。`
  }
];

/* 标签索引（自动生成） */
function getAllTags() {
  const tagMap = {};
  ARTICLES.forEach(a => {
    a.tags.forEach(t => {
      if (!tagMap[t]) tagMap[t] = [];
      tagMap[t].push(a);
    });
  });
  return tagMap;
}

/* 分类索引 */
function getCategories() {
  const catMap = {};
  ARTICLES.forEach(a => {
    if (!catMap[a.category]) catMap[a.category] = [];
    catMap[a.category].push(a);
  });
  return catMap;
}

/* 按 ID 获取文章 */
function getArticleById(id) {
  return ARTICLES.find(a => a.id === parseInt(id));
}

/* 日期格式化 */
function formatDate(dateStr, time, weekday) {
  const d = new Date(dateStr);
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const m = months[d.getMonth()];
  const day = d.getDate();
  const year = d.getFullYear();
  return `Posted ${m} ${day}, ${year} ${time} (${weekday})`;
}
