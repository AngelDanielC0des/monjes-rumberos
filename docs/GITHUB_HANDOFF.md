# GitHub handoff — Monjes Rumberos

Repositorio de destino confirmado: https://github.com/AngelDanielC0des/monjes-rumberos

- Repositorio existente, inicialmente vacío.
- Rama local preparada: `main`.
- El árbol de trabajo contiene el código, assets, documentación y pruebas del proyecto.
- El commit inicial conserva el proyecto completo; el commit de entrega incorpora los últimos resultados de Chromium y los ajustes del test runner.
- La conexión de GitHub disponible en el entorno confirma permisos de escritura, pero el runtime local no dispone de salida de red a `github.com`; por eso no ha sido posible ejecutar `git push` desde esta sesión.

## Publicar desde Windows

Se entrega `Monjes_Rumberos_Entrega_Final.bundle`, un Git bundle con el historial y la rama `main` completos. No hace falta inicializar otro repositorio ni copiar archivos manualmente.

1. Clona el bundle en una carpeta de trabajo:

   ```powershell
   git clone "C:\RUTA\Monjes_Rumberos_Entrega_Final.bundle" monjes-rumberos
   cd monjes-rumberos
   ```

2. Ejecuta el script incluido:

   ```powershell
   powershell -ExecutionPolicy Bypass -File .\PUSH_TO_GITHUB.ps1
   ```

3. Si Git Credential Manager lo solicita, completa el inicio de sesión de GitHub en el navegador. El script configura el remoto `origin` y publica `main`.

Destino configurado por el script:

`https://github.com/AngelDanielC0des/monjes-rumberos.git`

## Verificación previa

- `node --check` para los cuatro módulos JavaScript: PASS.
- `node tests/smoke-test.mjs`: PASS.
- `bash scripts/build-static.sh`: PASS.
- `python tests/browser-check.py`: PASS en Chromium para 2048, 1440, 1024, 768, 390 y 320 px.
- Se validan secciones full-bleed, fondos, carriles de contenido, performers, controles, reduced motion, menú móvil, formulario y ausencia de overflow horizontal.


## Assets incluidos en GitHub

El repositorio conserva los assets transparentes WebP optimizados, los ciclos WebP/GIF, los ocho fondos responsive y todos los archivos necesarios para construir y desplegar la landing. Los dos PNG maestros de trabajo de assets/source no forman parte del build público y no se incluyen en esta importación; no se sustituyen por conversiones WebP de menor calidad.
