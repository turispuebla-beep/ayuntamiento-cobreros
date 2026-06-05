package com.turisteam.ayuntamientocobreros;

import org.json.JSONArray;
import org.json.JSONObject;
import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.List;

/**
 * Envía push masivo vía Cloud Function (misma ruta que la web/PWA).
 */
public final class PushNotificationClient {

    private static final String ENDPOINT =
            "https://us-central1-ayuntamiento-de-cobreros.cloudfunctions.net/sendPushNotification";

    public interface Callback {
        void onSuccess(int sent, int failed, int total);
        void onError(String message);
    }

    private PushNotificationClient() {}

    public static void send(
            String idToken,
            String title,
            String message,
            String type,
            List<String> localities,
            Callback callback
    ) {
        new Thread(() -> {
            HttpURLConnection conn = null;
            try {
                JSONObject body = new JSONObject();
                body.put("title", title);
                body.put("message", message);
                body.put("type", type != null ? type : "general");
                JSONArray locs = new JSONArray();
                if (localities != null) {
                    for (String locality : localities) {
                        if (locality != null && !locality.isEmpty()) {
                            locs.put(locality);
                        }
                    }
                }
                body.put("localities", locs);

                URL url = new URL(ENDPOINT);
                conn = (HttpURLConnection) url.openConnection();
                conn.setRequestMethod("POST");
                conn.setConnectTimeout(20000);
                conn.setReadTimeout(30000);
                conn.setDoOutput(true);
                conn.setRequestProperty("Content-Type", "application/json; charset=UTF-8");
                conn.setRequestProperty("Authorization", "Bearer " + idToken);

                byte[] bytes = body.toString().getBytes(StandardCharsets.UTF_8);
                try (OutputStream os = conn.getOutputStream()) {
                    os.write(bytes);
                }

                int code = conn.getResponseCode();
                BufferedReader reader = new BufferedReader(new InputStreamReader(
                        code >= 200 && code < 300 ? conn.getInputStream() : conn.getErrorStream(),
                        StandardCharsets.UTF_8
                ));
                StringBuilder sb = new StringBuilder();
                String line;
                while ((line = reader.readLine()) != null) {
                    sb.append(line);
                }
                reader.close();

                JSONObject resp = new JSONObject(sb.toString());
                if (code >= 200 && code < 300 && resp.optBoolean("success", false)) {
                    callback.onSuccess(
                            resp.optInt("sent", 0),
                            resp.optInt("failed", 0),
                            resp.optInt("total", 0)
                    );
                } else {
                    callback.onError(resp.optString("error", "Error HTTP " + code));
                }
            } catch (Exception e) {
                callback.onError(e.getMessage() != null ? e.getMessage() : "Error de red");
            } finally {
                if (conn != null) {
                    conn.disconnect();
                }
            }
        }).start();
    }
}
