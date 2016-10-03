var fs = require( 'fs-extra' );
var DecompressZip = require( 'decompress-zip' );
var path = require( 'path' );
var os = require( 'os' );
var async = require( 'async' );
var output = require( './output.js' );

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
    var unzipper = new DecompressZip( _zipfile )

    unzipper.on('error', function ( _err ) {
      _cb( _err );
    });

    unzipper.on('extract', ( _log ) => {
      // get dirs list
      var dirs = [];
      var addon_dir = null;
      _log.forEach( ( _entry ) => {
        var obj_type = Object.keys( _entry )[0];
        addon_dir = _entry[obj_type].split( path.sep )[0];
        if ( dirs.indexOf( addon_dir ) === -1 ) {
          dirs.push( addon_dir );
        }
      } );
      _cb( null , dirs );
    });

    unzipper.on('progress', function (fileIndex, fileCount) {
      // maybe do some progress
    });

    unzipper.extract({
      path: addons_path
    });
  }

  function _install( _addon , _cb ) {
    output.state( _addon.key , 'Downloading' );
    _source.download( _addon , os.tmpdir() , ( _err , _addon_data ) => {
      if ( _err ) {
        return _cb( _err );
      } else {
        output.state( _addon.key , 'Downloaded' );
        // install it
        _extract( _addon_data.local_file , ( _err , _dirs ) => {
          _addon_data.local_dirs = _dirs;
          fs.remove( _addon_data.local_file );
          af_update( _addon_data );
          output.state( _addon.key , 'Installed ' + _addon_data.version );
          _cb( null );
        } );
      }
    } );
  }

  function _remove_addon( _addon , _cb ) {
    async.each( _addon.local_dirs , ( _dir , _cb ) => {
      fs.remove( path.join( addons_path , _dir ) , _cb );
    } , _cb );
  }

  function _uninstall( _addon , _cb ) {
    _remove_addon( _addon , () => {
      af_remove( _addon );
      output.state( _addon.key , 'Uninstalled' );
      _cb( null );
    } );
  }

  function _update( _addon , _cb ) {
    _remove_addon( _addon , ( _err ) => {
      _addon.local_dirs = [];
      _install( _addon , _cb );
    } );
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
      output.setup( _addon.key , _addon.name , _addon.version );
      _install( _addon , _cb );
    } );
  }

  api.uninstall = function( _name , _cb ) {
    var addon = af_find( _name );
    if ( addon ) {
      output.setup( addon.key , addon.name , addon.version );
      _uninstall( addon , _cb );
    } else {
      _cb( {err: -1 , desc: 'addon not found' } );
    }
  }

  api.info = function( _name , _cb ) {
    _source.get_details( _name , _cb );
  }

  api.search = function( _name , _cb ) {
    _source.search( _name , ( _err , _results ) => {
      if( _err ) {
        return _cb( _err );
      } else {
        _results.forEach( ( _result ) => {
          var addon = af_find( _result.key );
          output.setup( _result.key , _result.name , (addon)?addon.version:'???' );
          output.state( _result.key , (addon)?'Installed':'' );
        } );
      }
    } );
  }

  api.list = function( _cb ) {
    for( var i in addons_details ) {
      var addon = addons_details[ i ];
      output.setup( addon.key , addon.name , addon.version );
      output.state( addon.key , 'Installed' );
    }
  }

  api.update_all = function( _cb ) {
    for( var i in addons_details ) {
      var addon = addons_details[ i ];
      output.setup( addon.key , addon.name , addon.version );
    }
    async.each( addons_details , ( _orig_data , _cb ) => {
      output.state( _orig_data.key , 'Checking...' );
      _source.get_details( _orig_data.key , ( _err , _addon_data ) => {
        if ( _err ) {
          output.state( _orig_data.key , 'error.' );
          _cb( _err );
        } else {
          if ( _orig_data.version === _addon_data.version ) {
            output.state( _orig_data.key , 'up to date' );
            _cb( null );
          } else {
            output.state( _orig_data.key , _addon_data.version + ' available' );
            _update( _addon_data , _cb );
          }
        }
      } );
    } , ( _err ) => {
      _cb( _err );
    } );
  }

  return api;
}
