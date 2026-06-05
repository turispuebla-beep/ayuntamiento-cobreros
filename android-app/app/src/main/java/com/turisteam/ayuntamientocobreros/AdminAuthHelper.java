package com.turisteam.ayuntamientocobreros;

import com.google.firebase.auth.FirebaseAuth;
import com.google.firebase.auth.FirebaseUser;
import com.google.firebase.firestore.FieldValue;
import com.google.firebase.firestore.FirebaseFirestore;
import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

public final class AdminAuthHelper {

    public static final List<String> ALLOWLISTED_ADMIN_EMAILS = Arrays.asList(
            "aytocobreros@gmail.com",
            "amco@gmx.es",
            "admin@cobreros.es"
    );

    public interface AdminCheckCallback {
        void onAdmin(String displayName);
        void onNotAdmin(String reason);
        void onError(String message);
    }

    public interface TokenCallback {
        void onToken(String token);
        void onError(String message);
    }

    private AdminAuthHelper() {}

    public static void ensureAllowlistedAdminDoc(FirebaseUser user, Runnable onDone) {
        if (user == null || user.getEmail() == null) {
            onDone.run();
            return;
        }
        String email = user.getEmail().toLowerCase();
        if (!ALLOWLISTED_ADMIN_EMAILS.contains(email)) {
            onDone.run();
            return;
        }
        boolean isSuper = "amco@gmx.es".equals(email);
        Map<String, Object> data = new HashMap<>();
        data.put("email", user.getEmail());
        data.put("isAdmin", true);
        data.put("isSuperAdmin", isSuper);
        data.put("role", isSuper ? "super_admin" : "admin");
        data.put("updatedAt", FieldValue.serverTimestamp());

        FirebaseFirestore.getInstance()
                .collection("admins")
                .document(user.getUid())
                .set(data, com.google.firebase.firestore.SetOptions.merge())
                .addOnCompleteListener(task -> onDone.run());
    }

    public static void verifyCurrentUserIsAdmin(AdminCheckCallback callback) {
        FirebaseUser user = FirebaseAuth.getInstance().getCurrentUser();
        if (user == null) {
            callback.onNotAdmin("Sin sesión");
            return;
        }
        FirebaseFirestore.getInstance()
                .collection("admins")
                .document(user.getUid())
                .get()
                .addOnSuccessListener(doc -> {
                    if (doc.exists() && Boolean.TRUE.equals(doc.getBoolean("isAdmin"))) {
                        String name = doc.getString("displayName");
                        if (name == null || name.isEmpty()) {
                            name = doc.getString("name");
                        }
                        if (name == null || name.isEmpty()) {
                            name = user.getEmail();
                        }
                        callback.onAdmin(name);
                    } else {
                        callback.onNotAdmin("Sin permisos de administrador en Firebase");
                    }
                })
                .addOnFailureListener(e ->
                        callback.onError(e.getMessage() != null ? e.getMessage() : "Error Firestore")
                );
    }

    public static void getIdToken(TokenCallback callback) {
        FirebaseUser user = FirebaseAuth.getInstance().getCurrentUser();
        if (user == null) {
            callback.onError("Sesión expirada");
            return;
        }
        user.getIdToken(true)
                .addOnSuccessListener(result -> {
                    if (result != null && result.getToken() != null) {
                        callback.onToken(result.getToken());
                    } else {
                        callback.onError("No se pudo obtener el token");
                    }
                })
                .addOnFailureListener(e ->
                        callback.onError(e.getMessage() != null ? e.getMessage() : "Error de autenticación")
                );
    }
}
