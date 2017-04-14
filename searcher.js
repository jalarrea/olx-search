const request = require('request')
const zlib = require('zlib')
const cheerio = require('cheerio')
const util = require('util')
const EventEmitter = require('events').EventEmitter

class Searcher {
  constructor(options) {
    if (options.url) {
      this.url = options.url;
    } else {
      this.category = options.category;
      this.search = options.search;
    }
    this.page = options.page || 1;
    this.pages = options.pages || -1;
  }

  //sys.inherits(Searcher, events.EventEmitter);

  start(){
    this.scrapPage();
  }

  single(page){
    this.page = page || this.page;
    this.scrapPage(true);
  }

  prepURL(){
    var url = this.url || 'https://www.olx.com.ec/';
    if(!this.url) {
      if (this.search) {
        url = 'https://www.olx.com.ec/nf/';
      }

      url += this.category + '-p-' + this.page + '/search/' + (this.search || '');
    } else {
      url += '-p-' + this.page;
    }
    return url;
  }

  scrapPage(single){
    var self = this;

    var url = this.prepURL();

    var options = {
      method: 'GET',
      url: url,
      headers: {
        'Accept-Encoding': 'gzip',
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_9_2) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/33.0.1750.117 Safari/537.36'
      }
    }

    var response = request(options);

    this.gunzipJSON(response,() => {
      self.emit('page', {
        'page': self.page
      });
      if(!single && (self.pages - self.page >= 0 || self.pages === -1)) {
        setTimeout(() => {
          self.page++;
          self.scrapPage();
        }, 1000);
      }
    });
  }

  scrapResult(url, cb){
    var self = this;
    var options = {
      method: 'GET',
      url: url,
      headers: {
        'Accept-Encoding': 'gzip',
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_9_2) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/33.0.1750.117 Safari/537.36'
      }
    };
    var responseResult = request(options);
    var gunzip = zlib.createGunzip();
    var bulk = "";

    gunzip.on('data', (data)=>{
      bulk += data.toString();
    });

    gunzip.on('end',()=>{
      const $ = cheerio.load(bulk);
      let info = $('#item_index_view').attr('data-item');
      cb(info);
    });
    responseResult.pipe(gunzip);
  }

  gunzipJSON(response, cb){
    const self = this;
    const gunzip = zlib.createGunzip();
    let bulk = "";

    gunzip.on('data', (data)=>{
      bulk += data.toString();
    });

    gunzip.on('end', ()=>{
      const $ = cheerio.load(bulk);
      $('.item').each(function() {
        //  var title = $(this).find('.items-info').find("h3").text();
        //  var location = $(this).find('.items-info').find(".displayLocation").text().replace("en ", "");
        //  var price = $(this).find('.items-price').text().replace('\n','').trim();
        //      regex = /\$\s*[0-9,]+(?:\s*\.\s*\d{2})?/g,
        //      match = price.match(regex);
        //  if(match){
        //      match = match[0].replace(/\s/g,"");
        //      price = match;
        //  }
        //  var priceType = $(this).find('.items-price span').text().replace('\n','').trim();
         var url = 'https:'+($(this).find('a').attr('href'));
         var img = $(this).find('.items-image img').attr('src');

         self.scrapResult(url, (data) => {
           self.emit('hit', {
               'url'  : url,
               'image': img,
               'data' : data.length
           });
         });
       })
       cb();
    });

    response.pipe(gunzip);
  }
}

util.inherits(Searcher, EventEmitter);

module.exports = Searcher;
