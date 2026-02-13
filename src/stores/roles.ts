import { defineStore } from 'pinia'
import { ref } from 'vue'
import { serverApi } from '@/services/serverApi'
import type { Role } from '@/types/server'

export const useRolesStore = defineStore('roles', () => {
  const rolesByServer = ref<Record<string, Role[]>>({})

  function getRoles(serverId: string): Role[] {
    return rolesByServer.value[serverId] || []
  }

  async function fetchRoles(serverId: string) {
    const roles = await serverApi.getRoles(serverId)
    rolesByServer.value[serverId] = roles
  }

  async function createRole(serverId: string, name: string, color?: string, permissions?: number) {
    const role = await serverApi.createRole(serverId, name, color, permissions)
    if (!rolesByServer.value[serverId]) rolesByServer.value[serverId] = []
    rolesByServer.value[serverId].push(role)
    return role
  }

  async function updateRole(serverId: string, roleId: string, updates: { name?: string; color?: string; permissions?: number }) {
    const updated = await serverApi.updateRole(serverId, roleId, updates)
    const roles = rolesByServer.value[serverId]
    if (roles) {
      const idx = roles.findIndex(r => r.id === roleId)
      if (idx !== -1) roles[idx] = updated
    }
    return updated
  }

  async function deleteRole(serverId: string, roleId: string) {
    await serverApi.deleteRole(serverId, roleId)
    const roles = rolesByServer.value[serverId]
    if (roles) {
      rolesByServer.value[serverId] = roles.filter(r => r.id !== roleId)
    }
  }

  async function reorderRoles(serverId: string, roleIds: string[]) {
    await serverApi.reorderRoles(serverId, roleIds)
    // Update local positions
    const roles = rolesByServer.value[serverId]
    if (roles) {
      roleIds.forEach((id, i) => {
        const role = roles.find(r => r.id === id)
        if (role) role.position = i
      })
      roles.sort((a, b) => a.position - b.position)
    }
  }

  return { rolesByServer, getRoles, fetchRoles, createRole, updateRole, deleteRole, reorderRoles }
})
