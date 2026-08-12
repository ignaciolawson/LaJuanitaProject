package com.lajuanita.backend.config;

import java.util.Arrays;
import java.util.Base64;
import java.util.List;

import javax.crypto.SecretKey;
import javax.crypto.spec.SecretKeySpec;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.env.Environment;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.core.DelegatingOAuth2TokenValidator;
import org.springframework.security.oauth2.core.OAuth2Error;
import org.springframework.security.oauth2.core.OAuth2TokenValidator;
import org.springframework.security.oauth2.core.OAuth2TokenValidatorResult;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtIssuerValidator;
import org.springframework.security.oauth2.jwt.JwtTimestampValidator;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.security.oauth2.jwt.NimbusJwtEncoder;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationConverter;
import org.springframework.security.oauth2.server.resource.authentication.JwtGrantedAuthoritiesConverter;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import com.nimbusds.jose.jwk.source.ImmutableSecret;

/**
 * Seguridad de la API: contraseñas con BCrypt y credencial firmada (JWT) con
 * clave simétrica.
 *
 * <p>La firma la hace y la verifica Spring Security con su propio soporte JWT.
 * Acá no hay ningún filtro escrito a mano: el parseo del header
 * {@code Authorization}, el token vencido y el token manipulado los maneja
 * {@code oauth2ResourceServer}, que es código probado por mucha más gente que
 * este proyecto.
 */
@Configuration
@EnableWebSecurity
// Sin esto, un @PreAuthorize en un controller COMPILA Y NO HACE NADA: el
// método queda desprotegido y parece protegido, que es la peor combinación.
// Se habilita ahora, antes de que exista el primer endpoint de administración,
// para que nadie lo descubra tarde.
@EnableMethodSecurity
@EnableConfigurationProperties(PropiedadesJwt.class)
public class SeguridadConfig {

    private static final Logger log = LoggerFactory.getLogger(SeguridadConfig.class);

    /**
     * El secreto que viene commiteado en {@code application.properties}.
     *
     * <p>Está acá para poder detectarlo: cualquiera que tenga acceso al repo lo
     * conoce, así que un despliegue que lo use permite fabricar un token de
     * ADMIN sin saber ninguna contraseña.
     */
    private static final String SECRETO_DE_DESARROLLO =
            "/zMQejZCLzic/mq1/t7FtpUcOsj+h0NVWf/ndnfXs6146QEfzCdoiWOFasioULoq";

    private final List<String> origenesPermitidos;

    public SeguridadConfig(@Value("${lajuanita.cors.origenes}") List<String> origenesPermitidos) {
        this.origenesPermitidos = origenesPermitidos;
    }

    /**
     * BCrypt: lento a propósito y con sal incluida en el propio hash. Es
     * irreversible -- nadie, ni el admin, puede leer la contraseña de nadie. Si
     * alguien la olvida, se resetea.
     */
    @Bean
    PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    SecretKey claveDeFirma(PropiedadesJwt propiedades, Environment ambiente) {
        byte[] bytes = Base64.getDecoder().decode(propiedades.secreto());
        if (bytes.length < 32) {
            throw new IllegalStateException(
                    "lajuanita.jwt.secreto tiene que dar al menos 32 bytes al decodificar de Base64 "
                            + "(HS256 lo exige); dio " + bytes.length + ".");
        }

        if (SECRETO_DE_DESARROLLO.equals(propiedades.secreto())) {
            boolean pareceProduccion = Arrays.stream(ambiente.getActiveProfiles())
                    .anyMatch(perfil -> perfil.equalsIgnoreCase("prod")
                            || perfil.equalsIgnoreCase("produccion"));

            if (pareceProduccion) {
                throw new IllegalStateException("""
                        Se está usando el secreto JWT de DESARROLLO, que está commiteado en el \
                        repositorio, con un perfil de producción activo. Cualquiera con acceso \
                        al repo podría fabricar un token de ADMIN. Definí la variable de entorno \
                        JWT_SECRET con un valor propio (Base64, >=32 bytes) antes de arrancar.""");
            }

            log.warn("""
                    ⚠️  Firmando los tokens con el secreto JWT de DESARROLLO, que está commiteado \
                    en el repositorio. Sirve para trabajar local; en cualquier entorno accesible \
                    desde afuera hay que definir JWT_SECRET.""");
        }

        return new SecretKeySpec(bytes, "HmacSHA256");
    }

    @Bean
    JwtEncoder jwtEncoder(SecretKey claveDeFirma) {
        return new NimbusJwtEncoder(new ImmutableSecret<>(claveDeFirma));
    }

    @Bean
    JwtDecoder jwtDecoder(SecretKey claveDeFirma, PropiedadesJwt propiedades) {
        NimbusJwtDecoder decodificador = NimbusJwtDecoder.withSecretKey(claveDeFirma)
                .macAlgorithm(MacAlgorithm.HS256)
                .build();

        // El validador por defecto NO exige que el token declare vencimiento:
        // solo lo controla si está presente. Un token sin `exp` valdría para
        // siempre. Acá se exige `exp` y también `iss`.
        decodificador.setJwtValidator(new DelegatingOAuth2TokenValidator<>(
                new JwtTimestampValidator(),
                new JwtIssuerValidator(propiedades.emisor()),
                exigeVencimiento()));

        return decodificador;
    }

    private OAuth2TokenValidator<Jwt> exigeVencimiento() {
        return token -> token.getExpiresAt() != null
                ? OAuth2TokenValidatorResult.success()
                : OAuth2TokenValidatorResult.failure(new OAuth2Error(
                        "invalid_token", "El token no declara vencimiento.", null));
    }

    /**
     * Traduce el claim {@code rol} del token a la autoridad que entiende Spring
     * Security. El claim trae un único valor ("ADMIN"), no una lista, y el
     * converter lo resuelve igual.
     *
     * <p>El prefijo {@code ROLE_} es el que hace funcionar
     * {@code hasRole("ADMIN")} en los controllers que vengan después.
     */
    @Bean
    JwtAuthenticationConverter jwtAuthenticationConverter() {
        JwtGrantedAuthoritiesConverter autoridades = new JwtGrantedAuthoritiesConverter();
        autoridades.setAuthoritiesClaimName("rol");
        autoridades.setAuthorityPrefix("ROLE_");

        JwtAuthenticationConverter converter = new JwtAuthenticationConverter();
        converter.setJwtGrantedAuthoritiesConverter(autoridades);
        return converter;
    }

    @Bean
    SecurityFilterChain cadenaDeFiltros(HttpSecurity http, JwtAuthenticationConverter conversor) throws Exception {
        return http
                // Sin CSRF: no hay cookies de sesión. La credencial viaja en el
                // header Authorization, que un formulario de otro sitio no puede
                // poner, así que el ataque que CSRF previene no aplica.
                .csrf(csrf -> csrf.disable())
                .cors(Customizer.withDefaults())
                .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> auth
                        // Único endpoint abierto: pedir la credencial.
                        .requestMatchers(HttpMethod.POST, "/api/auth/login").permitAll()
                        // El preflight de CORS viaja sin Authorization por definición.
                        .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                        // /error NO es un endpoint: es el reenvío interno al que
                        // Spring manda cualquier error. Si queda autenticado, un
                        // JSON mal formado contra el login (400) o un método
                        // equivocado (405) vuelven como un 401 vacío, escondiendo
                        // el error real y mintiéndole al front.
                        .requestMatchers("/error").permitAll()
                        .anyRequest().authenticated())
                .oauth2ResourceServer(oauth -> oauth
                        .jwt(jwt -> jwt.jwtAuthenticationConverter(conversor)))
                .build();
    }

    @Bean
    CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();
        config.setAllowedOrigins(origenesPermitidos);
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        config.setAllowedHeaders(List.of("Authorization", "Content-Type"));
        // El token va en un header, no en una cookie: el navegador no necesita
        // mandar credenciales de origen cruzado.
        config.setAllowCredentials(false);

        UrlBasedCorsConfigurationSource fuente = new UrlBasedCorsConfigurationSource();
        fuente.registerCorsConfiguration("/api/**", config);
        return fuente;
    }
}
