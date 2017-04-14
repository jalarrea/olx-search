var OLX = require('../searcher');

const opts = {
  'url'      : 'https://guayas.olx.com.ec/nf/search/fiat%20uno/',
  'page'     : 1,
  'pages'    : 10
};

var olx = new OLX(opts);

olx.on('hit', function(hit) {
  console.log(hit);
});

olx.on('page', function(data) {
  console.log(data);
});

olx.start();
