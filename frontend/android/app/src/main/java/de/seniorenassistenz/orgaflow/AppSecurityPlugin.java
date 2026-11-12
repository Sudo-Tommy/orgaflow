package de.seniorenassistenz.orgaflow;

import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.os.PowerManager;
import android.provider.Settings;
import android.view.WindowManager;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "AppSecurity")
public class AppSecurityPlugin extends Plugin {
    @PluginMethod
    public void setScreenProtection(PluginCall call) {
        boolean enabled = Boolean.TRUE.equals(call.getBoolean("enabled", false));
        if (getActivity() == null) {
            call.resolve();
            return;
        }
        getActivity().runOnUiThread(() -> {
            if (enabled) {
                getActivity().getWindow().addFlags(WindowManager.LayoutParams.FLAG_SECURE);
            } else {
                getActivity().getWindow().clearFlags(WindowManager.LayoutParams.FLAG_SECURE);
            }
            call.resolve();
        });
    }

    @PluginMethod
    public void isIgnoringBatteryOptimizations(PluginCall call) {
        JSObject res = new JSObject();
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            PowerManager pm = (PowerManager) getContext().getSystemService(Context.POWER_SERVICE);
            res.put("ignoring", pm != null && pm.isIgnoringBatteryOptimizations(getContext().getPackageName()));
        } else {
            res.put("ignoring", true);
        }
        call.resolve(res);
    }

    @PluginMethod
    public void requestBatteryOptimizationExemption(PluginCall call) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M && getActivity() != null) {
            try {
                Intent intent = new Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS);
                intent.setData(Uri.parse("package:" + getContext().getPackageName()));
                getActivity().startActivity(intent);
                call.resolve();
                return;
            } catch (Exception ignored) {
                try {
                    Intent fallback = new Intent(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS);
                    getActivity().startActivity(fallback);
                } catch (Exception ignored2) {}
            }
        }
        call.resolve();
    }
}
