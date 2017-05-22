const redis = require('redis');
const SOFA = require('sofa-js');
const url = require('url')
const pg = require('pg');
const Config = require('./Config');
const Session = require('./Session');
const Logger = require('./Logger');
const Wallet = require('./Wallet');
const EthService = require('./EthService');
const IdService = require('./IdService');

const JSONRPC_VERSION = '2.0';
const JSONRPC_REQUEST_CHANNEL = '_rpc_request';
const JSONRPC_RESPONSE_CHANNEL = '_rpc_response';

class Client {
  constructor(bot) {
    this.bot = bot;
    this.rpcCalls = {};
    this.nextRpcId = 0;

    this.config = new Config(process.argv[2]);
    console.log("Address: "+this.config.address);

    let wallet = new Wallet(process.env["TOKEN_APP_SEED"]);
    let token_id_key = wallet.derive_path("m/0'/1/0");
    let payment_address_key = wallet.derive_path("m/0'/0/0");

    let params = url.parse(this.config.postgres.url);
    let auth = params.auth.split(':');
    let pgConfig = {
      user: auth[0],
      password: auth[1],
      host: params.hostname,
      port: params.port,
      database: params.pathname.split('/')[1],
      max: 5,
      idleTimeoutMillis: 30000
    };
    this.pgPool = new pg.Pool(pgConfig);
    this.pgPool.on('error', function (err, client) {
      console.error('idle client error', err.message, err.stack)
    })

    let redisConfig = {
      host: this.config.redis.host,
      port: this.config.redis.port,
      password: this.config.redis.password
    }

    this.subscriber = redis.createClient(redisConfig);
    this.rpcSubscriber = redis.createClient(redisConfig);
    this.publisher = redis.createClient(redisConfig);

    this.subscriber.on("error", function (err) {
        console.log("Error " + err);
    });
    this.rpcSubscriber.on("error", function (err) {
        console.log("Error " + err);
    });
    this.publisher.on("error", function (err) {
        console.log("Error " + err);
    });

    this.subscriber.on("message", (channel, message) => {
      try {
        let wrapped = JSON.parse(message);
        if (wrapped.recipient == this.config.address) {
          let session = new Session(this.bot, this.pgPool, this.config, wrapped.sender, () => {
            let sofa = SOFA.parse(wrapped.sofa);
            Logger.receivedMessage(sofa);

            if (sofa.type == "Init") {
              for(let k in sofa.content) {
                session.set(k, sofa.content[k]);
              }
              let held = session.get('heldForInit')
              if (held) {
                session.set('heldForInit', null)
                let heldSofa = SOFA.parse(held);
                this.bot.onClientMessage(session, heldSofa);
              }
            } else {
              if (!session.get('paymentAddress')) {
                console.log('User has not sent Init message, sending InitRequest')
                session.set('heldForInit', wrapped.sofa)
                session.reply(SOFA.InitRequest({
                  values: ['paymentAddress', 'language']
                }));
              } else {
                this.bot.onClientMessage(session, sofa);
              }
            }

          });
        }
      } catch(e) {
        console.log("On Message Error: "+e);
      }
    });
    this.subscriber.subscribe(this.config.address);

    this.rpcSubscriber.on("message", (channel, message) => {
      try {
        message = JSON.parse(message);
        if (message.jsonrpc == JSONRPC_VERSION) {
          let stored = this.rpcCalls[message.id];
          delete this.rpcCalls[message.id];
          let session = new Session(this.bot, this.pgPool, this.config, stored.sessionAddress, () => {
            stored.callback(session, message.error, message.result);
          });
        }
      } catch(e) {
        console.log("On RPC Message Error: "+e);
      }
    })
    this.rpcSubscriber.subscribe(this.config.address+JSONRPC_RESPONSE_CHANNEL);

    // eth service monitoring
    this.eth = new EthService(token_id_key);
    this.id = new IdService(token_id_key);
    this.eth.subscribe(payment_address_key.address, (sofa) => {
      let fut;
      if (sofa.fromAddress == payment_address_key.address) {
        // updating a payment sent from the bot
        fut = this.id.paymentAddressLookup(sofa.toAddress);
      } else if (sofa.toAddress == payment_address_key.address) {
        // updating a payment sent to the bot
        fut = this.id.paymentAddressLookup(sofa.fromAddress);
      } else {
        // this isn't actually interesting to us
        console.log('no matching addresses!');
        return;
      }
      fut.then((sender) => {
        // TODO: handle null session better?
        if (!sender) sender = "anonymous";
        let session = new Session(this.bot, this.pgPool, this.config, sender, () => {
          // TODO: send this somewhere!
          //this.bot.onClientMessage(session, sofa);
        });
      });

    });
  }

  send(address, message) {
    if (typeof message === "string") {
      message = SOFA.Message({body: message})
    }
    Logger.sentMessage(message);
    this.publisher.publish(this.config.address, JSON.stringify({
      sofa: message.string,
      sender: this.config.address,
      recipient: address
    }));
  }

  rpc(session, rpcCall, callback) {
    rpcCall.id = this.getRpcId();
    this.rpcCalls[rpcCall.id] = {sessionAddress: session.address, callback: callback};
    this.publisher.publish(this.config.address+JSONRPC_REQUEST_CHANNEL, JSON.stringify(rpcCall));
  }

  getRpcId() {
    let id = this.nextRpcId;
    this.nextRpcId += 1;
    return id.toString();
  }
}

module.exports = Client;
