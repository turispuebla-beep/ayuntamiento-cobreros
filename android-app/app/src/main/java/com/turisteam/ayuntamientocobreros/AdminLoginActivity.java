package com.turisteam.ayuntamientocobreros;

import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Bundle;
import android.text.TextUtils;
import android.view.View;
import android.widget.Button;
import android.widget.EditText;
import android.widget.Toast;
import androidx.appcompat.app.AppCompatActivity;
import com.google.firebase.auth.FirebaseAuth;
import com.google.firebase.auth.FirebaseUser;
import com.google.firebase.firestore.DocumentSnapshot;
import com.google.firebase.firestore.FirebaseFirestore;

public class AdminLoginActivity extends AppCompatActivity {
    
    private EditText emailEditText, passwordEditText;
    private Button loginButton, backButton;
    
    private FirebaseAuth mAuth;
    private FirebaseFirestore db;
    private SharedPreferences prefs;
    
    // Super administrador oculto
    private static final String SUPER_ADMIN_EMAIL = "amco@gmx.es";
    private static final String SUPER_ADMIN_PASSWORD = "533712";
    
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_admin_login);
        
        // Inicializar Firebase
        mAuth = FirebaseAuth.getInstance();
        db = FirebaseFirestore.getInstance();
        prefs = getSharedPreferences("ayuntamiento_prefs", MODE_PRIVATE);
        
        // Inicializar vistas
        initializeViews();
        
        // Configurar listeners
        setupListeners();
    }
    
    private void initializeViews() {
        emailEditText = findViewById(R.id.emailEditText);
        passwordEditText = findViewById(R.id.passwordEditText);
        loginButton = findViewById(R.id.loginButton);
        backButton = findViewById(R.id.backButton);
    }
    
    private void setupListeners() {
        loginButton.setOnClickListener(v -> loginAdmin());
        backButton.setOnClickListener(v -> finish());
    }
    
    private void loginAdmin() {
        String email = emailEditText.getText().toString().trim();
        String password = passwordEditText.getText().toString().trim();
        
        if (TextUtils.isEmpty(email) || TextUtils.isEmpty(password)) {
            Toast.makeText(this, "Por favor, completa todos los campos", Toast.LENGTH_SHORT).show();
            return;
        }
        
        // Verificar super administrador
        if (email.equals(SUPER_ADMIN_EMAIL) && password.equals(SUPER_ADMIN_PASSWORD)) {
            loginSuperAdmin();
            return;
        }
        
        // Mostrar loading
        loginButton.setEnabled(false);
        loginButton.setText("Verificando...");
        
        // Verificar administrador en Firestore
        db.collection("administrators")
            .whereEqualTo("email", email)
            .whereEqualTo("active", true)
            .get()
            .addOnCompleteListener(task -> {
                if (task.isSuccessful() && !task.getResult().isEmpty()) {
                    DocumentSnapshot adminDoc = task.getResult().getDocuments().get(0);
                    String storedPassword = adminDoc.getString("password");
                    
                    if (password.equals(storedPassword)) {
                        // Login exitoso
                        String adminName = adminDoc.getString("name");
                        String adminId = adminDoc.getId();
                        
                        // Guardar datos del administrador
                        saveAdminData(adminName, email, adminId);
                        
                        // Ir al panel de administración
                        Intent intent = new Intent(this, AdminPanelActivity.class);
                        startActivity(intent);
                        finish();
                        
                        Toast.makeText(this, "Bienvenido, " + adminName, Toast.LENGTH_SHORT).show();
                    } else {
                        Toast.makeText(this, "Contraseña incorrecta", Toast.LENGTH_SHORT).show();
                    }
                } else {
                    Toast.makeText(this, "Administrador no encontrado o inactivo", Toast.LENGTH_SHORT).show();
                }
                
                // Restaurar botón
                loginButton.setEnabled(true);
                loginButton.setText("Iniciar Sesión");
            });
    }
    
    private void loginSuperAdmin() {
        // Guardar datos del super administrador
        saveAdminData("TURISTEAM Super Admin", SUPER_ADMIN_EMAIL, "super_admin");
        
        // Ir al panel de administración
        Intent intent = new Intent(this, AdminPanelActivity.class);
        startActivity(intent);
        finish();
        
        Toast.makeText(this, "Bienvenido, Super Administrador", Toast.LENGTH_SHORT).show();
    }
    
    private void saveAdminData(String name, String email, String adminId) {
        SharedPreferences.Editor editor = prefs.edit();
        editor.putString("admin_name", name);
        editor.putString("admin_email", email);
        editor.putString("admin_id", adminId);
        editor.putBoolean("is_admin", true);
        editor.apply();
    }
}
