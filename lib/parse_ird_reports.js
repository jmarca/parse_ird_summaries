/*global console */
// rewrite of perl parsing here in node.js
//
// no problems with exisit perl code, but I have to redo it for PAT,
// and the way I was doing it in perl is largely untestable
// here I write up the pieces, export them, then I can test each part

/*global require process */

var pg = require('pg'); //native libpq bindings = `var pg = require('pg').native`

var fs = require('fs'),
    byline = require('byline')
//var async = require('async')
var queue = require('queue-async')
var _ = require('lodash')
var speedkey= require('./speedkey.js')
