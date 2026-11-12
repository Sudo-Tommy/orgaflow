package de.seniorenassistenz.orgaflow;

import android.appwidget.AppWidgetManager;
import android.content.ComponentName;
import android.content.Intent;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import de.seniorenassistenz.orgaflow.widget.TodayAppointmentsWidget;

@CapacitorPlugin(name = "WidgetBridge")
public class WidgetBridgePlugin extends Plugin {
    @PluginMethod
    public void refreshWidget(PluginCall call) {
        try {
            AppWidgetManager manager = AppWidgetManager.getInstance(getContext());
            ComponentName provider = new ComponentName(getContext(), TodayAppointmentsWidget.class);
            int[] ids = manager.getAppWidgetIds(provider);
            if (ids != null && ids.length > 0) {
                Intent intent = new Intent(getContext(), TodayAppointmentsWidget.class);
                intent.setAction(AppWidgetManager.ACTION_APPWIDGET_UPDATE);
                intent.putExtra(AppWidgetManager.EXTRA_APPWIDGET_IDS, ids);
                getContext().sendBroadcast(intent);
            }
            call.resolve();
        } catch (Exception e) {
            call.resolve();
        }
    }
}
