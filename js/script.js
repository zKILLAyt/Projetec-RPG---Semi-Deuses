(function () {
  "use strict";

  const STORAGE_KEYS = {
    profiles: "semideuses.profiles",
    active: "semideuses.activeProfileId",
    draft: "semideuses.currentDraft"
  };

  const attributeLabels = {
    strength: "Forca",
    dexterity: "Destreza",
    constitution: "Constituicao",
    intelligence: "Inteligencia",
    wisdom: "Sabedoria",
    charisma: "Carisma"
  };

  const tableConfig = {
    weapons: { title: "Armas", columns: ["Nome", "Bonus/Dano", "Notas"] },
    talents: { title: "Talentos", columns: ["Nome", "Efeito", "Notas"] },
    affiliationAbilities: { title: "Habilidades de filiacao", columns: ["Nome", "Custo", "Descricao"] },
    pathAbilities: { title: "Habilidades de caminho", columns: ["Nome", "Custo", "Descricao"] },
    equipment: { title: "Equipamentos", columns: ["Item", "Quantidade", "Notas"] },
    relics: { title: "Reliquias", columns: ["Nome", "Poder", "Notas"] }
  };

  const skillAliases = {
    "adestrar animais": "Lidar com Animais",
    blefar: "Enganacao",
    "enganacao": "Enganacao",
    "lidar com animais": "Lidar com Animais"
  };

  const root = document;
  const defaultCharacter = deepClone(window.characterData || {});
  let state = normalizeCharacter(loadDraft() || defaultCharacter);
  let saveTimer = null;

  // A mesma base atende o editor normal e a pagina compacta de impressao.
  document.addEventListener("DOMContentLoaded", () => {
    if (document.body.classList.contains("print-page")) {
      renderPrintSheet();
      return;
    }

    bindTabs();
    bindStaticFields();
    renderProfileSaves();
    renderAttributes();
    renderSkills();
    renderTables();
    renderProfiles();
    hydrateForm();
    bindActions();
    bindFavorControls();
    renderFavor();
    updateAllCalculated();
    updatePreview();
    setStatus("Ficha carregada.");
  });

  function bindTabs() {
    root.querySelectorAll("[data-tab]").forEach((button) => {
      button.addEventListener("click", () => {
        root.querySelectorAll("[data-tab]").forEach((tab) => tab.classList.remove("is-active"));
        root.querySelectorAll("[data-panel]").forEach((panel) => panel.classList.remove("is-active"));
        button.classList.add("is-active");
        const panel = root.getElementById(button.dataset.tab);
        if (panel) panel.classList.add("is-active");
      });
    });
  }

  function bindStaticFields() {
    root.querySelectorAll("[data-path]").forEach((input) => {
      input.addEventListener("input", () => {
        setByPath(state, input.dataset.path, getInputValue(input));
        if (input.dataset.path === "main.divineFavorMax") {
          state.main.divineFavorCurrent = clampFavor(state.main.divineFavorCurrent);
          renderFavor();
        }
        scheduleAutoSave();
        updateAllCalculated();
        updatePreview();
      });
    });

    const profileName = root.getElementById("profileName");
    profileName.addEventListener("input", () => {
      state.meta.profileName = profileName.value.trim() || "Novo personagem";
      updateProfileName();
      scheduleAutoSave();
      updatePreview();
    });
  }

  function bindFavorControls() {
    const container = root.querySelector(".divine-favor");
    if (!container) return;

    container.addEventListener("click", (event) => {
      const dot = event.target.closest("[data-favor-dot]");
      if (!dot) return;

      const selectedValue = numberOrZero(dot.dataset.favorDot);
      const current = numberOrZero(state.main.divineFavorCurrent);
      state.main.divineFavorCurrent = current === selectedValue ? selectedValue - 1 : selectedValue;
      state.main.divineFavorCurrent = clampFavor(state.main.divineFavorCurrent);
      renderFavor();
      scheduleAutoSave();
      updatePreview();
    });
  }

  function bindActions() {
    root.getElementById("saveProfileBtn").addEventListener("click", saveProfile);
    root.getElementById("newProfileBtn").addEventListener("click", newProfile);
    root.getElementById("loadProfileBtn").addEventListener("click", loadSelectedProfile);
    root.getElementById("deleteProfileBtn").addEventListener("click", deleteSelectedProfile);
    root.getElementById("exportJsonBtn").addEventListener("click", exportJson);
    root.getElementById("importJsonInput").addEventListener("change", importJson);
    root.getElementById("printProfileBtn").addEventListener("click", () => {
      saveDraft();
      window.open("print.html", "_blank");
    });
  }

  function hydrateForm() {
    root.querySelectorAll("[data-path]").forEach((input) => {
      const value = getByPath(state, input.dataset.path);
      setInputValue(input, value);
    });
    root.getElementById("profileName").value = state.meta.profileName || "Novo personagem";
    updateProfileName();
  }

  function renderAttributes() {
    const grid = root.getElementById("attributesGrid");
    grid.innerHTML = "";

    Object.entries(state.attributes).forEach(([key, attribute]) => {
      const card = document.createElement("article");
      card.className = "attribute-card";
      card.innerHTML = `
        <div class="attribute-main">
          <label class="field">
            <span>${attribute.label || attributeLabels[key]}</span>
            <input type="number" data-attribute-value="${key}" value="${numberOrZero(attribute.value)}">
          </label>
          <div>
            <span class="field-label">Mod.</span>
            <strong class="score-pill" data-attribute-mod="${key}">+0</strong>
          </div>
        </div>
        <label class="check-line">
          <input type="checkbox" data-save-prof="${key}" ${attribute.saveProficient ? "checked" : ""}>
          Proficiente em salvaguarda
        </label>
        <div class="score-pill" data-save-total="${key}">+0</div>
      `;
      grid.appendChild(card);
    });

    grid.querySelectorAll("[data-attribute-value]").forEach((input) => {
      input.addEventListener("input", () => {
        const key = input.dataset.attributeValue;
        state.attributes[key].value = numberOrZero(input.value);
        scheduleAutoSave();
        updateAllCalculated();
        updatePreview();
      });
    });

    grid.querySelectorAll("[data-save-prof]").forEach((input) => {
      input.addEventListener("change", () => {
        const key = input.dataset.saveProf;
        state.attributes[key].saveProficient = input.checked;
        scheduleAutoSave();
        updateAllCalculated();
        updatePreview();
      });
    });
  }

  function renderProfileSaves() {
    const container = root.getElementById("profileSaves");
    if (!container) return;

    container.innerHTML = Object.entries(state.attributes).map(([key, attribute]) => {
      const total = modifier(attribute.value) + (attribute.saveProficient ? proficiencyBonus() : 0);
      return `
        <label class="save-test${attribute.saveProficient ? " is-proficient" : ""}">
          <input type="checkbox" data-profile-save-prof="${key}" ${attribute.saveProficient ? "checked" : ""}>
          <span>${attribute.label || attributeLabels[key]}</span>
          <strong data-profile-save-total="${key}">${formatBonus(total)}</strong>
        </label>
      `;
    }).join("");

    container.querySelectorAll("[data-profile-save-prof]").forEach((input) => {
      input.addEventListener("change", () => {
        const key = input.dataset.profileSaveProf;
        state.attributes[key].saveProficient = input.checked;
        renderProfileSaves();
        renderAttributes();
        scheduleAutoSave();
        updateAllCalculated();
        updatePreview();
      });
    });
  }

  function renderSkills() {
    const list = root.getElementById("skillsList");
    list.innerHTML = "";

    state.skills.forEach((skill, index) => {
      const row = document.createElement("article");
      row.className = "skill-row";
      row.innerHTML = `
        <strong>${escapeHtml(skill.name)}</strong>
        <select data-skill-attribute="${index}">
          ${Object.entries(attributeLabels).map(([key, label]) => `<option value="${key}" ${skill.attribute === key ? "selected" : ""}>${label}</option>`).join("")}
        </select>
        <label class="check-line"><input type="checkbox" data-skill-prof="${index}" ${skill.proficient ? "checked" : ""}> Prof.</label>
        <label class="check-line"><input type="checkbox" data-skill-expertise="${index}" ${skill.expertise ? "checked" : ""}> Esp.</label>
        <span class="skill-total" data-skill-total="${index}">+0</span>
      `;
      list.appendChild(row);
    });

    list.querySelectorAll("[data-skill-attribute]").forEach((select) => {
      select.addEventListener("change", () => {
        state.skills[Number(select.dataset.skillAttribute)].attribute = select.value;
        scheduleAutoSave();
        updateAllCalculated();
        updatePreview();
      });
    });

    list.querySelectorAll("[data-skill-prof]").forEach((input) => {
      input.addEventListener("change", () => {
        state.skills[Number(input.dataset.skillProf)].proficient = input.checked;
        scheduleAutoSave();
        updateAllCalculated();
        updatePreview();
      });
    });

    list.querySelectorAll("[data-skill-expertise]").forEach((input) => {
      input.addEventListener("change", () => {
        state.skills[Number(input.dataset.skillExpertise)].expertise = input.checked;
        scheduleAutoSave();
        updateAllCalculated();
        updatePreview();
      });
    });
  }

  function renderTables() {
    root.querySelectorAll("[data-table]").forEach((container) => {
      const tableKey = container.dataset.table;
      const config = tableConfig[tableKey];
      const rows = state.tables[tableKey] || [];

      container.innerHTML = `
        <div class="table-header">
          <h3>${config.title}</h3>
          <button type="button" data-add-row="${tableKey}">Adicionar linha</button>
        </div>
        <div class="rows" data-rows="${tableKey}"></div>
      `;

      const rowsContainer = container.querySelector("[data-rows]");
      if (!rows.length) {
        rowsContainer.innerHTML = `<p class="empty-state">Nenhuma linha cadastrada.</p>`;
      }

      rows.forEach((row, rowIndex) => {
        rowsContainer.appendChild(createTableRow(tableKey, row, rowIndex));
      });

      container.querySelector("[data-add-row]").addEventListener("click", () => {
        state.tables[tableKey].push({ first: "", second: "", third: "" });
        renderTables();
        scheduleAutoSave();
        updatePreview();
      });
    });
  }

  // Todas as tabelas usam o mesmo formato para manter importacao/exportacao simples.
  function createTableRow(tableKey, row, rowIndex) {
    const config = tableConfig[tableKey];
    const element = document.createElement("div");
    element.className = "table-row";
    element.innerHTML = `
      <label class="field"><span>${config.columns[0]}</span><input value="${escapeAttribute(row.first || "")}" data-table-field="${tableKey}:${rowIndex}:first"></label>
      <label class="field"><span>${config.columns[1]}</span><input value="${escapeAttribute(row.second || "")}" data-table-field="${tableKey}:${rowIndex}:second"></label>
      <label class="field"><span>${config.columns[2]}</span><textarea data-table-field="${tableKey}:${rowIndex}:third">${escapeHtml(row.third || "")}</textarea></label>
      <button type="button" class="danger" data-remove-row="${tableKey}:${rowIndex}">Remover</button>
    `;

    element.querySelectorAll("[data-table-field]").forEach((input) => {
      input.addEventListener("input", () => {
        const [key, index, field] = input.dataset.tableField.split(":");
        state.tables[key][Number(index)][field] = input.value;
        scheduleAutoSave();
        updatePreview();
      });
    });

    element.querySelector("[data-remove-row]").addEventListener("click", () => {
      const [key, index] = element.querySelector("[data-remove-row]").dataset.removeRow.split(":");
      state.tables[key].splice(Number(index), 1);
      renderTables();
      scheduleAutoSave();
      updatePreview();
    });

    return element;
  }

  function updateAllCalculated() {
    Object.keys(state.attributes).forEach((key) => {
      const attribute = state.attributes[key];
      const mod = modifier(attribute.value);
      const saveTotal = mod + (attribute.saveProficient ? proficiencyBonus() : 0);
      const modElement = root.querySelector(`[data-attribute-mod="${key}"]`);
      const saveElement = root.querySelector(`[data-save-total="${key}"]`);
      const profileSaveElement = root.querySelector(`[data-profile-save-total="${key}"]`);
      if (modElement) modElement.textContent = formatBonus(mod);
      if (saveElement) saveElement.textContent = `Salvaguarda ${formatBonus(saveTotal)}`;
      if (profileSaveElement) profileSaveElement.textContent = formatBonus(saveTotal);
    });

    state.skills.forEach((skill, index) => {
      const total = skillTotal(skill);
      const element = root.querySelector(`[data-skill-total="${index}"]`);
      if (element) element.textContent = formatBonus(total);
    });
  }

  // O perfil salvo fica em colecoes nomeadas; o rascunho guarda alteracoes automaticas.
  function saveProfile() {
    state.meta.profileName = root.getElementById("profileName").value.trim() || state.main.name || "Novo personagem";
    state.meta.updatedAt = new Date().toISOString();
    const profiles = getProfiles();
    const currentId = localStorage.getItem(STORAGE_KEYS.active) || makeId();
    profiles[currentId] = deepClone(state);
    localStorage.setItem(STORAGE_KEYS.profiles, JSON.stringify(profiles));
    localStorage.setItem(STORAGE_KEYS.active, currentId);
    saveDraft();
    renderProfiles();
    updateProfileName();
    updatePreview();
    setStatus("Perfil salvo com sucesso.");
  }

  function newProfile() {
    state = normalizeCharacter(defaultCharacter);
    localStorage.removeItem(STORAGE_KEYS.active);
    saveDraft();
    hydrateForm();
    renderAttributes();
    renderProfileSaves();
    renderSkills();
    renderTables();
    renderFavor();
    updateAllCalculated();
    updatePreview();
    setStatus("Novo perfil criado.");
  }

  function loadSelectedProfile() {
    const select = root.getElementById("profilesSelect");
    const id = select.value;
    const profiles = getProfiles();
    if (!id || !profiles[id]) {
      setStatus("Selecione um perfil salvo para carregar.");
      return;
    }

    state = normalizeCharacter(profiles[id]);
    localStorage.setItem(STORAGE_KEYS.active, id);
    saveDraft();
    hydrateForm();
    renderAttributes();
    renderProfileSaves();
    renderSkills();
    renderTables();
    renderFavor();
    updateAllCalculated();
    updatePreview();
    setStatus("Perfil carregado com sucesso.");
  }

  function deleteSelectedProfile() {
    const select = root.getElementById("profilesSelect");
    const id = select.value;
    const profiles = getProfiles();
    if (!id || !profiles[id]) {
      setStatus("Selecione um perfil salvo para excluir.");
      return;
    }

    delete profiles[id];
    localStorage.setItem(STORAGE_KEYS.profiles, JSON.stringify(profiles));
    if (localStorage.getItem(STORAGE_KEYS.active) === id) {
      localStorage.removeItem(STORAGE_KEYS.active);
    }
    renderProfiles();
    setStatus("Perfil excluido.");
  }

  function exportJson() {
    state.meta.updatedAt = new Date().toISOString();
    saveDraft();
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    const name = slugify(state.meta.profileName || state.main.name || "personagem");
    anchor.href = url;
    anchor.download = `${name}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
    setStatus("JSON exportado com sucesso.");
  }

  function importJson(event) {
    const file = event.target.files && event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result || "{}"));
        state = normalizeCharacter(parsed);
        saveDraft();
        hydrateForm();
        renderAttributes();
        renderProfileSaves();
        renderSkills();
        renderTables();
        renderFavor();
        updateAllCalculated();
        updatePreview();
        setStatus("JSON importado com sucesso.");
      } catch (error) {
        setStatus("Nao foi possivel importar o JSON.");
      } finally {
        event.target.value = "";
      }
    };
    reader.readAsText(file);
  }

  function renderProfiles() {
    const select = root.getElementById("profilesSelect");
    if (!select) return;

    const profiles = getProfiles();
    const active = localStorage.getItem(STORAGE_KEYS.active);
    select.innerHTML = "";
    Object.entries(profiles).forEach(([id, profile]) => {
      const option = document.createElement("option");
      option.value = id;
      option.textContent = profile.meta && profile.meta.profileName ? profile.meta.profileName : "Personagem sem nome";
      option.selected = id === active;
      select.appendChild(option);
    });
  }

  function updatePreview() {
    const preview = root.getElementById("jsonPreview");
    if (preview) preview.textContent = JSON.stringify(state, null, 2);
  }

  function renderFavor() {
    const dots = root.querySelector("[data-favor-dots]");
    if (!dots) return;

    const max = Math.min(Math.max(numberOrZero(state.main.divineFavorMax), 0), 20);
    const current = clampFavor(state.main.divineFavorCurrent);
    state.main.divineFavorCurrent = current;
    dots.innerHTML = "";

    for (let index = 1; index <= max; index += 1) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = `favor-dot${index <= current ? " is-active" : ""}`;
      button.dataset.favorDot = String(index);
      button.setAttribute("aria-label", `${index} favor${index === 1 ? "" : "es"} divino${index <= current ? " ativo" : " inativo"}`);
      dots.appendChild(button);
    }
  }

  function scheduleAutoSave() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      saveDraft();
      setStatus("Alteracoes salvas automaticamente.");
    }, 350);
  }

  function saveDraft() {
    state.meta.updatedAt = new Date().toISOString();
    localStorage.setItem(STORAGE_KEYS.draft, JSON.stringify(state));
  }

  function loadDraft() {
    const active = localStorage.getItem(STORAGE_KEYS.active);
    const profiles = getProfiles();
    if (active && profiles[active]) return profiles[active];

    try {
      const draft = localStorage.getItem(STORAGE_KEYS.draft);
      return draft ? JSON.parse(draft) : null;
    } catch (error) {
      return null;
    }
  }

  function getProfiles() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEYS.profiles) || "{}");
    } catch (error) {
      return {};
    }
  }

  function renderPrintSheet() {
    const sheet = root.getElementById("printSheet");
    if (!sheet) return;
    const character = normalizeCharacter(loadDraft() || defaultCharacter);
    const attrs = Object.entries(character.attributes);
    const importantAbilities = [
      ...character.tables.affiliationAbilities,
      ...character.tables.pathAbilities,
      ...character.tables.talents
    ].slice(0, 10);
    const equipment = [
      ...character.tables.weapons,
      ...character.tables.equipment,
      ...character.tables.relics
    ].slice(0, 12);

    sheet.innerHTML = `
      <header class="print-title">
        <div class="print-brand">
          <img src="assets/olympus-crest.svg" alt="">
          <div>
            <span>Ficha Semi Deuses</span>
            <h1>${escapeHtml(character.main.name || character.meta.profileName || "Personagem")}</h1>
            <p>${escapeHtml(character.main.affiliation || "Sem filiacao")} | ${escapeHtml(character.main.path || "Sem caminho")} | Nivel ${numberOrZero(character.main.level)}</p>
          </div>
        </div>
        <div class="print-seal">
          <strong>${formatBonus(proficiencyBonus(character))}</strong>
          <span>Prof.</span>
        </div>
      </header>

      <section class="print-section identity-print">
        <h2>Identificacao</h2>
        <div class="print-grid">
          ${printBox("Antecedente", character.main.background)}
          ${printBox("Caminho", character.main.path)}
          ${printBox("Dado de vida", character.main.hitDie)}
          ${printBox("Conjuracao", character.main.spellcasting)}
          ${printBox("Velocidade", character.main.speed)}
          ${printBox("Mod. Conjuracao", formatBonus(character.main.spellcastingMod || 0))}
          ${printBox("DRC", character.main.drc)}
        </div>
      </section>

      <section class="combat-print">
        <div class="resource-print hp-print">
          <span>PV</span>
          <div><strong>${character.main.hpCurrent || 0}</strong><small>Atual</small></div>
          <div><strong>${character.main.hpMax || 0}</strong><small>Max.</small></div>
          <div><strong>${character.main.hpTemp || 0}</strong><small>Temp.</small></div>
        </div>
        <div class="resource-print mp-print">
          <span>MP</span>
          <div><strong>${character.main.mpCurrent || 0}</strong><small>Atual</small></div>
          <div><strong>${character.main.mpMax || 0}</strong><small>Max.</small></div>
        </div>
        <div class="stat-print">
          <span>CA</span>
          <strong>${character.main.armorClass || 0}</strong>
        </div>
        <div class="stat-print">
          <span>Iniciativa</span>
          <strong>${formatBonus(character.main.initiative || 0)}</strong>
        </div>
        <div class="favor-print">
          <span>Favor divino</span>
          <div>${favorDots(character.main.divineFavorCurrent, character.main.divineFavorMax)}</div>
        </div>
      </section>

      <div class="print-two">
        <section class="print-section">
          <h2>Atributos</h2>
          <div class="attribute-print-grid">
            ${attrs.map(([key, attr]) => printAttribute(attributeLabels[key], attr.value, modifier(attr.value))).join("")}
          </div>
        </section>

        <section class="print-section">
          <h2>Salvaguardas</h2>
          <div class="save-print-grid">
            ${attrs.map(([key, attr]) => printSave(attributeLabels[key], attr.saveProficient, modifier(attr.value) + (attr.saveProficient ? proficiencyBonus(character) : 0))).join("")}
          </div>
        </section>
      </div>

      <section class="print-section skills-print">
        <h2>Pericias</h2>
        <div class="skill-print-grid">
          ${character.skills.map((skill) => `
            <div>
              <span>${escapeHtml(skill.name)}</span>
              <small>${escapeHtml(attributeLabels[skill.attribute] || "")}</small>
              <strong>${formatBonus(skillTotal(skill, character))}</strong>
            </div>
          `).join("")}
        </div>
      </section>

      <div class="two-col">
        <section class="print-section">
          <h2>Habilidades principais</h2>
          <div class="section-body">
            ${printTable(["Nome", "Info", "Descricao"], tableRows(importantAbilities))}
          </div>
        </section>
        <section class="print-section">
          <h2>Equipamentos</h2>
          <div class="section-body">
            ${printTable(["Item", "Info", "Notas"], tableRows(equipment))}
          </div>
        </section>
      </div>
    `;
  }

  function printAttribute(label, value, mod) {
    return `
      <div class="attribute-print">
        <span>${escapeHtml(label)}</span>
        <strong>${numberOrZero(value)}</strong>
        <small>${formatBonus(mod)}</small>
      </div>
    `;
  }

  function printSave(label, proficient, total) {
    return `
      <div class="save-print">
        <i>${proficient ? "&diams;" : "&loz;"}</i>
        <span>${escapeHtml(label)}</span>
        <strong>${formatBonus(total)}</strong>
      </div>
    `;
  }

  function favorDots(currentValue, maxValue) {
    const max = Math.min(Math.max(numberOrZero(maxValue), 0), 20);
    const current = Math.min(Math.max(numberOrZero(currentValue), 0), max);
    return Array.from({ length: max }, (_, index) => `<i class="${index < current ? "filled" : ""}"></i>`).join("");
  }


  function tableRows(rows) {
    return rows.length ? rows.map((row) => [row.first || "", row.second || "", row.third || ""]) : [["", "", ""]];
  }

  function printBox(label, value) {
    return `<div class="box"><strong>${escapeHtml(label)}</strong>${escapeHtml(String(value || ""))}</div>`;
  }

  function printTable(headers, rows) {
    return `
      <table class="print-table">
        <thead><tr>${headers.map((header) => `<th>${escapeHtml(header)}</th>`).join("")}</tr></thead>
        <tbody>${rows.map((row) => `<tr>${row.map((cell) => `<td>${escapeHtml(String(cell || ""))}</td>`).join("")}</tr>`).join("")}</tbody>
      </table>
    `;
  }

  // Normaliza JSON antigo, incompleto ou importado manualmente sem quebrar a ficha.
  function normalizeCharacter(input) {
    const merged = deepMerge(deepClone(defaultCharacter), input || {});
    merged.meta = merged.meta || {};
    merged.main = merged.main || {};
    merged.attributes = merged.attributes || {};
    merged.skills = Array.isArray(merged.skills) ? merged.skills : deepClone(defaultCharacter.skills);
    merged.narrative = merged.narrative || {};
    merged.backgroundInfo = merged.backgroundInfo || {};
    merged.tables = merged.tables || {};

    Object.keys(defaultCharacter.attributes).forEach((key) => {
      merged.attributes[key] = deepMerge(deepClone(defaultCharacter.attributes[key]), merged.attributes[key] || {});
    });

    Object.keys(tableConfig).forEach((key) => {
      merged.tables[key] = Array.isArray(merged.tables[key]) ? merged.tables[key] : [];
    });

    if (!merged.meta.profileName) merged.meta.profileName = merged.main.name || "Novo personagem";
    merged.skills = normalizeSkills(merged.skills);
    merged.main.divineFavorMax = Math.min(Math.max(numberOrZero(merged.main.divineFavorMax), 0), 20);
    merged.main.divineFavorCurrent = clampFavor(merged.main.divineFavorCurrent, merged);
    return merged;
  }

  function normalizeSkills(skills) {
    const savedByName = new Map();
    (Array.isArray(skills) ? skills : []).forEach((skill) => {
      const canonicalName = canonicalSkillName(skill.name);
      savedByName.set(skillKey(canonicalName), skill);
    });

    return defaultCharacter.skills.map((defaultSkill) => {
      const savedSkill = savedByName.get(skillKey(defaultSkill.name));
      if (!savedSkill) return deepClone(defaultSkill);
      return deepMerge(deepClone(defaultSkill), {
        ...savedSkill,
        name: defaultSkill.name,
        attribute: savedSkill.attribute || defaultSkill.attribute
      });
    });
  }

  function canonicalSkillName(name) {
    const key = skillKey(name);
    return skillAliases[key] || name;
  }

  function skillKey(name) {
    return String(name || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim();
  }

  function clampFavor(value, character = state) {
    const max = Math.min(Math.max(numberOrZero(character.main && character.main.divineFavorMax), 0), 20);
    return Math.min(Math.max(numberOrZero(value), 0), max);
  }

  function skillTotal(skill, character = state) {
    const attr = character.attributes[skill.attribute] || { value: 10 };
    let total = modifier(attr.value);
    if (skill.expertise) total += proficiencyBonus(character) * 2;
    else if (skill.proficient) total += proficiencyBonus(character);
    return total;
  }

  function proficiencyBonus(character = state) {
    return numberOrZero(character.main && character.main.proficiency);
  }

  function modifier(value) {
    return Math.floor((numberOrZero(value) - 10) / 2);
  }

  function formatBonus(value) {
    const numeric = numberOrZero(value);
    return numeric >= 0 ? `+${numeric}` : String(numeric);
  }

  function setStatus(message) {
    const element = root.getElementById("saveStatus");
    if (element) element.textContent = message;
  }

  function updateProfileName() {
    const element = root.getElementById("activeProfileName");
    if (element) element.textContent = state.meta.profileName || "Novo personagem";
  }

  function getInputValue(input) {
    if (input.type === "checkbox") return input.checked;
    if (input.type === "number") return numberOrZero(input.value);
    return input.value;
  }

  function setInputValue(input, value) {
    if (input.type === "checkbox") input.checked = Boolean(value);
    else input.value = value == null ? "" : value;
  }

  function getByPath(object, path) {
    return path.split(".").reduce((current, part) => current && current[part], object);
  }

  function setByPath(object, path, value) {
    const parts = path.split(".");
    const last = parts.pop();
    const target = parts.reduce((current, part) => {
      current[part] = current[part] || {};
      return current[part];
    }, object);
    target[last] = value;
  }

  function numberOrZero(value) {
    const number = Number(value);
    return Number.isFinite(number) ? number : 0;
  }

  function deepClone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function deepMerge(target, source) {
    if (!source || typeof source !== "object") return target;
    Object.entries(source).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        target[key] = deepClone(value);
      } else if (value && typeof value === "object") {
        target[key] = deepMerge(target[key] && typeof target[key] === "object" ? target[key] : {}, value);
      } else {
        target[key] = value;
      }
    });
    return target;
  }

  function makeId() {
    return `profile-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  function slugify(value) {
    return String(value)
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "") || "personagem";
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function escapeAttribute(value) {
    return escapeHtml(value).replace(/`/g, "&#096;");
  }
})();
