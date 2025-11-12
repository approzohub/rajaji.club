import bcrypt from 'bcryptjs';

async function generateAdmin123Hash() {
  try {
    const password = 'admin123';
    const saltRounds = 10; // Same as used in the application
    
    console.log('🔐 Generating bcrypt hash for "admin123"...\n');
    
    // Generate hash
    const hash = await bcrypt.hash(password, saltRounds);
    
    console.log('📋 Hash Details:');
    console.log(`   Password: ${password}`);
    console.log(`   Salt Rounds: ${saltRounds}`);
    console.log(`   Hash Algorithm: bcrypt`);
    console.log(`   Hash Length: ${hash.length} characters`);
    
    console.log('\n🔑 Generated Hash:');
    console.log(hash);
    
    // Verify the hash works
    const isValid = await bcrypt.compare(password, hash);
    console.log(`\n✅ Hash Verification: ${isValid ? 'PASSED' : 'FAILED'}`);
    
    // Test with different password
    const isInvalid = await bcrypt.compare('wrongpassword', hash);
    console.log(`❌ Wrong Password Test: ${!isInvalid ? 'PASSED' : 'FAILED'}`);
    
    console.log('\n📝 Usage in Database:');
    console.log('You can use this hash directly in your database for admin users.');
    console.log('Example MongoDB document:');
    console.log('{');
    console.log('  "email": "admin@example.com",');
    console.log('  "password": "' + hash + '",');
    console.log('  "role": "admin",');
    console.log('  "status": "active"');
    console.log('}');
    
  } catch (error) {
    console.error('❌ Error generating hash:', error);
  }
}

generateAdmin123Hash(); 