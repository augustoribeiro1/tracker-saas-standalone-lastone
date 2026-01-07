// /lib/generate-slug.ts
// Gerador de slugs únicos para campanhas no domínio padrão

import { customAlphabet } from 'nanoid';

// Alfabeto sem caracteres ambíguos (sem 0, O, I, l, 1)
const nanoid = customAlphabet('23456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz', 8);

/**
 * Gera um slug único de 8 caracteres
 * Formato: abc123de
 * Usado para campanhas no domínio padrão app.split2.com.br
 */
export function generateUniqueSlug(): string {
  return nanoid();
}

/**
 * Valida se um slug está no formato correto
 */
export function isValidSlug(slug: string): boolean {
  return /^[a-zA-Z0-9-]{3,50}$/.test(slug);
}

/**
 * Converte texto em slug (para domínios personalizados)
 */
export function textToSlug(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove acentos
    .replace(/[^a-z0-9]+/g, '-') // Substitui caracteres especiais por -
    .replace(/^-+|-+$/g, '') // Remove - do início e fim
    .substring(0, 50); // Limita tamanho
}
