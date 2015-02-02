var speedkey=require('./speedkey.js')

var process_speed_hour_lines = function(){
    var speed_ranges =[]
    return function(line){
        // line could be the header, or data
        // check for header first
        var match = /HOUR\s*(.*)\s*TOTALS/i.exec(line)
        if(match !== null){
            speed_ranges = match[1].trim().split(/\s{2,}/)
            speed_ranges = speed_ranges.map(function(range){
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
        counts.forEach(function(c,i){
            if(c>0){
                speed_counts.push([hour,speed_ranges[i],+c])
            }
        })
        return speed_counts
    }
                               }()

module.exports=process_speed_hour_lines