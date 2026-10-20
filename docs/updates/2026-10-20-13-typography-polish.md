# 2026-10-20 · 13 · 参考截图美化字体

## 用户需求、版本与状态

- 日期/时区：2026-10-20，Asia/Shanghai。
- 用户提供中英文字体参考图片，要求美化应用字体；图片仅作为视觉参考，未将其中标题文字当作额外操作指令。
- 类型：字体与排版美化、回归和本地构建。
- 版本：`1.1.1-local.8`，versionCode `8`。
- 状态：源码、字体专项、通用/布局/逻辑回归、隔离 API 36 QA 验证与本地正式 APK 构建完成；未提交、推送或公开发布，未做真机验收。

## 完成内容

1. 参考清爽、适度圆润、字重适中的无衬线风格，调整系统字体栈与中英文回退。Windows 优先 Segoe UI Variable Text / Segoe UI，中文适配微软雅黑 UI 等；其他平台按本机可用字体回退。不下载网络字体，不复制或分发参考产品的商业字体文件。
2. 建立正文 400、普通操作 500、词头/中文标题/主要操作 600 的层级。词头从原 700 粗体改为半粗体，英文词头字距稍收紧，保留清晰字形与原有字号。
3. 音标从等宽字体改为比例无衬线字体并保留 IPA 回退，避免过于机械的打字机效果；选项序号使用界面字体与等宽数字，不影响代码/原本需要等宽的其他区域。
4. 不覆盖用户主动选择的衬线/等宽词头样式。通过真实设置按钮切换三类字体，确认会话、选项与已保存学习记录不变。
5. 保留上一轮的紧凑主流程和安全边界，不改变主要触控区域与字号下限；重新验证一屏、文字裁切和遮挡关系。参考图片不代表确切字体识别，也不承诺不同系统像素级一致。
6. 版本递增为 local.8，正式和 QA 包均复用本机原签名；电脑版服务在原来源重启。

## 关键文件

| 文件 | 修改/入口 |
| --- | --- |
| `wordforge.html` | `--sans`、`--phonetic`、字重变量；正文渲染属性；`.w-word` / `.w-ipa`；标题、按钮、选项、序号与核心释义的字体层级。 |
| `checks/test-typography.cjs` | 三尺寸字体专项：实际字重、比例音标、系统回退栈、真实设置切换及会话/数据不变。 |
| `android/AndroidManifest.xml`、`android/README.md` | 版本码 8、local.8 及说明。 |
| `README.md`、`docs/MOBILE-UI.md` | 当前字体行为、测试与平台边界。 |
| `releases/SHA256.txt` | 新包校验和；构建元数据在本机。 |
| `CHANGELOG.md`、`HANDOFF.md` | 最新索引、版本、验证与交接状态。 |

## 验证命令与真实结果

| 命令/环境 | 结果 |
| --- | --- |
| 外部 Playwright + 系统 Chrome：`node checks/test-typography.cjs` | **31 项通过、0 失败**；320×568、390×844、1440×900。正文/选项 400，词头/标题/主按钮 600，音标非等宽；真实切换 serif/mono/sans 生效且会话/记录不变。 |
| `node checks/test-study-layout.cjs` | 本轮重新运行，**1209 项通过、0 失败**，八尺寸、四/六选项、五题型、一屏/遮挡/命中/触控区域/弹层/缩屏/极长内容回退均通过。 |
| `node checks/test-mobile-ui.cjs` | 本轮重新运行，**392 项通过、0 失败，无页面 JS 异常**。 |
| `node checks/test-logic.js wordforge.html test-results/logic-typography.txt` | **747 项通过、0 失败**。 |
| `node checks/check-structure.js wordforge.html` | **0 错误、1 项既有动态模板标签计数警告**；外部资源 0，网络出口检查通过。 |
| 教材导入、词库导入、词书排序三个现有检查脚本 | **10 / 16 / 14 项通过**。 |
| CDP `CSS.getPlatformFontsForNode`，隔离 Windows Chrome | 实际英文词头渲染为 **Segoe UI Variable Text Semibold**；中文标题为 **Microsoft YaHei UI Bold**，中文选项为常规 Microsoft YaHei UI。是本机证据，不代表 Android 字体相同。 |
| `node android/build-apk.cjs`、`node android/build-apk.cjs --qa` | 正式/QA 构建成功，签名与 ZIP 对齐验证通过；Java 只有弃用 API 提示。 |
| 确认 `emulator-5556` 为 `PaperStudio_API36`，安装/启动 QA；`WORDFORGE_DEVICE=emulator-5556 node checks/test-android-ui.cjs` | QA 安装成功；**24 项通过、0 失败（API 36）**；真实触控、无覆盖布局、错题、详解、原生返回、IME、导入和重载持久化通过，没有 DOM 点击回退。 |
| `apksigner.jar verify --print-certs` 对比 local.7 / local.8；`aapt2 dump badging` | 签名验证通过，证书一致；包名不变、版本码 8 / local.8、minSdk 26 / targetSdk 35。 |
| Python `zipfile` / `hashlib` | 最终 APK、源码、包内 HTML 摘要通过；正式/QA 内置 HTML 一致，含新字体栈与字重变量。 |
| 原来源服务重启并对比健康接口摘要 | `http://127.0.0.1:8765/` 已重启，源码摘要匹配；未改真实学习记录。 |
| `git diff --check`、`git status --short --branch` | 差异格式检查通过，保留此前及本轮未提交修改。 |

已查看隔离浏览器的学习页/首页截图进行视觉检查。证据在被 Git 忽略的 `test-results/typography-result.json`、`typography-console.txt`、`typography-study-390x844.png`、`typography-home-390x844.png`、`layout-typography-console.txt`、`mobile-typography-console.txt`、`logic-typography.txt`、`structure-typography.txt`、`android-typography-console.txt`、`android-ui-api36-result.json` 及构建输出。用户原始参考图片没有复制到公开仓库。

## 产物、签名、Git 与发布状态

- 正式包路径：`E:\workplace\英语单词系统\releases\词匠-本地版-1.1.1-local.8.apk`。
- versionCode：**8**；versionName：**1.1.1-local.8**；大小：**4,690,608 bytes**。
- APK SHA-256：`16e8d21338032bef21798c1ece99cee4c4a02bb1d0939e05f1fd41ef427c2e21`。
- 源码 HTML SHA-256：`20686439e04bb86ec0e97bb08cdb15ad033209989ac29560d60d254dcaa3445f`。
- 包内 HTML SHA-256：`52ab0713b04aba04547a3138d8ac1b4bff3b27a6a85ff378db4de763c927debb`，与源码的差别来自原生桥注入。
- 证书 SHA-256：`c2c6dedc233415427504c86a54989ee611e98dea36afcac485c720199bcd49c6`，复用本机原签名。正式包无 WebView 调试，只有 QA 包启用；签名私钥和密码不进入 Git。
- 具备同包名/同签名/递增版本码覆盖更新条件；本轮只实际安装并测试 QA 模拟器包，没有正式包覆盖安装或真机数据保留验收。
- 分支 `main`，开始时 HEAD `240001b`；先前未提交改动原样保留。**没有本地提交、没有推送、没有 GitHub Release 发布**，没有可记录的本轮实现提交哈希，不编造自引用哈希。
- 新版只在本地生成，**没有已实际发布的新包下载地址**；远端公开版本仍为 local.4。

## 未完成项与接手注意事项

1. 仍需用户在 iQOO Neo9 / OriginOS 上检查字体观感；本轮 API 36 不是其真机验收，也未重跑 API 31。
2. 系统字体策略以离线和兼容为优先，Android/iOS/Windows 的最终字形可能不同。没有准确识别或捆绑参考截图字体，不能声称完全复刻。
3. 覆盖更新前先导出完整备份，不卸载旧版、不清数据；会改数据的测试只运行于隔离 context 与 QA 模拟器。
4. 一屏范围、极长内容安全滚动与进程内栏目恢复的边界沿用上一轮。后续修改须检查 Git 现场，保持原端口/来源，更新日志并同步交接文件；远端提交/发布另行执行。

已同步 `CHANGELOG.md` 与 `HANDOFF.md`，历史日志均保留。
