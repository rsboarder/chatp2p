import _ from 'lodash';
import bot from '../bot';
import db from '../db';

class BotCommands {
  constructor() {
    this.SYSTEM_COMMANDS = [
      'Найти собеседника',
      'Сменить собеседника',
      '/start',
    ];
    this._bindListeners();
  }

  _bindListeners() {
    bot.on('message', (message) => {
      const filterSystemMessagesRegexp = new RegExp(`^(${this.SYSTEM_COMMANDS[2]})`, 'i');
      if (message.text && filterSystemMessagesRegexp.test(message.text)) {
        return this.handleStartCommand(message);
      }

      const findCompanionRegexp = new RegExp(`^${this.SYSTEM_COMMANDS[0]}`, 'i');
      if (message.text && findCompanionRegexp.test(message.text)) {
        return this.handleFindCompanionCommand(message);
      }

      const changeCompanionRegexp = new RegExp(`^${this.SYSTEM_COMMANDS[1]}`, 'i');
      if (message.text && changeCompanionRegexp.test(message.text)) {
        return this.handleChangeCompanionCommand(message);
      }

      const uid = message.from.id;

      db.checkUserHasCompanion(uid).then((user) => {
        const {messageToSend, sendMethod} = this._getMessageAndSendMethod(message);

        if (messageToSend.latitude) {
          bot[sendMethod](user.companion, messageToSend.latitude, messageToSend.longitude);
        } else {
          bot[sendMethod](user.companion, messageToSend);
        }
      }, () => {
        bot.sendMessage(uid, '_Бот_: к сожалению, у вас не собеседников');
      });
    });
  }

  handleChangeCompanionCommand(message) {
    db.userChangedCompanion(message.from.id).then((prevCompanionId) => {
      if (prevCompanionId === 0) { return; }
      bot.sendMessage(prevCompanionId, '_Бот_: связь с собеседником потеряна...');
    }).catch((error) => console.log(error));
  }

  handleStartCommand(message) {
    const {from} = message;

    db.createUser(from.id);
    bot.sendMessage(from.id, 'Выберите действие:', {
      reply_markup: JSON.stringify({
        force_reply: true,
        keyboard: [['Найти собеседника'], ['Сменить собеседника']]
      }),
    });
  }

  handleFindCompanionCommand(message) {
    const uid = message.from.id;
    bot.sendMessage(uid, '_Бот_: ищу собеседника...');

    db.userIsWaitingForCompanion(uid).then(() => {
      db.getAvailableUsers(uid).then((availableUsers) => {
        const randomUser = availableUsers[Math.floor(Math.random() * availableUsers.length)];
        const promises = [
          db.setUserCompanion(randomUser.uid, uid),
          db.setUserCompanion(uid, randomUser.uid),
        ];

        Promise.all(promises).then(() => {
          const text = '_Бот_: я нашел тебе собеседника! Можешь начать с ним общаться.';
          bot.sendMessage(uid, text);
          bot.sendMessage(randomUser.uid, text);
        }, (error) => console.log(error));
      }, () => {
        bot.sendMessage(uid, '_Бот_: к сожалению, все участники заняты...');
      });
    });
  }

  _getMessageAndSendMethod(message) {
    let sendMethod = 'sendMessage';
    let messageToSend = _.get(message, 'text');

    if (message.audio) {
      messageToSend = _.get(message, 'audio');
      sendMethod = 'sendAudio';
    }

    if (message.document) {
      messageToSend = _.get(message, 'document.file_id');
      sendMethod = 'sendDocument';
    }

    if (message.photo) {
      messageToSend = _.get(message, 'photo[0].file_id');
      sendMethod = 'sendPhoto';
    }

    if (message.sticker) {
      messageToSend = _.get(message, 'sticker.file_id');
      sendMethod = 'sendSticker';
    }

    if (message.location) {
      messageToSend = _.get(message, 'location');
      sendMethod = 'sendLocation';
    }

    if (message.video) {
      messageToSend = _.get(message, 'video');
      sendMethod = 'sendVideo';
    }

    if (message.voice) {
      messageToSend = _.get(message, 'voice.file_id');
      sendMethod = 'sendVoice';
    }

    return {messageToSend, sendMethod};
  }
}

new BotCommands();
