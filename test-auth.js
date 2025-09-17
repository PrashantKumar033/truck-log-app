// Simple test script to verify authentication endpoints
import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:3000';

async function testAuth() {
  console.log('🧪 Testing Authentication System...\n');
  
  try {
    // Test 1: Signup
    console.log('1. Testing Signup...');
    const signupResponse = await fetch(`${BASE_URL}/api/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Test User',
        username: 'testuser',
        password: 'test123'
      })
    });
    
    if (signupResponse.ok) {
      console.log('✅ Signup successful');
    } else {
      const error = await signupResponse.json();
      console.log('❌ Signup failed:', error.error);
    }
    
    // Test 2: Login with correct credentials
    console.log('\n2. Testing Login with correct credentials...');
    const loginResponse = await fetch(`${BASE_URL}/api/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'admin',
        password: 'admin123'
      })
    });
    
    if (loginResponse.ok) {
      const loginData = await loginResponse.json();
      console.log('✅ Login successful');
      console.log('Session ID:', loginData.sessionId);
      console.log('User:', loginData.user);
      
      // Test 3: Access protected endpoint
      console.log('\n3. Testing protected endpoint access...');
      const entriesResponse = await fetch(`${BASE_URL}/api/entries`, {
        headers: {
          'X-Session-Id': loginData.sessionId
        }
      });
      
      if (entriesResponse.ok) {
        console.log('✅ Protected endpoint access successful');
      } else {
        console.log('❌ Protected endpoint access failed');
      }
      
    } else {
      const error = await loginResponse.json();
      console.log('❌ Login failed:', error.error);
    }
    
    // Test 4: Login with wrong credentials
    console.log('\n4. Testing Login with wrong credentials...');
    const wrongLoginResponse = await fetch(`${BASE_URL}/api/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'admin',
        password: 'wrongpassword'
      })
    });
    
    if (wrongLoginResponse.ok) {
      console.log('❌ Login should have failed but succeeded');
    } else {
      console.log('✅ Login correctly failed with wrong credentials');
    }
    
  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
    console.log('\n💡 Make sure the server is running with: npm run dev');
  }
}

testAuth();