package com.turisteam.ayuntamientocobreros;

import android.Manifest;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.os.Build;
import android.os.Bundle;
import android.text.TextUtils;
import android.widget.Button;
import android.widget.Toast;
import androidx.activity.result.ActivityResultLauncher;
import androidx.activity.result.contract.ActivityResultContracts;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.content.ContextCompat;
import com.google.android.material.textfield.TextInputEditText;
import com.google.firebase.auth.FirebaseAuth;
import com.google.firebase.auth.FirebaseUser;

/** Login vecinos: recibir avisos con sonido y leer mensajes/adjuntos. */
public class VecinosMainActivity extends AppCompatActivity {

    private FirebaseAuth mAuth;
    private TextInputEditText emailEditText;
    private TextInputEditText passwordEditText;

    private final ActivityResultLauncher<String> requestNotificationPermission =
            registerForActivityResult(new ActivityResultContracts.RequestPermission(), granted -> {
                if (granted) {
                    FcmTokenHelper.syncTokenIfLoggedIn();
                }
            });

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        if (forwardNotificationIntent(getIntent())) {
            return;
        }

        mAuth = FirebaseAuth.getInstance();
        FirebaseUser current = mAuth.getCurrentUser();
        if (current != null) {
            goHome();
            return;
        }

        setContentView(R.layout.activity_vecinos_login);
        emailEditText = findViewById(R.id.emailEditText);
        passwordEditText = findViewById(R.id.passwordEditText);
        Button loginButton = findViewById(R.id.loginButton);
        Button registerButton = findViewById(R.id.registerButton);

        loginButton.setOnClickListener(v -> login());
        registerButton.setOnClickListener(v ->
                startActivity(new Intent(this, RegisterActivity.class))
        );
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        forwardNotificationIntent(intent);
    }

    private boolean forwardNotificationIntent(Intent intent) {
        if (intent == null || !intent.hasExtra("notification_title")) {
            return false;
        }
        Intent detail = new Intent(this, NotificationDetailActivity.class);
        detail.putExtras(intent.getExtras());
        detail.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP);
        startActivity(detail);
        finish();
        return true;
    }

    private void login() {
        String email = emailEditText.getText() != null
                ? emailEditText.getText().toString().trim() : "";
        String password = passwordEditText.getText() != null
                ? passwordEditText.getText().toString() : "";

        if (TextUtils.isEmpty(email)) {
            emailEditText.setError("Email obligatorio");
            return;
        }
        if (TextUtils.isEmpty(password)) {
            passwordEditText.setError("Contraseña obligatoria");
            return;
        }

        mAuth.signInWithEmailAndPassword(email, password)
                .addOnCompleteListener(this, task -> {
                    if (task.isSuccessful()) {
                        requestPushPermissionAndSync();
                        goHome();
                    } else {
                        String msg = task.getException() != null
                                ? task.getException().getMessage() : "Error";
                        Toast.makeText(this, "No se pudo entrar: " + msg, Toast.LENGTH_LONG).show();
                    }
                });
    }

    private void requestPushPermissionAndSync() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            if (ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS)
                    == PackageManager.PERMISSION_GRANTED) {
                FcmTokenHelper.syncTokenIfLoggedIn();
            } else {
                requestNotificationPermission.launch(Manifest.permission.POST_NOTIFICATIONS);
            }
        } else {
            FcmTokenHelper.syncTokenIfLoggedIn();
        }
    }

    private void goHome() {
        requestPushPermissionAndSync();
        startActivity(new Intent(this, VecinosHomeActivity.class));
        finish();
    }
}
