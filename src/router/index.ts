import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import { setupGuards } from './guards'

const routes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/auth/LoginView.vue'),
    meta: { layout: 'auth', requiresAuth: false },
  },
  {
    path: '/register',
    name: 'Register',
    component: () => import('@/views/auth/RegisterView.vue'),
    meta: { layout: 'auth', requiresAuth: false },
  },
  {
    path: '/login/2fa',
    name: 'TwoFactor',
    component: () => import('@/views/auth/TwoFactorView.vue'),
    meta: { layout: 'auth', requiresAuth: false },
  },
  {
    path: '/channels/@me',
    name: 'Home',
    component: () => import('@/views/app/FriendsView.vue'),
    meta: { layout: 'app', requiresAuth: true },
  },
  {
    path: '/channels/@me/:dmId',
    name: 'DM',
    component: () => import('@/views/app/DMView.vue'),
    meta: { layout: 'app', requiresAuth: true },
  },
  {
    path: '/channels/:serverId/:channelId',
    name: 'Channel',
    component: () => import('@/views/app/ChannelView.vue'),
    meta: { layout: 'app', requiresAuth: true },
  },
  {
    path: '/settings',
    name: 'Settings',
    component: () => import('@/views/app/SettingsView.vue'),
    meta: { layout: 'app', requiresAuth: true },
  },
  {
    path: '/invite/:code',
    name: 'Invite',
    component: () => import('@/views/app/InviteView.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/',
    redirect: '/channels/@me',
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'NotFound',
    component: () => import('@/views/NotFoundView.vue'),
    meta: { layout: 'auth' },
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

setupGuards(router)

export default router
