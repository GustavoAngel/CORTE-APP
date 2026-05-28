# CORTE — Tracker de Transformación

**80 días. Sin excusas.**

Tracker personal de transformación física: peso diario, macros, entrenamiento y progreso. Funciona como PWA (instalable en tu celular).

---

## Cómo subir a GitHub Pages

### 1. Crea el repositorio
- Ve a [github.com/new](https://github.com/new)
- Nombre: `corte` (o el que quieras)
- Público
- Crea el repositorio

### 2. Sube los archivos
Desde tu computadora, abre la terminal en la carpeta del proyecto y ejecuta:

```bash
git init
git add .
git commit -m "CORTE v1"
git branch -M main
git remote add origin https://github.com/TU_USUARIO/corte.git
git push -u origin main
```

### 3. Activa GitHub Pages
- Ve a tu repositorio → **Settings** → **Pages**
- Source: **Deploy from a branch**
- Branch: `main` → carpeta `/root`
- Guarda

### 4. Tu app estará en:
```
https://TU_USUARIO.github.io/corte/
```

### 5. Instala en tu celular
- Abre esa URL en Chrome (Android) o Safari (iPhone)
- Android: toca el menú ⋮ → "Agregar a pantalla de inicio"
- iPhone: toca el botón compartir → "Agregar a pantalla de inicio"

---

## Estructura del proyecto

```
corte/
├── index.html      ← App principal
├── app.js          ← Toda la lógica
├── style.css       ← Estilos
├── manifest.json   ← Config PWA
├── sw.js           ← Service Worker (offline)
└── icons/
    ├── icon-192.png
    └── icon-512.png
```

---

## Tus datos
- **Macros diarios:** 2,550 kcal · 185g proteína · 285g carbos · 75g grasas
- **Peso inicial:** 82 kg
- **Meta:** 74–76 kg al 15 de agosto de 2026
- **Los datos se guardan en tu dispositivo** (localStorage). Nadie más los ve.
