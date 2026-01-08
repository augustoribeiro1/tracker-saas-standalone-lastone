import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

export async function POST(req: NextRequest) {
  try {
    const { token, password } = await req.json();

    if (!token || !password) {
      return NextResponse.json(
        { error: 'Token e senha são obrigatórios' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'A senha deve ter pelo menos 6 caracteres' },
        { status: 400 }
      );
    }

    // Hash do token para comparar com o banco
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    // Buscar token no banco
    const verificationToken = await db.verificationToken.findFirst({
      where: {
        token: hashedToken,
        expires: {
          gt: new Date() // Token não expirado
        }
      }
    });

    if (!verificationToken) {
      return NextResponse.json(
        { error: 'Token inválido ou expirado' },
        { status: 400 }
      );
    }

    // Buscar usuário pelo email (identifier)
    const user = await db.user.findUnique({
      where: { email: verificationToken.identifier }
    });

    if (!user) {
      return NextResponse.json(
        { error: 'Usuário não encontrado' },
        { status: 404 }
      );
    }

    // Hash da nova senha
    const hashedPassword = await bcrypt.hash(password, 10);

    // Atualizar senha
    await db.user.update({
      where: { email: verificationToken.identifier },
      data: { password: hashedPassword }
    });

    // Deletar token usado
    await db.verificationToken.delete({
      where: {
        identifier_token: {
          identifier: verificationToken.identifier,
          token: hashedToken
        }
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Senha atualizada com sucesso'
    });

  } catch (error) {
    console.error('Erro ao resetar senha:', error);
    return NextResponse.json(
      { error: 'Erro ao processar solicitação' },
      { status: 500 }
    );
  }
}
