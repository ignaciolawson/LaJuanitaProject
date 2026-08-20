package com.lajuanita.backend.mastering.dto;

/**
 * Liberar el premaster.
 *
 * <p><b>El motivo es opcional, y ahí está toda la regla.</b> Con un pago
 * registrado no hace falta explicar nada: el trigger de `V1` §8.4 encuentra el
 * pago y deja pasar. Sin pago, el motivo es lo único que hace que la base acepte —
 * y queda escrito quién liberó y por qué.
 *
 * <p>Esa salida existe porque un bloqueo sin salida se esquiva por afuera del
 * sistema. Ghezz lo dijo con todas las letras: <i>"con gente cercana soy más
 * flexible"</i>. Si liberar sin pago fuera imposible, el archivo saldría por
 * WhatsApp y el sistema quedaría mintiendo. Cuesta una frase escrita, que es el
 * mismo diseño que la anulación de un pago (`V7`) y la baja de nivel (`V9`).
 */
public record LiberacionRequest(String motivo) {
}
