var re = /\s+/;
var speedkey=require('./speedkey.js')

var process_speed_hour_lines = function(){
    var speed_ranges =[]
    var total = 0
    var parsed_something = false
    function process_line(line){
        // line could be the header, or data
        // check for speed-definition header first
        var match = /HOUR\s*(.*)\s*TOTALS/i.exec(line)
        if(match !== null){
            speed_ranges = match[1].trim().split(/\s{2,}/)
            speed_ranges = speed_ranges.map(function(range){
                               return speedkey[range]
                           })
            return []
        }
        match = /^\s*(\d+)-\s*\d+\s+(.*)/.exec(line)
        if(match === null){
            // could be QTR totals, or table breaks
            if( (parsed_something || speed_ranges.length > 0 ) &&
                 /QTR TOTALS|^-+$|^=+$/.test(line)){
                // fake plain missing data
                return []
            }
            return null
        }
        parsed_something=true
        var hour = +match[1]
        var counts = match[2].trim().split(/\s+/) // split on whitespace
        total += +counts.pop() // total for row is last entry
        var speed_counts = []
        counts.forEach(function(c,i){
            if(c>0){
                speed_counts.push([hour,speed_ranges[i],+c])
            }
            return null
        })
        return speed_counts
    }

    process_line.get_total = function(){return total}
    process_line.reset = function(){
        speed_ranges =[]
        total=0
        parsed_something=false
        return null
    }
    process_line.parsed_something = function(){
        return parsed_something
    }

    return process_line
}

module.exports=process_speed_hour_lines