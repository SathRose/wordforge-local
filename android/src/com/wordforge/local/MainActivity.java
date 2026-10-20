package com.wordforge.local;

import android.app.Activity;
import android.app.AlertDialog;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.speech.tts.TextToSpeech;
import android.view.View;
import android.view.WindowInsets;
import android.webkit.JavascriptInterface;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;
import android.widget.Toast;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;
import java.util.Collections;
import java.util.Locale;

/** A small offline shell: all study content is bundled, no server is required. */
public final class MainActivity extends Activity {
    private static final String HOST = "appassets.androidplatform.net";
    private static final String HOME = "https://" + HOST + "/assets/index.html";
    private static final int OPEN_FILE = 101, SAVE_FILE = 102;
    private WebView web;
    private TextToSpeech tts;
    private volatile boolean ttsReady;
    private ValueCallback<Uri[]> fileCallback;
    private byte[] pendingExport;
    private boolean chooserOpen;

    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        FrameLayout root = new FrameLayout(this);
        root.setBackgroundColor(Color.rgb(246, 247, 251));
        web = new WebView(this);
        root.addView(web, new FrameLayout.LayoutParams(-1, -1));
        setContentView(root);
        if (Build.VERSION.SDK_INT >= 30) {
            getWindow().setDecorFitsSystemWindows(false);
            root.setOnApplyWindowInsetsListener((v, insets) -> {
                android.graphics.Insets p = insets.getInsets(WindowInsets.Type.systemBars()
                    | WindowInsets.Type.displayCutout() | WindowInsets.Type.ime());
                v.setPadding(p.left, p.top, p.right, p.bottom);
                return insets;
            });
            root.requestApplyInsets();
        }
        WebSettings settings = web.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(true); // Only user-selected document URIs are granted.
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        settings.setSupportMultipleWindows(false);
        settings.setJavaScriptCanOpenWindowsAutomatically(false);
        settings.setMediaPlaybackRequiresUserGesture(true);
        WebView.setWebContentsDebuggingEnabled(BuildConfig.QA);
        web.addJavascriptInterface(new NativeBridge(), "WordForgeNative");
        web.setWebViewClient(new WebViewClient() {
            @Override public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                Uri u = request.getUrl();
                if (HOST.equals(u.getHost())) {
                    if (!"https".equals(u.getScheme()) || !"GET".equals(request.getMethod())) return denied();
                    String file;
                    if ("/assets/index.html".equals(u.getPath())) file = "index.html";
                    else if ("/assets/upstream-LICENSE.txt".equals(u.getPath())) file = "upstream-LICENSE.txt";
                    else if ("/assets/ECDICT-LICENSE.txt".equals(u.getPath())) file = "ECDICT-LICENSE.txt";
                    else return denied();
                    try {
                        WebResourceResponse result = new WebResourceResponse(file.endsWith(".html") ? "text/html" : "text/plain",
                            "UTF-8", getAssets().open(file));
                        result.setResponseHeaders(Collections.singletonMap("X-Content-Type-Options", "nosniff"));
                        return result;
                    } catch (IOException e) { return denied(); }
                }
                // Network fetches for reading remain available, but no untrusted frames/documents get the bridge.
                String dest = request.getRequestHeaders().get("Sec-Fetch-Dest");
                if (request.isForMainFrame() || "iframe".equals(dest) || "frame".equals(dest)) return denied();
                if (!"https".equals(u.getScheme())) return denied();
                return null;
            }
            @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                Uri u = request.getUrl();
                if ("https".equals(u.getScheme()) && HOST.equals(u.getHost()) && "/assets/index.html".equals(u.getPath())) return false;
                if (request.isForMainFrame() && ("https".equals(u.getScheme()) || "http".equals(u.getScheme()))) {
                    try { startActivity(new Intent(Intent.ACTION_VIEW, u).addCategory(Intent.CATEGORY_BROWSABLE)); }
                    catch (ActivityNotFoundException e) { message("没有可打开此链接的浏览器"); }
                }
                return true;
            }
        });
        web.setWebChromeClient(new WebChromeClient() {
            @Override public boolean onShowFileChooser(WebView view, ValueCallback<Uri[]> callback, FileChooserParams params) {
                if (fileCallback != null) fileCallback.onReceiveValue(null);
                fileCallback = callback;
                Intent intent = new Intent(Intent.ACTION_OPEN_DOCUMENT).addCategory(Intent.CATEGORY_OPENABLE).setType("*/*");
                try { startActivityForResult(intent, OPEN_FILE); }
                catch (ActivityNotFoundException e) { fileCallback.onReceiveValue(null); fileCallback = null; message("系统没有可用的文件选择器"); }
                return true;
            }
        });
        tts = new TextToSpeech(this, status -> {
            if (status == TextToSpeech.SUCCESS && tts != null) {
                int language = tts.setLanguage(Locale.US);
                ttsReady = language != TextToSpeech.LANG_MISSING_DATA && language != TextToSpeech.LANG_NOT_SUPPORTED;
                web.evaluateJavascript("if(window.speechSynthesis&&typeof speechSynthesis.onvoiceschanged==='function')speechSynthesis.onvoiceschanged();", null);
            }
        });
        web.loadUrl(HOME);
    }

    private static WebResourceResponse denied() {
        return new WebResourceResponse("text/plain", "UTF-8", 403, "Forbidden", Collections.emptyMap(), new ByteArrayInputStream(new byte[0]));
    }
    private void message(String text) { runOnUiThread(() -> Toast.makeText(this, text, Toast.LENGTH_LONG).show()); }

    public final class NativeBridge {
        @JavascriptInterface public boolean ttsAvailable() { return ttsReady; }
        @JavascriptInterface public void ttsStop() { runOnUiThread(() -> { if (tts != null) tts.stop(); }); }
        @JavascriptInterface public void ttsSpeak(String text, String language, float rate) {
            if (text == null || text.isEmpty()) return;
            final String spoken = text.substring(0, Math.min(text.length(), TextToSpeech.getMaxSpeechInputLength()));
            runOnUiThread(() -> {
                if (!ttsReady || tts == null) {
                    new AlertDialog.Builder(MainActivity.this).setTitle("需要英语语音包")
                        .setMessage("请在手机的文字转语音设置中安装英语语音包，安装后重新打开词匠。背词和复习功能不受影响。")
                        .setPositiveButton("打开设置", (d, w) -> {
                            try { startActivity(new Intent("com.android.settings.TTS_SETTINGS")); }
                            catch (ActivityNotFoundException e) { message("请在系统设置中搜索“文字转语音”"); }
                        }).setNegativeButton("稍后", null).show();
                    return;
                }
                int ok = tts.setLanguage("en-GB".equals(language) ? Locale.UK : Locale.US);
                if (ok < 0) tts.setLanguage(Locale.US);
                tts.setSpeechRate(Float.isNaN(rate) ? 1f : Math.max(0.5f, Math.min(2f, rate)));
                tts.speak(spoken, TextToSpeech.QUEUE_FLUSH, null, "wordforge");
            });
        }
        @JavascriptInterface public void exportText(String name, String text) {
            if (text == null || text.length() > 32 * 1024 * 1024) { message("导出内容过大，请分批导出"); return; }
            final String filename = name == null ? "wordforge-backup.json" : name.replaceAll("[\\\\/:*?\"<>|\\p{Cntrl}]", "_");
            if (!(filename.endsWith(".json") || filename.endsWith(".txt") || filename.endsWith(".csv"))) {
                message("仅支持导出 JSON、CSV 或 TXT 文件"); return;
            }
            final byte[] content = text.getBytes(StandardCharsets.UTF_8);
            runOnUiThread(() -> {
                if (chooserOpen) { message("请先完成当前文件的保存"); return; }
                pendingExport = content; chooserOpen = true;
                String mime = filename.endsWith(".json") ? "application/json" : filename.endsWith(".csv") ? "text/csv" : "text/plain";
                Intent intent = new Intent(Intent.ACTION_CREATE_DOCUMENT).addCategory(Intent.CATEGORY_OPENABLE)
                    .setType(mime).putExtra(Intent.EXTRA_TITLE, filename);
                try { startActivityForResult(intent, SAVE_FILE); }
                catch (ActivityNotFoundException e) { pendingExport = null; chooserOpen = false; message("系统没有可用的文件保存器"); }
            });
        }
    }

    @Override protected void onActivityResult(int request, int result, Intent data) {
        super.onActivityResult(request, result, data);
        if (request == OPEN_FILE && fileCallback != null) {
            fileCallback.onReceiveValue(result == RESULT_OK && data != null && data.getData() != null ? new Uri[]{data.getData()} : null);
            fileCallback = null;
        }
        if (request == SAVE_FILE) {
            final byte[] bytes = pendingExport; pendingExport = null; chooserOpen = false;
            if (result != RESULT_OK || data == null || data.getData() == null || bytes == null) return;
            final Uri uri = data.getData();
            new Thread(() -> {
                try (OutputStream out = getContentResolver().openOutputStream(uri, "wt")) {
                    if (out == null) throw new IOException("无法打开目标文件");
                    out.write(bytes);
                    message("文件已保存");
                } catch (Exception e) { message("保存失败，请重新导出并选择其他位置"); }
            }, "wordforge-export").start();
        }
    }
    @Override public void onBackPressed() {
        web.evaluateJavascript("(function(){if(window.__wfBack&&window.__wfBack())return 'handled';if(window.__wfFlushSave)__wfFlushSave();return 'exit';})()",
            result -> { if ("\"exit\"".equals(result) || "null".equals(result)) finish(); });
    }
    @Override protected void onPause() {
        if (web != null) web.evaluateJavascript("if(window.__wfPause)__wfPause();if(window.__wfFlushSave)__wfFlushSave();", null);
        if (tts != null) tts.stop();
        super.onPause();
    }
    @Override protected void onDestroy() {
        if (fileCallback != null) fileCallback.onReceiveValue(null);
        if (tts != null) { tts.stop(); tts.shutdown(); }
        if (web != null) { web.removeJavascriptInterface("WordForgeNative"); web.destroy(); }
        super.onDestroy();
    }
}
