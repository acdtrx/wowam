#!/usr/bin/env node

var curse = require( './libs/curse.js' );
var addons = require( './libs/addons.js' )( curse );
var program = require( 'commander' );

program
  .command( 'info <addon>' )
  .action( ( _addon , _options ) => {
    addons.info( _addon , function( _err , _data ) {
      if ( _err && ( _err.code === -1 ) ) {
        console.log( _addon, 'was not found.' );
      } else {
        console.log( 'Name:    ' , _data.name );
        console.log( 'Version: ' , _data.version );
        console.log( 'Category:' , _data.category );
        console.log( 'URL:     ' , _data.link );
      }
    } );
  } );

program
  .command( 'download <addon> [output]' )
  .action( ( _addon , _output , _options ) => {
    addons.download( _addon , _output || '.' , ( _err , _dl_name ) => {
      console.log( 'Downloaded to:', _dl_name );
    } );
  } );

program
  .command( 'install <addon>' )
  .action( ( _addon , _options ) => {
    addons.install( _addon , ( _err , _data ) => {
      if ( _err ) {
        console.log( 'Error installing' , _addon );
        console.log( _err );
      }
    } );
  } );

program
  .command( 'uninstall <addon>' )
  .action( ( _addon , _options ) => {
    addons.uninstall( _addon , ( _err ) => {
      if ( _err ) {
        console.log( 'Error uninstalling' , _addon , _err );
      }
    } );
  } );

program
  .command( 'update-all' )
  .action( ( _options ) => {
    addons.update_all( ( _err ) => {

    } );
  } );

program
  .command( 'list' )
  .action( ( _options ) => {
    addons.list( ( _err ) => {

    } );
  } );

program
  .command( 'search' )
  .action( ( _search , _options ) => {
    addons.search( _search );
  } );



program.parse( process.argv );

if (!process.argv.slice(2).length) {
   program.outputHelp();
 }
