import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import bcrypt from 'bcryptjs';

export async function POST(request: Request) {
  try {
    const { name, email, password, recaptchaToken } = await request.json();

    // Validar dados
    if (!email || !password || !name) {
      return NextResponse.json(
        { error: 'Dados incompletos' },
        { status: 400 }
      );
    }

    // Validar reCAPTCHA
    if (!recaptchaToken) {
      return NextResponse.json(
        { error: 'Verificação reCAPTCHA obrigatória' },
        { status: 400 }
      );
    }

    try {
      const recaptchaResponse = await fetch(
        'https://www.google.com/recaptcha/api/siteverify',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: `secret=6LfN3EQsAAAAAOu4mHAgvTKzwCKoBJVkX552ylnF&response=${recaptchaToken}`,
        }
      );

      const recaptchaData = await recaptchaResponse.json();

      if (!recaptchaData.success) {
        console.error('[Signup] reCAPTCHA validation failed:', recaptchaData);
        return NextResponse.json(
          { error: 'Verificação reCAPTCHA falhou. Por favor, tente novamente.' },
          { status: 400 }
        );
      }
    } catch (recaptchaError) {
      console.error('[Signup] reCAPTCHA verification error:', recaptchaError);
      return NextResponse.json(
        { error: 'Erro ao verificar reCAPTCHA' },
        { status: 500 }
      );
    }

    // Verificar se usuário já existe
    const existingUser = await db.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'Email já cadastrado' },
        { status: 400 }
      );
    }

    // Hash da senha
    const hashedPassword = await bcrypt.hash(password, 10);

    // Criar usuário com plano free
    const user = await db.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        plan: 'free',
        maxCampaigns: 2,
        maxVariations: 2,
        maxClicks: 1000,
        maxDomains: 0,
      }
    });

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      }
    });

  } catch (error) {
    console.error('[Signup Error]', error);
    return NextResponse.json(
      { error: 'Erro ao criar conta' },
      { status: 500 }
    );
  }
}
