#!/usr/bin/env node

import fs from 'fs/promises';
import path from 'path';
import Handlebars from 'handlebars';

async function testInboundCreation() {
  console.log('🔍 Testing inbound creation process...\n');
  
  // Test configuration
  const fsBase = process.env.ENGINE_FS_BASE_DIR || '/usr/local/freeswitch/conf';
  const orgId = 'test-org-123';
  const inbound = {
    name: 'test-inbound',
    didOrUri: '+5511999999999',
    context: 'public',
    priority: 100,
    enabled: true,
    callerIdNumber: '+5511888888888',
    networkAddr: '192.168.1.0/24',
    targetFlowId: 'flow-123'
  };
  
  console.log('1️⃣ Test configuration:');
  console.log(`   Organization ID: ${orgId}`);
  console.log(`   Inbound: ${inbound.name}`);
  console.log(`   DID/URI: ${inbound.didOrUri}`);
  console.log(`   Context: ${inbound.context}`);
  console.log(`   Priority: ${inbound.priority}`);
  console.log(`   Target Flow: ${inbound.targetFlowId}`);
  
  // Test 1: Check if template exists
  console.log('\n2️⃣ Checking template file...');
  const templatePath = path.join(process.cwd(), '..', '..', 'infra', 'engine', 'templates', 'dialplan', 'inbound_entry.xml.hbs');
  try {
    const templateContent = await fs.readFile(templatePath, 'utf8');
    console.log('✅ Template file exists and is readable');
    console.log(`   Path: ${templatePath}`);
    console.log(`   Size: ${templateContent.length} characters`);
  } catch (error) {
    console.log('❌ Template file not accessible:', error.message);
    return;
  }
  
  // Test 2: Test template rendering
  console.log('\n3️⃣ Testing template rendering...');
  try {
    const templateContent = await fs.readFile(templatePath, 'utf8');
    const template = Handlebars.compile(templateContent);
    const renderedXml = template({
      inbound,
      organizationId: orgId
    });
    
    console.log('✅ Template rendered successfully');
    console.log('   Rendered XML:');
    console.log('   ' + renderedXml.split('\n').join('\n   '));
  } catch (error) {
    console.log('❌ Template rendering failed:', error.message);
    return;
  }
  
  // Test 3: Check dialplan directory
  console.log('\n4️⃣ Checking dialplan directory...');
  const dialplanDir = path.join(fsBase, 'dialplan', inbound.context);
  try {
    const stats = await fs.stat(dialplanDir);
    if (stats.isDirectory()) {
      console.log('✅ Dialplan directory exists:', dialplanDir);
    } else {
      console.log('⚠️ Dialplan path is not a directory:', dialplanDir);
    }
  } catch (error) {
    console.log('❌ Dialplan directory not accessible:', dialplanDir);
    console.log('   Error:', error.message);
  }
  
  // Test 4: Test file creation
  console.log('\n5️⃣ Testing file creation...');
  try {
    const dialplanDir = path.join(fsBase, 'dialplan', inbound.context);
    await fs.mkdir(dialplanDir, { recursive: true });
    
    const templateContent = await fs.readFile(templatePath, 'utf8');
    const template = Handlebars.compile(templateContent);
    const renderedXml = template({
      inbound,
      organizationId: orgId
    });
    
    const inboundFile = path.join(dialplanDir, `${orgId}_${String(inbound.priority).padStart(3, '0')}_${inbound.name}.xml`);
    await fs.writeFile(inboundFile, renderedXml, 'utf8');
    
    console.log('✅ Inbound file created successfully');
    console.log(`   File: ${inboundFile}`);
    
    // Verify file was created
    const fileStats = await fs.stat(inboundFile);
    console.log(`   File size: ${fileStats.size} bytes`);
    console.log(`   Created: ${fileStats.birthtime}`);
    
    // Clean up test file
    await fs.unlink(inboundFile);
    console.log('   Test file cleaned up');
    
  } catch (error) {
    console.log('❌ File creation failed:', error.message);
    return;
  }
  
  // Test 5: Check current inbound files
  console.log('\n6️⃣ Checking existing inbound files...');
  try {
    const dialplanDir = path.join(fsBase, 'dialplan', inbound.context);
    const files = await fs.readdir(dialplanDir);
    const inboundFiles = files.filter(f => f.endsWith('.xml'));
    
    if (inboundFiles.length > 0) {
      console.log(`✅ Found ${inboundFiles.length} XML files in dialplan/${inbound.context}/`);
      inboundFiles.forEach(file => {
        console.log(`   - ${file}`);
      });
    } else {
      console.log(`⚠️ No XML files found in dialplan/${inbound.context}/`);
    }
  } catch (error) {
    console.log('❌ Failed to read dialplan directory:', error.message);
  }
  
  console.log('\n🎯 Summary:');
  console.log('• Template rendering: ✅ Working');
  console.log('• File creation: ✅ Working');
  console.log('• Directory access: ✅ Working');
  console.log('\n💡 If inbounds are not working, check:');
  console.log('1. API logs for errors');
  console.log('2. FreeSWITCH configuration');
  console.log('3. Template syntax');
  console.log('4. File permissions');
}

testInboundCreation().catch(console.error);
