# Marcos

Aplicação web para acompanhamento dos marcos do desenvolvimento infantil, baseada nos checklists do CDC “Learn the Signs. Act Early.” em português — agora com **área do psicólogo**, cadastro de pacientes e histórico longitudinal de evolução integrado ao **Supabase**.

## Abrir localmente

Abra `index.html` em um navegador ou sirva a pasta com qualquer servidor HTTP estático:

```bash
npx serve .
```

## O que está incluído

- **Área do profissional (psicólogo)** com login e cadastro via e-mail e senha (Supabase Auth).
- **Gestão de pacientes** com nome completo, data de nascimento, responsável, contato e observações clínicas, além de busca e arquivamento.
- **Evolução longitudinal por paciente**: histórico de avaliações por data, linha do tempo visual, comparativo de progresso entre sessões (incluindo novos marcos conquistados) e desempenho por área do desenvolvimento.
- **Segurança de dados (RLS)**: cada profissional acessa exclusivamente seus próprios pacientes e avaliações.
- **Checklists completos** para 2, 4, 6, 9, 12, 15, 18, 24, 30, 36, 48 e 60 meses nas quatro áreas: social e emocional, linguagem e comunicação, cognitivo, movimento e desenvolvimento físico.
- **Avaliação rápida sem conta** preservada para uso avulso no dispositivo.
- Resumo imprimível (PDF), copiar resumo e compartilhamento pré-preenchido via WhatsApp (`wa.me`).

## Estrutura de arquivos

- `index.html` — estrutura da aplicação e carregamento do SDK Supabase.
- `config.js` — URL e chave pública (*publishable key*) do projeto Supabase.
- `milestones.js` — dados dos checklists e funções puras de cálculo de evolução.
- `app.js` — interface, autenticação, CRUD de pacientes e avaliações.
- `styles.css` — estilos responsivos e folha de impressão.

## Limites de uso

O produto é uma ferramenta de acompanhamento. Não realiza triagem validada, não atribui diagnóstico e não substitui avaliação ou orientação profissional.

Fonte de conteúdo consultada: `Brazilian-Portuguese-Checklists_LTSAE-P.pdf` (CDC, Learn the Signs. Act Early.).
