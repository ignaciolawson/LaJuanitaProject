package com.lajuanita.backend.archivo;

import org.springframework.core.io.Resource;
import org.springframework.web.multipart.MultipartFile;

/**
 * La pieza intercambiable de §2.4: dónde viven los archivos del sistema.
 *
 * <p><b>Es una interfaz porque el destino real no está decidido</b> y no por
 * ceremonia. En desarrollo los archivos van a una carpeta; el deploy de octubre
 * puede terminar en un disco del VPS o en almacenamiento de objetos, y esa
 * decisión no debería obligar a tocar el módulo del sello ni el de pagos. Lo que
 * esta interfaz promete es lo único que sus dos usuarios necesitan: guardá esto y
 * devolveme cómo encontrarlo después.
 *
 * <p><b>Quién la necesita, y por qué recién ahora.</b> §2.4 la declaró desde el
 * principio y tres módulos la esquivaron: el 3 dejó pendiente la descarga de
 * comprobantes, el 5 mandó el material de clase por link, y el 6 lo hizo por
 * decisión del cliente (P23). El Módulo 7 no puede esquivarla: la regla dura es
 * <i>"no se publica un release sin contrato adjunto"</i> y un contrato es el
 * respaldo legal de un lanzamiento — un link al Drive de otro se cae, se mueve o
 * se revoca sin que el estudio se entere, y el sistema seguiría diciendo que está
 * todo bien. Ver §15 (P38).
 *
 * <h2>Dos cosas que esta interfaz decide y no son detalles</h2>
 *
 * <p><b>1 · El nombre con el que se guarda lo elige el sistema, no quien sube.</b>
 * {@link #guardar} devuelve una clave que no tiene nada que ver con el nombre
 * original. Un nombre que viene del cliente puede decir {@code ../../etc/passwd},
 * puede chocar con otro archivo, y puede traer caracteres que un sistema de
 * archivos acepta y otro no. El nombre original se guarda en la base, que es
 * donde sirve: para que la descarga se llame como el usuario espera.
 *
 * <p><b>2 · No hay forma de obtener una URL pública.</b> A propósito: un contrato
 * tiene datos de un tercero y no puede quedar en una ruta que se adivina o que se
 * comparte sin querer. Se lee con {@link #leer}, desde un endpoint que ya verificó
 * quién pregunta. Si algún día hay object storage, esto se implementa con una URL
 * firmada de vida corta — no cambiando esta firma.
 */
public interface Almacenamiento {

    /**
     * Guardar un archivo y devolver la clave para volver a encontrarlo.
     *
     * <p>La clave es lo que va a la columna {@code *_path} de la tabla que
     * corresponda. Es opaca: quien la guarda no debe interpretarla ni construirla.
     *
     * @param archivo  lo que llegó en el multipart
     * @param carpeta  agrupación lógica ({@code contratos}, {@code comprobantes}).
     *                 La elige el código, nunca el cliente.
     * @throws ArchivoInvalidoException si está vacío, si pesa de más o si su
     *                 contenido no es del tipo que dice ser
     */
    String guardar(MultipartFile archivo, String carpeta);

    /**
     * Leer un archivo guardado.
     *
     * @param clave lo que devolvió {@link #guardar}
     * @throws ArchivoInvalidoException si la clave no corresponde a nada guardado
     */
    Resource leer(String clave);

    /**
     * Borrar un archivo.
     *
     * <p><b>No lo llama ninguna regla del negocio</b> — en este esquema no se borra
     * ni un pago, ni una clase, ni un contrato. Existe para una sola cosa: limpiar
     * el archivo que quedó escrito cuando la transacción que iba a registrarlo se
     * cayó. Ver {@code AlmacenamientoEnDisco} sobre por qué ese huérfano es el
     * error barato de los dos.
     *
     * @return si había algo para borrar
     */
    boolean borrar(String clave);
}
