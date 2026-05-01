# Cuestionario pre-asesoría 1:1

Documento borrador para revisar mañana. Pensado para que los clientes lo
rellenen entre que pagan y la sesión, así Reinaldo llega con el contexto
hecho y la asesoría empieza directa al grano.

**Filosofía:** preguntas concretas, accionables, sin palabra de relleno.
Que duela un poco contestar bien (eso ya filtra al cliente serio del
curioso), pero no tanto que abandone a la mitad. Estimación: 10–15 min.

Si una pregunta te parece intrusiva o sobrante, táchala. Si te falta algo,
añadilo al final.

---

## 1. Lo básico

1. **Nombre y nombre artístico** *(si los dos son distintos)*
2. **Email de contacto**
3. **WhatsApp / Telegram** *(opcional, por si te quiero mandar un audio antes)*
4. **¿En qué nicho creas contenido?** *(deportivo, comedia, lifestyle, finanzas…)*

## 2. Tus redes — pásame el link de cada una

5. **Instagram:**
6. **TikTok:**
7. **YouTube:**
8. **Threads / X:**
9. **Otras** *(Twitch, Kick, Telegram, blog…)*

## 3. Métricas de los últimos 3 meses

> No me importa si los números son bajos. Me importa que sean reales y
> que tú los entiendas. Si no los conoces, déjalo en blanco — uno de los
> objetivos de la asesoría es enseñarte a leerlos.

10. **Seguidores totales** *(suma de todas las redes)*
11. **Tu red principal** y cuántos seguidores tiene
12. **Visualizaciones promedio del último mes** *(en tu red principal)*
13. **¿Estás creciendo, plano o cayendo?**
14. **Engagement rate aprox.** *(likes + comentarios) / impresiones*

## 4. Tu top 3

> Pásame los 3 videos que MÁS te han funcionado en los últimos 6 meses.
> Pegando el link directo es suficiente — yo los abro y los veo.

15. **Video 1:** *(URL)*
    - ¿Por qué crees que funcionó?
16. **Video 2:** *(URL)*
    - ¿Por qué crees que funcionó?
17. **Video 3:** *(URL)*
    - ¿Por qué crees que funcionó?

## 5. Tu peor frustración

18. **Pásame un video que esperabas que funcionara y NO funcionó:** *(URL)*
    - ¿Qué crees que falló?
19. **Si pudieras arreglar UNA cosa de tu cuenta hoy, ¿qué sería?**
    *(ej. mi guion, mi voz en cámara, mi edición, mi consistencia…)*

## 6. Producción

20. **¿Con qué grabas?** *(móvil, cámara, OBS…)*
21. **¿Editas tú o alguien más?**
22. **¿Con qué editor?** *(CapCut, Premiere, DaVinci, Final Cut…)*
23. **¿Cuánto tardas, de media, en hacer un video de principio a fin?**
24. **Equipamiento que tengas** *(luz, micro, trípode, prompter…)*

## 7. Tu objetivo

25. **¿Qué quieres conseguir con tus redes?**
    *(monetizar directo, vender producto, comunidad, marca personal, contratos
    de marca, llegar a TV/podcasts…)*
26. **¿Plazo realista?** *(6 meses, 1 año, 2 años…)*
27. **¿Cuál es el próximo número que quieres alcanzar?**
    *(ej. 10K seguidores, 1M views, primer patrocinio, primer ingreso de X…)*

## 8. Referentes

28. **3 creadores que te inspiran:**
    - 1.
    - 2.
    - 3.
29. **¿Qué de ellos quieres replicar?** *(formato, edición, voz, frecuencia,
    mood, otra cosa)*

## 9. Frecuencia y consistencia

30. **¿Con qué frecuencia subes en tu red principal?**
31. **¿Tienes contenido editado pendiente de publicar?** *(sí / no, cuántas
    piezas)*
32. **¿Cuál es tu mayor bloqueo para subir más?** *(tiempo, ideas, miedo, edición…)*

## 10. La sesión

33. **3 cosas CONCRETAS que quieres llevarte de la asesoría:**
    - 1.
    - 2.
    - 3.
34. **¿Algo que NO quieras tocar?** *(ej. "no me critiques mi voz", "evita
    hablar de presupuesto"…)*

## 11. Logística

35. **Idioma preferido para la sesión:** español / catalán / inglés
36. **Horario que mejor te encaja:** mañanas / tarde / noche / fin de semana
37. **¿Algo más que quieras decirme antes de la sesión?**

---

## Notas de implementación (para mañana)

Tres formas de delivery posibles, ordenadas por esfuerzo:

### A) Google Form (10 min)
- Crear el form copy/paste de las preguntas, configurar para que las
  respuestas lleguen a tu email.
- Mandar el link **automáticamente desde Cal.com** (en la confirmación
  de cita hay un campo "additional notes" donde puedes pegar el link).
- **Pro:** cero código, mantenimiento cero.
- **Contra:** marca de Google, no encaja con la estética de la web.

### B) Página propia `/asesorias/cuestionario` (1-2h)
- Form en Next.js con todas las preguntas.
- Las respuestas se guardan en una tabla `consultations_intake` en Supabase
  + se te envía email vía Resend con el resumen.
- Acceso protegido: solo se puede llegar con un `session_id` de Stripe
  válido (igual que `/asesorias/agendar`).
- **Pro:** look & feel coherente, todo en tu BD.
- **Contra:** más código que mantener.

### C) Híbrido (recomendado)
- Página propia (B) pero con CTA "preferir Google Form? aquí" (A) por si
  alguien lo abandonará por molestia.
- En el email post-pago: link al cuestionario propio.
- En Cal.com booking confirmation: mismo link como recordatorio.

---

## Email recordatorio (texto borrador)

> **Asunto:** Tu asesoría está reservada · prepárame esto antes
>
> Hola [Nombre],
>
> Confirmado el pago y la cita para [fecha] a las [hora]. Para que la
> sesión vaya al grano, **antes** de vernos rellena este cuestionario:
>
> 👉 [link al cuestionario]
>
> Tarda 10-15 min. Cuanta más info, más útil te resulta la sesión —
> llegaré con tus videos vistos y los puntos a tocar mapeados.
>
> Si tienes dudas, contesta a este email.
>
> Nos vemos.
> — Reinaldo
