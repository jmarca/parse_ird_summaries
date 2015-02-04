/* global require console process it describe after before */

/** process PAT files */


var queue = require('queue-async')
var _ = require('lodash')

// db info
var pg = require('pg');
var env = process.env

var config_okay = require('config_okay')
var fs = require('fs')
var path = require('path')
var rootdir = path.normalize(__dirname)
var config_file = rootdir+'/config.json'

var setup_file_parser = require('./lib/pat_file_parser.js')
var process_header_lines = require('./lib/pat_header.js')

var argv = require('optimist')
    .usage('parse PAT summary report files, save to database.\nUsage: $0')
    .default('r','/var/lib/wim')
    .alias('r', 'root')
    .describe('r', 'The root directory holding the PAT summary data.')
    .default('p','TEMP.PRN')
    .alias('p', 'pattern')
    .describe('p', 'The file pattern to use when searching for PAT summary reports')
    .argv
;
var root = argv.root;
var pattern = argv.pattern;

var glob = require('glob')


config_okay(config_file,function(err,c){
    if(err) throw new Error(err)

    if(!c.postgresql.parse_pat_summaries_db){ throw new Error('need valid postgresql.parse_pat_summaries_db defined in config.json')}
    if(!c.postgresql.username){ throw new Error('need valid postgresql.username defined in config.json')}
    if(!c.postgresql.password){ throw new Error('need valid postgresql.password defined in config.json')}

    if(!c.postgresql.speed_table){ throw new Error('need valid postgresql.speed_table (with any schemas needed) defined in config.json')}
    if(!c.postgresql.class_table){ throw new Error('need valid postgresql.class_table (with any schemas needed) defined in config.json')}

    // sane defaults
    if(c.postgresql.host === undefined) c.postgresql.host = 'localhost'
    if(c.postgresql.port === undefined) c.postgresql.port = 5432

    c.process_header_lines=process_header_lines

    console.log(['going to check',root,pattern])

    glob("/**/"+pattern,{'cwd':root,'root':root},function(err,files){
        if(!files || !files.length) {
            console.log('no files found matching pattern '+pattern)
            return null
        }
        var stat_queue = queue(5)
        var parse_queue = queue(5)
        console.log('found '+files.length+' files matching pattern.  Checking for real files, and processing')
        files.forEach(function(f){
            stat_queue.defer(fs.stat,f)
            return null
        })
        stat_queue.awaitAll(function(err,stats){
            for(var i =0,j=stats.length;
                i<j;
                i++){
                if(stats[i].isFile()){
                    parse_queue.defer(setup_file_parser(c),files[i])
                }
            }
            console.log('processing queue loaded up')
            parse_queue.awaitAll(function(e,results){
                console.log('done with queued files')
                process.exit()
            })
            return null
        })
        return null
    })

    return null
})
