// Serviço de envio de emails
import nodemailer from 'nodemailer';

export async function sendPasswordResetEmail(email: string, resetToken: string) {
  const resetUrl = `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/auth/reset-password?token=${resetToken}`;

  // Verificar se está em desenvolvimento ou produção
  const isDevelopment = process.env.NODE_ENV === 'development';
  const hasSmtpConfig = process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS;

  // Em desenvolvimento sem SMTP configurado, apenas log
  if (isDevelopment && !hasSmtpConfig) {
    console.log('='.repeat(60));
    console.log('📧 EMAIL DE RESET DE SENHA (MODO DESENVOLVIMENTO)');
    console.log('='.repeat(60));
    console.log(`Para: ${email}`);
    console.log(`Link de reset: ${resetUrl}`);
    console.log('='.repeat(60));
    return { success: true, resetUrl };
  }

  // Envio de email real (produção ou desenvolvimento com SMTP configurado)
  try {
    // Determinar se usa SSL baseado no protocolo
    const useSSL = process.env.SMTP_PROTOCOL === 'SSL';
    const smtpPort = parseInt(process.env.SMTP_PORT || (useSSL ? '465' : '587'));

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: smtpPort,
      secure: useSSL, // true para SSL (porta 465), false para TLS (porta 587)
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    await transporter.sendMail({
      from: process.env.SMTP_FROM || `"Split2" <${process.env.SMTP_USER}>`,
      to: email,
      subject: 'Reset de Senha - Split2',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #3b82f6; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background-color: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; }
            .button { display: inline-block; padding: 12px 24px; background-color: #3b82f6; color: white; text-decoration: none; border-radius: 6px; font-weight: bold; margin: 20px 0; }
            .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; }
            .link { color: #3b82f6; word-break: break-all; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Reset de Senha</h1>
            </div>
            <div class="content">
              <h2>Olá!</h2>
              <p>Você solicitou um reset de senha para sua conta no Split2.</p>
              <p>Clique no botão abaixo para criar uma nova senha:</p>
              <div style="text-align: center;">
                <a href="${resetUrl}" class="button">Resetar Senha</a>
              </div>
              <p>Ou copie e cole este link no seu navegador:</p>
              <p class="link">${resetUrl}</p>
              <p><strong>⏰ Este link expira em 1 hora.</strong></p>
              <p>Se você não solicitou este reset, pode ignorar este email. Sua senha permanecerá inalterada.</p>
            </div>
            <div class="footer">
              <p>© ${new Date().getFullYear()} Split2. Todos os direitos reservados.</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
Reset de Senha - Split2

Você solicitou um reset de senha para sua conta.

Acesse o link abaixo para criar uma nova senha:
${resetUrl}

Este link expira em 1 hora.

Se você não solicitou este reset, ignore este email.
      `,
    });

    console.log(`✅ Email de reset enviado para: ${email}`);
    return { success: true, resetUrl };

  } catch (error) {
    console.error('❌ Erro ao enviar email:', error);
    throw new Error('Erro ao enviar email de reset');
  }
}
