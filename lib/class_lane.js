var total = 0
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
    //  total pct
    counts.pop()
    //  total count
    total = +counts.pop()
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
process_class_lane_lines.get_total = function(){return total}
module.exports=process_class_lane_lines