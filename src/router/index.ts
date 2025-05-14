import { createRouter, createWebHistory } from 'vue-router'
import PaymentForm from '@/views/PaymentView.vue'

const routes = [
  { path: '/', component: PaymentForm, name: 'payment' },
  { path: '/3ds', component: () => import('@/views/ThreeDSView.vue'), name: '3ds' },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

export default router
