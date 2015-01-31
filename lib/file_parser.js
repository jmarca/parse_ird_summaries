/* globals require console */

var make_collector = require('./collector.js').make_collector
var fs = require('fs')
var byline = require('byline')
var queue = require('queue-async')
var speedkey = require('./speedkey.js')

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


    var class_regex = options.class_regex || /DISTRIBUTION OF VEHICLE CLASSIFICATIONS BY HOUR OF DAY/;
    var speed_class_regex = options.speed_class_regex || /DISTRIBUTION OF SPEEDS BY VEHICLE CLASSIFICATION/;
    var speed_regex = options.speed_regex || /DISTRIBUTION OF VEHICLE SPEEDS BY HOUR OF DAY/;


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

        var state
        var states = [process_header_lines()
                     ,process_speed_class_lines
                     ,process_speed_hour_lines
                     ,process_class_hour_lines]

        var collector

        stream.on('data', function(line) {
            var result = null
            if(state && _.isArray(state) ){
                result = states[state[0]](line)
            }
            if(result === null){
                // maybe time to switch state
                if(state && _.isArray(state) && state.length == 2){
                    // check if header done parsing
                    if(states[0].ready()){
                        state.shift()
                        return null
                    }
                }
                if(class_regex.test(line)){
                    //if(collector !== undefined) collector.done(function(){})
                    collector = class_collector
                    states[0].reset()
                    state=[0,3]
                }else if(speed_class_regex.test(line)){
                    //if(collector !== undefined) collector.done(function(){})
                    collector = speed_class_collector
                    states[0].reset()
                    state=[0,1]
                }else if(speed_regex.test(line)){
                    //if(collector !== undefined) collector.done(function(){})
                    collector = speed_collector
                    states[0].reset()
                    state=[0,2]
                }
            }else{
                // push result to the collector
                if(_.isArray(result)){
                    // don't test collector here because it if is
                    // undefined I need to fail
                    if(state[0] === 1){

                        var header_cols = states[0].get_record(0)
                        //console.log(header_cols)
                        result = _.map(result
                                      ,function(row){
                                           return _.flatten([header_cols,row])
                                       })

                    }else{
                        result = _.map(result
                                      ,function(row){
                                           var header_cols = states[0].get_record(row.shift())
                                           //console.log(header_cols)
                                           return _.flatten([header_cols,row])
                                       })
                   }
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
            queue().defer(speed_class_collector.done)
            .defer(speed_collector.done)
            .defer(class_collector.done)
            .await(function(e){
                queue().defer(speed_class_collector.end)
                .defer(speed_collector.end)
                .defer(class_collector.end)
                .await(cb)
            })
            return null;
        })
    }
    return parse_file
}



function process_class_lane_lines(line){
    var match = /^\s*(\d{1,2})\s+\|\s+(.*)/.exec(line)
    if(match === null) return null
    // console.log(match)
    var cls = match[1]
    cls = +cls // make it a number
    var re = /\s+/;
    var counts = match[2].trim().split(re)

    // each lane is represented by first a count, then a pct
    // The last two entries are for all lanes.  drop them
    //
    // don't care about total pct
    counts.pop()
    // don't care about total count
    counts.pop()
    // now moving through, we automatically count all lanes
    var class_counts = []
    var lane = 0
    // loop over counts, skipping when index is odd because that is a percent
    counts.forEach(function(cnt,i){
        if(i%2 !== 0){
            return null
        }
        lane++
        if(cnt>0){
            class_counts.push([lane,cls,+cnt])
        }
        return null
    })

    return class_counts
}

function process_speed_lane_lines(line){
 // speed lines should look like one of
 //   Speed  |
 // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
 //   0->5   |       0      0.0        0      0.0        0      0.0        0      0.0
 //   5->10  |       0      0.0        0      0.0        0      0.0        0      0.0
    var match = /^\s*(\d+->\d+|100 +)\s+\|\s+(.*)/.exec(line)
    if(match === null) return null
    var spd = speedkey[match[1]]
    var re = /\s+/;
    var counts = match[2].trim().split(re)

    // each lane is represented by first a count, then a pct
    // The last two entries are for all lanes.  drop them
    // don't care about total pct
    counts.pop()
    // don't care about total count
    counts.pop()

    // now moving through, we automatically count all lanes
    var speed_counts = []
    var lane = 0
    // loop over counts, skipping when index is odd because that is a percent
    counts.forEach(function(cnt,i){
        if(i%2 !== 0){
            return null
        }
        lane++
        if(cnt>0){
            speed_counts.push([lane,spd,+cnt])
        }
        return null
    })

    return speed_counts
}

function process_speed_class_lines(line){
    var match = /((\d+-|>)\s*\d+)\s+(\d.*)/.exec(line)
    if(match === null){
        return null
    }
    var speed = speedkey[match[1]]
    var re = /\s+/;
    var counts = match[3].trim().split(re)
    // don't care about total column
    counts.pop()
    var class_counts = []
    _.forEach(counts
             ,function(c,i){
                  if(c>0){
                      var vehclass = i+1
                      class_counts.push([speed,vehclass,+c])
                  }
              })
    return class_counts
}

var process_speed_hour_lines = function(){
    var speed_ranges =[]
    return function(line){
        // line could be the header, or data
        // check for header first
        var match = /HOUR\s*(.*)\s*TOTALS/i.exec(line)
        if(match !== null){
            speed_ranges = match[1].trim().split(/\s{2,}/)
            speed_ranges = _.map(speed_ranges
                                ,function(range){
                                     return speedkey[range]
                                 })
            return null
        }
        match = /^\s*(\d+)-\s*\d+\s+(.*)/.exec(line)
        if(match === null){
            return null
        }
        var hour = +match[1]
        var counts = match[2].trim().split(/\s+/) // split on whitespace
        counts.pop() // don't care about totals
        var speed_counts = []
        _.forEach(counts
                 ,function(c,i){
                      if(c>0){
                          speed_counts.push([hour,speed_ranges[i],+c])
                  }
              })
        return speed_counts
    }
                               }()

var process_class_hour_lines = function(line){
    // no need to check header line for class...just integers
    var match = /(\d+)-\s*\d+\s+(.*)/.exec(line)
    if(match === null){
        return null
    }
    var hour = +match[1]
    var counts = match[2].trim().split(/\s+/) // split on whitespace
    counts.pop() // don't care about totals
    var class_counts = []
    _.forEach(counts
             ,function(c,i){
                  if(c>0){
                      class_counts.push([hour,i+1,+c])
                  }
              })
    return class_counts
}


exports.setup_file_parser=setup_file_parser
exports.process_class_hour_lines=process_class_hour_lines
exports.process_speed_hour_lines=process_speed_hour_lines
exports.process_speed_class_lines=process_speed_class_lines
exports.process_class_lane_lines=process_class_lane_lines
exports.process_speed_lane_lines=process_speed_lane_lines
exports.process_header_lines=process_header_lines
