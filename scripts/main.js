/**
 * GURPS Instant Defaults Module
 * Modern skill chooser and defaults system for GURPS in Foundry VTT
 * 
 * @author Your Name
 * @version 1.0.0
 */

import GurpsWiring from "/systems/gurps/module/gurps-wiring.js";
import { UniversalFileHandler } from "/systems/gurps/module/file-handlers/universal-file-handler.js";

/**
 * Configuration constants for the module
 */
const CONFIG = {
  SKILLS_DATA_PATH: "modules/gurps-instant-defaults/data/skills.json",
  DIALOG_DIMENSIONS: {
    width: 520,
    height: 600
  },
  MAX_SKILLS_HEIGHT: 420,
  SEARCH_DEBOUNCE: 100
};

/**
 * Display modes for skills
 */
const DISPLAY_MODES = {
  NAME: 'name',
  OTF: 'otf'
};

/**
 * Localization helper - gets translated text
 * @param {string} key - Translation key
 * @returns {string} Translated text
 */
function getLocalizedText(key) {
  return game.i18n.localize(`SKILLS.${key}`);
}

/**
 * Sets up GURPS-specific functionality for HTML elements
 * Enables drag & drop and right-click functionality for GURPS links
 * 
 * @param {jQuery} html - jQuery object containing HTML elements to process
 */
function setupGurpsInteractions(html) {
  // Initialize GURPS wiring for links and right-click functionality
  GurpsWiring.hookupGurps(html);
  GurpsWiring.hookupGurpsRightClick(html);
  
  // Enable drag & drop for GURPS links
  const links = html.find(".gurpslink");
  links.each((_, linkElement) => {
    linkElement.setAttribute("draggable", "true");
    
    linkElement.addEventListener("dragstart", (event) => {
      let displayName = "";
      
      // Get display name from current target if available
      if (event.currentTarget?.dataset.action) {
        displayName = event.currentTarget.innerText;
      }
      
      // Set drag data for GURPS system compatibility
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

/**
 * Generates HTML for filtered skill list
 * Creates skill rows with name and reference links
 * 
 * @param {Array} skillsData - Array of processed skill objects
 * @param {string} displayMode - Current display mode (name or otf)
 * @returns {string} HTML string for skill rows
 */
function generateSkillsHTML(skillsData, displayMode = DISPLAY_MODES.NAME) {
  return skillsData
    .map((skill) => {
      let skillDisplay;
      
      if (displayMode === DISPLAY_MODES.OTF) {
        // Show OTF format using GURPS.gurpslink
        skillDisplay = GURPS.gurpslink(skill.otf);
      } else {
        // Show skill name but with OTF functionality
        // Use GURPS.gurpslink to generate the correct attributes, then extract them
        const gurpsLinkHtml = GURPS.gurpslink(skill.otf);
        
        // Create a temporary div to parse the HTML and extract attributes
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = gurpsLinkHtml;
        
        // Find the gurpslink span element
        const gurpsLinkSpan = tempDiv.querySelector('span.gurpslink');
        
        if (gurpsLinkSpan) {
          // Extract the correctly formatted attributes
          const dataOtf = gurpsLinkSpan.getAttribute('data-otf');
          const dataAction = gurpsLinkSpan.getAttribute('data-action');
          
          // Create the skill display with the original name but using the correct GURPS attributes
          skillDisplay = `<span class="gurpslink" data-otf="${dataOtf}" data-action="${dataAction}">${skill.originalName}</span>`;
        } else {
          // Fallback if GURPS.gurpslink doesn't return a valid gurpslink span
          console.warn("Failed to extract GURPS link attributes for skill:", skill.originalName);
          skillDisplay = `<span class="gurpslink" data-otf="${skill.otf}">${skill.originalName}</span>`;
        }
      }
      
      return `
        <div class="skill-row" data-skill-name="${skill.name}">
          <div class="skill-name">
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

/**
 * Processes raw skill data from JSON file
 * Converts JSON skill objects to the format expected by the UI
 * 
 * @param {Array} skillsJson - Array of skill objects from JSON file
 * @returns {Array} Processed skill objects with name, otf, and reference
 */
function processSkillData(skillsJson) {
  const processedSkills = [];

  // Iterate through each skill in the JSON array
  skillsJson.forEach((skillData) => {
    // Skip if skill data is invalid or missing required fields
    if (!skillData || typeof skillData !== 'object' || !skillData.name || !skillData.skill) {
      return;
    }

    // Use the skill data directly from JSON
    // The 'skill' field already contains the OTF format
    // The 'page' field already contains the reference format
    processedSkills.push({
      name: skillData.name.toLowerCase(),
      otf: skillData.skill,
      reference: skillData.page || "",
      originalName: skillData.name
    });
  });

  return processedSkills;
}

/**
 * Loads skills data from the JSON file
 * @returns {Promise<Array>} Skills data array
 */
async function loadSkillsData() {
  try {
    const response = await fetch(CONFIG.SKILLS_DATA_PATH);
    
    if (!response.ok) {
      throw new Error(`Failed to load skills data: ${response.status} ${response.statusText}`);
    }
    
    const skillsData = await response.json();
    
    if (!Array.isArray(skillsData)) {
      throw new Error("Invalid skills data format - expected an array");
    }
    
    return skillsData;
  } catch (error) {
    console.error("GURPS Instant Defaults: Error loading skills data", error);
    ui.notifications.error(getLocalizedText('LoadingError'));
    throw error;
  }
}

/**
 * Creates and displays the skill chooser dialog
 * Main interface for browsing and selecting skills
 */
async function skillChooser() {
  try {
    // Load skill data from JSON file
    const skillsJson = await loadSkillsData();
    const processedSkills = processSkillData(skillsJson);

    if (processedSkills.length === 0) {
      ui.notifications.warn(getLocalizedText('NoSkillsFound'));
      return;
    }

    // Initialize display mode
    let currentDisplayMode = DISPLAY_MODES.NAME;

    // Create dialog content
    const dialogContent = `
      <div class="skill-chooser">
        <div class="search-section">
          <input 
            type="text" 
            id="skill-filter" 
            class="search-input" 
            placeholder="${getLocalizedText('Dialog.SkillChooser.FilterPlaceholder')}"
            autocomplete="off"
          />
          <div class="skill-count">
            <span id="skill-count">${processedSkills.length}</span> ${getLocalizedText('Dialog.SkillChooser.SkillCount')}
          </div>
        </div>
        
        <div class="display-toggle-section">
          <button id="toggle-name" class="toggle-btn active" type="button">
            ${getLocalizedText('Dialog.SkillChooser.ShowName')}
          </button>
          <button id="toggle-otf" class="toggle-btn" type="button">
            ${getLocalizedText('Dialog.SkillChooser.ShowOTF')}
          </button>
        </div>
        
        <div id="skills-result" class="skills-list">
          ${generateSkillsHTML(processedSkills, currentDisplayMode)}
        </div>
        
        <div class="help-text">
          <p><i class="fas fa-info-circle"></i> ${getLocalizedText('Dialog.SkillChooser.HelpText')}</p>
        </div>
      </div>
    `;

    // Create and render dialog
    const dialogHtml = await new Promise((resolve) => {
      new Dialog(
        {
          title: getLocalizedText('Dialog.SkillChooser.Title'),
          content: dialogContent,
          buttons: {
            close: {
              icon: '<i class="fas fa-times"></i>',
              label: getLocalizedText('Dialog.SkillChooser.Close'),
              callback: () => {}
            }
          },
          render: (html) => {
            setupGurpsInteractions(html);
            resolve(html);
          },
          default: "close"
        },
        { 
          height: CONFIG.DIALOG_DIMENSIONS.height,
          width: CONFIG.DIALOG_DIMENSIONS.width,
          resizable: true,
          classes: ["gurps-instant-defaults-dialog"]
        }
      ).render(true);
    });

    /**
     * Updates the skill list display based on current filter and display mode
     * @param {string} searchTerm - Current search filter
     */
    function updateSkillListDisplay(searchTerm = "") {
      const filteredSkills = searchTerm 
        ? processedSkills.filter((skill) => skill.name.includes(searchTerm.toLowerCase().trim()))
        : processedSkills;

      const resultElement = dialogHtml.find("#skills-result")[0];
      const countElement = dialogHtml.find("#skill-count")[0];
      
      // Update UI with filtered results
      resultElement.innerHTML = generateSkillsHTML(filteredSkills, currentDisplayMode);
      countElement.textContent = filteredSkills.length;
      
      // Re-setup GURPS interactions for new elements
      setupGurpsInteractions($(resultElement));
    }

    // Set up toggle button functionality
    const toggleNameBtn = dialogHtml.find("#toggle-name");
    const toggleOtfBtn = dialogHtml.find("#toggle-otf");
    const filterInput = dialogHtml.find("#skill-filter");

    toggleNameBtn.on("click", function() {
      if (currentDisplayMode !== DISPLAY_MODES.NAME) {
        currentDisplayMode = DISPLAY_MODES.NAME;
        toggleNameBtn.addClass("active");
        toggleOtfBtn.removeClass("active");
        updateSkillListDisplay(filterInput.val());
      }
    });

    toggleOtfBtn.on("click", function() {
      if (currentDisplayMode !== DISPLAY_MODES.OTF) {
        currentDisplayMode = DISPLAY_MODES.OTF;
        toggleOtfBtn.addClass("active");
        toggleNameBtn.removeClass("active");
        updateSkillListDisplay(filterInput.val());
      }
    });

    // Set up search functionality
    filterInput.on("input", function (event) {
      updateSkillListDisplay(event.target.value);
    });

    // Focus search input for better UX
    setTimeout(() => {
      filterInput.focus();
    }, CONFIG.SEARCH_DEBOUNCE);

  } catch (error) {
    console.error("GURPS Instant Defaults: Error in skillChooser", error);
    ui.notifications.error("Failed to load skill chooser. Check console for details.");
  }
}

/**
 * Imports skills from a .skl file and creates a journal entry
 * Handles file selection, parsing, and duplicate removal
 */
async function skillsImport() {
  try {
    // Load file chooser template
    const template = await getTemplate(
      "modules/gurps-instant-defaults/templates/chooseSkillsFile.hbs"
    );

    // Get file from user
    const file = await UniversalFileHandler.getFile({
      template,
      extensions: [".skl"],
    });

    if (!file) {
      return; // User cancelled file selection
    }

    // Parse file content
    const fileContent = await file.text();
    let parsedData;
    
    try {
      parsedData = JSON.parse(fileContent);
    } catch (parseError) {
      ui.notifications.error("Invalid JSON format in selected file");
      return;
    }

    if (!parsedData.rows || !Array.isArray(parsedData.rows)) {
      ui.notifications.error("File does not contain valid skill data");
      return;
    }

    // Process skills and remove duplicates
    const uniqueSkills = [];
    const skillNames = new Set();

    parsedData.rows.forEach((skill) => {
      if (skill.name && !skillNames.has(skill.name)) {
        uniqueSkills.push(skill);
        skillNames.add(skill.name);
      }
    });

    // Generate journal content
    const journalRows = uniqueSkills.map((skill) => {
      const defaults = skill.defaults ?? [];
      const options = [`S:${skill.name}`].concat(
        defaults.map((defaultSkill) =>
          defaultSkill.type === "skill"
            ? `S:${defaultSkill.name}${defaultSkill.modifier || ""}`
            : `${defaultSkill.type}${defaultSkill.modifier || ""}`
        )
      );

      const otf = `["${skill.name}" ${options.join(" | ")}]`;
      const reference = skill.reference
        ? skill.reference.split(",").map((ref) => `[PDF:${ref.trim()}]`).join()
        : "";

      return `<tr><td>${otf}</td><td>${reference}</td></tr>`;
    });

    // Create journal entry
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

/**
 * Module initialization
 * Exposes public API to global scope
 */
function initializeModule() {
  // Expose public API
  window.InstantDefaults = {
    skillChooser,
    skillsImport,
    // Expose version for debugging
    version: "1.0.0"
  };

  console.log("GURPS Instant Defaults module loaded successfully");
}

// Initialize module when script loads
initializeModule();
