# Design doc to create a CLI tool to work effectively with git worktrees and branches

## General overview
Vecna is fancy, colorful, interactive CLI tool to work effectively with Ruby on Rails, Stimulus projects and git worktrees and branches.


## Features

<config-file>
~/.config/vecna/config.json
</config-file>

<local-config-file>
.vecna.json
</local-config-file>

<config-file-schema>
{
  projects: [
    "<project-name>": {
      "path": "<project-path>",
      "backend-test-engine": "rspec",
      "backend-linting-engine": "rubocop",
      "frontend-linting-engine": "eslint"
    }
  ]
}
</config-file-schema>

### Commands

#### Setup
1) help
Shows all possible commands
2) version
Shows current version of the tool
3) setup
Should be run on the first run of the tool.
Can be run also on demand.
It checks if {config-file} exists and if not, it creates it and starts init process.
The command should be run from within the project repository directory.
Steps:
- confirms that it should register the current project path in {{config-file}}
- asks for the name of the project
- it automatically analyzes if there is `rspec` present in Gemfile and linting commands in `package.json`
- it sets the configuration in {{config-file}}
It creates also {{local-config-file}} in the project root directory with the part of the schema that is specific to the project.
By this it will always run with the proper configuration.

4) list
Shows all projects registered in {{config-file}}, their paths and engines

#### Linting
5) lint
- by default it runs linting on files modified in the current branch versus the main branch, no matter if they are committed or not
- it should accept parameters:
  - all - runs linting for backend and frontend, it's default command, and it runs also with `vecna lint`
  - rb - runs linting for backend
  - js - runs linting for frontend
  - -f - runs linting with autofix, so if rb it runs rubocop with autofix, if js it runs eslint with autofix, if all it runs both
  - -e - runs linting only on not committed files
  - -c - runs linting only on committed files

#### Testing
6) test
- by default it runs tests on files modified in the current branch versus the main branch, no matter if they are committed or not
- it should accept parameters:
  - all - runs tests for backend (frontend testing not implemented in first iteration)
  - rb - runs tests for backend using rspec
  - js - not implemented in first iteration (placeholder for future frontend testing)
  - -e - runs tests only on files that are not committed
  - -c - runs tests only on files that are committed
Note: In the first iteration, only backend testing with rspec is supported. Frontend testing will be added in future iterations.

#### Git
TBD

## Phases
### Phase 1:
- create interactive cli tool
- cli should be configurable and it should save config in ~/.config/vecna/ directory
- in this phase we implement running linters and test engines, and basic configuration for the tool

### Phase 2:
- in that phase we implement working with git worktrees and branches
- not yet specified

### Phase 3:
--on hold right now---
Create terminal UI similar to lazy git UI https://github.com/jesseduffield/lazygit
##  Recommended JavaScript CLI Stack:
Ink (github.com/vadimdemedes/ink)

For sophisticated, interactive CLI UIs built with React.

Commander.js (github.com/tj/commander.js)

Easy command parsing, flags, and help messages.

Inquirer.js (github.com/SBoudrias/Inquirer.js)

For intuitive user prompts.

Chalk (github.com/chalk/chalk)

For colors, highlighting, and visual aesthetics.

Simple-Git (github.com/steveukx/git-js)

Git integration within Node.js tools.

pkg (github.com/vercel/pkg)

Compiles Node.js CLI apps into executable binaries.


