const AGE_GROUPS = [
  { value: 2, label: "2 meses" }, { value: 4, label: "4 meses" }, { value: 6, label: "6 meses" },
  { value: 9, label: "9 meses" }, { value: 12, label: "12 meses" }, { value: 15, label: "15 meses" },
  { value: 18, label: "18 meses" }, { value: 24, label: "2 anos" }, { value: 30, label: "30 meses" },
  { value: 36, label: "3 anos" }, { value: 48, label: "4 anos" }, { value: 60, label: "5 anos" }
];

const CHECKLISTS = {
  2: { social: ["Acalma-se quando falam com ele ou quando o pegam no colo", "Olha para o seu rosto", "Parece feliz em ver você quando caminha até ele", "Sorri quando você fala ou sorri para ele"], language: ["Faz outros sons além de chorar", "Reage a sons altos"], cognitive: ["Observa conforme você se move", "Olha para um brinquedo por vários segundos"], motor: ["Mantém a cabeça erguida quando está de bruços", "Move os dois braços e as duas pernas", "Abre as mãos brevemente"] },
  4: { social: ["Sorri sozinho para chamar sua atenção", "Dá risadinhas quando você tenta fazê-lo rir", "Olha para você, se move ou faz sons para chamar ou manter sua atenção"], language: ["Faz sons como “uuh” e “aah”", "Faz sons de volta quando você fala com ele", "Vira a cabeça em direção ao som da sua voz"], cognitive: ["Quando está com fome, abre a boca quando vê o peito ou a mamadeira", "Olha para as mãos com interesse"], motor: ["Mantém a cabeça firme sem apoio quando você a segura", "Segura um brinquedo quando você o coloca na mão", "Usa o braço para balançar em direção a brinquedos", "Leva as mãos à boca", "Empurra para cima nos cotovelos quando está de bruços"] },
  6: { social: ["Conhece pessoas familiares", "Gosta de se olhar no espelho", "Ri"], language: ["Se reveza fazendo sons com você", "Faz “bolhinhas”", "Faz barulhos estridentes"], cognitive: ["Coloca as coisas na boca para explorá-las", "Estica-se para pegar um brinquedo que quer", "Fecha os lábios para mostrar que não quer mais comida"], motor: ["Rola de bruços para deitado de costas", "Empurra com os braços retos quando está de bruços", "Apoia-se nas mãos para se apoiar quando está sentado"] },
  9: { social: ["Fica tímido, agarrado ou temeroso perto de estranhos", "Mostra várias expressões faciais", "Olha quando você chama o nome dele", "Reage quando você sai", "Sorri ou ri quando você brinca de esconde-esconde"], language: ["Faz sons diferentes como “mamamama” e “babababa”", "Levanta os braços para ser pego"], cognitive: ["Procura objetos quando estão fora de vista", "Bate duas coisas juntas"], motor: ["Fica na posição sentada sozinho", "Move as coisas de uma mão para a outra", "Usa os dedos para puxar a comida em sua direção", "Senta-se sem apoio"] },
  12: { social: ["Faz brincadeiras com você, como bater palminhas"], language: ["Faz “tchau tchau” com as mãos", "Chama os pais de “mama” ou “papa” ou outro nome especial", "Entende “não”"], cognitive: ["Coloca algo em um recipiente, como um bloco em um copo", "Procura coisas que ele vê você esconder, como um brinquedo debaixo de um cobertor"], motor: ["Puxa para ficar de pé", "Anda, segurando nos móveis", "Bebe de um copo sem tampa enquanto você o segura", "Pega coisas entre o polegar e o dedo indicador"] },
  15: { social: ["Copia outras crianças quando brinca", "Mostra um objeto que gosta", "Bate palmas quando está excitado", "Abraça um boneco de pelúcia ou outro brinquedo", "Mostra afeto"], language: ["Tenta dizer uma ou duas palavras além de “mama” ou “dada”", "Olha para um objeto familiar quando você o nomeia", "Segue instruções com gestos e palavras", "Aponta para pedir algo ou obter ajuda"], cognitive: ["Tenta usar as coisas da maneira certa", "Empilha pelo menos dois objetos pequenos"], motor: ["Dá alguns passos sozinho", "Usa os dedos para se alimentar com alguma comida"] },
  18: { social: ["Afasta-se de você, mas procura ter certeza de que está por perto", "Aponta para mostrar algo interessante", "Estende as mãos para você lavá-las", "Olha algumas páginas de um livro com você", "Ajuda você a vesti-lo"], language: ["Tenta dizer três ou mais palavras além de “mama” ou “dada”", "Segue instruções de um passo sem nenhum gesto"], cognitive: ["Copia você fazendo tarefas domésticas", "Brinca com brinquedos de forma simples"], motor: ["Anda sem se apoiar", "Faz rabiscos", "Bebe de um copo sem tampa", "Alimenta-se usando os dedos", "Tenta usar uma colher", "Sobe e desce de um sofá ou cadeira sem ajuda"] },
  24: { social: ["Percebe quando os outros estão magoados ou aborrecidos", "Olha para seu rosto para ver como reagir em uma nova situação"], language: ["Aponta para coisas em um livro quando você pergunta", "Diz pelo menos duas palavras juntas", "Aponta para pelo menos duas partes do corpo", "Usa mais gestos do que somente acenar e apontar"], cognitive: ["Segura algo em uma mão enquanto usa a outra", "Tenta usar interruptores e botões em um brinquedo", "Brinca com mais de um brinquedo ao mesmo tempo"], motor: ["Chuta uma bola", "Corre", "Sobe alguns degraus com ou sem ajuda", "Come com colher"] },
  30: { social: ["Brinca ao lado de outras crianças e às vezes brinca com elas", "Mostra o que pode fazer dizendo “olha para mim”", "Segue tarefas simples"], language: ["Diz cerca de 50 palavras", "Diz duas ou mais palavras com uma palavra de ação", "Nomeia coisas em um livro quando você aponta", "Diz palavras como “eu” ou “nós”"], cognitive: ["Usa coisas para fingir", "Mostra habilidades simples de resolução de problemas", "Segue instruções de duas etapas", "Mostra que conhece pelo menos uma cor"], motor: ["Usa as mãos para torcer as coisas", "Tira algumas roupas sozinho", "Salta do chão com os dois pés", "Vira as páginas do livro uma de cada vez"] },
  36: { social: ["Acalma-se dentro de 10 minutos depois que você o deixa em algum lugar", "Nota a presença de outras crianças e se junta a elas para brincar"], language: ["Conversa usando pelo menos duas interações de ida e volta", "Faz perguntas “quem”, “o quê”, “onde” ou “por que”", "Diz qual ação acontece em uma foto ou livro", "Diz o primeiro nome", "Fala bem o suficiente para que os outros entendam na maioria das vezes"], cognitive: ["Desenha um círculo quando você mostra como", "Evita tocar em objetos quentes quando você o avisa"], motor: ["Amarra itens juntos", "Veste algumas roupas sozinho", "Usa um garfo"] },
  48: { social: ["Finge ser outra coisa durante a brincadeira", "Pede para brincar com outras crianças", "Conforta os outros que estão machucados ou tristes", "Evita o perigo", "Gosta de ser um ajudante", "Muda o comportamento conforme o lugar"], language: ["Diz frases com quatro ou mais palavras", "Diz algumas palavras de uma música, história ou canção", "Fala sobre algo que aconteceu durante o dia", "Responde a perguntas simples"], cognitive: ["Nomeia algumas cores", "Conta o que vem a seguir em uma história conhecida", "Desenha uma pessoa com três ou mais partes do corpo"], motor: ["Agarra uma bola grande na maioria das vezes", "Serve-se de comida ou água com supervisão", "Desabotoa alguns botões", "Segura giz de cera ou lápis entre os dedos e o polegar"] },
  60: { social: ["Segue regras ou se reveza quando brinca com outras crianças", "Canta, dança ou atua para você", "Faz tarefas simples em casa"], language: ["Conta uma história com pelo menos dois eventos", "Responde a perguntas simples sobre um livro ou história", "Mantém uma conversa em andamento com mais de três interações", "Usa ou reconhece rimas simples"], cognitive: ["Conta até 10", "Nomeia alguns números entre 1 e 5", "Usa palavras sobre o tempo", "Presta atenção por 5 a 10 minutos durante atividades", "Escreve algumas letras em seu nome", "Nomeia algumas letras"], motor: ["Abotoa alguns botões", "Pula com um pé só"] }
};

const DOMAINS = [
  { key: "social", label: "Social e emocional", note: "como a criança brinca, reage e se relaciona", color: "#db6fa7" },
  { key: "language", label: "Linguagem e comunicação", note: "como ela entende e se expressa", color: "#5e9eea" },
  { key: "cognitive", label: "Cognitivo", note: "aprender, pensar e resolver problemas", color: "#967ce5" },
  { key: "motor", label: "Movimento e desenvolvimento físico", note: "como move o corpo e usa as mãos", color: "#45bfa8" }
];

const state = { screen: "home", name: "", birthDate: "", age: "", respondent: "", answers: {}, concerns: { concern: "", loss: "", notes: "" } };
const app = document.querySelector("#app");
const restartButton = document.querySelector(".restart-button");

const icon = (name) => name === "spark" ? `<svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="m12 3-1.4 5.6L5 10l5.6 1.4L12 17l1.4-5.6L19 10l-5.6-1.4L12 3Z"/><path d="m19 16-.7 2.3L16 19l2.3.7L19 22l.7-2.3L22 19l-2.3-.7L19 16Z"/></svg>` : `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="9"/><path d="M12 10v5"/><path d="M12 7h.01"/></svg>`;
const escapeHtml = (value) => String(value || "").replace(/[&<>'"]/g, char => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", "'":"&#39;", '"':"&quot;" }[char]));
const ageLabel = () => AGE_GROUPS.find(item => String(item.value) === String(state.age))?.label || "";
const milestones = () => Object.entries(CHECKLISTS[state.age] || {}).flatMap(([domain, entries]) => entries.map((text, index) => ({ id: `${domain}-${index}`, domain, text })));
const answeredCount = () => milestones().filter(item => state.answers[item.id]).length;
const selected = (id, value) => state.answers[id] === value ? `selected ${value}` : "";

function render() {
  restartButton.hidden = state.screen === "home";
  if (state.screen === "home") return renderHome();
  if (state.screen === "profile") return renderProfile();
  if (state.screen === "checklist") return renderChecklist();
  if (state.screen === "context") return renderContext();
  renderResult();
}

function renderHome() {
  app.innerHTML = `<section class="hero" id="inicio"><div><p class="eyebrow">Acompanhamento do desenvolvimento</p><h1>Pequenos passos.<br>Um olhar atento.</h1><p class="lead">Registre os marcos que você observa no dia a dia e leve uma conversa mais clara para a próxima consulta.</p><div class="button-row"><button class="primary-button" data-action="start">Começar acompanhamento</button></div><div class="hero-note">${icon("spark")}<span>Feito para acompanhar, não para diagnosticar. Seus dados ficam neste dispositivo.</span></div></div><div class="hero-art" aria-hidden="true"><span class="orb one"></span><span class="orb two"></span><span class="orb three"></span><div class="hero-art-copy"><span>Um registro de cada vez</span><strong>O que você observa importa.</strong></div></div></section>`;
}

function stepper(active) { return `<div class="stepper" aria-label="Etapa ${active} de 3">${[1,2,3].map(n => `<span class="${n <= active ? "done" : ""}"></span>`).join("")}</div>`; }
function renderProfile() {
  app.innerHTML = `<section class="step-shell"><div class="step-head">${stepper(1)}<p class="section-label">Primeiro, alguns dados</p><h2>Para quem vamos olhar hoje?</h2><p class="lead">Você pode usar apenas as iniciais. Esses dados aparecem no resumo, se preenchidos.</p></div><form class="form-card" id="profile-form"><div class="form-grid"><div class="field"><label for="child-name">Nome ou iniciais</label><input id="child-name" value="${escapeHtml(state.name)}" placeholder="Ex.: Sofia M." autocomplete="off"></div><div class="field"><label for="respondent">Quem está preenchendo?</label><input id="respondent" value="${escapeHtml(state.respondent)}" placeholder="Ex.: mãe, educadora" autocomplete="off"></div><div class="field"><label for="birth-date">Data de nascimento</label><input id="birth-date" type="date" value="${state.birthDate}"></div><div class="field"><label for="age">Faixa para acompanhar <span aria-hidden="true">*</span></label><select id="age" required><option value="">Selecione a idade</option>${AGE_GROUPS.map(group => `<option value="${group.value}" ${String(state.age) === String(group.value) ? "selected" : ""}>${group.label}</option>`).join("")}</select></div></div><p class="age-suggestion hidden" id="age-suggestion"></p><p class="mini-disclaimer">O checklist reúne marcos que a maioria das crianças costuma apresentar até essa idade. Ele não estabelece um diagnóstico.</p><div class="bottom-actions"><button type="button" class="quiet-button" data-action="home">Voltar</button><button class="primary-button" type="submit">Ver checklist</button></div></form></section>`;
  document.querySelector("#profile-form").addEventListener("submit", saveProfile);
  document.querySelector("#birth-date").addEventListener("change", updateAgeSuggestion);
  updateAgeSuggestion();
}

function updateAgeSuggestion() {
  const value = document.querySelector("#birth-date").value;
  const output = document.querySelector("#age-suggestion");
  if (!value) return output.classList.add("hidden");
  const months = Math.floor((Date.now() - new Date(`${value}T12:00:00`).getTime()) / 2629800000);
  const closest = AGE_GROUPS.reduce((best, entry) => Math.abs(entry.value - months) < Math.abs(best.value - months) ? entry : best);
  output.textContent = `Pela data informada, a faixa mais próxima é ${closest.label}. Você pode escolher outra, se preferir.`;
  output.classList.remove("hidden");
}

function saveProfile(event) {
  event.preventDefault();
  state.name = document.querySelector("#child-name").value.trim();
  state.respondent = document.querySelector("#respondent").value.trim();
  state.birthDate = document.querySelector("#birth-date").value;
  const newAge = document.querySelector("#age").value;
  if (newAge !== state.age) state.answers = {};
  state.age = newAge;
  state.screen = "checklist";
  render();
}

function renderChecklist() {
  const total = milestones().length;
  const completed = answeredCount();
  let count = 0;
  const sections = DOMAINS.map(domain => {
    const entries = CHECKLISTS[state.age][domain.key] || [];
    if (!entries.length) return "";
    const cards = entries.map((entry, index) => {
      count += 1; const id = `${domain.key}-${index}`;
      return `<article class="milestone"><div class="milestone-top"><span class="milestone-number">${count}</span><div class="milestone-text">${entry}</div></div><div class="answer-row" role="group" aria-label="Resposta para ${escapeHtml(entry)}"><button class="choice ${selected(id, "yes")}" data-answer="yes" data-id="${id}" type="button">Observo</button><button class="choice ${selected(id, "unsure")}" data-answer="unsure" data-id="${id}" type="button">Não tenho certeza</button><button class="choice ${selected(id, "no")}" data-answer="no" data-id="${id}" type="button">Ainda não observo</button></div></article>`;
    }).join("");
    return `<section class="domain" style="--domain:${domain.color}"><h3 class="domain-title"><span class="domain-dot"></span>${domain.label}</h3><p class="domain-note">${domain.note}</p>${cards}</section>`;
  }).join("");
  app.innerHTML = `<section class="step-shell"><div class="checklist-top"><div><p class="section-label">${ageLabel()} · ${total} marcos</p><h2>O que você observa?</h2></div><div class="progress-copy"><span>${completed} de ${total} respondidos</span><div class="progress-track"><div class="progress-fill" style="width:${total ? (completed / total) * 100 : 0}%"></div></div></div></div><div class="notice">${icon("info")}<span>Leia cada frase pensando no dia a dia. Não há resposta certa: registre o que você observa agora.</span></div>${sections}<div class="bottom-actions"><button class="secondary-button" data-action="profile" type="button">Trocar idade</button><button class="primary-button" data-action="context" type="button">Continuar</button></div></section>`;
}

function renderContext() {
  app.innerHTML = `<section class="step-shell"><div class="step-head">${stepper(3)}<p class="section-label">Contexto</p><h2>Há algo mais que você queira registrar?</h2><p class="lead">Estas perguntas ajudam a preparar a conversa com quem acompanha a criança.</p></div><div class="form-card"><div class="question-block"><p class="question-title">Existe algo no desenvolvimento da criança que preocupa você?</p><div class="yes-no"><button class="choice ${state.concerns.concern === "yes" ? "selected no" : ""}" data-context="concern" data-value="yes" type="button">Sim</button><button class="choice ${state.concerns.concern === "no" ? "selected yes" : ""}" data-context="concern" data-value="no" type="button">Não</button></div></div><div class="question-block"><p class="question-title">A criança perdeu alguma habilidade que já tinha?</p><div class="yes-no"><button class="choice ${state.concerns.loss === "yes" ? "selected no" : ""}" data-context="loss" data-value="yes" type="button">Sim</button><button class="choice ${state.concerns.loss === "no" ? "selected yes" : ""}" data-context="loss" data-value="no" type="button">Não</button></div></div><div class="field"><label for="notes">Observações para levar à consulta <span class="hint">(opcional)</span></label><textarea id="notes" placeholder="O que a criança gosta de fazer? Há alguma situação que merece ser comentada?">${escapeHtml(state.concerns.notes)}</textarea></div><p class="mini-disclaimer">Se você observar perda de habilidades ou tiver preocupações, compartilhe este registro com o profissional de saúde que acompanha a criança.</p><div class="bottom-actions"><button class="secondary-button" data-action="checklist" type="button">Voltar às respostas</button><button class="primary-button" data-action="result" type="button">Ver resumo</button></div></div></section>`;
}

function responseTotals() { return milestones().reduce((totals, item) => { totals[state.answers[item.id] || "unanswered"] += 1; return totals; }, { yes: 0, unsure: 0, no: 0, unanswered: 0 }); }
function resultItems(type) { return milestones().filter(item => state.answers[item.id] === type).map(item => `<div class="result-item ${type === "no" ? "no" : ""}"><small>${DOMAINS.find(domain => domain.key === item.domain).label}</small>${item.text}</div>`).join(""); }
function renderResult() {
  const totals = responseTotals();
  const named = state.name ? `de ${escapeHtml(state.name)}` : "";
  const hasAttention = totals.no || totals.unsure || state.concerns.concern === "yes" || state.concerns.loss === "yes";
  const message = hasAttention ? `Este resumo reúne pontos que podem ajudar uma conversa com o profissional que acompanha a criança. Ele não confirma nem descarta qualquer condição.` : `Você registrou os marcos observados até agora. Continue acompanhando mudanças no dia a dia e leve este registro às consultas, se for útil.`;
  app.innerHTML = `<section class="step-shell"><div class="result-head"><p class="result-date">Registro · ${new Intl.DateTimeFormat("pt-BR").format(new Date())}</p><h1>Resumo ${named}</h1><p class="lead">Checklist de ${ageLabel()}</p></div><div class="summary-grid"><div class="summary-card green"><strong>${totals.yes}</strong><span>Observo</span></div><div class="summary-card amber"><strong>${totals.unsure}</strong><span>Não tenho certeza</span></div><div class="summary-card coral"><strong>${totals.no}</strong><span>Ainda não observo</span></div></div>${totals.unanswered ? `<p class="hint">${totals.unanswered} ${totals.unanswered === 1 ? "marco ficou" : "marcos ficaram"} sem resposta.</p>` : ""}<div class="result-message"><h3>Um registro para apoiar a conversa.</h3><p>${message}</p></div>${totals.no ? `<section class="result-section"><h3>Ainda não observo <span class="hint">${totals.no}</span></h3><div class="result-list">${resultItems("no")}</div></section>` : ""}${totals.unsure ? `<section class="result-section"><h3>Não tenho certeza <span class="hint">${totals.unsure}</span></h3><p>Se fizer sentido, observe esses marcos em diferentes momentos da rotina e converse sobre eles na próxima consulta.</p><div class="result-list">${resultItems("unsure")}</div></section>` : ""}<section class="result-section"><h3>O que levar para a consulta</h3><div class="info-card"><p class="hint">${state.concerns.loss === "yes" ? "Você registrou perda de uma habilidade. Procure conversar com o profissional de saúde que acompanha a criança." : "Compartilhe as observações e use este checklist como ponto de partida para a conversa."}</p>${state.concerns.notes ? `<p>${escapeHtml(state.concerns.notes)}</p>` : ""}</div></section><section class="export-card"><p class="section-label" style="color:#bdb3ff">Pronto para compartilhar</p><h2>Leve o resumo com você.</h2><p>Abra a impressão para salvar um PDF ou prepare uma mensagem no WhatsApp. O envio final continua sob seu controle.</p><div class="button-row result-actions"><button class="primary-button" data-action="pdf" type="button">Salvar como PDF</button><button class="secondary-button" data-action="whatsapp" type="button">Compartilhar no WhatsApp</button><button class="secondary-button" data-action="copy" type="button">Copiar resumo</button></div></section><p class="legal-note">Este checklist é uma ferramenta de acompanhamento dos marcos do desenvolvimento. Não é um instrumento de triagem validado, não faz diagnóstico e não substitui avaliação profissional. Fonte: CDC, Learn the Signs. Act Early. Tradução brasileira consultada pela equipe do projeto.</p><div class="bottom-actions"><button class="secondary-button" data-action="checklist" type="button">Revisar respostas</button><button class="primary-button" data-action="restart" type="button">Novo acompanhamento</button></div></section>`;
}

function textSummary() {
  const totals = responseTotals(); const label = state.name ? ` da criança ${state.name}` : "";
  const unanswered = totals.unanswered ? `\nSem resposta: ${totals.unanswered}` : "";
  const noItems = milestones().filter(item => state.answers[item.id] === "no").map(item => `• ${item.text}`).join("\n");
  const unsureItems = milestones().filter(item => state.answers[item.id] === "unsure").map(item => `• ${item.text}`).join("\n");
  return `Resumo de acompanhamento${label}\nFaixa: ${ageLabel()}\nData: ${new Intl.DateTimeFormat("pt-BR").format(new Date())}\n\nObservo: ${totals.yes}\nNão tenho certeza: ${totals.unsure}\nAinda não observo: ${totals.no}${unanswered}${noItems ? `\n\nAinda não observo:\n${noItems}` : ""}${unsureItems ? `\n\nNão tenho certeza:\n${unsureItems}` : ""}\n\nEste checklist acompanha marcos do desenvolvimento e não substitui uma avaliação profissional.`;
}

function handleAction(action) {
  if (action === "start") state.screen = "profile";
  if (action === "home") state.screen = "home";
  if (action === "profile") state.screen = "profile";
  if (action === "checklist") state.screen = "checklist";
  if (action === "context") state.screen = "context";
  if (action === "result") { state.concerns.notes = document.querySelector("#notes")?.value.trim() || state.concerns.notes; state.screen = "result"; }
  if (action === "restart") { Object.assign(state, { screen: "home", name: "", birthDate: "", age: "", respondent: "", answers: {}, concerns: { concern: "", loss: "", notes: "" } }); }
  if (action === "pdf") window.print();
  if (action === "whatsapp") window.open(`https://wa.me/?text=${encodeURIComponent(textSummary())}`, "_blank", "noopener");
  if (action === "copy") navigator.clipboard?.writeText(textSummary()).then(() => { const button = document.querySelector('[data-action="copy"]'); if (button) { button.textContent = "Resumo copiado"; setTimeout(() => button.textContent = "Copiar resumo", 1800); } });
  render();
}

document.addEventListener("click", event => {
  const answer = event.target.closest("[data-answer]");
  if (answer) { state.answers[answer.dataset.id] = answer.dataset.answer; render(); return; }
  const context = event.target.closest("[data-context]");
  if (context) { state.concerns[context.dataset.context] = context.dataset.value; render(); return; }
  const action = event.target.closest("[data-action]")?.dataset.action;
  if (action) handleAction(action);
});
render();
