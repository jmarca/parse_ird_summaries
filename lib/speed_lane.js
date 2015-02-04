var speedkey = require('./speedkey.js')
function process_speed_lane_lines(){

    var total=0
    var parsed_something = false
    function process_line(line){
        // speed lines should look like one of
        //   Speed  |
        // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
        //   0->5   |       0      0.0        0      0.0        0      0.0        0      0.0
        //   5->10  |       0      0.0        0      0.0        0      0.0        0      0.0
        var match = /^\s*(\d+->\d+|100 \+)\s+\|\s+([0-9.\s]+)\s*$/.exec(line)
        if(match === null){
            return null
        }
        parsed_something=true
        var spd = speedkey[match[1]]
        if(!spd){
            console.log({'line':line.toString(),
                         'match[1]':match[1],
                         'match[2]':match[2],
                         'error':'no speed value'})
            throw new Error('no valid speed in match')
        }
        var re = /\s+/;
        var counts = match[2].trim().split(re)

        // each lane is represented by first a count, then a pct
        // The last two entries are for all lanes.  drop them
        // total pct
        counts.pop()
        // total count
        total += +counts.pop()

        // now moving through, we automatically count all lanes
        var speed_counts = []
        var lane = 0
        // loop over counts, skipping when index is odd because that is a percent
        counts.forEach(function(cnt,i){
            if(i%2 !== 0){
                return null
            }
            lane++
            var numeric_count = +cnt
            if(numeric_count && numeric_count>0){ // grasping at straws here
                speed_counts.push([lane,spd,numeric_count])
            }
            return null
        })

        return speed_counts
    }
    process_line.get_total = function(){return total}
    process_line.reset = function(){
        total=0
        parsed_something=false
        return null
    }
    process_line.parsed_something = function(){
        return parsed_something
    }
    return process_line
}
module.exports=process_speed_lane_lines
