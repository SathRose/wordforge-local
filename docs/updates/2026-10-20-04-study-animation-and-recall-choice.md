# 2026-10-20 · 04 · 切词动画与中文选英文选择题

## 基本信息

- 日期/时区：2026-10-20，Asia/Shanghai。
- 类型：功能。
- 应用版本与版本码：仓库内 `wordforge.html` 已更新；APK 仍为 `1.1.1-local.3`（versionCode `3`），**本轮没有重新打包 APK**。
- 用户需求：
  1. 切换到下一个词时增加动画。
  2. 保留“中文选英文”的题型，只取消需要打字的拼写题。
- 状态：已完成代码、测试与文档；Android 安装包尚未包含本轮改动。

## 本轮完成内容

1. **切词动画**
   - 新增 `wfCardNext` / `wfCardPrev` 两个关键帧，下一词从右侧轻滑入，上一词从左侧轻滑入。
   - `.wcard.anim-next` / `.wcard.anim-prev` 只对 `transform` 与 `opacity` 做 0.22s 动画，不改变布局，不会撑出横向滚动。
   - `prefers-reduced-motion: reduce` 下完全关闭动画。
   - `S.anim` 作为一次性方向标记：`commitAndNext()`、`nextWord()` 设为 `next`，`prevWord()` 设为 `prev`；`renderSession()` 读取后立即清空，评分条等局部刷新不会重复播放。
   - 首次进入会话与总结页不播放切词动画。

2. **保留中文选英文**
   - `recallBody()` 仍是“根据释义选择单词”：题干为中文释义，四个选项为英文单词。
   - `modeFromPair("choice", "m2w")` 仍返回 `recall`；设置页“选一个” + “看释义想单词”可用，默认题型轮换也保留 `recall`。
   - 本轮没有恢复 `spell` / `cloze` 输入框；拼写题、例句填空输入题继续停用，旧配置继续在运行时过滤。

3. **回归测试**
   - `checks/test-logic.js` 新增切词方向标记断言：`nextWord()` 后新卡带 `anim-next`，`prevWord()` 后带 `anim-prev`。
   - 新增“尊重系统减少动态效果设置”的源码断言。
   - 新增中文选英文行为断言：题干为“根据释义选择单词”、存在英文选项，且不含 `spellIn` 拼写输入框。

## 关键文件与实现入口

| 文件 | 变更或接手说明 |
| --- | --- |
| `wordforge.html` | 卡片样式新增 `wfCardNext` / `wfCardPrev` 与 `.wcard.anim-*`；`startSession` 初始化 `S.anim`；`renderSession` 消费方向并挂 class；`commitAndNext` / `nextWord` / `prevWord` 设置方向。`recallBody` 与 `modeFromPair` 未删除，中文选英文继续可用。 |
| `checks/test-logic.js` | 新增动画方向、减少动态效果、中文选英文英文选项断言。 |

## 验证

| 命令 / 环境 | 真实结果 | 证据位置 |
| --- | --- | --- |
| `node checks/check-structure.js wordforge.html` | 通过：0 错误、1 条既有模板标签提示；4 个内联脚本语法正确。 | 本机终端输出 |
| `node checks/test-logic.js wordforge.html` | 通过：退出码 0，全部断言通过（含新增动画与中文选英文断言）。 | 本机终端输出 |
| `node checks/test-textbook-import.cjs` | 通过：10 项。 | 本机终端输出 |
| `node checks/test-vocabgo-import.cjs` | 通过：16 项。 | 本机终端输出 |
| `node checks/test-book-picker.cjs` | 通过：14 项、0 失败。 | 本机终端输出 |
| `git diff --check` | 通过，无空白错误。 | 本机终端输出 |
| 内置浏览器实际点击 | 通过：设置为“先释义 + 选一个”后，题型显示“看义选词”，题干为“迫使；使负有义务”，选项为 `subjunctive / architecture / oblige / downturn` 等英文单词；点击正确项后进度 1/14 → 2/14，新卡 class 为 `wcard anim-next`、`animationName` 为 `wfCardNext`；点“上一张”后 class 为 `wcard anim-prev`、`animationName` 为 `wfCardPrev`。 | 本机浏览器会话与截图 |
| `node checks/test-mobile-ui.cjs` | **未运行成功**：本机缺 `playwright` 模块（`Cannot find module 'playwright'`），未执行页面断言，不是代码失败。 | 本机终端输出 |

## Git、产物与部署

- 分支：`main`。
- 本轮提交主题：`feat: animate card transitions and keep Chinese-to-English choice`。
- 本地提交 / 远端推送：在本轮交付时执行；以 `git status --short --branch` 和最终交付回复为准。
- APK：**无新 APK**。当前仍是 `releases/词匠-本地版-1.1.1-local.3.apk`；本轮 HTML 改动尚未进入安装包，手机端如需动画与当前交互，需要重新构建并递增 versionCode。
- 本地服务：电脑版读取缓存的 HTML，修改后需重启本地服务才会加载新版本；本轮未重启。
- 数据迁移：不清空或改写学习记录；动画只影响渲染，旧配置继续运行时过滤。

## 未完成、风险与下一步

1. **Android APK 尚未重打包**：手机安装包仍是旧交互与旧样式；需要按既有签名重新构建、递增 versionCode，并在隔离 QA 模拟器验证后再交付。
2. **移动端 Playwright 回归未执行**：本机缺 `playwright` 模块。安装后运行 `node checks/test-mobile-ui.cjs`，重点复核切词动画不会影响按钮可见性与点击稳定性。
3. **真机体验仍未验收**：iQOO Neo9 / Android 12 的实际动画流畅度、屏幕与字体设置仍以用户反馈为准，不能把本轮桌面浏览器结果写成真机通过。

## 接手提醒

- 新对话先读 `AGENTS.md`、`HANDOFF.md`、`CHANGELOG.md` 和本日志，再检查 `git status --short --branch`。
- 不要恢复 `spell` / `cloze` 输入题；中文选英文是 `recall`，不要误删。
- 不要清空用户真实学习记录，也不要卸载旧版 APK；覆盖更新必须复用本机签名。
- 已同步 `CHANGELOG.md` 与 `HANDOFF.md`：是。
