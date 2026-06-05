package com.turisteam.ayuntamientocobreros;

import android.os.Bundle;
import android.widget.Button;
import android.widget.CheckBox;
import android.widget.LinearLayout;
import android.widget.Toast;
import androidx.appcompat.app.AppCompatActivity;
import com.google.firebase.auth.FirebaseAuth;
import com.google.firebase.firestore.FirebaseFirestore;
import com.google.firebase.firestore.SetOptions;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/** Editar localidades para filtrar avisos y push. */
public class VecinosLocalitiesActivity extends AppCompatActivity {

    private LinearLayout localitiesLayout;
    private final List<CheckBox> boxes = new ArrayList<>();

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_vecinos_localities);
        localitiesLayout = findViewById(R.id.localitiesLayout);
        Button saveButton = findViewById(R.id.saveLocalitiesButton);

        for (String locality : CobrerosConstants.LOCALITIES) {
            CheckBox cb = new CheckBox(this);
            cb.setText(locality);
            cb.setTag(locality);
            cb.setPadding(16, 12, 16, 12);
            boxes.add(cb);
            localitiesLayout.addView(cb);
        }

        saveButton.setOnClickListener(v -> save());
        loadCurrent();
    }

    private void loadCurrent() {
        String uid = FirebaseAuth.getInstance().getCurrentUser().getUid();
        FirebaseFirestore.getInstance().collection("users").document(uid).get()
                .addOnSuccessListener(doc -> {
                    List<String> current = new ArrayList<>();
                    Object raw = doc.get("localities");
                    if (raw instanceof List) {
                        for (Object o : (List<?>) raw) {
                            if (o != null) {
                                current.add(String.valueOf(o));
                            }
                        }
                    }
                    for (CheckBox cb : boxes) {
                        cb.setChecked(current.contains(String.valueOf(cb.getTag())));
                    }
                });
    }

    private void save() {
        List<String> selected = new ArrayList<>();
        for (CheckBox cb : boxes) {
            if (cb.isChecked()) {
                selected.add(String.valueOf(cb.getTag()));
            }
        }
        if (selected.isEmpty()) {
            Toast.makeText(this, "Selecciona al menos una localidad", Toast.LENGTH_SHORT).show();
            return;
        }

        String uid = FirebaseAuth.getInstance().getCurrentUser().getUid();
        Map<String, Object> data = new HashMap<>();
        data.put("localities", selected);
        FirebaseFirestore.getInstance().collection("users").document(uid)
                .set(data, SetOptions.merge())
                .addOnSuccessListener(a -> {
                    Toast.makeText(this, "Localidades guardadas", Toast.LENGTH_SHORT).show();
                    finish();
                })
                .addOnFailureListener(e ->
                        Toast.makeText(this, "Error al guardar", Toast.LENGTH_SHORT).show()
                );
    }
}
