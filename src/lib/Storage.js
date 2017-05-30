const url = require('url');
const pg = require('pg');
const sqlite3 = require('sqlite3');

function parse_psql_url(u) {
  let params = url.parse(u);
  let auth = params.auth.split(':');
  return {
    user: auth[0],
    password: auth[1],
    host: params.hostname,
    port: params.port,
    database: params.pathname.split('/')[1],
    max: 5,
    idleTimeoutMillis: 30000
  };
}

class PSQLStore {

  constructor(config) {
    if (typeof config === 'object') {
      if (config.url) {
        config = parse_psql_url(config.url);
      }
    } else if (typeof config === 'string') {
      config = parse_psql_url(config);
    }
    this.config = config;
    this.pgPool = new pg.Pool(this.config);
    this.pgPool.on('error', function (err, client) {
      console.error('idle client error', err.message, err.stack)
    });
  }

  _execute(query, args, cb) {
    this.pgPool.connect((err, client, done) => {
      if (err) { return cb(err) }
      client.query(query, args, (err, result) => {
        done(err);
        if (err) { return cb(err) }
        cb(null, result);
      })
    })
  }


  loadBotSession(address, callback) {
    if (!callback) {
      console.warn("missing callback for storage load");
    }
    this._execute("SELECT * from bot_sessions WHERE eth_address = $1", [address], (err, result) => {
      if (err) { console.log(err) }
      if (!err && result.rows.length > 0) {
        callback(result.rows[0].data);
      } else {
        callback({
          address: address
        });
      }
    });
  }

  updateBotSession(address, data, callback) {
    let query = `INSERT INTO bot_sessions (eth_address, data)
                 VALUES ($1, $2)
                 ON CONFLICT (eth_address) DO UPDATE
                 SET data = $2`;
    this._execute(query, [address, data], (err, result) => {
      if (err) { console.log(err); }
    });
  }

  removeBotSession(address) {
    this._execute("DELETE from bot_sessions WHERE eth_address = $1", [address], (err, result) => {
      if (err) { console.log(err); }
    });
  }
}

function parse_sqlite_url(u) {
  if (u === 'sqlite://') {
    return {file: ':memory:'};
  } else {
    let p = u.slice(9);
    if (p[0] == '/') {
      p = p.slice(1);
    }
    return {file: p};
  }
}

class SqliteStore {

  constructor(config) {
    if (typeof config === 'object') {
      if (config.url) {
        config = parse_sqlite_url(config.url);
      }
    } else if (typeof config === 'string') {
      config = parse_sqlite_url(config);
    }
    this.config = config;
    this.db = new sqlite3.Database(this.config.file);
  }

  _execute(query, args, cb) {

  }


  loadBotSession(address, callback) {
    if (!callback) {
      console.warn("missing callback for storage load");
    }
    this.db.get("SELECT * from bot_sessions WHERE eth_address = ?", [address], (err, result) => {
      if (err) { console.log(err) }
      if (!err && result && result.data) {
        result = JSON.parse(result.data);
        callback(result);
      } else {
        callback({
          address: address
        });
      }
    });
  }

  updateBotSession(address, data, callback) {
    data = JSON.stringify(data);
    this.db.get("SELECT 1 FROM bot_sessions WHERE eth_address = ?", [address], (err, result) => {
      if (err) { console.log(err); }
      else if (result) {
        // update
        this.db.run("UPDATE bot_sessions SET data = ? WHERE eth_address = ?", [data, address], (err, result) => {
          if (err) { console.log(err); }
          if (callback) { callback(); };
        });
      } else {
        // insert
        this.db.run("INSERT INTO bot_sessions (eth_address, data) VALUES (?, ?)", [address, data], (err, result) => {
          if (err) { console.log(err); }
          if (callback) { callback(); };
        });
      }
    });
  }

  removeBotSession(address, callback) {
    this.db.run("DELETE from bot_sessions WHERE eth_address = ?", [address], (err, result) => {
      if (err) { console.log(err); }
      if (callback) { callback(); };
    });
  }
}


module.exports = {
  PSQLStore: PSQLStore,
  SqliteStore: SqliteStore,
  parse_psql_url: parse_psql_url,
  parse_sqlite_url: parse_sqlite_url
}
