<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const router = useRouter()
const auth = useAuthStore()

const username = ref('')
const password = ref('')
const confirmPassword = ref('')
const error = ref('')
const loading = ref(false)

async function handleSubmit() {
  error.value = ''
  loading.value = true
  try {
    if (auth.needsSetup) {
      if (password.value !== confirmPassword.value) {
        error.value = 'Passwords do not match.'
        return
      }
      await auth.setup(username.value, password.value)
    } else {
      await auth.login(username.value, password.value)
    }
    router.push('/dashboard')
  } catch (err) {
    error.value = err.message || 'Authentication failed.'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="login-page">
    <div class="login-card">
      <h1>UK Finance Tracker</h1>
      <p class="subtitle">
        {{ auth.needsSetup ? 'Create your account' : 'Welcome back' }}
      </p>

      <form @submit.prevent="handleSubmit">
        <label>
          Username
          <input
            v-model="username"
            type="text"
            required
            autocomplete="username"
          />
        </label>

        <label>
          Password
          <input
            v-model="password"
            type="password"
            required
            :autocomplete="auth.needsSetup ? 'new-password' : 'current-password'"
          />
        </label>

        <label v-if="auth.needsSetup">
          Confirm Password
          <input
            v-model="confirmPassword"
            type="password"
            required
            autocomplete="new-password"
          />
        </label>

        <p v-if="error" class="error">{{ error }}</p>

        <button type="submit" :disabled="loading">
          {{
            loading
              ? 'Please wait…'
              : auth.needsSetup
                ? 'Create Account'
                : 'Log In'
          }}
        </button>
      </form>

      <p v-if="auth.needsSetup" class="hint">
        First time here — choose any username and a password (6+ characters).
      </p>
    </div>
  </div>
</template>

<style scoped>
.login-page {
  min-height: 100vh;
  display: grid;
  place-items: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 1rem;
}
.login-card {
  background: white;
  padding: 2.5rem;
  border-radius: 16px;
  width: 100%;
  max-width: 400px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.2);
}
.login-card h1 {
  margin: 0 0 0.5rem;
  color: #1f2937;
  font-size: 1.6rem;
}
.subtitle {
  margin: 0 0 1.75rem;
  color: #6b7280;
}
form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}
label {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  font-size: 0.875rem;
  color: #374151;
  font-weight: 500;
}
input {
  padding: 0.7rem 0.9rem;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 1rem;
  transition: border-color 0.15s, box-shadow 0.15s;
}
input:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.15);
}
button {
  margin-top: 0.5rem;
  padding: 0.8rem;
  background: #667eea;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s;
}
button:hover:not(:disabled) {
  background: #5568d3;
}
button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
.error {
  background: #fef2f2;
  color: #b91c1c;
  padding: 0.6rem 0.8rem;
  border-radius: 8px;
  margin: 0;
  font-size: 0.875rem;
}
.hint {
  margin: 1.25rem 0 0;
  font-size: 0.8rem;
  color: #9ca3af;
  text-align: center;
}
</style>
