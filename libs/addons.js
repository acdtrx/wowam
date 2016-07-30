var fs = require( 'fs-extra' );
var unzip = require( 'unzip' );
var path = require( 'path' );
var async = require( 'async' );

var wow_path = process.env['WOWPATH'] || '/Applications/World of Warcraft';
var addons_path = path.join( wow_path , 'Interface' , 'AddOns' );

module.exports = function( _source ) {
  var addons_details = {};

  function load_details( _cb ) {
    var data = fs.readFileSync( path.join( addons_path , 'wam.json' ) );
    if ( !data ) {
      // file not found
    } else {
      try {
        addons_details = JSON.parse( data );
      } catch( e ) {
        addons_details = {};
      }
    }
  }

  function save_details(  ) {
    fs.writeFile( path.join( addons_path , 'wam.json' ) , JSON.stringify( addons_details , null , 2 ) , ( _err ) => {
      return;
    } );
  }

  load_details( );

  function _install( _zipfile , _cb ) {
    var dirs = [];
    fs.createReadStream( _zipfile )
      .pipe( unzip.Parse() )
      .on('entry' , ( _entry ) => {
        if ( _entry.type === 'File' ) {
          var output_filename = path.join( addons_path , _entry.path );
          var addon_dir = _entry.path.split( path.sep )[0];
          if ( dirs.indexOf( addon_dir ) === -1 ) {
            dirs.push( addon_dir );
          }
          fs.ensureDirSync( path.dirname( output_filename ) );
          _entry.pipe( fs.createWriteStream( output_filename ) );
        } else {
          _entry.autodrain();
        }
      } )
      .on( 'close' , () => {
        _cb( null , dirs );
      } );
  }

  function af_update( _addon_data ) {
    addons_details[ _addon_data.key ] = _addon_data;
    save_details( );
  }

  function af_remove( _addon_data ) {
    delete( addons_details[ _addon_data.key ] );
    save_details();
  }

  var api = {};

  api.download = function( _addon , _output , _cb ) {
    _source.download( _addon , _output , _cb );
  }

  api.install = function( _addon , _cb ) {
    _source.download_tmp( _addon , ( _err , _addon_data ) => {
      if ( _err ) {
        return _cb( _err );
      } else {
        console.log( 'Downloaded' , _addon_data.name , _addon_data.version );
        // install it
        _install( _addon_data.local_file , ( _err , _dirs ) => {
          _addon_data.local_dirs = _dirs;
          af_update( _addon_data );
          fs.remove( _addon_data.local_file );
          console.log( 'Installed' , _addon_data.name , _addon_data.version );
          _cb( null );
        } );
      }
    } );
  }

  api.uninstall = function( _addon_name , _cb ) {
    if ( addons_details[ _addon_name ] ) {
      var dirs = addons_details[ _addon_name ].local_dirs;
      for( var i in dirs ) {
        console.log( 'Removing' , dirs[ i ] );
        fs.remove( path.join( addons_path , dirs[ i ] ) );
      }
      af_remove( addons_details[ _addon_name ] );
      _cb( null );
    } else {
      _cb( {err: -1 , desc: 'addon not found' } );
    }
  }

  api.info = function( _addon , _cb ) {
    _source.get_details( _addon , _cb );
  }

  api.update_all = function( _cb ) {
    async.eachSeries( addons_details , ( _orig_data , _cb ) => {
      _source.get_details( _orig_data.key , ( _err , _addon_data ) => {
        if ( _err ) {
          _cb( _err );
        } else {
          if ( _orig_data.version === _addon_data.version ) {
            console.log( _orig_data.name , 'up to date' );
            _cb( null );
          } else {
            console.log( _orig_data.name , _addon_data.version , 'available' );
            api.uninstall( _orig_data.key , ( _err ) => {
              api.install( _orig_data.key , _cb );
            } );
          }
        }
      } );
    } , ( _err ) => {
      _cb( _err );
    } );
  }

  return api;
}
