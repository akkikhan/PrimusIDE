#!/usr/bin/env node

/**
 * UI VALIDATION SCRIPT
 * Runs real-world tests on the running Primus IDE
 * Checks layout, buttons, and interactions
 */

const puppeteer = require('puppeteer');
const chalk = require('chalk');

// Test configuration
const APP_URL = 'http://localhost:3001';
const TESTS = [];

// Helper functions
const log = {
  info: (msg) => console.log(chalk.blue('ℹ'), msg),
  success: (msg) => console.log(chalk.green('✓'), msg),
  error: (msg) => console.log(chalk.red('✗'), msg),
  warn: (msg) => console.log(chalk.yellow('⚠'), msg)
};

// Test: Check main layout structure
TESTS.push({
  name: 'Main Layout Structure',
  async run(page) {
    // Check if main containers exist
    const hasApp = await page.$('.app') !== null;
    const hasMenuBar = await page.$('.menu-bar') !== null;
    const hasIdeLayout = await page.$('.ide-layout') !== null;
    const hasActivityBar = await page.$('.activity-bar') !== null;
    const hasSidebar = await page.$('.sidebar') !== null;
    const hasEditor = await page.$('.editor-container') !== null;
    const hasStatusBar = await page.$('.status-bar') !== null;
    
    const allPresent = hasApp && hasMenuBar && hasIdeLayout && 
                      hasActivityBar && hasSidebar && hasEditor && hasStatusBar;
    
    if (!allPresent) {
      throw new Error(`Missing layout components:
        App: ${hasApp}, MenuBar: ${hasMenuBar}, IdeLayout: ${hasIdeLayout},
        ActivityBar: ${hasActivityBar}, Sidebar: ${hasSidebar}, 
        Editor: ${hasEditor}, StatusBar: ${hasStatusBar}`);
    }
    
    // Check dimensions
    const dimensions = await page.evaluate(() => {
      const activityBar = document.querySelector('.activity-bar');
      const sidebar = document.querySelector('.sidebar');
      const statusBar = document.querySelector('.status-bar');
      
      return {
        activityBarWidth: activityBar ? activityBar.offsetWidth : 0,
        sidebarWidth: sidebar ? sidebar.offsetWidth : 0,
        statusBarHeight: statusBar ? statusBar.offsetHeight : 0
      };
    });
    
    if (dimensions.activityBarWidth !== 48) {
      throw new Error(`Activity bar width is ${dimensions.activityBarWidth}, expected 48`);
    }
    
    if (dimensions.sidebarWidth < 200 || dimensions.sidebarWidth > 400) {
      throw new Error(`Sidebar width is ${dimensions.sidebarWidth}, expected 200-400`);
    }
    
    if (dimensions.statusBarHeight !== 24) {
      throw new Error(`Status bar height is ${dimensions.statusBarHeight}, expected 24`);
    }
  }
});

// Test: Button interactions
TESTS.push({
  name: 'Button Interactions',
  async run(page) {
    // Find all buttons
    const buttons = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      return btns.map(btn => ({
        text: btn.textContent,
        disabled: btn.disabled,
        hasClickHandler: btn.onclick !== null || 
                        btn.hasAttribute('onclick') ||
                        getEventListeners(btn).click?.length > 0
      }));
    });
    
    if (buttons.length === 0) {
      throw new Error('No buttons found in the UI');
    }
    
    // Test menu bar buttons
    const menuButtons = await page.$$('.menu-bar button');
    if (menuButtons.length === 0) {
      throw new Error('No menu bar buttons found');
    }
    
    // Test hover states
    const firstButton = menuButtons[0];
    const originalBg = await firstButton.evaluate(el => 
      window.getComputedStyle(el).backgroundColor
    );
    
    await firstButton.hover();
    await page.waitForTimeout(300);
    
    const hoverBg = await firstButton.evaluate(el => 
      window.getComputedStyle(el).backgroundColor
    );
    
    if (originalBg === hoverBg) {
      log.warn('Button hover state may not be working');
    }
  }
});

// Test: Activity bar navigation
TESTS.push({
  name: 'Activity Bar Navigation',
  async run(page) {
    const activityItems = await page.$$('.activity-item');
    
    if (activityItems.length === 0) {
      throw new Error('No activity bar items found');
    }
    
    // Click each activity item and verify state change
    for (let i = 0; i < Math.min(activityItems.length, 3); i++) {
      const item = activityItems[i];
      
      await item.click();
      await page.waitForTimeout(200);
      
      const isActive = await item.evaluate(el => 
        el.classList.contains('active')
      );
      
      if (!isActive) {
        throw new Error(`Activity item ${i} did not become active after click`);
      }
    }
  }
});

// Test: Tab functionality
TESTS.push({
  name: 'Tab System',
  async run(page) {
    // Check if welcome screen or editor is visible
    const hasWelcome = await page.$('.welcome-message') !== null;
    const hasTabs = await page.$('.tab-bar') !== null;
    
    if (!hasWelcome && !hasTabs) {
      throw new Error('Neither welcome screen nor tab bar is visible');
    }
    
    if (hasTabs) {
      const tabs = await page.$$('.tab');
      
      if (tabs.length > 0) {
        // Test tab switching
        const firstTab = tabs[0];
        await firstTab.click();
        
        const isActive = await firstTab.evaluate(el => 
          el.classList.contains('active')
        );
        
        if (!isActive) {
          log.warn('Tab activation may not be working');
        }
        
        // Test close button visibility
        const closeBtn = await firstTab.$('.tab-close');
        if (!closeBtn) {
          throw new Error('Tab close button not found');
        }
      }
    }
  }
});

// Test: Panel visibility
TESTS.push({
  name: 'Panel System',
  async run(page) {
    // Test terminal toggle
    const terminalToggle = await page.evaluate(() => {
      const menuItems = Array.from(document.querySelectorAll('.menu-bar button'));
      return menuItems.find(btn => 
        btn.textContent.toLowerCase().includes('terminal')
      ) !== undefined;
    });
    
    if (!terminalToggle) {
      log.warn('Terminal toggle not found in menu');
    }
    
    // Check z-index hierarchy
    const zIndexes = await page.evaluate(() => {
      const elements = {
        menuBar: document.querySelector('.menu-bar'),
        statusBar: document.querySelector('.status-bar'),
        activityBar: document.querySelector('.activity-bar'),
        sidebar: document.querySelector('.sidebar')
      };
      
      const results = {};
      for (const [name, el] of Object.entries(elements)) {
        if (el) {
          results[name] = window.getComputedStyle(el).zIndex;
        }
      }
      return results;
    });
    
    // Verify z-index hierarchy
    if (zIndexes.menuBar && zIndexes.menuBar !== '100' && zIndexes.menuBar !== 'auto') {
      log.warn(`Menu bar z-index is ${zIndexes.menuBar}, expected 100`);
    }
  }
});

// Main test runner
async function runTests() {
  console.log(chalk.cyan('\n🧪 Starting UI Validation Tests\n'));
  
  let browser;
  try {
    // Launch browser
    browser = await puppeteer.launch({
      headless: false, // Set to true for CI
      defaultViewport: { width: 1280, height: 720 }
    });
    
    const page = await browser.newPage();
    
    // Navigate to app
    log.info(`Connecting to ${APP_URL}...`);
    await page.goto(APP_URL, { waitUntil: 'networkidle2' });
    
    // Wait for app to load
    await page.waitForSelector('.app, .welcome-message', { timeout: 5000 });
    
    // Run tests
    let passed = 0;
    let failed = 0;
    
    for (const test of TESTS) {
      try {
        await test.run(page);
        log.success(`${test.name}`);
        passed++;
      } catch (error) {
        log.error(`${test.name}: ${error.message}`);
        failed++;
      }
    }
    
    // Summary
    console.log(chalk.cyan('\n📊 Test Summary\n'));
    console.log(`  Passed: ${chalk.green(passed)}`);
    console.log(`  Failed: ${chalk.red(failed)}`);
    console.log(`  Total:  ${passed + failed}`);
    
    if (failed === 0) {
      console.log(chalk.green('\n✅ All UI validation tests passed!\n'));
    } else {
      console.log(chalk.red(`\n❌ ${failed} test(s) failed\n`));
      process.exit(1);
    }
    
  } catch (error) {
    log.error(`Test runner error: ${error.message}`);
    process.exit(1);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

// Check if puppeteer is installed
try {
  require.resolve('puppeteer');
  require.resolve('chalk');
} catch (e) {
  console.log('Installing test dependencies...');
  require('child_process').execSync('npm install --save-dev puppeteer chalk', {
    stdio: 'inherit'
  });
}

// Run tests
runTests();
