import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import LoginView from '../views/LoginView.vue'
import AppLayout from '../layouts/AppLayout.vue'
import DashboardView from '../views/DashboardView.vue'
import ExpensesView from '../views/ExpensesView.vue'
import TrendsView from '../views/TrendsView.vue'
import ExchangeRateView from '../views/ExchangeRateView.vue'
import ImportView from '../views/ImportView.vue'

const routes = [
  { path: '/login', name: 'login', component: LoginView },
  {
    path: '/',
    component: AppLayout,
    meta: { requiresAuth: true },
    children: [
      { path: '', redirect: '/dashboard' },
      { path: 'dashboard', name: 'dashboard', component: DashboardView },
      { path: 'expenses', name: 'expenses', component: ExpensesView },
      { path: 'trends', name: 'trends', component: TrendsView },
      {
        path: 'exchange-rate',
        name: 'exchange-rate',
        component: ExchangeRateView
      },
      { path: 'import', name: 'import', component: ImportView }
    ]
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

router.beforeEach(async (to) => {
  const auth = useAuthStore()
  await auth.bootstrap()
  if (to.meta.requiresAuth && !auth.isAuthenticated) {
    return { name: 'login' }
  }
  if (to.name === 'login' && auth.isAuthenticated) {
    return { name: 'dashboard' }
  }
})

export default router
