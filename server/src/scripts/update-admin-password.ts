import * as dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import { User } from '../models/user.model';

async function updateAdminPassword() {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      console.error('MONGODB_URI not set in environment');
      process.exit(1);
    }

    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');

    const adminEmail = 'admin@playwin.com';
    const newPasswordHash = '$2b$10$HLTKoQYBwpN3v9U7cG2zBeoVYryO4.JsfmRZXQ5TvKS4UDXmbtFPa';

    console.log(`🔐 Updating password for admin user: ${adminEmail}\n`);

    // Find the admin user
    const adminUser = await User.findOne({ email: adminEmail });
    
    if (!adminUser) {
      console.log(`❌ User with email ${adminEmail} not found in database`);
      console.log('\n📋 Available admin users:');
      const allAdmins = await User.find({ role: 'admin' }).select('email fullName createdAt');
      if (allAdmins.length === 0) {
        console.log('   No admin users found in database');
      } else {
        allAdmins.forEach((admin, index) => {
          console.log(`   ${index + 1}. ${admin.email} - ${admin.fullName} (Created: ${admin.createdAt.toLocaleDateString()})`);
        });
      }
      return;
    }

    console.log(`✅ Found admin user:`);
    console.log(`   Email: ${adminUser.email}`);
    console.log(`   Full Name: ${adminUser.fullName}`);
    console.log(`   Role: ${adminUser.role}`);
    console.log(`   Status: ${adminUser.status}`);
    console.log(`   Current Password Hash: ${adminUser.password.substring(0, 20)}...`);

    // Update the password
    adminUser.password = newPasswordHash;
    adminUser.mustChangePassword = false; // Set to false since we're setting a known password
    await adminUser.save();

    console.log(`\n✅ Password updated successfully!`);
    console.log(`   New Password Hash: ${adminUser.password.substring(0, 20)}...`);
    console.log(`   Must Change Password: ${adminUser.mustChangePassword}`);
    console.log(`   Updated At: ${adminUser.updatedAt.toLocaleString()}`);

    console.log(`\n🔑 Login Credentials:`);
    console.log(`   Email: ${adminEmail}`);
    console.log(`   Password: admin123`);
    console.log(`   Role: ${adminUser.role}`);

    console.log(`\n📝 Next Steps:`);
    console.log(`   1. Try logging in with the new credentials`);
    console.log(`   2. The password is now set to 'admin123'`);
    console.log(`   3. You can change it later through the admin interface`);

  } catch (error) {
    console.error('❌ Error updating admin password:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
}

updateAdminPassword(); 