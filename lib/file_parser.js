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


    var process_header_lines = options.process_header_lines

    function parse_file(file,cb){

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

        var state = [0,1,2]
        var states = [process_header_lines()
                     ,class_lane
                     ,speed_lane
                     ]

        var collector

        stream.on('data', function(line) {
            var result = null
            if(state && _.isArray(state) ){
                result = states[state[0]](line)
            }
            // that passed the line through either header parser,
            // class parser, or speed parser.
            if(! states[0].ready()){
                console.log('header is not ready')
                // we haven't yet finished parsing a header, so move
                // on to next line
                return null
            }
            if(result === null){

                // current state parser failed
                // maybe time to switch state,
                // or maybe it is still junk lines

                // the order for IRD reports is always
                // header bit, class table, speed table
                // class vs speed and class vs time are broken
                // so depending on the state array, we either shift, or reset the thing


                if(state // state array is not null
                 && _.isArray(state) // state array is an array
                 && state.length === 3 // we've not yet parsed the header bit
                  ){
                    // if we're here, header is done parsing (or we'd
                    // have returned null above) so state length == 3
                    // means we finished parsing header and now move
                    // on to looking for class
                    state.shift()
                    collector = class_collector
                    collector.waiting(1)
                    return null
                }
                // now at this point, result is null means that the
                // line didn't get parsed by the current {state}
                // parser (class or speed).  We are either parsing
                // junk *before* the table, or junk after the table.
                //
                // so if collector has no data, keep waiting; if it
                // has data, then increment (junk means we're done
                // with this table
                //
                if(state // state array is not null
                 && _.isArray(state) // state array is an array
                 && ! collector.waiting() // ! waiting() means we've seen data
                  ){
                    // so the collector has finished parsing its table.
                    if(state.length===1){
                        // done with both class and speed
                        // rotate
                        state = [0,1,2]
                        states[0].reset()
                        return null
                    }
                    // if still here, states is 2 elements long...
                    // shift to speed from class
                    state.shift()
                    collector = speed_collector
                    collector.waiting(1)
                    return null
                }else{
                    if(state // state array is not null
                     && _.isArray(state) // state array is an array
                      ){
                        // if here, then waiting is true, so keep waiting
                        // for table of data rather than junk lines
                        return null
                    }
                    throw new Error('state is falsy or not an array?')

                }
            }else{
                // kay, this means "result" is not null...the parser
                // got data from the line AND we're past the header bit
                //
                // push result to the collector
                if(_.isArray(result)){
                    // don't test collector here because it if is
                    // undefined I need to fail

                    var header_cols = states[0].get_record()
                    // not sure about this with IRD data
                    //
                    console.log(header_cols)
                    result = _.map(result
                                  ,function(row){
                                       return _.flatten([header_cols,row])
                                   })
                    collector(result)

                }
            }

            //console.log([state,result]);
            return null
        });

        stream.on('end',function(err){
            if(err){
                console.log('Error '+err)
            }
            queue(1) // make this one while debugging
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
    return parse_file
}

exports.setup_file_parser=setup_file_parser
