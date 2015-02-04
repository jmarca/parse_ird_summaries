/* globals require console */

var make_collector = require('./collector.js').make_collector
var fs = require('fs')
var byline = require('byline')
var queue = require('queue-async')
var speedkey = require('./speedkey.js')
var _ = require('lodash')

var speed_lane = require('./speed_lane.js')
var class_lane = require('./class_lane.js')


function setup_file_parser (options ){
    if(!options) options = {}
    var _speed_table = options.postgresql.speed_table || 'summaries_5min_speed'
    var _class_table = options.postgresql.class_table || 'summaries_5min_class'
    // speed class reports are broken for IRD
    // var _speed_class_table = options.postgresql.speed_class_table || 'summaries_daily_speed_class'

    var speed_collector = make_collector('INSERT INTO '+_speed_table+'(site_no,ts,wim_lane_no,veh_speed,veh_count) values '
                                        ,options)

    var class_collector = make_collector('INSERT INTO '+_class_table+'(site_no,ts,wim_lane_no,veh_class,veh_count) values '
                                        ,options)

    // no speed_class data in ird reports
    // var speed_class_collector = make_collector('INSERT INTO '+_speed_class_table+'(site_no,ts,wim_lane_no,veh_speed,veh_class,veh_count) values '
    //,options)


    // these are only used for testing at the moment
    function make_totaler(){
        var total=0
        function accum(_count){
            if(_count) total += _count
            return total;
        }
        return accum;
    }
    var speed_total = make_totaler()
    var class_total = make_totaler()

    var the_totals=[null // hack
                 ,class_total
                 ,speed_total]

    var process_header_lines = options.process_header_lines
    function parse_file(file,cb){
        console.log('parsing '+file)
        var abort = false
        function abort_parsing(line_number,file){
            // generally abort everything and go home now
            abort = true
            // document the error
            var message = file
            message += ': line '+line_number
            message += '\n'
            console.log(message)
            fs.appendFileSync('bad_ird_summaries.txt', message)
            return null
        }

        // limit the duplicates
        var speed_keys={}
        var class_keys={}
        var the_keys=[null //hack
                     ,class_keys
                     ,speed_keys]

        var stream = fs.createReadStream(file);
        stream = byline.createStream(stream);

        // document parser starts in this routine.
        //
        // the document parser is stateful.  By that I mean that from one
        // line to the next, how a line gets parsed is dependent upon what
        // has come before.  the lines for speed and so on look much like
        // each other, and a block of data requires knowledge of the
        // header to save the right timestamp, lane, and direction, and so
        // on.
        //
        // there are three tables that I care about.
        //
        //   vehicle class by hour of day
        //   vehicle speed by hour of day
        //   vehicle class by vehicle speed (for an entire day)
        //
        // parsing state bounces between three states based on seeing the
        // correct table header line.  each time state changes, the site,
        // date, lane, and direction variables are reset by the next block of
        // lines that are read.
        //
        // Then when the data arrives, it is sent to the correct parsing
        // routine for data extraction
        //
        // when state changes again, the active parsing routine is sent a
        // message to save its data and reset itself
        //

        // globals
        var line_number = 0
        var state = 0
        var parser = [process_header_lines()
                     ,class_lane()
                     ,speed_lane()
                     ]
        var collector

        stream.on('readable', function() {
            var line;
            while (null !== (line = stream.read())) {
                if(abort){ return null }// read to the end
                line_number++
                var result = null
                if(! parser[0].ready()){
                    //console.log('header is not ready')
                    result = parser[0](line)
                    if(result === -1 ){
                        abort_parsing(line_number,file)
                        return null
                    }
                    // if we finished parsing a header, toggle
                    if(parser[0].ready()){
                        state = 1
                        collector = class_collector
                        collector.waiting(1)
                    }
                    // move on to next line
                    return null
                }
                result = parser[state](line)

                if(result === null){

                    // current state parser failed
                    // maybe time to switch state,
                    // or maybe it is still junk lines

                    // the order for IRD reports is always
                    // header bit, class table, speed table
                    // class vs speed and class vs time are broken
                    // so depending on the state array, we either shift, or reset the thing


                    // now at this point, result is null means that the
                    // line didn't get parsed by the current {state}
                    // parser (class or speed).  We are either parsing
                    // junk *before* the table, or junk after the table.
                    //
                    // so if parser hasn't seen data, keep waiting; if it
                    // has seen data, then increment (junk means we're done
                    // with this table
                    //
                    if( parser[state].parsed_something() // if true, seen valid lines
                      ){
                        // reset current parser (speed or class) for next time
                        parser[state].reset()
                        // switch to new collector/parser
                        if(state===2){
                            // done with both class and speed
                            // rotate
                            state = 0
                            // reset header parser
                            parser[0].reset()
                            return null
                        }
                        // if still here, move to state 2 (speed)
                        state = 2
                        collector = speed_collector
                        collector.waiting(1)
                        return null
                    }else{
                        // if here, then still have not yet parsed
                        // a valid line in the current parser.  so
                        // keep waiting for table of data rather
                        // than junk lines
                        return null
                    }
                }else{
                    // not null
                    //
                    // is it a good read?
                    //
                    if(_.isArray(result) && result.length>0){
                        // kay, this means "result" is not null...the parser
                        // got data from the line AND we're past the header bit
                        //
                        // also, the if statement ignores [] results
                        //
                        // push result to the collector

                        var header_cols = parser[0].get_record()
                        var keyhead = header_cols.join(' ')
                        var combined_result=[]
                        result.forEach(function(row){
                            var key = keyhead +' '+row[0]+' '+row[1]
                            if(the_keys[state][key] === undefined){
                                combined_result.push(_.flatten([header_cols,row]))
                                the_keys[state][key] = 1
                                the_totals[state](row[2]) // just add each entry
                            }
                            return null
                        })
                        collector(combined_result)
                        return null
                    }
                    // still here?  was it a very bad read?
                    if(result === -1 ){
                        abort_parsing(line_number,file)
                        return null
                    }
                }
            }
            //console.log([state,result]);
            return null
        });

        stream.on('end',function(err){
            if(err){
                console.log('Error '+err)
                return cb()
            }
            if(abort){
                return cb()
            }
            queue() // make this one while debugging
            .defer(speed_collector.done)
            .defer(class_collector.done)
            .await(function(e){
                queue()
                .defer(speed_collector.end)
                .defer(class_collector.end)
                .await(cb)
            })
            return null;
        })
    }


    parse_file.get_speed_total = speed_total
    parse_file.get_class_total = class_total

    return parse_file
}

module.exports=setup_file_parser
