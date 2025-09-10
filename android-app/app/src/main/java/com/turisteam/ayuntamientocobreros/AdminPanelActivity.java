package com.turisteam.ayuntamientocobreros;

import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Bundle;
import android.view.View;
import android.widget.Button;
import android.widget.CheckBox;
import android.widget.EditText;
import android.widget.LinearLayout;
import android.widget.Spinner;
import android.widget.TextView;
import android.widget.Toast;
import androidx.appcompat.app.AppCompatActivity;
import com.google.firebase.auth.FirebaseAuth;
import com.google.firebase.auth.FirebaseUser;
import com.google.firebase.firestore.FirebaseFirestore;
import com.google.firebase.firestore.QueryDocumentSnapshot;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

public class AdminPanelActivity extends AppCompatActivity {
    
    private EditText tituloEditText, mensajeEditText;
    private Spinner tipoSpinner, alcanceSpinner;
    private LinearLayout localitiesLayout;
    private Button enviarButton, seleccionarTodasButton, deseleccionarTodasButton;
    private TextView estadisticasTextView;
    
    private FirebaseAuth mAuth;
    private FirebaseFirestore db;
    private SharedPreferences prefs;
    
    // Lista de localidades del Ayuntamiento de Cobreros
    private String[] localities = {
        "Cobreros", "Avedillo de Sanabria", "Barrio de Lomba", "Castro de Sanabria", 
        "Limianos", "Quintana de Sanabria", "Riego de Lomba", "San Martín del Terroso", 
        "San Miguel de Lomba", "San Román de Sanabria", "Santa Colomba", "Sotillo", "Terroso"
    };
    
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_admin_panel);
        
        // Inicializar Firebase
        mAuth = FirebaseAuth.getInstance();
        db = FirebaseFirestore.getInstance();
        prefs = getSharedPreferences("ayuntamiento_prefs", MODE_PRIVATE);
        
        // Inicializar vistas
        initializeViews();
        
        // Configurar localidades
        setupLocalities();
        
        // Configurar listeners
        setupListeners();
        
        // Cargar estadísticas
        loadStatistics();
    }
    
    private void initializeViews() {
        tituloEditText = findViewById(R.id.tituloEditText);
        mensajeEditText = findViewById(R.id.mensajeEditText);
        tipoSpinner = findViewById(R.id.tipoSpinner);
        alcanceSpinner = findViewById(R.id.alcanceSpinner);
        localitiesLayout = findViewById(R.id.localitiesLayout);
        enviarButton = findViewById(R.id.enviarButton);
        seleccionarTodasButton = findViewById(R.id.seleccionarTodasButton);
        deseleccionarTodasButton = findViewById(R.id.deseleccionarTodasButton);
        estadisticasTextView = findViewById(R.id.estadisticasTextView);
    }
    
    private void setupLocalities() {
        for (String locality : localities) {
            CheckBox localityCheckBox = new CheckBox(this);
            localityCheckBox.setText(locality);
            localityCheckBox.setTag(locality);
            localityCheckBox.setTextSize(16);
            localityCheckBox.setPadding(16, 8, 16, 8);
            localitiesLayout.addView(localityCheckBox);
        }
    }
    
    private void setupListeners() {
        enviarButton.setOnClickListener(v -> enviarNotificacion());
        seleccionarTodasButton.setOnClickListener(v -> seleccionarTodasLocalidades());
        deseleccionarTodasButton.setOnClickListener(v -> deseleccionarTodasLocalidades());
    }
    
    private void enviarNotificacion() {
        String titulo = tituloEditText.getText().toString().trim();
        String mensaje = mensajeEditText.getText().toString().trim();
        String tipo = tipoSpinner.getSelectedItem().toString().toLowerCase();
        String alcance = alcanceSpinner.getSelectedItem().toString();
        
        if (titulo.isEmpty() || mensaje.isEmpty()) {
            Toast.makeText(this, "Por favor, completa todos los campos", Toast.LENGTH_SHORT).show();
            return;
        }
        
        // Obtener localidades seleccionadas
        List<String> localidadesSeleccionadas = getSelectedLocalities();
        
        if (alcance.equals("Localidades específicas") && localidadesSeleccionadas.isEmpty()) {
            Toast.makeText(this, "Por favor, selecciona al menos una localidad", Toast.LENGTH_SHORT).show();
            return;
        }
        
        // Mostrar loading
        enviarButton.setEnabled(false);
        enviarButton.setText("Enviando...");
        
        // Enviar notificación
        sendNotificationToUsers(titulo, mensaje, tipo, alcance, localidadesSeleccionadas);
    }
    
    private void sendNotificationToUsers(String titulo, String mensaje, String tipo, String alcance, List<String> localidadesSeleccionadas) {
        // Usar el servicio FCM para enviar notificaciones
        FCMNotificationService fcmService = new FCMNotificationService();
        fcmService.sendNotificationToUsers(titulo, mensaje, tipo, alcance, localidadesSeleccionadas);
        
        // Mostrar resultado
        String resultado = String.format("Notificación enviada desde APK:\n📱 %s\n📍 %s", 
                                       titulo, 
                                       localidadesSeleccionadas.isEmpty() ? "Todas las localidades" : String.join(", ", localidadesSeleccionadas));
        Toast.makeText(this, resultado, Toast.LENGTH_LONG).show();
        
        // Limpiar formulario
        tituloEditText.setText("");
        mensajeEditText.setText("");
        deseleccionarTodasLocalidades();
        
        // Restaurar botón
        enviarButton.setEnabled(true);
        enviarButton.setText("Enviar Notificación");
    }
    
    private void sendFCMNotification(String fcmToken, String titulo, String mensaje, String tipo, List<String> localidades) {
        // Aquí se implementaría el envío real de FCM
        // Por ahora simulamos el envío
        System.out.println("Enviando FCM a: " + fcmToken);
        System.out.println("Título: " + titulo);
        System.out.println("Mensaje: " + mensaje);
        System.out.println("Tipo: " + tipo);
        System.out.println("Localidades: " + localidades);
    }
    
    private void saveNotificationToFirestore(String titulo, String mensaje, String tipo, List<String> localidades, int usuariosEnviados) {
        Map<String, Object> notificationData = new HashMap<>();
        notificationData.put("title", titulo);
        notificationData.put("message", mensaje);
        notificationData.put("type", tipo);
        notificationData.put("localities", localidades);
        notificationData.put("usuariosEnviados", usuariosEnviados);
        notificationData.put("timestamp", System.currentTimeMillis());
        notificationData.put("sentFrom", "APK");
        notificationData.put("sentTo", "APK");
        
        db.collection("notifications")
            .add(notificationData)
            .addOnSuccessListener(documentReference -> {
                System.out.println("Notificación guardada en Firestore: " + documentReference.getId());
            })
            .addOnFailureListener(e -> {
                System.err.println("Error guardando notificación: " + e.getMessage());
            });
    }
    
    private List<String> getSelectedLocalities() {
        List<String> selectedLocalities = new ArrayList<>();
        for (int i = 0; i < localitiesLayout.getChildCount(); i++) {
            View child = localitiesLayout.getChildAt(i);
            if (child instanceof CheckBox) {
                CheckBox checkBox = (CheckBox) child;
                if (checkBox.isChecked()) {
                    selectedLocalities.add(checkBox.getTag().toString());
                }
            }
        }
        return selectedLocalities;
    }
    
    private void seleccionarTodasLocalidades() {
        for (int i = 0; i < localitiesLayout.getChildCount(); i++) {
            View child = localitiesLayout.getChildAt(i);
            if (child instanceof CheckBox) {
                CheckBox checkBox = (CheckBox) child;
                checkBox.setChecked(true);
            }
        }
        Toast.makeText(this, "Todas las localidades seleccionadas", Toast.LENGTH_SHORT).show();
    }
    
    private void deseleccionarTodasLocalidades() {
        for (int i = 0; i < localitiesLayout.getChildCount(); i++) {
            View child = localitiesLayout.getChildAt(i);
            if (child instanceof CheckBox) {
                CheckBox checkBox = (CheckBox) child;
                checkBox.setChecked(false);
            }
        }
        Toast.makeText(this, "Todas las localidades deseleccionadas", Toast.LENGTH_SHORT).show();
    }
    
    private void loadStatistics() {
        db.collection("users")
            .whereEqualTo("notificationConsent", true)
            .get()
            .addOnCompleteListener(task -> {
                if (task.isSuccessful()) {
                    int totalUsuarios = task.getResult().size();
                    estadisticasTextView.setText("Usuarios con notificaciones activas: " + totalUsuarios);
                } else {
                    estadisticasTextView.setText("Error cargando estadísticas");
                }
            });
    }
}