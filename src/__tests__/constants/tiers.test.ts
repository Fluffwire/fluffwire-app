import { describe, it, expect } from 'vitest'
import {
  canManageServer,
  canManageChannels,
  canManageMessages,
  canKickMembers,
  canBanMembers,
  canManageLabels,
  canBypassChannelRestrictions,
  canDeleteServer,
  canTransferOwnership,
} from '@/constants/tiers'

describe('Tier Permissions', () => {
  describe('canManageServer', () => {
    it('should allow owner and admin', () => {
      expect(canManageServer('owner')).toBe(true)
      expect(canManageServer('admin')).toBe(true)
    })

    it('should deny moderator and member', () => {
      expect(canManageServer('moderator')).toBe(false)
      expect(canManageServer('member')).toBe(false)
    })
  })

  describe('canManageChannels', () => {
    it('should allow owner and admin', () => {
      expect(canManageChannels('owner')).toBe(true)
      expect(canManageChannels('admin')).toBe(true)
    })

    it('should deny moderator and member', () => {
      expect(canManageChannels('moderator')).toBe(false)
      expect(canManageChannels('member')).toBe(false)
    })
  })

  describe('canManageMessages', () => {
    it('should allow owner, admin, and moderator', () => {
      expect(canManageMessages('owner')).toBe(true)
      expect(canManageMessages('admin')).toBe(true)
      expect(canManageMessages('moderator')).toBe(true)
    })

    it('should deny member', () => {
      expect(canManageMessages('member')).toBe(false)
    })
  })

  describe('canKickMembers', () => {
    it('should allow owner, admin, and moderator', () => {
      expect(canKickMembers('owner')).toBe(true)
      expect(canKickMembers('admin')).toBe(true)
      expect(canKickMembers('moderator')).toBe(true)
    })

    it('should deny member', () => {
      expect(canKickMembers('member')).toBe(false)
    })
  })

  describe('canBanMembers', () => {
    it('should allow owner and admin', () => {
      expect(canBanMembers('owner')).toBe(true)
      expect(canBanMembers('admin')).toBe(true)
    })

    it('should deny moderator and member', () => {
      expect(canBanMembers('moderator')).toBe(false)
      expect(canBanMembers('member')).toBe(false)
    })
  })

  describe('canManageLabels', () => {
    it('should allow owner and admin', () => {
      expect(canManageLabels('owner')).toBe(true)
      expect(canManageLabels('admin')).toBe(true)
    })

    it('should deny moderator and member', () => {
      expect(canManageLabels('moderator')).toBe(false)
      expect(canManageLabels('member')).toBe(false)
    })
  })

  describe('canBypassChannelRestrictions', () => {
    it('should allow owner, admin, and moderator', () => {
      expect(canBypassChannelRestrictions('owner')).toBe(true)
      expect(canBypassChannelRestrictions('admin')).toBe(true)
      expect(canBypassChannelRestrictions('moderator')).toBe(true)
    })

    it('should deny member', () => {
      expect(canBypassChannelRestrictions('member')).toBe(false)
    })
  })

  describe('canDeleteServer', () => {
    it('should only allow owner', () => {
      expect(canDeleteServer('owner')).toBe(true)
      expect(canDeleteServer('admin')).toBe(false)
      expect(canDeleteServer('moderator')).toBe(false)
      expect(canDeleteServer('member')).toBe(false)
    })
  })

  describe('canTransferOwnership', () => {
    it('should only allow owner', () => {
      expect(canTransferOwnership('owner')).toBe(true)
      expect(canTransferOwnership('admin')).toBe(false)
      expect(canTransferOwnership('moderator')).toBe(false)
      expect(canTransferOwnership('member')).toBe(false)
    })
  })
})
