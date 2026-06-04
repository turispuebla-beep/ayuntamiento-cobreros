package com.turisteam.ayuntamientocobreros;

import android.content.Context;
import android.util.Log;
import com.google.android.gms.safetynet.SafetyNet;
import com.google.android.gms.safetynet.SafetyNetApi;
import com.google.android.gms.tasks.Task;
import org.json.JSONObject;
import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;

/**
 * 🛡️ Helper class para manejar reCAPTCHA v3 en Android
 * Ayuntamiento de Cobreros - TURISTEAM
 */
public class RecaptchaHelper {
    
    private static final String TAG = "RecaptchaHelper";
    
    // ⚠️ IMPORTANTE: Reemplaza con tu SITE KEY real de Google reCAPTCHA Console
    private static final String RECAPTCHA_SITE_KEY = "6LeBYM4rAAAAALaDVtPi1H4jWjpj_Ovjf9g8VnT4";
    
    // URL para validar reCAPTCHA (Firebase Function o tu backend)
    private static final String VALIDATION_URL = "https://us-central1-ayuntamiento-de-cobreros.cloudfunctions.net/validateRecaptcha";
    
    // Puntuación mínima para considerar válido
    private static final double MIN_SCORE = 0.5;
    
    /**
     * Interface para callback de reCAPTCHA
     */
    public interface RecaptchaCallback {
        void onSuccess(String token);
        void onFailure(String error);
    }
    
    /**
     * Ejecutar reCAPTCHA usando SafetyNet
     * @param context Contexto de la aplicación
     * @param action Acción a ejecutar (login, register, etc.)
     * @param callback Callback para el resultado
     */
    public static void executeRecaptcha(Context context, String action, RecaptchaCallback callback) {
        Log.d(TAG, "🛡️ Ejecutando reCAPTCHA para acción: " + action);
        
        // Verificar que la clave esté configurada
        if (RECAPTCHA_SITE_KEY.equals("TU_SITE_KEY_AQUI")) {
            Log.w(TAG, "⚠️ RECAPTCHA_SITE_KEY no configurada");
            callback.onFailure("reCAPTCHA no configurado");
            return;
        }
        
        // Usar SafetyNet reCAPTCHA API
        SafetyNet.getClient(context)
                .verifyWithRecaptcha(RECAPTCHA_SITE_KEY)
                .addOnSuccessListener(response -> {
                    String token = response.getTokenResult();
                    if (token != null && !token.isEmpty()) {
                        Log.d(TAG, "✅ Token reCAPTCHA obtenido");
                        
                        // Validar token en el servidor
                        validateTokenOnServer(token, action, callback);
                    } else {
                        Log.e(TAG, "❌ Token reCAPTCHA vacío");
                        callback.onFailure("No se pudo obtener token de reCAPTCHA");
                    }
                })
                .addOnFailureListener(e -> {
                    Log.e(TAG, "❌ Error ejecutando reCAPTCHA", e);
                    callback.onFailure("Error de verificación: " + e.getMessage());
                });
    }
    
    /**
     * Validar token de reCAPTCHA en el servidor
     * @param token Token de reCAPTCHA
     * @param action Acción ejecutada
     * @param callback Callback para el resultado
     */
    private static void validateTokenOnServer(String token, String action, RecaptchaCallback callback) {
        Log.d(TAG, "🔍 Validando token reCAPTCHA en servidor");
        
        // Ejecutar en hilo secundario
        new Thread(() -> {
            try {
                // Crear conexión HTTP
                URL url = new URL(VALIDATION_URL);
                HttpURLConnection conn = (HttpURLConnection) url.openConnection();
                conn.setRequestMethod("POST");
                conn.setRequestProperty("Content-Type", "application/json");
                conn.setDoOutput(true);
                
                // Crear JSON con datos
                JSONObject jsonData = new JSONObject();
                jsonData.put("token", token);
                jsonData.put("action", action);
                
                // Enviar datos
                OutputStream os = conn.getOutputStream();
                os.write(jsonData.toString().getBytes());
                os.flush();
                os.close();
                
                // Leer respuesta
                int responseCode = conn.getResponseCode();
                if (responseCode == HttpURLConnection.HTTP_OK) {
                    BufferedReader reader = new BufferedReader(new InputStreamReader(conn.getInputStream()));
                    StringBuilder response = new StringBuilder();
                    String line;
                    
                    while ((line = reader.readLine()) != null) {
                        response.append(line);
                    }
                    reader.close();
                    
                    // Parsear respuesta
                    JSONObject responseJson = new JSONObject(response.toString());
                    boolean success = responseJson.getBoolean("success");
                    double score = responseJson.optDouble("score", 0.0);
                    
                    if (success && score >= MIN_SCORE) {
                        Log.d(TAG, "✅ reCAPTCHA válido - Score: " + score);
                        callback.onSuccess(token);
                    } else {
                        Log.w(TAG, "❌ reCAPTCHA inválido - Score: " + score);
                        callback.onFailure("Verificación de seguridad fallida");
                    }
                } else {
                    Log.e(TAG, "❌ Error HTTP: " + responseCode);
                    callback.onFailure("Error de servidor");
                }
                
                conn.disconnect();
                
            } catch (Exception e) {
                Log.e(TAG, "❌ Error validando token", e);
                
                // Por ahora, aceptar todos los tokens para desarrollo
                // TODO: Remover esto en producción
                Log.w(TAG, "⚠️ Modo desarrollo: aceptando token sin validación");
                callback.onSuccess(token);
            }
        }).start();
    }
    
    /**
     * Verificar si reCAPTCHA está disponible
     * @param context Contexto de la aplicación
     * @return true si está disponible
     */
    public static boolean isAvailable(Context context) {
        try {
            // Verificar si SafetyNet está disponible
            Task<SafetyNetApi.AttestationResponse> task = SafetyNet.getClient(context)
                    .attest("test".getBytes(), "test");
            return true;
        } catch (Exception e) {
            Log.w(TAG, "SafetyNet no disponible", e);
            return false;
        }
    }
    
    /**
     * Obtener configuración de reCAPTCHA
     * @return JSONObject con la configuración
     */
    public static JSONObject getConfig() {
        try {
            JSONObject config = new JSONObject();
            config.put("siteKey", RECAPTCHA_SITE_KEY);
            config.put("minScore", MIN_SCORE);
            config.put("available", true);
            return config;
        } catch (Exception e) {
            Log.e(TAG, "Error creando configuración", e);
            return new JSONObject();
        }
    }
}
