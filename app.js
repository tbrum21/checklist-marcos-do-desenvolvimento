const {
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
} = window.MARCOS_DATA;

const supabaseClient =
  window.supabase && window.MARCOS_CONFIG?.supabaseUrl && window.MARCOS_CONFIG?.supabaseKey
    ? window.supabase.createClient(window.MARCOS_CONFIG.supabaseUrl, window.MARCOS_CONFIG.supabaseKey)
    : null;

const app = document.querySelector("#app");
const headerActions = document.querySelector("#header-actions");
const toastRegion = document.querySelector("#toast-region");

const todayIso = () => new Date().toISOString().slice(0, 10);

const state = {
  screen: "home",
  loading: false,
  saving: false,
  user: null,
  profile: null,
  authFeedback: null,
  passwordFeedback: null,
  // Superadmin state
  professionals: [],
  adminLoading: false,
  adminFeedback: null,
  lastCredentials: null,
  // Clinical state
  patients: [],
  patientSearch: "",
  showArchived: false,
  activePatientId: null,
  editingPatientId: null,
  assessments: [],
  // Assessment draft
  editingAssessmentId: null,
  assessedAt: todayIso(),
  name: "",
  birthDate: "",
  age: "",
  respondent: "",
  answers: {},
  concerns: { concern: "", loss: "", notes: "" },
  savedJustNow: false
};

const icon = (name) =>
  name === "spark"
    ? `<svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="m12 3-1.4 5.6L5 10l5.6 1.4L12 17l1.4-5.6L19 10l-5.6-1.4L12 3Z"/><path d="m19 16-.7 2.3L16 19l2.3.7L19 22l.7-2.3L22 19l-2.3-.7L19 16Z"/></svg>`
    : `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="9"/><path d="M12 10v5"/><path d="M12 7h.01"/></svg>`;

const escapeHtml = (value) =>
  String(value || "").replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[char]));

function formatDateBr(isoDate) {
  if (!isoDate) return "—";
  const date = new Date(`${String(isoDate).slice(0, 10)}T12:00:00`);
  if (Number.isNaN(date.getTime())) return String(isoDate);
  return new Intl.DateTimeFormat("pt-BR").format(date);
}

function showToast(message, type = "info") {
  if (!toastRegion) return;
  const el = document.createElement("div");
  el.className = `toast ${type}`;
  el.textContent = message;
  toastRegion.appendChild(el);
  setTimeout(() => el.remove(), 4000);
}

function activePatient() {
  return state.patients.find((p) => p.id === state.activePatientId) || null;
}

function isSuperadmin() {
  return state.profile?.role === "superadmin";
}

function requiresPasswordChange() {
  return Boolean(state.user && state.profile?.must_change_password);
}

function defaultAuthenticatedScreen() {
  if (requiresPasswordChange()) return "change-password";
  return isSuperadmin() ? "superadmin" : "dashboard";
}

function professionalDisplayName() {
  return state.profile?.full_name || state.user?.user_metadata?.full_name || state.user?.email || "Profissional";
}

function resetAssessmentDraft(patient = null) {
  state.editingAssessmentId = null;
  state.assessedAt = todayIso();
  state.answers = {};
  state.concerns = { concern: "", loss: "", notes: "" };
  state.savedJustNow = false;

  if (patient) {
    state.activePatientId = patient.id;
    state.name = patient.full_name || "";
    state.birthDate = patient.birth_date || "";
    state.respondent = patient.guardian_name || professionalDisplayName();
    const suggestion = suggestAgeGroup(patient.birth_date);
    state.age = suggestion ? String(suggestion.closest.value) : "";
  } else {
    state.activePatientId = null;
    state.name = "";
    state.birthDate = "";
    state.age = "";
    state.respondent = "";
  }
}

function translateAuthError(message) {
  const text = String(message || "").toLowerCase();
  if (text.includes("invalid login credentials")) return "E-mail ou senha incorretos.";
  if (text.includes("email not confirmed")) return "Conta aguardando confirmação de e-mail.";
  if (text.includes("user is banned")) return "Este acesso está temporariamente bloqueado. Contate a administração.";
  if (text.includes("password should be at least")) return "A senha deve ter pelo menos 6 caracteres.";
  if (text.includes("new password should be different")) return "A nova senha precisa ser diferente da senha temporária atual.";
  if (text.includes("rate limit")) return "Muitas tentativas em sequência. Aguarde alguns instantes e tente novamente.";
  return message || "Não foi possível completar a solicitação.";
}

// ============================================================================
// SUPABASE DATA & ADMIN LAYER
// ============================================================================

async function syncProfile(user) {
  if (!supabaseClient || !user) return;
  const { data } = await supabaseClient.from("profiles").select("*").eq("id", user.id).maybeSingle();
  if (data) {
    state.profile = data;
    return;
  }
  const fullName = user.user_metadata?.full_name || user.email?.split("@")[0] || "Profissional";
  const crp = user.user_metadata?.crp || "";
  const { data: inserted } = await supabaseClient
    .from("profiles")
    .upsert({ id: user.id, email: user.email || "", full_name: fullName, crp })
    .select()
    .single();
  if (inserted) state.profile = inserted;
}

async function callAdminApi(body) {
  if (!supabaseClient) throw new Error("Cliente Supabase não configurado.");
  const action = body?.action;
  let res;

  if (action === "list") {
    res = await supabaseClient.rpc("admin_list_professionals");
  } else if (action === "create") {
    res = await supabaseClient.rpc("admin_create_professional", {
      p_full_name: body.full_name,
      p_email: body.email,
      p_crp: body.crp || ""
    });
  } else if (action === "reset_password") {
    res = await supabaseClient.rpc("admin_reset_professional_password", {
      p_user_id: body.user_id
    });
  } else if (action === "toggle_active") {
    res = await supabaseClient.rpc("admin_toggle_professional_active", {
      p_user_id: body.user_id,
      p_active: Boolean(body.active)
    });
  } else if (action === "delete") {
    res = await supabaseClient.rpc("admin_delete_professional", {
      p_user_id: body.user_id
    });
  } else {
    throw new Error("Ação administrativa inválida.");
  }

  if (res.error) {
    throw new Error(res.error.message || "Erro na operação administrativa.");
  }
  return res.data;
}

async function loadSuperadminData() {
  if (!isSuperadmin()) return;
  state.adminLoading = true;
  state.adminFeedback = null;
  render();
  try {
    const data = await callAdminApi({ action: "list" });
    state.professionals = data.professionals || [];
  } catch (err) {
    state.adminFeedback = { type: "error", message: err.message };
  }
  state.adminLoading = false;
  render();
}

async function loadDashboardData() {
  if (!supabaseClient || !state.user) return;
  state.loading = true;
  render();
  const [patientsRes, assessmentsRes] = await Promise.all([
    supabaseClient.from("patients").select("*").order("created_at", { ascending: false }),
    supabaseClient.from("assessments").select("*").order("assessed_at", { ascending: false }).order("created_at", { ascending: false })
  ]);
  state.loading = false;
  if (patientsRes.error) showToast("Erro ao carregar pacientes: " + patientsRes.error.message, "error");
  else state.patients = patientsRes.data || [];
  if (assessmentsRes.error) showToast("Erro ao carregar avaliações: " + assessmentsRes.error.message, "error");
  else state.assessments = assessmentsRes.data || [];
  render();
}

async function savePatientToDb(payload, patientId = null) {
  if (!supabaseClient || !state.user) return null;
  state.saving = true;
  render();
  let res;
  if (patientId) {
    res = await supabaseClient.from("patients").update(payload).eq("id", patientId).select().single();
  } else {
    res = await supabaseClient
      .from("patients")
      .insert({ ...payload, professional_id: state.user.id })
      .select()
      .single();
  }
  state.saving = false;
  if (res.error) {
    showToast("Erro ao salvar paciente: " + res.error.message, "error");
    render();
    return null;
  }
  const saved = res.data;
  const idx = state.patients.findIndex((p) => p.id === saved.id);
  if (idx >= 0) state.patients[idx] = saved;
  else state.patients.unshift(saved);
  showToast(patientId ? "Dados do paciente atualizados." : "Paciente cadastrado com sucesso.", "success");
  return saved;
}

async function toggleArchivePatient(patient) {
  if (!supabaseClient || !patient) return;
  const { data, error } = await supabaseClient
    .from("patients")
    .update({ archived: !patient.archived })
    .eq("id", patient.id)
    .select()
    .single();
  if (error) {
    showToast("Erro ao atualizar status: " + error.message, "error");
    return;
  }
  const idx = state.patients.findIndex((p) => p.id === data.id);
  if (idx >= 0) state.patients[idx] = data;
  showToast(data.archived ? "Paciente arquivado." : "Paciente reativado.", "success");
  render();
}

async function deletePatient(patient) {
  if (!supabaseClient || !patient) return;
  const ok = window.confirm(`Excluir o paciente "${patient.full_name}" e todo o seu histórico de avaliações? Essa ação não pode ser desfeita.`);
  if (!ok) return;
  const { error } = await supabaseClient.from("patients").delete().eq("id", patient.id);
  if (error) {
    showToast("Erro ao excluir paciente: " + error.message, "error");
    return;
  }
  state.patients = state.patients.filter((p) => p.id !== patient.id);
  state.assessments = state.assessments.filter((a) => a.patient_id !== patient.id);
  state.activePatientId = null;
  state.screen = "dashboard";
  showToast("Paciente excluído.", "success");
  render();
}

async function saveAssessmentToDb() {
  if (!supabaseClient || !state.user || !state.activePatientId) return null;
  const totals = computeTotals(state.age, state.answers);
  const payload = {
    patient_id: state.activePatientId,
    assessed_at: state.assessedAt || todayIso(),
    age_months: Number(state.age),
    respondent: state.respondent.trim(),
    answers: state.answers,
    concern: state.concerns.concern || "",
    skill_loss: state.concerns.loss || "",
    notes: state.concerns.notes || "",
    yes_count: totals.yes,
    unsure_count: totals.unsure,
    no_count: totals.no,
    total_count: totals.total
  };

  state.saving = true;
  render();

  let res;
  if (state.editingAssessmentId) {
    res = await supabaseClient.from("assessments").update(payload).eq("id", state.editingAssessmentId).select().single();
  } else {
    res = await supabaseClient
      .from("assessments")
      .insert({ ...payload, professional_id: state.user.id })
      .select()
      .single();
  }

  state.saving = false;
  if (res.error) {
    showToast("Não foi possível salvar a avaliação: " + res.error.message, "error");
    render();
    return null;
  }

  const saved = res.data;
  state.editingAssessmentId = saved.id;
  state.savedJustNow = true;
  const idx = state.assessments.findIndex((a) => a.id === saved.id);
  if (idx >= 0) state.assessments[idx] = saved;
  else state.assessments.unshift(saved);
  state.assessments.sort((a, b) => String(b.assessed_at).localeCompare(String(a.assessed_at)) || String(b.created_at).localeCompare(String(a.created_at)));
  showToast("Evolução salva no prontuário do paciente.", "success");
  return saved;
}

async function deleteAssessment(assessmentId) {
  if (!supabaseClient || !assessmentId) return;
  const ok = window.confirm("Excluir este registro de avaliação? Essa ação não pode ser desfeita.");
  if (!ok) return;
  const { error } = await supabaseClient.from("assessments").delete().eq("id", assessmentId);
  if (error) {
    showToast("Erro ao excluir avaliação: " + error.message, "error");
    return;
  }
  state.assessments = state.assessments.filter((a) => a.id !== assessmentId);
  showToast("Avaliação removida.", "success");
  render();
}

// ============================================================================
// HEADER & MAIN RENDERER
// ============================================================================

function renderHeader() {
  if (state.user) {
    const crpTag = state.profile?.crp ? ` · CRP ${escapeHtml(state.profile.crp)}` : "";
    const roleTag = isSuperadmin() ? " · Superadmin" : "";
    const mustChange = requiresPasswordChange();

    headerActions.innerHTML = `
      <span class="user-pill" title="${escapeHtml(state.user.email)}"><span class="user-pill-dot"></span>${escapeHtml(professionalDisplayName())}${crpTag}${roleTag}</span>
      ${!mustChange && isSuperadmin() ? `<button class="quiet-button" type="button" data-action="go-superadmin">Superadmin</button>` : ""}
      ${!mustChange ? `<button class="quiet-button" type="button" data-action="go-dashboard">Pacientes</button>` : ""}
      ${!mustChange ? `<button class="quiet-button" type="button" data-action="go-change-password">Alterar senha</button>` : ""}
      <button class="quiet-button" type="button" data-action="logout">Sair</button>
    `;
    return;
  }

  const showRestart = ["profile", "checklist", "context", "result"].includes(state.screen);
  headerActions.innerHTML = `
    ${showRestart ? `<button class="quiet-button" type="button" data-action="restart">Nova avaliação</button>` : ""}
    ${state.screen !== "auth" ? `<button class="secondary-button small-btn" type="button" data-action="go-auth">Entrar</button>` : `<button class="quiet-button" type="button" data-action="home">Voltar ao início</button>`}
  `;
}

function render() {
  if (requiresPasswordChange() && state.screen !== "change-password") {
    state.screen = "change-password";
  }
  renderHeader();
  if (state.screen === "home") return renderHome();
  if (state.screen === "auth") return renderAuth();
  if (state.screen === "change-password") return renderChangePassword();
  if (state.screen === "superadmin") return renderSuperadmin();
  if (state.screen === "dashboard") return renderDashboard();
  if (state.screen === "patient-form") return renderPatientForm();
  if (state.screen === "patient-detail") return renderPatientDetail();
  if (state.screen === "profile") return renderProfile();
  if (state.screen === "checklist") return renderChecklist();
  if (state.screen === "context") return renderContext();
  renderResult();
}

// ============================================================================
// SCREENS: HOME, AUTH & CHANGE PASSWORD
// ============================================================================

function renderHome() {
  const primaryLabel = state.user
    ? isSuperadmin()
      ? "Abrir painel Superadmin"
      : "Ir para meus pacientes"
    : "Entrar como psicólogo(a)";
  const primaryAction = state.user ? (isSuperadmin() ? "go-superadmin" : "go-dashboard") : "go-auth";

  app.innerHTML = `
    <section class="hero" id="inicio">
      <div>
        <p class="eyebrow">Acompanhamento do desenvolvimento infantil</p>
        <h1>Pequenos passos.<br>Evolução registrada.</h1>
        <p class="lead">Acompanhe marcos do desenvolvimento de cada paciente ao longo das consultas, compare avanços entre sessões e gere resumos claros para a família.</p>
        <div class="button-row">
          <button class="primary-button" type="button" data-action="${primaryAction}">${primaryLabel}</button>
          <button class="secondary-button" type="button" data-action="start-guest">Avaliação rápida sem conta</button>
        </div>
        <div class="hero-note">${icon("spark")}<span>O acesso profissional é gerenciado pela administração. No primeiro login com a senha temporária, o psicólogo define imediatamente sua senha pessoal.</span></div>
      </div>
      <div class="hero-art" aria-hidden="true">
        <span class="orb one"></span>
        <span class="orb two"></span>
        <span class="orb three"></span>
        <div class="hero-art-copy">
          <span>Um registro de cada vez</span>
          <strong>Acompanhe cada conquista no tempo certo.</strong>
        </div>
      </div>
    </section>
  `;
}

function renderAuth() {
  const feedbackHtml = state.authFeedback
    ? `<div class="form-alert ${state.authFeedback.type}" role="alert">${escapeHtml(state.authFeedback.message)}</div>`
    : "";

  app.innerHTML = `
    <section class="auth-shell">
      <div class="step-head">
        <p class="section-label">Área restrita</p>
        <h2>Entrar no consultório</h2>
        <p class="lead">Informe o e-mail e a senha fornecidos pela administração para acessar seus pacientes e registros de evolução.</p>
      </div>
      <div class="form-card">
        ${feedbackHtml}
        <form class="form-stack" id="auth-form">
          <div class="field">
            <label for="auth-email">E-mail <span aria-hidden="true">*</span></label>
            <input id="auth-email" type="email" required placeholder="voce@consultorio.com" autocomplete="email" />
          </div>
          <div class="field">
            <label for="auth-password">Senha <span aria-hidden="true">*</span></label>
            <input id="auth-password" type="password" required minlength="6" placeholder="Digite sua senha" autocomplete="current-password" />
          </div>
          <button class="primary-button" type="submit" ${state.saving ? "disabled" : ""}>
            ${state.saving ? "Entrando..." : "Entrar"}
          </button>
        </form>
        <p class="mini-disclaimer">O cadastro de novos psicólogos é feito exclusivamente pelo painel Superadmin. No primeiro acesso, você será direcionado automaticamente para criar sua senha definitiva.</p>
      </div>
    </section>
  `;

  document.querySelector("#auth-form").addEventListener("submit", handleAuthSubmit);
}

async function handleAuthSubmit(event) {
  event.preventDefault();
  if (!supabaseClient) {
    state.authFeedback = { type: "error", message: "Cliente Supabase não configurado." };
    render();
    return;
  }

  // Ler todos os campos ANTES de qualquer re-render
  const email = document.querySelector("#auth-email").value.trim();
  const password = document.querySelector("#auth-password").value;

  state.authFeedback = null;
  state.saving = true;
  render();

  const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
  state.saving = false;
  if (error) {
    state.authFeedback = { type: "error", message: translateAuthError(error.message) };
    render();
    return;
  }

  state.user = data.user;
  await syncProfile(data.user);

  if (state.profile && state.profile.active === false) {
    await supabaseClient.auth.signOut();
    state.user = null;
    state.profile = null;
    state.authFeedback = { type: "error", message: "Seu acesso está desativado. Contate a administração." };
    render();
    return;
  }

  if (requiresPasswordChange()) {
    state.passwordFeedback = null;
    state.screen = "change-password";
    showToast("Primeiro acesso identificado. Defina sua nova senha.", "info");
    render();
    return;
  }

  state.screen = defaultAuthenticatedScreen();
  showToast("Login realizado com sucesso.", "success");
  if (isSuperadmin()) await loadSuperadminData();
  await loadDashboardData();
}

function renderChangePassword() {
  const forced = requiresPasswordChange();
  const feedbackHtml = state.passwordFeedback
    ? `<div class="form-alert ${state.passwordFeedback.type}" role="alert">${escapeHtml(state.passwordFeedback.message)}</div>`
    : "";

  app.innerHTML = `
    <section class="auth-shell">
      <div class="step-head">
        <p class="section-label">${forced ? "Primeiro acesso" : "Segurança da conta"}</p>
        <h2>${forced ? "Defina sua nova senha" : "Alterar senha"}</h2>
        <p class="lead">${forced ? "Por segurança, substitua a senha temporária gerada pela administração antes de iniciar o acompanhamento dos pacientes." : "Escolha uma nova senha pessoal para acessar sua conta."}</p>
      </div>
      <div class="form-card">
        ${feedbackHtml}
        <form class="form-stack" id="change-password-form">
          <div class="field">
            <label for="new-password">Nova senha <span aria-hidden="true">*</span></label>
            <input id="new-password" type="password" required minlength="6" placeholder="Mínimo de 6 caracteres" autocomplete="new-password" />
          </div>
          <div class="field">
            <label for="confirm-new-password">Confirmar nova senha <span aria-hidden="true">*</span></label>
            <input id="confirm-new-password" type="password" required minlength="6" placeholder="Digite a nova senha novamente" autocomplete="new-password" />
          </div>
          <button class="primary-button" type="submit" ${state.saving ? "disabled" : ""}>
            ${state.saving ? "Salvando..." : "Salvar nova senha"}
          </button>
          ${!forced ? `<button class="quiet-button" type="button" data-action="${isSuperadmin() ? "go-superadmin" : "go-dashboard"}">Cancelar</button>` : ""}
        </form>
      </div>
    </section>
  `;

  document.querySelector("#change-password-form").addEventListener("submit", handleChangePasswordSubmit);
}

async function handleChangePasswordSubmit(event) {
  event.preventDefault();
  // Ler todos os campos ANTES de chamar render()
  const newPassword = document.querySelector("#new-password").value;
  const confirmPassword = document.querySelector("#confirm-new-password").value;

  if (newPassword.length < 6) {
    state.passwordFeedback = { type: "error", message: "A nova senha deve ter pelo menos 6 caracteres." };
    render();
    return;
  }

  if (newPassword !== confirmPassword) {
    state.passwordFeedback = { type: "error", message: "As senhas não coincidem. Verifique e tente novamente." };
    render();
    return;
  }

  state.passwordFeedback = null;
  state.saving = true;
  render();

  const { error: authErr } = await supabaseClient.auth.updateUser({ password: newPassword });
  if (authErr) {
    state.saving = false;
    state.passwordFeedback = { type: "error", message: translateAuthError(authErr.message) };
    render();
    return;
  }

  const { data: updatedProfile, error: profErr } = await supabaseClient
    .from("profiles")
    .update({ must_change_password: false })
    .eq("id", state.user.id)
    .select()
    .single();

  state.saving = false;
  if (profErr) {
    state.passwordFeedback = { type: "error", message: "Senha alterada, mas houve erro ao atualizar perfil: " + profErr.message };
    render();
    return;
  }

  state.profile = updatedProfile;
  state.passwordFeedback = null;
  showToast("Nova senha salva com sucesso!", "success");
  state.screen = defaultAuthenticatedScreen();
  if (isSuperadmin()) await loadSuperadminData();
  await loadDashboardData();
}

// ============================================================================
// SCREEN: SUPERADMIN PANEL
// ============================================================================

function renderSuperadmin() {
  if (!state.user || !isSuperadmin()) {
    state.screen = state.user ? "dashboard" : "auth";
    return render();
  }

  const feedbackHtml = state.adminFeedback
    ? `<div class="form-alert ${state.adminFeedback.type}" role="alert">${escapeHtml(state.adminFeedback.message)}</div>`
    : "";

  const credentialsHtml = state.lastCredentials
    ? `
      <section class="credentials-box" role="status">
        <h3>${state.lastCredentials.kind === "reset" ? "Nova senha temporária gerada" : "Acesso do psicólogo criado com sucesso"}</h3>
        <p>Envie os dados abaixo para <strong>${escapeHtml(state.lastCredentials.full_name)}</strong>. No primeiro login, o sistema solicitará automaticamente a troca da senha.</p>
        <div class="credentials-grid">
          <div class="credential-item">
            <small>E-mail de acesso</small>
            <code>${escapeHtml(state.lastCredentials.email)}</code>
          </div>
          <div class="credential-item">
            <small>Senha temporária</small>
            <code>${escapeHtml(state.lastCredentials.tempPassword)}</code>
          </div>
        </div>
        <div class="button-row" style="margin-top:0">
          <button class="primary-button small-btn" type="button" data-action="copy-credentials">Copiar credenciais</button>
          <button class="secondary-button small-btn" type="button" data-action="dismiss-credentials">Fechar aviso</button>
        </div>
      </section>
    `
    : "";

  const psychologists = state.professionals.filter((p) => p.role !== "superadmin");
  const pendingFirstAccess = psychologists.filter((p) => p.must_change_password && p.active).length;

  const listHtml = state.adminLoading
    ? `<div class="panel-card loading-card">Carregando profissionais cadastrados...</div>`
    : state.professionals.length === 0
      ? `<div class="empty-state"><h3>Nenhum profissional cadastrado</h3><p>Use o formulário acima para criar o primeiro acesso de um psicólogo.</p></div>`
      : `
        <div class="pro-list">
          ${state.professionals
            .map((pro) => {
              const isSelf = pro.id === state.user.id;
              const isAdminRow = pro.role === "superadmin";
              return `
                <article class="pro-row ${pro.active ? "" : "inactive"}">
                  <div class="pro-info">
                    <div class="pro-name">
                      <span>${escapeHtml(pro.full_name || "Sem nome")}</span>
                      ${isAdminRow ? `<span class="pill violet">Superadmin</span>` : `<span class="pill muted">Psicólogo</span>`}
                      ${pro.active ? `<span class="pill green">Ativo</span>` : `<span class="pill coral">Bloqueado</span>`}
                      ${pro.must_change_password ? `<span class="pill amber">Aguardando 1º acesso</span>` : ""}
                    </div>
                    <div class="pro-sub">
                      ${escapeHtml(pro.email || "—")}
                      ${pro.crp ? ` · CRP ${escapeHtml(pro.crp)}` : ""}
                      · ${pro.patient_count || 0} ${(pro.patient_count || 0) === 1 ? "paciente" : "pacientes"}
                      · ${pro.assessment_count || 0} ${(pro.assessment_count || 0) === 1 ? "avaliação" : "avaliações"}
                    </div>
                  </div>
                  ${
                    isSelf
                      ? `<span class="hint">Sua conta</span>`
                      : `
                        <div class="pro-actions">
                          <button class="secondary-button small-btn" type="button" data-admin-reset="${pro.id}">Nova senha</button>
                          <button class="${pro.active ? "danger-button" : "quiet-button"} small-btn" type="button" data-admin-toggle="${pro.id}" data-active="${pro.active ? "false" : "true"}">${pro.active ? "Bloquear" : "Reativar"}</button>
                        </div>
                      `
                  }
                </article>
              `;
            })
            .join("")}
        </div>
      `;

  app.innerHTML = `
    <section class="dashboard-shell">
      <div class="dashboard-top">
        <div>
          <p class="section-label">Administração</p>
          <h1>Painel Superadmin</h1>
          <p class="lead">Cadastre psicólogos, gere senhas temporárias para o primeiro acesso e controle quem pode entrar na plataforma.</p>
        </div>
        <button class="secondary-button" type="button" data-action="go-dashboard">Ir para Pacientes</button>
      </div>

      <div class="kpi-row">
        <div class="kpi-card">
          <strong>${psychologists.length}</strong>
          <span>${psychologists.length === 1 ? "Psicólogo cadastrado" : "Psicólogos cadastrados"}</span>
        </div>
        <div class="kpi-card">
          <strong>${psychologists.filter((p) => p.active).length}</strong>
          <span>Acessos ativos</span>
        </div>
        <div class="kpi-card">
          <strong>${pendingFirstAccess}</strong>
          <span>Aguardando 1º acesso</span>
        </div>
      </div>

      ${credentialsHtml}
      ${feedbackHtml}

      <section class="form-card" style="margin-bottom:28px">
        <p class="section-label">Novo acesso profissional</p>
        <h3 style="margin-bottom:16px">Cadastrar psicólogo</h3>
        <form id="admin-create-form">
          <div class="form-grid">
            <div class="field">
              <label for="pro-name">Nome completo <span aria-hidden="true">*</span></label>
              <input id="pro-name" type="text" required placeholder="Ex.: Dra. Ana Clara Silva" />
            </div>
            <div class="field">
              <label for="pro-crp">CRP <span class="hint">(opcional)</span></label>
              <input id="pro-crp" type="text" placeholder="Ex.: 06/123456" />
            </div>
            <div class="field full">
              <label for="pro-email">E-mail de login do psicólogo <span aria-hidden="true">*</span></label>
              <input id="pro-email" type="email" required placeholder="psicologo@consultorio.com" />
            </div>
          </div>
          <div class="bottom-actions" style="margin-top:22px">
            <span class="hint">Uma senha temporária segura será gerada automaticamente e exibida na tela.</span>
            <button class="primary-button" type="submit" ${state.saving ? "disabled" : ""}>${state.saving ? "Criando acesso..." : "+ Criar acesso com senha automática"}</button>
          </div>
        </form>
      </section>

      <section>
        <h3>Profissionais cadastrados (${state.professionals.length})</h3>
        ${listHtml}
      </section>
    </section>
  `;

  document.querySelector("#admin-create-form").addEventListener("submit", handleCreateProfessionalSubmit);
}

async function handleCreateProfessionalSubmit(event) {
  event.preventDefault();
  // Ler todos os campos ANTES de qualquer re-render
  const fullName = document.querySelector("#pro-name").value.trim();
  const crp = document.querySelector("#pro-crp").value.trim();
  const email = document.querySelector("#pro-email").value.trim().toLowerCase();

  if (!fullName || !email) return;

  state.saving = true;
  state.adminFeedback = null;
  render();

  try {
    const data = await callAdminApi({ action: "create", full_name: fullName, crp, email });
    state.professionals.unshift(data.professional);
    state.lastCredentials = {
      kind: "create",
      full_name: data.professional.full_name,
      email: data.professional.email,
      tempPassword: data.tempPassword
    };
    showToast("Psicólogo cadastrado com senha temporária.", "success");
  } catch (err) {
    state.adminFeedback = { type: "error", message: err.message };
  }

  state.saving = false;
  render();
}

async function handleAdminResetPassword(userId) {
  const pro = state.professionals.find((p) => p.id === userId);
  if (!pro) return;
  const ok = window.confirm(`Gerar uma nova senha temporária para ${pro.full_name}? A senha atual deixará de funcionar e o profissional precisará definir uma nova no próximo login.`);
  if (!ok) return;

  state.adminFeedback = null;
  try {
    const data = await callAdminApi({ action: "reset_password", user_id: userId });
    const idx = state.professionals.findIndex((p) => p.id === userId);
    if (idx >= 0) state.professionals[idx] = { ...state.professionals[idx], must_change_password: true };
    state.lastCredentials = {
      kind: "reset",
      full_name: pro.full_name,
      email: pro.email,
      tempPassword: data.tempPassword
    };
    showToast("Nova senha temporária gerada.", "success");
  } catch (err) {
    state.adminFeedback = { type: "error", message: err.message };
  }
  render();
}

async function handleAdminToggleActive(userId, nextActive) {
  const pro = state.professionals.find((p) => p.id === userId);
  if (!pro) return;
  state.adminFeedback = null;
  try {
    await callAdminApi({ action: "toggle_active", user_id: userId, active: nextActive });
    const idx = state.professionals.findIndex((p) => p.id === userId);
    if (idx >= 0) state.professionals[idx] = { ...state.professionals[idx], active: nextActive };
    showToast(nextActive ? "Acesso reativado." : "Acesso bloqueado.", "success");
  } catch (err) {
    state.adminFeedback = { type: "error", message: err.message };
  }
  render();
}

async function handleAdminDeleteProfessional(userId) {
  const pro = state.professionals.find((p) => p.id === userId);
  if (!pro) return;
  const ok = window.confirm(`Excluir permanentemente a conta de "${pro.full_name}" (${pro.email}) e todos os seus pacientes e avaliações?`);
  if (!ok) return;

  state.adminFeedback = null;
  try {
    await callAdminApi({ action: "delete", user_id: userId });
    state.professionals = state.professionals.filter((p) => p.id !== userId);
    showToast("Profissional excluído.", "success");
  } catch (err) {
    state.adminFeedback = { type: "error", message: err.message };
  }
  render();
}

// ============================================================================
// SCREENS: DASHBOARD & PATIENTS
// ============================================================================

function renderDashboard() {
  if (!state.user) {
    state.screen = "auth";
    return renderAuth();
  }

  const activePatients = state.patients.filter((p) => !p.archived);
  const query = state.patientSearch.trim().toLowerCase();
  const filtered = state.patients.filter((p) => {
    if (!state.showArchived && p.archived) return false;
    if (!query) return true;
    return (
      String(p.full_name || "").toLowerCase().includes(query) ||
      String(p.guardian_name || "").toLowerCase().includes(query)
    );
  });

  const latestByPatient = new Map();
  const countByPatient = new Map();
  state.assessments.forEach((a) => {
    countByPatient.set(a.patient_id, (countByPatient.get(a.patient_id) || 0) + 1);
    if (!latestByPatient.has(a.patient_id)) latestByPatient.set(a.patient_id, a);
  });

  const patientsHtml = state.loading
    ? `<div class="panel-card loading-card">Carregando pacientes e histórico...</div>`
    : filtered.length === 0
      ? `
        <div class="empty-state">
          <h3>${state.patients.length ? "Nenhum paciente encontrado" : "Cadastre seu primeiro paciente"}</h3>
          <p>${state.patients.length ? "Tente ajustar a busca ou exibir pacientes arquivados." : "Adicione os dados básicos do paciente para registrar os marcos do desenvolvimento e acompanhar a evolução ao longo das consultas."}</p>
          ${!state.patients.length ? `<button class="primary-button" type="button" data-action="new-patient">+ Cadastrar paciente</button>` : ""}
        </div>
      `
      : `
        <div class="patient-grid">
          ${filtered
            .map((patient) => {
              const latest = latestByPatient.get(patient.id);
              const totalRecords = countByPatient.get(patient.id) || 0;
              const ageText = formatChildAge(patient.birth_date);
              return `
                <article class="patient-card ${patient.archived ? "archived" : ""}">
                  <div>
                    <div class="patient-head">
                      <div>
                        <h3 class="patient-name">${escapeHtml(patient.full_name)}</h3>
                        <p class="patient-meta">
                          ${ageText ? `${escapeHtml(ageText)}` : "Idade não informada"}
                          ${patient.birth_date ? ` · Nasc. ${formatDateBr(patient.birth_date)}` : ""}
                          ${patient.guardian_name ? `<br>Responsável: ${escapeHtml(patient.guardian_name)}` : ""}
                        </p>
                      </div>
                      ${patient.archived ? `<span class="pill muted">Arquivado</span>` : `<span class="pill violet">${totalRecords} ${totalRecords === 1 ? "registro" : "registros"}</span>`}
                    </div>
                    ${
                      latest
                        ? `
                          <div class="pill-row" style="margin-top:10px">
                            <span class="pill muted">Última: ${formatDateBr(latest.assessed_at)} (${getAgeLabel(latest.age_months)})</span>
                            <span class="pill green">${latest.yes_count} observo</span>
                            ${latest.unsure_count ? `<span class="pill amber">${latest.unsure_count} dúvida</span>` : ""}
                            ${latest.no_count ? `<span class="pill coral">${latest.no_count} ainda não</span>` : ""}
                          </div>
                        `
                        : `<p class="hint" style="margin:10px 0 0">Nenhuma avaliação registrada ainda.</p>`
                    }
                  </div>
                  <div class="patient-actions">
                    <button class="primary-button small-btn" type="button" data-open-patient="${patient.id}">Ver evolução</button>
                    <button class="secondary-button small-btn" type="button" data-assess-patient="${patient.id}">+ Nova avaliação</button>
                  </div>
                </article>
              `;
            })
            .join("")}
        </div>
      `;

  app.innerHTML = `
    <section class="dashboard-shell">
      <div class="dashboard-top">
        <div>
          <p class="section-label">Painel do psicólogo</p>
          <h1>Meus pacientes</h1>
          <p class="lead">Gerencie os dados básicos e acompanhe a evolução de cada criança ao longo do tempo.</p>
        </div>
        <button class="primary-button" type="button" data-action="new-patient">+ Novo paciente</button>
      </div>

      <div class="kpi-row">
        <div class="kpi-card">
          <strong>${activePatients.length}</strong>
          <span>${activePatients.length === 1 ? "Paciente ativo" : "Pacientes ativos"}</span>
        </div>
        <div class="kpi-card">
          <strong>${state.assessments.length}</strong>
          <span>${state.assessments.length === 1 ? "Avaliação registrada" : "Avaliações registradas"}</span>
        </div>
        <div class="kpi-card">
          <strong>${state.assessments[0] ? formatDateBr(state.assessments[0].assessed_at) : "—"}</strong>
          <span>Último registro clínico</span>
        </div>
      </div>

      <div class="toolbar">
        <input class="search-input" id="patient-search" type="search" placeholder="Buscar por nome do paciente ou responsável..." value="${escapeHtml(state.patientSearch)}" />
        <label class="checkbox-inline">
          <input id="toggle-archived" type="checkbox" ${state.showArchived ? "checked" : ""} />
          Mostrar arquivados
        </label>
      </div>

      ${patientsHtml}
    </section>
  `;

  const searchInput = document.querySelector("#patient-search");
  searchInput?.addEventListener("input", (e) => {
    state.patientSearch = e.target.value;
    renderDashboard();
    const next = document.querySelector("#patient-search");
    if (next) {
      next.focus();
      next.setSelectionRange(next.value.length, next.value.length);
    }
  });
  document.querySelector("#toggle-archived")?.addEventListener("change", (e) => {
    state.showArchived = e.target.checked;
    renderDashboard();
  });
}

function renderPatientForm() {
  const editing = state.patients.find((p) => p.id === state.editingPatientId) || null;
  app.innerHTML = `
    <section class="step-shell">
      <button class="breadcrumb" type="button" data-action="${editing ? "back-patient-detail" : "go-dashboard"}">← Voltar</button>
      <div class="step-head">
        <p class="section-label">${editing ? "Editar prontuário" : "Novo cadastro"}</p>
        <h2>${editing ? `Editar ${escapeHtml(editing.full_name)}` : "Cadastrar paciente"}</h2>
        <p class="lead">Preencha os dados básicos para identificar a criança e acompanhar sua evolução nas próximas sessões.</p>
      </div>
      <form class="form-card" id="patient-form">
        <div class="form-grid">
          <div class="field full">
            <label for="p-name">Nome completo do paciente <span aria-hidden="true">*</span></label>
            <input id="p-name" type="text" required value="${escapeHtml(editing?.full_name || "")}" placeholder="Ex.: Sofia Mendes" />
          </div>
          <div class="field">
            <label for="p-birth">Data de nascimento</label>
            <input id="p-birth" type="date" value="${escapeHtml(editing?.birth_date || "")}" />
          </div>
          <div class="field">
            <label for="p-guardian">Responsável</label>
            <input id="p-guardian" type="text" value="${escapeHtml(editing?.guardian_name || "")}" placeholder="Ex.: Mariana Mendes (mãe)" />
          </div>
          <div class="field full">
            <label for="p-contact">Contato do responsável <span class="hint">(opcional)</span></label>
            <input id="p-contact" type="text" value="${escapeHtml(editing?.guardian_contact || "")}" placeholder="Ex.: (11) 99999-0000" />
          </div>
          <div class="field full">
            <label for="p-notes">Observações iniciais / dados clínicos básicos <span class="hint">(opcional)</span></label>
            <textarea id="p-notes" placeholder="Motivo do acompanhamento, escola, histórico relevante...">${escapeHtml(editing?.notes || "")}</textarea>
          </div>
        </div>
        <div class="bottom-actions">
          <button type="button" class="secondary-button" data-action="${editing ? "back-patient-detail" : "go-dashboard"}">Cancelar</button>
          <button type="submit" class="primary-button" ${state.saving ? "disabled" : ""}>${state.saving ? "Salvando..." : editing ? "Salvar alterações" : "Cadastrar paciente"}</button>
        </div>
      </form>
    </section>
  `;

  document.querySelector("#patient-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    const payload = {
      full_name: document.querySelector("#p-name").value.trim(),
      birth_date: document.querySelector("#p-birth").value || null,
      guardian_name: document.querySelector("#p-guardian").value.trim(),
      guardian_contact: document.querySelector("#p-contact").value.trim(),
      notes: document.querySelector("#p-notes").value.trim()
    };
    if (!payload.full_name) return;
    const saved = await savePatientToDb(payload, editing?.id || null);
    if (saved) {
      state.activePatientId = saved.id;
      state.editingPatientId = null;
      state.screen = "patient-detail";
      render();
    }
  });
}

function renderPatientDetail() {
  const patient = activePatient();
  if (!patient) {
    state.screen = "dashboard";
    return renderDashboard();
  }

  const history = state.assessments.filter((a) => a.patient_id === patient.id);
  const latest = history[0] || null;
  const previous = history[1] || null;
  const comparison = compareAssessments(latest, previous);
  const ageText = formatChildAge(patient.birth_date);

  const evolutionHtml = latest
    ? `
      <div class="evolution-grid">
        <div class="panel-card">
          <p class="section-label">Linha do tempo</p>
          <h3>Evolução dos marcos observados</h3>
          <p class="hint">Proporção de marcos marcados como Observo (verde), Dúvida (âmbar) e Ainda não observo (coral) em cada sessão.</p>
          <div class="timeline-list">
            ${history
              .slice(0, 8)
              .map((item) => {
                const total = item.total_count || 1;
                const pctYes = Math.round((item.yes_count / total) * 100);
                const pctUnsure = Math.round((item.unsure_count / total) * 100);
                const pctNo = Math.round((item.no_count / total) * 100);
                return `
                  <div class="timeline-row">
                    <div class="timeline-row-head">
                      <strong>${formatDateBr(item.assessed_at)} · ${getAgeLabel(item.age_months)}</strong>
                      <span>${item.yes_count}/${item.total_count} observados (${pctYes}%)</span>
                    </div>
                    <div class="stacked-bar" role="img" aria-label="${pctYes}% observo, ${pctUnsure}% dúvida, ${pctNo}% ainda não">
                      <span class="seg-yes" style="width:${pctYes}%"></span>
                      <span class="seg-unsure" style="width:${pctUnsure}%"></span>
                      <span class="seg-no" style="width:${pctNo}%"></span>
                    </div>
                  </div>
                `;
              })
              .join("")}
          </div>
          ${
            comparison
              ? `
                <div class="delta-callout">
                  <strong>Comparação com a sessão anterior (${formatDateBr(previous.assessed_at)}):</strong>
                  ${
                    comparison.deltaPct > 0
                      ? `avanço de +${comparison.deltaPct} pontos percentuais nos marcos observados (${comparison.prevPct}% → ${comparison.latestPct}%).`
                      : comparison.deltaPct < 0
                        ? `variação de ${comparison.deltaPct} pontos percentuais (${comparison.prevPct}% → ${comparison.latestPct}%)${comparison.sameAgeGroup ? "." : " — mudança de faixa etária."}`
                        : `percentual estável em ${comparison.latestPct}%.`
                  }
                  ${
                    comparison.gained.length
                      ? `
                        <div style="margin-top:8px"><strong>Novos marcos observados nesta faixa (${comparison.gained.length}):</strong>
                          <ul class="gained-list">${comparison.gained.slice(0, 5).map((m) => `<li>${escapeHtml(m.text)}</li>`).join("")}</ul>
                        </div>
                      `
                      : ""
                  }
                </div>
              `
              : ""
          }
        </div>

        <div class="panel-card">
          <p class="section-label">Última sessão · ${getAgeLabel(latest.age_months)}</p>
          <h3>Por área do desenvolvimento</h3>
          <div class="domain-bars">
            ${computeDomainBreakdown(latest.age_months, latest.answers)
              .map(
                (d) => `
                <div class="domain-bar-item">
                  <div class="domain-bar-head">
                    <strong>${d.label}</strong>
                    <span class="hint">${d.yes}/${d.total} (${d.pctYes}%)</span>
                  </div>
                  <div class="domain-bar-track">
                    <div class="domain-bar-fill" style="width:${d.pctYes}%;background:${d.color}"></div>
                  </div>
                </div>
              `
              )
              .join("")}
          </div>
        </div>
      </div>
    `
    : `
      <div class="empty-state" style="margin-bottom:28px">
        <h3>Nenhuma avaliação registrada ainda</h3>
        <p>Inicie a primeira avaliação de ${escapeHtml(patient.full_name)} para começar a acompanhar sua evolução clínica.</p>
        <button class="primary-button" type="button" data-assess-patient="${patient.id}">+ Iniciar primeira avaliação</button>
      </div>
    `;

  app.innerHTML = `
    <section class="dashboard-shell">
      <button class="breadcrumb" type="button" data-action="go-dashboard">← Voltar para pacientes</button>

      <div class="patient-banner">
        <div>
          <p class="section-label">Prontuário de desenvolvimento</p>
          <h1>${escapeHtml(patient.full_name)}</h1>
          <div class="pill-row">
            ${ageText ? `<span class="pill violet">${escapeHtml(ageText)}</span>` : ""}
            ${patient.archived ? `<span class="pill muted">Arquivado</span>` : `<span class="pill green">Em acompanhamento</span>`}
            <span class="pill muted">${history.length} ${history.length === 1 ? "avaliação" : "avaliações"}</span>
          </div>
        </div>
        <div class="button-row" style="margin-top:0">
          <button class="primary-button" type="button" data-assess-patient="${patient.id}">+ Nova avaliação</button>
          <button class="secondary-button" type="button" data-edit-patient="${patient.id}">Editar dados</button>
          <button class="quiet-button" type="button" data-archive-patient="${patient.id}">${patient.archived ? "Reativar" : "Arquivar"}</button>
        </div>
      </div>

      <div class="patient-details-grid">
        <div class="detail-box">
          <small>Data de nascimento</small>
          <strong>${patient.birth_date ? formatDateBr(patient.birth_date) : "Não informada"}</strong>
        </div>
        <div class="detail-box">
          <small>Responsável</small>
          <strong>${patient.guardian_name ? escapeHtml(patient.guardian_name) : "Não informado"}</strong>
        </div>
        <div class="detail-box">
          <small>Contato</small>
          <strong>${patient.guardian_contact ? escapeHtml(patient.guardian_contact) : "Não informado"}</strong>
        </div>
      </div>

      ${
        patient.notes
          ? `<div class="info-card" style="margin-bottom:24px"><p class="section-label">Observações do paciente</p><p style="margin:0;line-height:1.55">${escapeHtml(patient.notes)}</p></div>`
          : ""
      }

      ${evolutionHtml}

      ${
        history.length
          ? `
            <section>
              <h3>Histórico de avaliações (${history.length})</h3>
              <div class="assessment-list">
                ${history
                  .map(
                    (a) => `
                    <article class="assessment-row">
                      <div class="assessment-info">
                        <div class="assessment-title">${formatDateBr(a.assessed_at)} · Checklist de ${getAgeLabel(a.age_months)}</div>
                        <div class="assessment-sub">
                          ${a.respondent ? `Respondido por: ${escapeHtml(a.respondent)} · ` : ""}
                          ${a.yes_count} observo · ${a.unsure_count} não tenho certeza · ${a.no_count} ainda não observo
                        </div>
                        <div class="pill-row">
                          ${a.concern === "yes" ? `<span class="pill amber">Preocupação relatada</span>` : ""}
                          ${a.skill_loss === "yes" ? `<span class="pill coral">Perda de habilidade relatada</span>` : ""}
                        </div>
                      </div>
                      <div class="assessment-actions">
                        <button class="secondary-button small-btn" type="button" data-view-assessment="${a.id}">Abrir resumo</button>
                        <button class="quiet-button small-btn" type="button" data-edit-assessment="${a.id}">Editar</button>
                        <button class="danger-button small-btn" type="button" data-delete-assessment="${a.id}">Excluir</button>
                      </div>
                    </article>
                  `
                  )
                  .join("")}
              </div>
            </section>
          `
          : ""
      }

      <div class="bottom-actions">
        <button class="danger-button" type="button" data-delete-patient="${patient.id}">Excluir paciente</button>
      </div>
    </section>
  `;
}

// ============================================================================
// SCREENS: ASSESSMENT FLOW (GUEST OR LINKED TO PATIENT)
// ============================================================================

function stepper(active) {
  return `<div class="stepper" aria-label="Etapa ${active} de 3">${[1, 2, 3].map((n) => `<span class="${n <= active ? "done" : ""}"></span>`).join("")}</div>`;
}

function renderProfile() {
  const patient = activePatient();
  const isClinical = Boolean(state.user && patient);

  app.innerHTML = `
    <section class="step-shell">
      ${isClinical ? `<button class="breadcrumb" type="button" data-action="back-patient-detail">← Voltar para ${escapeHtml(patient.full_name)}</button>` : ""}
      <div class="step-head">
        ${stepper(1)}
        <p class="section-label">${isClinical ? `Avaliação de ${escapeHtml(patient.full_name)}` : "Primeiro, alguns dados"}</p>
        <h2>${isClinical ? "Configurar esta sessão" : "Para quem vamos olhar hoje?"}</h2>
        <p class="lead">${isClinical ? "Escolha a data da sessão e a faixa etária do checklist para registrar a evolução." : "Você pode usar apenas as iniciais. Esses dados aparecem no resumo, se preenchidos."}</p>
      </div>
      <form class="form-card" id="profile-form">
        <div class="form-grid">
          <div class="field">
            <label for="child-name">Nome ou iniciais</label>
            <input id="child-name" value="${escapeHtml(state.name)}" placeholder="Ex.: Sofia M." autocomplete="off" ${isClinical ? "readonly" : ""} />
          </div>
          <div class="field">
            <label for="respondent">Quem está respondendo?</label>
            <input id="respondent" value="${escapeHtml(state.respondent)}" placeholder="Ex.: mãe, pai, psicólogo(a)" autocomplete="off" />
          </div>
          ${
            isClinical
              ? `
                <div class="field">
                  <label for="assessed-at">Data da avaliação <span aria-hidden="true">*</span></label>
                  <input id="assessed-at" type="date" required value="${escapeHtml(state.assessedAt)}" />
                </div>
              `
              : `
                <div class="field">
                  <label for="birth-date">Data de nascimento</label>
                  <input id="birth-date" type="date" value="${escapeHtml(state.birthDate)}" />
                </div>
              `
          }
          <div class="field">
            <label for="age">Faixa para acompanhar <span aria-hidden="true">*</span></label>
            <select id="age" required>
              <option value="">Selecione a idade</option>
              ${AGE_GROUPS.map((group) => `<option value="${group.value}" ${String(state.age) === String(group.value) ? "selected" : ""}>${group.label}</option>`).join("")}
            </select>
          </div>
        </div>
        <p class="age-suggestion hidden" id="age-suggestion"></p>
        <p class="mini-disclaimer">O checklist reúne marcos que a maioria das crianças costuma apresentar até essa idade. Ele não estabelece um diagnóstico.</p>
        <div class="bottom-actions">
          <button type="button" class="quiet-button" data-action="${isClinical ? "back-patient-detail" : "home"}">Voltar</button>
          <button class="primary-button" type="submit">Ver checklist</button>
        </div>
      </form>
    </section>
  `;

  document.querySelector("#profile-form").addEventListener("submit", saveProfile);
  document.querySelector("#birth-date")?.addEventListener("change", updateAgeSuggestion);
  updateAgeSuggestion();
}

function updateAgeSuggestion() {
  const birthInput = document.querySelector("#birth-date");
  const value = birthInput ? birthInput.value : state.birthDate;
  const output = document.querySelector("#age-suggestion");
  if (!output) return;
  const suggestion = suggestAgeGroup(value);
  if (!suggestion) return output.classList.add("hidden");
  output.textContent = `Pela data de nascimento informada, a faixa mais próxima é ${suggestion.closest.label}. Você pode escolher outra, se preferir.`;
  output.classList.remove("hidden");
}

function saveProfile(event) {
  event.preventDefault();
  state.name = document.querySelector("#child-name").value.trim();
  state.respondent = document.querySelector("#respondent").value.trim();
  const birthInput = document.querySelector("#birth-date");
  if (birthInput) state.birthDate = birthInput.value;
  const dateInput = document.querySelector("#assessed-at");
  if (dateInput) state.assessedAt = dateInput.value || todayIso();
  const newAge = document.querySelector("#age").value;
  if (String(newAge) !== String(state.age)) state.answers = {};
  state.age = newAge;
  state.screen = "checklist";
  render();
}

function renderChecklist() {
  const list = getMilestones(state.age);
  const total = list.length;
  const completed = list.filter((item) => state.answers[item.id]).length;
  const selected = (id, value) => (state.answers[id] === value ? `selected ${value}` : "");
  let count = 0;

  const sections = DOMAINS.map((domain) => {
    const entries = (CHECKLISTS[Number(state.age)] || {})[domain.key] || [];
    if (!entries.length) return "";
    const cards = entries
      .map((entry, index) => {
        count += 1;
        const id = `${domain.key}-${index}`;
        return `
          <article class="milestone">
            <div class="milestone-top">
              <span class="milestone-number">${count}</span>
              <div class="milestone-text">${entry}</div>
            </div>
            <div class="answer-row" role="group" aria-label="Resposta para ${escapeHtml(entry)}">
              <button class="choice ${selected(id, "yes")}" data-answer="yes" data-id="${id}" type="button">Observo</button>
              <button class="choice ${selected(id, "unsure")}" data-answer="unsure" data-id="${id}" type="button">Não tenho certeza</button>
              <button class="choice ${selected(id, "no")}" data-answer="no" data-id="${id}" type="button">Ainda não observo</button>
            </div>
          </article>
        `;
      })
      .join("");
    return `<section class="domain" style="--domain:${domain.color}"><h3 class="domain-title"><span class="domain-dot"></span>${domain.label}</h3><p class="domain-note">${domain.note}</p>${cards}</section>`;
  }).join("");

  app.innerHTML = `
    <section class="step-shell">
      <div class="checklist-top">
        <div>
          <p class="section-label">${state.name ? `${escapeHtml(state.name)} · ` : ""}${getAgeLabel(state.age)} · ${total} marcos</p>
          <h2>O que você observa?</h2>
        </div>
        <div class="progress-copy">
          <span>${completed} de ${total} respondidos</span>
          <div class="progress-track"><div class="progress-fill" style="width:${total ? (completed / total) * 100 : 0}%"></div></div>
        </div>
      </div>
      <div class="notice">${icon("info")}<span>Leia cada frase pensando no dia a dia. Não há resposta certa: registre o que é observado agora.</span></div>
      ${sections}
      <div class="bottom-actions">
        <button class="secondary-button" data-action="profile" type="button">Trocar dados / idade</button>
        <button class="primary-button" data-action="context" type="button">Continuar</button>
      </div>
    </section>
  `;
}

function renderContext() {
  const isClinical = Boolean(state.user && activePatient());
  app.innerHTML = `
    <section class="step-shell">
      <div class="step-head">
        ${stepper(3)}
        <p class="section-label">Contexto</p>
        <h2>Há algo mais que você queira registrar?</h2>
        <p class="lead">Estas perguntas ajudam a documentar observações qualitativas da sessão e orientar a conversa com a família.</p>
      </div>
      <div class="form-card">
        <div class="question-block">
          <p class="question-title">Existe algo no desenvolvimento da criança que preocupa você ou a família?</p>
          <div class="yes-no">
            <button class="choice ${state.concerns.concern === "yes" ? "selected no" : ""}" data-context="concern" data-value="yes" type="button">Sim</button>
            <button class="choice ${state.concerns.concern === "no" ? "selected yes" : ""}" data-context="concern" data-value="no" type="button">Não</button>
          </div>
        </div>
        <div class="question-block">
          <p class="question-title">A criança perdeu alguma habilidade que já tinha?</p>
          <div class="yes-no">
            <button class="choice ${state.concerns.loss === "yes" ? "selected no" : ""}" data-context="loss" data-value="yes" type="button">Sim</button>
            <button class="choice ${state.concerns.loss === "no" ? "selected yes" : ""}" data-context="loss" data-value="no" type="button">Não</button>
          </div>
        </div>
        <div class="field">
          <label for="notes">Observações da sessão <span class="hint">(opcional)</span></label>
          <textarea id="notes" placeholder="O que a criança gosta de fazer? Há comportamentos ou orientações importantes para registrar?">${escapeHtml(state.concerns.notes)}</textarea>
        </div>
        <p class="mini-disclaimer">Se houver relato de perda de habilidades ou preocupações, registre os detalhes para acompanhamento contínuo.</p>
        <div class="bottom-actions">
          <button class="secondary-button" data-action="checklist" type="button">Voltar às respostas</button>
          <button class="primary-button" data-action="result" type="button" ${state.saving ? "disabled" : ""}>
            ${state.saving ? "Salvando..." : isClinical ? "Salvar evolução e ver resumo" : "Ver resumo"}
          </button>
        </div>
      </div>
    </section>
  `;
}

function resultItems(type) {
  return getMilestones(state.age)
    .filter((item) => state.answers[item.id] === type)
    .map(
      (item) =>
        `<div class="result-item ${type === "no" ? "no" : ""}"><small>${DOMAINS.find((d) => d.key === item.domain).label}</small>${item.text}</div>`
    )
    .join("");
}

function renderResult() {
  const totals = computeTotals(state.age, state.answers);
  const patient = activePatient();
  const isClinical = Boolean(state.user && patient);
  const named = state.name ? `de ${escapeHtml(state.name)}` : "";
  const hasAttention = totals.no || totals.unsure || state.concerns.concern === "yes" || state.concerns.loss === "yes";
  const message = hasAttention
    ? "Este resumo reúne pontos que podem apoiar o acompanhamento clínico e a conversa com a família. Ele não confirma nem descarta qualquer condição."
    : "Você registrou os marcos observados até agora. Continue acompanhando mudanças ao longo das próximas sessões.";

  app.innerHTML = `
    <section class="step-shell">
      ${isClinical ? `<button class="breadcrumb" type="button" data-action="back-patient-detail">← Voltar para evolução de ${escapeHtml(patient.full_name)}</button>` : ""}
      <div class="result-head">
        <p class="result-date">Registro · ${formatDateBr(state.assessedAt)} ${state.savedJustNow ? "· Salvo no prontuário" : ""}</p>
        <h1>Resumo ${named}</h1>
        <p class="lead">Checklist de ${getAgeLabel(state.age)}${state.respondent ? ` · Respondido por ${escapeHtml(state.respondent)}` : ""}</p>
      </div>

      <div class="summary-grid">
        <div class="summary-card green"><strong>${totals.yes}</strong><span>Observo</span></div>
        <div class="summary-card amber"><strong>${totals.unsure}</strong><span>Não tenho certeza</span></div>
        <div class="summary-card coral"><strong>${totals.no}</strong><span>Ainda não observo</span></div>
      </div>

      ${totals.unanswered ? `<p class="hint">${totals.unanswered} ${totals.unanswered === 1 ? "marco ficou" : "marcos ficaram"} sem resposta.</p>` : ""}

      <div class="result-message">
        <h3>Um registro para apoiar o acompanhamento.</h3>
        <p>${message}</p>
      </div>

      ${totals.no ? `<section class="result-section"><h3>Ainda não observo <span class="hint">${totals.no}</span></h3><div class="result-list">${resultItems("no")}</div></section>` : ""}
      ${totals.unsure ? `<section class="result-section"><h3>Não tenho certeza <span class="hint">${totals.unsure}</span></h3><p>Observe esses marcos em diferentes momentos da rotina e reavalie na próxima sessão.</p><div class="result-list">${resultItems("unsure")}</div></section>` : ""}

      <section class="result-section">
        <h3>Observações registradas</h3>
        <div class="info-card">
          <p class="hint">${state.concerns.loss === "yes" ? "Foi registrada perda de uma habilidade previamente adquirida. Recomenda-se atenção prioritária na condução clínica." : "Use este checklist como ponto de partida para o acompanhamento longitudinal."}</p>
          ${state.concerns.notes ? `<p style="margin-bottom:0">${escapeHtml(state.concerns.notes)}</p>` : ""}
        </div>
      </section>

      <section class="export-card">
        <p class="section-label" style="color:#bdb3ff">Pronto para compartilhar</p>
        <h2>Leve ou envie o resumo.</h2>
        <p>Abra a impressão para salvar em PDF ou prepare uma mensagem para enviar aos responsáveis via WhatsApp.</p>
        <div class="button-row result-actions">
          <button class="primary-button" data-action="pdf" type="button">Salvar como PDF</button>
          <button class="secondary-button" data-action="whatsapp" type="button">Compartilhar no WhatsApp</button>
          <button class="secondary-button" data-action="copy" type="button">Copiar resumo</button>
        </div>
      </section>

      <p class="legal-note">Este checklist é uma ferramenta de acompanhamento dos marcos do desenvolvimento. Não é um instrumento de triagem validado, não faz diagnóstico e não substitui avaliação profissional. Fonte: CDC, Learn the Signs. Act Early.</p>

      <div class="bottom-actions">
        <button class="secondary-button" data-action="checklist" type="button">Revisar respostas</button>
        ${
          isClinical
            ? `<button class="primary-button" data-action="back-patient-detail" type="button">Voltar ao prontuário</button>`
            : `<button class="primary-button" data-action="restart" type="button">Novo acompanhamento</button>`
        }
      </div>
    </section>
  `;
}

function textSummary() {
  const totals = computeTotals(state.age, state.answers);
  const label = state.name ? ` de ${state.name}` : "";
  const unanswered = totals.unanswered ? `\nSem resposta: ${totals.unanswered}` : "";
  const list = getMilestones(state.age);
  const noItems = list.filter((item) => state.answers[item.id] === "no").map((item) => `• ${item.text}`).join("\n");
  const unsureItems = list.filter((item) => state.answers[item.id] === "unsure").map((item) => `• ${item.text}`).join("\n");
  return `Resumo de acompanhamento${label}\nFaixa: ${getAgeLabel(state.age)}\nData: ${formatDateBr(state.assessedAt)}\n\nObservo: ${totals.yes}\nNão tenho certeza: ${totals.unsure}\nAinda não observo: ${totals.no}${unanswered}${noItems ? `\n\nAinda não observo:\n${noItems}` : ""}${unsureItems ? `\n\nNão tenho certeza:\n${unsureItems}` : ""}\n\nEste checklist acompanha marcos do desenvolvimento e não substitui uma avaliação profissional.`;
}

// ============================================================================
// ACTIONS & EVENT DELEGATION
// ============================================================================

async function handleAction(action) {
  if (action === "logout") {
    if (supabaseClient) await supabaseClient.auth.signOut();
    state.user = null;
    state.profile = null;
    state.patients = [];
    state.assessments = [];
    state.professionals = [];
    state.lastCredentials = null;
    resetAssessmentDraft(null);
    state.screen = "home";
    showToast("Sessão encerrada.");
    render();
    return;
  }

  if (requiresPasswordChange()) {
    state.screen = "change-password";
    render();
    return;
  }

  if (action === "brand") {
    state.screen = state.user ? defaultAuthenticatedScreen() : "home";
    render();
    return;
  }
  if (action === "home") { state.screen = "home"; render(); return; }
  if (action === "go-auth") { state.authFeedback = null; state.screen = "auth"; render(); return; }
  if (action === "go-change-password") { state.passwordFeedback = null; state.screen = "change-password"; render(); return; }
  if (action === "go-superadmin") {
    if (!isSuperadmin()) return;
    state.screen = "superadmin";
    render();
    await loadSuperadminData();
    return;
  }
  if (action === "go-dashboard") {
    if (!state.user) { state.screen = "auth"; render(); return; }
    state.screen = "dashboard";
    render();
    return;
  }
  if (action === "start-guest") { resetAssessmentDraft(null); state.screen = "profile"; render(); return; }
  if (action === "new-patient") { state.editingPatientId = null; state.screen = "patient-form"; render(); return; }
  if (action === "back-patient-detail") { state.screen = "patient-detail"; render(); return; }
  if (action === "profile") { state.screen = "profile"; render(); return; }
  if (action === "checklist") { state.screen = "checklist"; render(); return; }
  if (action === "context") { state.screen = "context"; render(); return; }
  if (action === "result") {
    const notesEl = document.querySelector("#notes");
    if (notesEl) state.concerns.notes = notesEl.value.trim();
    if (state.user && state.activePatientId) {
      await saveAssessmentToDb();
    }
    state.screen = "result";
    render();
    return;
  }
  if (action === "restart") {
    resetAssessmentDraft(null);
    state.screen = state.user ? defaultAuthenticatedScreen() : "home";
    render();
    return;
  }
  if (action === "copy-credentials" && state.lastCredentials) {
    const text = `Acesso ao Marcos (${state.lastCredentials.full_name})\nE-mail: ${state.lastCredentials.email}\nSenha temporária: ${state.lastCredentials.tempPassword}\n\nNo primeiro login, você definirá sua nova senha pessoal.`;
    navigator.clipboard?.writeText(text).then(() => showToast("Credenciais copiadas!", "success"));
    return;
  }
  if (action === "dismiss-credentials") {
    state.lastCredentials = null;
    render();
    return;
  }
  if (action === "pdf") { window.print(); return; }
  if (action === "whatsapp") { window.open(`https://wa.me/?text=${encodeURIComponent(textSummary())}`, "_blank", "noopener"); return; }
  if (action === "copy") {
    navigator.clipboard?.writeText(textSummary()).then(() => {
      const button = document.querySelector('[data-action="copy"]');
      if (button) {
        button.textContent = "Resumo copiado";
        setTimeout(() => (button.textContent = "Copiar resumo"), 1800);
      }
    });
  }
}

function loadAssessmentIntoDraft(assessment, targetScreen) {
  const patient = state.patients.find((p) => p.id === assessment.patient_id);
  state.activePatientId = assessment.patient_id;
  state.editingAssessmentId = assessment.id;
  state.assessedAt = assessment.assessed_at || todayIso();
  state.name = patient?.full_name || "";
  state.birthDate = patient?.birth_date || "";
  state.age = String(assessment.age_months);
  state.respondent = assessment.respondent || "";
  state.answers = { ...(assessment.answers || {}) };
  state.concerns = {
    concern: assessment.concern || "",
    loss: assessment.skill_loss || "",
    notes: assessment.notes || ""
  };
  state.savedJustNow = false;
  state.screen = targetScreen;
  render();
}

document.addEventListener("click", (event) => {
  const adminReset = event.target.closest("[data-admin-reset]");
  if (adminReset) { handleAdminResetPassword(adminReset.dataset.adminReset); return; }

  const adminToggle = event.target.closest("[data-admin-toggle]");
  if (adminToggle) { handleAdminToggleActive(adminToggle.dataset.adminToggle, adminToggle.dataset.active === "true"); return; }

  const adminDelete = event.target.closest("[data-admin-delete]");
  if (adminDelete) { handleAdminDeleteProfessional(adminDelete.dataset.adminDelete); return; }

  const openPatient = event.target.closest("[data-open-patient]");
  if (openPatient) {
    state.activePatientId = openPatient.dataset.openPatient;
    state.screen = "patient-detail";
    render();
    return;
  }

  const assessPatient = event.target.closest("[data-assess-patient]");
  if (assessPatient) {
    const patient = state.patients.find((p) => p.id === assessPatient.dataset.assessPatient);
    if (patient) {
      resetAssessmentDraft(patient);
      state.screen = "profile";
      render();
    }
    return;
  }

  const editPatient = event.target.closest("[data-edit-patient]");
  if (editPatient) {
    state.editingPatientId = editPatient.dataset.editPatient;
    state.screen = "patient-form";
    render();
    return;
  }

  const archivePatient = event.target.closest("[data-archive-patient]");
  if (archivePatient) {
    const patient = state.patients.find((p) => p.id === archivePatient.dataset.archivePatient);
    if (patient) toggleArchivePatient(patient);
    return;
  }

  const delPatient = event.target.closest("[data-delete-patient]");
  if (delPatient) {
    const patient = state.patients.find((p) => p.id === delPatient.dataset.deletePatient);
    if (patient) deletePatient(patient);
    return;
  }

  const viewAssessment = event.target.closest("[data-view-assessment]");
  if (viewAssessment) {
    const found = state.assessments.find((a) => a.id === viewAssessment.dataset.viewAssessment);
    if (found) loadAssessmentIntoDraft(found, "result");
    return;
  }

  const editAssessment = event.target.closest("[data-edit-assessment]");
  if (editAssessment) {
    const found = state.assessments.find((a) => a.id === editAssessment.dataset.editAssessment);
    if (found) loadAssessmentIntoDraft(found, "checklist");
    return;
  }

  const delAssessment = event.target.closest("[data-delete-assessment]");
  if (delAssessment) {
    deleteAssessment(delAssessment.dataset.deleteAssessment);
    return;
  }

  const answer = event.target.closest("[data-answer]");
  if (answer) {
    state.answers[answer.dataset.id] = answer.dataset.answer;
    render();
    return;
  }

  const context = event.target.closest("[data-context]");
  if (context) {
    state.concerns[context.dataset.context] = context.dataset.value;
    render();
    return;
  }

  const actionEl = event.target.closest("[data-action]");
  if (actionEl) {
    if (actionEl.tagName === "A") event.preventDefault();
    handleAction(actionEl.dataset.action);
  }
});

// ============================================================================
// BOOTSTRAP SESSION
// ============================================================================

async function init() {
  render();
  if (!supabaseClient) return;

  const { data } = await supabaseClient.auth.getSession();
  if (data?.session?.user) {
    state.user = data.session.user;
    await syncProfile(data.session.user);
    state.screen = defaultAuthenticatedScreen();
    render();
    if (!requiresPasswordChange()) {
      if (isSuperadmin()) await loadSuperadminData();
      await loadDashboardData();
    }
  }

  supabaseClient.auth.onAuthStateChange(async (event, session) => {
    if (event === "SIGNED_OUT") {
      state.user = null;
      state.profile = null;
      state.patients = [];
      state.assessments = [];
      state.professionals = [];
      state.lastCredentials = null;
      if (["dashboard", "patient-form", "patient-detail", "superadmin", "change-password"].includes(state.screen)) {
        state.screen = "home";
      }
      render();
    } else if (session?.user && !state.user) {
      state.user = session.user;
      await syncProfile(session.user);
      state.screen = defaultAuthenticatedScreen();
      render();
      if (!requiresPasswordChange()) {
        if (isSuperadmin()) await loadSuperadminData();
        await loadDashboardData();
      }
    }
  });
}

init();
