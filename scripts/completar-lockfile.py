#!/usr/bin/env python3
"""
Completa package-lock.json con los paquetes opcionales de las OTRAS plataformas
que npm en Windows no registra (npm/cli#4828).

POR QUE EXISTE. Un lockfile escrito en Windows guarda sólo los binarios nativos
de Windows (`@tailwindcss/oxide-win32-x64-msvc`, `@esbuild/win32-x64`, los de
rolldown, Next, oxlint…). En el runner de CI —Linux— `npm ci` respeta el lock,
no encuentra `@tailwindcss/oxide-linux-x64-gnu` y Vite muere antes del primer
test. Así estuvo el CI un mes entero, rojo en cada push, sin que nadie lo viera
desde Windows (`docs/pendientes.md` §3.9, 2026-09-13).

`npm install --package-lock-only` NO lo arregla: con lockfile presente npm lo
toma por verdad, y sin lockfile reconstruye el árbol desde el `node_modules` de
Windows y sale igual de incompleto. Sólo una resolución desde cero en un
directorio limpio registra todas las plataformas, y eso cambia versiones.

QUE HACE. Para cada paquete del lockfile que declara `optionalDependencies` con
versión exacta, y cuya dependencia no tiene entrada, agrega la entrada al lado
de la del padre con los datos del registry (`npm view`): versión, tarball,
integrity, `os`/`cpu`. Son hojas sin dependencias propias, así que no toca
ninguna otra versión. Idempotente: con el lock completo imprime `faltantes: 0`.

CUANDO CORRERLO. Después de cualquier `npm install`/`npm update` que haya
tocado package-lock.json en Windows, y antes de commitearlo:

    python scripts/completar-lockfile.py

Y antes de subir un lockfile nuevo, ensayarlo en Linux — un `git archive HEAD`
a un directorio temporal más `docker run --rm -v <dir>:/w -w /w node:22 npm ci`
es el paso del CI, sin esperar al runner.
"""
import json
import re
import subprocess

LOCK = 'package-lock.json'
EXACTA = re.compile(r'\d+\.\d+\.\d+(-[0-9A-Za-z.-]+)?')

lock = json.load(open(LOCK, encoding='utf-8'))
paquetes = lock['packages']


def base_de(ruta):
    """El directorio que contiene el node_modules del padre: '' es la raíz,
    'apps/platform' un workspace."""
    return re.sub(r'/?node_modules/[^/]+(/[^/]+)?$', '', ruta)


def existe(nombre, base):
    # Al lado del padre, o hoisteado a la raíz.
    al_lado = f'{base}/node_modules/{nombre}' if base else f'node_modules/{nombre}'
    return al_lado in paquetes or f'node_modules/{nombre}' in paquetes


faltantes = []
for ruta, entrada in paquetes.items():
    if not ruta:
        continue
    for nombre, version in (entrada.get('optionalDependencies') or {}).items():
        if not EXACTA.fullmatch(version):
            continue  # un rango no se inventa
        base = base_de(ruta)
        if not existe(nombre, base):
            destino = f'{base}/node_modules/{nombre}' if base else f'node_modules/{nombre}'
            faltantes.append((destino, nombre, version))

print(f'faltantes: {len(faltantes)}')

vistos = {}
agregadas = 0
for destino, nombre, version in faltantes:
    if destino in paquetes:
        continue
    clave = f'{nombre}@{version}'
    if clave not in vistos:
        salida = subprocess.run(
            ['npm', 'view', clave, 'dist.tarball', 'dist.integrity', 'os', 'cpu',
             'engines', 'license', '--json'],
            capture_output=True, text=True, shell=True)
        if salida.returncode != 0 or not salida.stdout.strip():
            print('  sin datos en el registry:', clave)
            vistos[clave] = None
            continue
        vistos[clave] = json.loads(salida.stdout)
    datos = vistos[clave]
    if datos is None:
        continue

    entrada = {'version': version, 'resolved': datos['dist.tarball'], 'integrity': datos['dist.integrity']}
    if 'cpu' in datos:
        entrada['cpu'] = datos['cpu'] if isinstance(datos['cpu'], list) else [datos['cpu']]
    if 'license' in datos:
        entrada['license'] = datos['license']
    entrada['optional'] = True
    if 'os' in datos:
        entrada['os'] = datos['os'] if isinstance(datos['os'], list) else [datos['os']]
    if 'engines' in datos:
        entrada['engines'] = datos['engines']
    paquetes[destino] = entrada
    agregadas += 1
    print('  +', destino, version)

if agregadas:
    lock['packages'] = dict(sorted(paquetes.items(), key=lambda kv: (kv[0] != '', kv[0])))
    with open(LOCK, 'w', encoding='utf-8', newline='\n') as f:
        json.dump(lock, f, indent=2)
        f.write('\n')
print(f'agregadas: {agregadas}')
