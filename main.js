/**
 * GURPS Instant Defaults Module
 * Modern skill chooser and defaults system for GURPS in Foundry VTT
 * 
 * @author Boifubá
 * @version 0.5.4
 */

import GurpsWiring from "/systems/gurps/module/gurps-wiring.js";
import { UniversalFileHandler } from "/systems/gurps/module/file-handlers/universal-file-handler.js";

const CONFIG = {
  SKILLS_DATA_PATH: "modules/gurps-instant-defaults/skills.json",
  TEMPLATE_PATH: "modules/gurps-instant-defaults/skillChooser.hbs",
  DIALOG_DIMENSIONS: { width: 450, height: 570 },
  MAX_SKILLS_HEIGHT: 420,
  SEARCH_DEBOUNCE: 100
};

const DISPLAY_MODES = { NAME: 'name', OTF: 'otf' };

function setupGurpsInteractions(html) {
  GurpsWiring.hookupGurps(html);
  GurpsWiring.hookupGurpsRightClick(html);
  
  const links = html.find(".gurpslink");
  links.each((_, linkElement) => {
    linkElement.setAttribute("draggable", "true");
    linkElement.addEventListener("dragstart", (event) => {
      let displayName = event.currentTarget?.innerText || "";
      return event.dataTransfer?.setData(
        "text/plain",
        JSON.stringify({
          otf: linkElement.getAttribute("data-otf"),
          displayname: displayName,
        })
      );
    });
  });
}

function getFavoritedSkills() {
  return game.settings.get("gurps-instant-defaults", "favoriteSkills") || [];
}

async function toggleFavoriteSkill(otf) {
  const favoriteSkills = getFavoritedSkills();
  const index = favoriteSkills.indexOf(otf);
  
  if (index > -1) {
    favoriteSkills.splice(index, 1);
  } else {
    favoriteSkills.push(otf);
  }
  
  await game.settings.set("gurps-instant-defaults", "favoriteSkills", favoriteSkills);
  return index === -1;
}

function generateSkillsHTML(skillsData, displayMode = DISPLAY_MODES.NAME) {
  return skillsData
    .map((skill) => {
      let skillDisplay;
      
      // Sempre usamos GURPS.gurpslink() para criar um link com os atributos PERFEITOS.
      // Isso garante que data-otf e data-action estejam 100% corretos.
      const gurpsLinkHtml = GURPS.gurpslink(skill.otf);
      
      // Usamos um elemento temporário para manipular o HTML.
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = gurpsLinkHtml;
      const gurpsLinkSpan = tempDiv.querySelector('span.gurpslink');

      if (gurpsLinkSpan) {
        if (displayMode === DISPLAY_MODES.OTF) {
          // MODO OTF:
          // 1. Colocamos o texto da OTF dentro do span.
          gurpsLinkSpan.textContent = skill.otf;
          
          // 2. Adicionamos o atributo 'data-name'. Isso impede o hookupGurps
          //    de substituir nosso texto. Ele vai ler o data-name e deixar
          //    o textContent em paz.
          gurpsLinkSpan.setAttribute('data-name', skill.originalName);

        } else {
          // MODO NOME:
          // O GURPS.gurpslink já coloca o nome, então está correto.
          gurpsLinkSpan.textContent = skill.originalName;
        }
        
        skillDisplay = gurpsLinkSpan.outerHTML;
      } else {
        // Fallback
        skillDisplay = `<span>${skill.originalName}</span>`;
      }
      
      const starClass = skill.isFavorited ? 'favorite-star favorited' : 'favorite-star';
      const starIcon = `<i class="${starClass} fas fa-star" data-otf="${skill.otf}" title="Toggle favorite"></i>`;
      
      return `
        <div class="skill-row" data-skill-name="${skill.name}">
          <div class="skill-name">
            ${starIcon}
            ${skillDisplay}
          </div>
          <div class="skill-reference">
            ${GURPS.gurpslink(skill.reference)}
          </div>
        </div>
      `;
    })
    .join("\n");
}



function processSkillData(skillsJson) {
  const favoriteSkills = getFavoritedSkills();
  return skillsJson.map(skillData => {
    if (!skillData?.name || !skillData?.skill) return null;
    return {
      name: skillData.name.toLowerCase(),
      otf: skillData.skill,
      reference: skillData.page || "",
      originalName: skillData.name,
      isFavorited: favoriteSkills.includes(skillData.skill)
    };
  }).filter(Boolean);
}

async function loadSkillsData() {
  try {
    const response = await fetch(CONFIG.SKILLS_DATA_PATH);
    if (!response.ok) throw new Error(`Failed to load skills data: ${response.statusText}`);
    const skillsData = await response.json();
    if (!Array.isArray(skillsData)) throw new Error("Invalid skills data format");
    return skillsData;
  } catch (error) {
    console.error("GURPS Instant Defaults: Error loading skills data", error);
    ui.notifications.error("Failed to load skills data. Check console for details.");
    throw error;
  }
}

/**
 * SkillChooserApplication - Modern Application v2 for skill selection
 * Extends Foundry VTT Application class for better structure and maintainability
 */
class SkillChooserApplication extends Application {
  constructor(processedSkills, options = {}) {
    super(options);
    this._processedSkills = processedSkills || [];
    this._currentDisplayMode = DISPLAY_MODES.NAME;
    this._currentSearchTerm = "";
  }

  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id: "gurps-skill-chooser",
      title: "GURPS Instant Defaults",
      template: CONFIG.TEMPLATE_PATH,
      width: CONFIG.DIALOG_DIMENSIONS.width,
      height: CONFIG.DIALOG_DIMENSIONS.height,
      resizable: true,
      classes: ["gurps-instant-defaults-dialog"],
      closeOnSubmit: false,
      submitOnChange: false,
      submitOnClose: false
    });
  }

  getData() {
    return {
      skills: this._processedSkills,
      displayModes: DISPLAY_MODES,
      currentDisplayMode: this._currentDisplayMode,
      searchTerm: this._currentSearchTerm
    };
  }

  activateListeners(html) {
    super.activateListeners(html);

    // Cache DOM elements
    this._filterInput = html.find("#skill-filter");
    this._resultElement = html.find("#skills-result");
    this._countElement = html.find("#skill-count");
    this._toggleNameBtn = html.find("#toggle-name");
    this._toggleOtfBtn = html.find("#toggle-otf");

    // Setup event listeners
    this._filterInput.on("input", (event) => {
      this._currentSearchTerm = event.target.value;
      this._updateSkillListDisplay();
    });

    this._toggleNameBtn.on("click", () => {
      if (this._currentDisplayMode !== DISPLAY_MODES.NAME) {
        this._currentDisplayMode = DISPLAY_MODES.NAME;
        this._toggleNameBtn.addClass("active");
        this._toggleOtfBtn.removeClass("active");
        this._updateSkillListDisplay();
      }
    });

    this._toggleOtfBtn.on("click", () => {
      if (this._currentDisplayMode !== DISPLAY_MODES.OTF) {
        this._currentDisplayMode = DISPLAY_MODES.OTF;
        this._toggleOtfBtn.addClass("active");
        this._toggleNameBtn.removeClass("active");
        this._updateSkillListDisplay();
      }
    });

    // Initial render and focus
    this._updateSkillListDisplay();
    setTimeout(() => this._filterInput.focus(), CONFIG.SEARCH_DEBOUNCE);
  }

  _updateSkillListDisplay() {
    const lowerCaseSearchTerm = this._currentSearchTerm.toLowerCase().trim();
    let filteredSkills = lowerCaseSearchTerm
      ? this._processedSkills.filter(skill => skill.name.includes(lowerCaseSearchTerm))
      : [...this._processedSkills];

    // Sort: favorites first, then alphabetically
    filteredSkills.sort((a, b) => {
      if (a.isFavorited !== b.isFavorited) return a.isFavorited ? -1 : 1;
      return a.name.localeCompare(b.name);
    });

    // Update DOM
    this._resultElement.html(generateSkillsHTML(filteredSkills, this._currentDisplayMode));
    this._countElement.text(filteredSkills.length);

    // Setup interactions
    setupGurpsInteractions(this._resultElement);
    this._setupFavoriteStarHandlers(this._resultElement);
  }

  _setupFavoriteStarHandlers(container) {
    container.find('.favorite-star').on('click', async (event) => {
      event.preventDefault();
      event.stopPropagation();
      
      const otf = $(event.currentTarget).data('otf');
      const isFavorited = await toggleFavoriteSkill(otf);
      
      // Update the skill in our local data
      const skill = this._processedSkills.find(s => s.otf === otf);
      if (skill) {
        skill.isFavorited = isFavorited;
      }
      
      // Re-render the list
      this._updateSkillListDisplay();
    });
  }

  /**
   * Update skills data and refresh display
   * Useful for external updates to favorite status
   */
  updateSkills(newSkillsData) {
    this._processedSkills = newSkillsData;
    this._updateSkillListDisplay();
  }
}

async function skillChooser() {
  try {
    const skillsJson = await loadSkillsData();
    const processedSkills = processSkillData(skillsJson);

    if (processedSkills.length === 0) {
      ui.notifications.warn("No skills found in the data file.");
      return;
    }

    // Create and render the new Application v2
    const skillChooserApp = new SkillChooserApplication(processedSkills);
    skillChooserApp.render(true);

  } catch (error) {
    console.error("GURPS Instant Defaults: Error in skillChooser", error);
    ui.notifications.error("Failed to load skill chooser. Check console for details.");
  }
}

async function skillsImport() {
  try {
    const template = await getTemplate("modules/gurps-instant-defaults/chooseSkillsFile.hbs");
    const file = await UniversalFileHandler.getFile({ template, extensions: [".skl"] });
    if (!file) return;

    const fileContent = await file.text();
    let parsedData;
    try { parsedData = JSON.parse(fileContent); } 
    catch (e) { return ui.notifications.error("Invalid JSON format in selected file"); }

    if (!parsedData.rows || !Array.isArray(parsedData.rows)) {
      return ui.notifications.error("File does not contain valid skill data");
    }

    const uniqueSkills = Array.from(new Map(parsedData.rows.map(skill => [skill.name, skill])).values());

    const journalRows = uniqueSkills.map(skill => {
      const defaults = skill.defaults?.map(d => d.type === "skill" ? `S:${d.name}${d.modifier || ""}` : `${d.type}${d.modifier || ""}`) || [];
      const options = [`S:${skill.name}`, ...defaults].join(" | ");
      const otf = `["${skill.name}" ${options}]`;
      const reference = skill.reference ? skill.reference.split(",").map(ref => `[PDF:${ref.trim()}]`).join() : "";
      return `<tr><td>${otf}</td><td>${reference}</td></tr>`;
    });

    const journalName = file.name.slice(0, file.name.lastIndexOf("."));
    await JournalEntry.create({
      name: journalName,
      content: `<table>${journalRows.join("\n")}</table>`,
    });

    ui.notifications.info(`Successfully imported ${uniqueSkills.length} skills to journal "${journalName}"`);
  } catch (error) {
    console.error("GURPS Instant Defaults: Error in skillsImport", error);
    ui.notifications.error("Failed to import skills. Check console for details.");
  }
}

function initializeModule() {
  game.settings.register("gurps-instant-defaults", "favoriteSkills", {
    name: "Favorite Skills",
    hint: "List of favorited skill OTFs",
    scope: "client",
    config: false,
    type: Array,
    default: []
  });
}
Hooks.on("getSceneControlButtons", (controls) => {
  const tokenControls = controls.tokens;

  if (tokenControls && tokenControls.tools) {
    tokenControls.tools["instant-defaults-button"] = {
      name: "instant-defaults-button",
      title: "Gurps Instant Defaults",
      icon: 'fa-solid fa-comment-nodes',
      button: true,
      onClick: () => {
        InstantDefaults.skillChooser();
      },
      visible: true
    };
  }
});

Hooks.on("chatMessage", (chatLog, message, chatData) => {
  if (message.startsWith("/gid")) {
    InstantDefaults.skillChooser();
    return false; // Impede a mensagem de aparecer no chat
  }
});
function setupApi() {
  window.InstantDefaults = { skillChooser, skillsImport, version: "1.0.0" };
  console.log("GURPS Instant Defaults module loaded successfully");
}

Hooks.once('init', initializeModule);
Hooks.once('ready', setupApi);
