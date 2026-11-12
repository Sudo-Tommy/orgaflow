package de.seniorenassistenz.orgaflow;

import android.os.Bundle;
import android.util.Log;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    private static final String TAG = "OrgaFlowMain";

    @Override
    public void onCreate(Bundle savedInstanceState) {
        final Thread.UncaughtExceptionHandler defaultHandler = Thread.getDefaultUncaughtExceptionHandler();
        Thread.setDefaultUncaughtExceptionHandler((thread, throwable) -> {
            Log.e(TAG, "Abgefangene Thread-Ausnahme in [" + thread.getName() + "]: ", throwable);
            if (throwable != null) {
                String msg = String.valueOf(throwable.getMessage());
                String cls = throwable.getClass().getName();
                if (msg.contains("Firebase") || msg.contains("google-services") || msg.contains("SplashScreen") || cls.contains("firebase")) {
                    Log.w(TAG, "Unkritischen Plugin-Fehler abgefangen. App läuft stabil weiter.");
                    return;
                }
            }
            if (defaultHandler != null) {
                defaultHandler.uncaughtException(thread, throwable);
            }
        });

        setTheme(R.style.AppTheme_NoActionBar);
        registerPlugin(AppSecurityPlugin.class);
        registerPlugin(ShareTargetPlugin.class);
        registerPlugin(MlKitScannerPlugin.class);
        registerPlugin(MlKitOcrPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
