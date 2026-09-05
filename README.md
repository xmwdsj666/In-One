# In One — BlueOS 手表英语词典（高中生版）

面向高中生的 BlueOS（蓝河）手表**极简离线查词应用**，暗色主题，单页双视图（搜索/详情），26 键 QWERTY 键盘输入，词库约 1.19 万词（高考词优先打标）。

## 功能

- 查词：内置 26 键 QWERTY 键盘输入 + 前缀联想（含包含匹配兜底），"找到 N 个结果"实时计数
- 单词详情：‹ 返回、金黄色大词、音标、考级标签（高考/四级/六级/考研/雅思/托福）、深灰释义卡 + 短语 + 例句
- 返回后保留搜索词与联想结果

## 词库

- 来源：`kajweb/dict`（有道词书公开数据，jsDelivr 可达），6 本词书（高中/四级/六级/考研/雅思/托福）合并去重 **11949 词**
- 26 个首字母分片静态 import（全小写 key 二分安全），词表索引 words.js 常驻约 183KB
- 重建：`node tools/build-lexicon.js`（词书 zip 需解压至 `tmp/raw/`）
- 校验：`node tools/smoke-test.js`（键盘输入/联想/详情/返回全链路）

## 目录结构

```
src/
  manifest.json        单页路由、features（仅 router）、designWidth 466、纯黑背景
  app.ux               空壳（无全局状态）
  common/dict.js       词库访问层（find/suggest/tagName）
  common/lexicon/      词库分片（构建产物）
  pages/Index/         单页双视图：搜索态（搜索框+联想+键盘）↔ 详情态（返回+金色词+释义卡）
  assets/              search.png 放大镜、暗色 scss tokens
```

## 构建（BlueOS Studio）

1. Studio 打开本目录（路径无中文无空格）→ 安装依赖 → 重新启动编译 → 预览
2. 顶部「打包」：debug 直接出包；release 需工具→生成证书
3. CLI（可选）：`node <Studio>/resources/app/extensions/blueos-debugger/node_modules/blueos-pack/bin/index.js build --debug --device-type watch-round`
4. 产物 `dist/<device>/debug/com.inone.watch.debug.1.1.0.rpk`

## 平台硬约束（踩坑沉淀，改代码前必读）

- 页面数据必须声明在 `data: {}` 内（顶层字段运行时 undefined）
- 禁用 `<block>`；条件渲染=真实组件+`if`；模板表达式只用字段直绑与 `===`（`!==`/`&&`/嵌套三元预计算进 data）
- 每个模板 class 必须有对应 CSS 规则（含 if 容器，否则子树布局塌陷）
- `src/` 内 JS 一律 ESM（CommonJS 报 4026/4007）
- 事件传参只用 `$idx`；`for` 只用于 list-item（text/div 上的 for 改预拼接字符串）
- blueos-pack CLI 只打包入口页——本项目因此采用单页双视图架构
