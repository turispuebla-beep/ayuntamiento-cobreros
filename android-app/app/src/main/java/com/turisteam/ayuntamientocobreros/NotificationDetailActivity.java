package com.turisteam.ayuntamientocobreros;

import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.view.View;
import android.widget.Button;
import android.widget.ImageView;
import android.widget.TextView;
import android.widget.Toast;
import androidx.appcompat.app.AppCompatActivity;
import com.bumptech.glide.Glide;
import com.google.firebase.storage.FirebaseStorage;
import com.google.firebase.storage.StorageReference;
import java.io.File;
import java.io.IOException;

public class NotificationDetailActivity extends AppCompatActivity {
    
    private TextView titleTextView, messageTextView, typeTextView, localitiesTextView;
    private ImageView attachmentImageView;
    private Button downloadButton, openButton, shareButton;
    private String attachmentUrl, attachmentType, notificationTitle, notificationMessage;
    private boolean hasAttachments;
    
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_notification_detail);
        
        // Inicializar vistas
        titleTextView = findViewById(R.id.titleTextView);
        messageTextView = findViewById(R.id.messageTextView);
        typeTextView = findViewById(R.id.typeTextView);
        localitiesTextView = findViewById(R.id.localitiesTextView);
        attachmentImageView = findViewById(R.id.attachmentImageView);
        downloadButton = findViewById(R.id.downloadButton);
        openButton = findViewById(R.id.openButton);
        shareButton = findViewById(R.id.shareButton);
        
        // Obtener datos de la notificación
        getNotificationData();
        
        // Configurar la interfaz
        setupUI();
        
        // Configurar listeners
        setupListeners();
    }
    
    private void getNotificationData() {
        Intent intent = getIntent();
        notificationTitle = intent.getStringExtra("notification_title");
        notificationMessage = intent.getStringExtra("notification_message");
        String type = intent.getStringExtra("notification_type");
        String localities = intent.getStringExtra("notification_localities");
        hasAttachments = intent.getBooleanExtra("has_attachments", false);
        attachmentUrl = intent.getStringExtra("attachment_url");
        attachmentType = intent.getStringExtra("attachment_type");
        
        // Mostrar datos en la interfaz
        titleTextView.setText(notificationTitle != null ? notificationTitle : "Notificación del Ayuntamiento");
        messageTextView.setText(notificationMessage != null ? notificationMessage : "Sin mensaje");
        
        // Mostrar tipo de notificación con emoji
        String typeDisplay = getTypeDisplay(type);
        typeTextView.setText(typeDisplay);
        
        // Mostrar localidades
        if (localities != null && !localities.isEmpty()) {
            localitiesTextView.setText("📍 " + localities);
            localitiesTextView.setVisibility(View.VISIBLE);
        } else {
            localitiesTextView.setVisibility(View.GONE);
        }
    }
    
    private String getTypeDisplay(String type) {
        switch (type) {
            case "emergencia":
                return "🚨 EMERGENCIA";
            case "cita":
                return "📅 CITA";
            case "evento":
                return "🎉 EVENTO";
            case "bando":
                return "📢 BANDO";
            default:
                return "🏛️ GENERAL";
        }
    }
    
    private void setupUI() {
        if (hasAttachments && attachmentUrl != null) {
            // Mostrar sección de adjuntos
            attachmentImageView.setVisibility(View.VISIBLE);
            downloadButton.setVisibility(View.VISIBLE);
            openButton.setVisibility(View.VISIBLE);
            shareButton.setVisibility(View.VISIBLE);
            
            // Cargar imagen si es un archivo de imagen
            if (isImageAttachment(attachmentUrl, attachmentType)) {
                loadAttachmentImage(attachmentUrl);
            } else {
                attachmentImageView.setImageResource(R.drawable.ic_attachment);
            }
        } else {
            // Ocultar sección de adjuntos
            attachmentImageView.setVisibility(View.GONE);
            downloadButton.setVisibility(View.GONE);
            openButton.setVisibility(View.GONE);
            shareButton.setVisibility(View.GONE);
        }
    }
    
    private void loadAttachmentImage(String imageUrl) {
        try {
            // Cargar imagen desde Firebase Storage o URL
            Glide.with(this)
                .load(imageUrl)
                .placeholder(R.drawable.ic_escudo_cobreros)
                .error(R.drawable.ic_error)
                .into(attachmentImageView);
        } catch (Exception e) {
            attachmentImageView.setImageResource(R.drawable.ic_error);
            Toast.makeText(this, "Error al cargar la imagen", Toast.LENGTH_SHORT).show();
        }
    }
    
    private void setupListeners() {
        downloadButton.setOnClickListener(v -> downloadAttachment());
        
        openButton.setOnClickListener(v -> openAttachment());
        
        shareButton.setOnClickListener(v -> shareNotification());
    }
    
    private void downloadAttachment() {
        if (attachmentUrl != null) {
            try {
                // Crear intent para descargar
                Intent downloadIntent = new Intent(Intent.ACTION_VIEW);
                downloadIntent.setData(Uri.parse(attachmentUrl));
                startActivity(downloadIntent);
                
                Toast.makeText(this, "Descargando archivo...", Toast.LENGTH_SHORT).show();
            } catch (Exception e) {
                Toast.makeText(this, "Error al descargar el archivo", Toast.LENGTH_SHORT).show();
            }
        }
    }
    
    private void openAttachment() {
        if (attachmentUrl != null) {
            try {
                // Crear intent para abrir el archivo
                Intent openIntent = new Intent(Intent.ACTION_VIEW);
                openIntent.setData(Uri.parse(attachmentUrl));
                startActivity(openIntent);
            } catch (Exception e) {
                Toast.makeText(this, "No se puede abrir este tipo de archivo", Toast.LENGTH_SHORT).show();
            }
        }
    }
    
    private boolean isImageAttachment(String url, String type) {
        if (type != null && (type.startsWith("image/") || "image".equalsIgnoreCase(type))) {
            return true;
        }
        if (url == null) {
            return false;
        }
        String lower = url.toLowerCase();
        return lower.endsWith(".jpg") || lower.endsWith(".jpeg")
                || lower.endsWith(".png") || lower.endsWith(".webp") || lower.endsWith(".gif");
    }

    private void shareNotification() {
        try {
            Intent shareIntent = new Intent(Intent.ACTION_SEND);
            shareIntent.setType("text/plain");
            
            String shareText = notificationTitle + "\n\n" + notificationMessage;
            if (hasAttachments) {
                shareText += "\n\n📎 Archivo adjunto disponible en la aplicación";
            }
            
            shareIntent.putExtra(Intent.EXTRA_TEXT, shareText);
            shareIntent.putExtra(Intent.EXTRA_SUBJECT, "Notificación del Ayuntamiento de Cobreros");
            
            startActivity(Intent.createChooser(shareIntent, "Compartir notificación"));
        } catch (Exception e) {
            Toast.makeText(this, "Error al compartir", Toast.LENGTH_SHORT).show();
        }
    }
}
