# 🚀 Vecna Release Process Guide

Here's your complete roadmap to release vecna publicly:

## 📋 Pre-Release Checklist

### 1. **Final Cleanup** (Optional but recommended)
```bash
# Clean up worktree references for cleanest release
rm -rf .git/worktrees/

# Verify everything builds
npm run build

# Run tests to ensure everything works
npm test

# Run linting
npm run lint
```

## 🌟 GitHub Public Release

### 1. **Make Repository Public**
1. Go to https://github.com/rafpiek/vecna
2. Settings → General → Danger Zone
3. "Change repository visibility" → Public
4. Confirm by typing repository name

### 2. **Create GitHub Release**
```bash
# Tag the current version
git tag v1.0.0
git push origin v1.0.0
```

Then on GitHub:
1. Go to Releases → "Create a new release"
2. Choose tag: `v1.0.0`
3. Release title: `v1.0.0 - Initial Public Release`
4. Description:
```markdown
# 🌳 Vecna v1.0.0 - Initial Public Release

A powerful CLI tool for managing multi-language monorepos with advanced git worktree automation.

## ✨ Features
- **One-command worktree creation** - Replace 8+ manual steps with `vecna start`
- **Interactive worktree switching** - Visual selection with status indicators
- **Automatic configuration copying** - master.key, application.yml, .env files
- **Multi-language support** - JavaScript/TypeScript, Ruby with extensible design
- **Editor integration** - First-class Cursor support with auto-open
- **Rich CLI experience** - Colored output, progress indicators, fuzzy search

## 🚀 Quick Start
```bash
npm install -g vecna
vecna setup
vecna start --branch feature/awesome-feature -e
```

## 📖 Documentation
Full documentation available in [README.md](./README.md)

---
Made with ❤️ for developers who value efficiency.
```

5. Check "Set as the latest release"
6. Publish release

## 📦 NPM Publication

### 1. **Prepare for npm**
```bash
# Make sure you're logged in to npm
npm whoami
# If not logged in:
npm login

# Verify package.json is correct
cat package.json | grep -E "(name|version|description|author|license)"
```

### 2. **Test Package Before Publishing**
```bash
# Create a test tarball to see what would be published
npm pack

# This creates vecna-1.0.0.tgz - inspect contents:
tar -tzf vecna-1.0.0.tgz

# Clean up
rm vecna-1.0.0.tgz
```

### 3. **Publish to npm**
```bash
# Dry run first (shows what would be published)
npm publish --dry-run

# Actually publish (this is permanent!)
npm publish

# Verify it worked
npm info vecna
```

## 🎯 Post-Release Tasks

### 1. **Update Documentation**
Add installation instructions to README:
```bash
# Add to README.md under Installation section
npm install -g vecna
```

### 2. **Social Media/Community**
- Tweet about the release
- Post on relevant dev communities (Reddit r/programming, Dev.to)
- Share in developer Discord/Slack communities

### 3. **Monitor**
- Watch for GitHub issues/PRs
- Monitor npm download stats: `npm info vecna`
- Set up GitHub notifications for new issues

## ⚠️ Important Notes

### **NPM Publication is PERMANENT**
- You can never republish the same version
- Unpublishing is restricted after 72 hours
- Make sure you're ready before `npm publish`

### **Recommended Release Flow**
```bash
# 1. Final testing
npm test && npm run lint && npm run build

# 2. Make repo public on GitHub
# 3. Create GitHub release with tag

# 4. Publish to npm
npm publish

# 5. Test global installation
npm install -g vecna
vecna --version  # Should show 1.0.0
```

### **Version Management**
For future releases:
```bash
# Patch version (1.0.1)
npm version patch
git push && git push --tags
npm publish

# Minor version (1.1.0)
npm version minor
git push && git push --tags
npm publish
```

## 🔄 Release Checklist Summary

- [ ] Clean repository (`rm -rf .git/worktrees/`)
- [ ] Final tests (`npm test && npm run lint`)
- [ ] Make GitHub repo public
- [ ] Create GitHub release with tag v1.0.0
- [ ] Test npm package (`npm pack`, inspect contents)
- [ ] Publish to npm (`npm publish`)
- [ ] Verify installation (`npm install -g vecna`)
- [ ] Update README with npm install instructions
- [ ] Share with community

**Ready to launch? Your vecna CLI is about to go global! 🌍🚀**