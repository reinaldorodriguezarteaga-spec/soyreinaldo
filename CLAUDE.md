@AGENTS.md

# Notas para Claude

Lo operativo (stack, comandos, estructura, reglas anti-incidente, despliegue)
está en `AGENTS.md`, importado arriba: ese archivo lo leemos Codex y yo. Aquí,
solo lo mío.

> **El historial (incidentes, decisiones, estado de cada cosa) NO está aquí**:
> vive en la memoria del proyecto, cuyo índice se carga solo en cada sesión.
> Estos dos archivos son solo lo operativo: lo que hace falta para no romper nada.

## Herramientas de contexto

- **Memoria** (`~/.claude/projects/.../memory/`): el índice se carga solo; los
  archivos de tema se leen a demanda. Ahí va todo lo histórico.
- **graphify** (`graphify-out/`): grafo del código, OPCIONAL. Útil solo para
  preguntas de arquitectura ("qué depende de qué"). Para buscar dónde se usa
  algo, grep es más barato y más preciso. Si lo usas, primero
  `graphify update .` — se queda obsoleto enseguida.

## Reparto con Codex

Yo me quedo con entender el problema, planear, decidir la arquitectura y revisar
lo que vuelve. Esa parte no se delega.

La construcción repetitiva, los refactors grandes y los errores atorados van a
Codex. El pase lo hago yo con el subagente `codex-rescue`, por mi cuenta, sin
esperar a que me lo pidas.

Nada de lo que vuelve de Codex se da por bueno sin que yo lo revise. Te cuento
qué le pedí y qué volvió.

Si Codex falla dos veces en la misma tarea, la tarea regresa a mí. No hay tercera
vez.
