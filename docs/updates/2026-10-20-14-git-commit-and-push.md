# 2026-10-20 · 14 · 提交工作区并推送到 GitHub

## 用户需求、版本与状态

- 日期/时区：2026-10-20，Asia/Shanghai。
- 用户要求：先把项目上传到 GitHub，再保存本地 Git。
- 类型：Git 提交与推送（工作流程），无源码功能改动。
- 版本：应用版本不变，仍为 `1.1.1-local.8`，versionCode `8`；**本轮无新 APK**。
- 状态：local.5–local.8 六轮改动已分三个提交入库并推送成功，随后补记本篇日志与交接状态。远端 `main` 已同步。

## 完成内容

1. 提交前核对：`git status --short --branch` 显示 11 个已修改文件与 8 个未跟踪文件（2 个测试脚本、6 篇更新日志），无签名文件、私人备份、原始截图或 `releases/*.apk` 被纳入。`.gitignore` 规则保持不变。
2. 按内容拆成三个提交，避免把不同性质的改动揉成一坨：
   - `129bed6` feat(study)：`wordforge.html` 六轮功能（批次续批、换书会话、错题反馈、紧凑布局、字体层级）+ `checks/` 中新增/更新的测试脚本 + `README.md`、`docs/MOBILE-UI.md`。
   - `e033f68` build(android)：`AndroidManifest.xml` 版本码 4→8、`android/README.md` 版本说明、`releases/SHA256.txt` 中 local.5–local.8 校验和。
   - `ae8240d` docs：`docs/updates/` 08–13 六篇日志、`CHANGELOG.md` 索引、`HANDOFF.md`。
3. 推送 `origin main`：`240001b..ae8240d`，退出码 0，`git ls-remote origin refs/heads/main` 回读为 `ae8240d8721dcaa956b968309c0f843b237f1684`，确认远端已更新（不是只写了本地）。
4. 本轮未打 tag、未创建 GitHub Release，远端公开版本仍为 `v1.1.1-local.4`；local.5–local.8 的 APK 只在本机 `releases/`，按 `.gitignore` 不上传。

## 关键文件

| 文件 | 本轮操作 |
| --- | --- |
| `wordforge.html`、`checks/*.js`、`checks/*.cjs` | 作为既有改动提交（内容未在本轮改动） |
| `android/AndroidManifest.xml`、`android/README.md`、`releases/SHA256.txt` | 提交版本码与校验和记录 |
| `docs/updates/2026-10-20-08` 至 `-13` | 六篇日志此前已写、此前未入库，本轮一并提交 |
| `CHANGELOG.md`、`HANDOFF.md` | 索引与交接状态；本轮改为“已提交并推送” |
| `docs/updates/2026-10-20-14-git-commit-and-push.md` | 本篇 |

## 验证命令与真实结果

| 命令/环境 | 结果 |
| --- | --- |
| `node checks/check-structure.js wordforge.html` | **错误 0 / 警告 1**（既有动态模板标签计数警告）；外部资源 0，网络出口仍只有 `netGet` 一处。 |
| `node checks/test-logic.js wordforge.html`（Node 22.22.2 与 24.14.0 各跑一次） | **通过 739 / 失败 8**，两次结果一致。 |
| 同上，在 HEAD `240001b` 的临时 `git worktree` 上运行 | **通过 714 / 失败 8**，失败项与当前工作区**完全相同**，说明这 8 项与 local.5–local.8 的改动无关。 |
| 失败项定位（`fs.readFileSync` 加探针） | 8 项全部落在 `[19] 中国英文媒体源（真实页面夹具解析）`，读取 `checks/_cd_*.html`、`_gt_*` 时抛 `TypeError: Right-hand side of 'instanceof' is not callable`。根因：`checks/_stub_dom.js:56` 用普通对象覆盖了 `globalThis.URL`，Node 内部 `fs` 校验 `path instanceof URL` 时右侧不可调用，`rd()` 的 try/catch 于是返回空串。 |
| `git push origin main` / `git ls-remote` | 推送成功，远端 `main` = `ae8240d`。 |

**需要更正的历史说法**：此前 11–13 各轮日志记录的“逻辑 747 项通过、0 失败”，在当前 `checks/_stub_dom.js` 与当前夹具状态下**无法复现**；747 只是用例总数，现在其中 8 项必失败。原因在测试桩覆盖全局 `URL`，不在应用逻辑分支。这不是本轮引入的回归，但旧结论不能再当成当前证据使用。

## 产物、签名、Git 与发布状态

- 无新 APK、无新构建；现有包 `releases/词匠-本地版-1.1.1-local.8.apk`（versionCode 8，SHA-256 `16e8d21338032bef21798c1ece99cee4c4a02bb1d0939e05f1fd41ef427c2e21`）未变，签名未变。
- 本地提交：`129bed6`、`e033f68`、`ae8240d`，以及本篇文档所在的后续提交（哈希不写入自身文件，按主题定位）。
- 推送：本轮实际推送成功，`240001b..ae8240d`，远端公开库 [SathRose/wordforge-local](https://github.com/SathRose/wordforge-local) 分支 `main`。
- 发布：未打 tag、未创建 Release；远端最新公开包仍为 local.4。

## 未完成项与接手注意事项

1. **测试桩缺陷待修**：`checks/_stub_dom.js` 直接覆盖全局 `URL`，导致其后任何 `fs` 读取抛错。修法可考虑改为 `globalThis.__WF_URL_STUB` 或卸载后恢复原 `URL`，再重跑 `[19]` 夹具小节，恢复后才可重新声明“逻辑 0 失败”。本轮未改测试桩，避免在纯提交任务里引入行为变化。
2. 八尺寸布局 1209 项、字体 31 项、通用浏览器 392 项、API 36 QA 原生 24 项**本轮未重跑**，结论仍引自各自轮次日志，不能当作本轮验证结果。
3. local.8 仍未公开发布，也未做正式包覆盖安装与 iQOO Neo9 / OriginOS 真机验收；API 31 本轮未重跑。
4. 若下轮要发布：先修测试桩 → 重跑逻辑与浏览器回归 → 复用原签名递增版本码构建 → 更新 `releases/SHA256.txt` 与日志 → 再发 Release。APK、签名私钥、`test-results/`、`backups/` 一律不进 Git。

已同步 `CHANGELOG.md` 与 `HANDOFF.md`，历史日志均保留。
