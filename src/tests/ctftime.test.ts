/**
 * CTFtime API Test/Demo Script
 *
 * This script demonstrates the CTFtime service functions by making real API calls
 * and displaying the parsed output. This is not a unit test framework, but rather
 * a demonstration tool to verify API connectivity and data parsing.
 *
 * Run with: npm test
 */

import ctftimeService from '../services/ctftime.service';
import logger from '../utils/logger';

/**
 * Test CTFtime API connection and data parsing
 */
export async function runTests() {
  console.log('='.repeat(70));
  console.log();
  console.log('CTFtime API Connection & Parsing Tests');
  console.log();
  console.log('='.repeat(70));

  // Test 1: Get upcoming CTFs
  console.log('\n[TEST 1] Fetching upcoming CTFs (first page, 3 results)...\n');
  try {
    const testStartTime = Date.now();
    const upcomingResult = await ctftimeService.getUpcomingCTF(0, 3);
    const testEndTime = Date.now();

    console.log(`⏱️  Test elapsed time: ${testEndTime - testStartTime}ms\n`);

    if (upcomingResult) {
      console.log('✅ Successfully fetched upcoming CTFs');
      console.log(`Total pages: ${upcomingResult.totalPages}`);
      console.log(`\nTitle: ${upcomingResult.embed.title}`);
      console.log(`Footer: ${upcomingResult.embed.footer || 'None'}`);
      console.log(`\nCTFs found: ${upcomingResult.embed.fields.length}`);

      upcomingResult.embed.fields.forEach((field, index) => {
        console.log(`\n  [${index + 1}] ${field.name}`);
        console.log(`      ${field.value.split('\n')[0]}`); // Show CTFtime URL
      });
    } else {
      console.log('❌ Failed to fetch upcoming CTFs');
    }
  } catch (error) {
    console.log('❌ Error fetching upcoming CTFs:', error);
  }

  // Test 2: Get ongoing CTFs
  console.log('\n' + '-'.repeat(70));
  console.log('[TEST 2] Fetching ongoing CTFs...\n');
  try {
    const testStartTime = Date.now();
    const ongoingResult = await ctftimeService.getOngoingCTF(true);
    const testEndTime = Date.now();

    console.log(`⏱️  Test elapsed time: ${testEndTime - testStartTime}ms\n`);

    if (ongoingResult) {
      console.log('✅ Successfully fetched ongoing CTFs');
      console.log(`\nTitle: ${ongoingResult.embed.title}`);
      console.log(`Footer: ${ongoingResult.embed.footer || 'None'}`);
      console.log(`\nCTFs found: ${ongoingResult.embed.fields.length}`);

      if (ongoingResult.embed.fields.length > 0) {
        ongoingResult.embed.fields.forEach((field, index) => {
          console.log(`\n  [${index + 1}] ${field.name}`);
          console.log(`      ${field.value.split('\n')[0]}`); // Show CTFtime URL
        });
      } else {
        console.log('  No ongoing CTFs at this time');
      }
    } else {
      console.log('❌ Failed to fetch ongoing CTFs');
    }
  } catch (error) {
    console.log('❌ Error fetching ongoing CTFs:', error);
  }

  // Test 3: Get ongoing CTFs (including long events)
  console.log('\n' + '-'.repeat(70));
  console.log('[TEST 3] Fetching ongoing CTFs (including long events >5 days)...\n');
  try {
    const testStartTime = Date.now();
    const ongoingAllResult = await ctftimeService.getOngoingCTF(false);
    const testEndTime = Date.now();

    console.log(`⏱️  Test elapsed time: ${testEndTime - testStartTime}ms\n`);

    if (ongoingAllResult) {
      console.log('✅ Successfully fetched all ongoing CTFs');
      console.log(`\nTitle: ${ongoingAllResult.embed.title}`);
      console.log(`Footer: ${ongoingAllResult.embed.footer || 'None'}`);
      console.log(`\nCTFs found: ${ongoingAllResult.embed.fields.length}`);

      if (ongoingAllResult.embed.fields.length > 0) {
        ongoingAllResult.embed.fields.forEach((field, index) => {
          console.log(`\n  [${index + 1}] ${field.name}`);
          const hasWarning = field.value.includes('⏰');
          console.log(`      ${field.value.split('\n')[0]} ${hasWarning ? '(Long event)' : ''}`);
        });
      }
    } else {
      console.log('❌ Failed to fetch all ongoing CTFs');
    }
  } catch (error) {
    console.log('❌ Error fetching all ongoing CTFs:', error);
  }

  // Test 4: Find CTF by name
  console.log('\n' + '-'.repeat(70));
  console.log('[TEST 4] Searching for CTF by name (keyword: "Google")...\n');
  try {
    const testStartTime = Date.now();
    const ctfId = await ctftimeService.findCTF('Google');
    const testEndTime = Date.now();

    console.log(`⏱️  Test elapsed time: ${testEndTime - testStartTime}ms\n`);

    if (ctfId > 0) {
      console.log(`✅ Found CTF with ID: ${ctfId}`);
      console.log(`   CTFtime URL: https://ctftime.org/event/${ctfId}`);
    } else {
      console.log('❌ No CTF found with that name (or search failed)');
    }
  } catch (error) {
    console.log('❌ Error searching for CTF:', error);
  }

  // Test 5: Get specific CTF details
  console.log('\n' + '-'.repeat(70));
  console.log('[TEST 5] Fetching specific CTF details (ID: 2214)...\n');
  try {
    const testStartTime = Date.now();
    const ctfDetails = await ctftimeService.getCTF(2214);
    const testEndTime = Date.now();

    console.log(`⏱️  Test elapsed time: ${testEndTime - testStartTime}ms\n`);

    if (ctfDetails && typeof ctfDetails === 'object' && 'title' in ctfDetails) {
      console.log('✅ Successfully fetched CTF details');
      console.log(`\nTitle: ${ctfDetails.title}`);
      console.log(`URL: ${ctfDetails.description}`);
      console.log(`Color: #${ctfDetails.color.toString(16).padStart(6, '0')}`);
      console.log(`Thumbnail: ${ctfDetails.thumbnail || 'None'}`);
      console.log(`Footer: ${ctfDetails.footer || 'None'}`);
      console.log(`\nFields:`);

      ctfDetails.fields.forEach((field) => {
        console.log(`  - ${field.name}:`);
        const lines = field.value.split('\n');
        lines.forEach((line) => {
          console.log(`    ${line}`);
        });
      });
    } else {
      console.log('❌ Failed to fetch CTF details (CTF not found or invalid ID)');
    }
  } catch (error) {
    console.log('❌ Error fetching CTF details:', error);
  }

  // Test 6: Get CTF details with login info (for registration)
  console.log('\n' + '-'.repeat(70));
  console.log('[TEST 6] Fetching CTF details with login info (creating mode)...\n');
  try {
    const testStartTime = Date.now();
    const ctfInfo = await ctftimeService.getCTF(2214, true, 'testuser', 'testpass123');
    const testEndTime = Date.now();

    console.log(`⏱️  Test elapsed time: ${testEndTime - testStartTime}ms\n`);

    if (ctfInfo && typeof ctfInfo === 'object' && 'title' in ctfInfo) {
      console.log('✅ Successfully fetched CTF info for registration');
      console.log(`\nTitle: ${ctfInfo.title}`);
      console.log(`Start Time (Unix): ${ctfInfo.startTime}`);
      console.log(`End Time (Unix): ${ctfInfo.endTime}`);
      console.log(`\nEmbed Data:`);
      console.log(`  Title: ${ctfInfo.embedData.title}`);
      console.log(`  Fields: ${ctfInfo.embedData.fields.length}`);

      // Show login field
      const loginField = ctfInfo.embedData.fields.find((f) => f.name === 'Login');
      if (loginField) {
        console.log(`\n  Login Info:`);
        console.log(`    ${loginField.value}`);
      }
    } else {
      console.log('❌ Failed to fetch CTF info for registration');
    }
  } catch (error) {
    console.log('❌ Error fetching CTF info for registration:', error);
  }

  // Test 7: Get CTF list (requires database)
  console.log('\n' + '-'.repeat(70));
  console.log('[TEST 7] Fetching CTF list from database...\n');
  try {
    const testStartTime = Date.now();
    const listResult = await ctftimeService.getListCTF('Mới nhất', 0, 5);
    const testEndTime = Date.now();

    console.log(`⏱️  Test elapsed time: ${testEndTime - testStartTime}ms\n`);

    if (listResult) {
      console.log('✅ Successfully fetched CTF list');
      console.log(`Total pages: ${listResult.totalPages}`);
      console.log(`\nTitle: ${listResult.embed.title}`);
      console.log(`CTFs in database: ${listResult.embed.fields.length}`);

      if (listResult.embed.fields.length > 0) {
        listResult.embed.fields.forEach((field, index) => {
          console.log(`\n  [${index + 1}] ${field.name}`);
          console.log(`      ${field.value}`);
        });
      } else {
        console.log('  No CTFs in database yet');
      }
    } else {
      console.log('❌ Failed to fetch CTF list (database might be empty)');
    }
  } catch (error) {
    console.log('❌ Error fetching CTF list:', error);
  }

  console.log('\n' + '='.repeat(70));
  console.log('All tests completed!');
  console.log('='.repeat(70) + '\n');
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runTests()
    .then(() => {
      logger.info('CTFtime tests completed');
    })
    .catch((error) => {
      logger.error('Test execution failed:', error);
      process.exitCode = 1;
    });
}
