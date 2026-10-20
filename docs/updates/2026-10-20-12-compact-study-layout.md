# 2026-10-20 · 12 · 紧凑背词布局与遮挡检查

## 用户需求与状态

- 日期/时区：2026-10-20，Asia/Shanghai。
- 用户希望背词 UI 更紧凑，主要学习过程不用上下滑动；尤其注意选项、反馈与操作按钮的遮挡，必要时适当缩小字号。
- 类型：界面布局、适配、回归测试及本地构建。
- 版本：`1.1.1-local.7`，versionCode `7`。
- 状态：源码、专项布局检查、通用回归、隔离 API 36 QA 验证、本地正式 APK 构建完成；未公开发布或真机验收。

## 完成内容

1. **主学习界面紧凑化**：减小卡片边距、标签、题干和选项间距；朗读放到词头旁，音标不再另占一行大按钮；收起持久度/计数等次级标签，完整统计保留在详解。
2. **操作区不再悬浮覆盖**：取消学习操作区的 sticky 定位、负 bottom 和覆盖层级，让选项、反馈、评分和翻词操作按普通布局依次排列。宽裕时操作区靠近底部便于触达，但不会压住卡片。
3. **三档自适应密度**：渲染、窗口尺寸变化及字体就绪后，按真实可用高度逐档收紧间距/字号。选项最低 12px，主要点击区域保持至少 44px；不对整个页面做 transform 缩放，不截断或隐藏选项文字。
4. **横屏与六选项适配**：普通四选项以纵向排列为主，六选项两列；短横屏题干/选项分栏，六选项三列；卡片自评模式也使用横向题干/答案布局。
5. **长资料通过显式入口查看**：主屏呈现核心释义首行。“完整题干”保留全部释义与配置允许的英文解释，不显示答案词头；揭晓/判分后“详解”保留完整释义、例句、音标、词形、巧记和收藏/难度/已会标记。资料弹层可以独立滚动，不挤占主答题区。关闭、下钻词形/词条再返回，不改变当前题或评分；下钻前关闭旧弹层，避免新页面被遮住。
6. **保留上一轮逻辑**：答错即时保存并停留，正确项/误选项明确标记；确认继续不重复计分，上一张沿用撤销；栏目切换仍恢复会话。
7. **安全边界**：任意长的自定义文本无法在有限屏幕内无损强制一屏。本轮对常规长度学习内容执行一屏验证，极端长文本保留自然滚动作为安全回退，不锁死高度、不裁掉信息或让按钮不可达。资料弹层本身允许滚动。

## 关键文件

| 文件 | 实现入口/作用 |
| --- | --- |
| `wordforge.html` | 会话作用域紧凑 CSS、横屏布局、`studyCardBody`、`studyWordHead`、`studyMeaning`、`fitSession`；`renderSession` 的普通布局操作区及 `bindSession` 的题干/详解弹层。非学习界面不使用这些紧凑规则。 |
| `checks/test-study-layout.cjs` | 新增八尺寸专项测试：四/六选项、五题型、答题前后、一屏、矩形关系、命中测试、文字未裁剪、最小触控区域、最大界面字号、弹层资料、下钻返回、缩屏和极长内容回退。 |
| `checks/test-android-ui.cjs` | 新增原生问题/错题一屏与不遮挡检查、详解弹层内容、Android 返回关闭弹层及状态保留。 |
| `android/AndroidManifest.xml`、`android/README.md` | 版本码 7 与版本名 local.7、功能说明。 |
| `README.md`、`docs/MOBILE-UI.md` | 新行为、专项命令与一屏范围。 |
| `releases/SHA256.txt` | 新 APK 校验和；构建元数据仅在本机。 |
| `CHANGELOG.md`、`HANDOFF.md` | 本轮索引、版本、验证结果和下一步。 |

## 验证命令与真实结果

| 命令/环境 | 结果 |
| --- | --- |
| 外部 `playwright-core` + 系统 Chrome：`node checks/test-study-layout.cjs` | **1209 项通过、0 失败、无页面 JS 异常**。覆盖 320×568、320×640、360×640、390×844、412×815、458×966、800×360、1440×900，实际应用最大界面字号 20px。五题型为看词选义、看义选词、听音辨词、卡片速记、看义想词；听力使用隔离语音可用性桩，不宣称测过实际发音音质。 |
| `STUDY_VIEWPORT=800x360 node checks/test-study-layout.cjs` | 开发阶段横屏专项 **152 项通过**；最终以上八尺寸完整运行 1209 项为准，未把单尺寸结果当完整结果。 |
| 外部 Playwright 配置：`node checks/test-mobile-ui.cjs` | **392 项通过、0 失败、无页面 JS 异常**；真实导航、判分、撤销、栏目恢复、错题反馈、精读及导入回归均通过。 |
| `node checks/test-logic.js wordforge.html test-results/logic-compact-result.txt` | **747 项通过、0 失败**。 |
| `node checks/check-structure.js wordforge.html` | **0 错误、1 警告**；动态 HTML 模板标签计数警告，脚本语法通过。 |
| 教材导入、词库导入、词书排序三个现有检查脚本 | 分别 **10 / 16 / 14 项通过**。 |
| `node android/build-apk.cjs` / `node android/build-apk.cjs --qa` | 正式/QA 构建成功，签名及 ZIP 对齐校验通过；Java 有弃用 API 提示，无构建失败。 |
| 确认 `emulator-5556` 为 `PaperStudio_API36` 后，安装 QA 包、启动 Activity；`WORDFORGE_DEVICE=emulator-5556 node checks/test-android-ui.cjs` | QA 安装成功；**24 项通过、0 失败，API 36**，含真实触控、错题一屏、详解、原生返回、软键盘与持久化；未使用 DOM 点击回退。没有对真实手机执行测试。 |
| `apksigner.jar verify --print-certs` 验证 local.6 / local.7；`aapt2 dump badging` | 验证通过，证书一致；包名不变，versionCode 7 / local.7，minSdk 26、targetSdk 35。 |
| Python `zipfile`/`hashlib` | 最终 APK、源码与包内 HTML 摘要核验通过；正式/QA 包内 HTML 一致，确实包含本轮紧凑实现。 |
| 原来源重启 `Stop-WordForge.ps1` / `Start-WordForge.ps1 -NoBrowser`，健康接口对比源码摘要 | 已在 `http://127.0.0.1:8765/` 重启，摘要匹配；未改浏览器真实学习记录。 |
| `git diff --check`、`git status --short --branch` | 差异格式检查通过；保留本轮及先前所有未提交修改。 |

开发阶段专项检查确实暴露了最短屏六选项溢出、布局尺寸过渡造成测量与最终尺寸不同、横屏密度变化后 Grid 行错位等问题；已分别收紧边界布局、禁止字体/间距的布局过渡并显式对齐横屏网格，最终完整回归通过。未通过隐藏溢出、裁剪选项或缩小触控区域来绕过测试。

证据保留在被 Git 忽略的 `test-results/study-layout-result.json`、`study-layout-console-final.txt`、`mobile-ui-result.json`、`mobile-compact-console-final.txt`、`logic-compact-result.txt`、`structure-compact-result.txt`、`android-ui-api36-result.json`、`android-compact-console.txt` 及 local.7 构建输出。已查看隔离截图进行视觉检查，公开日志不包含私人数据或原始隐私截图。

## 版本、APK、签名与 Git/发布状态

- 正式 APK：`E:\workplace\英语单词系统\releases\词匠-本地版-1.1.1-local.7.apk`。
- versionCode：**7**；versionName：**1.1.1-local.7**；大小：**4,690,608 bytes**。
- APK SHA-256：`3189e7c459d323cbe11882ae2455df9778d65739334b6835722bf62d3cdc89d8`。
- 源码 HTML SHA-256：`075def464aa7183f731a6941aa4df92bce313401af028ab8462518ec8287e37c`。
- 包内 HTML SHA-256：`c96cc7980a84364b19ca1094bee18342f6162af6b132b0ae118f49e89b41ea71`；与源码不同是因为原生桥注入。
- 签名证书 SHA-256：`c2c6dedc233415427504c86a54989ee611e98dea36afcac485c720199bcd49c6`，与 local.6 及更早本机版本一致。正式包不启用 WebView 调试；仅 QA 包启用。签名私钥/密码不进入 Git。
- 具备同包名、同签名、递增版本码的覆盖更新条件；本轮只实际安装并测试隔离模拟器 QA 包，没有正式包实际覆盖安装或真机数据保留验收。
- 分支 `main`，开始时 HEAD `240001b`。保留先前未提交的批次/切书/反馈修复，本轮亦**未提交、未推送、未发布 GitHub Release**。没有本轮实现提交哈希，不编造自引用哈希。
- 新包仅在本地生成，**没有已实际发布的新版下载地址**；GitHub 公开版本仍为 local.4。旧 local.6 不含本轮紧凑布局。

## 未完成与下一步

1. 用户需在 iQOO Neo9 上确认屏幕/字体设置下的实际体验；模拟器结果不是 OriginOS 真机验收。本轮未重跑 API 31。
2. 覆盖安装前先导出完整备份，不卸载旧版、不清数据。任何会改数据的自动回归仅限隔离 context / QA 模拟器，不运行到真实手机。
3. 资料弹层允许滚动；无限长自定义内容保留安全滚动回退。不要将本轮说成“所有长度、所有字体缩放都绝对无滚动”。会话跨刷新/进程重启恢复仍非本轮范围。
4. 提交/推送/公开发布尚未执行；后续操作前核对 Git 现场。电脑版固定来源服务已重启，APK 不会自动读取电脑的新 HTML，需使用本轮新包。

已同步 `CHANGELOG.md` 与 `HANDOFF.md`；历史日志保留，未覆盖。
