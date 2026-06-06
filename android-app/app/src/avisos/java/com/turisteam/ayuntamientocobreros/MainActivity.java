package com.turisteam.ayuntamientocobreros;

import android.content.Intent;
import android.os.Bundle;
import androidx.appcompat.app.AppCompatActivity;
import com.google.firebase.auth.FirebaseAuth;
import com.google.firebase.auth.FirebaseUser;

/** Arranque app envío de avisos (personal autorizado). */
public class MainActivity extends AppCompatActivity {

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_splash);

        FirebaseUser user = FirebaseAuth.getInstance().getCurrentUser();
        if (user == null) {
            goLogin();
            return;
        }

        AdminAuthHelper.verifyCurrentUserIsAdmin(new AdminAuthHelper.AdminCheckCallback() {
            @Override
            public void onAdmin(String displayName) {
                goPanel();
            }

            @Override
            public void onNotAdmin(String reason) {
                FirebaseAuth.getInstance().signOut();
                goLogin();
            }

            @Override
            public void onError(String message) {
                goLogin();
            }
        });
    }

    private void goLogin() {
        startActivity(new Intent(this, AdminLoginActivity.class));
        finish();
    }

    private void goPanel() {
        startActivity(new Intent(this, AdminPanelActivity.class));
        finish();
    }
}
