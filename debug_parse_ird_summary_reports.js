/* global require console process it describe after before */

/** process IRD files */


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

var setup_file_parser = require('./lib/file_parser.js')
var process_header_lines = require('./lib/ird_header.js')

var argv = require('optimist')
    .usage('parse IRD summary report files, save to database.\nUsage: $0')
    .default('r','/var/lib/wim')
    .alias('r', 'root')
    .describe('r', 'The root directory holding the IRD summary data.')
    .default('p','STATION.???')
    .alias('p', 'pattern')
    .describe('p', 'The file pattern to use when searching for IRD summary reports')
    .default('m',0)
    .alias('m', 'make')
    .describe('m', 'make the temp database tables.  default is to not make the tables.  pass any truthy value to make them')
    .argv
;
var root = argv.root;
var pattern = argv.pattern;
var make = argv.make;

var glob = require('glob')


config_okay(config_file,function(err,c){
    if(err) throw new Error(err)

    if(!c.postgresql.parse_ird_summaries_db){ throw new Error('need valid postgresql.parse_ird_summaries_db defined in config.json')}
    if(!c.postgresql.username){ throw new Error('need valid postgresql.username defined in config.json')}
    if(!c.postgresql.password){ throw new Error('need valid postgresql.password defined in config.json')}

    //if(!c.postgresql.speed_table){ throw new Error('need valid postgresql.speed_table (with any schemas needed) defined in config.json')}
    //if(!c.postgresql.class_table){ throw new Error('need valid postgresql.class_table (with any schemas needed) defined in config.json')}
    if(!c.postgresql.speed_table){ console.log('the config param postgresql.speed_table will be ignored.  using temp table instead')}
    if(!c.postgresql.class_table){ console.log('the config param postgresql.class_table will be ignored.  using temp table instead')}

    c.postgresql.speed_table = 'wim.test_summary_speed'
    c.postgresql.class_table = 'wim.test_summary_class'

    // sane defaults
    if(c.postgresql.host === undefined) c.postgresql.host = 'localhost'
    if(c.postgresql.port === undefined) c.postgresql.port = 5432

    c.process_header_lines=process_header_lines


    function do_it(){
        // do the work
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
    }

    if(!make){
        do_it()
    }else{
        // make the test databases?

        var host = c.postgresql.host     ? c.postgresql.host : '127.0.0.1';
        var user = c.postgresql.username ? c.postgresql.username : 'myname';
        var pass = c.postgresql.password ? c.postgresql.password : 'secret';
        var port = c.postgresql.port     ? c.postgresql.port :  5432;
        var db  = c.postgresql.parse_ird_summaries_db ? c.postgresql.parse_ird_summaries_db : 'spatialvds'
        var connectionString = "pg://"+user+":"+pass+"@"+host+":"+port+"/"+db

        var create_tables =['CREATE  TABLE '+c.postgresql.class_table+'('
                            + '     site_no integer not null ,'
                            + '     ts      timestamp without time zone not null,'
                            + '     wim_lane_no integer not null,'
                            + '     veh_class integer not null,'
                            + '     veh_count integer not null,'
                            + '     primary key (site_no,ts,wim_lane_no,veh_class)'
                            + ' )'
                            ,'CREATE TABLE '+c.postgresql.speed_table+' ('
                            + '     site_no integer not null ,'
                            + '     ts      timestamp without time zone not null,'
                            + '     wim_lane_no integer not null,'
                            + '     veh_speed numeric not null,'
                            + '     veh_count integer not null,'
                            + '     primary key (site_no,ts,wim_lane_no,veh_speed)'
                            + ' )'
                           ]

        pg.connect(connectionString, function(err, _client, _done) {
            if(err){
                console.log(err)
                return _done(err)
            }
            var q = queue()
            create_tables.forEach(function(stmt){
                q.defer(function(cb){
                    var query = _client.query(stmt)
                    query.on('end', function(r){
                        return cb()
                    })
                    query.on('error',function(e){
                        console.log(e)
                        throw new Error(e)
                        return null
                    })
                })
                return null
            })
            q.await(function(err){
                // finished with sql client
                _done()
                do_it()
                return null
            })



            return null
        })
    }
    return null
})
