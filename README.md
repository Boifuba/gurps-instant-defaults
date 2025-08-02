<p align="center">
  <img src="https://github.com/Boifuba/gurps-instant-defaults/blob/main/icons/icon-LARGE.png" alt="Logo" width="400">
</p>

# GURPS Instant Defaults

A modern skill chooser and defaults system for GURPS in Foundry VTT. This module provides an intuitive interface for browsing skills with their default values and page references, making character creation and skill management much easier.

## Features

- **Skill Browser**: Browse through all GURPS skills with an easy-to-use interface
- **Smart Search**: Filter skills by name with real-time search
- **Dual Display Modes**: 
  - **Show Name**: Display human-readable skill names
  - **Show OTF**: Display the raw OTF (On-The-Fly) format
- **GURPS Integration**: Full integration with GGA system features including:
  - Click to roll skills
  - Right-click for context menus
  - Drag & drop functionality
- **Page References**: Quick access to rulebook page references

## Installation

1. In Foundry VTT, go to the **Add-on Modules** tab
2. Click **Install Module**
3. Paste the manifest URL or search for "GURPS Instant Defaults"
4. Click **Install**
5. Enable the module in your world's **Module Settings**


## Usage

### Skill Chooser

Find a compendium "Gurps Instant Defaults" and drag a macro to your macro bar.

or

Access the skill chooser through the module's API:

```javascript
InstantDefaults.skillChooser()
```

The skill chooser provides:

- **Search Bar**: Type to filter skills by name
- **Display Toggle**: Switch between showing skill names or OTF format
- **Clickable Skills**: Click any skill to trigger GURPS actions (rolling, etc.)
- **Page References**: Click reference links to open rulebook pages
- **Drag & Drop**: Drag skills to character sheets or other locations


### Display Modes

- **Name Mode**: Shows the original skill name while maintaining full GURPS functionality
- **OTF Mode**: Shows the raw OTF string exactly as it appears in the data

### GURPS Integration

The module uses the GGA system's built-in functions:
- `GURPS.gurpslink()` for generating proper skill links
- `GurpsWiring.hookupGurps()` for enabling click functionality
- `GurpsWiring.hookupGurpsRightClick()` for context menus


## File Structure

```
gurps-instant-defaults/
├── data/
│   └── skills.json          # Skills database
├── scripts/
│   └── main.js             # Main module code
├── templates/
│   └── chooseSkillsFile.hbs # File chooser template
├── module.json             # Module manifest
└── README.md              # This file
```

## API Reference

### Public Methods

#### `InstantDefaults.skillChooser()`
Opens the skill chooser dialog.

#### `InstantDefaults.version`
Returns the current module version.

### Internal Functions

- `loadSkillsData()`: Loads skills from JSON file
- `processSkillData()`: Processes raw skill data
- `generateSkillsHTML()`: Generates HTML for skill display
- `setupGurpsInteractions()`: Sets up GURPS-specific functionality



## Compatibility

- **Foundry VTT**: v10+
- **GURPS System**: Latest version required


## License

This module is released under the MIT License. See the LICENSE file for details.

## Support

For issues, feature requests, or questions:

1. Search existing issues on the project repository
2. Create a new issue with detailed information


## Credits

- Built for the GURPS system in Foundry VTT
- Uses GURPS system's built-in wiring and link functions
- Skill data compiled from GURPS Basic Set and supplements


## More Legal 

The material presented here is our original creation, deployed as On the Fly formulas made by Gurps Game Aid and is intended for use with the GURPS system by Steve Jackson Games. This material is not official and is not endorsed by Steve Jackson Games. GURPS is a trademark of Steve Jackson Games, and its rules and art are copyrighted by Steve Jackson Games. All rights are reserved by Steve Jackson Games. The GURPS Instant Defaults was released for free distribution, and not for resale, under the permissions granted in the Steve Jackson Games Online Policy this module DOES NOT provide information contained in paid publications. It is only intended to allow people to play GURPS online using their GURPS books/PDFs.