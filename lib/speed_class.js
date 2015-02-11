var re = /\s+/;
var speedkey = require('./speedkey.js')

function process_speed_class_lines(){
    var total = 0
    var parsed_something = false
    function process_line(line){
        var match = /((\d+-|>)\s*\d+)\s+(\d.*)/.exec(line)
        if(match === null){
            return null
        }
        parsed_something=true
        var speed = speedkey[match[1]]
        if(!speed){
            console.log({'line':line.toString(),
                         'match[1]':match[1],
                         'match[2]':match[2],
                         'error':'no speed value'})
            return -1
        }
        var counts = match[3].trim().split(re)
        total += +counts.pop() // total for row is last entry
        var class_counts = []
        counts.forEach(function(c,i){
            if(c>0){
                var vehclass = i+1
                class_counts.push([speed,vehclass,+c])
            }
            return null
        })
        return class_counts
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

module.exports=process_speed_class_lines
