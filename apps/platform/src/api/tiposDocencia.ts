import type { Disciplina } from './tiposAdmin'

/**
 * Contratos del Módulo 5 — el portal del profesor.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ ESTE ARCHIVO EXISTE ANTES QUE SUS PANTALLAS, Y ES A PROPÓSITO.
 *
 * El backend del M5 quedó terminado el 2026-08-19 y el front no se llegó a
 * hacer. Estos tipos y las funciones de `docencia.ts` son el puente ya
 * construido y **verificado por el compilador**: espejan uno a uno los records
 * de `…backend.docencia.dto`, así que quien retome no tiene que abrir ocho
 * archivos de Java para saber qué llega.
 *
 * Si algo acá no coincide con el backend, gana el backend — y se corrige acá.
 * ─────────────────────────────────────────────────────────────────────────
 */

/** Los tres del CHECK de `V1`. Es un semáforo, no una nota: por eso son tres. */
export type EstadoSeguimiento = 'VA_BIEN' | 'REQUIERE_ATENCION' | 'EN_PAUSA'

export const NOMBRE_DE_SEGUIMIENTO: Record<EstadoSeguimiento, string> = {
  VA_BIEN: 'Va bien',
  REQUIERE_ATENCION: 'Requiere atención',
  EN_PAUSA: 'En pausa',
}

/**
 * Una fila de "Mis alumnos".
 *
 * **No es `AlumnoResumen`**: aquel es la ficha de la persona (teléfono, email,
 * ingreso) y esto es una lista de trabajo. Los datos de contacto son de
 * administración, que es quien llama cuando alguien deja de venir.
 *
 * ⚠️ **`estadoSeguimiento: null` significa "todavía no lo marqué", que NO es
 * `VA_BIEN`.** La pantalla tiene que distinguirlos: un semáforo verde que nadie
 * puso miente sobre un alumno que nadie miró. Pintarlo gris o vacío, nunca
 * verde.
 */
export type AlumnoDelProfesor = {
  idAlumno: number
  idUsuario: number
  nombre: string
  apellido: string
  disciplinas: Disciplina[]
  estadoSeguimiento: EstadoSeguimiento | null
  observaciones: string | null
  /** Suma de lo que le queda en sus inscripciones vigentes. */
  clasesRestantes: number
}

/**
 * Una nota privada.
 *
 * ⚠️ **Este tipo no puede aparecer en ninguna pantalla del alumno.** Las notas
 * privadas no las ve ni el alumno ni otro profesor (§8) — el backend ya lo
 * impide filtrando por profesor en la consulta, pero si alguna vez se importa
 * esto desde una pantalla del portal del alumno, es una señal de alarma.
 */
export type NotaResumen = {
  idNota: number
  idAlumno: number
  /** Null si es una observación general y no de una clase concreta. */
  idParticipacion: number | null
  /** La fecha de la CLASE, no la de la nota. Null si es general. */
  fechaDeLaClase: string | null
  contenido: string
  fechaCreacion: string
  fechaModificacion: string | null
}

/** Espeja `AltaNotaRequest`. Sin `idProfesor`: sale del token. */
export type AltaNota = {
  idAlumno: number
  /**
   * La clase sobre la que es la nota. Opcional.
   *
   * Sale de `ReservaResumen.participantes[].idParticipacion` de la agenda — es
   * el id de la PARTICIPACIÓN, no el de la reserva. Si se manda el de una clase
   * de otro alumno, `V1` §8.3 lo rechaza con 409.
   */
  idParticipacion?: number
  contenido: string
}

/**
 * Un material.
 *
 * **Es el mismo tipo para la pantalla del profesor y la del alumno.** Lo que lo
 * hace seguro no es este tipo sino la consulta del backend: la del alumno solo
 * devuelve lo que tiene `visibleAlumno: true`. El campo viaja igual porque el
 * profesor necesita ver qué publicó y qué tiene preparado.
 */
export type MaterialResumen = {
  idMaterial: number
  idProfesor: number
  profesor: string
  /** Null si es grupal. */
  idAlumno: number | null
  alumno: string | null
  esGrupal: boolean
  titulo: string
  tipo: string | null
  /** Hoy siempre un link: `archivo_path` espera al StorageService de §2.4. */
  urlExterna: string | null
  visibleAlumno: boolean
  fechaSubida: string
}

/**
 * Espeja `AltaMaterialRequest`.
 *
 * ⚠️ **Sin `idAlumno` el material es GRUPAL.** Esa traducción la hace el
 * backend, así que el formulario tiene que tener un solo control ("¿para quién?
 * → todos / un alumno") y no dos que se puedan contradecir: la base no acepta
 * las dos cosas ni ninguna.
 *
 * El link tiene que empezar con `http://` o `https://` — lo valida el DTO y
 * vuelve como 400.
 */
export type AltaMaterial = {
  idAlumno?: number
  titulo: string
  tipo?: string
  urlExterna: string
  /** Ausente = se publica. En `false` queda preparado y el alumno no lo ve. */
  visibleAlumno?: boolean
}

export type SeguimientoResumen = {
  idSeguimiento: number
  idAlumno: number
  estado: EstadoSeguimiento
  observaciones: string | null
  /** La mantiene un trigger (`V14`): es "desde cuándo está así". */
  fechaActualizacion: string
}

/** Espeja `SeguimientoRequest`. Sin fecha: la pone la base. */
export type FijarSeguimiento = {
  estado: EstadoSeguimiento
  observaciones?: string
}

/**
 * "Mi historial de clases dictadas".
 *
 * ⚠️ **Cuenta clases y no calcula plata, y eso es P20 sin resolver.** No hay
 * total ni tarifa, y la pantalla no debe inventarlos: si la liquidación al
 * profesor sale de esta cuenta o se carga a mano es una pregunta abierta al
 * cliente.
 */
export type ClasesDictadas = {
  desde: string
  hasta: string
  clases: number
  /** Personas distintas, no suma de participaciones. */
  alumnosAtendidos: number
  porTipo: { tipoUso: string; clases: number }[]
}
