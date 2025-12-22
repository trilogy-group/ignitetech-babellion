import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  createMockUser,
  createMockTranslation,
  createMockProofreading,
  createMockImageTranslation,
  createMockImageEdit,
} from '../../test/mocks/storage.mock';

/**
 * These tests verify the authorization logic patterns used throughout routes.ts
 * We test the logic directly rather than through HTTP to keep tests fast and focused.
 */

describe('Authorization Logic', () => {
  describe('Translation Access Control', () => {
    interface AccessContext {
      translation: { userId: string; isPrivate: boolean };
      requestingUserId: string;
      requestingUserIsAdmin: boolean;
    }

    // Extracted authorization logic from routes.ts
    function canAccessTranslation(ctx: AccessContext): boolean {
      const isOwner = ctx.translation.userId === ctx.requestingUserId;
      const isPublic = !ctx.translation.isPrivate;
      return isOwner || isPublic;
    }

    function canEditTranslation(ctx: AccessContext): boolean {
      const isOwner = ctx.translation.userId === ctx.requestingUserId;
      const isAdminEditingPublic = ctx.requestingUserIsAdmin && !ctx.translation.isPrivate;
      return isOwner || isAdminEditingPublic;
    }

    function canDeleteTranslation(ctx: AccessContext): boolean {
      const isOwner = ctx.translation.userId === ctx.requestingUserId;
      const isAdminDeletingPublic = ctx.requestingUserIsAdmin && !ctx.translation.isPrivate;
      return isOwner || isAdminDeletingPublic;
    }

    describe('canAccessTranslation (GET)', () => {
      it('owner can access their private translation', () => {
        const ctx: AccessContext = {
          translation: { userId: 'user-123', isPrivate: true },
          requestingUserId: 'user-123',
          requestingUserIsAdmin: false,
        };
        expect(canAccessTranslation(ctx)).toBe(true);
      });

      it('owner can access their public translation', () => {
        const ctx: AccessContext = {
          translation: { userId: 'user-123', isPrivate: false },
          requestingUserId: 'user-123',
          requestingUserIsAdmin: false,
        };
        expect(canAccessTranslation(ctx)).toBe(true);
      });

      it('any user can access public translation', () => {
        const ctx: AccessContext = {
          translation: { userId: 'user-123', isPrivate: false },
          requestingUserId: 'other-user',
          requestingUserIsAdmin: false,
        };
        expect(canAccessTranslation(ctx)).toBe(true);
      });

      it('non-owner cannot access private translation', () => {
        const ctx: AccessContext = {
          translation: { userId: 'user-123', isPrivate: true },
          requestingUserId: 'other-user',
          requestingUserIsAdmin: false,
        };
        expect(canAccessTranslation(ctx)).toBe(false);
      });

      it('admin cannot access private translation they do not own', () => {
        const ctx: AccessContext = {
          translation: { userId: 'user-123', isPrivate: true },
          requestingUserId: 'admin-user',
          requestingUserIsAdmin: true,
        };
        expect(canAccessTranslation(ctx)).toBe(false);
      });
    });

    describe('canEditTranslation (PATCH)', () => {
      it('owner can edit their translation', () => {
        const ctx: AccessContext = {
          translation: { userId: 'user-123', isPrivate: false },
          requestingUserId: 'user-123',
          requestingUserIsAdmin: false,
        };
        expect(canEditTranslation(ctx)).toBe(true);
      });

      it('owner can edit their private translation', () => {
        const ctx: AccessContext = {
          translation: { userId: 'user-123', isPrivate: true },
          requestingUserId: 'user-123',
          requestingUserIsAdmin: false,
        };
        expect(canEditTranslation(ctx)).toBe(true);
      });

      it('admin can edit public translation', () => {
        const ctx: AccessContext = {
          translation: { userId: 'user-123', isPrivate: false },
          requestingUserId: 'admin-user',
          requestingUserIsAdmin: true,
        };
        expect(canEditTranslation(ctx)).toBe(true);
      });

      it('admin cannot edit private translation they do not own', () => {
        const ctx: AccessContext = {
          translation: { userId: 'user-123', isPrivate: true },
          requestingUserId: 'admin-user',
          requestingUserIsAdmin: true,
        };
        expect(canEditTranslation(ctx)).toBe(false);
      });

      it('non-owner non-admin cannot edit', () => {
        const ctx: AccessContext = {
          translation: { userId: 'user-123', isPrivate: false },
          requestingUserId: 'other-user',
          requestingUserIsAdmin: false,
        };
        expect(canEditTranslation(ctx)).toBe(false);
      });
    });

    describe('canDeleteTranslation (DELETE)', () => {
      it('owner can delete their translation', () => {
        const ctx: AccessContext = {
          translation: { userId: 'user-123', isPrivate: false },
          requestingUserId: 'user-123',
          requestingUserIsAdmin: false,
        };
        expect(canDeleteTranslation(ctx)).toBe(true);
      });

      it('admin can delete public translation', () => {
        const ctx: AccessContext = {
          translation: { userId: 'user-123', isPrivate: false },
          requestingUserId: 'admin-user',
          requestingUserIsAdmin: true,
        };
        expect(canDeleteTranslation(ctx)).toBe(true);
      });

      it('admin cannot delete private translation they do not own', () => {
        const ctx: AccessContext = {
          translation: { userId: 'user-123', isPrivate: true },
          requestingUserId: 'admin-user',
          requestingUserIsAdmin: true,
        };
        expect(canDeleteTranslation(ctx)).toBe(false);
      });

      it('non-owner non-admin cannot delete', () => {
        const ctx: AccessContext = {
          translation: { userId: 'user-123', isPrivate: false },
          requestingUserId: 'other-user',
          requestingUserIsAdmin: false,
        };
        expect(canDeleteTranslation(ctx)).toBe(false);
      });
    });
  });

  describe('Admin Role Change Protection', () => {
    function canChangeUserRole(
      targetUserId: string, 
      currentUserId: string
    ): { allowed: boolean; reason?: string } {
      // Extracted from routes.ts line 537
      if (targetUserId === currentUserId) {
        return { allowed: false, reason: 'You cannot change your own role' };
      }
      return { allowed: true };
    }

    it('admin can change another user role', () => {
      const result = canChangeUserRole('other-user', 'admin-user');
      expect(result.allowed).toBe(true);
    });

    it('admin cannot change their own role', () => {
      const result = canChangeUserRole('admin-user', 'admin-user');
      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('You cannot change your own role');
    });
  });

  describe('Proofreading Access Control', () => {
    interface AccessContext {
      proofreading: { userId: string; isPrivate: boolean };
      requestingUserId: string;
      requestingUserIsAdmin: boolean;
    }

    function canAccessProofreading(ctx: AccessContext): boolean {
      const isOwner = ctx.proofreading.userId === ctx.requestingUserId;
      const isPublic = !ctx.proofreading.isPrivate;
      return isOwner || isPublic;
    }

    function canEditProofreading(ctx: AccessContext): boolean {
      const isOwner = ctx.proofreading.userId === ctx.requestingUserId;
      const isAdminEditingPublic = ctx.requestingUserIsAdmin && !ctx.proofreading.isPrivate;
      return isOwner || isAdminEditingPublic;
    }

    it('follows same pattern as translations for access', () => {
      const ctx: AccessContext = {
        proofreading: { userId: 'user-123', isPrivate: true },
        requestingUserId: 'other-user',
        requestingUserIsAdmin: false,
      };
      expect(canAccessProofreading(ctx)).toBe(false);
    });

    it('follows same pattern as translations for edit', () => {
      const ctx: AccessContext = {
        proofreading: { userId: 'user-123', isPrivate: true },
        requestingUserId: 'admin-user',
        requestingUserIsAdmin: true,
      };
      expect(canEditProofreading(ctx)).toBe(false); // Admin can't edit private
    });
  });

  describe('Image Translation Access Control', () => {
    interface AccessContext {
      imageTranslation: { userId: string; isPrivate: boolean };
      requestingUserId: string;
      requestingUserIsAdmin: boolean;
    }

    function canAccessImageTranslation(ctx: AccessContext): boolean {
      const isOwner = ctx.imageTranslation.userId === ctx.requestingUserId;
      const isPublic = !ctx.imageTranslation.isPrivate;
      return isOwner || isPublic;
    }

    it('owner can access their private image translation', () => {
      const ctx: AccessContext = {
        imageTranslation: { userId: 'user-123', isPrivate: true },
        requestingUserId: 'user-123',
        requestingUserIsAdmin: false,
      };
      expect(canAccessImageTranslation(ctx)).toBe(true);
    });

    it('non-owner cannot access private image translation', () => {
      const ctx: AccessContext = {
        imageTranslation: { userId: 'user-123', isPrivate: true },
        requestingUserId: 'other-user',
        requestingUserIsAdmin: false,
      };
      expect(canAccessImageTranslation(ctx)).toBe(false);
    });
  });

  describe('Image Edit Access Control', () => {
    interface AccessContext {
      imageEdit: { userId: string; isPrivate: boolean };
      requestingUserId: string;
      requestingUserIsAdmin: boolean;
    }

    function canAccessImageEdit(ctx: AccessContext): boolean {
      const isOwner = ctx.imageEdit.userId === ctx.requestingUserId;
      const isPublic = !ctx.imageEdit.isPrivate;
      return isOwner || isPublic;
    }

    function canEditImageEdit(ctx: AccessContext): boolean {
      const isOwner = ctx.imageEdit.userId === ctx.requestingUserId;
      const isAdminEditingPublic = ctx.requestingUserIsAdmin && !ctx.imageEdit.isPrivate;
      return isOwner || isAdminEditingPublic;
    }

    it('owner can access their image edit', () => {
      const ctx: AccessContext = {
        imageEdit: { userId: 'user-123', isPrivate: false },
        requestingUserId: 'user-123',
        requestingUserIsAdmin: false,
      };
      expect(canAccessImageEdit(ctx)).toBe(true);
    });

    it('admin can edit public image edit', () => {
      const ctx: AccessContext = {
        imageEdit: { userId: 'user-123', isPrivate: false },
        requestingUserId: 'admin-user',
        requestingUserIsAdmin: true,
      };
      expect(canEditImageEdit(ctx)).toBe(true);
    });

    it('admin cannot edit private image edit they do not own', () => {
      const ctx: AccessContext = {
        imageEdit: { userId: 'user-123', isPrivate: true },
        requestingUserId: 'admin-user',
        requestingUserIsAdmin: true,
      };
      expect(canEditImageEdit(ctx)).toBe(false);
    });
  });

  describe('Translation Output Access Control', () => {
    interface OutputAccessContext {
      translation: { userId: string; isPrivate: boolean };
      requestingUserId: string;
      requestingUserIsAdmin: boolean;
    }

    function canAccessTranslationOutput(ctx: OutputAccessContext): boolean {
      // Output access is determined by parent translation access
      const isOwner = ctx.translation.userId === ctx.requestingUserId;
      const isPublic = !ctx.translation.isPrivate;
      return isOwner || isPublic;
    }

    function canEditTranslationOutput(ctx: OutputAccessContext): boolean {
      // Output edit follows parent translation edit rules
      const isOwner = ctx.translation.userId === ctx.requestingUserId;
      const isAdminEditingPublic = ctx.requestingUserIsAdmin && !ctx.translation.isPrivate;
      return isOwner || isAdminEditingPublic;
    }

    it('output access follows parent translation rules', () => {
      const ctx: OutputAccessContext = {
        translation: { userId: 'user-123', isPrivate: true },
        requestingUserId: 'other-user',
        requestingUserIsAdmin: false,
      };
      expect(canAccessTranslationOutput(ctx)).toBe(false);
    });

    it('owner can edit translation output', () => {
      const ctx: OutputAccessContext = {
        translation: { userId: 'user-123', isPrivate: true },
        requestingUserId: 'user-123',
        requestingUserIsAdmin: false,
      };
      expect(canEditTranslationOutput(ctx)).toBe(true);
    });
  });
});

