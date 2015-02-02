/* global require console process it describe after before */

var should = require('should')
var _ = require('lodash');
var queue = require('queue-async')

var config_okay = require('config_okay')
var fs = require('fs')
var path = require('path')
var rootdir = path.normalize(__dirname+'/..')
var config_file = rootdir+'/test.config.json'
var process_header_lines = require('../lib/ird_header.js')

var glob = require('glob')

var ppr = require('../lib/file_parser')

// test db
var pg = require('pg'); //native libpq bindings = `var pg = require('pg').native`

var connectionString
var config={}


before(function (done){
    config_okay(config_file,function(err,c){
        if(err) throw new Error(err)

        if(!c.postgresql.parse_ird_summaries_db){ throw new Error('need valid postgresql.parse_ird_summaries_db defined in test.config.json')}
        if(c.postgresql.table){ console.log('ignoring postgresql.table entry in config file; using temp tables instead') }
        if(!c.postgresql.username){ throw new Error('need valid postgresql.username defined in test.config.json')}
        if(!c.postgresql.password){ throw new Error('need valid postgresql.password defined in test.config.json')}

        // sane defaults
        if(c.postgresql.host === undefined) c.postgresql.host = 'localhost'
        if(c.postgresql.port === undefined) c.postgresql.port = 5432


        var host = c.postgresql.host     ? c.postgresql.host : '127.0.0.1';
        var user = c.postgresql.username ? c.postgresql.username : 'myname';
        var pass = c.postgresql.password ? c.postgresql.password : 'secret';
        var port = c.postgresql.port     ? c.postgresql.port :  5432;
        // global
        var db  = c.postgresql.parse_ird_summaries_db ? c.postgresql.parse_ird_summaries_db : 'spatialvds'
        connectionString = "pg://"+user+":"+pass+"@"+host+":"+port+"/"+db

        config['postgresql'] =
            c.postgresql
        config.process_header_lines=process_header_lines
        return done()
    })
    return null
})


describe ('parse file code is okay',function(){
    it('should exist', function(done){
        var pf = ppr.setup_file_parser
        should.exist(pf)
        return done()
    })
    return null
})

describe ('parse file can process a file', function(){
    var localclient
    var localclientdone
    var speed_table = 'deleteme_test_summary_speed1'
    var class_table = 'deleteme_test_summary_class1'
    var _config = {}


    var create_tables =['CREATE  TABLE '+class_table+'('
                       + '     site_no integer not null ,'
                       + '     ts      timestamp without time zone not null,'
                       + '     wim_lane_no integer not null,'
                       + '     veh_class integer not null,'
                       + '     veh_count integer not null,'
                       + '     primary key (site_no,ts,wim_lane_no,veh_class)'
                       + ' )'
                       ,'CREATE TABLE '+speed_table+' ('
                       + '     site_no integer not null ,'
                       + '     ts      timestamp without time zone not null,'
                       + '     wim_lane_no integer not null,'
                       + '     veh_speed numeric not null,'
                       + '     veh_count integer not null,'
                       + '     primary key (site_no,ts,wim_lane_no,veh_speed)'
                       + ' )'
                       ]

    before(function(done){
        _config=_.assign(_config,config)
        _config.postgresql.speed_table=speed_table
        _config.postgresql.class_table=class_table

        pg.connect(connectionString, function(err, _client, _done) {
            if(err){
                console.log(err)
                return done(err)
            }
            localclient = _client
            localclientdone = _done

            var q = queue(3)
            create_tables.forEach(function(stmt){
                q.defer(function(cb){
                    var query = localclient.query(stmt)
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
                return done()
            })
            return null
        })
    })

    after( function(done){
        var stmt = 'drop table '+[speed_table
                                 ,class_table
                                  //,speed_class_table
                                 ].join(',')
       var query = localclient.query(stmt)
       query.on('end', function(r){
            return done()
       })
        query.on('error',function(e){
            console.log(e)
            console.log('you should manually delete: '+stmt)
            throw new Error(e)
            return null
        })
        return null
    })
    it('should parse a file',function(done){

        var pf = ppr.setup_file_parser(_config)

        should.exist(pf)
        var filename = rootdir+'/test/ird_small_test_file.txt'
        console.log('parsing '+filename)
        pf(filename,function(err){
            should.not.exist(err)
            var speed_counts = pf.get_speed_total()
            var class_counts = pf.get_class_total()
            speed_counts.should.be.approximately(class_counts,class_counts*0.01) // within 10%
            pg.connect(connectionString, function(err, pg_client, pg_done) {

                pg_client.query('select * from '+speed_table,function(e,d){
                    should.not.exist(e)
                    should.exist(d)
                    d.rows.forEach(function(row,i){
                        row.should.have.keys(
                            'site_no'
                          , 'ts'
                          , 'wim_lane_no'
                          , 'veh_speed'
                          , 'veh_count'
                        )
                    });
                    d.should.have.property('rows').with.lengthOf(1193)
                    pg_client.query('select * from '+class_table,function(e,d){
                        should.not.exist(e)
                        should.exist(d)
                        d.rows.forEach(function(row,i){
                            row.should.have.keys(
                                'site_no'
                              , 'ts'
                              , 'wim_lane_no'
                              , 'veh_class'
                              , 'veh_count'
                            )
                        });
                        d.should.have.property('rows').with.lengthOf(1070)
                        pg_done()
                        return done()
                    })
                    return null
                })
                return null
            })
            return null
        })
        return null
    })
    return null
})

describe ('parse file can process a  big file', function(){
    var localclient
    var localclientdone
    var speed_table = 'deleteme_test_summary_speed2'
    var class_table = 'deleteme_test_summary_class2'
    var _config = {}

    var create_tables =['CREATE  TABLE '+class_table+'('
                       + '     site_no integer not null ,'
                       + '     ts      timestamp without time zone not null,'
                       + '     wim_lane_no integer not null,'
                       + '     veh_class integer not null,'
                       + '     veh_count integer not null,'
                       + '     primary key (site_no,ts,wim_lane_no,veh_class)'
                       + ' )'
                       ,'CREATE TABLE '+speed_table+' ('
                       + '     site_no integer not null ,'
                       + '     ts      timestamp without time zone not null,'
                       + '     wim_lane_no integer not null,'
                       + '     veh_speed numeric not null,'
                       + '     veh_count integer not null,'
                       + '     primary key (site_no,ts,wim_lane_no,veh_speed)'
                       + ' )'
                       ]

    before(function(done){
        _config=_.assign(_config,config)
        _config.postgresql.speed_table=speed_table
        _config.postgresql.class_table=class_table
        pg.connect(connectionString, function(err, _client, _done) {
            if(err){
                console.log(err)
                return done(err)
            }
            localclient = _client
            localclientdone = _done

            var q = queue(3)
            create_tables.forEach(function(stmt){
                q.defer(function(cb){
                    var query = localclient.query(stmt)
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
                return done()
            })
            return null
        })
    })

    after( function(done){
        var stmt = 'drop table '+[speed_table
                                 ,class_table
                                  //,speed_class_table
                                 ].join(',')
       var query = localclient.query(stmt)
       query.on('end', function(r){
            return done()
       })
        query.on('error',function(e){
            console.log(e)
            console.log('you should manually delete: '+stmt)
            throw new Error(e)
            return null
        })
        return null
    })

    it('should parse a big file',function(done){

        var pf = ppr.setup_file_parser(_config)
        should.exist(pf)
        var filename = rootdir+'/test/2012/STATION.020'
        console.log('parsing '+filename)
        pf(filename,function(err){
            should.not.exist(err)
            // add sql checks here
            var speed_counts = pf.get_speed_total()
            var class_counts = pf.get_class_total()
            speed_counts.should.be.approximately(class_counts,class_counts*0.01) //within 10%
            pg.connect(connectionString, function(err, pg_client, pg_done) {

                pg_client.query('select * from '+speed_table,function(e,d){
                    should.not.exist(e)
                    should.exist(d)
                    d.rows.forEach(function(row,i){
                        row.should.have.keys(
                            'site_no'
                          , 'ts'
                          , 'wim_lane_no'
                          , 'veh_speed'
                          , 'veh_count'
                        )
                    });
                    d.should.have.property('rows').with.lengthOf(15842)
                    pg_client.query('select * from '+class_table,function(e,d){
                        should.not.exist(e)
                        should.exist(d)
                        d.rows.forEach(function(row,i){
                            row.should.have.keys(
                                'site_no'
                              , 'ts'
                              , 'wim_lane_no'
                              , 'veh_class'
                              , 'veh_count'
                            )
                        });
                        d.should.have.property('rows').with.lengthOf(13308)
                        pg_client.query('select sum(veh_count) s from '+class_table,function(e,d){
                            should.not.exist(e)
                            should.exist(d)
                            var saved_class = +d.rows[0].s
                            saved_class.should.eql(class_counts)
                            pg_client.query('select sum(veh_count) s from '+speed_table,function(e,d){
                                should.not.exist(e)
                                should.exist(d)
                                var saved_spd = +d.rows[0].s
                                saved_spd.should.eql(speed_counts)
                                pg_done()
                                return done()
                            })
                            return null
                        })
                        return null
                    })
                    return null
                })
                return null
            })
            return null
        })
        return null
    })

    return null
})
