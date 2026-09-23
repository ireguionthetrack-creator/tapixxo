# Pruebas de aceptación: Menú Digital

Ejecutar después de aplicar `20260921120000_digital_menu_module.sql` en un entorno con usuarios de prueba.

1. Como Tapixxo admin, abrir una empresa sin módulo. Activar el módulo y crear un menú con un slug único. Confirmar que queda asignado y que aparece en el registro `digital_menu_audit_log`.
2. Como usuario de esa empresa, abrir la empresa. Debe aparecer únicamente **Editar menú digital**; crear, editar y eliminar categorías y productos. Confirmar que el admin no creó ni cambió contenido desde su panel de control.
3. Como usuario de otra empresa, solicitar directamente `/api/companies/{empresa-ajena}/digital-menu` y sus rutas de categorías/productos. Debe devolver `403`; usar una empresa sin módulo o sin menú debe devolver `404`.
4. Como admin, desactivar el módulo. El botón de edición y toda respuesta de contenido deben desaparecer/devolver `404`; volver a activarlo debe conservar las categorías y productos.
5. Como admin, crear un segundo menú con contenido, asignarlo a una empresa que ya tenga un menú y comprobar que el menú sustituido queda `company_id = null`, conservando sus filas. Reasignarlo a otra empresa y verificar que el contenido sigue intacto.
6. Abrir una URL de código/QR existente y verificar que sigue redirigiendo a su `destination_url` y registra el escaneo como antes.

Validaciones de código ejecutadas localmente: `npx next typegen`, `npx tsc --noEmit`, `npm run lint` y `npm run build`.
