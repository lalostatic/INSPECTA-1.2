# INSPECTA 1.2

Patio, taller M&R y pintura. Cada empresa tiene **su propia base de operación**. El correo decide el patio (`admin@cerlan.mx` ≠ `admin@contri.mx`). No hay alta pública: las empresas las autoriza el desarrollador.

**Sitio visual (GitHub Pages):** [https://lalostatic.github.io/INSPECTA-1.2/](https://lalostatic.github.io/INSPECTA-1.2/)

Desarrollado por [@lalostatic](https://github.com/lalostatic)

---

## Qué es

INSPECTA es un SaaS de patio de contenedores. Tres módulos, la misma estructura para todas las empresas, datos aislados:

| Módulo | Qué se captura |
|---|---|
| Inspección | Número de unidad, mapa de puntos y foto. El daño es opcional. |
| M&R | Fecha, contenedor y trabajo realizado. |
| Pintura | Folio, material y unidades acondicionadas. |

Al tocar un punto del mapa se abre la cámara. Después de la foto se puede anotar el daño, o dejarlo en blanco.

## Versión 1.2

- Mapa interactivo (puertas, interior, lateral) del contenedor original.
- Foto al seleccionar el punto; detalle de daño opcional.
- Textos de cada apartado: solo qué colocar.
- Una base de operación por empresa (misma estructura, sin mezclar patios).
- Módulos para activar o quitar capacidades, no copias a medida del sistema.
- Cobro mensual autónomo: pasarela al vencer, 7 días de gracia, luego el patio queda bloqueado hasta pagar.
- Sin «Crear una cuenta». El desarrollador autoriza la empresa; el administrador da de alta a su gente.

## Cómo está armado (producción)

Hay dos capas. No se personaliza el esquema por cliente.

```
┌─────────────────────────────────────────────┐
│  Control (compartido)                       │
│  login · empresas · cobro · gente · módulos │
└──────────────────┬──────────────────────────┘
                   │ autoriza / aísla
     ┌─────────────┴──────────────┐
     ▼                            ▼
┌──────────────┐            ┌──────────────┐
│ Base Cerlan  │            │ Base Contri  │
│ inspección   │            │ inspección   │
│ M&R          │            │ M&R          │
│ pintura      │            │ pintura      │
└──────────────┘            └──────────────┘
```

- **Control:** cuentas, dominio de correo, autorización, plan mensual, módulos activos.
- **Patio:** inspecciones, fotos, reportes de taller y almacén. Una base por empresa, idéntica en tablas.
- **Módulos:** encienden o apagan inspección / M&R / pintura. Un módulo nuevo es una bandera + las tablas del patio, aplicada a todas las empresas. Nunca un INSPECTA distinto por cliente.

El correo de la empresa selecciona el patio. Gmail y similares no abren empresa. `inspecta.mx` queda reservado al desarrollador.

## Roles

Administrador, oficina, inspector, taller M&R, pintura, supervisor. El administrador da de alta personas en Equipo (nombre, correo `@su-empresa.mx`, contraseña, rol).

## Cobro

Plan mensual. Al vencer, al iniciar sesión aparece el cobro con opción de omitir. A los 7 días de no pago el patio se suspende hasta pagar. El cálculo es por fechas, sin tareas programadas.

## Autorización

No hay registro público. Solo el desarrollador da de alta y habilita empresas (nombre, dominio, depósito, administrador). Puede revocar un patio. Si existe pero no está autorizado, el personal ve que está en espera.

## Producción

La app operativa (login, patio, cámara, cobro) necesita servidor y Postgres. En este repositorio está lista para desplegar:

1. Postgres (Neon u otro). `DATABASE_URL` lo inyecta el entorno de deploy — no se guarda un `.env` en el repo.
2. Auth de correo y contraseña (Better Auth).
3. `npm run build` aplica migraciones y genera el bundle (Vercel / Nitro).

GitHub Pages **no corre** el patio (no hay Node ni base de datos ahí). La página de este repositorio es el **sitio de producto** con capturas reales de la 1.2.

```bash
npm install
npm run build
npm run preview   # verificación local del bundle
```

Migraciones de control: `migrations/0001` … `0009`. Estructura de cada patio: `migrations/tenant/`. Al autorizar una empresa se crea su base con esa plantilla.

## Licencia

Uso del propietario del repositorio. Desarrollado por [@lalostatic](https://github.com/lalostatic).
