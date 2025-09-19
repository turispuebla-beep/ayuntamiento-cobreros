package com.turisteam.ayuntamientocobreros;

import android.os.Bundle;
import android.widget.TextView;
import androidx.appcompat.app.AppCompatActivity;

public class UserDashboardActivity extends AppCompatActivity {

    private TextView welcomeText;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_user_dashboard);

        welcomeText = findViewById(R.id.welcomeText);
        
        // Obtener datos del usuario desde el intent
        String userName = getIntent().getStringExtra("userName");
        if (userName != null) {
            welcomeText.setText("Bienvenido, " + userName);
        } else {
            welcomeText.setText("Bienvenido al Ayuntamiento de Cobreros");
        }
    }
}

