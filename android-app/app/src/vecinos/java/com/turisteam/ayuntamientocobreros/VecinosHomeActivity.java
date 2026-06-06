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
import com.google.firebase.firestore.SetOptions;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Date;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

/** Lista de avisos del ayuntamiento filtrados por localidades del vecino. */
public class VecinosHomeActivity extends AppCompatActivity {

    private ListView listView;
    private TextView emptyText;
    private ProgressBar progressBar;
    private final List<NotificationItem> items = new ArrayList<>();
    private ArrayAdapter<String> adapter;
    private List<String> userLocalities = new ArrayList<>();
    private Set<String> readBroadcastIds = new HashSet<>();

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
                    readBroadcastIds = parseReadBroadcastIds(doc);
                    UnreadNotificationsHelper.mergeReadBroadcastIds(this, readBroadcastIds);
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

    @SuppressWarnings("unchecked")
    private Set<String> parseReadBroadcastIds(DocumentSnapshot doc) {
        Set<String> ids = new HashSet<>();
        if (doc != null && doc.exists()) {
            Object raw = doc.get("readBroadcastNotificationIds");
            if (raw instanceof List) {
                for (Object o : (List<?>) raw) {
                    if (o != null) {
                        ids.add(String.valueOf(o));
                    }
                }
            }
        }
        return ids;
    }

    private void loadNotifications() {
        String uid = FirebaseAuth.getInstance().getCurrentUser().getUid();
        readBroadcastIds = UnreadNotificationsHelper.getReadBroadcastIds(this);

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
                        NotificationItem item = NotificationItem.from(
                                doc.getId(), data, uid, readBroadcastIds);
                        items.add(item);
                        labels.add(item.formatLabel());
                    }
                    adapter.clear();
                    adapter.addAll(labels);
                    adapter.notifyDataSetChanged();
                    progressBar.setVisibility(View.GONE);
                    emptyText.setVisibility(items.isEmpty() ? View.VISIBLE : View.GONE);
                    syncUnreadBadge();
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
        markNotificationRead(item);
        Intent intent = new Intent(this, NotificationDetailActivity.class);
        intent.putExtra("notification_id", item.id);
        intent.putExtra("notification_title", item.title);
        intent.putExtra("notification_message", item.message);
        intent.putExtra("notification_type", item.type);
        intent.putExtra("notification_localities", item.localitiesLabel);
        intent.putExtra("has_attachments", item.hasAttachments);
        intent.putExtra("attachment_url", item.attachmentUrl);
        intent.putExtra("attachment_type", item.attachmentType);
        startActivity(intent);
    }

    private void syncUnreadBadge() {
        int unread = 0;
        for (NotificationItem item : items) {
            if (item.unread) {
                unread++;
            }
        }
        UnreadNotificationsHelper.saveBadgeCount(this, unread);
        if (getSupportActionBar() != null) {
            getSupportActionBar().setTitle(unread > 0 ? "Mis avisos (" + unread + ")" : "Mis avisos");
        }
    }

    private void markNotificationRead(NotificationItem item) {
        if (item == null || !item.unread) {
            return;
        }
        String uid = FirebaseAuth.getInstance().getCurrentUser().getUid();
        if (uid != null && uid.equals(item.userId)) {
            FirebaseFirestore.getInstance().collection("notifications").document(item.id)
                    .update("read", true);
        } else {
            UnreadNotificationsHelper.markBroadcastRead(this, item.id);
            Map<String, Object> patch = new HashMap<>();
            patch.put("readBroadcastNotificationIds",
                    new ArrayList<>(UnreadNotificationsHelper.getReadBroadcastIds(this)));
            FirebaseFirestore.getInstance().collection("users").document(uid)
                    .set(patch, SetOptions.merge());
        }
        item.unread = false;
        refreshAdapterLabels();
        syncUnreadBadge();
    }

    private void refreshAdapterLabels() {
        List<String> labels = new ArrayList<>();
        for (NotificationItem item : items) {
            labels.add(item.formatLabel());
        }
        adapter.clear();
        adapter.addAll(labels);
        adapter.notifyDataSetChanged();
    }

    static final class NotificationItem {
        final String id;
        final String userId;
        final String title;
        final String message;
        final String type;
        final String localitiesLabel;
        final boolean hasAttachments;
        final String attachmentUrl;
        final String attachmentType;
        final String dateStr;
        boolean unread;

        NotificationItem(String id, String userId, String title, String message, String type,
                         String localitiesLabel, boolean hasAttachments, String attachmentUrl,
                         String attachmentType, String dateStr, boolean unread) {
            this.id = id;
            this.userId = userId;
            this.title = title;
            this.message = message;
            this.type = type;
            this.localitiesLabel = localitiesLabel;
            this.hasAttachments = hasAttachments;
            this.attachmentUrl = attachmentUrl;
            this.attachmentType = attachmentType;
            this.dateStr = dateStr;
            this.unread = unread;
        }

        String formatLabel() {
            String prefix = unread ? "● " : "";
            String clip = hasAttachments ? " 📎" : "";
            return prefix + title + clip + "\n" + truncate(message, 80) + "\n" + dateStr;
        }

        static NotificationItem from(String id, Map<String, Object> data, String uid,
                                     Set<String> readBroadcastIds) {
            String title = stringVal(data.get("title"), "Aviso del ayuntamiento");
            String message = stringVal(data.get("message"), "");
            String type = stringVal(data.get("type"), "general");
            String docUserId = data.get("userId") != null ? String.valueOf(data.get("userId")) : "";
            boolean unread = UnreadNotificationsHelper.isUnread(data, id, uid, readBroadcastIds);
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
            return new NotificationItem(id, docUserId, title, message, type, locLabel,
                    hasAttachments, attachmentUrl, attachmentType, date, unread);
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
