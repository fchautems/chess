
(() => {
  "use strict";

  const PROFILE_KEY = "openingTrainer.playerProfile.v1";
  const STORAGE_PREFIX = "openingTrainer.";
  const BACKUP_TYPE = "opening-trainer-backup";
  const BACKUP_VERSION = 1;
  const MAX_NAME_LENGTH = 32;

  function createPlayerId() {
    if (window.crypto && typeof window.crypto.randomUUID === "function") {
      return window.crypto.randomUUID();
    }
    return `player-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  function parseJson(value, fallback = null) {
    try {
      return JSON.parse(value);
    } catch (_error) {
      return fallback;
    }
  }

  function normalizeName(value) {
    const trimmed = String(value || "").trim().replace(/\s+/g, " ");
    return (trimmed || "Joueur").slice(0, MAX_NAME_LENGTH);
  }

  function normalizeProfile(value) {
    const now = new Date().toISOString();
    const source = value && typeof value === "object" ? value : {};
    return {
      schemaVersion: 1,
      playerId: typeof source.playerId === "string" && source.playerId ? source.playerId : createPlayerId(),
      name: normalizeName(source.name),
      createdAt: typeof source.createdAt === "string" ? source.createdAt : now,
      updatedAt: typeof source.updatedAt === "string" ? source.updatedAt : now
    };
  }

  function loadProfile() {
    const stored = parseJson(localStorage.getItem(PROFILE_KEY));
    const profile = normalizeProfile(stored);
    localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
    return profile;
  }

  function saveProfile(profile) {
    const normalized = normalizeProfile({
      ...profile,
      updatedAt: new Date().toISOString()
    });
    localStorage.setItem(PROFILE_KEY, JSON.stringify(normalized));
    return normalized;
  }

  function collectApplicationStorage() {
    const storage = {};
    for (let index = 0; index < localStorage.length; index += 1) {
      const key = localStorage.key(index);
      if (key && key.startsWith(STORAGE_PREFIX)) {
        storage[key] = localStorage.getItem(key);
      }
    }
    return storage;
  }

  function clearApplicationStorage() {
    const keys = [];
    for (let index = 0; index < localStorage.length; index += 1) {
      const key = localStorage.key(index);
      if (key && key.startsWith(STORAGE_PREFIX)) keys.push(key);
    }
    keys.forEach((key) => localStorage.removeItem(key));
  }

  function slugify(value) {
    return normalizeName(value)
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "joueur";
  }

  function downloadBackup(profile) {
    const backup = {
      type: BACKUP_TYPE,
      schemaVersion: BACKUP_VERSION,
      exportedAt: new Date().toISOString(),
      profile,
      storage: collectApplicationStorage()
    };

    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const date = new Date().toISOString().slice(0, 10);
    link.href = url;
    link.download = `ouvertures-${slugify(profile.name)}-${date}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  function validateBackup(value) {
    if (!value || typeof value !== "object") throw new Error("Fichier de sauvegarde invalide.");
    if (value.type !== BACKUP_TYPE) throw new Error("Ce fichier n’est pas une sauvegarde de l’entraîneur.");
    if (value.schemaVersion !== BACKUP_VERSION) throw new Error("Version de sauvegarde non prise en charge.");
    if (!value.storage || typeof value.storage !== "object" || Array.isArray(value.storage)) {
      throw new Error("La sauvegarde ne contient pas de progression exploitable.");
    }
    return value;
  }

  function restoreBackup(backup) {
    clearApplicationStorage();
    Object.entries(backup.storage).forEach(([key, value]) => {
      if (key.startsWith(STORAGE_PREFIX) && typeof value === "string") {
        localStorage.setItem(key, value);
      }
    });
    const profile = normalizeProfile(backup.profile || parseJson(localStorage.getItem(PROFILE_KEY)));
    localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
  }

  function buildProfileModal() {
    const backdrop = document.createElement("div");
    backdrop.id = "profileBackdrop";
    backdrop.className = "profile-modal-backdrop";
    backdrop.setAttribute("role", "dialog");
    backdrop.setAttribute("aria-modal", "true");
    backdrop.setAttribute("aria-labelledby", "profileModalTitle");
    backdrop.innerHTML = `
      <section class="profile-modal-panel">
        <div class="profile-modal-header">
          <div>
            <h2 id="profileModalTitle">Profil joueur</h2>
            <p>Ton nom et ta progression sont enregistrés automatiquement dans ce navigateur.</p>
          </div>
          <button id="profileCloseButton" class="profile-close-button" type="button" aria-label="Fermer">×</button>
        </div>

        <label class="profile-field-label" for="profileNameInput">Nom du joueur</label>
        <input id="profileNameInput" class="profile-name-input" type="text" maxlength="${MAX_NAME_LENGTH}" autocomplete="nickname">
        <button id="profileSaveButton" class="profile-save-button" type="button">Enregistrer le nom</button>

        <div class="profile-storage-card">
          <h3>Sauvegarde et transfert</h3>
          <p><strong>Automatique :</strong> le jeu conserve ici ton profil, tes XP, tes niveaux, tes récompenses et tes statistiques.</p>
          <p><strong>Copie JSON :</strong> l’export crée une photographie manuelle pour transférer ou récupérer ton joueur. Ce fichier ne se met pas à jour tout seul.</p>
          <div class="profile-action-grid">
            <button id="profileExportButton" class="profile-action-button" type="button">⬇️ Exporter une sauvegarde</button>
            <label class="profile-import-label" for="profileImportInput">⬆️ Importer une sauvegarde
              <input id="profileImportInput" type="file" accept="application/json,.json">
            </label>
          </div>
          <button id="profileResetButton" class="profile-reset-button" type="button">Effacer le profil et toute la progression</button>
          <div id="profileStatus" class="profile-status" aria-live="polite"></div>
        </div>
      </section>`;
    document.body.appendChild(backdrop);
    return backdrop;
  }

  function initProfileFeature() {
    const profileLevel = document.querySelector(".profile-level");
    if (!profileLevel || document.getElementById("playerProfileButton")) return;

    let profile = loadProfile();
    const levelLabel = profileLevel.querySelector("span:not(.avatar)");
    const button = document.createElement("button");
    button.id = "playerProfileButton";
    button.className = "player-name-button";
    button.type = "button";
    button.title = "Ouvrir le profil joueur";
    button.setAttribute("aria-label", "Ouvrir le profil joueur");
    if (levelLabel) profileLevel.insertBefore(button, levelLabel);
    else profileLevel.appendChild(button);

    const backdrop = buildProfileModal();
    const input = backdrop.querySelector("#profileNameInput");
    const status = backdrop.querySelector("#profileStatus");
    const closeButton = backdrop.querySelector("#profileCloseButton");
    const saveButton = backdrop.querySelector("#profileSaveButton");
    const exportButton = backdrop.querySelector("#profileExportButton");
    const importInput = backdrop.querySelector("#profileImportInput");
    const resetButton = backdrop.querySelector("#profileResetButton");

    function renderProfile() {
      button.textContent = profile.name;
      button.title = `${profile.name} — gérer le profil`;
      input.value = profile.name;
    }

    function setStatus(message, type = "") {
      status.textContent = message;
      status.className = `profile-status${type ? ` ${type}` : ""}`;
    }

    function openModal() {
      renderProfile();
      setStatus("");
      backdrop.classList.add("open");
      requestAnimationFrame(() => {
        input.focus();
        input.select();
      });
    }

    function closeModal() {
      backdrop.classList.remove("open");
      button.focus();
    }

    button.addEventListener("click", openModal);
    closeButton.addEventListener("click", closeModal);
    backdrop.addEventListener("click", (event) => {
      if (event.target === backdrop) closeModal();
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && backdrop.classList.contains("open")) closeModal();
    });

    saveButton.addEventListener("click", () => {
      profile = saveProfile({ ...profile, name: input.value });
      renderProfile();
      setStatus("Nom enregistré automatiquement sur cet appareil.", "success");
    });

    input.addEventListener("keydown", (event) => {
      if (event.key === "Enter") saveButton.click();
    });

    exportButton.addEventListener("click", () => {
      profile = saveProfile({ ...profile, name: input.value });
      renderProfile();
      downloadBackup(profile);
      setStatus("Copie de sauvegarde exportée. Elle correspond à la progression actuelle.", "success");
    });

    importInput.addEventListener("change", async () => {
      const file = importInput.files && importInput.files[0];
      importInput.value = "";
      if (!file) return;

      try {
        const backup = validateBackup(JSON.parse(await file.text()));
        const importedName = normalizeProfile(backup.profile).name;
        const confirmed = window.confirm(`Importer la sauvegarde de « ${importedName} » ? La progression actuellement enregistrée dans ce navigateur sera remplacée.`);
        if (!confirmed) return;
        restoreBackup(backup);
        setStatus("Sauvegarde importée. Rechargement…", "success");
        window.setTimeout(() => window.location.reload(), 350);
      } catch (error) {
        setStatus(error instanceof Error ? error.message : "Impossible d’importer ce fichier.", "error");
      }
    });

    resetButton.addEventListener("click", () => {
      const confirmed = window.confirm("Effacer définitivement le profil, les XP, les niveaux, les récompenses, les statistiques et toute la progression enregistrés dans ce navigateur ? Pense à exporter une sauvegarde avant si tu souhaites les conserver.");
      if (!confirmed) return;
      clearApplicationStorage();
      window.location.reload();
    });

    renderProfile();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initProfileFeature, { once: true });
  } else {
    initProfileFeature();
  }
})();
