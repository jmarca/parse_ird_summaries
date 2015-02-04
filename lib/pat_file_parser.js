/* globals require console */

var make_collector = require('./collector.js').make_collector
var fs = require('fs')
var byline = require('byline')
var queue = require('queue-async')
var speedkey = require('./speedkey.js')
var _ = require('lodash')

var speed_hour = require('./speed_hour.js')
var class_hour = require('./class_hour.js')
var speed_class = require('./speed_class.js')

var title_parse = require('./pat_titleparse.js')


function setup_file_parser (options ){
    if(!options) options = {}
    var _speed_table = options.postgresql.speed_table || 'summaries_5min_speed'
    var _class_table = options.postgresql.class_table || 'summaries_5min_class'
    var _speed_class_table = options.postgresql.speed_class_table || 'summaries_daily_speed_class'

    var speed_collector = make_collector('INSERT INTO '+_speed_table+'(site_no,ts,wim_lane_no,veh_speed,veh_count) values '
                                        ,options)

    var class_collector = make_collector('INSERT INTO '+_class_table+'(site_no,ts,wim_lane_no,veh_class,veh_count) values '
                                        ,options)

    var speed_class_collector = make_collector('INSERT INTO '+_speed_class_table+'(site_no,ts,wim_lane_no,veh_speed,veh_class,veh_count) values '
                                              ,options)


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
    var speed_class_total = make_totaler()

    var the_totals=[null // hack
                   ,speed_class_total
                   ,class_total
                   ,speed_total
                   ]

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
        var speed_class_keys={}
        var the_keys=[null //hack
                     ,speed_class_keys
                     ,class_keys
                     ,speed_keys
                     ]

        var line_number = 0
        var state = 0 // initial conditions
        var states = [process_header_lines()
                     ,speed_class()
                     ,class_hour()
                     ,speed_hour()
                     ]

        var title = title_parse({speed_state:3
                                ,class_state:2
                                ,speed_class_state:1
                                })

        var the_collectors=[null // hack
                           ,speed_class_collector
                           ,class_collector
                           ,speed_collector
                           ]


        function hourly_row_reducer(accum,row){
            //
            // maybe assert that each entry in row is valid?
            //
            // first element in row is the hour.  Use to
            // adjust timestamp from header parser
            var header_cols = states[0].get_record(row.shift())
            var keyhead = header_cols.join(' ')
            // remaining 2 records in row are speed|class, count
            var key = keyhead +' '+row[0]
            // console.log(key)
            if(the_keys[state][key] === undefined){
                the_keys[state][key] = 1
                the_totals[state](row[1]) // just add each entry
                accum.push( _.flatten([header_cols,row]) )
            }
            return accum
        }
        function speed_vs_class_row_reducer(accum,row){
            //
            // no hours in speed vs class, just daily
            var header_cols = states[0].get_record(0)

            var keyhead = header_cols.join(' ')
            // the 3 records in row are speed, class, count
            var key = keyhead +' '+row[0]+' '+row[1]
            // console.log(key)
            if(the_keys[state][key] === undefined){
                the_keys[state][key] = 1
                the_totals[state](row[2]) // just add each entry
                accum.push( _.flatten([header_cols,row]) )
            }
            return accum
        }

        var stream = fs.createReadStream(file);
        stream = byline.createStream(stream);

        // the document parser starts in this routine.
        //
        // the document parser is stateful.  By that I mean that from one
        // line to the next, how a line gets parsed is dependent upon what
        // has come before.  the lines for speed and so on look much like
        // each other, and a block of data requires knowledge of the
        // header to save the right timestamp, lane, and direction, and so
        // on.
        //
        // for PAT reports, there are three tables that I care about.
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
        // At the beginning of each data block the header repeats
        // itself.  It is identical in all cases, until the next day
        // (when the date changes, the Lane changes, and the Direction changes)
        //
        // Before the header, there is a title line that indicates
        // whether the next block of data is speed, class, or
        // speed/class data.
        //
        // Then when the data arrives, it is sent to the correct parsing
        // routine for data extraction
        //
        // when state changes again, the active parsing routine is sent a
        // message to save its data and reset itself
        //

        stream.on('readable', function() {
            var line;
            while (null !== (line = stream.read())) {
                if(abort){ return null }// read to the end
                line_number++
                var result = null
                if(!state){
                    var t = title(line)
                    // console.log(line.toString())
                    // console.log(title.get_state())

                    if(t){
                        // good tite parse
                        state = title.get_state()
                        // next comes the header block
                        states[0].reset()
                    }
                    // if state is not yet set, then no sense doing
                    // anything else
                    return null
                }
                // at this point, state is set to non zero, non null,
                // and so we check if the header is done too
                if(! states[0].ready() ){
                    // console.log('header not ready')
                    // parse theheader first, then move on to state parsers
                    //
                    result = states[0](line)
                    if(result === -1 ){
                        abort_parsing(line_number,file)
                        return null
                    }
                    // if not negative, ignore the result, move on to next line
                    //
                    // if header was finished with that line, then
                    // next iteration the check to states[0].ready()
                    // will return true, and we'll move on to the next
                    // block below on to next line
                    return null
                }
                // okay, at this point, we have a state (1,2,or 3) and
                // a parsed header block, so start reading data
                result = states[state](line)

                //console.log(result)
                // that passed the line through a data table parser
                // (class, speed, speed_class)

                // the result from data parsing is either an empty
                // array ([]) or null if the line was junk according
                // to the parser.
                //
                // what the parser does now is to check if the current
                // parser is done reading data.  If it returns null
                // AND it has already seen some data, then it is done
                // reading its table
                if(result === null){

                    if( states[state].parsed_something() // if true, seen valid lines
                      ){
                        // reset current parser (speed or class) for next time
                        states[state].reset()
                        // reset the header parser
                        states[0].reset()
                        // switch to looking for next table
                        state=0

                        return null
                    }
                    // if still here, then the current data parser has
                    // *not* yet seen valid data, so loop and keep
                    // looking
                        return null

                }else{
                    if(_.isArray(result) && result.length>0){
                        // kay, this means "result" is not null...the parser
                        // got data from the line AND we're past the header bit
                        //
                        // oh, and it means we're ignoring empty arrays
                        //
                        // anyway, push result to the collector

                        // need to pick off the right stuff from header

                        // two cases, either state = 2,3 (class vs hour,
                        // speed vs hour) or state = 1 (speed vs class)

                        var combined_result = []
                        if(state == 1){
                            combined_result = result.reduce(speed_vs_class_row_reducer,combined_result)
                        }else{
                            combined_result = result.reduce(hourly_row_reducer,combined_result)
                        }

                        the_collectors[state](combined_result)
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
            .defer(speed_class_collector.done)
            .await(function(e){
                queue()
                .defer(speed_collector.end)
                .defer(class_collector.end)
                .defer(speed_class_collector.end)
                .await(cb)
            })
            return null;
        })
    }

    parse_file.get_speed_total = speed_total
    parse_file.get_class_total = class_total
    parse_file.get_speed_class_total = speed_class_total

    return parse_file
}

module.exports=setup_file_parser
