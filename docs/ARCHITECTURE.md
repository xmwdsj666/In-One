# ARCHITECTURE — 蓝河词典（blueos-dict）

## 总体架构

单仓库快应用工程，4 个路由页面 + 1 个全局状态容器 + 1 个词库访问层。

```
┌─────────────────────────────────────────────┐
│ 页面层（.ux，MVVM，scss tokens）              │
│  Index（查词/联想/今日一词/索引条）            │
│  Detail（详情/收藏/上下词导航）                │
│  Cards（swiper 背词卡）                       │
│  Wordbook（生词本/最近查询）                   │
├─────────────────────────────────────────────┤
│ 全局状态：app.ux $def                         │
│  wordbook[] / history[]（storage 持久化）     │
├─────────────────────────────────────────────┤
│ 词库访问层：common/dict.js                    │
│  words.js（11949 词索引，常驻）                │
│  a.js..z.js（首字母分片，按需 require 缓存）   │
└─────────────────────────────────────────────┘
```

## 数据模型

分片记录（紧凑字段，节省体积）：

| 字段 | 含义 | 示例 |
|---|---|---|
| w | 全小写 key（排序/二分/存储键） | `"attention"` |
| a | 原词形（仅大写缩写/专名存在） | `"AD"` |
| p | 音标（美音优先，无斜线） | `ə'tɛnʃən` |
| t | 释义数组（≤3 条，词性前缀） | `["n.注意力…"]` |
| ph | 短语数组 `"en|cn"`（≤2 条） | `["pay attention\|专心"]` |
| s | 例句 `"en|cn"`（≤1 条，可空） | `My attention…\|我的注意力…` |
| l | 考级标签 | `G` 高考 `4` 四级 `6` 六级 `K` 考研 `I` 雅思 `T` 托福 |

排序规则：全小写 key 字母序全局一致（词表与分片同步），二分查找安全。跨书去重时释义取优先级更高的词书（高考 > 四级 > 六级 > 考研 > 雅思 > 托福），例句/短语由低优先级词书回填。

## 关键决策记录

1. **全小写 key + 保留词形 a 字段**：6 本词书大小写混排（AD 与 ad、专有名词），若以原词形排序，JS 字符串比较在大写 < 小写时产生乱序（实测 122 处），破坏二分。以小写 key 排序，`a` 字段保留展示词形。
2. **分片懒加载**：整包一次 require 约 2.7MB JSON，手表内存不可控；words.js（183KB）常驻支撑联想与全局序号，分片按首字母 require 后缓存。
3. **storage 直接存数组**：蓝河 K-V 文档明确支持 Object/Array 类型（getSync 返回值含 Object|Array），不做 JSON.stringify 双重编码。
4. **事件传参用模板内联**（`onclick="fn($idx)"`）：参考 vivo 蓝河实际工程（vpet-watch）验证过的写法，避免依赖未文档化的 `ev.item`/`ev.target.dataset`。
5. **页面参数**：router.push params 传词，Detail 以 `protected: { word }` 声明 + `this.word` 读取（官方文档 this.param1 保证可达）。
6. **iOS 质感实现**：不使用 vw-* 原生风格组件（与目标质感冲突），全部自绘：`#f2f2f7` 背景 + 白卡 28px 圆角 + `#007aff` 主色 + 22/26/32/40/52 字号阶 + normal/bold 双字重。

## 平台约束落实

| 约束 | 落实 |
|---|---|
| 静态预渲染（onInit 前禁 Feature API） | data 全静态初值；app.load() 由首页 onReady 触发 |
| 手表无键盘输入法 | input type=text 手写 + A-Z 索引条 + 联想兜底 |
| 长列表性能 | list/list-item 固定 type + tid；数据预处理无模板表达式（除根级 class 三元）；分片懒加载 |
| 圆屏裁剪 | 内容 34px 边距；索引条 right:28px 内缩；无贴边元素 |

## 数据管线

`tools/build-lexicon.js`（Node，本机运行不进包）：tmp/raw 6 本词书 JSONL → 清洗重音字母 → 小写 key 去重合并 → 字段裁剪 → 26 分片 + words.js。重建命令 `node tools/build-lexicon.js`。
