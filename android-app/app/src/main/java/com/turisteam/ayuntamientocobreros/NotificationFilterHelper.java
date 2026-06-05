package com.turisteam.ayuntamientocobreros;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/** Misma lógica que isNotificationForUserLocalities en la web. */
public final class NotificationFilterHelper {

    private NotificationFilterHelper() {}

    public static boolean isForUser(Map<String, Object> data, List<String> userLocalities) {
        List<String> targets = getTargetPueblos(data);
        String scope = data.get("scope") != null ? String.valueOf(data.get("scope")) : "";
        boolean isGeneral = targets.isEmpty() || "general".equals(scope);
        if (isGeneral) {
            return true;
        }
        if (userLocalities == null || userLocalities.isEmpty()) {
            return false;
        }
        for (String target : targets) {
            if (userLocalities.contains(target)) {
                return true;
            }
        }
        return false;
    }

    @SuppressWarnings("unchecked")
    public static List<String> getTargetPueblos(Map<String, Object> data) {
        List<String> result = new ArrayList<>();
        Object raw = data.get("targetPueblos");
        if (raw == null) {
            raw = data.get("localities");
        }
        if (raw instanceof List) {
            for (Object item : (List<?>) raw) {
                if (item != null) {
                    String s = String.valueOf(item).trim();
                    if (!s.isEmpty()) {
                        result.add(s);
                    }
                }
            }
        } else if (raw instanceof String) {
            String s = ((String) raw).trim();
            if (!s.isEmpty()) {
                for (String part : s.split(",")) {
                    String p = part.trim();
                    if (!p.isEmpty()) {
                        result.add(p);
                    }
                }
            }
        }
        return result;
    }
}
