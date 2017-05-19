var rp = require('request-promise-native');
const numberToBN = require('number-to-bn');

function getUrl(path) {
  var endpoint;
  if (process.env['STAGE'] == 'development') {
    endpoint = 'https://token-eth-service-development.herokuapp.com';
  } else {
    endpoint = 'https://token-eth-service.herokuapp.com';
  }
  return endpoint + path;
}

function getBalance(address) {
  console.log("getting balance for " + address);
  return rp(getUrl('/v1/balance/' + address))
    .then((body) => {
      return numberToBN(JSON.parse(body).unconfirmed_balance);
    })
    .catch((error) => {
      console.log("Error getting balance for '" + address + "': " + error);
    });
}

module.exports = { getBalance: getBalance };
