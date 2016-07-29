var fs = require( 'fs' );
var path = require( 'path' );
var os = require( 'os' );

var request = require( 'request' ).defaults( { jar : true } );

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
    request( download_page_url , ( _err , _response , _body ) => {
      if ( _response ) {
        if ( _response.statusCode !== 200 ) {
          // addon not found
          return _cb( { code: -1 , desc: 'Addon not found.' } );
        } else {
          // parse the body
          var details = {};
          details.key = _name.toLowerCase();
          get_addon_meta( _body , details );
          get_addon_dl( _body , details );

          return _cb( null , details );
        }
      } else {
        return _cb( {code: -2 , desc: 'No response.' , link: download_page_url } );
      }
    } );
  },

  download: function( _name , _dest , _cb ) {
    api.get_details( _name , ( _err , _data ) => {
      if ( _err ) {
        return _cb( _err );
      } else {
        var download_name = path.join( _dest , _data.name + '-' + _data.version + '.zip' );
        _data.local_file = download_name;
        var output = fs.createWriteStream( download_name );
        output.on( 'close' , () => {
          _cb( null , _data );
        } );
        request( _data.link ).pipe( output );
      }
    } );
  },

  download_tmp: function( _name , _cb ) {
    api.download( _name , os.tmpdir() , _cb );
  }
};

module.exports = api;
