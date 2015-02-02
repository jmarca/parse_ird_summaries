var speedkey = require('./speedkey.js')

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
    counts.forEach(function(c,i){
        if(c>0){
            var vehclass = i+1
            class_counts.push([speed,vehclass,+c])
        }
    })
    return class_counts
}

module.exports=process_speed_class_lines