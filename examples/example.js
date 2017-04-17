var OLX = require('../searcher');

const opts = {
  'url'      : 'https://guayas.olx.com.ec/nf/search/great%20wall/',//'https://guayas.olx.com.ec/nf/search/kia%20rio/',
  'page'     : 1,
  'pages'    : 20
};

var olx = new OLX(opts);

olx.on('hit', function(hit) {
  console.log(hit);
});

olx.on('page', function(data) {
  console.log(data);
});

olx.start();
