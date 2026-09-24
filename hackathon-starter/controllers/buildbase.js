// Added for the BuildBase example: the server SDK from an Express route. Each
// request binds the signed-in user's BuildBase session with withSession(), then
// reads their workspaces and credits, or spends one.
const crypto = require('node:crypto');
const buildbase = require('../config/buildbase');

/** The user's first workspace, which BuildBase creates on first sign-in. */
async function currentWorkspace(bb) {
  const workspaces = await bb.workspace.list();
  return workspaces[0] || null;
}

/**
 * GET /api/buildbase
 * Profile, workspace and credit balance, read on the server.
 */
exports.getBuildBase = async (req, res, next) => {
  try {
    const bb = buildbase.forRequest(req);
    const [profile, workspace] = await Promise.all([bb.users.getProfile(), currentWorkspace(bb)]);
    const balance = workspace ? await bb.credits.getBalance(workspace._id).catch(() => null) : null;
    res.render('api/buildbase', {
      title: 'BuildBase API',
      profile,
      workspace,
      balance,
      // A fresh key per page load: resubmitting the same form is one spend.
      spendKey: crypto.randomUUID(),
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/buildbase/credits
 * Spend one credit. The idempotency key makes a double-submitted form cost
 * one credit, not two.
 */
exports.postBuildBaseCredit = async (req, res, next) => {
  try {
    const bb = buildbase.forRequest(req);
    const workspace = await currentWorkspace(bb);
    if (!workspace) {
      req.flash('errors', { msg: 'No workspace yet. Sign out and in again to create one.' });
      return res.redirect('/api/buildbase');
    }
    const result = await bb.credits.consume(workspace._id, {
      amount: 1,
      description: 'API example',
      idempotencyKey: typeof req.body.key === 'string' ? req.body.key : crypto.randomUUID(),
    });
    req.flash('success', { msg: `Spent 1 credit. ${result.balanceAfter} left.` });
    res.redirect('/api/buildbase');
  } catch (err) {
    if (err.code === 'INSUFFICIENT_CREDITS') {
      req.flash('errors', { msg: 'Out of credits. Grant some to this workspace in the BuildBase console, or sell them with a credit package.' });
      return res.redirect('/api/buildbase');
    }
    next(err);
  }
};
