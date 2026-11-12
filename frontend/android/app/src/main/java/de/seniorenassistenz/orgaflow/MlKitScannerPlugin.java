package de.seniorenassistenz.orgaflow;

import android.app.Activity;
import android.content.Intent;
import android.net.Uri;
import androidx.activity.result.ActivityResultLauncher;
import androidx.activity.result.IntentSenderRequest;
import androidx.activity.result.contract.ActivityResultContracts;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.google.mlkit.vision.documentscanner.GmsDocumentScanner;
import com.google.mlkit.vision.documentscanner.GmsDocumentScannerOptions;
import com.google.mlkit.vision.documentscanner.GmsDocumentScanning;
import com.google.mlkit.vision.documentscanner.GmsDocumentScanningResult;
import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;

@CapacitorPlugin(name = "MlKitScanner")
public class MlKitScannerPlugin extends Plugin {
    private ActivityResultLauncher<IntentSenderRequest> scannerLauncher;
    private PluginCall pendingCall;

    @Override
    public void load() {
        scannerLauncher = getActivity().registerForActivityResult(
            new ActivityResultContracts.StartIntentSenderForResult(),
            result -> handleScanResult(result.getResultCode(), result.getData())
        );
    }

    @PluginMethod
    public void scanDocument(PluginCall call) {
        if (getActivity() == null) {
            call.reject("Aktivität nicht verfügbar");
            return;
        }
        int pageLimit = call.getInt("pageLimit", 10);
        boolean allowGallery = Boolean.TRUE.equals(call.getBoolean("allowGallery", true));

        GmsDocumentScannerOptions options = new GmsDocumentScannerOptions.Builder()
            .setGalleryImportAllowed(allowGallery)
            .setPageLimit(Math.max(1, Math.min(30, pageLimit)))
            .setResultFormats(
                GmsDocumentScannerOptions.RESULT_FORMAT_JPEG,
                GmsDocumentScannerOptions.RESULT_FORMAT_PDF
            )
            .setScannerMode(GmsDocumentScannerOptions.SCANNER_MODE_FULL)
            .build();

        pendingCall = call;
        GmsDocumentScanner scanner = GmsDocumentScanning.getClient(options);
        scanner.getStartScanIntent(getActivity())
            .addOnSuccessListener(intentSender -> {
                try {
                    scannerLauncher.launch(new IntentSenderRequest.Builder(intentSender).build());
                } catch (Exception e) {
                    finishError("Scanner konnte nicht gestartet werden: " + e.getMessage());
                }
            })
            .addOnFailureListener(e -> finishError("ML Kit Scanner nicht bereit: " + e.getMessage()));
    }

    private void handleScanResult(int resultCode, Intent data) {
        PluginCall call = pendingCall;
        pendingCall = null;
        if (call == null) return;

        if (resultCode != Activity.RESULT_OK || data == null) {
            JSObject cancelled = new JSObject();
            cancelled.put("cancelled", true);
            call.resolve(cancelled);
            return;
        }

        GmsDocumentScanningResult scanResult = GmsDocumentScanningResult.fromActivityResultIntent(data);
        if (scanResult == null) {
            call.reject("Kein Scan-Ergebnis erhalten.");
            return;
        }

        JSObject out = new JSObject();
        out.put("cancelled", false);
        JSArray pagesArr = new JSArray();
        if (scanResult.getPages() != null) {
            int i = 1;
            for (GmsDocumentScanningResult.Page page : scanResult.getPages()) {
                String path = copyToCache(page.getImageUri(), "scan_page_" + System.currentTimeMillis() + "_" + i + ".jpg");
                if (path != null) {
                    JSObject pObj = new JSObject();
                    pObj.put("cachePath", path);
                    pObj.put("mimeType", "image/jpeg");
                    pagesArr.put(pObj);
                }
                i++;
            }
        }
        out.put("pages", pagesArr);

        if (scanResult.getPdf() != null) {
            String pdfPath = copyToCache(scanResult.getPdf().getUri(), "scan_doc_" + System.currentTimeMillis() + ".pdf");
            if (pdfPath != null) {
                out.put("pdfCachePath", pdfPath);
                out.put("pageCount", scanResult.getPdf().getPageCount());
            }
        }
        call.resolve(out);
    }

    private String copyToCache(Uri uri, String filename) {
        try {
            File dir = new File(getContext().getCacheDir(), "mlkit_scans");
            if (!dir.exists()) dir.mkdirs();
            File target = new File(dir, filename);
            try (InputStream in = getContext().getContentResolver().openInputStream(uri);
                 FileOutputStream out = new FileOutputStream(target)) {
                if (in == null) return null;
                byte[] buf = new byte[8192];
                int len;
                while ((len = in.read(buf)) > 0) out.write(buf, 0, len);
            }
            return "mlkit_scans/" + filename;
        } catch (Exception e) {
            return null;
        }
    }

    private void finishError(String msg) {
        if (pendingCall != null) {
            pendingCall.reject(msg);
            pendingCall = null;
        }
    }
}
