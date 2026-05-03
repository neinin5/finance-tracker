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
      <div class="brand-row">
        <span class="brand-mark">UWE</span>
        <h1>Finance Tracker</h1>
      </div>
      <p class="institution">University of the West of England · Bristol</p>
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
  background: linear-gradient(135deg, #00bb77 0%, #008855 100%);
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
.brand-row {
  display: flex;
  align-items: center;
  gap: 0.7rem;
  margin-bottom: 0.4rem;
}
.brand-mark {
  background: #E62333;
  color: white;
  font-weight: 900;
  font-size: 0.95rem;
  letter-spacing: 0.06em;
  padding: 0.35rem 0.6rem;
  border-radius: 5px;
  box-shadow: 0 4px 14px rgba(230, 35, 51, 0.4);
  font-family: 'Helvetica Neue', Arial, sans-serif;
}
.login-card h1 {
  margin: 0;
  color: #231F20;
  font-size: 1.45rem;
  font-weight: 600;
}
.institution {
  margin: 0 0 1.25rem;
  font-size: 0.78rem;
  color: #54585A;
  letter-spacing: 0.02em;
}
.subtitle {
  margin: 0 0 1.75rem;
  color: #54585A;
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
  border-color: #00bb77;
  box-shadow: 0 0 0 3px rgba(0, 187, 119, 0.15);
}
button {
  margin-top: 0.5rem;
  padding: 0.8rem;
  background: #00bb77;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s;
}
button:hover:not(:disabled) {
  background: #008855;
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
