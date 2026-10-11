# Revisiones antes de imprimir el libro

Lista de lo que conviene revisar en `La-Juanita-Studio-Entrega-Final.pdf` antes de mandarlo a imprenta. Va de lo más importante a lo menos. Tachá cada punto a medida que lo revises.

> **Cómo pedir cambios:** no edites el `.docx` a mano todavía. `fuente/libro.py` lo regenera desde cero y pisaría cualquier cambio. Anotá el cambio acá o pasámelo, y se hace en `fuente/partes/`. Cuando todo esté cerrado, el Word queda para retoques finales.

---

## 1. Prueba de impresión (lo primero)

Imprimí estas páginas sueltas, a doble faz y en la impresora o imprenta definitiva, antes de imprimir el libro entero:

- [ ] **Portada y página del índice**: que el abanico se vea nítido y que el índice no tenga números de página raros.
- [ ] **Una portadilla de parte** (por ejemplo, "II. Informe de Relevamiento"): que quede en una página impar (la derecha) y sin número.
- [ ] **Figura 6 (flujo de la reserva) y Figura 7 (secuencia del alta de una reserva)**: son los diagramas más anchos y la letra queda en unos 6 pt. Si cuesta leerlos impresos, hay dos salidas: ponerlos en una página apaisada como el Gantt, o pasarlos a las láminas en cartulina.
- [ ] **El Gantt (Parte VII)**: está en una página apaisada. Hablá con la imprenta para saber hacia qué lado lo encuadernan. Está armado con el margen grande arriba, pensando en que el borde superior va al lomo.
- [ ] **Una página del diccionario (Parte VIII)**: las tablas van en 9 pt. Que se lean bien.
- [ ] **El margen del lomo**: el interior tiene 3,5 cm. Preguntale a la imprenta si les alcanza para tapa dura cosida. Algunas piden más.

Ojo con lo siguiente al mandarlo a imprimir:
- **Las páginas en blanco son a propósito.** Cada parte arranca en una página impar, así que a veces queda una par vacía antes. La imprenta tiene que imprimirlas, no saltearlas.
- **Todo está en escala de grises**, así que no hace falta pagar impresión color.

## 2. Datos que puse yo y tenés que confirmar

- [ ] **Portada**:
  - "Ingeniería Informática, Universidad del Salvador — Sede Pilar", "Seminario de Integración Profesional" y los profesores Azul de León Aboy, Martín Machain y Ciro Nievas. Los saqué de tus borradores de junio, así que revisá nombres y acentos.
  - La fecha dice "Diciembre de 2026".
  - Fijate si la cátedra pide un formato de carátula propio.
- [ ] **Tabla 1 (datos de la empresa)**: tiene el teléfono real del estudio (+54 9 11 5310-8738). ¿Está bien que vaya impreso? Saqué la fila del CUIT, que estaba vacía.
- [ ] **Actores**: la dirección incluye a Bautista Najles, igual que en el original.
- [ ] **Propuesta comercial**:
  - El total pasó a **$8.250.000** porque se sumó el sitio web ($900.000).
  - En la firma dice "Cargo: Desarrollador".
  - El servidor y el dominio quedan a cargo del estudio.
- [ ] **Gantt**:
  - Lo anterior a agosto lo ubiqué por la fecha de los documentos:
    - Relevamiento: S1 a S3.
    - Redacción del informe: S3 y S4. Revisión: S5.
    - Propuesta técnica: S6 a S9. Propuesta comercial: S9 a S11. Revisión de las propuestas: S11 y S12.
  - Las pruebas funcionales van de la S21 a la S26: son las rondas de mejoras y el barrido de seguridad.
  - El manual de usuario está planificado entre la S30 y la S34. Ajustalo si lo vas a hacer en otras semanas.

## 3. Contenido que agregué y no estaba en el original

Esto lo escribí para que el relevamiento justifique lo que después hace el sistema. Leelo con atención, porque es contenido nuevo:

- [ ] **Problema 9** y **Necesidad 8**: la pérdida de consultas y la falta de un canal propio. Justifican la landing y el buzón.
- [ ] **Proceso 9**: el alquiler de cabina y la grabación de sets.
- [ ] **Limitación 3**: los datos de la entrevista que se corrigieron después (las salas y Córdoba).
- [ ] **Actores nuevos**: los clientes externos y los artistas del sello.
- [ ] **Figura 1**: el proceso actual de inscripción, redibujado en blanco y negro.
- [ ] **Figura 2**: el diagrama de arquitectura, que es nuevo.

## 4. La propuesta técnica contra la realidad

La escribí contra el código y la documentación. Lo que más conviene leer es lo que describe cómo se usa el sistema en el estudio:

- [ ] El **circuito descriptivo** de cada módulo: los pasos numerados.
- [ ] Las **validaciones y lógica** de cada módulo.
- [ ] **"Perfil de usuario"**: dice que la foto, la biografía y el estado de presencia quedan para una extensión futura. Las columnas existen en la base, pero ninguna pantalla las usa.
- [ ] **"Despliegue"**: dice que se evaluaron Oracle Cloud y DigitalOcean. **Si para diciembre el sistema ya está publicado, hay que cambiarlo** para decir dónde quedó.
- [ ] **Números que cambian si el sistema cambia**: 31 tablas, 38 migraciones, cerca de 780 / 700 / 400 pruebas. Si se agrega una migración antes de imprimir, también hay que regenerar el diccionario y las láminas.

## 5. Planilla de tiempos (Parte VI)

- [ ] **Las unidades están mezcladas**: hay valores con minutos (1:30 h, 9:35 h) y otros con decimales (0,6 h, que son 36 minutos). Conviene pasar todo a un solo formato, por ejemplo 0:36 h.
- [ ] **El total real dice "—"** y las filas 21 y 22 también. Hay que completarlas cuando termines el manual y la presentación.
- [ ] **La diferencia entre estimado y real en el desarrollo es muy grande**: el Módulo 1 se estimó en 48 h y tiene 1 h real. Un evaluador lo va a preguntar. Pensá si querés agregar una nota que explique cómo se midió o con qué herramientas se desarrolló.

## 6. Formato APA y de la cátedra

- [ ] **Justificado**: el texto va justificado, como pide la cátedra, aunque APA 7 dice alineado a la izquierda. Las referencias quedaron a la izquierda, porque las URL largas justificadas abren huecos.
- [ ] **Índice**: muestra tres niveles (partes, secciones y subsecciones) y es largo. Si la cátedra lo prefiere más corto, se baja a dos niveles.
- [ ] **Diccionario**: sus 31 tablas no llevan rótulo "Tabla N", sino el nombre de la tabla como título. Fue a propósito, para no sumar 31 rótulos iguales. Confirmá que la cátedra lo acepta.
- [ ] **Referencias**: la mayoría son documentación web sin fecha ("s.f."). Fijate si la cátedra pide fecha de consulta.
- [ ] **Índices de figuras y de tablas**: no hay. APA no los exige para trabajos de estudiantes, pero algunas cátedras los piden. Se agregan en un minuto.
- [ ] **Encabezados de página**: en las pares va el título del libro y en las impares, el nombre de la parte. Confirmá que no molesta.

## 7. Último paso antes de imprenta

- [ ] Regenerar con `python docs/EntregaFinal/fuente/libro.py` y `pwsh docs/EntregaFinal/fuente/exportar.ps1`.
- [ ] Abrir el PDF y recorrer el índice: los números de página tienen que coincidir.
- [ ] Mandar a imprenta el **PDF**, no el Word: el Word puede reacomodar páginas en otra computadora si no tiene la misma versión o las mismas fuentes.
