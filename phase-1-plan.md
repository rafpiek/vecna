# Phase 1: Implementation Plan

This document outlines the detailed steps for implementing Phase 1 of the `vecna` CLI tool as specified in the design document.

## 1. Project Initialization & Setup

1.  **Project Directory:**
    The project directory is the current directory.

2.  **Initialize Node.js Project:**
    ```bash
    npm init -y
    ```

3.  **Create `.gitignore`:**
    Create a `.gitignore` file at the project root to exclude unnecessary files from version control.
    ```
    # Dependencies
    /node_modules

    # Build output
    /dist

    # Logs
    logs
    *.log
    npm-debug.log*

    # Environment variables
    .env
    .env.local
    .env.development.local
    .env.test.local
    .env.production.local
    ```

4.  **Install TypeScript and Basic Tooling:**
    ```bash
    npm install typescript ts-node @types/node --save-dev
    ```

5.  **Initialize TypeScript Configuration:**
    ```bash
    npx tsc --init
    ```
    - Modify the generated `tsconfig.json` to include the following settings for a robust setup:
      ```json
      {
        "compilerOptions": {
          "target": "ES2020",
          "module": "CommonJS",
          "rootDir": "./src",
          "outDir": "./dist",
          "esModuleInterop": true,
          "moduleResolution": "node",
          "strict": true,
          "sourceMap": true,
          "skipLibCheck": true
        },
        "include": ["src/**/*"],
        "exclude": ["node_modules", "**/*.spec.ts", "**/*.test.ts"]
      }
      ```
6.  **Update `package.json`:**
    - Add a `start` script: `"start": "node dist/index.js"`
    - Add a `build` script: `"build": "tsc"`
    - Add a `dev` script: `"dev": "ts-node src/index.ts"`

## 2. Core Dependencies Installation

Install the libraries recommended in the design document.

```bash
# Command-line framework
npm install commander

# Interactive prompts
npm install inquirer @types/inquirer

# Colored terminal output
npm install chalk

# Git operations
npm install simple-git

# Filesystem operations
npm install fs-extra @types/fs-extra

# Testing framework
npm install jest @types/jest ts-jest --save-dev
```

- Configure Jest to work with TypeScript by creating a `jest.config.js` file.

## 3. Project Structure

Create the following directory structure to organize the code:

```
vecna-cli/
├── dist/                     # Compiled JavaScript output
├── src/                      # TypeScript source code
│   ├── commands/             # Logic for each CLI command
│   │   ├── lint.ts
│   │   ├── setup.ts
│   │   ├── test.ts
│   │   └── ...
│   ├── utils/                # Helper modules
│   │   ├── configManager.ts  # Handles global and local config
│   │   ├── git.ts            # Git-related functionalities
│   │   └── logger.ts         # Wrapper for styled console output
│   └── index.ts              # Main entry point
├── tests/                    # Unit and integration tests
│   ├── commands/
│   └── utils/
├── .vecna.json               # Local project configuration (example)
├── package.json
└── tsconfig.json
```

## 4. Implementation Steps

### Step 4.1: CLI Entry Point (`src/index.ts`)

1.  **Shebang:** Add `#!/usr/bin/env node` to the top of `src/index.ts`.
2.  **`package.json`:** Add a `bin` field to `package.json`:
    ```json
    "bin": {
      "vecna": "dist/index.js"
    }
    ```
3.  **Command Routing:** Use `commander` to set up the main program and route to sub-commands.
    - Define commands: `setup`, `list`, `lint`, `test`.
    - Define global options if any.
    - Parse `process.argv`.

### Step 4.2: Configuration Manager (`src/utils/configManager.ts`)

1.  **Paths:** Define paths for global (`~/.config/vecna/config.json`) and local (`.vecna.json`) configuration files. Use `os.homedir()` to ensure cross-platform compatibility.
2.  **Global Config:**
    - `ensureGlobalConfig()`: Checks if the directory and file exist, creates them if not.
    - `readGlobalConfig()`: Reads and parses the global JSON file.
    - `updateGlobalConfig()`: Writes updated project configurations to the file.
3.  **Local Config:**
    - `readLocalConfig()`: Reads the project-specific `.vecna.json`.
    - `createLocalConfig()`: Creates the `.vecna.json` during the `setup` command.

### Step 4.3: Git Utilities (`src/utils/git.ts`)

1.  **Initialize `simple-git`:** Create a configured instance of `simple-git`.
2.  **`getModifiedFiles(mainBranch)`:**
    - This function will be the core of the `lint` and `test` commands.
    - It needs to get a list of files changed against the main branch.
    - **Committed changes:** Use `git diff --name-only ${mainBranch}...HEAD`.
    - **Uncommitted changes (staged and unstaged):** Use `git diff --name-only` for staged and `git ls-files --others --exclude-standard` plus modified unstaged files for uncommitted. `simple-git`'s `status()` method will be useful here.
    - The function should return separate arrays for committed and uncommitted files to support the `-c` and `-e` flags.

### Step 4.4: Command Implementation (`src/commands/`)

For each command, create a file in `src/commands/` and integrate it into the main `commander` program in `index.ts`.

1.  **`setup.ts`:**
    - Use `inquirer` to prompt the user for the project name.
    - Check for `Gemfile` to detect `rspec`.
    - Check `package.json` for `scripts` containing `eslint` or other linters.
    - Call `configManager.updateGlobalConfig()` to save the new project.
    - Call `configManager.createLocalConfig()` to create the `.vecna.json` file.

2.  **`list.ts`:**
    - Read the global config using `configManager.readGlobalConfig()`.
    - Format and print the list of projects using `chalk` for better readability.

3.  **`version.ts`:**
    - Read the `version` from `package.json` and print it.

4.  **`lint.ts`:**
    - Define subcommands `all`, `rb`, `js`.
    - Define options `-f` (fix), `-e` (uncommitted only), `-c` (committed only).
    - Use `git.ts` to get the list of modified files based on the flags.
    - Filter files by extension (`.rb`, `.js`, `.ts`, etc.).
    - Use `child_process.spawn` to execute `rubocop` or `eslint` on the relevant files, passing the autofix flag if specified. Stream the output to the console.

5.  **`test.ts`:**
    - Define subcommands `all`, `rb`.
    - Define options `-e` (uncommitted only), `-c` (committed only).
    - Use `git.ts` to get the list of modified test files (e.g., `_spec.rb`).
    - Use `child_process.spawn` to execute `rspec` with the list of test files. Stream output.

### Step 4.5: Unit Tests

- For each utility in `src/utils`, create a corresponding test file in `tests/utils`.
- Mock filesystem and git operations to test `configManager.ts` and `git.ts` in isolation.
- For each command in `src/commands`, create a test file in `tests/commands`.
- Test command logic, option parsing, and interactions with utils.
- Aim for high test coverage on core logic, especially file filtering and external process execution.

## 5. Packaging & Distribution

1.  **Build:** Run `npm run build` to compile all TypeScript files to JavaScript in the `dist` directory.
2.  **Local Installation:** Run `npm link` in the project root. This will create a symlink and make the `vecna` command available system-wide for development and testing.
3.  **Publishing (Future):** For wider distribution, the package can be published to the npm registry using `npm publish`. The `pkg` library mentioned in the design doc can be used later to create standalone binaries.

## 6. Error Handling and User Feedback

Throughout the implementation, it is crucial to build in robust error handling to provide a good user experience.

-   **Command Guards:** Each command should validate its preconditions. For example, `lint` and `test` should check if they are being run inside a valid Git repository before proceeding.
-   **Dependency Checks:** The `setup` and command runners should verify that external dependencies (like `rubocop`, `rspec`, `eslint`) are installed and accessible in the user's `PATH`. If a dependency is missing, the tool should provide a clear error message with instructions on how to install it.
-   **Graceful Failures:** When an external process like a linter or test runner fails, `vecna` should capture the exit code and stderr, and present a formatted, easy-to-understand summary to the user instead of just dumping the raw output.
-   **Configuration Errors:** The `configManager` should handle cases where configuration files are malformed (e.g., invalid JSON) or missing expected keys, guiding the user on how to fix the issue.

## 7. Progress Summary (as of latest interaction)

All initial implementation tasks from section 1 through 4.4 have been completed. The project has been initialized, dependencies installed, and the core command structure (`setup`, `list`, `version`, `lint`, `test`) has been implemented.

The primary challenge has been in the unit testing phase (Step 4.5). The initial approach to mocking file system and git operations proved to be brittle and led to persistent test failures.

To address this, a significant refactoring effort was initiated:
- The `configManager` and `git` utilities are being refactored to use dependency injection. This will decouple them from their dependencies (`fs-extra` and `simple-git` respectively), making them more modular and easier to test reliably with mock objects.
- This refactoring is currently in progress. The `configManager` has been updated, and the next step is to refactor the `git` utility and then update all the command implementations and tests accordingly.

This change in approach deviates from the original plan but is a necessary step to ensure the codebase is robust, maintainable, and well-tested.
