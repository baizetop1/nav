package top.baizeone.shuihu;

import android.app.Activity;
import android.app.AlertDialog;
import android.content.Intent;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.webkit.*;
import android.view.View;
import android.view.WindowInsets;
import android.widget.Toast;
import android.widget.FrameLayout;
import java.io.*;
import java.nio.charset.StandardCharsets;
import java.util.Collections;
import java.util.Locale;

/** Bundled game assets only. Cloud requests keep the site's existing HTTPS origin. */
public final class MainActivity extends Activity {
    static final String HOST = "baizeone.top";
    static final String PREFIX = "/__android__/";
    static final String START = "https://" + HOST + PREFIX + "game/index.html";
    static final int IMPORT = 11, EXPORT = 12;
    WebView web;
    ValueCallback<Uri[]> chooser;
    String pendingExport;

    static boolean local(Uri uri) {
        return "https".equals(uri.getScheme()) && HOST.equals(uri.getHost())
            && (uri.getPort() == -1 || uri.getPort() == 443) && uri.getUserInfo() == null
            && uri.getPath() != null && uri.getPath().startsWith(PREFIX + "game/");
    }
    @Override public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        web = new WebView(this);
        web.setBackgroundColor(Color.rgb(238,246,243));
        web.setSaveEnabled(false); // IndexedDB is the source of truth, never a restored network page.
        FrameLayout frame = new FrameLayout(this);
        frame.addView(web,new FrameLayout.LayoutParams(-1,-1));
        setContentView(frame);
        frame.setOnApplyWindowInsetsListener((view, insets) -> {
            if (Build.VERSION.SDK_INT >= 30) {
                android.graphics.Insets bars = insets.getInsets(WindowInsets.Type.systemBars() | WindowInsets.Type.displayCutout() | WindowInsets.Type.ime());
                view.setPadding(bars.left,bars.top,bars.right,bars.bottom);
            } else {
                view.setPadding(insets.getSystemWindowInsetLeft(),insets.getSystemWindowInsetTop(),insets.getSystemWindowInsetRight(),insets.getSystemWindowInsetBottom());
            }
            return insets.consumeSystemWindowInsets();
        });
        WebSettings settings = web.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(true); // SAF-selected documents; URL navigation is blocked by the client.
        settings.setAllowFileAccessFromFileURLs(false);
        settings.setAllowUniversalAccessFromFileURLs(false);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        settings.setSupportMultipleWindows(false);
        settings.setJavaScriptCanOpenWindowsAutomatically(false);
        settings.setTextZoom(100);
        settings.setBuiltInZoomControls(true);
        settings.setDisplayZoomControls(false);
        CookieManager.getInstance().setAcceptThirdPartyCookies(web,false);
        web.addJavascriptInterface(new SaveBridge(), "BaizeAndroid");
        web.setWebViewClient(new WebViewClient() {
            @Override public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                Uri uri = request.getUrl();
                if (local(uri) && "GET".equals(request.getMethod())) {
                    String asset = uri.getPath().substring(PREFIX.length());
                    for (String part : asset.split("/")) if (part.equals("..") || part.equals(".") || part.contains("\\") || part.indexOf(0)>=0) return missing();
                    try {
                        String mime = mime(asset);
                        return new WebResourceResponse(mime,"UTF-8",200,"OK",Collections.singletonMap("Cache-Control","no-cache"),getAssets().open(asset));
                    } catch(IOException e) { return missing(); }
                }
                // Never fall back to the website for missing bundled files or another document.
                if ("https".equals(uri.getScheme()) && "save.baizeone.top".equals(uri.getHost()) && (uri.getPort()==-1||uri.getPort()==443) && !request.isForMainFrame()) return null;
                return missing();
            }
            @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                if (local(request.getUrl())) return false;
                if (request.isForMainFrame()) openOutside(request.getUrl());
                return true;
            }
        });
        web.setWebChromeClient(new WebChromeClient() {
            @Override public boolean onShowFileChooser(WebView view, ValueCallback<Uri[]> callback, FileChooserParams params) {
                if (!local(Uri.parse(view.getUrl()==null?"":view.getUrl()))) return false;
                if (chooser!=null) chooser.onReceiveValue(null);
                chooser=callback;
                Intent intent=new Intent(Intent.ACTION_OPEN_DOCUMENT).addCategory(Intent.CATEGORY_OPENABLE).setType("*/*");
                try { startActivityForResult(intent,IMPORT); }
                catch(Exception e) { chooser.onReceiveValue(null);chooser=null;toast("未找到文件选择器，请在存档页粘贴存档文本。"); }
                return true;
            }
            @Override public boolean onJsAlert(WebView view,String url,String message,JsResult result) {
                new AlertDialog.Builder(MainActivity.this).setMessage(message).setPositiveButton("知道了",(d,w)->result.confirm()).setOnCancelListener(d->result.cancel()).show();return true;
            }
            @Override public boolean onJsConfirm(WebView view,String url,String message,JsResult result) {
                new AlertDialog.Builder(MainActivity.this).setMessage(message).setPositiveButton("确认",(d,w)->result.confirm()).setNegativeButton("取消",(d,w)->result.cancel()).setOnCancelListener(d->result.cancel()).show();return true;
            }
        });
        web.loadUrl(START);
    }
    static String mime(String path) {
        String p=path.toLowerCase(Locale.ROOT);
        if(p.endsWith(".html"))return "text/html";
        if(p.endsWith(".js"))return "application/javascript";
        if(p.endsWith(".css"))return "text/css";
        if(p.endsWith(".json"))return "application/json";
        if(p.endsWith(".svg"))return "image/svg+xml";
        if(p.endsWith(".png"))return "image/png";
        if(p.endsWith(".webp"))return "image/webp";
        if(p.endsWith(".jpg")||p.endsWith(".jpeg"))return "image/jpeg";
        if(p.endsWith(".woff2"))return "font/woff2";
        return "application/octet-stream";
    }
    static WebResourceResponse missing() {
        return new WebResourceResponse("text/plain","UTF-8",404,"Not Found",Collections.emptyMap(),new ByteArrayInputStream("Bundled asset unavailable".getBytes(StandardCharsets.UTF_8)));
    }
    void openOutside(Uri uri) {
        if (HOST.equals(uri.getHost()) && uri.getPath()!=null && uri.getPath().startsWith(PREFIX)) uri=Uri.parse("https://baizeone.top/");
        if (!"https".equals(uri.getScheme())) return;
        try { startActivity(new Intent(Intent.ACTION_VIEW,uri)); } catch(Exception e) { toast("未找到浏览器。"); }
    }
    void toast(String message) { runOnUiThread(()->Toast.makeText(this,message,Toast.LENGTH_LONG).show()); }
    final class SaveBridge {
        @JavascriptInterface public void exportSave(String text,String name) {
            if(text==null||text.length()>20*1024*1024){toast("存档过大，无法导出。");return;}
            final String fileName=(name==null?"白泽水浒存档.json":name.replaceAll("[\\/:*?\"<>|\r\n]","_")).replaceAll("[^.]+$","json");
            runOnUiThread(()->{
                if(isFinishing() || !local(Uri.parse(web.getUrl()==null?"":web.getUrl())))return;
                if(pendingExport!=null){toast("请先完成当前的存档导出。");return;}
                pendingExport=text;
                Intent intent=new Intent(Intent.ACTION_CREATE_DOCUMENT).addCategory(Intent.CATEGORY_OPENABLE).setType("application/json").putExtra(Intent.EXTRA_TITLE,fileName);
                try { startActivityForResult(intent,EXPORT); }
                catch(Exception e) { pendingExport=null;toast("未找到文件保存器。"); }
            });
        }
    }
    @Override protected void onActivityResult(int request,int result,Intent data) {
        super.onActivityResult(request,result,data);
        if(request==IMPORT && chooser!=null){chooser.onReceiveValue(result==RESULT_OK&&data!=null&&data.getData()!=null?new Uri[]{data.getData()}:null);chooser=null;}
        if(request==EXPORT){final String text=pendingExport;pendingExport=null;
            if(result!=RESULT_OK||data==null||data.getData()==null||text==null)return;
            final Uri destination=data.getData();
            new Thread(()->{try(OutputStream output=getContentResolver().openOutputStream(destination,"wt")){
                if(output==null)throw new IOException("Unavailable destination");
                output.write(text.getBytes(StandardCharsets.UTF_8));output.flush();toast("存档文件已导出。");
            }catch(Exception e){toast("文件导出失败，本机进度仍保留，请重新选择保存位置。");}},"save-export").start();
        }
    }
    @Override public void onBackPressed() {
        web.evaluateJavascript("(()=>{const d=document.querySelector('dialog[open]');if(d){d.close();return true;}const c=document.querySelector('.tabs [data-view=camp]');if(c&&c.getAttribute('aria-current')!=='page'&&!c.disabled){c.click();return true;}return false;})()",value->{
            if(!"true".equals(value))new AlertDialog.Builder(this).setTitle("暂别梁山？").setMessage("进度保存在本机。重要进度可在存档页导出备份。").setPositiveButton("退出",(d,w)->finish()).setNegativeButton("继续游戏",null).show();
        });
    }
    @Override protected void onPause(){
        if(web!=null){web.evaluateJavascript("window.dispatchEvent(new Event('baize-app-pause'))",null);web.onPause();}
        super.onPause();
    }
    @Override protected void onResume(){
        super.onResume();if(web!=null){web.onResume();web.evaluateJavascript("window.dispatchEvent(new Event('baize-app-resume'))",null);}
    }
    @Override protected void onDestroy(){if(chooser!=null)chooser.onReceiveValue(null);web.removeJavascriptInterface("BaizeAndroid");web.destroy();super.onDestroy();}
}

