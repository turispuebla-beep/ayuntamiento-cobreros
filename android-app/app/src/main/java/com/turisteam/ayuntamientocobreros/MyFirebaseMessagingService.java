package com.turisteam.ayuntamientocobreros;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Intent;
import android.media.AudioAttributes;
import android.media.RingtoneManager;
import android.net.Uri;
import android.os.Build;
import androidx.core.app.NotificationCompat;
import com.google.firebase.messaging.FirebaseMessagingService;
import com.google.firebase.messaging.RemoteMessage;

public class MyFirebaseMessagingService extends FirebaseMessagingService {

    private static final String CHANNEL_ID = "ayuntamiento_cobreros_channel";

    @Override
    public void onMessageReceived(RemoteMessage remoteMessage) {
        String title = null;
        String message = null;
        String type = "general";
        String localities = "";
        String hasAttachments = "false";
        String attachmentUrl = null;
        String attachmentType = "document";

        if (remoteMessage.getData().size() > 0) {
            title = remoteMessage.getData().get("title");
            message = remoteMessage.getData().get("message");
            type = valueOr(remoteMessage.getData().get("type"), "general");
            localities = valueOr(remoteMessage.getData().get("localities"), "");
            hasAttachments = valueOr(remoteMessage.getData().get("has_attachments"), "false");
            attachmentUrl = remoteMessage.getData().get("attachment_url");
            attachmentType = valueOr(remoteMessage.getData().get("attachment_type"), "document");
        }

        if (remoteMessage.getNotification() != null) {
            if (title == null) {
                title = remoteMessage.getNotification().getTitle();
            }
            if (message == null) {
                message = remoteMessage.getNotification().getBody();
            }
        }

        showNotification(title, message, type, localities, hasAttachments, attachmentUrl, attachmentType);
    }

    private String valueOr(String value, String fallback) {
        return value != null && !value.isEmpty() ? value : fallback;
    }

    private void showNotification(String title, String message, String type, String localities,
                                String hasAttachments, String attachmentUrl, String attachmentType) {
        createNotificationChannel();

        Intent intent = new Intent(this, NotificationDetailActivity.class);
        intent.putExtra("notification_type", type);
        intent.putExtra("notification_localities", localities);
        intent.putExtra("notification_title", title);
        intent.putExtra("notification_message", message);
        intent.putExtra("has_attachments", "true".equals(hasAttachments));
        intent.putExtra("attachment_url", attachmentUrl);
        intent.putExtra("attachment_type", attachmentType);
        intent.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);

        PendingIntent pendingIntent = PendingIntent.getActivity(
                this, (int) System.currentTimeMillis(), intent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        Uri sound = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION);

        NotificationCompat.Builder builder = new NotificationCompat.Builder(this, CHANNEL_ID)
                .setSmallIcon(R.drawable.ic_escudo_cobreros)
                .setContentTitle(title != null ? title : "Ayuntamiento de Cobreros")
                .setContentText(message != null ? message : "Nuevo aviso")
                .setStyle(new NotificationCompat.BigTextStyle()
                        .bigText(message != null ? message : "Nuevo aviso del ayuntamiento"))
                .setPriority(NotificationCompat.PRIORITY_HIGH)
                .setAutoCancel(true)
                .setContentIntent(pendingIntent)
                .setSound(sound)
                .setDefaults(NotificationCompat.DEFAULT_VIBRATE);

        if ("emergencia".equals(type)) {
            builder.setPriority(NotificationCompat.PRIORITY_MAX);
        }

        if (localities != null && !localities.isEmpty()) {
            builder.setSubText(localities);
        }

        NotificationManager notificationManager = getSystemService(NotificationManager.class);
        if (notificationManager != null) {
            notificationManager.notify((int) System.currentTimeMillis(), builder.build());
        }
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
            return;
        }
        Uri sound = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION);
        AudioAttributes attrs = new AudioAttributes.Builder()
                .setUsage(AudioAttributes.USAGE_NOTIFICATION)
                .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                .build();

        NotificationChannel channel = new NotificationChannel(
                CHANNEL_ID,
                "Avisos del Ayuntamiento",
                NotificationManager.IMPORTANCE_HIGH
        );
        channel.setDescription("Avisos urgentes y bandos de Cobreros");
        channel.enableVibration(true);
        channel.setSound(sound, attrs);

        NotificationManager manager = getSystemService(NotificationManager.class);
        if (manager != null) {
            manager.createNotificationChannel(channel);
        }
    }

    @Override
    public void onNewToken(String token) {
        FcmTokenHelper.saveTokenForCurrentUser(token);
    }
}
