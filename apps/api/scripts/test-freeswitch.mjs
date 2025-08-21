#!/usr/bin/env node

import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';

const execAsync = promisify(exec);

async function testFreeSWITCH() {
  console.log('🔍 Testing FreeSWITCH connectivity...\n');
  
  // Test 1: Check if FreeSWITCH is running
  console.log('1️⃣ Checking if FreeSWITCH service is running...');
  try {
    const { stdout } = await execAsync('systemctl is-active freeswitch');
    if (stdout.trim() === 'active') {
      console.log('✅ FreeSWITCH service is running');
    } else {
      console.log('⚠️ FreeSWITCH service is not active:', stdout.trim());
    }
  } catch (error) {
    console.log('❌ Failed to check FreeSWITCH service status');
  }
  
  // Test 2: Check if fs_cli is available
  console.log('\n2️⃣ Checking if fs_cli is available...');
  try {
    const { stdout } = await execAsync('which fs_cli');
    console.log('✅ fs_cli found at:', stdout.trim());
  } catch (error) {
    console.log('❌ fs_cli not found in PATH');
  }
  
  // Test 3: Check FreeSWITCH configuration directory
  console.log('\n3️⃣ Checking FreeSWITCH configuration directory...');
  const fsBase = process.env.ENGINE_FS_BASE_DIR || '/usr/local/freeswitch/conf';
  try {
    const stats = await fs.stat(fsBase);
    if (stats.isDirectory()) {
      console.log('✅ FreeSWITCH config directory exists:', fsBase);
      
      // Check subdirectories
      const subdirs = ['dialplan', 'sip_profiles', 'directory'];
      for (const subdir of subdirs) {
        const subdirPath = path.join(fsBase, subdir);
        try {
          const subdirStats = await fs.stat(subdirPath);
          if (subdirStats.isDirectory()) {
            console.log(`   ✅ ${subdir}/ directory exists`);
          } else {
            console.log(`   ⚠️ ${subdir}/ is not a directory`);
          }
        } catch (error) {
          console.log(`   ❌ ${subdir}/ directory not accessible`);
        }
      }
    } else {
      console.log('⚠️ FreeSWITCH config path is not a directory:', fsBase);
    }
  } catch (error) {
    console.log('❌ FreeSWITCH config directory not accessible:', fsBase);
  }
  
  // Test 4: Check audio directory
  console.log('\n4️⃣ Checking audio directory...');
  const audioBase = process.env.ENGINE_AUDIO_DIR || '/var/lib/freeswitch/storage/tenant';
  try {
    const stats = await fs.stat(audioBase);
    if (stats.isDirectory()) {
      console.log('✅ Audio directory exists:', audioBase);
    } else {
      console.log('⚠️ Audio path is not a directory:', audioBase);
    }
  } catch (error) {
    console.log('❌ Audio directory not accessible:', audioBase);
  }
  
  // Test 5: Check if we can write to config directory
  console.log('\n5️⃣ Testing write permissions...');
  try {
    const testFile = path.join(fsBase, 'test_write_permission.tmp');
    await fs.writeFile(testFile, 'test');
    await fs.unlink(testFile);
    console.log('✅ Write permissions OK');
  } catch (error) {
    console.log('❌ No write permissions to config directory');
  }
  
  // Test 6: Check environment variables
  console.log('\n6️⃣ Checking environment variables...');
  const envVars = {
    'ENGINE_FS_BASE_DIR': process.env.ENGINE_FS_BASE_DIR || '/usr/local/freeswitch/conf',
    'ENGINE_AUDIO_DIR': process.env.ENGINE_AUDIO_DIR || '/var/lib/freeswitch/storage/tenant',
    'ENGINE_ESL_HOST': process.env.ENGINE_ESL_HOST || '127.0.0.1',
    'ENGINE_ESL_PORT': process.env.ENGINE_ESL_PORT || '8021',
    'ENGINE_RELOAD_DIALPLAN': process.env.ENGINE_RELOAD_DIALPLAN || 'true'
  };
  
  for (const [key, value] of Object.entries(envVars)) {
    console.log(`   ${key}: ${value}`);
  }
  
  console.log('\n🎯 Recommendations:');
  console.log('• If ESL is failing, set ENGINE_RELOAD_DIALPLAN=false');
  console.log('• Check FreeSWITCH service status: systemctl status freeswitch');
  console.log('• Check FreeSWITCH logs: journalctl -u freeswitch -f');
  console.log('• Test fs_cli manually: fs_cli -H 127.0.0.1 -P 8021 -p ClueCon');
}

testFreeSWITCH().catch(console.error);
