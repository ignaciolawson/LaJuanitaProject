package com.lajuanita.backend.auth;

import java.time.Duration;
import java.time.OffsetDateTime;
import java.util.UUID;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.lajuanita.backend.alumno.AlumnoRepository;
import com.lajuanita.backend.auth.TokenService.TokenEmitido;
import com.lajuanita.backend.config.LimitadorDeIntentos;
import com.lajuanita.backend.config.RegistroDeEventos;
import com.lajuanita.backend.profesor.ProfesorRepository;
import com.lajuanita.backend.usuario.Usuario;
import com.lajuanita.backend.usuario.UsuarioRepository;

/** Iniciar sesión y responder quién es el usuario que está pidiendo. */
@Service
public class SesionService {

    private final UsuarioRepository usuarios;
    private final AlumnoRepository alumnos;
    private final ProfesorRepository profesores;
    private final PasswordEncoder passwordEncoder;
    private final TokenService tokens;
    private final LimitadorDeIntentos limitador;
    private final RegistroDeEventos eventos;

    /**
     * Hash contra el que se compara cuando el email NO existe, para que ese
     * caso cueste lo mismo que una contraseña equivocada. Ver
     * {@link #iniciarSesion}.
     *
     * <p>Se calcula al arrancar sobre un valor aleatorio: así siempre es un
     * hash válido, con el mismo costo que el encoder configurado, y no hay una
     * constante en el código que alguien pueda reconocer.
     */
    private final String hashSenuelo;

    /**
     * Cuánto vale una contraseña temporal sin usar. Una semana da margen de
     * sobra para un WhatsApp y no tanto como para que quede colgada un mes.
     */
    private final Duration vigenciaDeLaTemporal;

    public SesionService(UsuarioRepository usuarios,
            AlumnoRepository alumnos,
            ProfesorRepository profesores,
            PasswordEncoder passwordEncoder,
            TokenService tokens,
            LimitadorDeIntentos limitador,
            RegistroDeEventos eventos,
            @Value("${lajuanita.password-temporal.vigencia:7d}") Duration vigenciaDeLaTemporal) {
        this.usuarios = usuarios;
        this.alumnos = alumnos;
        this.profesores = profesores;
        this.passwordEncoder = passwordEncoder;
        this.tokens = tokens;
        this.limitador = limitador;
        this.eventos = eventos;
        this.vigenciaDeLaTemporal = vigenciaDeLaTemporal;
        this.hashSenuelo = passwordEncoder.encode(UUID.randomUUID().toString());
    }

    /**
     * Valida las credenciales y devuelve la credencial firmada.
     *
     * <p>Los tres motivos de rechazo (mail inexistente, contraseña incorrecta,
     * usuario dado de baja) terminan en la misma excepción y el mismo mensaje:
     * ver {@link CredencialesInvalidasException}.
     *
     * <p><b>Y tardando aproximadamente lo mismo.</b> Que el cuerpo de la
     * respuesta sea idéntico no alcanza: si con un email inexistente se saliera
     * antes de comparar la contraseña, la respuesta llegaría en ~10 ms en vez
     * de ~85, y ese reloj dice exactamente lo que el mensaje se esfuerza por
     * callar -- qué direcciones tienen cuenta. Por eso, cuando el usuario no
     * existe, igual se compara contra {@link #hashSenuelo}: el trabajo de BCrypt
     * se hace siempre. <b>No hay que "optimizar" esa comparación aparentemente
     * inútil.</b>
     *
     * <p>Medido: antes eran ~10 ms contra ~88 ms (un solo pedido bastaba);
     * ahora ~82 ms contra ~105 ms. Queda una diferencia chica -- el camino con
     * usuario encontrado hace además el trabajo de traerlo y dejarlo en el
     * contexto de persistencia -- así que esto <b>no</b> es tiempo constante:
     * es un orden de magnitud menos de señal, no cero. Cerrarla del todo exige
     * responder con un retardo fijo, y no vale la pena hasta que el sistema
     * esté expuesto a internet (ver la deuda anotada en el plan sobre el límite
     * de intentos, que es el control que de verdad falta).
     */
    @Transactional
    public LoginResponse iniciarSesion(LoginRequest solicitud) {
        String clave = claveDeIntentos(solicitud.email());

        // El límite se consulta ANTES de mirar la base, así un ataque tampoco
        // consume el trabajo de BCrypt. Cuenta el intento gane o pierda; abajo,
        // un login exitoso borra el contador.
        if (!limitador.registrar(LimitadorDeIntentos.POR_EMAIL, clave)) {
            eventos.limiteExcedido("/api/auth/login", clave);
            throw new DemasiadosIntentosException();
        }

        Usuario usuario = usuarios.findByEmailIgnoreCase(solicitud.email()).orElse(null);

        if (usuario == null) {
            passwordEncoder.matches(solicitud.password(), hashSenuelo);
            eventos.loginFallido(solicitud.email(), "email inexistente");
            throw new CredencialesInvalidasException();
        }

        if (!passwordEncoder.matches(solicitud.password(), usuario.getPasswordHash())) {
            eventos.loginFallido(solicitud.email(), "password incorrecta");
            throw new CredencialesInvalidasException();
        }

        if (!usuario.isActivo()) {
            eventos.loginFallido(solicitud.email(), "cuenta dada de baja");
            throw new CredencialesInvalidasException();
        }

        verificarQueLaTemporalNoVencio(usuario);

        usuario.setUltimoAcceso(OffsetDateTime.now());

        // Quien sabe su contraseña no arrastra los fallos de nadie: sin esto,
        // ocho errores de tipeo a lo largo de la mañana dejarían a Micaela
        // afuera después de haber entrado bien.
        limitador.limpiar(clave);
        eventos.loginExitoso(usuario.getId(), usuario.getEmail());

        TokenEmitido token = tokens.emitirPara(usuario);
        return new LoginResponse(token.valor(), token.expira(), describir(usuario));
    }

    /**
     * En minúsculas porque el email es único sin distinguir mayúsculas: si no,
     * {@code Ana@…} y {@code ana@…} tendrían dos contadores para la misma cuenta
     * y el límite se duplicaría con solo cambiar una letra.
     */
    private String claveDeIntentos(String email) {
        return email == null ? null : "email:" + email.trim().toLowerCase();
    }

    /**
     * Una contraseña temporal que nadie usó no vale para siempre.
     *
     * <p>Viajó por un WhatsApp y la conocen dos personas: cualquiera que lea ese
     * chat —el teléfono prestado, la sesión de WhatsApp Web abierta en la compu
     * del estudio— entra y la cambia, que es justamente lo único que ese estado
     * habilita, y se queda con la cuenta. Se vuelve concreto en diciembre, con
     * ~80 altas de golpe y buena parte sin entrar en semanas.
     *
     * <p>Va <b>después</b> de comparar la contraseña a propósito: quien llega
     * hasta acá ya demostró conocerla, así que decirle que venció no le informa
     * nada a un desconocido, y en cambio le dice a la persona correcta por qué
     * no entra y qué pedir. Los tres rechazos anónimos del login
     * —email inexistente, contraseña equivocada, cuenta dada de baja— siguen
     * siendo indistinguibles entre sí.
     */
    private void verificarQueLaTemporalNoVencio(Usuario usuario) {
        if (!usuario.isDebeCambiarPassword() || usuario.getPasswordTemporalDesde() == null) {
            return;
        }

        if (usuario.getPasswordTemporalDesde().plus(vigenciaDeLaTemporal).isBefore(OffsetDateTime.now())) {
            throw new PasswordTemporalVencidaException();
        }
    }

    /**
     * Emite la credencial para un usuario ya validado por otro camino.
     *
     * <p>La usa el registro: recién creada la cuenta, la persona queda logueada
     * sin tener que volver a escribir lo que acaba de escribir.
     */
    @Transactional(readOnly = true)
    public LoginResponse credencialPara(Usuario usuario) {
        TokenEmitido token = tokens.emitirPara(usuario);
        return new LoginResponse(token.valor(), token.expira(), describir(usuario));
    }

    /**
     * Cambio de la propia contraseña.
     *
     * <p>Además de guardar el hash nuevo, baja {@code debeCambiarPassword}: es
     * el único lugar donde esa marca se apaga, así que la contraseña temporal
     * que Micaela mandó por WhatsApp deja de servir en cuanto la persona elige
     * la suya.
     */
    @Transactional
    public void cambiarPassword(String subject, CambioPasswordRequest solicitud) {
        Usuario usuario = usuarioDelToken(subject);

        if (!passwordEncoder.matches(solicitud.passwordActual(), usuario.getPasswordHash())) {
            throw new CredencialesInvalidasException();
        }

        usuario.marcarPasswordElegida(passwordEncoder.encode(solicitud.passwordNueva()));
        eventos.passwordCambiada(usuario.getId());
    }

    /**
     * Arma la respuesta de {@code GET /api/me} a partir del {@code sub} que
     * viene en el token.
     *
     * <p>Vuelve a leer el usuario de la base en vez de confiar en los claims: el
     * token es válido hasta que vence, así que si en el medio le cambiaron el
     * rol o lo dieron de baja, el claim quedó viejo. Acá se entera.
     *
     * @param subject el claim {@code sub}, tal cual vino. Se parsea acá y no en
     *                el controller para que un token con un {@code sub} que no
     *                es un número termine en 401 y no en un 500.
     */
    @Transactional(readOnly = true)
    public UsuarioActual describirPorSubject(String subject) {
        return describir(usuarioDelToken(subject));
    }

    /**
     * Resuelve el {@code sub} del token a un usuario utilizable.
     *
     * <p>Se parsea acá y no en el controller para que un token con un
     * {@code sub} que no es un número termine en 401 y no en un 500.
     */
    private Usuario usuarioDelToken(String subject) {
        long idUsuario;
        try {
            idUsuario = Long.parseLong(subject);
        } catch (NumberFormatException e) {
            throw new SesionInvalidaException();
        }

        Usuario usuario = usuarios.findById(idUsuario)
                .orElseThrow(SesionInvalidaException::new);

        if (!usuario.isActivo()) {
            throw new SesionInvalidaException();
        }

        return usuario;
    }

    /**
     * Los dos ejes juntos: el rol (permisos) y qué relaciones de negocio
     * existen. Con esto el front decide qué secciones dibujar -- pero solo las
     * ligadas a "quién sos". Las ligadas a un servicio que cualquiera contrata
     * (reservar cabina, mix &amp; mastering, mis pagos) van SIEMPRE, no dependen
     * de esta respuesta: si se ocultaran hasta tener la primera fila, quien
     * nunca reservó no podría hacer su primera reserva jamás.
     */
    private UsuarioActual describir(Usuario usuario) {
        return new UsuarioActual(
                usuario.getId(),
                usuario.getNombre(),
                usuario.getApellido(),
                usuario.getEmail(),
                usuario.getTelefono(),
                usuario.getRol(),
                usuario.getFotoPerfil(),
                alumnos.existsByUsuarioId(usuario.getId()),
                profesores.existsByUsuarioId(usuario.getId()),
                usuario.isDebeCambiarPassword());
    }
}
