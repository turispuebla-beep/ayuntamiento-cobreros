package com.turisteam.ayuntamientocobreros;

import android.os.Bundle;
import android.view.View;
import android.widget.Button;
import android.widget.EditText;
import android.widget.Spinner;
import android.widget.Toast;
import androidx.appcompat.app.AppCompatActivity;
import com.google.firebase.firestore.FirebaseFirestore;
import com.google.firebase.messaging.FirebaseMessaging;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

public class NotificationManagerActivity extends AppCompatActivity {
    
    private EditText titleEditText, messageEditText;
    private Spinner typeSpinner, scopeSpinner;
    private Button sendButton, selectAllButton, deselectAllButton;
    private FirebaseFirestore db;
    private List<String> selectedLocalities;
    private String[] localities = {
        "Cobreros", "Avedillo de Sanabria", "Barrio de Lomba", "Castro de Sanabria",
        "Limianos", "Quintana de Sanabria", "Riego de Lomba", "San Martín del Terroso",
        "San Miguel de Lomba", "San Román de Sanabria", "Santa Colomba", "Sotillo", "Terroso"
    };
    
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_notification_manager);
        
        // Inicializar Firebase
        db = FirebaseFirestore.getInstance();
        selectedLocalities = new ArrayList<>();
        
        // Inicializar vistas
        titleEditText = findViewById(R.id.titleEditText);
        messageEditText = findViewById(R.id.messageEditText);
        typeSpinner = findViewById(R.id.typeSpinner);
        scopeSpinner = findViewById(R.id.scopeSpinner);
        sendButton = findViewById(R.id.sendButton);
        selectAllButton = findViewById(R.id.selectAllButton);
        deselectAllButton = findViewById(R.id.deselectAllButton);
        
        // Configurar listeners
        setupListeners();
    }
    
    private void setupListeners() {
        sendButton.setOnClickListener(v -> sendNotification());
        
        selectAllButton.setOnClickListener(v -> {
            selectedLocalities.clear();
            for (String locality : localities) {
                selectedLocalities.add(locality);
            }
            Toast.makeText(this, "Todas las localidades seleccionadas", Toast.LENGTH_SHORT).show();
        });
        
        deselectAllButton.setOnClickListener(v -> {
            selectedLocalities.clear();
            Toast.makeText(this, "Todas las localidades deseleccionadas", Toast.LENGTH_SHORT).show();
        });
    }
    
    private void sendNotification() {
        String title = titleEditText.getText().toString().trim();
        String message = messageEditText.getText().toString().trim();
        String type = typeSpinner.getSelectedItem().toString();
        String scope = scopeSpinner.getSelectedItem().toString();
        
        if (title.isEmpty() || message.isEmpty()) {
            Toast.makeText(this, "Por favor, completa todos los campos", Toast.LENGTH_SHORT).show();
            return;
        }
        
        if (scope.equals("Localidades específicas") && selectedLocalities.isEmpty()) {
            Toast.makeText(this, "Por favor, selecciona al menos una localidad", Toast.LENGTH_SHORT).show();
            return;
        }
        
        // Crear datos de la notificación
        Map<String, Object> notificationData = new HashMap<>();
        notificationData.put("title", title);
        notificationData.put("message", message);
        notificationData.put("type", type);
        notificationData.put("scope", scope);
        notificationData.put("localities", selectedLocalities);
        notificationData.put("timestamp", System.currentTimeMillis());
        notificationData.put("sent_by", "Admin APK");
        
        // Enviar a Firebase Firestore
        db.collection("notifications")
            .add(notificationData)
            .addOnSuccessListener(documentReference -> {
                Toast.makeText(this, "Notificación enviada correctamente", Toast.LENGTH_SHORT).show();
                
                // Limpiar formulario
                titleEditText.setText("");
                messageEditText.setText("");
                selectedLocalities.clear();
            })
            .addOnFailureListener(e -> {
                Toast.makeText(this, "Error al enviar notificación: " + e.getMessage(), Toast.LENGTH_SHORT).show();
            });
    }
    
    // Método para seleccionar localidad individual
    public void selectLocality(View view) {
        Button button = (Button) view;
        String locality = button.getText().toString();
        
        if (selectedLocalities.contains(locality)) {
            selectedLocalities.remove(locality);
            button.setBackgroundColor(getResources().getColor(android.R.color.white));
        } else {
            selectedLocalities.add(locality);
            button.setBackgroundColor(getResources().getColor(android.R.color.holo_blue_light));
        }
    }
}
