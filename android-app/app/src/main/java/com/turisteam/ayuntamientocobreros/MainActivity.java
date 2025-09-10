package com.turisteam.ayuntamientocobreros;

import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Bundle;
import android.view.View;
import android.widget.Button;
import android.widget.EditText;
import android.widget.Toast;
import androidx.appcompat.app.AppCompatActivity;
import com.google.firebase.auth.FirebaseAuth;
import com.google.firebase.auth.FirebaseUser;
import com.google.firebase.firestore.FirebaseFirestore;

public class MainActivity extends AppCompatActivity {
    
    private EditText emailEditText, passwordEditText;
    private Button loginButton, registerButton, adminButton;
    private FirebaseAuth mAuth;
    private FirebaseFirestore db;
    private SharedPreferences prefs;
    
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);
        
        // Inicializar Firebase
        mAuth = FirebaseAuth.getInstance();
        db = FirebaseFirestore.getInstance();
        prefs = getSharedPreferences("AyuntamientoCobreros", MODE_PRIVATE);
        
        // Inicializar vistas
        emailEditText = findViewById(R.id.emailEditText);
        passwordEditText = findViewById(R.id.passwordEditText);
        loginButton = findViewById(R.id.loginButton);
        registerButton = findViewById(R.id.registerButton);
        adminButton = findViewById(R.id.adminButton);
        
        // Verificar si hay credenciales guardadas
        checkSavedCredentials();
        
        // Configurar listeners
        setupListeners();
    }
    
    private void checkSavedCredentials() {
        String savedEmail = prefs.getString("user_email", "");
        String savedPassword = prefs.getString("user_password", "");
        
        if (!savedEmail.isEmpty() && !savedPassword.isEmpty()) {
            emailEditText.setText(savedEmail);
            passwordEditText.setText(savedPassword);
            // Auto-login si las credenciales están guardadas
            loginUser(savedEmail, savedPassword);
        }
    }
    
    private void setupListeners() {
        loginButton.setOnClickListener(v -> {
            String email = emailEditText.getText().toString().trim();
            String password = passwordEditText.getText().toString().trim();
            
            if (email.isEmpty() || password.isEmpty()) {
                Toast.makeText(this, "Por favor, completa todos los campos", Toast.LENGTH_SHORT).show();
                return;
            }
            
            loginUser(email, password);
        });
        
        registerButton.setOnClickListener(v -> {
            Intent intent = new Intent(this, RegisterActivity.class);
            startActivity(intent);
        });
        
        adminButton.setOnClickListener(v -> {
            Intent intent = new Intent(this, AdminLoginActivity.class);
            startActivity(intent);
        });
    }
    
    private void loginUser(String email, String password) {
        // Verificar si es super admin oculto
        if (email.equals("amco@gmx.es") && password.equals("533712")) {
            // Super admin - ir directamente al panel de administración
            Intent intent = new Intent(this, AdminPanelActivity.class);
            intent.putExtra("is_super_admin", true);
            startActivity(intent);
            return;
        }
        
        // Login normal de usuario
        mAuth.signInWithEmailAndPassword(email, password)
            .addOnCompleteListener(this, task -> {
                if (task.isSuccessful()) {
                    FirebaseUser user = mAuth.getCurrentUser();
                    if (user != null) {
                        // Guardar credenciales
                        saveCredentials(email, password);
                        
                        // Verificar si el usuario existe en Firestore
                        verifyUserInFirestore(user.getEmail());
                    }
                } else {
                    Toast.makeText(this, "Error de autenticación: " + task.getException().getMessage(), Toast.LENGTH_SHORT).show();
                }
            });
    }
    
    private void verifyUserInFirestore(String email) {
        db.collection("users")
            .whereEqualTo("email", email)
            .get()
            .addOnCompleteListener(task -> {
                if (task.isSuccessful() && !task.getResult().isEmpty()) {
                    // Usuario encontrado en Firestore
                    Intent intent = new Intent(this, UserDashboardActivity.class);
                    intent.putExtra("user_email", email);
                    startActivity(intent);
                    finish();
                } else {
                    // Usuario no encontrado en Firestore
                    Toast.makeText(this, "Usuario no registrado en el sistema", Toast.LENGTH_SHORT).show();
                    mAuth.signOut();
                }
            });
    }
    
    private void saveCredentials(String email, String password) {
        SharedPreferences.Editor editor = prefs.edit();
        editor.putString("user_email", email);
        editor.putString("user_password", password);
        editor.putBoolean("auto_login", true);
        editor.apply();
    }
    
    @Override
    protected void onResume() {
        super.onResume();
        
        // Verificar si se abrió desde una notificación
        handleNotificationIntent();
        
        // Verificar si el usuario ya está logueado
        FirebaseUser currentUser = mAuth.getCurrentUser();
        if (currentUser != null && prefs.getBoolean("auto_login", false)) {
            verifyUserInFirestore(currentUser.getEmail());
            
            // Iniciar servicio de sincronización
            startSyncService();
        }
    }
    
    private void startSyncService() {
        Intent syncIntent = new Intent(this, SyncService.class);
        startService(syncIntent);
    }
    
    private void handleNotificationIntent() {
        Intent intent = getIntent();
        if (intent != null && intent.hasExtra("notification_type")) {
            // Se abrió desde una notificación
            String notificationType = intent.getStringExtra("notification_type");
            String notificationTitle = intent.getStringExtra("notification_title");
            String notificationMessage = intent.getStringExtra("notification_message");
            String localities = intent.getStringExtra("notification_localities");
            boolean hasAttachments = intent.getBooleanExtra("has_attachments", false);
            String attachmentUrl = intent.getStringExtra("attachment_url");
            String attachmentType = intent.getStringExtra("attachment_type");
            
            // Verificar si el usuario está logueado
            FirebaseUser currentUser = mAuth.getCurrentUser();
            if (currentUser != null) {
                // Usuario logueado, mostrar detalles de la notificación
                showNotificationDetails(notificationType, notificationTitle, notificationMessage, 
                                      localities, hasAttachments, attachmentUrl, attachmentType);
            } else {
                // Usuario no logueado, guardar datos de la notificación para mostrar después del login
                saveNotificationData(notificationType, notificationTitle, notificationMessage, 
                                   localities, hasAttachments, attachmentUrl, attachmentType);
            }
        }
    }
    
    private void showNotificationDetails(String type, String title, String message, 
                                       String localities, boolean hasAttachments, 
                                       String attachmentUrl, String attachmentType) {
        Intent detailIntent = new Intent(this, NotificationDetailActivity.class);
        detailIntent.putExtra("notification_type", type);
        detailIntent.putExtra("notification_title", title);
        detailIntent.putExtra("notification_message", message);
        detailIntent.putExtra("notification_localities", localities);
        detailIntent.putExtra("has_attachments", hasAttachments);
        detailIntent.putExtra("attachment_url", attachmentUrl);
        detailIntent.putExtra("attachment_type", attachmentType);
        startActivity(detailIntent);
    }
    
    private void saveNotificationData(String type, String title, String message, 
                                    String localities, boolean hasAttachments, 
                                    String attachmentUrl, String attachmentType) {
        SharedPreferences.Editor editor = prefs.edit();
        editor.putString("pending_notification_type", type);
        editor.putString("pending_notification_title", title);
        editor.putString("pending_notification_message", message);
        editor.putString("pending_notification_localities", localities);
        editor.putBoolean("pending_notification_has_attachments", hasAttachments);
        editor.putString("pending_notification_attachment_url", attachmentUrl);
        editor.putString("pending_notification_attachment_type", attachmentType);
        editor.apply();
    }
    
    private void checkPendingNotification() {
        String pendingType = prefs.getString("pending_notification_type", null);
        if (pendingType != null) {
            // Hay una notificación pendiente, mostrarla
            String title = prefs.getString("pending_notification_title", "");
            String message = prefs.getString("pending_notification_message", "");
            String localities = prefs.getString("pending_notification_localities", "");
            boolean hasAttachments = prefs.getBoolean("pending_notification_has_attachments", false);
            String attachmentUrl = prefs.getString("pending_notification_attachment_url", "");
            String attachmentType = prefs.getString("pending_notification_attachment_type", "");
            
            showNotificationDetails(pendingType, title, message, localities, 
                                  hasAttachments, attachmentUrl, attachmentType);
            
            // Limpiar datos pendientes
            clearPendingNotification();
        }
    }
    
    private void clearPendingNotification() {
        SharedPreferences.Editor editor = prefs.edit();
        editor.remove("pending_notification_type");
        editor.remove("pending_notification_title");
        editor.remove("pending_notification_message");
        editor.remove("pending_notification_localities");
        editor.remove("pending_notification_has_attachments");
        editor.remove("pending_notification_attachment_url");
        editor.remove("pending_notification_attachment_type");
        editor.apply();
    }
}
