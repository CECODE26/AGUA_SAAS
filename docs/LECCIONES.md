# Errores que no se repiten (aplica a este y a cualquier proyecto nuevo)

Salieron de revisar AGUAPAG al convertirlo en Agua Elite. Copiar este archivo a cada
proyecto nuevo y cumplirlo desde el primer commit.

## Secretos
1. **Ninguna contraseña, token, llave, IP o usuario de servidor en el repo.** Ni en código, ni en
   docs, ni en `docker-compose`, ni en `CLAUDE.md`. En AGUAPAG estaban la clave root SSH, la
   contraseña de aplicación de Gmail, el `JWT_SECRET`, la clave de la base (`12345`), las
   contraseñas de fábrica de los usuarios y llaves de Mapbox y Google Maps.
2. Valores reales en `.env` (ignorado) o en variables del servidor/EAS; en el repo solo `.env.example`.
3. gitleaks antes de cada commit (`.githooks/pre-commit`) y en cada push (`.github/workflows/secretos.yml`),
   con reglas propias en `.gitleaks.toml`. Se instalan el primer día, no después.
4. Nada de valores por defecto para secretos (`JWT_SECRET || 'algo'`): si falta, el servidor no arranca.
5. El seed no crea usuarios con contraseñas fijas: salen de variables o se generan al azar.
6. Un secreto que se subió está filtrado aunque se borre: se rota. El historial de git lo guarda.
7. Repos privados por defecto. Hacer uno público es una decisión consciente, después de pasar gitleaks por todo el historial.

## Seguridad de la aplicación
8. Cada token dice su **tipo** (admin, chofer, cliente…) y cada middleware lo exige. En AGUAPAG el
   token de un cliente abría el panel de administración.
9. Las rutas async de Express 4 necesitan `express-async-errors` y un manejador de errores: sin eso,
   un id inexistente tumbaba el servidor entero.
10. Límite de intentos en login, recuperación de clave y formularios públicos.

## Base de datos
11. Cambios de esquema siempre con migración; nunca `prisma db push --accept-data-loss` al arrancar.
12. Revisar que las migraciones reproduzcan el esquema (`prisma migrate diff`) antes de subirlas.

## Producto y código
13. Nada de nombres, teléfonos o direcciones de un cliente escritos en el código: salen de la base
    o de variables. (AGUAPAG tenía "Agua Manú" y sus teléfonos en decenas de archivos).
14. Probar de punta a punta (servidor + base + navegador) antes de decir que algo funciona.
15. No prometer en textos públicos cosas que el sistema no hace ni precios que el dueño no dio.

## Forma de trabajo
16. Un proyecto de cliente que sirve de base se **copia**, no se modifica ni se le hace push.
17. Nada de push forzado, despliegue o borrado sin permiso explícito del usuario.
18. Dejar `docs/CONTEXTO.md` al día al terminar cada tarea, para que la siguiente sesión no tenga que leer todo el código.
