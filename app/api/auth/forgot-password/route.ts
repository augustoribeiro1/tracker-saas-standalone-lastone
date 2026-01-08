import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { sendPasswordResetEmail } from '@/lib/email';
import crypto from 'crypto';

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json(
        { error: 'Email é obrigatório' },
        { status: 400 }
      );
    }

    // Verificar se usuário existe
    const user = await db.user.findUnique({
      where: { email: email.toLowerCase() }
    });

    // Por segurança, sempre retornar sucesso mesmo se o email não existir
    // Isso evita que atacantes descubram quais emails estão cadastrados
    if (!user) {
      return NextResponse.json({
        success: true,
        message: 'Se o email existir, você receberá instruções para reset'
      });
    }

    // Gerar token único
    const resetToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');

    // Expira em 1 hora
    const expires = new Date(Date.now() + 60 * 60 * 1000);

    // Deletar tokens antigos do usuário
    await db.verificationToken.deleteMany({
      where: { identifier: email.toLowerCase() }
    });

    // Criar novo token
    await db.verificationToken.create({
      data: {
        identifier: email.toLowerCase(),
        token: hashedToken,
        expires
      }
    });

    // Enviar email
    await sendPasswordResetEmail(email, resetToken);

    return NextResponse.json({
      success: true,
      message: 'Email enviado com instruções de reset'
    });

  } catch (error) {
    console.error('Erro ao solicitar reset de senha:', error);
    return NextResponse.json(
      { error: 'Erro ao processar solicitação' },
      { status: 500 }
    );
  }
}
