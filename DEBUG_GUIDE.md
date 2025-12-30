# 🔍 GUIA DE DEBUG - Split2

## 📍 COMO DEBUGAR NO NAVEGADOR

### 1. Abrir Console do Navegador
```
Chrome/Edge: F12 ou Ctrl+Shift+I
Firefox: F12
Safari: Cmd+Option+I (Mac)
```

### 2. Aba "Console"
Aqui aparecem todos os erros JavaScript!

**Erros comuns que você pode ver:**
```
❌ Failed to fetch
❌ 404 Not Found
❌ 500 Internal Server Error
❌ TypeError: Cannot read property
```

### 3. Aba "Network"
Veja TODAS as requisições HTTP!

**Como usar:**
1. Abra a aba Network
2. Faça a ação (criar campanha, etc)
3. Veja requisições em vermelho = ERRO!
4. Clique na requisição vermelha
5. Veja "Response" para ver o erro

**Exemplo:**
```
POST /api/campaigns
Status: 500
Response: { "error": "Database connection failed" }
```

### 4. Aba "Elements" (Inspecionar)
Veja o HTML/CSS em tempo real!

**Como usar:**
1. Botão direito no elemento
2. "Inspecionar" ou "Inspect"
3. Veja as classes CSS aplicadas
4. Desmarque/marque classes para testar

## 🐛 ERROS ESPECÍFICOS DO SPLIT2

### Erro: "Botão Criar Campanha não faz nada"

**Debug:**
```javascript
// No console, digite:
console.log('Testando criação')

// Depois tente criar a campanha e veja se aparece algum erro
```

**Causas comuns:**
- ❌ URL sem https:// (CORRIGIDO!)
- ❌ Slug vazio
- ❌ Banco de dados offline
- ❌ API retornando erro

### Erro: "Texto invisível"

**Debug:**
1. Inspecionar elemento
2. Ver computed styles
3. Procurar por `color: #fff` ou `color: white`
4. Se tiver, o background também é branco!

**Solução:** (JÁ APLICADA!)
```
Mudei TODOS os inputs para:
- bg-white (fundo branco)
- text-gray-900 (texto escuro)
- border-2 border-gray-300 (borda visível)
```

### Erro: "Analytics 404"

**Causa:** Página não existia!
**Solução:** CRIADA! ✅

## 📊 LOGS DO SERVIDOR (Vercel)

### Como ver logs de produção:

1. Vercel Dashboard → seu projeto
2. Clique em "Deployments"
3. Clique no deployment ativo
4. Aba "Functions"
5. Veja logs em tempo real!

**Ou instale Vercel CLI:**
```bash
npm install -g vercel
vercel logs
```

## 🔥 ERROS COMUNS E SOLUÇÕES

### 1. "Campanha não cria"

**Verifique:**
```sql
-- Banco tem tabelas?
SELECT * FROM "Campaign" LIMIT 1;

-- Usuário existe?
SELECT * FROM "User" WHERE id = 1;
```

**No código:**
```javascript
// app/api/campaigns/route.ts
console.log('Dados recebidos:', request.body);
console.log('Usuário:', session.user);
```

### 2. "Webhooks não aparecem"

**Verifique:**
```javascript
// Abra: /api/webhooks/manage
// Console deve mostrar:
fetch('/api/webhooks/manage')
  .then(r => r.json())
  .then(console.log)
```

### 3. "Redirects não funcionam"

**Teste:**
```
https://seu-app.vercel.app/r/teste-campanha
```

**Se der 404:**
- Campanha não existe
- Slug errado
- Status não está "active"

## 🎯 COMANDOS ÚTEIS

### Limpar cache do navegador:
```
Chrome: Ctrl+Shift+Delete
Edge: Ctrl+Shift+Delete  
Firefox: Ctrl+Shift+Delete
```

### Recarregar sem cache:
```
Ctrl+F5 ou Ctrl+Shift+R
```

### Ver localStorage:
```javascript
// No console:
console.log(localStorage);
console.log(sessionStorage);
```

### Limpar localStorage:
```javascript
localStorage.clear();
sessionStorage.clear();
```

## 📝 TEMPLATE DE REPORT DE BUG

Quando reportar um bug, forneça:

```
1. O QUE VOCÊ FEZ:
   "Cliquei em Criar Campanha"

2. O QUE ESPERAVA:
   "Campanha ser criada e redirecionar"

3. O QUE ACONTECEU:
   "Nada aconteceu"

4. CONSOLE:
   [Cole o erro do console aqui]

5. NETWORK:
   [Cole a resposta da API aqui]

6. AMBIENTE:
   - Navegador: Chrome 120
   - URL: https://meu-app.vercel.app
   - Logado como: meu@email.com
```

## 🚀 TESTE RÁPIDO

Execute isto no console para testar tudo:

```javascript
// Teste 1: API está no ar?
fetch('/api/campaigns')
  .then(r => r.json())
  .then(d => console.log('✅ API OK:', d))
  .catch(e => console.error('❌ API ERRO:', e));

// Teste 2: Sessão ativa?
fetch('/api/auth/session')
  .then(r => r.json())
  .then(d => console.log('✅ Sessão:', d))
  .catch(e => console.error('❌ Sessão ERRO:', e));

// Teste 3: Banco funcionando?
fetch('/api/plans')
  .then(r => r.json())
  .then(d => console.log('✅ Planos:', d))
  .catch(e => console.error('❌ Banco ERRO:', e));
```

Se TODOS retornarem ✅ = sistema OK!
Se algum retornar ❌ = problema identificado!
