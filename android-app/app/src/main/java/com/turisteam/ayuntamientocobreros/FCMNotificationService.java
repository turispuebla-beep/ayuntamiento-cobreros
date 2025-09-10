package com.turisteam.ayuntamientocobreros;

import android.util.Log;
import com.google.firebase.firestore.FirebaseFirestore;
import com.google.firebase.firestore.QueryDocumentSnapshot;
import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.CompletableFuture;

public class FCMNotificationService {
    
    private static final String TAG = "FCMNotificationService";
    private static final String FCM_SERVER_KEY = "TU_SERVER_KEY_AQUI"; // Reemplazar con la clave real
    
    private FirebaseFirestore db;
    
    public FCMNotificationService() {
        db = FirebaseFirestore.getInstance();
    }
    
    public void sendNotificationToUsers(String title, String message, String type, 
                                      String scope, java.util.List<String> localities) {
        // Construir consulta de usuarios
        db.collection("users")
            .whereEqualTo("notificationConsent", true)
            .get()
            .addOnCompleteListener(task -> {
                if (task.isSuccessful()) {
                    java.util.List<QueryDocumentSnapshot> users = new java.util.ArrayList<>();
                    
                    // Filtrar por localidades si es necesario
                    if ("Localidades específicas".equals(scope)) {
                        for (QueryDocumentSnapshot document : task.getResult()) {
                            java.util.List<String> userLocalities = (java.util.List<String>) document.getData().get("localities");
                            if (userLocalities != null && !userLocalities.isEmpty()) {
                                for (String locality : localities) {
                                    if (userLocalities.contains(locality)) {
                                        users.add(document);
                                        break;
                                    }
                                }
                            }
                        }
                    } else {
                        users.addAll(task.getResult().getDocuments());
                    }
                    
                    // Enviar notificación a cada usuario
                    for (QueryDocumentSnapshot userDoc : users) {
                        String fcmToken = userDoc.getString("fcmToken");
                        if (fcmToken != null && !fcmToken.isEmpty()) {
                            sendFCMNotification(fcmToken, title, message, type, localities);
                        }
                    }
                    
                    // Guardar notificación en Firestore
                    saveNotificationToFirestore(title, message, type, localities, users.size());
                    
                } else {
                    Log.e(TAG, "Error obteniendo usuarios: " + task.getException().getMessage());
                }
            });
    }
    
    private void sendFCMNotification(String fcmToken, String title, String message, 
                                   String type, java.util.List<String> localities) {
        try {
            // Crear payload de la notificación
            Map<String, Object> notification = new HashMap<>();
            notification.put("title", title);
            notification.put("body", message);
            notification.put("icon", "ic_escudo_cobreros");
            notification.put("badge", "ic_escudo_cobreros");
            
            Map<String, Object> data = new HashMap<>();
            data.put("type", type);
            data.put("localities", String.join(", ", localities));
            data.put("sent_from", "APK");
            data.put("sent_to", "APK");
            data.put("timestamp", System.currentTimeMillis());
            
            Map<String, Object> payload = new HashMap<>();
            payload.put("to", fcmToken);
            payload.put("notification", notification);
            payload.put("data", data);
            
            // Enviar notificación FCM
            sendFCMRequest(payload);
            
        } catch (Exception e) {
            Log.e(TAG, "Error enviando notificación FCM: " + e.getMessage());
        }
    }
    
    private void sendFCMRequest(Map<String, Object> payload) {
        // Aquí se implementaría el envío real a FCM
        // Por ahora simulamos el envío
        Log.d(TAG, "Enviando FCM: " + payload.toString());
        
        // En una implementación real, se haría una petición HTTP a:
        // https://fcm.googleapis.com/fcm/send
        // Con el header: Authorization: key=TU_SERVER_KEY_AQUI
    }
    
    private void saveNotificationToFirestore(String title, String message, String type, 
                                           java.util.List<String> localities, int usuariosEnviados) {
        Map<String, Object> notificationData = new HashMap<>();
        notificationData.put("title", title);
        notificationData.put("message", message);
        notificationData.put("type", type);
        notificationData.put("localities", localities);
        notificationData.put("usuariosEnviados", usuariosEnviados);
        notificationData.put("timestamp", System.currentTimeMillis());
        notificationData.put("sentFrom", "APK");
        notificationData.put("sentTo", "APK");
        
        db.collection("notifications")
            .add(notificationData)
            .addOnSuccessListener(documentReference -> {
                Log.d(TAG, "Notificación guardada en Firestore: " + documentReference.getId());
            })
            .addOnFailureListener(e -> {
                Log.e(TAG, "Error guardando notificación: " + e.getMessage());
            });
    }
}
