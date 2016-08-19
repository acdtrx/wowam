var fs = require( 'fs' );
var path = require( 'path' );

var request = require( 'superagent' );

function get_addon_meta( _body , _details ) {
  var adr = /<span itemprop="title">([^<]+)<\/span>/g;
  var m;
  var c = 0;
  while ( m = adr.exec( _body ) ) {
    if ( c === 2 ) {
      _details.category = m[ 1 ];
    } else if ( c === 3 ) {
      _details.name = m[ 1 ];
    } else if ( c === 4 ) {
      _details.version = m[ 1 ];
    }
    c++;
  }
  return _details;
}

function get_addon_dl( _body , _details ) {
  var adr = /data-href="([^"]+)"/;
  var m;
  if ( ( m = adr.exec( _body ) ) ) {
    _details.link = m[ 1 ];
  }

  return _details;
}

var api = {
  get_details: function( _name , _cb ) {
    var download_page_url = 'http://mods.curse.com/addons/wow/' + _name + '/download';
    request( download_page_url , ( _err , _response ) => {
      if ( _response ) {
        if ( _response.statusCode !== 200 ) {
          // addon not found
          return _cb( { code: -1 , desc: 'Addon not found.' } );
        } else {
          // parse the body
          var details = {
            source: 'curse'
          };
          details.key = _name.toLowerCase();
          get_addon_meta( _response.text , details );
          get_addon_dl( _response.text , details );

          return _cb( null , details );
        }
      } else {
        return _cb( {code: -2 , desc: 'No response.' , link: download_page_url } );
      }
    } );
  },

  download: function( _addon , _dest , _cb ) {
    var download_name = path.join( _dest , _addon.name + '-' + _addon.version + '.zip' );
    _addon.local_file = download_name;
    var output = fs.createWriteStream( download_name );
    output.on( 'close' , () => {
      _cb( null , _addon );
    } );
    request( _addon.link ).pipe( output );
  },

  search: function( _name , _cb ) {
    var search_page_url = 'https://mods.curse.com/search?game-slug=wow&search=' + _name;
    request( search_page_url , ( _err , _response ) => {
      if ( _response ) {
        if ( _response.statusCode !== 200 ) {
          // addon not found
          return _cb( { code: -1 , desc: 'Error on server.' , link: search_page_url } );
        } else {
          var srcreg = /<a href="\/addons\/wow\/([^"]+)">([^<]+)<\/a>/g;
          var results = [];
          while( match = srcreg.exec( _response.text ) ) {
            results.push( { key: match[1] , name: match[2] } );
          }
          return _cb( null , results );
        }
      } else {
        return _cb( {code: -2 , desc: 'No response.' , link: search_page_url } );
      }
    } );
  }
};

module.exports = api;
