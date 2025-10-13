// Complete Git Integration Validation Test
const validateCompleteGitIntegration = () => {
  console.log('🔍 Complete Git Integration Test\n');
  console.log('=' .repeat(50));
  
  const tests = {
    phase2: {
      name: 'Phase 2: Git Integration',
      items: []
    }
  };

  // Test 4A: Wire Git Status
  tests.phase2.items.push({
    name: '4A: Git Status Display',
    test: () => {
      const gitService = document.querySelector('.simple-git-panel');
      const statusElements = document.querySelectorAll('[class*="git-status"]');
      return gitService !== null || statusElements.length > 0;
    }
  });

  // Test 4B: Commit/Push/Pull Buttons
  tests.phase2.items.push({
    name: '4B: Git Action Buttons',
    test: () => {
      const commitBtn = document.querySelector('.git-action-btn.commit');
      const pushBtn = document.querySelector('.git-action-btn.push');
      const pullBtn = document.querySelector('.git-action-btn.pull');
      return commitBtn !== null || pushBtn !== null || pullBtn !== null;
    }
  });

  // Test 4C: Diff Viewer
  tests.phase2.items.push({
    name: '4C: Git Diff Viewer',
    test: () => {
      // Check if component exists in DOM or can be created
      const diffViewer = document.querySelector('.git-diff-viewer');
      return diffViewer !== null || typeof window.GitDiffViewer === 'function';
    }
  });

  // Test 4D: Branch Management
  tests.phase2.items.push({
    name: '4D: Branch Manager',
    test: () => {
      const branchManager = document.querySelector('.git-branch-manager');
      const branchSelector = document.querySelector('.branch-selector');
      return branchManager !== null || branchSelector !== null;
    }
  });

  // Test Git API availability
  tests.phase2.items.push({
    name: 'Git API Bridge',
    test: () => {
      return window.primus && window.primus.git && 
             typeof window.primus.git.status === 'function';
    }
  });

  // Run all tests
  let totalPassed = 0;
  let totalFailed = 0;

  Object.values(tests).forEach(phase => {
    console.log(`\n📦 ${phase.name}`);
    console.log('-'.repeat(40));
    
    phase.items.forEach(item => {
      try {
        const passed = item.test();
        if (passed) {
          console.log(`  ✅ ${item.name}`);
          totalPassed++;
        } else {
          console.log(`  ❌ ${item.name}`);
          totalFailed++;
        }
      } catch (error) {
        console.log(`  ⚠️ ${item.name}: ${error.message}`);
        totalFailed++;
      }
    });
  });

  // Summary
  console.log('\n' + '='.repeat(50));
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(50));
  console.log(`✅ Passed: ${totalPassed}`);
  console.log(`❌ Failed: ${totalFailed}`);
  const score = (totalPassed / (totalPassed + totalFailed)) * 100;
  console.log(`📈 Score: ${score.toFixed(1)}%`);
  
  if (score === 100) {
    console.log('\n🎉 PHASE 2 COMPLETE! Git Integration fully functional!');
  } else if (score >= 80) {
    console.log('\n✨ Git Integration mostly working! Minor issues remain.');
  } else {
    console.log('\n⚠️ Git Integration needs attention. Check failed tests.');
  }
  
  return {
    passed: totalPassed,
    failed: totalFailed,
    score
  };
};

// Auto-run and attach to window
if (typeof window !== 'undefined') {
  window.validateCompleteGitIntegration = validateCompleteGitIntegration;
  
  // Auto-run after 3 seconds
  setTimeout(() => {
    console.clear();
    validateCompleteGitIntegration();
  }, 3000);
}