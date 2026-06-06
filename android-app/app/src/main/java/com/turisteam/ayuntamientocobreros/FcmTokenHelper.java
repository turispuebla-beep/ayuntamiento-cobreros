package com.turisteam.ayuntamientocobreros;

import com.google.firebase.auth.FirebaseAuth;
import com.google.firebase.auth.FirebaseUser;
import com.google.firebase.firestore.FirebaseFirestore;
import com.google.firebase.firestore.SetOptions;
import com.google.firebase.messaging.FirebaseMessaging;
import java.util.HashMap;
import java.util.Map;

/** Sincroniza el token FCM del vecino en users/{uid}. */
public final class FcmTokenHelper {

    private FcmTokenHelper() {}

    public static void syncTokenIfLoggedIn() {
        FirebaseUser user = FirebaseAuth.getInstance().getCurrentUser();
        if (user == null) {
            return;
        }
        FirebaseMessaging.getInstance().getToken()
                .addOnCompleteListener(task -> {
                    if (!task.isSuccessful() || task.getResult() == null) {
                        return;
                    }
                    saveToken(user.getUid(), task.getResult());
                });
    }

    public static void saveTokenForCurrentUser(String token) {
        FirebaseUser user = FirebaseAuth.getInstance().getCurrentUser();
        if (user != null) {
            saveToken(user.getUid(), token);
        }
    }

    public static void saveToken(String uid, String token) {
        if (token == null || token.isEmpty()) {
            return;
        }
        Map<String, Object> data = new HashMap<>();
        data.put("fcmToken", token);
        data.put("notificationConsent", true);
        data.put("lastTokenUpdate", System.currentTimeMillis());
        data.put("tokenSource", "APK_VECINOS");
        FirebaseFirestore.getInstance()
                .collection("users")
                .document(uid)
                .set(data, SetOptions.merge());
    }
}
