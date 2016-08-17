var sr = require( 'screen-renderer' );
var chalk = require( 'chalk' );
var columnify = require( 'columnify' );

var addons_states = [];

function af_find_idx( _name ) {
  return addons_states.findIndex( ( _e , _i , _a ) => ( _e.key === _name ) );
}

function af_find( _name ) {
  return addons_states.find( ( _e , _i , _a ) => ( _e.key === _name ) );
}

function af_update( _addon_data ) {
  var i = af_find_idx( _addon_data.key );
  if ( i !== -1 ) {
    Object.assign( addons_states[ i ] , _addon_data );
  } else {
    addons_states.push( _addon_data );
  }
}

function af_remove( _addon_data ) {
  var i = af_find_idx( _addon_data.key );
  if ( i !== -1 ) {
    addons_states.splice( i , 1 );
  }
}

var output = new sr( function( _out , _params ) {
  _out( columnify(
    addons_states , {
    columns: ['name' , 'version' , 'state']
  } ) + '\n' );
} );

module.exports = {
  setup: function( _addon , _name , _version ) {
    af_update( { key: _addon , name: chalk.blue( _name ) , version: chalk.green( _version ) } );
  },
  state: function( _addon , _state ) {
    af_update( { key: _addon , state: _state } );
    output.update();
  }
}
