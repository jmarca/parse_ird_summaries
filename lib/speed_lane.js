var speedkey = require('./speedkey.js')
var total=0
function process_speed_lane_lines(line){
 // speed lines should look like one of
 //   Speed  |
 // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
 //   0->5   |       0      0.0        0      0.0        0      0.0        0      0.0
 //   5->10  |       0      0.0        0      0.0        0      0.0        0      0.0
    var match = /^\s*(\d+->\d+|100 \+)\s+\|\s+(.*)/.exec(line)
    if(match === null) return null
    var spd = speedkey[match[1]]
    var re = /\s+/;
    var counts = match[2].trim().split(re)

    // each lane is represented by first a count, then a pct
    // The last two entries are for all lanes.  drop them
    // total pct
    counts.pop()
    // total count
    total = +counts.pop()

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
process_speed_lane_lines.get_total = function(){return total}
module.exports=process_speed_lane_lines
