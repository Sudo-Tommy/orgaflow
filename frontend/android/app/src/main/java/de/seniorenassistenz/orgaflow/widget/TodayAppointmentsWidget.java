package de.seniorenassistenz.orgaflow.widget;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.net.Uri;
import android.view.View;
import android.widget.RemoteViews;
import de.seniorenassistenz.orgaflow.R;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;
import org.json.JSONArray;
import org.json.JSONObject;

public class TodayAppointmentsWidget extends AppWidgetProvider {
    private static final int[] ROW_IDS = {
        R.id.widget_row_1, R.id.widget_row_2, R.id.widget_row_3, R.id.widget_row_4
    };
    private static final int[] TIME_IDS = {
        R.id.widget_time_1, R.id.widget_time_2, R.id.widget_time_3, R.id.widget_time_4
    };
    private static final int[] NAME_IDS = {
        R.id.widget_name_1, R.id.widget_name_2, R.id.widget_name_3, R.id.widget_name_4
    };

    @Override
    public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        for (int widgetId : appWidgetIds) {
            updateWidget(context, appWidgetManager, widgetId);
        }
    }

    public static void updateWidget(Context context, AppWidgetManager manager, int widgetId) {
        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_today);
        String todayStr = new SimpleDateFormat("EE, dd.MM.", Locale.GERMAN).format(new Date());
        views.setTextViewText(R.id.widget_date, todayStr);

        SharedPreferences prefs = context.getSharedPreferences("CapacitorStorage", Context.MODE_PRIVATE);
        String raw = prefs.getString("widget_today", "[]");

        int shown = 0;
        try {
            JSONArray arr = new JSONArray(raw);
            for (int i = 0; i < 4; i++) {
                if (i < arr.length()) {
                    JSONObject item = arr.getJSONObject(i);
                    views.setViewVisibility(ROW_IDS[i], View.VISIBLE);
                    views.setTextViewText(TIME_IDS[i], item.optString("time", "--:--"));
                    views.setTextViewText(NAME_IDS[i], item.optString("client", "Termin"));
                    shown++;
                } else {
                    views.setViewVisibility(ROW_IDS[i], View.GONE);
                }
            }
        } catch (Exception ignored) {
            for (int rowId : ROW_IDS) views.setViewVisibility(rowId, View.GONE);
        }

        views.setViewVisibility(R.id.widget_empty, shown == 0 ? View.VISIBLE : View.GONE);

        Intent openIntent = new Intent(Intent.ACTION_VIEW, Uri.parse("orgaflow://termine/heute"));
        openIntent.setPackage(context.getPackageName());
        PendingIntent pi = PendingIntent.getActivity(
            context, widgetId, openIntent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
        views.setOnClickPendingIntent(R.id.widget_root, pi);
        manager.updateAppWidget(widgetId, views);
    }
}
