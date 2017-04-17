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
    this.data = [];
  }

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

    this.gunzipJSON(response, () => {
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

    gunzip.on('data', (data) => {
      bulk += data.toString();
    });

    gunzip.on('end',() => {
      const $ = cheerio.load(bulk);
      let info = {};
      try{
        info = JSON.parse($('#item_index_view').attr('data-item'));
        self.data.push(info);
      }catch(exc){
        console.error(exc);
      }finally{
        cb(info);
      }
    });
    responseResult.pipe(gunzip);
  }

  gunzipJSON(response, cb){
    const self = this;
    const gunzip = zlib.createGunzip();
    let bulk = "";

    gunzip.on('data', (data) => {
      bulk += data.toString();
    });

    gunzip.on('end', () => {
      var $ = cheerio.load(bulk);
      $('.item').each(function(){
         var url = 'https:'+($(this).find('a').attr('href'));
         var img = $(this).find('.items-image img').attr('src');
         self.scrapResult(url, (data) => {
           const frecuency = self.compressFrecuency();


           const filterByDiffInDays = frecuency.map((d)=>{

             const data = d.data.map((dt)=>({
                url          : `https:${dt.slug}`,
                price        : dt.price != null ? dt.price.amount : '',
                anio         : dt.optionals&&dt.optionals.length>1?dt.optionals[0].value:'',
              //  displayPrice : dt.price != null ? dt.price.displayPrice : '',
                date         : dt.date.diffInDays
             }))
             .sort((a, b)=>( b.date-a.date))

            return {
               username: d.username,
               frecuency: d.data.length,
               moreOld:data[0],
              // urls:data[0]
            }
          }).
          sort((a, b)=>(
            b.moreOld.price - a.moreOld.price
          ));


           console.log('FRECUENCY',JSON.stringify(filterByDiffInDays, null, 2))
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

  compressFrecuency(){
    var self = this;

    let compressObject = {};
    self.data.forEach((item)=>{
      if(!compressObject[item.user.username]){
        compressObject[item.user.username] = [];
      }
      compressObject[item.user.username].push(item);
    });
    return Object.keys(compressObject).map((username)=>{
      return {
        username: username,
        data    : compressObject[username]
      }
    }).sort((b, a)=>b.data.length - a.data.length);
  }
}

util.inherits(Searcher, EventEmitter);

module.exports = Searcher;
