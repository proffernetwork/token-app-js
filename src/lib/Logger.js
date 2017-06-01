const wrap = require('word-wrap');
const chalk = require('chalk');
const BN = require('bn.js');
const unit = require('ethjs-unit');

// NOTE: If these things also depend on Logger they get caught in a dependency loop,
// this is a hacky way to break that loop
let Fiat;
let IdService;
setTimeout(() => {
  Fiat = require('./Fiat');
  IdService = require('./IdService');
});


chalk.enabled = true;

function mapLines(s, f) {
  if (s == null) { s = "null" }
  return s.split('\n').map(f)
}

const _log_levels = {
  'DEBUG': 10,
  'INFO': 20,
  'WARN': 30,
  'WARNING': 30,
  'ERROR': 40,
  'FATAL': 50,
  'CRITICAL': 50,
  'OFF': 100
};

const LOG_LEVEL = _log_levels[process.env['LOG_LEVEL'] || 'INFO'];

function formatName(user) {
  if (!user) {
    return "<Unknown>";
  } else if (user.name) {
    return user.name + " (@" + user.username + ")";
  } else {
    return "@" + user.username;
  }
}

class Logger {

  static sentMessage(sofa, user, fiat) {
    if (!sofa) return Logger.error("Tried to send invalid SOFA message");
    // prepare defaults for promise based inputs
    if (typeof user == 'string') { return IdService.getUser(user).then((user) => { Logger.sentMessage(sofa, user, fiat); }); }
    if (sofa.type == 'PaymentRequest' && !fiat) { return Fiat.fetch().then((fiat) => { Logger.sentMessage(sofa, user, fiat); }); }

    // actual logging
    Logger.log(Logger.color('\u21D0  ', "Sent '" + sofa.type + "' to " + formatName(user), chalk.green));
    if (sofa.type == 'Message') {
      Logger.log(Logger.color('\u21D0  ', sofa.display, chalk.green));
    } else if (sofa.type == 'PaymentRequest') {
      Logger.log(Logger.color('\u21D0  ', "To address:  " + sofa.destinationAddress, chalk.green));
      Logger.log(Logger.color('\u21D0  ', "Value (USD): $" + fiat.USD.fromEth(unit.fromWei(sofa.value, 'ether')), chalk.green));
      Logger.log(Logger.color('\u21D0  ', "Value (ETH): " + unit.fromWei(sofa.value, 'ether'), chalk.green));
    } else {
      Logger.log(Logger.colorPrefix('\u21D0  ', wrap(sofa.string, {width: 60, cut: true}), chalk.green, chalk.grey));
    }
    Logger.log('\n');
  }

  static receivedMessage(sofa, user) {
    if (!sofa) return Logger.error("Received invalid SOFA message");
    // prepare defaults for promise based inputs
    if (typeof user == 'string') { return IdService.getUser(user).then((user) => { Logger.receivedMessage(sofa, user); }); }

    // actual logging
    Logger.log(Logger.color('\u21D2  ', "Received '" + sofa.type + "' from " + formatName(user), chalk.yellow));
    if (sofa.type == 'Message') {
      Logger.log(Logger.color('\u21D2  ', sofa.display, chalk.yellow));
    } else {
      Logger.log(Logger.colorPrefix('\u21D2  ', wrap(sofa.string, {width: 60, cut: true}), chalk.yellow, chalk.grey));
    }
    Logger.log('\n');
  }

  static receivedPaymentUpdate(sofa, user, direction) {
    if (typeof user == 'string') { return IdService.getUser(user).then((user) => { Logger.receivedPaymentUpdate(sofa, user, direction); }); }
    let icon;
    let header;
    let colour;
    if (direction == "in") {
      icon = "\u21D2";
      header = "Received From: ";
      colour = chalk.yellow;
    } else {
      icon = "\u21D0";
      header = "Sent To:       ";
      colour = chalk.green;
    }
    let name = formatName(user);

    Fiat.fetch().then((fiat) => {
      Logger.log(Logger.color(icon + '  ', "Payment Update", colour));
      Logger.log(Logger.color(icon + '  ', header + name, colour));
      Logger.log(Logger.color(icon + '  ', "Status:        " + sofa.status, colour));
      Logger.log(Logger.color(icon + '  ', "Value (USD):   $" + fiat.USD.fromEth(unit.fromWei(sofa.value, 'ether')), colour));
      Logger.log(Logger.color(icon + '  ', "Value (ETH):   " + unit.fromWei(sofa.value, 'ether'), colour));
    });
  }

  static error(message) {
    if (LOG_LEVEL >= _log_levels['ERROR']) {
      Logger.log(Logger.color('***  ', wrap(message, {width: 60, cut: true}), chalk.red));
      Logger.log('\n');
    }
  }

  static color(prefix, message, color) {
    let lines = mapLines(message, (x) => { return color(prefix + x) });
    return lines.join('\n');
  }

  static colorPrefix(prefix, message, color, color2) {
    let lines = mapLines(message, (x) => { return color(prefix) + color2(x) });
    return lines.join('\n');
  }

  static info(message) {
    if (LOG_LEVEL <= _log_levels['INFO']) {
      Logger.log(message);
    }
  }

  static debug(message) {
    if (LOG_LEVEL <= _log_levels['DEBUG']) {
      Logger.log(message);
    }
  }

  static log(o) {
    console.log(o);
  }

}

module.exports = Logger;
