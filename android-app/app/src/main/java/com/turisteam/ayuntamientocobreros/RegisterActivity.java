package com.turisteam.ayuntamientocobreros;

import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Bundle;
import android.text.TextUtils;
import android.view.View;
import android.widget.Button;
import android.widget.CheckBox;
import android.widget.EditText;
import android.widget.LinearLayout;
import android.widget.Toast;
import androidx.appcompat.app.AppCompatActivity;
import com.google.firebase.auth.FirebaseAuth;
import com.google.firebase.auth.FirebaseUser;
import com.google.firebase.firestore.FirebaseFirestore;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

public class RegisterActivity extends AppCompatActivity {
    
    private EditText nombreEditText, apellidosEditText, emailEditText, telefonoEditText, passwordEditText, confirmPasswordEditText;
    private CheckBox notificationConsentCheckBox;
    private LinearLayout localitiesLayout;
    private Button registerButton, backToLoginButton;
    
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
        setContentView(R.layout.activity_register);
        
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
    }
    
    private void initializeViews() {
        nombreEditText = findViewById(R.id.nombreEditText);
        apellidosEditText = findViewById(R.id.apellidosEditText);
        emailEditText = findViewById(R.id.emailEditText);
        telefonoEditText = findViewById(R.id.telefonoEditText);
        passwordEditText = findViewById(R.id.passwordEditText);
        confirmPasswordEditText = findViewById(R.id.confirmPasswordEditText);
        notificationConsentCheckBox = findViewById(R.id.notificationConsentCheckBox);
        localitiesLayout = findViewById(R.id.localitiesLayout);
        registerButton = findViewById(R.id.registerButton);
        backToLoginButton = findViewById(R.id.backToLoginButton);
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
        registerButton.setOnClickListener(v -> registerUser());
        backToLoginButton.setOnClickListener(v -> finish());
    }
    
    private void registerUser() {
        // Validar campos
        if (!validateFields()) {
            return;
        }
        
        // Obtener datos del formulario
        String nombre = nombreEditText.getText().toString().trim();
        String apellidos = apellidosEditText.getText().toString().trim();
        String email = emailEditText.getText().toString().trim();
        String telefono = telefonoEditText.getText().toString().trim();
        String password = passwordEditText.getText().toString();
        boolean notificationConsent = notificationConsentCheckBox.isChecked();
        
        // Obtener localidades seleccionadas
        List<String> selectedLocalities = getSelectedLocalities();
        
        // Verificar que al menos una localidad esté seleccionada
        if (selectedLocalities.isEmpty()) {
            Toast.makeText(this, "Por favor, selecciona al menos una localidad", Toast.LENGTH_SHORT).show();
            return;
        }
        
        // Mostrar loading
        registerButton.setEnabled(false);
        registerButton.setText("Registrando...");
        
        // Crear usuario en Firebase Auth
        mAuth.createUserWithEmailAndPassword(email, password)
            .addOnCompleteListener(this, task -> {
                if (task.isSuccessful()) {
                    // Usuario creado exitosamente
                    FirebaseUser user = mAuth.getCurrentUser();
                    if (user != null) {
                        // Guardar datos adicionales en Firestore
                        saveUserToFirestore(user.getUid(), nombre, apellidos, email, telefono, 
                                          notificationConsent, selectedLocalities);
                    }
                } else {
                    // Error en el registro
                    registerButton.setEnabled(true);
                    registerButton.setText("Registrarse");
                    Toast.makeText(this, "Error en el registro: " + task.getException().getMessage(), 
                                 Toast.LENGTH_LONG).show();
                }
            });
    }
    
    private void saveUserToFirestore(String uid, String nombre, String apellidos, String email, 
                                   String telefono, boolean notificationConsent, List<String> localities) {
        // Crear mapa de datos del usuario
        Map<String, Object> userData = new HashMap<>();
        userData.put("nombre", nombre);
        userData.put("apellidos", apellidos);
        userData.put("email", email);
        userData.put("telefono", telefono);
        userData.put("notificationConsent", notificationConsent);
        userData.put("localities", localities);
        userData.put("fcmToken", ""); // Se actualizará cuando se obtenga el token
        userData.put("registeredFrom", "APK");
        userData.put("registrationDate", System.currentTimeMillis());
        
        // Guardar en Firestore
        db.collection("users").document(uid)
            .set(userData)
            .addOnSuccessListener(aVoid -> {
                // Éxito
                Toast.makeText(this, "Usuario registrado exitosamente", Toast.LENGTH_SHORT).show();
                
                // Guardar datos localmente
                saveUserLocally(nombre, apellidos, email, telefono, notificationConsent, localities);
                
                // Ir a la actividad principal
                Intent intent = new Intent(this, MainActivity.class);
                intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TASK);
                startActivity(intent);
                finish();
            })
            .addOnFailureListener(e -> {
                // Error
                registerButton.setEnabled(true);
                registerButton.setText("Registrarse");
                Toast.makeText(this, "Error al guardar datos: " + e.getMessage(), Toast.LENGTH_LONG).show();
            });
    }
    
    private void saveUserLocally(String nombre, String apellidos, String email, String telefono, 
                               boolean notificationConsent, List<String> localities) {
        SharedPreferences.Editor editor = prefs.edit();
        editor.putString("user_nombre", nombre);
        editor.putString("user_apellidos", apellidos);
        editor.putString("user_email", email);
        editor.putString("user_telefono", telefono);
        editor.putBoolean("user_notification_consent", notificationConsent);
        editor.putString("user_localities", String.join(",", localities));
        editor.putBoolean("auto_login", true);
        editor.apply();
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
    
    private boolean validateFields() {
        String nombre = nombreEditText.getText().toString().trim();
        String apellidos = apellidosEditText.getText().toString().trim();
        String email = emailEditText.getText().toString().trim();
        String telefono = telefonoEditText.getText().toString().trim();
        String password = passwordEditText.getText().toString();
        String confirmPassword = confirmPasswordEditText.getText().toString();
        
        if (TextUtils.isEmpty(nombre)) {
            nombreEditText.setError("El nombre es obligatorio");
            return false;
        }
        
        if (TextUtils.isEmpty(apellidos)) {
            apellidosEditText.setError("Los apellidos son obligatorios");
            return false;
        }
        
        if (TextUtils.isEmpty(email)) {
            emailEditText.setError("El email es obligatorio");
            return false;
        }
        
        if (!android.util.Patterns.EMAIL_ADDRESS.matcher(email).matches()) {
            emailEditText.setError("Email no válido");
            return false;
        }
        
        if (TextUtils.isEmpty(telefono)) {
            telefonoEditText.setError("El teléfono es obligatorio");
            return false;
        }
        
        if (TextUtils.isEmpty(password)) {
            passwordEditText.setError("La contraseña es obligatoria");
            return false;
        }
        
        if (password.length() < 6) {
            passwordEditText.setError("La contraseña debe tener al menos 6 caracteres");
            return false;
        }
        
        if (!password.equals(confirmPassword)) {
            confirmPasswordEditText.setError("Las contraseñas no coinciden");
            return false;
        }
        
        return true;
    }
}
