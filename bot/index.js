import TelegramBot from 'node-telegram-bot-api';
import _ from 'lodash';

class Bot extends TelegramBot {
  sendMessage(userId, text, options) {
    this.sendChatAction(userId, 'typing').then(() => {
      super.sendMessage(userId, text, _.defaults(options, {parse_mode: 'markdown'}));
    });
  }
}

const bot = new Bot(process.env.BOT_TOKEN, {polling: true});

export default bot;
