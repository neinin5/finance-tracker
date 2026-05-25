import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import './assets/styles/main.css'
import Clarity from '@microsoft/clarity'

Clarity.init('wwt9a8dskg')

const app = createApp(App)
app.use(createPinia())
app.use(router)
app.mount('#app')
