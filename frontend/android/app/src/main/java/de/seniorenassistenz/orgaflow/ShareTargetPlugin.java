package de.seniorenassistenz.orgaflow;

import android.content.Intent;
import android.database.Cursor;
import android.net.Uri;
import android.provider.OpenableColumns;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.util.ArrayList;
import java.util.List;

@CapacitorPlugin(name = "ShareTarget")
public class ShareTargetPlugin extends Plugin {
    private static final List<JSObject> pendingShares = new ArrayList<>();

    @Override
    public void load() {
        Intent intent = getActivity() != null ? getActivity().getIntent() : null;
        if (intent != null) handleIntent(intent);
    }

    @Override
    protected void handleOnNewIntent(Intent intent) {
        super.handleOnNewIntent(intent);
        if (intent != null) handleIntent(intent);
    }

    private void handleIntent(Intent intent) {
        String action = intent.getAction();
        if (action == null) return;
        List<Uri> uris = new ArrayList<>();
        if (Intent.ACTION_SEND.equals(action)) {
            Uri uri = intent.getParcelableExtra(Intent.EXTRA_STREAM);
            if (uri != null) uris.add(uri);
        } else if (Intent.ACTION_SEND_MULTIPLE.equals(action)) {
            ArrayList<Uri> list = intent.getParcelableArrayListExtra(Intent.EXTRA_STREAM);
            if (list != null) uris.addAll(list);
        }
        if (uris.isEmpty()) return;

        JSArray copied = new JSArray();
        for (Uri uri : uris) {
            JSObject entry = copyUriToCache(uri, intent.getType());
            if (entry != null) {
                synchronized (pendingShares) { pendingShares.add(entry); }
                copied.put(entry);
            }
        }
        intent.setAction(null);
        if (copied.length() > 0) {
            JSObject payload = new JSObject();
            payload.put("files", copied);
            notifyListeners("sharedFilesReceived", payload, true);
        }
    }

    private JSObject copyUriToCache(Uri uri, String fallbackMime) {
        try {
            String mime = getContext().getContentResolver().getType(uri);
            if (mime == null) mime = fallbackMime != null ? fallbackMime : "application/octet-stream";
            String name = resolveFileName(uri, mime);
            File dir = new File(getContext().getCacheDir(), "shared_imports");
            if (!dir.exists()) dir.mkdirs();
            File target = new File(dir, System.currentTimeMillis() + "_" + name.replaceAll("[^a-zA-Z0-9._-]", "_"));

            try (InputStream in = getContext().getContentResolver().openInputStream(uri);
                 FileOutputStream out = new FileOutputStream(target)) {
                if (in == null) return null;
                byte[] buf = new byte[8192];
                int len;
                while ((len = in.read(buf)) > 0) out.write(buf, 0, len);
            }
            JSObject obj = new JSObject();
            obj.put("name", name);
            obj.put("mimeType", mime);
            obj.put("cachePath", "shared_imports/" + target.getName());
            obj.put("size", target.length());
            return obj;
        } catch (Exception e) {
            return null;
        }
    }

    private String resolveFileName(Uri uri, String mime) {
        String name = null;
        try (Cursor c = getContext().getContentResolver().query(uri, null, null, null, null)) {
            if (c != null && c.moveToFirst()) {
                int idx = c.getColumnIndex(OpenableColumns.DISPLAY_NAME);
                if (idx >= 0) name = c.getString(idx);
            }
        } catch (Exception ignored) {}
        if (name == null || name.isEmpty()) {
            String ext = mime.contains("pdf") ? ".pdf" : mime.contains("png") ? ".png" : ".jpg";
            name = "Dokument_" + System.currentTimeMillis() + ext;
        }
        return name;
    }

    @PluginMethod
    public void getPendingShares(PluginCall call) {
        JSArray arr = new JSArray();
        synchronized (pendingShares) {
            for (JSObject item : pendingShares) arr.put(item);
        }
        JSObject res = new JSObject();
        res.put("files", arr);
        call.resolve(res);
    }

    @PluginMethod
    public void clearPendingShares(PluginCall call) {
        synchronized (pendingShares) { pendingShares.clear(); }
        call.resolve();
    }
}
