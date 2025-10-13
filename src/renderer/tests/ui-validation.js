
// UI Layout Validation Test Suite
// Tests all UI fixes systematically

const validateUIFixes = () => {
  console.log('🔍 Starting UI Validation Tests...\n');
  
  const results = {
    passed: [],
    failed: [],
    warnings: []
  };

  // Test 1: Check main layout structure
  const testLayout = () => {
    const layout = document.querySelector('.ide-layout');
    if (layout) {
      const styles = window.getComputedStyle(layout);
      if (styles.display === 'grid') {
        results.passed.push('✅ Main layout grid structure');
      } else {
        results.failed.push('❌ Main layout not using grid');
      }
    } else {
      results.failed.push('❌ .ide-layout element not found');
    }
  };

  // Test 2: Check sidebar constraints
  const testSidebar = () => {
    const sidebar = document.querySelector('.sidebar');
    if (sidebar) {
      const styles = window.getComputedStyle(sidebar);
      const width = parseInt(styles.width);
      if (width >= 180 && width <= 400) {
        results.passed.push('✅ Sidebar width constraints');
      } else {
        results.failed.push(`❌ Sidebar width out of range: ${width}px`);
      }
    } else {
      results.warnings.push('⚠️ Sidebar not visible');
    }
  };

  // Test 3: Check z-index hierarchy
  const testZIndex = () => {
    const elements = [
      { selector: '.activity-bar', expectedZ: 100 },
      { selector: '.sidebar', expectedZ: 90 },
      { selector: '.terminal-panel', expectedZ: 200 },
      { selector: '.command-palette', expectedZ: 300 }
    ];

    elements.forEach(({ selector, expectedZ }) => {
      const el = document.querySelector(selector);
      if (el) {
        const z = parseInt(window.getComputedStyle(el).zIndex) || 0;
        if (Math.abs(z - expectedZ) < 50) {
          results.passed.push(`✅ ${selector} z-index correct`);
        } else {
          results.warnings.push(`⚠️ ${selector} z-index: ${z} (expected ~${expectedZ})`);
        }
      }
    });
  };

  // Test 4: Check button styles
  const testButtons = () => {
    const buttons = document.querySelectorAll('button');
    if (buttons.length > 0) {
      const firstButton = buttons[0];
      const styles = window.getComputedStyle(firstButton);
      
      if (styles.cursor === 'pointer' && styles.transition !== 'none') {
        results.passed.push('✅ Button styles applied');
      } else {
        results.failed.push('❌ Button styles incomplete');
      }
    } else {
      results.warnings.push('⚠️ No buttons found to test');
    }
  };

  // Test 5: Check tab bar
  const testTabBar = () => {
    const tabBar = document.querySelector('.tab-bar');
    if (tabBar) {
      const styles = window.getComputedStyle(tabBar);
      if (styles.display === 'flex' && styles.overflow === 'hidden') {
        results.passed.push('✅ Tab bar layout correct');
      } else {
        results.failed.push('❌ Tab bar layout issues');
      }
    } else {
      results.warnings.push('⚠️ Tab bar not found');
    }
  };

  // Run all tests
  try {
    testLayout();
    testSidebar();
    testZIndex();
    testButtons();
    testTabBar();
  } catch (error) {
    results.failed.push(`❌ Test error: ${error.message}`);
  }

  // Generate report
  console.log('📊 UI VALIDATION RESULTS:');
  console.log('=========================\n');
  
  console.log(`✅ Passed: ${results.passed.length}`);
  results.passed.forEach(msg => console.log(`  ${msg}`));
  
  console.log(`\n❌ Failed: ${results.failed.length}`);
  results.failed.forEach(msg => console.log(`  ${msg}`));
  
  console.log(`\n⚠️ Warnings: ${results.warnings.length}`);
  results.warnings.forEach(msg => console.log(`  ${msg}`));
  
  const score = (results.passed.length / (results.passed.length + results.failed.length)) * 100;
  console.log(`\n📈 Overall Score: ${score.toFixed(1)}%`);
  
  return results;
};

// Auto-run on page load
if (typeof window !== 'undefined') {
  window.validateUI = validateUIFixes;
  
  // Run after DOM loads
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      setTimeout(validateUIFixes, 1000);
    });
  } else {
    setTimeout(validateUIFixes, 1000);
  }
}

export default validateUIFixes;
