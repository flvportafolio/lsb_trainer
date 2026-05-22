# Plan: Guardar e Implementar Entrenador Web LSB

## Resumen
Crear una aplicacion web nueva en `C:\laragon\www\lsb_trainer` para practicar Lengua de Senas Boliviana usando Vue 3 Composition API, Vite 8, Vuetify 3 y TypeScript.

La aplicacion tendra una interfaz principal de practica con camara a pantalla completa, panel lateral izquierdo con palabras a realizar, subtitulo inferior translucido con la palabra reconocida y overlay de manos con puntos y lineas. Tambien tendra una interfaz de entrenamiento para capturar ejemplos de senas, guardar el modelo localmente, exportarlo a JSON e importarlo para practicar.

## Implementacion
- Crear scaffold del proyecto con Vite, Vue 3, Vuetify, TypeScript y estructura modular.
- Implementar dos vistas:
  - `/practicar`: camara full-screen, panel izquierdo de palabras, ticks verdes, subtitulo inferior translucido y overlay de manos.
  - `/entrenar`: camara, creacion de palabras, captura por rafagas guiadas, conteo de muestras, guardado local, exportacion/importacion JSON.
- Integrar deteccion de manos con MediaPipe Tasks Vision.
- Dibujar landmarks de manos con 21 puntos y conexiones por mano sobre un canvas sincronizado con la camara.
- Extraer landmarks normalizados y clasificarlos con KNN local para poses estaticas.
- Persistir el modelo en IndexedDB y soportar export/import JSON versionado.
- Mostrar `...` cuando la confianza no supere el umbral.
- Levantar servidor de desarrollo al final y entregar la URL local.

## Pruebas
- Verificar build del proyecto.
- Probar camara, overlay de manos y navegacion.
- Entrenar al menos una palabra y confirmar persistencia tras recarga.
- Exportar/importar JSON y confirmar que el modelo se restaura.
- Confirmar que la practica marca palabras reconocidas y muestra `...` con baja confianza.

## Supuestos
- Todo sera frontend local, sin backend.
- La lista de practica viene de palabras creadas en entrenamiento.
- La practica sera en orden libre.
- La v1 reconocera poses estaticas, no movimientos temporales.
