# 词匠安卓本地版

- 包名：`com.wordforge.local`；Android 8.0 及以上。
- 将工作区最新版 `wordforge.html` 内置到 APK，不依赖电脑、不需要本地服务，不会从网络更新覆盖本地词库。
- WebView 使用固定 HTTPS 虚拟来源，词库、排序及进度保存在应用私有存储。外部网页交给手机浏览器打开，不在带有原生桥的页面中运行。
- 系统文件选择器处理词表导入及 JSON/CSV/TXT 导出，无需“所有文件访问”或存储权限。
- 单词朗读对接系统 TTS，需要手机安装英语语音包；未就绪时不会提供依赖语音的听力题。
- 打包时只对 APK 的 HTML 副本加入原生导出、TTS 接口和禁止嵌入框架的策略，不修改电脑网页版。
- 本地构建签名独立于上游官方签名，不能用于覆盖上游同包名应用；本项目包名独立，可与其共存。

## 重新打包

安装 JDK 21、Android SDK Build Tools 36.0.0 和 android-36 平台，设置 `JAVA_HOME`、`ANDROID_HOME` 后，在项目目录执行：

```
node android/build-apk.cjs
```

测试包使用 `--qa`，仅此模式启用 WebView 调试；正式 APK 不启用调试。

务必备份 `android/signing/` 中的签名文件和密码，后续覆盖更新必须使用同一签名；不要公开这些文件。生成的 APK 可公开分发，签名文件不随 APK 发布。

## 数据与更新

- 手机 APK 和电脑浏览器的数据独立，不会自动同步。迁移时在电脑端导出**完整备份**，再用手机应用内的恢复备份功能导入。
- 不要卸载应用或清除应用数据；这会删除应用内进度。重新安装同包名、同签名 APK 可以覆盖更新，更新前仍建议导出完整备份。
- `releases/apk-build-info.json` 记录 APK 摘要及对应的电脑 HTML 摘要。

参考：[Android 本地 Web 内容](https://developer.android.com/develop/ui/views/layout/webapps/load-local-content)、[文件选择器接口](https://developer.android.com/reference/android/webkit/WebChromeClient)、[APK 签名验证](https://developer.android.com/tools/apksigner)。
