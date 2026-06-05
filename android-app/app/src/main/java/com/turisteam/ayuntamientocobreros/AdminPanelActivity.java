package com.turisteam.ayuntamientocobreros;

import android.content.Intent;
import android.os.Bundle;
import android.view.View;
import android.widget.ArrayAdapter;
import android.widget.Button;
import android.widget.CheckBox;
import android.widget.EditText;
import android.widget.LinearLayout;
import android.widget.Spinner;
import android.widget.TextView;
import android.widget.Toast;
import androidx.appcompat.app.AppCompatActivity;
import com.google.firebase.auth.FirebaseAuth;
import com.google.firebase.firestore.FirebaseFirestore;
import java.util.ArrayList;
import java.util.List;

/**
 * App de envío de avisos: push a PWA/web + banner público + historial Firestore.
 */
public class AdminPanelActivity extends AppCompatActivity {

    private EditText tituloEditText;
    private EditText mensajeEditText;
    private Spinner tipoSpinner;
    private Spinner alcanceSpinner;
    private LinearLayout localitiesLayout;
    private Button enviarButton;
    private TextView estadisticasTextView;
    private TextView adminNameTextView;
    private CheckBox bannerCheckBox;

    private final String[] localities = {
            "Cobreros", "Avedillo de Sanabria", "Barrio de Lomba", "Castro de Sanabria",
            "Limianos", "Quintana de Sanabria", "Riego de Lomba", "San Martín del Terroso",
            "San Miguel de Lomba", "San Román de Sanabria", "Santa Colomba", "Sotillo", "Terroso"
    };

    private static final String[] TIPO_LABELS = {
            "🚰 Corte de agua",
            "🚧 Corte de carretera",
            "🔧 Obras",
            "🚨 Emergencia",
            "ℹ️ Información general"
    };

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_admin_panel);

        AdminAuthHelper.verifyCurrentUserIsAdmin(new AdminAuthHelper.AdminCheckCallback() {
            @Override
            public void onAdmin(String displayName) {
                if (adminNameTextView != null) {
                    adminNameTextView.setText("Conectado: " + displayName);
                }
            }

            @Override
            public void onNotAdmin(String reason) {
                FirebaseAuth.getInstance().signOut();
                startActivity(new Intent(AdminPanelActivity.this, AdminLoginActivity.class));
                finish();
            }

            @Override
            public void onError(String message) {
                Toast.makeText(AdminPanelActivity.this, message, Toast.LENGTH_LONG).show();
            }
        });

        bindViews();
        setupSpinners();
        setupLocalities();
        setupPresets();
        setupListeners();
        loadStatistics();
    }

    private void bindViews() {
        tituloEditText = findViewById(R.id.tituloEditText);
        mensajeEditText = findViewById(R.id.mensajeEditText);
        tipoSpinner = findViewById(R.id.tipoSpinner);
        alcanceSpinner = findViewById(R.id.alcanceSpinner);
        localitiesLayout = findViewById(R.id.localitiesLayout);
        enviarButton = findViewById(R.id.enviarButton);
        estadisticasTextView = findViewById(R.id.estadisticasTextView);
        adminNameTextView = findViewById(R.id.adminNameTextView);
        bannerCheckBox = findViewById(R.id.bannerCheckBox);
        Button logoutButton = findViewById(R.id.logoutButton);
        if (logoutButton != null) {
            logoutButton.setOnClickListener(v -> {
                FirebaseAuth.getInstance().signOut();
                startActivity(new Intent(this, AdminLoginActivity.class));
                finish();
            });
        }
        if (bannerCheckBox != null) {
            bannerCheckBox.setChecked(true);
        }
    }

    private void setupSpinners() {
        ArrayAdapter<String> tipoAdapter = new ArrayAdapter<>(
                this, android.R.layout.simple_spinner_item, TIPO_LABELS);
        tipoAdapter.setDropDownViewResource(android.R.layout.simple_spinner_dropdown_item);
        tipoSpinner.setAdapter(tipoAdapter);

        String[] alcance = {"Todos los vecinos", "Localidades específicas"};
        ArrayAdapter<String> alcanceAdapter = new ArrayAdapter<>(
                this, android.R.layout.simple_spinner_item, alcance);
        alcanceAdapter.setDropDownViewResource(android.R.layout.simple_spinner_dropdown_item);
        alcanceSpinner.setAdapter(alcanceAdapter);
    }

    private void setupLocalities() {
        for (String locality : localities) {
            CheckBox checkBox = new CheckBox(this);
            checkBox.setText(locality);
            checkBox.setTag(locality);
            checkBox.setTextSize(16);
            checkBox.setPadding(16, 8, 16, 8);
            localitiesLayout.addView(checkBox);
        }
    }

    private void setupPresets() {
        Button presetAgua = findViewById(R.id.presetAguaButton);
        Button presetCarretera = findViewById(R.id.presetCarreteraButton);
        Button presetObras = findViewById(R.id.presetObrasButton);
        Button presetEmergencia = findViewById(R.id.presetEmergenciaButton);

        if (presetAgua != null) {
            presetAgua.setOnClickListener(v -> applyPreset(0,
                    "Corte de suministro de agua",
                    "Se informa de un corte de agua. Rogamos disculpen las molestias. El ayuntamiento informará cuando se restablezca el servicio."));
        }
        if (presetCarretera != null) {
            presetCarretera.setOnClickListener(v -> applyPreset(1,
                    "Corte de carretera",
                    "Por motivos de seguridad u obras, se informa de un corte temporal de carretera. Consulte desvíos alternativos."));
        }
        if (presetObras != null) {
            presetObras.setOnClickListener(v -> applyPreset(2,
                    "Obras en la vía",
                    "Se informa de obras en la vía pública. Se ruega precaución y seguir la señalización temporal."));
        }
        if (presetEmergencia != null) {
            presetEmergencia.setOnClickListener(v -> applyPreset(3,
                    "Aviso de emergencia",
                    "Aviso urgente del Ayuntamiento de Cobreros. Preste atención a las indicaciones oficiales."));
        }
    }

    private void applyPreset(int tipoIndex, String titulo, String mensaje) {
        tipoSpinner.setSelection(tipoIndex);
        tituloEditText.setText(titulo);
        mensajeEditText.setText(mensaje);
    }

    private void setupListeners() {
        enviarButton.setOnClickListener(v -> enviarAviso());
        Button seleccionarTodas = findViewById(R.id.seleccionarTodasButton);
        Button deseleccionarTodas = findViewById(R.id.deseleccionarTodasButton);
        if (seleccionarTodas != null) {
            seleccionarTodas.setOnClickListener(v -> setAllLocalities(true));
        }
        if (deseleccionarTodas != null) {
            deseleccionarTodas.setOnClickListener(v -> setAllLocalities(false));
        }
    }

    private void enviarAviso() {
        String titulo = tituloEditText.getText().toString().trim();
        String mensaje = mensajeEditText.getText().toString().trim();
        String alcance = alcanceSpinner.getSelectedItem().toString();
        List<String> localidades = getSelectedLocalities();

        if (titulo.isEmpty() || mensaje.isEmpty()) {
            Toast.makeText(this, "Escribe título y mensaje del aviso", Toast.LENGTH_SHORT).show();
            return;
        }
        if ("Localidades específicas".equals(alcance) && localidades.isEmpty()) {
            Toast.makeText(this, "Selecciona al menos una localidad", Toast.LENGTH_SHORT).show();
            return;
        }

        String pushType = mapPushType(tipoSpinner.getSelectedItemPosition());
        String bannerType = mapBannerType(tipoSpinner.getSelectedItemPosition());
        String priority = tipoSpinner.getSelectedItemPosition() == 3 ? "urgent" : "high";
        boolean showBanner = bannerCheckBox == null || bannerCheckBox.isChecked();
        List<String> locsForPush = "Localidades específicas".equals(alcance) ? localidades : new ArrayList<>();

        enviarButton.setEnabled(false);
        enviarButton.setText("Enviando...");

        AdminAuthHelper.getIdToken(new AdminAuthHelper.TokenCallback() {
            @Override
            public void onToken(String token) {
                PushNotificationClient.send(token, titulo, mensaje, pushType, locsForPush,
                        new PushNotificationClient.Callback() {
                            @Override
                            public void onSuccess(int sent, int failed, int total) {
                                runOnUiThread(() -> {
                                    AvisosRepository.saveNotificationHistory(
                                            titulo, mensaje, pushType, locsForPush, "APK_AVISOS", sent,
                                            new AvisosRepository.SimpleCallback() {
                                                @Override
                                                public void onSuccess() { /* historial ok */ }

                                                @Override
                                                public void onError(String message) {
                                                    Toast.makeText(AdminPanelActivity.this,
                                                            "Push enviado; historial: " + message,
                                                            Toast.LENGTH_LONG).show();
                                                }
                                            }
                                    );

                                    if (showBanner) {
                                        AvisosRepository.appendPublicBanner(bannerType, titulo, mensaje, priority,
                                                new AvisosRepository.SimpleCallback() {
                                                    @Override
                                                    public void onSuccess() { /* banner ok */ }

                                                    @Override
                                                    public void onError(String message) {
                                                        Toast.makeText(AdminPanelActivity.this,
                                                                "Push OK; banner web: " + message,
                                                                Toast.LENGTH_LONG).show();
                                                    }
                                                });
                                    }

                                    Toast.makeText(AdminPanelActivity.this,
                                            "✅ Aviso enviado a " + sent + " dispositivos" +
                                                    (failed > 0 ? " (" + failed + " fallos)" : ""),
                                            Toast.LENGTH_LONG).show();
                                    tituloEditText.setText("");
                                    mensajeEditText.setText("");
                                    setAllLocalities(false);
                                    restoreSendButton();
                                    loadStatistics();
                                });
                            }

                            @Override
                            public void onError(String message) {
                                runOnUiThread(() -> {
                                    Toast.makeText(AdminPanelActivity.this,
                                            "Error enviando push: " + message, Toast.LENGTH_LONG).show();
                                    restoreSendButton();
                                });
                            }
                        });
            }

            @Override
            public void onError(String message) {
                runOnUiThread(() -> {
                    Toast.makeText(AdminPanelActivity.this, message, Toast.LENGTH_LONG).show();
                    restoreSendButton();
                });
            }
        });
    }

    private String mapPushType(int index) {
        if (index == 3) return "emergencia";
        return "general";
    }

    private String mapBannerType(int index) {
        switch (index) {
            case 0: return "warning";
            case 1: return "closure";
            case 2: return "warning";
            case 3: return "emergency";
            default: return "info";
        }
    }

    private void restoreSendButton() {
        enviarButton.setEnabled(true);
        enviarButton.setText("📤 Enviar aviso a vecinos");
    }

    private List<String> getSelectedLocalities() {
        List<String> selected = new ArrayList<>();
        for (int i = 0; i < localitiesLayout.getChildCount(); i++) {
            View child = localitiesLayout.getChildAt(i);
            if (child instanceof CheckBox && ((CheckBox) child).isChecked()) {
                selected.add(child.getTag().toString());
            }
        }
        return selected;
    }

    private void setAllLocalities(boolean checked) {
        for (int i = 0; i < localitiesLayout.getChildCount(); i++) {
            View child = localitiesLayout.getChildAt(i);
            if (child instanceof CheckBox) {
                ((CheckBox) child).setChecked(checked);
            }
        }
    }

    private void loadStatistics() {
        FirebaseFirestore.getInstance()
                .collection("users")
                .whereEqualTo("notificationConsent", true)
                .get()
                .addOnCompleteListener(task -> {
                    if (task.isSuccessful() && task.getResult() != null) {
                        int withConsent = task.getResult().size();
                        estadisticasTextView.setText(
                                "Vecinos con notificaciones activas: " + withConsent +
                                        "\nLos avisos llegan a la PWA/web y al móvil (push).");
                    } else {
                        estadisticasTextView.setText("No se pudieron cargar estadísticas");
                    }
                });
    }
}
