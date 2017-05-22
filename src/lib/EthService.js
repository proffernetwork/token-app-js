var rp = require('request-promise-native');
const WebSocket = require('ws');
const Logger = require('./Logger');
const SOFA = require('sofa-js');
const numberToBN = require('number-to-bn');

function getUrl(path, proto) {
  var endpoint;
  if (!proto) proto = 'https';
  if (process.env['STAGE'] == 'development') {
    endpoint = proto + '://token-eth-service-development.herokuapp.com';
  } else {
    endpoint = proto + '://token-eth-service.herokuapp.com';
  }
  return endpoint + path;
}

class EthService {
  static getBalance(address) {
    return rp(getUrl('/v1/balance/' + address))
      .then((body) => {
        return numberToBN(JSON.parse(body).unconfirmed_balance);
      })
      .catch((error) => {
        console.log("Error getting balance for '" + address + "': " + error);
      });
  }

  constructor(signing_key) {
    this.signing_key = signing_key;
    this.ws = null;
  }

  subscribe(address, callback) {
    if (!this.ws) {
      this.jsonrpc_id = 0;
      let timestamp = parseInt(new Date().getTime() / 1000);
      let data =
          "GET" + "\n" +
          "/v1/ws" + "\n" +
          timestamp + "\n";
      let sig = this.signing_key.sign(data);
      this.ws = new WebSocket(getUrl('/v1/ws', 'wss'), [], {
        headers: {
          'Token-ID-Address': this.signing_key.address,
          'Token-Timestamp': timestamp,
          'Token-Signature': sig
        }
      });
      this.ws.on('open', () => {
        var jsonrpcid = this.jsonrpc_id = this.jsonrpc_id + 1;
        var message = JSON.stringify({
          "jsonrpc": "2.0",
          "id": this.jsonrpc_id,
          "method": "subscribe",
          "params": [address]
        });
        this.ws.send(message);
      });
      this.ws.on('message', (message) => {
        message = JSON.parse(message);
        if (message['method'] && message['method'] == 'subscription') {
          let sofa = SOFA.parse(message['params']['message']);
          Logger.receivedMessage(sofa);
          callback(sofa);
        }
      });
    }
  }
}



module.exports = EthService;
