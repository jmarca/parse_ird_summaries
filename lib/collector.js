var _ = require('lodash')
var pg = require('pg')
var queue = require('queue-async')

function make_collector(insert_string,config){
    if(!config) throw new Error('config required in call to make_collector')
    var _to_db = save_to_db(insert_string,config)
    var data=[]
    var w = true // are we waiting for data
    var collect = function(rows){
        //console.log('adding to '+insert_string)
        w = false
        data = data.concat(rows)
        return null
    }
    collect.waiting=function(_w){
        if(_w !== undefined) w = true
        return w
    }
    collect.done=function(cb){
        // save data to db

        // while debugging, sort the data
        //
        data = _.sortBy(data,function(a,i){
                   return a.join(' ')
               })
        _to_db(_.clone(data),function(err){
            if(err) return cb(err)
            //console.log('db save done for '+insert_string)
            return cb()
        })
        data = []
        return null
    }
    collect.end=function(cb){
        //console.log('called end '+insert_string)
        return cb()
    }
    return collect
}

function save_to_db(insert_string,config){
    var host = config.postgresql.host ? config.postgresql.host : '127.0.0.1';
    var user = config.postgresql.username ? config.postgresql.username : 'myname';
    var pass = config.postgresql.password ? config.postgresql.password : 'secret';
    var port = config.postgresql.port ? config.postgresql.port :  5432;
    var db  = config.postgresql.parse_pat_summaries_db ? config.postgresql.parse_pat_summaries_db : 'spatialvds'
    var connectionString = "pg://"+user+":"+pass+"@"+host+":"+port+"/"+db

    function save_chunk(data,next){

        if(!data) return next('must have data, an array of records')
        if(data.length === 0) return next()
        //
        // create values statements array from incoming data
        // [ $site, $ts, $lane, $speedkey{$speed}, $count ];
        //

        // send the data one row at a time
        var one_at_a_time=function(client,val,callback){
            console.log('called one at a time')
            function liner(v,cb){
                var stmt = insert_string + v
                console.log(stmt)
                client.query(stmt
                            ,function(err){
                                 if(err) {
                                     // I don't care, just a duplicate entry most likely
                                     if(! /duplicate key value/.test(err)){
                                         console.log(err)
                                         //console.log(insert_string+val)
                                         throw new Error(err)
                                     }
                                 }
                                 return cb()
                             })
                return null
            }
            var linebyline = queue(1)
            val.forEach(function(v){
                linebyline.defer(liner,v)
                return null
            })
            linebyline.await(function(e,r){
                return callback(e)
            })
            return null
        }
        var all_at_once=function(client,rows, callback) {
            // var flat_rows = _.flatten(rows)

            var stmt = insert_string +' '+rows.join(',')

            if(rows.length < 10) console.log(stmt)

            client.query(stmt
                        ,function(err){
                             var passed = true
                             if(err){
                                 if(/duplicate key value/.test(err)){
                                     //console.log(err)
                                 }else{
                                     console.log('all at once failed '+insert_string + rows.join(','))
                                     console.log(err)
                                     throw new Error(err)
                                     // bleh
                                 }
                                 passed = false
                             }
                             return callback(null,passed)
                         })
        }

        pg.connect(connectionString, function(err, client, done) {

            var tick = data.length
            console.log('connected to write '+tick+' rows')

            var values = []
            _.forEach(data
                     ,function(row){
                          values.push('('+row.join(',')+')')
                      })
            values = _.flatten(values)
            // first try all at once.  If fail, one by one
            queue().defer(all_at_once,client,values)
            .await(function(err,result){
                if(err || ! result){
                    console.log('all at once failed, try smaller chunks')
                    //return next(err)
                    // break into 10 blocks
                    var j = values.length
                    var q = new queue(5)
                    var blocksize = Math.ceil(j/10)
                    blocksize=500 // for testing?  keeping for
                                  // now---it reduces the number of
                                  // single line inserts
                    for (var i = 0;
                          i < j;
                         i+=blocksize){
                        var subblock = values.slice(i,i+blocksize)
                        q.defer(all_at_once,client,subblock)
                    }
                    q.awaitAll(function(err,results){
                        console.log('done with chunked')
                        var qq = queue(5)
                        var redo = false
                        for(var i = 0,j=results.length; i<j; i++){
                            if(! results[i]){
                                var start = i*blocksize
                                var subblock = values.slice(start,start+blocksize)
                                console.log('issue from ',start,start+blocksize)
                                //throw new Error()
                                qq.defer(one_at_a_time,client,subblock)
                                redo=true
                            }
                        }
                        if(redo){
                            console.log('waiting for one-at-a-time saver')

                            // need a final handler for qq
                             qq.awaitAll(function(e,moreresults){
                                 console.log('done with one-at-a-time saver')
                                 done()
                                 return next()
                             })
                        }else{
                            console.log('no problems saving in chunks')
                            done()
                            next()
                        }
                        return null
                    })
                }else{
                    console.log('no problems saving')
                    done()
                    next()
                }
                return null
            })
            return null
        })
        return null
    }

    // i used to use this in prior versions of node-pg api
    //
    // save_chunk.end=function(cb){
    //     // call this when you are done with this
    //     console.log('calling end for '+insert_string)
    //     cb()
    // }

    return save_chunk
}

exports.save_to_db=save_to_db
exports.make_collector=make_collector
