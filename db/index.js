import mongoose from 'mongoose';
mongoose.Promise = global.Promise;

class DB {
  constructor() {
    mongoose.connect(process.env.MONGO_URL);
    this._bindListeners();
    this._createModels();
  }

  _bindListeners() {
    const connection = mongoose.connection;
    connection.on('error', console.error.bind(console, 'connection error:'));
  }

  _createModels() {
    this.User = mongoose.model('User', mongoose.Schema({
      companion: Number,
      isWaiting: Boolean,
      uid: Number,
    }));
  }

  /**
   *
   * @param {number} uid
   * @returns {Promise}
   * @private
   */
  _checkIfUserExists(uid) {
    return new Promise((resolve, reject) => {
      this.User.findOne({ uid }).then((result) => {
        if (result) {
          return resolve(result)
        }

        reject();
      });
    });
  }

  checkUserHasCompanion(uid) {
    return new Promise((resolve, reject) => {
      this.User.findOne({uid, companion: {$gt: 0}}).then((result) => {
        if (!result) {
          return reject();
        }

        resolve(result);
      });
    });
  }

  /**
   *
   * @param {number} uid
   * @param {boolean} isWaiting
   * @returns {Promise}
   */
  createUser(uid, isWaiting = false) {
    return this._checkIfUserExists(uid).then((user) => user, () => {
      return new this.User({companion: 0, isWaiting, uid}).save();
    });
  }

  /**
   *
   * @param {number} uid
   * @returns {Promise}
   */
  getAvailableUsers(uid) {
    return new Promise((resolve, reject) => {
      this.User.find({isWaiting: true, uid: {$ne: uid}}).then((result) => {
        if (!result.length) {
          return reject();
        }

        resolve(result);
      });
    });
  }

  /**
   *
   * @param {number} uid
   * @param {number} cuid
   * @returns {Promise}
   */
  setUserCompanion(uid, cuid) {
    return new Promise((resolve, reject) => {
      this.User.update({ uid }, {$set: {companion: cuid}}).then(resolve, reject);
    });
  }

  /**
   *
   * @param {number} uid
   * @returns {Promise}
   */
  userChangedCompanion(uid) {
    var resetUsersCompanion = () => {
      return this.User.findOne({ uid }).then((user) => {
        this.User.update({ uid: user.companion }, {$set: {companion: 0}}).exec();
        this.User.update({ uid }, {$set: {companion: 0}}).exec();
        return user.companion;
      });
    };

    return this._checkIfUserExists(uid).then(resetUsersCompanion, () => {
      this.createUser(uid, true).then(() => {
        return resetUsersCompanion();
      })
    });
  }

  /**
   *
   * @param {number} uid
   * @returns {Promise}
   */
  userIsWaitingForCompanion(uid) {
    return new Promise((resolve, reject) => {
      const setUserIsWaiting = () => {
        this.User.update({ uid }, {$set: {isWaiting: true}}).then(resolve, reject);
      };

      this._checkIfUserExists(uid).then(setUserIsWaiting, () => {
        this.createUser(uid, true).then(() => {
          setUserIsWaiting();
        })
      });
    });
  }
}

const db = new DB();

export default db;
