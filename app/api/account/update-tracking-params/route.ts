import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { trackingParamPrimary, trackingParamBackup, confirmation } = body;

    // Validar confirmação
    if (confirmation !== 'alterar') {
      return NextResponse.json(
        { error: 'Digite "alterar" para confirmar a alteração' },
        { status: 400 }
      );
    }

    // Validar parâmetros
    if (!trackingParamPrimary || !trackingParamBackup) {
      return NextResponse.json(
        { error: 'Ambos os parâmetros são obrigatórios' },
        { status: 400 }
      );
    }

    // Validar formato: apenas letras, números e underscore (sem espaços ou caracteres especiais)
    const paramRegex = /^[a-zA-Z0-9_]+$/;

    if (!paramRegex.test(trackingParamPrimary)) {
      return NextResponse.json(
        { error: 'Parâmetro primário inválido. Use apenas letras, números e underscore (_)' },
        { status: 400 }
      );
    }

    if (!paramRegex.test(trackingParamBackup)) {
      return NextResponse.json(
        { error: 'Parâmetro backup inválido. Use apenas letras, números e underscore (_)' },
        { status: 400 }
      );
    }

    // Validar que os parâmetros não sejam iguais
    if (trackingParamPrimary === trackingParamBackup) {
      return NextResponse.json(
        { error: 'Os parâmetros primário e backup devem ser diferentes' },
        { status: 400 }
      );
    }

    // Atualizar no banco
    const updatedUser = await db.user.update({
      where: {
        email: session.user.email as string
      },
      data: {
        trackingParamPrimary: trackingParamPrimary.toLowerCase(),
        trackingParamBackup: trackingParamBackup.toLowerCase()
      }
    });

    return NextResponse.json({
      success: true,
      trackingParamPrimary: updatedUser.trackingParamPrimary,
      trackingParamBackup: updatedUser.trackingParamBackup
    });

  } catch (error: any) {
    console.error('[Update Tracking Params] Erro:', error);
    return NextResponse.json(
      { error: 'Erro ao atualizar parâmetros' },
      { status: 500 }
    );
  }
}
