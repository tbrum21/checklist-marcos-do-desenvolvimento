(function (root) {
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

  function getAgeLabel(ageMonths) {
    return AGE_GROUPS.find((item) => String(item.value) === String(ageMonths))?.label || "";
  }

  function getMilestones(ageMonths) {
    const checklist = CHECKLISTS[Number(ageMonths)] || {};
    return Object.entries(checklist).flatMap(([domain, entries]) =>
      entries.map((text, index) => ({ id: `${domain}-${index}`, domain, text }))
    );
  }

  function computeTotals(ageMonths, answers) {
    const list = getMilestones(ageMonths);
    const map = answers || {};
    const totals = list.reduce(
      (acc, item) => {
        const val = map[item.id];
        if (val === "yes" || val === "unsure" || val === "no") acc[val] += 1;
        else acc.unanswered += 1;
        return acc;
      },
      { yes: 0, unsure: 0, no: 0, unanswered: 0, total: list.length }
    );
    return totals;
  }

  function computeDomainBreakdown(ageMonths, answers) {
    const map = answers || {};
    const checklist = CHECKLISTS[Number(ageMonths)] || {};
    return DOMAINS.map((domain) => {
      const entries = checklist[domain.key] || [];
      let yes = 0;
      let unsure = 0;
      let no = 0;
      entries.forEach((_, idx) => {
        const val = map[`${domain.key}-${idx}`];
        if (val === "yes") yes += 1;
        else if (val === "unsure") unsure += 1;
        else if (val === "no") no += 1;
      });
      const total = entries.length;
      const pctYes = total ? Math.round((yes / total) * 100) : 0;
      return { ...domain, yes, unsure, no, total, pctYes };
    });
  }

  function suggestAgeGroup(birthDate, nowMs) {
    if (!birthDate) return null;
    const birthMs = new Date(`${birthDate}T12:00:00`).getTime();
    if (Number.isNaN(birthMs)) return null;
    const refMs = typeof nowMs === "number" ? nowMs : Date.now();
    const months = Math.max(0, Math.floor((refMs - birthMs) / 2629800000));
    const closest = AGE_GROUPS.reduce((best, entry) =>
      Math.abs(entry.value - months) < Math.abs(best.value - months) ? entry : best
    );
    return { months, closest };
  }

  function formatChildAge(birthDate, nowDate) {
    if (!birthDate) return "";
    const parts = String(birthDate).split("-").map(Number);
    if (parts.length !== 3 || parts.some(Number.isNaN)) return "";
    const now = nowDate instanceof Date ? nowDate : new Date();
    let years = now.getFullYear() - parts[0];
    let months = now.getMonth() + 1 - parts[1];
    if (now.getDate() < parts[2]) months -= 1;
    if (months < 0) {
      years -= 1;
      months += 12;
    }
    if (years < 0) return "Recém-nascido";
    if (years === 0) return months <= 1 ? `${Math.max(0, months)} mês` : `${months} meses`;
    if (months === 0) return years === 1 ? "1 ano" : `${years} anos`;
    return `${years === 1 ? "1 ano" : `${years} anos`} e ${months === 1 ? "1 mês" : `${months} meses`}`;
  }

  function compareAssessments(latest, previous) {
    if (!latest || !previous) return null;
    const latestPct = latest.total_count ? Math.round((latest.yes_count / latest.total_count) * 100) : 0;
    const prevPct = previous.total_count ? Math.round((previous.yes_count / previous.total_count) * 100) : 0;
    const deltaPct = latestPct - prevPct;
    const gained = [];
    if (Number(latest.age_months) === Number(previous.age_months)) {
      const list = getMilestones(latest.age_months);
      const prevAnswers = previous.answers || {};
      const currAnswers = latest.answers || {};
      list.forEach((item) => {
        if (prevAnswers[item.id] !== "yes" && currAnswers[item.id] === "yes") {
          gained.push(item);
        }
      });
    }
    return {
      latestPct,
      prevPct,
      deltaPct,
      sameAgeGroup: Number(latest.age_months) === Number(previous.age_months),
      gained
    };
  }

  const api = {
    AGE_GROUPS,
    CHECKLISTS,
    DOMAINS,
    getAgeLabel,
    getMilestones,
    computeTotals,
    computeDomainBreakdown,
    suggestAgeGroup,
    formatChildAge,
    compareAssessments
  };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  } else {
    root.MARCOS_DATA = api;
  }
})(typeof window !== "undefined" ? window : globalThis);
