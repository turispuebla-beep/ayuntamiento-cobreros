package com.turisteam.ayuntamientocobreros;

import android.content.Context;
import android.content.SharedPreferences;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

/** Contador de avisos sin leer (icono + número en notificación). */
public final class UnreadNotificationsHelper {

    private static final String PREFS = "cobreros_unread";
    private static final String KEY_READ_IDS = "read_broadcast_ids";
    private static final String KEY_BADGE_COUNT = "badge_count";

    private UnreadNotificationsHelper() {}

    private static SharedPreferences prefs(Context context) {
        return context.getApplicationContext().getSharedPreferences(PREFS, Context.MODE_PRIVATE);
    }

    public static Set<String> getReadBroadcastIds(Context context) {
        Set<String> stored = prefs(context).getStringSet(KEY_READ_IDS, null);
        return stored != null ? new HashSet<>(stored) : new HashSet<>();
    }

    public static void markBroadcastRead(Context context, String notificationId) {
        if (notificationId == null || notificationId.isEmpty()) {
            return;
        }
        Set<String> ids = getReadBroadcastIds(context);
        ids.add(notificationId);
        prefs(context).edit().putStringSet(KEY_READ_IDS, ids).apply();
    }

    public static void mergeReadBroadcastIds(Context context, Set<String> fromFirestore) {
        if (fromFirestore == null || fromFirestore.isEmpty()) {
            return;
        }
        Set<String> ids = getReadBroadcastIds(context);
        ids.addAll(fromFirestore);
        prefs(context).edit().putStringSet(KEY_READ_IDS, ids).apply();
    }

    public static void saveBadgeCount(Context context, int count) {
        prefs(context).edit().putInt(KEY_BADGE_COUNT, Math.max(0, count)).apply();
    }

    public static int getBadgeCount(Context context) {
        return Math.max(0, prefs(context).getInt(KEY_BADGE_COUNT, 0));
    }

    public static int incrementBadgeCount(Context context) {
        int next = getBadgeCount(context) + 1;
        saveBadgeCount(context, next);
        return next;
    }

    public static boolean isUnread(Map<String, Object> data, String notificationId, String uid,
                                   Set<String> readBroadcastIds) {
        if (data == null) {
            return false;
        }
        String docUserId = data.get("userId") != null ? String.valueOf(data.get("userId")) : "";
        if (uid != null && uid.equals(docUserId)) {
            Object read = data.get("read");
            return read == null || Boolean.FALSE.equals(read);
        }
        String id = notificationId != null ? notificationId : "";
        return id.isEmpty() || !readBroadcastIds.contains(id);
    }
}
