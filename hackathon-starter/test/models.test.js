const { expect } = require('chai');
const sinon = require('sinon');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const User = require('../models/User');

describe('User Model', () => {
  let mongoServer;

  before(async () => {
    // Close any existing connections
    await mongoose.disconnect();

    // Create new mongo instance
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();

    // Configure mongoose to not wait for other connections
    const mongooseOpts = {
      autoIndex: false,
      connectTimeoutMS: 10000,
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 20000,
    };

    await mongoose.connect(mongoUri, mongooseOpts);
  });

  beforeEach(async () => {
    // Drop the entire database between tests
    if (mongoose.connection.db) {
      await mongoose.connection.db.dropDatabase();
    }
    await User.createIndexes();
  });

  afterEach(() => {
    sinon.restore();
  });

  after(async () => {
    if (mongoose.connection) {
      await mongoose.connection.close();
    }
    if (mongoServer) {
      await mongoServer.stop();
    }
  });

  it('should create a new user', (done) => {
    const UserMock = sinon.mock(new User({ email: 'test@gmail.com', password: 'root' }));
    const user = UserMock.object;

    UserMock.expects('save').yields(null);

    user.save((err) => {
      UserMock.verify();
      UserMock.restore();
      expect(err).to.be.null;
      done();
    });
  });

  it('should return error if user is not created', (done) => {
    const UserMock = sinon.mock(new User({ email: 'test@gmail.com', password: 'root' }));
    const user = UserMock.object;
    const expectedError = {
      name: 'ValidationError',
    };

    UserMock.expects('save').yields(expectedError);

    user.save((err, result) => {
      UserMock.verify();
      UserMock.restore();
      expect(err.name).to.equal('ValidationError');
      expect(result).to.be.undefined;
      done();
    });
  });

  it('should not create a user with the unique email', (done) => {
    const UserMock = sinon.mock(User({ email: 'test@gmail.com', password: 'root' }));
    const user = UserMock.object;
    const expectedError = {
      name: 'MongoError',
      code: 11000,
    };

    UserMock.expects('save').yields(expectedError);

    user.save((err, result) => {
      UserMock.verify();
      UserMock.restore();
      expect(err.name).to.equal('MongoError');
      expect(err.code).to.equal(11000);
      expect(result).to.be.undefined;
      done();
    });
  });

  it('should find user by email', (done) => {
    const userMock = sinon.mock(User);
    const expectedUser = {
      _id: '5700a128bd97c1341d8fb365',
      email: 'test@gmail.com',
    };

    userMock.expects('findOne').withArgs({ email: 'test@gmail.com' }).yields(null, expectedUser);

    User.findOne({ email: 'test@gmail.com' }, (err, result) => {
      userMock.verify();
      userMock.restore();
      expect(result.email).to.equal('test@gmail.com');
      done();
    });
  });

  it('should remove user by email', (done) => {
    const userMock = sinon.mock(User);
    const expectedResult = {
      nRemoved: 1,
    };

    userMock.expects('deleteOne').withArgs({ email: 'test@gmail.com' }).yields(null, expectedResult);

    User.deleteOne({ email: 'test@gmail.com' }, (err, result) => {
      userMock.verify();
      userMock.restore();
      expect(err).to.be.null;
      expect(result.nRemoved).to.equal(1);
      done();
    });
  });

  it('should generate gravatar without email and size', () => {
    const UserMock = sinon.mock(new User({}));
    const user = UserMock.object;

    const gravatar = user.gravatar();
    const { host } = new URL(gravatar);
    expect(host).to.equal('gravatar.com');
  });

  it('should generate gravatar with size', () => {
    const UserMock = sinon.mock(new User({}));
    const user = UserMock.object;
    const size = 300;

    const gravatar = user.gravatar(size);
    expect(gravatar.includes(`s=${size}`)).to.equal(true);
  });

  it('should generate gravatar with email', () => {
    const UserMock = sinon.mock(new User({ email: 'test@gmail.com' }));
    const user = UserMock.object;
    const sha256 = '87924606b4131a8aceeeae8868531fbb9712aaa07a5d3a756b26ce0f5d6ca674';

    const gravatar = user.gravatar();
    expect(gravatar.includes(sha256)).to.equal(true);
  });

  describe('Gravatar URL Generation', () => {
    it('should generate default gravatar URL when email is missing', () => {
      const user = new User();
      const url = user.gravatar(200);
      expect(url).to.include('00000000000000000000000000000000');
    });

    it('Scenario 1: Gravatar generation when email is present - after save', async () => {
      const user = new User({
        email: 'test@gmail.com',
        password: 'password123',
      });

      await user.save();

      const sha256 = '87924606b4131a8aceeeae8868531fbb9712aaa07a5d3a756b26ce0f5d6ca674';

      expect(user.profile.pictures).to.be.instanceOf(Map);
      expect(user.profile.pictures.get('gravatar')).to.include(sha256);
      expect(user.profile.pictureSource).to.equal('gravatar');
      expect(user.profile.picture).to.include(sha256);
    });

    it('Scenario 2: Gravatar update on email change', async () => {
      const user = new User({
        email: 'user1@example.com',
        password: 'password123',
      });

      await user.save();

      const originalGravatar = user.profile.pictures.get('gravatar');
      expect(user.profile.picture).to.equal(originalGravatar);

      // Change email
      user.email = 'user2@example.com';
      await user.save();

      const newGravatar = user.profile.pictures.get('gravatar');
      expect(newGravatar).to.not.equal(originalGravatar);
      expect(user.profile.picture).to.equal(newGravatar);
    });

    it('Scenario 4: Preserve non-gravatar pictureSource', async () => {
      const user = new User({
        email: 'test@example.com',
        password: 'password123',
        profile: {
          pictureSource: 'facebook',
          picture: 'https://facebook/pic.jpg',
        },
      });

      await user.save();

      expect(user.profile.pictures.get('gravatar')).to.include(user.gravatar());
      expect(user.profile.picture).to.equal('https://facebook/pic.jpg');
      expect(user.profile.pictureSource).to.equal('facebook');
    });

    it('Scenario 7: Map persistence', async () => {
      const user = new User({
        email: 'maptest@example.com',
        password: 'password123',
      });

      await user.save();

      const reloaded = await User.findById(user._id);

      expect(reloaded.profile.pictures).to.be.instanceOf(Map);
      expect(reloaded.profile.pictures.get('gravatar')).to.include(user.gravatar());
    });

    it('Scenario 8: No duplicate gravatar entries', async () => {
      const user = new User({
        email: 'noduplicate@example.com',
        password: 'password123',
      });

      await user.save();
      const initialSize = user.profile.pictures.size;

      // Save again without changing email
      await user.save();

      expect(user.profile.pictures.size).to.equal(initialSize);
      expect(user.profile.pictures.get('gravatar')).to.include(user.gravatar());
    });
  });
});
