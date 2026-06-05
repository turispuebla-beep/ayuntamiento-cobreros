package com.turisteam.ayuntamientocobreros;

import android.content.Intent;
import android.os.Bundle;
import android.view.Menu;
import android.view.MenuItem;
import android.view.View;
import android.widget.AdapterView;
import android.widget.ArrayAdapter;
import android.widget.ListView;
import android.widget.ProgressBar;
import android.widget.TextView;
import android.widget.Toast;
import androidx.appcompat.app.AppCompatActivity;
import com.google.firebase.auth.FirebaseAuth;
import com.google.firebase.firestore.DocumentSnapshot;
import com.google.firebase.firestore.FirebaseFirestore;
import com.google.firebase.firestore.Query;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Date;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

/** Lista de avisos del ayuntamiento filtrados por localidades del vecino. */
public class VecinosHomeActivity extends AppCompatActivity {

    private ListView listView;
    private TextView emptyText;
    private ProgressBar progressBar;
    private final List<NotificationItem> items = new ArrayList<>();
    private ArrayAdapter<String> adapter;
    private List<String> userLocalities = new ArrayList<>();

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_vecinos_home);

        if (FirebaseAuth.getInstance().getCurrentUser() == null) {
            startActivity(new Intent(this, VecinosMainActivity.class));
            finish();
            return;
        }

        listView = findViewById(R.id.notificationsListView);
        emptyText = findViewById(R.id.emptyText);
        progressBar = findViewById(R.id.progressBar);

        adapter = new ArrayAdapter<>(this, android.R.layout.simple_list_item_1, new ArrayList<>());
        listView.setAdapter(adapter);
        listView.setOnItemClickListener(this::openDetail);

        if (getSupportActionBar() != null) {
            getSupportActionBar().setTitle("Mis avisos");
            getSupportActionBar().setDisplayHomeAsUpEnabled(false);
        }
    }

    @Override
    protected void onResume() {
        super.onResume();
        FcmTokenHelper.syncTokenIfLoggedIn();
        loadUserAndNotifications();
    }

    @Override
    public boolean onCreateOptionsMenu(Menu menu) {
        getMenuInflater().inflate(R.menu.menu_vecinos, menu);
        return true;
    }

    @Override
    public boolean onOptionsItemSelected(MenuItem item) {
        int id = item.getItemId();
        if (id == R.id.action_localities) {
            startActivity(new Intent(this, VecinosLocalitiesActivity.class));
            return true;
        }
        if (id == R.id.action_logout) {
            FirebaseAuth.getInstance().signOut();
            startActivity(new Intent(this, VecinosMainActivity.class));
            finish();
            return true;
        }
        return super.onOptionsItemSelected(item);
    }

    private void loadUserAndNotifications() {
        progressBar.setVisibility(View.VISIBLE);
        emptyText.setVisibility(View.GONE);

        String uid = FirebaseAuth.getInstance().getCurrentUser().getUid();
        FirebaseFirestore.getInstance().collection("users").document(uid).get()
                .addOnSuccessListener(doc -> {
                    userLocalities = parseLocalities(doc);
                    loadNotifications();
                })
                .addOnFailureListener(e -> {
                    progressBar.setVisibility(View.GONE);
                    Toast.makeText(this, "Error cargando perfil", Toast.LENGTH_SHORT).show();
                });
    }

    @SuppressWarnings("unchecked")
    private List<String> parseLocalities(DocumentSnapshot doc) {
        List<String> list = new ArrayList<>();
        if (doc != null && doc.exists()) {
            Object raw = doc.get("localities");
            if (raw instanceof List) {
                for (Object o : (List<?>) raw) {
                    if (o != null) {
                        list.add(String.valueOf(o));
                    }
                }
            }
        }
        return list;
    }

    private void loadNotifications() {
        FirebaseFirestore.getInstance().collection("notifications")
                .orderBy("timestamp", Query.Direction.DESCENDING)
                .limit(50)
                .get()
                .addOnSuccessListener(snapshot -> {
                    items.clear();
                    List<String> labels = new ArrayList<>();
                    for (DocumentSnapshot doc : snapshot.getDocuments()) {
                        Map<String, Object> data = doc.getData();
                        if (data == null) {
                            continue;
                        }
                        if (!NotificationFilterHelper.isForUser(data, userLocalities)) {
                            continue;
                        }
                        NotificationItem item = NotificationItem.from(doc.getId(), data);
                        items.add(item);
                        labels.add(item.listLabel);
                    }
                    adapter.clear();
                    adapter.addAll(labels);
                    adapter.notifyDataSetChanged();
                    progressBar.setVisibility(View.GONE);
                    emptyText.setVisibility(items.isEmpty() ? View.VISIBLE : View.GONE);
                })
                .addOnFailureListener(e -> {
                    progressBar.setVisibility(View.GONE);
                    emptyText.setVisibility(View.VISIBLE);
                    emptyText.setText("No se pudieron cargar los avisos");
                });
    }

    private void openDetail(AdapterView<?> parent, View view, int position, long id) {
        if (position < 0 || position >= items.size()) {
            return;
        }
        NotificationItem item = items.get(position);
        Intent intent = new Intent(this, NotificationDetailActivity.class);
        intent.putExtra("notification_title", item.title);
        intent.putExtra("notification_message", item.message);
        intent.putExtra("notification_type", item.type);
        intent.putExtra("notification_localities", item.localitiesLabel);
        intent.putExtra("has_attachments", item.hasAttachments);
        intent.putExtra("attachment_url", item.attachmentUrl);
        intent.putExtra("attachment_type", item.attachmentType);
        startActivity(intent);
    }

    static final class NotificationItem {
        final String id;
        final String title;
        final String message;
        final String type;
        final String localitiesLabel;
        final boolean hasAttachments;
        final String attachmentUrl;
        final String attachmentType;
        final String listLabel;

        NotificationItem(String id, String title, String message, String type, String localitiesLabel,
                         boolean hasAttachments, String attachmentUrl, String attachmentType, String listLabel) {
            this.id = id;
            this.title = title;
            this.message = message;
            this.type = type;
            this.localitiesLabel = localitiesLabel;
            this.hasAttachments = hasAttachments;
            this.attachmentUrl = attachmentUrl;
            this.attachmentType = attachmentType;
            this.listLabel = listLabel;
        }

        static NotificationItem from(String id, Map<String, Object> data) {
            String title = stringVal(data.get("title"), "Aviso del ayuntamiento");
            String message = stringVal(data.get("message"), "");
            String type = stringVal(data.get("type"), "general");
            List<String> locs = NotificationFilterHelper.getTargetPueblos(data);
            String locLabel = locs.isEmpty() ? "Todo el municipio" : String.join(", ", locs);
            String attachmentUrl = null;
            if (data.get("attachmentUrl") != null) {
                attachmentUrl = String.valueOf(data.get("attachmentUrl"));
            } else if (data.get("documentUrl") != null) {
                attachmentUrl = String.valueOf(data.get("documentUrl"));
            }
            boolean hasAttachments = Boolean.TRUE.equals(data.get("hasAttachments"))
                    || (attachmentUrl != null && !attachmentUrl.isEmpty());
            String attachmentType = stringVal(data.get("attachmentType"), "document");
            String date = formatDate(data.get("timestamp"));
            String clip = hasAttachments ? " 📎" : "";
            String listLabel = title + clip + "\n" + truncate(message, 80) + "\n" + date;
            return new NotificationItem(id, title, message, type, locLabel, hasAttachments,
                    attachmentUrl, attachmentType, listLabel);
        }

        private static String stringVal(Object o, String fallback) {
            return o != null ? String.valueOf(o) : fallback;
        }

        private static String truncate(String s, int max) {
            if (s == null) {
                return "";
            }
            return s.length() <= max ? s : s.substring(0, max - 1) + "…";
        }

        private static String formatDate(Object timestamp) {
            try {
                if (timestamp instanceof com.google.firebase.Timestamp) {
                    Date d = ((com.google.firebase.Timestamp) timestamp).toDate();
                    return new SimpleDateFormat("dd/MM/yyyy HH:mm", Locale.getDefault()).format(d);
                }
                if (timestamp instanceof Long) {
                    return new SimpleDateFormat("dd/MM/yyyy HH:mm", Locale.getDefault())
                            .format(new Date((Long) timestamp));
                }
            } catch (Exception ignored) {
            }
            return "";
        }
    }
}
