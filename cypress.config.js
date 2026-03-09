require('dotenv').config(); // Make sure to add this at the top!
const { defineConfig } = require('cypress');
const { createClient } = require('@supabase/supabase-js');

// ⚠️ Use process.env in Node.js, even if the variables start with VITE_
const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.VITE_SUPABASE_SERVICE_KEY;

// Fail early if the keys are missing so you don't get confusing Supabase errors
if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error("Missing Supabase environment variables! Check your .env file.");
} else {
  console.log("Supabase keys loaded successfully for Cypress tasks.");
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

module.exports = defineConfig({
  e2e: {
    setupNodeEvents(on, config) {
      on('task', {
        async cleanupTestData(citizenId) {
          console.log(`Deleting test user with ID: ${citizenId}`);
          
          try {
            // 1. Delete the user from your custom USERS table.
            const { error: dbError } = await supabase
              .from('USERS')
              .delete()
              .eq('national_id', citizenId); 

            if (dbError) throw dbError;

            // Optional: If you use Supabase Auth (auth.users), uncomment this:
            // await supabase.auth.admin.deleteUser(userAuthId);

            return null; 
          } catch (error) {
            console.error('Error cleaning up DB:', error);
            return null; 
          }
        }
      });
    },
    baseUrl: 'http://localhost:5173', 
  },
});