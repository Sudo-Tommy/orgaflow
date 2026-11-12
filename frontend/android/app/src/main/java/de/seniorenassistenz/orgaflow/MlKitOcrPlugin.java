package de.seniorenassistenz.orgaflow;

import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.net.Uri;
import android.util.Base64;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.google.mlkit.vision.common.InputImage;
import com.google.mlkit.vision.text.Text;
import com.google.mlkit.vision.text.TextRecognition;
import com.google.mlkit.vision.text.TextRecognizer;
import com.google.mlkit.vision.text.latin.TextRecognizerOptions;
import java.io.File;

@CapacitorPlugin(name = "MlKitOcr")
public class MlKitOcrPlugin extends Plugin {
    @PluginMethod
    public void recognizeText(PluginCall call) {
        String cachePath = call.getString("cachePath");
        String dataUrl = call.getString("dataUrl");

        try {
            InputImage image;
            if (cachePath != null && !cachePath.isEmpty()) {
                File file = new File(getContext().getCacheDir(), cachePath);
                image = InputImage.fromFilePath(getContext(), Uri.fromFile(file));
            } else if (dataUrl != null && !dataUrl.isEmpty()) {
                String pure = dataUrl.contains(",") ? dataUrl.substring(dataUrl.indexOf(',') + 1) : dataUrl;
                byte[] decoded = Base64.decode(pure, Base64.DEFAULT);
                Bitmap bmp = BitmapFactory.decodeByteArray(decoded, 0, decoded.length);
                if (bmp == null) {
                    call.reject("Bild konnte nicht dekodiert werden");
                    return;
                }
                image = InputImage.fromBitmap(bmp, 0);
            } else {
                call.reject("Kein Bild übergeben");
                return;
            }

            TextRecognizer recognizer = TextRecognition.getClient(TextRecognizerOptions.DEFAULT_OPTIONS);
            recognizer.process(image)
                .addOnSuccessListener(visionText -> {
                    JSObject res = new JSObject();
                    res.put("text", visionText.getText());
                    JSArray blocks = new JSArray();
                    for (Text.TextBlock b : visionText.getTextBlocks()) {
                        JSObject blockObj = new JSObject();
                        blockObj.put("text", b.getText());
                        JSArray linesArr = new JSArray();
                        for (Text.Line line : b.getLines()) {
                            linesArr.put(line.getText());
                        }
                        blockObj.put("lines", linesArr);
                        blocks.put(blockObj);
                    }
                    res.put("blocks", blocks);
                    call.resolve(res);
                })
                .addOnFailureListener(e -> call.reject("Texterkennung fehlgeschlagen: " + e.getMessage()));
        } catch (Exception e) {
            call.reject("OCR-Fehler: " + e.getMessage());
        }
    }
}
