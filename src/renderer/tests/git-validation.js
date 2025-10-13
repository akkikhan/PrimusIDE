// Git Integration Test Suite
// Tests all git functionality systematically

const validateGitIntegration = async () => {
  console.log('🔍 Git Integration Validation Starting...\n');
  
  const results = {
    passed: [],
    failed: [],
    warnings: []
  };

  // Test 1: Check if window.primus.git exists
  const testGitBridge = () => {
    try {
      if (window.primus && window.primus.git) {
        results.passed.push('✅ Git bridge available');
        return true;
      } else {
        results.failed.push('❌ Git bridge not found');
        return false;
      }
    } catch (error) {
      results.failed.push(`❌ Bridge test error: ${error.message}`);
      return false;
    }
  };

  // Test 2: Initialize git in current workspace
  const testGitInit = async () => {
    try {
      const workspacePath = window.currentFolder || 'C:\\Users\\aakib\\Documents\\Primus-IDE';
      const result = await window.primus.git.init(workspacePath);
      
      if (result.success) {
        results.passed.push(`✅ Git initialized: ${result.isNew ? 'New repo' : 'Existing repo'}`);
      } else {
        results.failed.push('❌ Git initialization failed');
      }
    } catch (error) {
      results.failed.push(`❌ Git init error: ${error.message}`);
    }
  };

  // Test 3: Get git status
  const testGitStatus = async () => {
    try {
      const workspacePath = window.currentFolder || 'C:\\Users\\aakib\\Documents\\Primus-IDE';
      const status = await window.primus.git.status(workspacePath);
      
      if (status) {
        results.passed.push(`✅ Git status retrieved: Branch ${status.current}, ${status.modified?.length || 0} modified files`);
      } else {
        results.failed.push('❌ Could not get git status');
      }
    } catch (error) {
      results.failed.push(`❌ Git status error: ${error.message}`);
    }
  };

  // Test 4: Get branches
  const testGitBranches = async () => {
    try {
      const workspacePath = window.currentFolder || 'C:\\Users\\aakib\\Documents\\Primus-IDE';
      const branches = await window.primus.git.branches(workspacePath);
      
      if (branches && branches.all) {
        results.passed.push(`✅ Branches retrieved: ${branches.all.length} branches found`);
      } else {
        results.failed.push('❌ Could not get branches');
      }
    } catch (error) {
      results.failed.push(`❌ Git branches error: ${error.message}`);
    }
  };

  // Test 5: Check GitPanel UI
  const testGitPanelUI = () => {
    try {
      const gitPanel = document.querySelector('.git-panel');
      const gitButton = document.querySelector('[title*="Git"]');
      
      if (gitButton) {
        results.passed.push('✅ Git button found in UI');
      } else {
        results.warnings.push('⚠️ Git button not visible');
      }
      
      if (gitPanel || document.querySelector('.simple-git-panel')) {
        results.passed.push('✅ Git panel component exists');
      } else {
        results.warnings.push('⚠️ Git panel not rendered');
      }
    } catch (error) {
      results.warnings.push(`⚠️ UI test error: ${error.message}`);
    }
  };

  // Run all tests
  if (!testGitBridge()) {
    console.error('Git bridge not available - stopping tests');
    return results;
  }

  await testGitInit();
  await testGitStatus();
  await testGitBranches();
  testGitPanelUI();

  // Generate report
  console.log('\n📊 Git Integration Test Results:');
  console.log('================================\n');
  
  console.log('✅ Passed Tests:');
  results.passed.forEach(msg => console.log(`  ${msg}`));
  
  console.log('\n❌ Failed Tests:');
  results.failed.forEach(msg => console.log(`  ${msg}`));
  
  console.log('\n⚠️ Warnings:');
  results.warnings.forEach(msg => console.log(`  ${msg}`));
  
  const score = (results.passed.length / (results.passed.length + results.failed.length)) * 100;
  console.log(`\n📈 Score: ${score.toFixed(1)}%`);
  
  return results;
};

// Export for use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { validateGitIntegration };
}

// Also attach to window for browser use
if (typeof window !== 'undefined') {
  window.validateGitIntegration = validateGitIntegration;
}