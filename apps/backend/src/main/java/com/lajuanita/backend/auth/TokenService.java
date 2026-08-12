package com.lajuanita.backend.auth;

import java.time.Instant;

import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.stereotype.Service;

import com.lajuanita.backend.config.PropiedadesJwt;
import com.lajuanita.backend.usuario.Usuario;

/** Emite la credencial firmada que después verifica Spring Security sola. */
@Service
public class TokenService {

    private final JwtEncoder encoder;
    private final PropiedadesJwt propiedades;

    public TokenService(JwtEncoder encoder, PropiedadesJwt propiedades) {
        this.encoder = encoder;
        this.propiedades = propiedades;
    }

    /**
     * Firma un token para este usuario.
     *
     * <p>Lleva lo mínimo indispensable: quién sos ({@code sub}) y qué podés
     * administrar ({@code rol}). Nada que cambie seguido y nada sensible -- el
     * contenido de un JWT va firmado pero NO encriptado, así que cualquiera que
     * tenga el token puede leer los claims.
     */
    public TokenEmitido emitirPara(Usuario usuario) {
        Instant ahora = Instant.now();
        Instant expira = ahora.plus(propiedades.duracion());

        JwtClaimsSet claims = JwtClaimsSet.builder()
                // El mismo emisor que exige el validador de SeguridadConfig.
                // Sale de la configuración para que no puedan desincronizarse.
                .issuer(propiedades.emisor())
                .issuedAt(ahora)
                .expiresAt(expira)
                .subject(String.valueOf(usuario.getId()))
                .claim("rol", usuario.getRol().name())
                .build();

        // Hay que declarar HS256 explícitamente. Sin header, NimbusJwtEncoder
        // asume RS256 (firma asimétrica) y falla con "Failed to select a JWK
        // signing key", porque la clave configurada es simétrica.
        JwsHeader cabecera = JwsHeader.with(MacAlgorithm.HS256).build();

        String valor = encoder.encode(JwtEncoderParameters.from(cabecera, claims)).getTokenValue();
        return new TokenEmitido(valor, expira);
    }

    /** Un token recién firmado y su vencimiento. */
    public record TokenEmitido(String valor, Instant expira) {
    }
}
