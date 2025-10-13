// Git Integration Test Suite
// Validates Git functionality

import { gitService } from '../services/GitService';

export const validateGitIntegration = async () => {
  console.log('🔍 Starting Git Integration Validation...');
  
  const results = {
    passed: [],
    failed: [],
    warnings: []
  };

  // Test 1: Check Git Service Initialization
  const testGitService = async () => {
    try {
      const currentPath = window.primus?.fs?.getCurrentPath?.() || process.cwd();
      const initialized = await gitService.initialize(currentPath);
      
      if (initialized) {
        results.passed.push('✅ Git service initialized successfully');
      } else {
        results.failed.push('❌ Git service failed to initialize');
      }
    } catch (error) {
      results.failed.push(`❌ Git initialization error: ${error.message}`);
    }
  };

  // Test 2: Check Git Status
  const testGitStatus = async () => {
    try {
      const status = await gitService.getStatus();
      
      if (status) {
        results.passed.push(`✅ Git status retrieved: Branch ${status.branch}`);
        
        // Check status properties
        if (typeof status.staged === 'object' && Array.isArray(status.staged)) {
          results.passed.push('✅ Git status has valid staged array');
        }
        if (typeof status.unstaged === 'object' && Array.isArray(status.unstaged)) {
          results.passed.push('✅ Git status has valid unstaged array');
        }
      } else {
        results.warnings.push('⚠️ No Git repository found in current directory');
      }
    } catch (error) {
      results.failed.push(`❌ Git status error: ${error.message}`);
    }
  };

  // Test 3: Check Git Branches
  const testGitBranches = async () => {
    try {
      const branches = await gitService.getBranches();
      
      if (branches && branches.length > 0) {
        results.passed.push(`✅ Found ${branches.length} branches`);
      } else {
        results.warnings.push('⚠️ No branches found or not a Git repository');
      }
    } catch (error) {
      results.failed.push(`❌ Git branches error: ${error.message}`);
    }
  };

  // Test 4: Validate SimpleGitPanel Component
  const testGitPanel = () => {
    const gitButton = document.querySelector('[data-view="git"]');
    if (gitButton) {
      results.passed.push('✅ Git panel button found in Activity Bar');
    } else {
      results.failed.push('❌ Git panel button not found');
    }
    
    // Check if panel can render
    const gitPanel = document.querySelector('.git-panel');
    if (gitPanel) {
      results.passed.push('✅ Git panel is rendered');
      
      // Check for key elements
      const commitSection = gitPanel.querySelector('.commit-section');
      if (commitSection) {
        results.passed.push('✅ Commit section found');
      }
      
      const branchInfo = gitPanel.querySelector('.branch-info');
      if (branchInfo) {
        results.passed.push('✅ Branch info section found');
      }
    }
  };

  // Test 5: Check IPC Handlers
  const testIPCHandlers = async () => {
    if (window.primus?.git) {
      results.passed.push('✅ Git IPC bridge available');
      
      // Check individual methods
      const methods = ['init', 'status', 'add', 'commit', 'push', 'pull'];
      methods.forEach(method => {
        if (typeof window.primus.git[method] === 'function') {
          results.passed.push(`✅ Git.${method} method available`);
        } else {
          results.failed.push(`❌ Git.${method} method missing`);
        }
      });
    } else {
      results.failed.push('❌ Git IPC bridge not available');
    }
  };

  // Run all tests
  await testGitService();
  await testGitStatus();
  await testGitBranches();
  testGitPanel();
  await testIPCHandlers();

  // Generate report
  console.log('\n📊 Git Integration Validation Results:');
  console.log('=====================================');
  
  console.log(`\n✅ Passed: ${results.passed.length}`);
  results.passed.forEach(msg => console.log(msg));
  
  if (results.warnings.length > 0) {
    console.log(`\n⚠️ Warnings: ${results.warnings.length}`);
    results.warnings.forEach(msg => console.log(msg));
  }
  
  if (results.failed.length > 0) {
    console.log(`\n❌ Failed: ${results.failed.length}`);
    results.failed.forEach(msg => console.log(msg));
  }
  
  const score = (results.passed.length / (results.passed.length + results.failed.length)) * 100;
  console.log(`\n📈 Score: ${score.toFixed(1)}%`);
  
  return results;
};

// Export for use in test runner
export default validateGitIntegration;