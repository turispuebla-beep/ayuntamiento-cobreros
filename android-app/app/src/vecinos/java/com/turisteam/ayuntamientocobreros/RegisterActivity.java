package com.turisteam.ayuntamientocobreros;

import android.content.Intent;
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

    private EditText nombreEditText, apellidosEditText, emailEditText, telefonoEditText;
    private EditText passwordEditText, confirmPasswordEditText;
    private CheckBox notificationConsentCheckBox;
    private LinearLayout localitiesLayout;
    private Button registerButton, backToLoginButton;

    private FirebaseAuth mAuth;
    private FirebaseFirestore db;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_register);

        mAuth = FirebaseAuth.getInstance();
        db = FirebaseFirestore.getInstance();

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

        for (String locality : CobrerosConstants.LOCALITIES) {
            CheckBox localityCheckBox = new CheckBox(this);
            localityCheckBox.setText(locality);
            localityCheckBox.setTag(locality);
            localityCheckBox.setTextSize(16);
            localityCheckBox.setPadding(16, 8, 16, 8);
            localitiesLayout.addView(localityCheckBox);
        }

        notificationConsentCheckBox.setChecked(true);
        registerButton.setOnClickListener(v -> registerUser());
        backToLoginButton.setOnClickListener(v -> finish());
    }

    private void registerUser() {
        if (!validateFields()) {
            return;
        }

        String nombre = nombreEditText.getText().toString().trim();
        String apellidos = apellidosEditText.getText().toString().trim();
        String email = emailEditText.getText().toString().trim();
        String telefono = telefonoEditText.getText().toString().trim();
        String password = passwordEditText.getText().toString();
        boolean notificationConsent = notificationConsentCheckBox.isChecked();
        List<String> selectedLocalities = getSelectedLocalities();

        if (selectedLocalities.isEmpty()) {
            Toast.makeText(this, "Selecciona al menos una localidad", Toast.LENGTH_SHORT).show();
            return;
        }

        registerButton.setEnabled(false);
        registerButton.setText("Registrando...");

        mAuth.createUserWithEmailAndPassword(email, password)
                .addOnCompleteListener(this, task -> {
                    if (task.isSuccessful()) {
                        FirebaseUser user = mAuth.getCurrentUser();
                        if (user != null) {
                            saveUserToFirestore(user.getUid(), nombre, apellidos, email, telefono,
                                    notificationConsent, selectedLocalities);
                        }
                    } else {
                        registerButton.setEnabled(true);
                        registerButton.setText("Registrarse");
                        Toast.makeText(this, "Error: " + task.getException().getMessage(),
                                Toast.LENGTH_LONG).show();
                    }
                });
    }

    private void saveUserToFirestore(String uid, String nombre, String apellidos, String email,
                                     String telefono, boolean notificationConsent, List<String> localities) {
        Map<String, Object> userData = new HashMap<>();
        userData.put("nombre", nombre);
        userData.put("apellidos", apellidos);
        userData.put("email", email);
        userData.put("telefono", telefono);
        userData.put("notificationConsent", notificationConsent);
        userData.put("localities", localities);
        userData.put("fcmToken", "");
        userData.put("registeredFrom", "APK_VECINOS");
        userData.put("registrationDate", System.currentTimeMillis());

        db.collection("users").document(uid)
                .set(userData)
                .addOnSuccessListener(aVoid -> {
                    Toast.makeText(this, "Registro completado", Toast.LENGTH_SHORT).show();
                    FcmTokenHelper.syncTokenIfLoggedIn();
                    Intent intent = new Intent(this, VecinosHomeActivity.class);
                    intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TASK);
                    startActivity(intent);
                    finish();
                })
                .addOnFailureListener(e -> {
                    registerButton.setEnabled(true);
                    registerButton.setText("Registrarse");
                    Toast.makeText(this, "Error al guardar: " + e.getMessage(), Toast.LENGTH_LONG).show();
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

    private boolean validateFields() {
        String nombre = nombreEditText.getText().toString().trim();
        String apellidos = apellidosEditText.getText().toString().trim();
        String email = emailEditText.getText().toString().trim();
        String telefono = telefonoEditText.getText().toString().trim();
        String password = passwordEditText.getText().toString();
        String confirmPassword = confirmPasswordEditText.getText().toString();

        if (TextUtils.isEmpty(nombre)) {
            nombreEditText.setError("Obligatorio");
            return false;
        }
        if (TextUtils.isEmpty(apellidos)) {
            apellidosEditText.setError("Obligatorio");
            return false;
        }
        if (TextUtils.isEmpty(email) || !android.util.Patterns.EMAIL_ADDRESS.matcher(email).matches()) {
            emailEditText.setError("Email no válido");
            return false;
        }
        if (TextUtils.isEmpty(telefono)) {
            telefonoEditText.setError("Obligatorio");
            return false;
        }
        if (TextUtils.isEmpty(password) || password.length() < 6) {
            passwordEditText.setError("Mínimo 6 caracteres");
            return false;
        }
        if (!password.equals(confirmPassword)) {
            confirmPasswordEditText.setError("No coinciden");
            return false;
        }
        return true;
    }
}
