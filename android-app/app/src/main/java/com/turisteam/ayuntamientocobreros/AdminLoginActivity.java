package com.turisteam.ayuntamientocobreros;

import android.content.Intent;
import android.os.Bundle;
import android.text.TextUtils;
import android.widget.Button;
import android.widget.EditText;
import android.widget.Toast;
import androidx.appcompat.app.AppCompatActivity;
import com.google.firebase.auth.FirebaseAuth;

public class AdminLoginActivity extends AppCompatActivity {

    private EditText emailEditText;
    private EditText passwordEditText;
    private Button loginButton;
    private FirebaseAuth mAuth;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_admin_login);

        mAuth = FirebaseAuth.getInstance();
        emailEditText = findViewById(R.id.emailEditText);
        passwordEditText = findViewById(R.id.passwordEditText);
        loginButton = findViewById(R.id.loginButton);
        Button backButton = findViewById(R.id.backButton);
        if (backButton != null) {
            backButton.setVisibility(android.view.View.GONE);
        }

        loginButton.setOnClickListener(v -> loginAdmin());
    }

    private void loginAdmin() {
        String email = emailEditText.getText().toString().trim();
        String password = passwordEditText.getText().toString().trim();

        if (TextUtils.isEmpty(email) || TextUtils.isEmpty(password)) {
            Toast.makeText(this, "Introduce email y contraseña", Toast.LENGTH_SHORT).show();
            return;
        }

        loginButton.setEnabled(false);
        loginButton.setText("Verificando...");

        mAuth.signInWithEmailAndPassword(email, password)
                .addOnCompleteListener(task -> {
                    if (!task.isSuccessful()) {
                        Toast.makeText(this, "Credenciales incorrectas", Toast.LENGTH_SHORT).show();
                        restoreLoginButton();
                        return;
                    }
                    AdminAuthHelper.ensureAllowlistedAdminDoc(
                            mAuth.getCurrentUser(),
                            () -> AdminAuthHelper.verifyCurrentUserIsAdmin(new AdminAuthHelper.AdminCheckCallback() {
                                @Override
                                public void onAdmin(String displayName) {
                                    Toast.makeText(AdminLoginActivity.this,
                                            "Bienvenido, " + displayName, Toast.LENGTH_SHORT).show();
                                    startActivity(new Intent(AdminLoginActivity.this, AdminPanelActivity.class));
                                    finish();
                                }

                                @Override
                                public void onNotAdmin(String reason) {
                                    mAuth.signOut();
                                    Toast.makeText(AdminLoginActivity.this,
                                            "Sin permisos de administrador en Firebase (admins/{uid})",
                                            Toast.LENGTH_LONG).show();
                                    restoreLoginButton();
                                }

                                @Override
                                public void onError(String message) {
                                    mAuth.signOut();
                                    Toast.makeText(AdminLoginActivity.this, message, Toast.LENGTH_LONG).show();
                                    restoreLoginButton();
                                }
                            })
                    );
                });
    }

    private void restoreLoginButton() {
        loginButton.setEnabled(true);
        loginButton.setText("🔐 Iniciar sesión");
    }
}
