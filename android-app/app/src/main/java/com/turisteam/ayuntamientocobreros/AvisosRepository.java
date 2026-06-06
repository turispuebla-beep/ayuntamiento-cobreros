package com.turisteam.ayuntamientocobreros;

import com.google.firebase.firestore.FieldValue;
import com.google.firebase.firestore.FirebaseFirestore;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Date;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

/**
 * Historial en notifications y banner público en configuraciones/data (web/PWA).
 */
public final class AvisosRepository {

    public interface SimpleCallback {
        void onSuccess();
        void onError(String message);
    }

    private AvisosRepository() {}

    public static void saveNotificationHistory(
            String title,
            String message,
            String pushType,
            List<String> localities,
            String sentFrom,
            int sentCount,
            SimpleCallback callback
    ) {
        Map<String, Object> data = new HashMap<>();
        data.put("title", title);
        data.put("message", message);
        data.put("type", pushType);
        data.put("localities", localities != null ? localities : new ArrayList<>());
        data.put("targetPueblos", localities != null ? localities : new ArrayList<>());
        data.put("timestamp", FieldValue.serverTimestamp());
        data.put("read", false);
        data.put("sentFrom", sentFrom);
        data.put("sentTo", "ALL");
        data.put("sentCount", sentCount);
        data.put("source", "APK_AVISOS");

        FirebaseFirestore.getInstance()
                .collection("notifications")
                .add(data)
                .addOnSuccessListener(ref -> callback.onSuccess())
                .addOnFailureListener(e ->
                        callback.onError(e.getMessage() != null ? e.getMessage() : "Error guardando historial")
                );
    }

    public static void appendPublicBanner(
            String bannerType,
            String title,
            String message,
            String priority,
            SimpleCallback callback
    ) {
        FirebaseFirestore db = FirebaseFirestore.getInstance();
        db.collection("configuraciones").document("data")
                .get()
                .addOnSuccessListener(doc -> {
                    List<Map<String, Object>> list = new ArrayList<>();
                    if (doc.exists()) {
                        Object raw = doc.get("publicNotifications");
                        list = parsePublicNotifications(raw);
                    }

                    String today = new SimpleDateFormat("yyyy-MM-dd", Locale.getDefault()).format(new Date());
                    Map<String, Object> item = new HashMap<>();
                    item.put("id", String.valueOf(System.currentTimeMillis()));
                    item.put("type", bannerType);
                    item.put("title", title);
                    item.put("message", message);
                    item.put("startDate", today);
                    item.put("endDate", null);
                    item.put("priority", priority != null ? priority : "high");
                    item.put("active", true);
                    String nowIso = new SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US).format(new Date());
                    item.put("createdAt", nowIso);
                    item.put("updatedAt", nowIso);
                    item.put("source", "APK_AVISOS");
                    list.add(0, item);

                    Map<String, Object> patch = new HashMap<>();
                    patch.put("publicNotifications", list);
                    patch.put("lastUpdate", FieldValue.serverTimestamp());
                    patch.put("source", "APK_AVISOS");

                    db.collection("configuraciones").document("data")
                            .set(patch, com.google.firebase.firestore.SetOptions.merge())
                            .addOnSuccessListener(unused -> callback.onSuccess())
                            .addOnFailureListener(e ->
                                    callback.onError(e.getMessage() != null ? e.getMessage() : "Error banner")
                            );
                })
                .addOnFailureListener(e ->
                        callback.onError(e.getMessage() != null ? e.getMessage() : "Error leyendo configuración")
                );
    }

    @SuppressWarnings("unchecked")
    private static List<Map<String, Object>> parsePublicNotifications(Object raw) {
        List<Map<String, Object>> list = new ArrayList<>();
        if (raw instanceof List) {
            for (Object o : (List<?>) raw) {
                if (o instanceof Map) {
                    list.add(new HashMap<>((Map<String, Object>) o));
                }
            }
        }
        return list;
    }
}
