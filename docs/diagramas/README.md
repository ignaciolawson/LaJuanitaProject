# Diagramas y documentación formal

Hechos el 2026-10-09/10 sobre el esquema **hasta `V38`** y el código de ese momento. **No se regeneran solos**: si una migración agrega una tabla o una columna, o cambia un proceso, el diagrama que la muestra queda viejo hasta que alguien lo rehaga.

Todos van en blanco, negro y gris. Las líneas son ortogonales, ninguna corre encima de otra y los cruces llevan un salto. Los tres de base de datos (relacional, entidad-relación y clases) son grandes a propósito: van impresos en cartulina.

| Archivo | Qué muestra |
|---|---|
| `casos-de-uso.png` | Actores (los cuatro roles, alumno, profesor, visitante de la landing, avisos automáticos) y los casos núcleo del sistema |
| `flujo-inscripcion.png` | Inscripción a un curso: activa con seña o beca, preinscripta 24 h sin ella, aviso al vencer, cancelación a los 21 días |
| `flujo-reserva.png` | Reserva de sala: sala × uso, superposición y bloqueos, nadie en dos salas, curso activo para una clase, seña o prereserva de 72 h |
| `flujo-mix-mastering.png` | Ciclo de un trabajo de M&M y la regla del premaster (se libera con el precio cubierto o por excepción firmada) |
| `secuencia-login.png` | Login: límite de intentos, mismo 401 para los tres rechazos, temporal vencida a los 7 días, JWT de 8 h o 30 días con "Recordarme" |
| `secuencia-alta-reserva.png` | Alta de una reserva con seña en una sola transacción, con la verificación de la plata al COMMIT |
| `relacional.png` | Las 31 tablas con todas sus columnas, PK/FK y relaciones en notación pata de gallo |
| `entidad-relacion.png` | Modelo conceptual en notación de Chen: 28 entidades, 49 relaciones con cardinalidad (mín, máx) y tipo 1:1 / 1:N / N:M |
| `clases.png` | Las 30 clases `@Entity` con atributos y métodos de dominio, y los 26 enums que usan |

El **diccionario de datos** está en `../db/diccionario-de-datos.xlsx`: las 356 columnas con campo, tipo, tamaño, requerido y descripción, más una hoja índice de tablas.

## Decisiones que no se ven en las imágenes

- **Las FK de auditoría no se dibujan como líneas** en el relacional, el entidad-relación ni el de clases. Son las de quién registra, anula, modifica, carga, invalida, resuelve, publica o libera, y todas apuntan a `usuario`. Siguen apareciendo como columnas o atributos; cada diagrama lo aclara en su referencia. Dibujadas serían unas 20 líneas más hacia el mismo lugar, sin información de negocio.
- **En el relacional, la FK compuesta de `reserva` y `solicitud_reserva` hacia `sala_tipo_uso` va como una sola línea.** Del lado de la tabla padre, las líneas salen solo del título, de la PK, de arriba o de abajo. Así no parecen apuntar a otra columna.
- **En el entidad-relación**:
  - `inscripcion_integrante`, `seguimiento_alumno` y `sala_tipo_uso` aparecen como relaciones N:M ("integra", "sigue", "admite") y no como entidades. Es lo que corresponde en un modelo conceptual.
  - `reserva_participante` sí queda como entidad (PARTICIPACIÓN), porque tiene relaciones propias.
  - Por entidad se muestran la clave y uno o dos atributos; el detalle está en el diccionario y en el relacional.
  - `PROGRAMA` no tiene relaciones, porque la inscripción copia el precio y no guarda una FK al programa.
- **En el de clases**:
  - Las relaciones van como una línea simple, sin multiplicidad ni símbolos, por pedido.
  - No se listan getters ni setters (los genera Lombok).
  - Atributos y métodos se extrajeron del código Java, no del esquema. Por eso, por ejemplo, `Pago` muestra `idTrabajoMastering: Long` donde el relacional dibuja una FK.
- **En el de reserva y el de secuencia del alta** el caso dibujado es un alquiler de cabina, el que lleva seña. Una clase no la lleva: su plata es la de la inscripción.

## Cómo se hicieron

- **Los seis de proceso** (casos de uso, flujo, secuencia) son PlantUML. Las fuentes están en `fuentes/`, con el estilo común en `fuentes/estilo.iuml`. Para regenerar uno sin instalar nada:

  ```bash
  sed -e '/!include estilo.iuml/{r docs/diagramas/fuentes/estilo.iuml' -e 'd}' \
      docs/diagramas/fuentes/flujo-reserva.puml \
    | docker run --rm -i plantuml/plantuml -pipe -tpng > docs/diagramas/flujo-reserva.png
  ```

  El estilo se inserta a mano porque Docker Desktop, en esta máquina, no puede montar el disco `D:`, así que el `!include` no encuentra el archivo dentro del contenedor.
- **Los tres grandes** (relacional, entidad-relación y clases) no tienen fuente en el repo. PlantUML y su motor ELK los dejaban enredados, así que se hicieron con un script propio en Python con Pillow: tablas ubicadas a mano, enrutado ortogonal en una grilla de 20 px y saltos en los cruces. Ese script quedó fuera del repo, por decisión. Si hace falta rehacer uno, lo que conviene repetir es el método:
  - **Relacional:** ubicar las tablas cerca de sus relaciones, con `usuario` (la que más tiene) en el centro, y enrutar en varios órdenes quedándose con el de menos largo y menos cruces.
  - **Entidad-relación:** enrutar cada relación como una línea entre las dos entidades, y apoyar el rombo después sobre un tramo recto libre. Ubicar primero los rombos y enrutar hacia ellos dio siempre peor resultado.
- **El diccionario de datos** se armó cruzando `information_schema` de la base (tipo, tamaño, nulos, PK/FK, valores de los CHECK, defaults) con descripciones escritas a mano. Tampoco quedó el generador. Para actualizarlo, la consulta de columnas y los CHECK de `../db/esquema-actual.sql` dan la parte estructural.
