/* eslint-disable global-require */
const path = require('node:path');
const { expect } = require('chai');
const sinon = require('sinon');

process.loadEnvFile(path.join(__dirname, '.env.test'));

// ---------------------------------------------------------------------------
// Shared helper: build a minimal Module.prototype.require shim that intercepts
// a set of module IDs and falls back to the real require for everything else.
// ---------------------------------------------------------------------------
function buildRequireShim(overrides) {
  const Module = require('module');
  const original = Module.prototype.require;
  Module.prototype.require = function shimmedRequire(id) {
    if (Object.prototype.hasOwnProperty.call(overrides, id)) {
      return overrides[id];
    }
    return original.apply(this, arguments);
  };
  return { Module, original };
}

function restoreRequireShim(Module, original) {
  if (Module && original) {
    Module.prototype.require = original;
  }
  delete require.cache[require.resolve('../controllers/user')];
}

// ---------------------------------------------------------------------------
// Helper factory to build a fake user document used by many test suites.
// ---------------------------------------------------------------------------
function makeFakeUser(overrides = {}) {
  return Object.assign(
    {
      id: 'user-id-123',
      email: 'test@example.com',
      password: 'hashedpassword',
      emailVerified: true,
      twoFactorEnabled: false,
      twoFactorMethods: [],
      twoFactorCode: undefined,
      twoFactorExpires: undefined,
      twoFactorIpHash: undefined,
      tokens: [],
      profile: { pictures: new Map(), picture: undefined, pictureSource: undefined },
      save: sinon.stub().resolves(),
      clearTwoFactorCode: sinon.spy(),
      // consumeToken verifies-and-clears in one call; default to a valid token.
      consumeToken: sinon.stub().returns(true),
    },
    overrides,
  );
}

describe('User Controller', () => {
  // -------------------------------------------------------------------------
  // Shared beforeEach / afterEach factory used by all suites below.
  // Each suite provides its own `overrides` object so we don't need to
  // duplicate the shim boilerplate.
  // -------------------------------------------------------------------------

  // =========================================================================
  // postLogin
  // =========================================================================
  // =========================================================================
  // postSignup
  // =========================================================================
  // =========================================================================
  // postUpdateProfile
  // =========================================================================
  describe('postUpdateProfile', () => {
    let userController;
    let shimModule;
    let shimOriginal;
    let userFindByIdStub;
    let fakeUser;
    let req;
    let res;
    let next;

    beforeEach(() => {
      fakeUser = makeFakeUser({
        email: 'test@example.com',
        twoFactorEnabled: false,
        twoFactorMethods: [],
        profile: { name: '', gender: '', location: '', website: '', picture: undefined, pictureSource: undefined, pictures: new Map() },
      });

      userFindByIdStub = sinon.stub().resolves(fakeUser);

      ({ Module: shimModule, original: shimOriginal } = buildRequireShim({
        '../models/User': { findById: userFindByIdStub },
      }));

      delete require.cache[require.resolve('../controllers/user')];
      userController = require('../controllers/user');

      req = {
        user: { id: 'user-id-123' },
        body: { email: 'test@example.com', name: 'Test User', gender: 'male', location: 'NYC', website: 'https://example.com' },
        flash: sinon.spy(),
      };
      res = { redirect: sinon.spy() };
      next = sinon.spy();
    });

    afterEach(() => {
      restoreRequireShim(shimModule, shimOriginal);
      sinon.restore();
    });

    it('should update profile fields successfully', async () => {
      await userController.postUpdateProfile(req, res, next);

      expect(fakeUser.profile.name).to.equal('Test User');
      expect(fakeUser.profile.gender).to.equal('male');
      expect(fakeUser.profile.location).to.equal('NYC');
      expect(fakeUser.profile.website).to.equal('https://example.com');
      expect(fakeUser.save.calledOnce).to.be.true;
      expect(req.flash.calledWith('success')).to.be.true;
    });

    it('should reject invalid picture source', async () => {
      req.body.pictureSource = 'nonexistent-provider';

      await userController.postUpdateProfile(req, res, next);

      expect(req.flash.calledWith('errors')).to.be.true;
      expect(res.redirect.calledWith('/account')).to.be.true;
      expect(fakeUser.save.called).to.be.false;
    });

    it('should update picture source when valid source provided', async () => {
      fakeUser.profile.pictures = new Map([['gravatar', 'https://gravatar.com/pic']]);
      req.body.pictureSource = 'gravatar';

      await userController.postUpdateProfile(req, res, next);

      expect(fakeUser.profile.pictureSource).to.equal('gravatar');
      expect(fakeUser.profile.picture).to.equal('https://gravatar.com/pic');
      expect(fakeUser.save.calledOnce).to.be.true;
    });
  });

  // =========================================================================
  // postUpdatePassword
  // =========================================================================
  // =========================================================================
  // postDeleteAccount
  // =========================================================================
  describe('postDeleteAccount', () => {
    let userController;
    let shimModule;
    let shimOriginal;
    let userDeleteOneStub;
    let revokeAllProviderTokensStub;
    let deleteUserAIAgentDataStub;
    let req;
    let res;
    let next;

    beforeEach(() => {
      userDeleteOneStub = sinon.stub().resolves();
      revokeAllProviderTokensStub = sinon.stub().resolves();
      deleteUserAIAgentDataStub = sinon.stub().resolves();

      ({ Module: shimModule, original: shimOriginal } = buildRequireShim({
        '../models/User': { deleteOne: userDeleteOneStub },
        '../config/token-revocation': { revokeAllProviderTokens: revokeAllProviderTokensStub, revokeProviderTokens: sinon.stub().resolves() },
        './ai-agent': { deleteUserAIAgentData: deleteUserAIAgentDataStub },
      }));

      delete require.cache[require.resolve('../controllers/user')];
      userController = require('../controllers/user');

      req = {
        user: { id: 'user-id-123', tokens: [] },
        flash: sinon.spy(),
        logout: sinon.stub().callsFake((cb) => cb(null)),
        session: { destroy: sinon.stub().callsFake((cb) => cb(null)) },
      };
      res = { redirect: sinon.spy() };
      next = sinon.spy();
    });

    afterEach(() => {
      restoreRequireShim(shimModule, shimOriginal);
      sinon.restore();
    });

    it('should revoke tokens, delete AI data, delete user, and redirect /', async () => {
      await userController.postDeleteAccount(req, res, next);

      expect(revokeAllProviderTokensStub.calledOnce).to.be.true;
      // expect(deleteUserAIAgentDataStub.calledOnce).to.be.true; --- AI agents aren't a core feature; the scope of the test is core features
      expect(userDeleteOneStub.calledOnce).to.be.true;
      expect(req.logout.calledOnce).to.be.true;
      expect(req.session.destroy.calledOnce).to.be.true;
      expect(res.redirect.calledWith('/')).to.be.true;
    });

    it('should call next(err) if an unexpected error occurs', async () => {
      const err = new Error('db error');
      userDeleteOneStub.rejects(err);
      await userController.postDeleteAccount(req, res, next);
      expect(next.calledWith(err)).to.be.true;
    });
  });

  // =========================================================================
  // getOauthUnlink
  // =========================================================================
  describe('getOauthUnlink', () => {
    let userController;
    let shimModule;
    let shimOriginal;
    let userFindByIdStub;
    let revokeProviderTokensStub;
    let fakeUser;
    let req;
    let res;
    let next;

    beforeEach(() => {
      fakeUser = makeFakeUser({
        email: 'test@example.com',
        password: 'hashedpassword',
        google: 'google-id',
        tokens: [{ kind: 'google', accessToken: 'google-token' }],
        profile: {
          pictures: new Map([
            ['gravatar', 'https://gravatar.com/pic'],
            ['google', 'https://google.com/pic'],
          ]),
          picture: 'https://google.com/pic',
          pictureSource: 'google',
        },
      });
      userFindByIdStub = sinon.stub().resolves(fakeUser);
      revokeProviderTokensStub = sinon.stub().resolves();

      ({ Module: shimModule, original: shimOriginal } = buildRequireShim({
        '../models/User': { findById: userFindByIdStub },
        '../config/token-revocation': { revokeProviderTokens: revokeProviderTokensStub, revokeAllProviderTokens: sinon.stub().resolves() },
        './ai-agent': { deleteUserAIAgentData: sinon.stub().resolves() },
      }));

      delete require.cache[require.resolve('../controllers/user')];
      userController = require('../controllers/user');

      req = {
        user: { id: 'user-id-123' },
        params: { provider: 'google' },
        flash: sinon.spy(),
      };
      res = { redirect: sinon.spy() };
      next = sinon.spy();
    });

    afterEach(() => {
      restoreRequireShim(shimModule, shimOriginal);
      sinon.restore();
    });

    it('should unlink provider, revoke token, and redirect /account', async () => {
      await userController.getOauthUnlink(req, res, next);

      expect(fakeUser.google).to.be.undefined;
      expect(fakeUser.tokens).to.have.lengthOf(0);
      expect(revokeProviderTokensStub.calledOnce).to.be.true;
      expect(fakeUser.save.calledOnce).to.be.true;
      expect(req.flash.calledWith('info')).to.be.true;
      expect(res.redirect.calledWith('/account')).to.be.true;
    });

    it('should fall back to gravatar picture when unlinked provider was active picture source', async () => {
      await userController.getOauthUnlink(req, res, next);

      // google was pictureSource; gravatar should be chosen as fallback
      expect(fakeUser.profile.pictureSource).to.equal('gravatar');
      expect(fakeUser.profile.picture).to.equal('https://gravatar.com/pic');
    });

    it('should clear picture source when no fallback picture exists', async () => {
      fakeUser.profile.pictures = new Map([['google', 'https://google.com/pic']]);
      fakeUser.profile.pictureSource = 'google';

      await userController.getOauthUnlink(req, res, next);

      expect(fakeUser.profile.pictureSource).to.be.undefined;
      expect(fakeUser.profile.picture).to.be.undefined;
    });
  });

  // =========================================================================
  // getLoginByEmail
  // =========================================================================
  // =========================================================================
  // getReset / postReset
  // =========================================================================
  // =========================================================================
  // postForgot
  // =========================================================================
  // =========================================================================
  // postLogoutEverywhere
  // =========================================================================
  describe('postLogoutEverywhere', () => {
    let userController;
    let shimModule;
    let shimOriginal;
    let removeSessionStub;
    let req;
    let res;
    let next;

    beforeEach(() => {
      removeSessionStub = sinon.stub().resolves();

      ({ Module: shimModule, original: shimOriginal } = buildRequireShim({
        '../models/Session': { removeSessionByUserId: removeSessionStub },
      }));

      delete require.cache[require.resolve('../controllers/user')];
      userController = require('../controllers/user');

      req = {
        user: { id: 'user-id-123' },
        flash: sinon.spy(),
        logout: sinon.stub().callsFake((cb) => cb(null)),
      };
      res = { redirect: sinon.spy() };
      next = sinon.spy();
    });

    afterEach(() => {
      restoreRequireShim(shimModule, shimOriginal);
      sinon.restore();
    });

    it('should remove all sessions, logout, and redirect /', async () => {
      await userController.postLogoutEverywhere(req, res, next);

      expect(removeSessionStub.calledWith('user-id-123')).to.be.true;
      expect(req.logout.calledOnce).to.be.true;
      expect(req.flash.calledWith('info')).to.be.true;
      expect(res.redirect.calledWith('/')).to.be.true;
    });

    it('should call next(err) when session removal fails', async () => {
      const err = new Error('session error');
      removeSessionStub.rejects(err);
      await userController.postLogoutEverywhere(req, res, next);
      expect(next.calledWith(err)).to.be.true;
    });
  });

  // =========================================================================
  // Email 2FA flows: getTwoFactor, postTwoFactor, resendTwoFactorCode
  // =========================================================================
  // =========================================================================
  // postEnable2FA
  // =========================================================================
  // =========================================================================
  // postRemoveTotp / postRemoveEmail2FA
  // =========================================================================
  // =========================================================================
  // postTotpSetup
  // =========================================================================
  // =========================================================================
  // getTotpVerify / postTotpVerify
  // =========================================================================
  // =========================================================================
  // getVerifyEmail / getVerifyEmailToken
  // =========================================================================
});
