const ServiceClient = require('./ServiceClient');


function getUrl(path, proto) {
  var endpoint;
  if (!proto) proto = 'https';
  if (process.env['STAGE'] == 'development') {
    endpoint = proto + '://token-id-service-development.herokuapp.com';
  } else {
    endpoint = proto + '://token-id-service.herokuapp.com';
  }
  return endpoint + path;
}

class IdService {
  constructor(signing_key) {
    this.client = new ServiceClient(signing_key);
  }

  paymentAddressLookup(address) {
    // TODO: address lookup cache
    return this.client.fetch({
      url: getUrl('/v1/search/user?payment_address=' + address),
      json: true
    }).then((body) => {
      if (body.results.length > 0) {
        return body.results[0].token_id
      } else {
        return null;
      }
    });
  }
}

module.exports = IdService;
