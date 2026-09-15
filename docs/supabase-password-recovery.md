# Recuperación de contraseña: configuración externa

El código de Tapixxo ya solicita el correo de recuperación mediante Supabase Auth y recibe el enlace en `/auth/update-password`. No requiere variables de entorno nuevas ni expone claves SMTP.

## Supabase Dashboard

1. Abre **Authentication → URL Configuration**.
2. Define **Site URL** como `https://www.tapixxo.com`.
3. En **Redirect URLs**, añade exactamente:
   - `https://www.tapixxo.com/auth/update-password`
   - `http://localhost:3000/auth/update-password`
4. Abre **Authentication → SMTP Settings** y habilita **Custom SMTP**.
5. Configura el remitente con `noreply@tapixxo.com` y el nombre `Tapixxo`.
6. En **Authentication → Email Templates → Reset Password**, configura el asunto `Cambia tu contraseña de Tapixxo` y pega la plantilla de abajo.
7. En **Authentication → Rate Limits**, configura un límite de recuperación acorde al volumen esperado y habilita la notificación de seguridad de contraseña cambiada si está disponible.

## Zoho Mail

Primero crea `noreply@tapixxo.com` como buzón o alias de envío de una cuenta autorizada. Si se utiliza un alias, Zoho exige que el correo usado como remitente coincida con la cuenta o alias autorizado para las credenciales SMTP.

En la sección **Server Configuration Details** de la cuenta Zoho confirma el centro de datos y el tipo de plan. Para una organización de pago con dominio propio, Zoho documenta normalmente:

- Host TLS: `smtppro.zoho.com`
- Puerto TLS: `587`
- Host SSL: `smtppro.zoho.com`
- Puerto SSL: `465`
- Usuario: la dirección completa `noreply@tapixxo.com` o la cuenta que tenga autorizado ese alias.
- Contraseña: contraseña específica de aplicación si la cuenta tiene MFA; nunca la contraseña principal si Zoho exige una app password.

Las cuentas personales o de organización gratuita pueden usar `smtp.zoho.com` en lugar de `smtppro.zoho.com`. Usa los valores que muestre la página de configuración de tu cuenta Zoho, pues dependen del plan y centro de datos.

En Supabase no guardes estas credenciales en GitHub ni en archivos `.env` públicos. Los campos que se rellenan solo en el dashboard son **SMTP host**, **port**, **user**, **password**, **sender email** y **sender name**.

Configura también SPF, DKIM y DMARC para `tapixxo.com` siguiendo los registros que entregue Zoho antes de producción.

## Plantilla: Reset Password

```html
<!doctype html>
<html lang="es">
  <body style="margin:0;background:#111111;color:#f4f4f5;font-family:Arial,Helvetica,sans-serif">
    <main style="max-width:560px;margin:0 auto;padding:40px 24px">
      <section style="border:1px solid #3f3f46;border-radius:24px;background:linear-gradient(135deg,#28231f,#151515);padding:32px">
        <p style="margin:0;color:#fdba74;font-size:12px;font-weight:700;letter-spacing:2px;text-transform:uppercase">Tapixxo · Seguridad</p>
        <h1 style="margin:16px 0 12px;color:#ffffff;font-size:28px;line-height:1.2">Cambia tu contraseña</h1>
        <p style="margin:0;color:#d4d4d8;font-size:16px;line-height:1.6">Recibimos una solicitud para cambiar la contraseña de tu cuenta de Tapixxo.</p>
        <p style="margin:28px 0"><a href="{{ .ConfirmationURL }}" style="display:inline-block;border-radius:12px;background:#fb923c;padding:14px 22px;color:#171717;font-size:16px;font-weight:700;text-decoration:none">Cambiar contraseña</a></p>
        <p style="margin:0;color:#a1a1aa;font-size:14px;line-height:1.6">Si tú no solicitaste este cambio, puedes ignorar este correo.</p>
      </section>
    </main>
  </body>
</html>
```

Prueba primero con una cuenta de prueba, abre el enlace una sola vez y verifica que devuelve a `https://www.tapixxo.com/auth/update-password`.
