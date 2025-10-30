# 🚀 PRIMUS IDE - QUICK REFERENCE
## One-Page Cheat Sheet for Rapid Development

---

## 📞 QUESTIONS TO ANSWER BEFORE STARTING

Please review and provide answers to these questions:

### 1. Development Environment
- **Q:** Will you be the sole developer, or is there a team?
  - **A:** _[YOUR ANSWER]_

- **Q:** How many hours per week can you commit?
  - **A:** _[YOUR ANSWER]_

- **Q:** What are your machine specs? (RAM, CPU, OS)
  - **A:** _[YOUR ANSWER]_

### 2. Timeline & Scope
- **Q:** Is the 10-12 week timeline acceptable?
  - **A:** _[YOUR ANSWER]_

- **Q:** Agreement on deferred features to v0.2?
  - **A:** _[YOUR ANSWER]_

- **Q:** Preferred beta release date?
  - **A:** _[YOUR ANSWER]_

### 3. Technical Decisions
- **Q:** Comfortable cloning VS Code/Theia code?
  - **A:** _[YOUR ANSWER]_

- **Q:** Target platforms? (Windows only, or Mac/Linux too?)
  - **A:** _[YOUR ANSWER]_

- **Q:** Test coverage target (80%) acceptable?
  - **A:** _[YOUR ANSWER]_

### 4. Resources
- **Q:** Budget for AI API credits (OpenAI, etc.)?
  - **A:** _[YOUR ANSWER]_

- **Q:** Access to test machines for other platforms?
  - **A:** _[YOUR ANSWER]_

### 5. Release Strategy
- **Q:** Beta release public or private?
  - **A:** _[YOUR ANSWER]_

- **Q:** Auto-update mechanism required?
  - **A:** _[YOUR ANSWER]_

- **Q:** Telemetry/crash reporting acceptable?
  - **A:** _[YOUR ANSWER]_

---

## ⚡ GETTING STARTED (Day 1)

### Step 1: Initial Setup (30 minutes)
```powershell
# 1. Create feature branch
git checkout -b feature/rapid-completion

# 2. Run setup script
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.\scripts\setup-completion-path.ps1

# 3. Verify build
npm install
npm run build
npm run dev  # Test that it launches
```

### Step 2: First Task (4 hours)
```powershell
# 1. Start tracking
npm run task:next -- --category="Code Intelligence"
npm run task:start -- 637

# 2. Follow IMPLEMENTATION_GUIDE.md Recipe 1-5

# 3. Test your changes
npm test

# 4. Commit
git add .
git commit -m "TASK-637: Initial LSP adapter infrastructure"
git push origin feature/rapid-completion
```

---

## 📚 DOCUMENT MAP

| Document | Purpose | When to Use |
|----------|---------|-------------|
| **PROJECT_COMPLETION_PLAN.md** | Master plan, milestones, scope | Start of project, weekly reviews |
| **IMPLEMENTATION_GUIDE.md** | Technical recipes, code examples | During development |
| **TASK_CHECKLIST.md** | Daily task tracking | Every day |
| **QUICK_REFERENCE.md** | This file - quick lookup | Anytime you need quick info |

---

## 🎯 DAILY ROUTINE

### Morning (4 hours)
```powershell
# 9:00 - Review yesterday's work
git log --oneline -5

# 9:30 - Plan today
# Open TASK_CHECKLIST.md, review tasks

# 10:00 - Start work
npm run task:start -- <task-id>
npm run dev  # Launch IDE

# Work for 3 hours with breaks
```

### Afternoon (4 hours)
```powershell
# 13:00 - Continue implementation

# 15:00 - Testing & documentation

# 16:00 - Commit & track
git add .
git commit -m "TASK-XXX: Description"
npm run task:complete -- <task-id>
npm run tasks:pipeline

# 17:00 - Update checklist
# Edit TASK_CHECKLIST.md
```

---

## 🔧 COMMON COMMANDS

### Task Management
```powershell
# Select next task
npm run task:next

# Filter by category
npm run task:next -- --category="LSP"

# Start working on task
npm run task:start -- 637

# Complete task
npm run task:complete -- 637

# View status
npm run tasks:status
```

### Development
```powershell
# Full dev environment
npm run dev

# Build everything
npm run build

# Build specific parts
npm run build:preload
npm run build:main
npm run build:renderer

# Run tests
npm test
npm test -- --watch
npm test -- --coverage
```

### Git Workflow
```powershell
# Daily commits
git add .
git commit -m "TASK-XXX: Description"
git push origin feature/rapid-completion

# Before merging
git pull origin main
git merge main
# Resolve conflicts if any
git push
```

---

## 📊 MILESTONE GATES

### Before Proceeding to Next Milestone

**Milestone 1 → 2:**
- [ ] Go to Definition working
- [ ] Build passes
- [ ] No regressions in existing features

**Milestone 2 → 3:**
- [ ] All 6 LSP features working
- [ ] Performance <50ms
- [ ] Tests passing

**Milestone 3 → 4:**
- [ ] Debug adapter functional
- [ ] Breakpoints work
- [ ] File system robust

**Milestone 4 → 5:**
- [ ] 5+ extensions loading
- [ ] Multiple terminals work
- [ ] No crashes

**Milestone 5 → 6:**
- [ ] Startup time <3s
- [ ] Memory stable
- [ ] AI features complete

**Milestone 6 → 7:**
- [ ] 80% test coverage
- [ ] Documentation complete
- [ ] No P0 bugs

**Milestone 7:**
- [ ] Beta installer works
- [ ] Tested on 3+ machines
- [ ] **SHIP IT!** 🎉

---

## 🚨 WHEN TO ASK FOR HELP

### Immediate Help Needed:
- Build completely broken (>2 hours stuck)
- Git repository corrupted
- Critical blocker preventing all work

### Can Wait:
- Performance optimization questions
- UI/UX design decisions
- Non-critical feature clarifications

### How to Ask:
1. Note the blocker in TASK_CHECKLIST.md
2. Include error messages, logs
3. What you've tried already
4. Specific question

---

## 🎨 CODE QUALITY STANDARDS

### Before Every Commit:
```powershell
# 1. Build succeeds
npm run build

# 2. Tests pass
npm test

# 3. No TypeScript errors
# (Check VS Code problems panel)

# 4. Code formatted
# (Prettier should auto-format)
```

### Commit Message Format:
```
TASK-<id>: <Short description>

- Detail 1
- Detail 2

Refs: #<task-id>
Progress: XX%
```

---

## 📈 TRACKING PROGRESS

### Weekly Review (Every Friday 16:00)

**What to Review:**
1. Tasks completed this week
2. Milestone progress
3. Blockers encountered
4. Performance metrics
5. Next week's plan

**Update These:**
- [ ] TASK_CHECKLIST.md progress bars
- [ ] PROJECT_STATUS.md (create if not exists)
- [ ] Commit message summaries
- [ ] GitHub project board (if using)

---

## 🛠️ TROUBLESHOOTING QUICK FIXES

### Build Fails
```powershell
# Clean and rebuild
rm -rf node_modules dist
npm install
npm run build
```

### LSP Not Responding
```typescript
// Add debug logging
console.log('[LSP] Request:', method, params);
console.log('[LSP] Response:', result);
```

### Memory Leaks
```typescript
// Always dispose resources
dispose(): void {
  this.cleanup();
  this.subscriptions.forEach(sub => sub.dispose());
}
```

### Tests Failing
```powershell
# Run single test file
npm test -- path/to/test.ts

# Debug mode
node --inspect-brk node_modules/.bin/jest --runInBand
```

---

## 📞 PROJECT CONTACTS

**Developer:** _[YOUR NAME]_  
**Email:** _[YOUR EMAIL]_  
**GitHub:** _[YOUR GITHUB]_  
**Discord/Slack:** _[IF APPLICABLE]_

**AI Assistant:** Available via GitHub Copilot Chat  
**Repository:** https://github.com/akkikhan/PrimusIDE  
**Branch:** `ide-clone` (currently), `feature/rapid-completion` (working)

---

## 🎯 SUCCESS DEFINITION

### What "Complete" Means:

1. **Functional:**
   - All P0 features working
   - No crashes in normal usage
   - Performance targets met

2. **Quality:**
   - 80%+ test coverage
   - No P0 bugs
   - Documentation complete

3. **Releasable:**
   - Beta installer created
   - Tested on 3+ machines
   - Known issues documented

4. **Differentiating:**
   - Spec-Kit workflow operational
   - AI task planning working
   - Unique value demonstrated

---

## 🚀 FIRST WEEK GOALS

### By End of Week 1:
- [ ] Vendor code integrated
- [ ] Go to Definition working
- [ ] Find References working
- [ ] Rename Symbol working
- [ ] Tests passing
- [ ] Documentation updated
- [ ] **Demo-able feature!**

### Celebrate When:
- ✅ First Ctrl+Click navigation works
- ✅ First test passes
- ✅ First commit pushed
- ✅ First week complete

---

## 💪 MOTIVATION

**Remember:**
- You're 70% done already!
- This plan gets you to 90% in 12 weeks
- Every day is measurable progress
- You're building something unique
- The AI planning features are differentiating
- Beta release = huge milestone

**When Stuck:**
1. Check IMPLEMENTATION_GUIDE.md
2. Look at working examples in codebase
3. Search VS Code source code
4. Ask for help (see above)
5. Take a break, come back fresh

**You Got This! 🚀**

---

## 📋 APPROVAL CHECKLIST

Before starting implementation, get approval on:

- [ ] Project scope (read PROJECT_COMPLETION_PLAN.md)
- [ ] Timeline (10-12 weeks)
- [ ] Deferred features (v0.2+)
- [ ] Resources needed (API credits, test machines)
- [ ] Release strategy (beta public/private)
- [ ] Code cloning approach (VS Code, Theia)

**Approved By:** _[NAME]_  
**Date:** _[DATE]_  
**Signature:** _[SIGNATURE]_

---

## 🎉 READY TO GO!

**Next Action:**
1. Answer the questions at the top of this document
2. Get approval on scope/timeline
3. Run setup script: `.\scripts\setup-completion-path.ps1`
4. Start Day 1 tasks from TASK_CHECKLIST.md
5. Follow IMPLEMENTATION_GUIDE.md recipes

**Questions?** Review PROJECT_COMPLETION_PLAN.md or ask!

**Let's build this! 🚀**

---

**END OF QUICK REFERENCE**
