var fs = require( 'fs-extra' );
var unzip = require( 'unzip' );
var path = require( 'path' );
var os = require( 'os' );
var async = require( 'async' );

var wow_path = process.env['WOWPATH'] || '/Applications/World of Warcraft';
var addons_path = path.join( wow_path , 'Interface' , 'AddOns' );
var wam_path = path.join( addons_path , 'wam.json' );

module.exports = function( _source ) {
  var addons_details = [];

  function load_details( _cb ) {
    try {
      addons_details = fs.readJSONSync( wam_path , { throws: false } );
    } catch( e ) {
      // file not found
      addons_details = [];
    }
  }

  function save_details(  ) {
    fs.writeJSON( wam_path , addons_details , {spaces: 2} , () => 0 );
  }

  load_details( );

  function _extract( _zipfile , _cb ) {
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

  function _install( _addon , _cb ) {
    _source.download( _addon , os.tmpdir() , ( _err , _addon_data ) => {
      if ( _err ) {
        return _cb( _err );
      } else {
        console.log( 'Downloaded' , _addon_data.name , _addon_data.version );
        // install it
        _extract( _addon_data.local_file , ( _err , _dirs ) => {
          _addon_data.local_dirs = _dirs;
          fs.remove( _addon_data.local_file );
          af_update( _addon_data );
          console.log( 'Installed' , _addon_data.name , _addon_data.version );
          _cb( null );
        } );
      }
    } );
  }

  function _uninstall( _addon , _cb ) {
    var dirs = _addon.local_dirs;
    for( var i in dirs ) {
      console.log( 'Removing' , dirs[ i ] );
      fs.remove( path.join( addons_path , dirs[ i ] ) );
    }
    af_remove( _addon );
    _cb( null );
  }

  function af_find_idx( _name ) {
    return addons_details.findIndex( ( _e , _i , _a ) => ( _e.key === _name ) );
  }

  function af_find( _name ) {
    return addons_details.find( ( _e , _i , _a ) => ( _e.key === _name ) );
  }

  function af_update( _addon_data ) {
    var i = af_find_idx( _addon_data.key );
    if ( i !== -1 ) {
      addons_details[ i ] = _addon_data;
    } else {
      addons_details.push( _addon_data );
    }
    save_details( );
  }

  function af_remove( _addon_data ) {
    var i = af_find_idx( _addon_data.key );
    if ( i !== -1 ) {
      addons_details.splice( i , 1 );
    }
    save_details();
  }

  var api = {};

  api.download = function( _name , _output , _cb ) {
    _source.get_details( _name , ( _err , _addon ) => {
      if ( _err ) { return _cb( _err ); }
      _source.download( _addon , _output , _cb );
    } );
  }

  api.install = function( _name , _cb ) {
    _source.get_details( _name , ( _err , _addon ) => {
      if ( _err ) { return _cb( _err ); }
      _install( _addon , _cb );
    } );
  }

  api.uninstall = function( _name , _cb ) {
    var addon = af_find( _name );
    if ( addon ) {
      _uninstall( addon , _cb );
    } else {
      _cb( {err: -1 , desc: 'addon not found' } );
    }
  }

  api.info = function( _name , _cb ) {
    _source.get_details( _name , _cb );
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
            _uninstall( _addon_data , ( _err ) => {
              _install( _addon_data , _cb );
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
