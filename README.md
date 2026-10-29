# Gestão de Impressão 3D

Sistema para orçar, precificar e acompanhar pedidos de impressão 3D.
React + Vite no front, Supabase (banco, login e fotos) no back, hospedado no Netlify.

## O que tem

- **Orçamentos** com várias peças, foto de cada peça, prazo de entrega, validade, frete, desconto, condições de pagamento e observações.
- **Calculadora de custos** por peça: material (com % de perda), energia, depreciação da impressora, manutenção, reserva para falhas, mão de obra (preparo + acabamento) e insumos extras. O preço aplica seu lucro e embute impostos e taxa de cartão.
- **Link público** do orçamento (`/o/<código>`) com a sua marca: o cliente vê fotos, prazo e total, aprova com um clique, fala com você no WhatsApp ou salva em PDF. Custos e notas internas nunca aparecem.
- **Envio pelo WhatsApp** com mensagem pronta e o link.
- **Calculadora rápida** para responder preço na hora e transformar em orçamento.
- **Painel** com vendas e lucro do mês, taxa de aprovação, fila de produção e orçamentos aguardando resposta.
- Cadastros de **clientes, impressoras, materiais** e **configurações** da empresa.

## Como a conta é feita

| Custo | Fórmula (por unidade) |
|---|---|
| Material | peso (kg) × R$/kg × (1 + perda %) |
| Energia | potência (kW) × horas × R$/kWh |
| Depreciação | (valor da impressora ÷ vida útil em h) × horas |
| Manutenção | R$/h de manutenção × horas |
| Falhas | % de falhas × (material + energia + depreciação + manutenção) |
| Mão de obra | (preparo + acabamento) × R$/h |
| Extras | tinta, ímãs, parafusos, embalagem |

**Preço unitário** = custo × (1 + lucro %) ÷ (1 − impostos % − taxa de cartão %)

Dividir pelos impostos (em vez de somar) garante que, depois de pagar o imposto sobre o valor vendido, o lucro que você definiu continua inteiro. O frete é repassado ao cliente sem margem.

---

## 1. Supabase

1. Crie um projeto em [supabase.com](https://supabase.com).
2. Abra **SQL Editor → New query**, cole todo o conteúdo de `supabase/schema.sql` e clique em **Run**. Isso cria as tabelas, as regras de segurança, as funções do link público e o bucket de fotos `quote-photos`.
3. Em **Project Settings → API**, copie a **Project URL** e a chave **anon public**.
4. Em **Authentication → URL Configuration**, coloque a URL do seu site do Netlify em **Site URL** (pode fazer depois do deploy).
5. Opcional: em **Authentication → Providers → Email**, desligue *Confirm email* para entrar direto após criar a conta.
6. Depois de criar a sua conta no sistema, desligue novos cadastros em **Authentication → Providers → Email → Allow new users to sign up** (ou *Sign In / Up*), para ninguém mais criar conta.

## 2. Rodar no computador (opcional)

```bash
cp .env.example .env      # preencha com a URL e a chave anon
npm install
npm run dev
```

## 3. Netlify

1. Envie esta pasta para um repositório no GitHub.
2. No Netlify: **Add new site → Import an existing project** e escolha o repositório. Build e pasta de publicação já vêm do `netlify.toml` (`npm run build` → `dist`).
3. Em **Site configuration → Environment variables**, adicione:
   - `VITE_SUPABASE_URL` = Project URL
   - `VITE_SUPABASE_ANON_KEY` = chave anon public
4. Faça o deploy (ou **Deploys → Trigger deploy** se já tinha publicado antes de criar as variáveis).

> Alternativa sem GitHub: rode `npm run build` com o `.env` preenchido e arraste a pasta `dist` em **app.netlify.com/drop**. O arquivo `public/_redirects` garante que o link do orçamento (`/o/...`) funcione nos dois casos.

## 4. Primeiro uso

1. Crie sua conta na tela de login.
2. **Configurações**: preço do kWh (conta de luz ÷ kWh), valor da sua hora, % de falhas, impostos, dados da empresa e logo.
3. **Impressoras**: valor pago, vida útil, consumo médio em watts.
4. **Materiais**: preço por kg com frete incluso.
5. **Novo orçamento**: adicione as peças com peso e tempo do fatiador, foto, prazo, e envie pelo WhatsApp.

## Estrutura

```
supabase/schema.sql        tabelas, segurança (RLS), funções públicas, bucket de fotos
src/lib/calc.js            toda a regra de custos e preço
src/pages/QuoteEditor.jsx  criação/edição do orçamento
src/pages/PublicQuote.jsx  página que o cliente vê
src/pages/*.jsx            painel, listas, cadastros, configurações
```

## Segurança

- Todas as tabelas usam Row Level Security: cada login só vê os próprios dados.
- O link público usa as funções `get_public_quote` e `approve_public_quote`, que expõem apenas o que o cliente deve ver e só permitem aprovar orçamentos em aberto e dentro da validade.
- O código do link é aleatório (24 caracteres), então não dá para adivinhar orçamentos de outras pessoas.
- As fotos ficam em um bucket público (necessário para o cliente vê-las) com nomes aleatórios; só você consegue enviar ou apagar.
