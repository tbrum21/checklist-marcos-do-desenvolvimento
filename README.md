# Marcos

Aplicação web para acompanhamento dos marcos do desenvolvimento infantil, baseada nos checklists do CDC “Learn the Signs. Act Early.” em português — com **painel Superadmin**, controle de acesso de psicólogos, troca obrigatória de senha no primeiro login e histórico longitudinal de pacientes integrado ao **Supabase**.

## Abrir localmente

Abra `index.html` em um navegador ou sirva a pasta com qualquer servidor HTTP estático:

```bash
npx serve .
```

## O que está incluído

- **Painel Superadmin**: cadastro de novos psicólogos com geração automática de senha temporária, redefinição de senha e bloqueio/reativação de contas via RPCs seguras no Supabase (`admin_*`).
- **Acesso controlado (sem autocadastro)**: psicólogos entram apenas com e-mail e senha criados pelo superadmin e são direcionados imediatamente para definir sua senha definitiva no primeiro acesso.
- **Gestão de pacientes**: nome completo, data de nascimento, responsável, contato e observações clínicas, com busca e arquivamento.
- **Evolução longitudinal por paciente**: histórico de avaliações por data, linha do tempo visual, comparativo entre sessões (incluindo novos marcos conquistados) e desempenho por área do desenvolvimento.
- **Segurança de dados (RLS)**: cada profissional acessa exclusivamente seus próprios pacientes e avaliações.
- **Avaliação rápida sem conta** preservada na tela inicial.
- Resumo imprimível (PDF), copiar resumo e compartilhamento pré-preenchido via WhatsApp (`wa.me`).

## Estrutura de arquivos

- `index.html` — estrutura da aplicação e carregamento do SDK Supabase.
- `config.js` — URL e chave pública (*publishable key*) do projeto Supabase.
- `milestones.js` — dados dos checklists e funções puras de cálculo de evolução.
- `app.js` — interface, autenticação, painel Superadmin, troca de senha e prontuários.
- `styles.css` — estilos responsivos e folha de impressão.
- `supabase/migrations/` — migrations SQL (tabelas, RLS, guardas de privilégio e RPCs do Superadmin).
