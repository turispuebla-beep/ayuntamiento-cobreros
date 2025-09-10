package com.turisteam.ayuntamientocobreros;

import android.app.Service;
import android.content.Intent;
import android.os.IBinder;
import android.util.Log;
import androidx.annotation.Nullable;
import com.google.firebase.auth.FirebaseAuth;
import com.google.firebase.auth.FirebaseUser;
import com.google.firebase.firestore.DocumentSnapshot;
import com.google.firebase.firestore.FirebaseFirestore;
import com.google.firebase.firestore.ListenerRegistration;
import com.google.firebase.messaging.FirebaseMessaging;
import java.util.HashMap;
import java.util.Map;

public class SyncService extends Service {
    
    private static final String TAG = "SyncService";
    private FirebaseFirestore db;
    private FirebaseAuth mAuth;
    private ListenerRegistration userListener;
    private ListenerRegistration notificationsListener;
    
    @Override
    public void onCreate() {
        super.onCreate();
        db = FirebaseFirestore.getInstance();
        mAuth = FirebaseAuth.getInstance();
    }
    
    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        startSync();
        return START_STICKY;
    }
    
    private void startSync() {
        FirebaseUser currentUser = mAuth.getCurrentUser();
        if (currentUser != null) {
            // Sincronizar datos del usuario
            syncUserData(currentUser.getUid());
            
            // Sincronizar notificaciones
            syncNotifications(currentUser.getUid());
            
            // Actualizar token FCM
            updateFCMToken();
        }
    }
    
    private void syncUserData(String userId) {
        userListener = db.collection("users").document(userId)
            .addSnapshotListener((documentSnapshot, e) -> {
                if (e != null) {
                    Log.w(TAG, "Error escuchando cambios de usuario", e);
                    return;
                }
                
                if (documentSnapshot != null && documentSnapshot.exists()) {
                    // Usuario actualizado en la web, sincronizar con la APK
                    syncUserToLocal(documentSnapshot);
                }
            });
    }
    
    private void syncUserToLocal(DocumentSnapshot document) {
        try {
            Map<String, Object> userData = document.getData();
            if (userData != null) {
                // Guardar datos localmente
                getSharedPreferences("ayuntamiento_prefs", MODE_PRIVATE)
                    .edit()
                    .putString("user_nombre", (String) userData.get("nombre"))
                    .putString("user_apellidos", (String) userData.get("apellidos"))
                    .putString("user_email", (String) userData.get("email"))
                    .putString("user_telefono", (String) userData.get("telefono"))
                    .putBoolean("user_notification_consent", (Boolean) userData.getOrDefault("notificationConsent", false))
                    .putString("user_localities", String.join(",", (java.util.List<String>) userData.getOrDefault("localities", new java.util.ArrayList<>())))
                    .apply();
                
                Log.d(TAG, "Usuario sincronizado desde la web");
            }
        } catch (Exception e) {
            Log.e(TAG, "Error sincronizando usuario", e);
        }
    }
    
    private void syncNotifications(String userId) {
        notificationsListener = db.collection("notifications")
            .whereEqualTo("userId", userId)
            .addSnapshotListener((querySnapshot, e) -> {
                if (e != null) {
                    Log.w(TAG, "Error escuchando notificaciones", e);
                    return;
                }
                
                if (querySnapshot != null) {
                    for (DocumentSnapshot document : querySnapshot.getDocuments()) {
                        // Procesar notificación recibida
                        processNotification(document);
                    }
                }
            });
    }
    
    private void processNotification(DocumentSnapshot document) {
        try {
            Map<String, Object> notificationData = document.getData();
            if (notificationData != null) {
                String title = (String) notificationData.get("title");
                String message = (String) notificationData.get("message");
                String type = (String) notificationData.get("type");
                String localities = (String) notificationData.get("localities");
                boolean hasAttachments = (Boolean) notificationData.getOrDefault("hasAttachments", false);
                String attachmentUrl = (String) notificationData.get("attachmentUrl");
                String attachmentType = (String) notificationData.get("attachmentType");
                
                // Crear notificación local
                createLocalNotification(title, message, type, localities, hasAttachments, attachmentUrl, attachmentType);
                
                // Marcar como leída
                document.getReference().update("read", true);
            }
        } catch (Exception e) {
            Log.e(TAG, "Error procesando notificación", e);
        }
    }
    
    private void createLocalNotification(String title, String message, String type, 
                                      String localities, boolean hasAttachments, 
                                      String attachmentUrl, String attachmentType) {
        // Crear intent para la notificación
        Intent notificationIntent = new Intent(this, NotificationDetailActivity.class);
        notificationIntent.putExtra("notification_title", title);
        notificationIntent.putExtra("notification_message", message);
        notificationIntent.putExtra("notification_type", type);
        notificationIntent.putExtra("notification_localities", localities);
        notificationIntent.putExtra("has_attachments", hasAttachments);
        notificationIntent.putExtra("attachment_url", attachmentUrl);
        notificationIntent.putExtra("attachment_type", attachmentType);
        
        // Aquí se podría crear una notificación local si es necesario
        Log.d(TAG, "Notificación local creada: " + title);
    }
    
    private void updateFCMToken() {
        FirebaseMessaging.getInstance().getToken()
            .addOnCompleteListener(task -> {
                if (!task.isSuccessful()) {
                    Log.w(TAG, "Error obteniendo token FCM", task.getException());
                    return;
                }
                
                String token = task.getResult();
                FirebaseUser currentUser = mAuth.getCurrentUser();
                if (currentUser != null && token != null) {
                    // Actualizar token en Firestore
                    Map<String, Object> updateData = new HashMap<>();
                    updateData.put("fcmToken", token);
                    updateData.put("lastTokenUpdate", System.currentTimeMillis());
                    
                    db.collection("users").document(currentUser.getUid())
                        .update(updateData)
                        .addOnSuccessListener(aVoid -> Log.d(TAG, "Token FCM actualizado"))
                        .addOnFailureListener(e -> Log.e(TAG, "Error actualizando token FCM", e));
                }
            });
    }
    
    @Override
    public void onDestroy() {
        super.onDestroy();
        if (userListener != null) {
            userListener.remove();
        }
        if (notificationsListener != null) {
            notificationsListener.remove();
        }
    }
    
    @Nullable
    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }
}
