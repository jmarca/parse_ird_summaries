/* global require console process it describe after before */

var should = require('should')
var _ = require('lodash');
var pg = require('pg')

var collector = require('../lib/collector')

var config_okay = require('config_okay')
var fs = require('fs')
var path = require('path')
var rootdir = path.normalize(__dirname+'/..')
var config_file = rootdir+'/test.config.json'
// test db
var pg = require('pg'); //native libpq bindings = `var pg = require('pg').native`

var connectionString
var config={}

var localclient
var localclientdone
var temp_table = 'deleteme_test_table'
var create_statement = 'CREATE  TABLE '+temp_table+'('
                   + '     site_no integer not null ,'
                   + '     count integer not null,'
                   + '     primary key (site_no)'
                   + ' )'

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

        config.postgresql = c.postgresql

        pg.connect(connectionString, function(err, _client, _done) {
            if(err){
                console.log(err)
                return done(err)
            }
            localclient = _client
            localclientdone = _done

            var query = localclient.query(create_statement)
            query.on('end',function(r){return done()})
            return null
        })
        return null
    })
    return null
})


after( function(done){
    var stmt = 'drop table '+temp_table

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

describe ('collector',function(){
    it('should exist', function(){
        collector.should.have.property('make_collector')
        collector.make_collector.should.be.a.Function;
        collector.should.have.property('save_to_db')
        collector.save_to_db.should.be.a.Function;

        var saver = collector.save_to_db('insert string',{'postgresql':{}})
        saver.should.be.a.Function;

        var maker = collector.make_collector
        should.exist(maker)
        var collect = maker('insert string',{'postgresql':{}})
        collect.should.have.property('waiting')
        collect.should.have.property('done')
        collect.should.have.property('end')
        collect.should.be.a.Function;
    })
    it('should collect things',function(done){

        var maker = collector.make_collector
        var insert_string = 'INSERT INTO '+temp_table+'(site_no,count) values'
        var collect = maker(insert_string,config)
        // waiting should work
        collect.waiting().should.be.ok;
        collect.waiting(false) // doesn't matter
        collect.waiting().should.be.ok;
        // collect something
        collect([[1,100]])
        collect.waiting().should.not.be.ok;
        collect.waiting(1)
        collect.waiting().should.be.ok;
        collect([[2,200]])
        collect([[2,200]])
        collect.waiting().should.not.be.ok;
        collect.done(function(){
            // check that db has some data
            localclient.query('select * from '+temp_table,function(e,d){
                should.not.exist(e)
                should.exist(d)
                d.should.have.property('rows')
                d.rows.should.have.lengthOf(2)
                d.rows[0].site_no.should.eql(1)
                d.rows[0].count.should.eql(100)
                d.rows[1].site_no.should.eql(2)
                d.rows[1].count.should.eql(200)
                return done()
            })
        })


    })

})
