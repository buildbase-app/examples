// Modified from sahat/hackathon-starter: sign-in, sign-up, password reset,
// email verification, email links and passkeys moved to BuildBase's hosted
// pages, and upstream's 2FA is removed. This controller keeps what is the app's own business: the
// profile, linked provider accounts, and deleting the app's data.
const validator = require('validator');
const User = require('../models/User');
const Session = require('../models/Session');
const buildbase = require('../config/buildbase');
const aiAgentController = require('./ai-agent');
const { revokeProviderTokens, revokeAllProviderTokens } = require('../config/token-revocation');

/**
 * GET /login
 * One button to the hosted page, which offers sign-in and sign-up.
 */
exports.getLogin = (req, res) => {
  if (req.user) {
    return res.redirect('/');
  }
  res.render('account/login', {
    title: 'Login',
    buildbaseConfigured: buildbase.isConfigured(),
  });
};

/**
 * POST /login
 * Send the visitor to BuildBase's hosted sign-in page.
 */
exports.postLogin = async (req, res, next) => {
  if (!buildbase.isConfigured()) {
    req.flash('errors', { msg: 'Set BUILDBASE_ORG_ID, BUILDBASE_CLIENT_ID and BUILDBASE_CLIENT_SECRET first. See the README.' });
    return res.redirect('/login');
  }
  try {
    await buildbase.startSignIn(req, res);
  } catch (err) {
    next(err);
  }
};

/**
 * GET /auth/buildbase/callback
 * Back from the hosted page with a one-time code: exchange it, read the
 * BuildBase user, and find or create this app's user record for them.
 */
exports.getBuildbaseCallback = async (req, res, next) => {
  const { code, state } = req.query;
  const expectedState = req.session.buildbaseState;
  req.session.buildbaseState = undefined;
  if (typeof code !== 'string' || !state || state !== expectedState) {
    req.flash('errors', { msg: 'Sign-in did not complete. Please try again.' });
    return res.redirect('/login');
  }
  try {
    const sessionId = await buildbase.exchangeCode(code);
    req.session.buildbaseSessionId = sessionId;
    const profile = await buildbase.forRequest(req).users.getProfile();
    // The profile API returns `id`; older SDK types call it `_id`.
    const rawId = profile.id || profile._id;
    // Never String() a missing ID: every such user would share one account.
    if (!rawId || !profile.email) throw new Error('BuildBase returned a profile without an ID or email.');
    const buildbaseId = String(rawId);
    const email = validator.normalizeEmail(profile.email, { gmail_remove_dots: false });

    let user = await User.findOne({ buildbase: { $eq: buildbaseId } });
    if (!user) {
      // An account made before BuildBase, with the same email, is adopted.
      user = (await User.findOne({ email: { $eq: email } })) || new User({ email });
      user.buildbase = buildbaseId;
    }
    user.email = email;
    user.profile.name = user.profile.name || profile.name;
    await user.save();

    // passport.session() still carries the user between requests, so every
    // route that reads req.user keeps working unchanged.
    req.logIn(user, (err) => {
      if (err) return next(err);
      req.flash('success', { msg: 'Success! You are logged in.' });
      res.redirect(req.session.returnTo || '/');
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /logout
 * Ends the BuildBase session too, not only this app's.
 */
exports.logout = async (req, res) => {
  await buildbase.revokeSession(req.session?.buildbaseSessionId);
  req.logout((err) => {
    if (err) console.log('Error : Failed to logout.', err);
    req.session.destroy((err) => {
      if (err) console.log('Error : Failed to destroy the session during logout.', err);
      req.user = null;
      res.redirect('/');
    });
  });
};

/**
 * GET /account
 * Profile page.
 */
exports.getAccount = (req, res) => {
  res.render('account/profile', {
    title: 'Account Management',
  });
};

/**
 * POST /account/profile
 * Update profile information. The email belongs to the BuildBase account.
 */
exports.postUpdateProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    user.profile.name = req.body.name || '';
    user.profile.gender = req.body.gender || '';
    user.profile.location = req.body.location || '';
    user.profile.website = req.body.website || '';

    // Handle picture source selection
    if (typeof req.body.pictureSource === 'string') {
      const newProfilePictureSource = req.body.pictureSource.trim();
      if (newProfilePictureSource && user.profile.pictures && user.profile.pictures.has(newProfilePictureSource)) {
        user.profile.pictureSource = newProfilePictureSource;
        user.profile.picture = user.profile.pictures.get(newProfilePictureSource);
      } else {
        req.flash('errors', { msg: 'Invalid profile picture change request.' });
        return res.redirect('/account');
      }
    }

    await user.save();
    req.flash('success', { msg: 'Profile information has been updated.' });
    res.redirect('/account');
  } catch (err) {
    next(err);
  }
};

/**
 * POST /account/delete
 * Delete this app's data for the user. The BuildBase account stays.
 */
exports.postDeleteAccount = async (req, res, next) => {
  try {
    const userId = req.user.id;
    // Best-effort: revoke OAuth tokens at provider endpoints before deleting
    await revokeAllProviderTokens(req.user.tokens);
    await aiAgentController.deleteUserAIAgentData(userId); // Delete user's AI agent chat history
    await User.deleteOne({ _id: userId });
    await buildbase.revokeSession(req.session?.buildbaseSessionId);
    req.logout((err) => {
      if (err) console.log('Error: Failed to logout.', err);
      req.session.destroy((err) => {
        if (err) console.log('Error: Failed to destroy the session during account deletion.', err);
        req.user = null;
        res.redirect('/');
      });
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /account/unlink/:provider
 * Unlink OAuth provider. Signing in never depends on one any more, so there
 * is no "keep another way to log in" check.
 */
exports.getOauthUnlink = async (req, res, next) => {
  try {
    let { provider } = req.params;
    provider = validator.escape(provider);
    const user = await User.findById(req.user.id);
    user[provider.toLowerCase()] = undefined;
    const tokenToRevoke = user.tokens.find((token) => token.kind === provider.toLowerCase());
    const tokensWithoutProviderToUnlink = user.tokens.filter((token) => token.kind !== provider.toLowerCase());

    // Remove provider's picture entry
    if (user.profile.pictures && user.profile.pictures.has(provider.toLowerCase())) {
      user.profile.pictures.delete(provider.toLowerCase());

      // If current picture source was the unlinked provider, select fallback
      if (user.profile.pictureSource === provider.toLowerCase()) {
        let fallbackSource = null;

        // Priority order: gravatar -> any remaining provider -> undefined
        if (user.profile.pictures.has('gravatar')) {
          fallbackSource = 'gravatar';
        } else if (user.profile.pictures.size > 0) {
          fallbackSource = user.profile.pictures.keys().next().value;
        }

        if (fallbackSource) {
          user.profile.pictureSource = fallbackSource;
          user.profile.picture = user.profile.pictures.get(fallbackSource);
        } else {
          user.profile.pictureSource = undefined;
          user.profile.picture = undefined;
        }
      }
    }

    // Best-effort: revoke the OAuth token at the provider's endpoint before unlinking
    await revokeProviderTokens(provider.toLowerCase(), tokenToRevoke);
    user.tokens = tokensWithoutProviderToUnlink;
    await user.save();
    req.flash('info', {
      msg: `${provider.charAt(0).toUpperCase() + provider.slice(1).toLowerCase()} account has been unlinked.`,
    });
    res.redirect('/account');
  } catch (err) {
    next(err);
  }
};

/**
 * POST /account/logout-everywhere
 * Ends every BuildBase session for this user, on every device, and every
 * session this app holds for them.
 */
exports.postLogoutEverywhere = async (req, res, next) => {
  const userId = req.user.id;
  try {
    await buildbase.revokeSession(req.session?.buildbaseSessionId, { everywhere: true });
    await Session.removeSessionByUserId(userId);
    req.logout((err) => {
      if (err) {
        return next(err);
      }
      req.flash('info', { msg: 'You have been logged out of all sessions.' });
      res.redirect('/');
    });
  } catch (err) {
    return next(err);
  }
};
