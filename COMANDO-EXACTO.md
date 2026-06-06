# ✅ COMANDO CORRECTO

## 🚨 **ERROR COMÚN**

Comando incorrecto (sin espacio):
```powershell
cd "C:\Users\USUARIO\Desktop\COBREROS\TU AYUNTAMIENTO\ayuntamiento-cobreros"firebase deploy...
                                                                               ^
                                                                               Falta espacio aquí
```

---

## ✅ **COMANDO CORRECTO**

Debe haber un **espacio** entre `ayuntamiento-cobreros` y `firebase`:

```powershell
cd "C:\Users\USUARIO\Desktop\COBREROS\TU AYUNTAMIENTO\ayuntamiento-cobreros"
firebase deploy --only functions:sendPushNotification
```

**Nota**: Son **2 líneas separadas**, no una sola.

---

## 📋 **PASOS CORRECTOS**

### **Opción 1: Líneas separadas** (Recomendado)

Ejecuta esto en PowerShell, **línea por línea**:

```powershell
cd "C:\Users\USUARIO\Desktop\COBREROS\TU AYUNTAMIENTO\ayuntamiento-cobreros"
```

Presiona Enter y espera a que cambie el directorio.

Luego ejecuta:
```powershell
firebase deploy --only functions:sendPushNotification
```

---

### **Opción 2: Con &&**

Si prefieres hacerlo en una sola línea:

```powershell
cd "C:\Users\USUARIO\Desktop\COBREROS\TU AYUNTAMIENTO\ayuntamiento-cobreros"; firebase deploy --only functions:sendPushNotification
```

**Nota**: Usa `;` en PowerShell, no `&&`.

---

## ✅ **VERIFICAR QUE FUNCIONA**

Después de ejecutar el primer comando, deberías ver:

```
PS C:\Users\USUARIO\Desktop\COBREROS\TU AYUNTAMIENTO\ayuntamiento-cobreros>
```

Si ves esto, entonces el cambio de directorio funcionó. Ahora ejecuta el segundo comando.

---

## 🆘 **SI SIGUE SIN FUNCIONAR**

Si aún tienes problemas, verifica que la carpeta existe:

```powershell
dir "C:\Users\USUARIO\Desktop\COBREROS\TU AYUNTAMIENTO\ayuntamiento-cobreros"
```

Si ves archivos (index.html, functions, js, etc.), entonces el directorio existe.

---

**¡Prueba con DOS comandos separados!** 🚀




