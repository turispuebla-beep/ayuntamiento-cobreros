package com.turisteam.ayuntamientocobreros;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Intent;
import android.os.Build;
import androidx.core.app.NotificationCompat;
import com.google.firebase.messaging.FirebaseMessagingService;
import com.google.firebase.messaging.RemoteMessage;

public class MyFirebaseMessagingService extends FirebaseMessagingService {
    
    private static final String CHANNEL_ID = "ayuntamiento_cobreros_channel";
    
    @Override
    public void onMessageReceived(RemoteMessage remoteMessage) {
        super.onMessageReceived(remoteMessage);
        
        // Verificar si el mensaje contiene datos
        if (remoteMessage.getData().size() > 0) {
            // Procesar datos del mensaje
            String title = remoteMessage.getData().get("title");
            String message = remoteMessage.getData().get("message");
            String type = remoteMessage.getData().get("type");
            String localities = remoteMessage.getData().get("localities");
            String hasAttachments = remoteMessage.getData().get("has_attachments");
            String attachmentUrl = remoteMessage.getData().get("attachment_url");
            String attachmentType = remoteMessage.getData().get("attachment_type");
            
            // Mostrar notificación
            showNotification(title, message, type, localities, hasAttachments, attachmentUrl, attachmentType);
        }
        
        // Verificar si el mensaje contiene notificación
        if (remoteMessage.getNotification() != null) {
            String title = remoteMessage.getNotification().getTitle();
            String body = remoteMessage.getNotification().getBody();
            
            showNotification(title, body, "general", "", null, null, null);
        }
    }
    
    private void showNotification(String title, String message, String type, String localities) {
        showNotification(title, message, type, localities, null, null, null);
    }
    
    private void showNotification(String title, String message, String type, String localities, 
                                 String hasAttachments, String attachmentUrl, String attachmentType) {
        // Crear canal de notificación
        createNotificationChannel();
        
        // Crear intent para abrir la aplicación
        Intent intent = new Intent(this, MainActivity.class);
        intent.putExtra("notification_type", type);
        intent.putExtra("notification_localities", localities);
        intent.putExtra("notification_title", title);
        intent.putExtra("notification_message", message);
        intent.putExtra("has_attachments", hasAttachments);
        intent.putExtra("attachment_url", attachmentUrl);
        intent.putExtra("attachment_type", attachmentType);
        intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TASK);
        
        PendingIntent pendingIntent = PendingIntent.getActivity(
            this, 0, intent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
        
        // Crear notificación con diseño personalizado
        NotificationCompat.Builder builder = new NotificationCompat.Builder(getApplicationContext(), CHANNEL_ID)
            .setSmallIcon(R.drawable.ic_escudo_cobreros) // Escudo de Cobreros como icono pequeño
            .setLargeIcon(getEscudoBitmap()) // Escudo grande en la notificación
            .setContentTitle(title != null ? title : "🏛️ Ayuntamiento de Cobreros")
            .setContentText(message != null ? message : "Nueva notificación")
            .setStyle(new NotificationCompat.BigTextStyle()
                .bigText(message != null ? message : "Nueva notificación del Ayuntamiento de Cobreros")
                .setBigContentTitle(title != null ? title : "🏛️ Ayuntamiento de Cobreros"))
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setAutoCancel(true)
            .setContentIntent(pendingIntent)
            .setColor(getResources().getColor(R.color.ayuntamiento_blue)) // Color del ayuntamiento
            .setDefaults(NotificationCompat.DEFAULT_SOUND | NotificationCompat.DEFAULT_VIBRATE);
        
        // Configurar prioridad y estilo según el tipo
        switch (type) {
            case "emergencia":
                builder.setPriority(NotificationCompat.PRIORITY_MAX)
                       .setDefaults(NotificationCompat.DEFAULT_ALL)
                       .setColor(getResources().getColor(R.color.emergency_red))
                       .setContentTitle("🚨 EMERGENCIA - " + (title != null ? title : "Ayuntamiento de Cobreros"));
                break;
            case "cita":
                builder.setPriority(NotificationCompat.PRIORITY_HIGH)
                       .setColor(getResources().getColor(R.color.appointment_green))
                       .setContentTitle("📅 Cita - " + (title != null ? title : "Ayuntamiento de Cobreros"));
                break;
            case "evento":
                builder.setPriority(NotificationCompat.PRIORITY_HIGH)
                       .setColor(getResources().getColor(R.color.event_orange))
                       .setContentTitle("🎉 Evento - " + (title != null ? title : "Ayuntamiento de Cobreros"));
                break;
            case "bando":
                builder.setPriority(NotificationCompat.PRIORITY_HIGH)
                       .setColor(getResources().getColor(R.color.bando_purple))
                       .setContentTitle("📢 Bando - " + (title != null ? title : "Ayuntamiento de Cobreros"));
                break;
            default:
                builder.setPriority(NotificationCompat.PRIORITY_DEFAULT)
                       .setContentTitle("🏛️ " + (title != null ? title : "Ayuntamiento de Cobreros"));
                break;
        }
        
        // Agregar información de localidades si está disponible
        if (localities != null && !localities.isEmpty()) {
            builder.setSubText("📍 " + localities);
        }
        
        // Agregar indicador de adjuntos si los hay
        if ("true".equals(hasAttachments) && attachmentUrl != null && !attachmentUrl.isEmpty()) {
            String attachmentIcon = "document".equals(attachmentType) ? "📄" : "📸";
            builder.setSubText("📍 " + localities + " | " + attachmentIcon + " Adjunto disponible");
        }
        
        // Configurar señal acuática (sonido personalizado)
        builder.setSound(android.net.Uri.parse("android.resource://" + getPackageName() + "/" + R.raw.water_sound));
        
        // Mostrar notificación
        NotificationManager notificationManager = getSystemService(NotificationManager.class);
        notificationManager.notify((int) System.currentTimeMillis(), builder.build());
    }
    
    // Método para obtener el bitmap del escudo de Cobreros
    private android.graphics.Bitmap getEscudoBitmap() {
        try {
            // Cargar el escudo desde los recursos
            android.graphics.BitmapFactory.Options options = new android.graphics.BitmapFactory.Options();
            options.inSampleSize = 2; // Reducir tamaño para optimizar memoria
            return android.graphics.BitmapFactory.decodeResource(getResources(), R.drawable.escudo_cobreros, options);
        } catch (Exception e) {
            // Si no se puede cargar el escudo, usar un icono por defecto
            return android.graphics.BitmapFactory.decodeResource(getResources(), R.drawable.ic_launcher);
        }
    }
    
    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            CharSequence name = "Ayuntamiento de Cobreros";
            String description = "Notificaciones del Ayuntamiento de Cobreros";
            int importance = NotificationManager.IMPORTANCE_HIGH;
            
            NotificationChannel channel = new NotificationChannel(CHANNEL_ID, name, importance);
            channel.setDescription(description);
            
            NotificationManager notificationManager = getSystemService(NotificationManager.class);
            notificationManager.createNotificationChannel(channel);
        }
    }
    
    @Override
    public void onNewToken(String token) {
        super.onNewToken(token);
        
        // Enviar token actualizado a Firebase Firestore
        // Esto se puede hacer desde MainActivity cuando el usuario se loguea
    }
}
