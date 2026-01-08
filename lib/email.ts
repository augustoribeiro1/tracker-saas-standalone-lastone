// Serviço de envio de emails
// Para produção, instalar e configurar: npm install nodemailer
// e configurar SMTP no .env

export async function sendPasswordResetEmail(email: string, resetToken: string) {
  const resetUrl = `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/auth/reset-password?token=${resetToken}`;

  // TODO: Implementar envio de email real com nodemailer
  // Por enquanto, apenas log do link (em desenvolvimento)
  console.log('='.repeat(60));
  console.log('📧 EMAIL DE RESET DE SENHA');
  console.log('='.repeat(60));
  console.log(`Para: ${email}`);
  console.log(`Link de reset: ${resetUrl}`);
  console.log('='.repeat(60));

  // Em produção, descomentar e configurar:
  /*
  const nodemailer = require('nodemailer');

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    secure: true,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  await transporter.sendMail({
    from: process.env.SMTP_FROM,
    to: email,
    subject: 'Reset de Senha - Split2',
    html: `
      <h2>Reset de Senha</h2>
      <p>Você solicitou um reset de senha.</p>
      <p>Clique no link abaixo para criar uma nova senha:</p>
      <a href="${resetUrl}">${resetUrl}</a>
      <p>Este link expira em 1 hora.</p>
      <p>Se você não solicitou este reset, ignore este email.</p>
    `,
  });
  */

  return { success: true, resetUrl };
}
