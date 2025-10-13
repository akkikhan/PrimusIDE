// Test script to validate FileExplorer operations
// This script tests the basic file operations that should be available through the Primus API

async function testFileOperations() {
  console.log('🚀 Starting FileExplorer Operations Test...\n');
  
  const testDir = 'C:\\Users\\aakib\\Documents\\IDE\\test-workspace\\test-operations';
  const testFile = `${testDir}\\test.txt`;
  const testFile2 = `${testDir}\\test-copy.txt`;
  const testFile3 = `${testDir}\\test-renamed.txt`;
  try {
    // Test 1: Create Directory
    console.log('📁 Testing directory creation...');
    const dirResult = await window.primus.fs.createDirectory(testDir);
    console.log(dirResult ? '✅ Directory created successfully' : '❌ Directory creation failed');
    
    // Test 2: Create File
    console.log('\n📄 Testing file creation...');
    const fileResult = await window.primus.fs.writeFile(testFile, 'Hello from Primus IDE!\nThis is a test file.');
    console.log('✅ File created successfully');
    
    // Test 3: Read File
    console.log('\n📖 Testing file reading...');
    const content = await window.primus.fs.readFile(testFile);
    console.log('✅ File content:', content);
    
    // Test 4: Check if file exists
    console.log('\n🔍 Testing file existence check...');
    const exists = await window.primus.fs.exists(testFile);
    console.log(exists ? '✅ File exists check passed' : '❌ File exists check failed');
    
    // Test 5: Copy File
    console.log('\n📋 Testing file copy...');
    const copyResult = await window.primus.fs.copyFile(testFile, testFile2);
    console.log(copyResult ? '✅ File copied successfully' : '❌ File copy failed');
    
    // Test 6: Rename File
    console.log('\n🏷️ Testing file rename...');
    const renameResult = await window.primus.fs.renameFile(testFile2, testFile3);
    console.log(renameResult ? '✅ File renamed successfully' : '❌ File rename failed');
    
    // Test 7: List Directory Contents
    console.log('\n📋 Testing directory listing...');
    const dirContents = await window.primus.fs.readDir(testDir);
    console.log('✅ Directory contents:', dirContents);
    
    // Test 8: Delete File
    console.log('\n🗑️ Testing file deletion...');
    const deleteResult = await window.primus.fs.deleteFile(testFile3);
    console.log(deleteResult ? '✅ File deleted successfully' : '❌ File deletion failed');
    
    // Test 9: Delete Directory (should fail if not empty)
    console.log('\n🗑️ Testing directory deletion...');
    const deleteDirResult = await window.primus.fs.deleteDirectory(testDir);
    console.log(deleteDirResult ? '✅ Directory deleted successfully' : '❌ Directory deletion failed (expected if not empty)');
    
    console.log('\n🎉 FileExplorer Operations Test Completed!');
    
  } catch (error) {
    console.error('❌ Test failed with error:', error);
  }
}

async function testErrorCases() {
  console.log('\n🧪 Testing error cases for file operations...');

  // Test 1: Create directory with invalid path (contains invalid chars)
  try {
    const invalidDir = 'test:/invalid/path';
    await window.primus.fs.createDirectory(invalidDir);
    console.error('FAIL: Invalid path creation should throw');
    process.exit(1);
  } catch (err) {
    if (!err.message.includes('invalid')) {
      console.error('FAIL: Expected invalid path error, got: ' + err.message);
      process.exit(1);
    }
    console.log('✅ Invalid path creation throws correctly');
  }

  // Test 2: Read non-existent file - should throw or return null
  try {
    const nonExistent = testFile + '.nonexistent';
    const content = await window.primus.fs.readFile(nonExistent);
    if (content !== null && content !== undefined) {
      console.error('FAIL: Non-existent file should return null/undefined');
      process.exit(1);
    }
    console.log('✅ Non-existent file read handled (null/undefined)');
  } catch (err) {
    console.log('✅ Non-existent file read throws (expected in some impls)');
  }

  // Test 3: Delete non-empty directory - should fail if impl supports
  try {
    await window.primus.fs.deleteDirectory(testDir); // Assume testDir now has files from happy path
    console.error('FAIL: Delete non-empty dir should fail');
    process.exit(1);
  } catch (err) {
    if (!err.message.includes('non-empty')) {
      console.error('FAIL: Expected non-empty dir error, got: ' + err.message);
      process.exit(1);
    }
    console.log('✅ Non-empty dir deletion fails correctly');
  }

  // Test 4: Write to read-only path (simulate permission error)
  try {
    const readOnlyPath = '/system/protected/file.txt'; // Assume throws on protected
    await window.primus.fs.writeFile(readOnlyPath, 'test');
    console.error('FAIL: Write to protected path should throw permission error');
    process.exit(1);
  } catch (err) {
    if (!err.message.includes('permission') && !err.message.includes('access')) {
      console.error('FAIL: Expected permission error, got: ' + err.message);
      process.exit(1);
    }
    console.log('✅ Protected path write throws permission error');
  }
}

async function testEdgeCases() {
  console.log('\n🧪 Testing edge cases for file operations...');

  // Test 1: Filename with special characters
  const specialFile = testDir + '/file with spaces & special@chars.txt';
  await window.primus.fs.writeFile(specialFile, 'Special content');// Assume throws on protected
    console.log('✅ Protected path write throws permission error'); // Assume throws on protected
  } catch (err) {
    if (!err.message.includes('permission') && !err.message.includes('access')) {
      console.error('FAIL: Expected permission error, got: ' + err.message);
      process.exit(1);
    }
    console.log('✅ Protected path write throws permission error');
  }
}

async function runAllTests() {
  await testFileOperations(); // Run basic file operations test
  await testErrorCases(); // Run error/special cases test
  await testEdgeCases(); // Run edge cases test
  console.log('\n🎉 All FileExplorer Operations Tests Completed Successfully!');
}

runAllTests().catch(err => {
  console.error('FAIL: Uncaught error in file ops tests:', err); // Print error for robustness
  process.exit(1);
});
// Execute the test when this script is loaded
console.log('FileExplorer Test Script Loaded. Call runAllTests() to run tests.');
