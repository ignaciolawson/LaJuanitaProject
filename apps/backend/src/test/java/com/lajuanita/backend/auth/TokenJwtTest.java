package com.lajuanita.backend.auth;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Base64;

import javax.crypto.SecretKey;
import javax.crypto.spec.SecretKeySpec;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.security.oauth2.jwt.JwtException;
import org.springframework.security.oauth2.jwt.NimbusJwtEncoder;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationConverter;

import com.nimbusds.jose.jwk.source.ImmutableSecret;

/**
 * Auditoría del mecanismo JWT en sí: qué acepta y qué rechaza el decodificador,
 * y cómo se traduce el rol a autoridades de Spring Security.
 *
 * <p>Existe porque la primera versión aceptaba dos cosas que no debía --
 * tokens sin {@code exp} (valían para siempre) y tokens sin {@code iss} -- y
 * porque la conversión del claim {@code rol} a {@code ROLE_*} no estaba
 * probada por ningún lado, pese a ser de lo que van a depender todos los
 * permisos a partir del módulo de alumnos.
 */
@SpringBootTest
class TokenJwtTest {

    @Autowired
    private JwtDecoder decodificador;

    @Autowired
    private JwtEncoder codificador;

    @Autowired
    private JwtAuthenticationConverter conversor;

    @Autowired
    private TokenService tokens;

    // -- Lo que el decodificador tiene que ACEPTAR ---------------------------

    @Test
    void acepta_un_token_bien_formado_emitido_por_la_aplicacion() {
        Jwt token = decodificador.decode(firmar(reclamosValidos().build()));

        assertThat(token.getSubject()).isEqualTo("1");
        assertThat(token.getClaimAsString("rol")).isEqualTo("ADMIN");
        assertThat(token.getExpiresAt()).isNotNull();
    }

    // -- Lo que tiene que RECHAZAR ------------------------------------------

    /**
     * El validador por defecto de Spring solo controla {@code exp} si está
     * presente: un token que no lo declara pasaba y no vencía nunca.
     */
    @Test
    void rechaza_un_token_sin_vencimiento() {
        String sinExp = firmar(JwtClaimsSet.builder()
                .issuer("la-juanita")
                .issuedAt(Instant.now())
                .subject("1")
                .claim("rol", "ADMIN")
                .build());

        assertThatThrownBy(() -> decodificador.decode(sinExp))
                .isInstanceOf(JwtException.class);
    }

    @Test
    void rechaza_un_token_vencido() {
        Instant hace2h = Instant.now().minus(2, ChronoUnit.HOURS);
        String vencido = firmar(reclamosValidos()
                .issuedAt(hace2h)
                .expiresAt(hace2h.plus(1, ChronoUnit.HOURS))
                .build());

        assertThatThrownBy(() -> decodificador.decode(vencido))
                .isInstanceOf(JwtException.class);
    }

    @Test
    void rechaza_un_token_de_otro_emisor() {
        String ajeno = firmar(reclamosValidos().issuer("otro-sistema").build());

        assertThatThrownBy(() -> decodificador.decode(ajeno))
                .isInstanceOf(JwtException.class);
    }

    /** Firma hecha con otra clave: el caso del token fabricado por un tercero. */
    @Test
    void rechaza_un_token_firmado_con_otra_clave() {
        SecretKey claveAjena = new SecretKeySpec(new byte[48], "HmacSHA256");
        JwtEncoder otroCodificador = new NimbusJwtEncoder(new ImmutableSecret<>(claveAjena));

        String ajeno = otroCodificador.encode(JwtEncoderParameters.from(
                JwsHeader.with(MacAlgorithm.HS256).build(), reclamosValidos().build()))
                .getTokenValue();

        assertThatThrownBy(() -> decodificador.decode(ajeno))
                .isInstanceOf(JwtException.class);
    }

    /** El ataque clásico: cambiar el algoritmo a `none` para saltarse la firma. */
    @Test
    void rechaza_un_token_con_algoritmo_none() {
        String cabecera = base64url("{\"alg\":\"none\"}");
        String cuerpo = base64url(
                "{\"iss\":\"la-juanita\",\"sub\":\"1\",\"rol\":\"ADMIN\",\"exp\":"
                        + Instant.now().plusSeconds(3600).getEpochSecond() + "}");

        assertThatThrownBy(() -> decodificador.decode(cabecera + "." + cuerpo + "."))
                .isInstanceOf(JwtException.class);
    }

    @Test
    void rechaza_basura() {
        assertThatThrownBy(() -> decodificador.decode("no.es.un.token"))
                .isInstanceOf(JwtException.class);
    }

    // -- Autoridades --------------------------------------------------------

    /**
     * De esto dependen todos los {@code @PreAuthorize} que vengan. El claim
     * `rol` trae un único valor, no una lista, y tiene que salir con el prefijo
     * `ROLE_` o {@code hasRole("ADMIN")} no matchea nunca.
     *
     * <p>Ojo con una novedad de Spring Security 7: además de las autoridades
     * propias, agrega una {@code FactorGrantedAuthority} (acá,
     * {@code FACTOR_BEARER}) que describe *cómo* se autenticó la persona. Por
     * eso este test comprueba que la autoridad del rol esté presente y no que
     * sea la única -- un {@code containsExactly} rompe sin que haya nada mal.
     */
    @Test
    void el_claim_rol_se_convierte_en_la_autoridad_ROLE_correspondiente() {
        for (String rol : new String[] { "ADMIN", "DIRECTIVO", "STAFF", "USUARIO" }) {
            Jwt token = decodificador.decode(firmar(reclamosValidos().claim("rol", rol).build()));

            assertThat(conversor.convert(token).getAuthorities())
                    .extracting(GrantedAuthority::getAuthority)
                    .contains("ROLE_" + rol);
        }
    }

    /**
     * Un token sin `rol` autentica pero sin ninguna autoridad de rol. Es el
     * comportamiento correcto -- falla cerrado, no abierto -- y se deja fijado
     * acá para que nadie lo cambie sin darse cuenta.
     */
    @Test
    void un_token_sin_rol_no_otorga_ninguna_autoridad_de_rol() {
        JwtClaimsSet sinRol = JwtClaimsSet.builder()
                .issuer("la-juanita")
                .issuedAt(Instant.now())
                .expiresAt(Instant.now().plus(1, ChronoUnit.HOURS))
                .subject("1")
                .build();

        Jwt token = decodificador.decode(firmar(sinRol));

        assertThat(conversor.convert(token).getAuthorities())
                .extracting(GrantedAuthority::getAuthority)
                .noneMatch(autoridad -> autoridad.startsWith("ROLE_"));
    }

    // -- El token que emite la aplicación -----------------------------------

    /**
     * Un JWT va firmado pero NO encriptado: cualquiera que lo tenga puede leer
     * los claims. Este test fija que no llevamos nada de más ahí adentro.
     */
    @Test
    void el_token_emitido_no_lleva_datos_sensibles() {
        com.lajuanita.backend.usuario.Usuario usuario = new com.lajuanita.backend.usuario.Usuario();
        usuario.setId(42L);
        usuario.setNombreCompleto("Prueba");
        usuario.setEmail("prueba@lajuanita.local");
        usuario.setPasswordHash("$2a$10$noDebeAparecerEnElToken");
        usuario.setRol(com.lajuanita.backend.usuario.Rol.STAFF);

        Jwt token = decodificador.decode(tokens.emitirPara(usuario).valor());

        assertThat(token.getClaims()).containsOnlyKeys("iss", "iat", "exp", "sub", "rol");
        assertThat(token.getSubject()).isEqualTo("42");
        assertThat(token.getClaimAsString("rol")).isEqualTo("STAFF");
    }

    // -----------------------------------------------------------------------

    private JwtClaimsSet.Builder reclamosValidos() {
        Instant ahora = Instant.now();
        return JwtClaimsSet.builder()
                .issuer("la-juanita")
                .issuedAt(ahora)
                .expiresAt(ahora.plus(1, ChronoUnit.HOURS))
                .subject("1")
                .claim("rol", "ADMIN");
    }

    private String firmar(JwtClaimsSet reclamos) {
        return codificador.encode(JwtEncoderParameters.from(
                JwsHeader.with(MacAlgorithm.HS256).build(), reclamos)).getTokenValue();
    }

    private String base64url(String texto) {
        return Base64.getUrlEncoder().withoutPadding().encodeToString(texto.getBytes());
    }
}
