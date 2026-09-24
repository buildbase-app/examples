// Modified from sahat/hackathon-starter: BuildBase owns sign-in, so the
// password, reset, email-verification, email-link, 2FA and passkey fields are
// gone. What stays is this app's own data: the profile, and the provider
// accounts linked to call their APIs from the API examples.
const crypto = require('node:crypto');
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    /** The BuildBase user ID. Every sign-in finds the user by it. */
    buildbase: { type: String, unique: true, sparse: true },
    email: { type: String, unique: true, required: true },

    discord: String,
    facebook: String,
    github: String,
    google: String,
    linkedin: String,
    microsoft: String,
    quickbooks: String,
    steam: String,
    tumblr: String,
    twitch: String,
    x: String,

    tokens: Array,

    profile: {
      name: String,
      gender: String,
      location: String,
      website: String,
      picture: String,
      pictureSource: String,

      pictures: {
        type: Map,
        of: String,
      },
    },
  },
  { timestamps: true },
);

// Helper method for getting gravatar
userSchema.methods.gravatar = function gravatarUrl(size) {
  if (!size) {
    size = 200;
  }
  if (!this.email) {
    return `https://gravatar.com/avatar/00000000000000000000000000000000?s=${size}&d=retro`;
  }
  const sha256 = crypto.createHash('sha256').update(this.email).digest('hex');
  return `https://gravatar.com/avatar/${sha256}?s=${size}&d=retro`;
};

userSchema.pre('save', function updateGravatarOnEmailChange() {
  if (!this.isModified('email')) return;
  if (!this.profile.pictures) {
    this.profile.pictures = new Map();
  }
  if (!this.profile.pictureSource) {
    this.profile.pictureSource = 'gravatar';
  }
  const url = this.gravatar();
  this.profile.pictures.set('gravatar', url);
  if (this.profile.pictureSource === 'gravatar') {
    this.profile.picture = url;
  }
});

const User = mongoose.model('User', userSchema);

module.exports = User;
