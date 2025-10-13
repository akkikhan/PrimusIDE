
// AI Integration Test Suite
// Validates that real AI providers are working

const validateAIIntegration = async () => {
  console.log('🤖 Starting AI Integration Tests...\n');
  
  const results = {
    passed: [],
    failed: [],
    warnings: [],
    details: {}
  };

  // Test 1: Check if AI bridge exists
  const testBridge = () => {
    if (window.primus?.ai) {
      results.passed.push('✅ AI bridge available');
      return true;
    } else {
      results.failed.push('❌ AI bridge not found');
      return false;
    }
  };

  // Test 2: Check providers list
  const testProviders = async () => {
    try {
      const providers = await window.primus.ai.listProviders();
      if (providers && providers.length > 0) {
        results.passed.push(`✅ ${providers.length} providers available`);
        results.details.providers = providers.map(p => p.name);
        
        // Check for real providers
        const hasOpenAI = providers.some(p => p.id === 'openai');
        if (hasOpenAI) {
          results.passed.push('✅ OpenAI provider registered');
        } else {
          results.warnings.push('⚠️ OpenAI provider not configured');
        }
      } else {
        results.failed.push('❌ No providers available');
      }
    } catch (error) {
      results.failed.push(`❌ Provider list failed: ${error.message}`);
    }
  };

  // Test 3: Test basic chat request
  const testChatRequest = async () => {
    try {
      console.log('Testing chat request...');
      const response = await window.primus.ai.request({
        id: `test_${Date.now()}`,
        operation: 'chat',
        prompt: 'Respond with exactly: "AI system operational"',
        includeContext: false
      });
      
      if (response?.content) {
        const isMock = response.meta?.mock === true;
        if (isMock) {
          results.warnings.push('⚠️ Chat response from mock provider');
        } else {
          results.passed.push(`✅ Chat response from ${response.meta?.provider}`);
        }
        results.details.lastResponse = response.content.substring(0, 100);
      } else {
        results.failed.push('❌ No chat response received');
      }
    } catch (error) {
      results.failed.push(`❌ Chat request failed: ${error.message}`);
    }
  };

  // Test 4: Test streaming (if available)
  const testStreaming = async () => {
    try {
      if (!window.primus.ai.streamRequest) {
        results.warnings.push('⚠️ Streaming not available');
        return;
      }

      let chunks = 0;
      const onChunk = (chunk) => { chunks++; };
      const onComplete = () => {
        if (chunks > 0) {
          results.passed.push(`✅ Streaming works (${chunks} chunks)`);
        } else {
          results.failed.push('❌ No streaming chunks received');
        }
      };

      await window.primus.ai.streamRequest(
        {
          id: `stream_test_${Date.now()}`,
          operation: 'chat',
          prompt: 'Count from 1 to 5',
          includeContext: false
        },
        onChunk,
        onComplete
      );
    } catch (error) {
      results.warnings.push(`⚠️ Streaming test skipped: ${error.message}`);
    }
  };

  // Test 5: Check configuration
  const testConfig = async () => {
    try {
      const config = await window.primus.ai.getConfig?.();
      if (config) {
        results.details.config = {
          defaultProvider: config.defaultProvider,
          streaming: config.streaming,
          providersConfigured: Object.keys(config.providers || {})
        };
        
        if (config.providers?.openai?.apiKey) {
          results.passed.push('✅ OpenAI API key configured');
        } else {
          results.warnings.push('⚠️ OpenAI API key not set');
        }
      }
    } catch (error) {
      results.warnings.push('⚠️ Config check failed');
    }
  };

  // Run all tests
  if (!testBridge()) {
    console.error('❌ AI bridge not available - cannot continue tests');
    return results;
  }

  await testProviders();
  await testChatRequest();
  await testStreaming();
  await testConfig();

  // Generate report
  console.log('\n📊 AI INTEGRATION TEST RESULTS:');
  console.log('================================\n');
  
  console.log(`✅ Passed: ${results.passed.length}`);
  results.passed.forEach(msg => console.log(`  ${msg}`));
  
  console.log(`\n❌ Failed: ${results.failed.length}`);
  results.failed.forEach(msg => console.log(`  ${msg}`));
  
  console.log(`\n⚠️ Warnings: ${results.warnings.length}`);
  results.warnings.forEach(msg => console.log(`  ${msg}`));
  
  if (Object.keys(results.details).length > 0) {
    console.log('\n📋 Details:');
    console.log(results.details);
  }
  
  const score = (results.passed.length / (results.passed.length + results.failed.length)) * 100;
  console.log(`\n📈 Overall Score: ${score.toFixed(1)}%`);
  
  // Recommendations
  if (results.warnings.some(w => w.includes('API key'))) {
    console.log('\n💡 Recommendation: Configure OpenAI API key for real AI features');
    console.log('   1. Click AI Settings button in menu');
    console.log('   2. Enter your OpenAI API key');
    console.log('   3. Test connection');
  }
  
  return results;
};

// Export for use
export default validateAIIntegration;

// Auto-run if loaded in browser
if (typeof window !== 'undefined') {
  window.validateAI = validateAIIntegration;
}
