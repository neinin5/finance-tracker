import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import LoginView from '../views/LoginView.vue'
import AppLayout from '../layouts/AppLayout.vue'
import DashboardView from '../views/DashboardView.vue'
import ExpensesView from '../views/ExpensesView.vue'
import TrendsView from '../views/TrendsView.vue'
import CalendarView from '../views/CalendarView.vue'
import ExchangeRateView from '../views/ExchangeRateView.vue'
import ImportView from '../views/ImportView.vue'
import SplitView from '../views/SplitView.vue'
import BackupsView from '../views/BackupsView.vue'
import SettingsView from '../views/SettingsView.vue'
// MapView lazy-loaded — pulls in Leaflet (~150KB) only when needed
const MapView = () => import('../views/MapView.vue')

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
      { path: 'calendar', name: 'calendar', component: CalendarView },
      {
        path: 'exchange-rate',
        name: 'exchange-rate',
        component: ExchangeRateView
      },
      { path: 'import', name: 'import', component: ImportView },
      { path: 'split', name: 'split', component: SplitView },
      { path: 'backups', name: 'backups', component: BackupsView },
      { path: 'settings', name: 'settings', component: SettingsView },
      { path: 'map', name: 'map', component: MapView }
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
