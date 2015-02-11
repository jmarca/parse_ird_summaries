var re = /\s+/;
var speedkey = require('./speedkey.js')

function process_speed_class_lines(){
    var total = 0
    var parsed_something = false
    var clean_data = true
    function process_line(line){
        var match = /^\s*((\d+-|>)\s*\d+)\s+(-?\d.*)/.exec(line)
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
        var thistotal = +counts.pop() // total for row is last entry
        if (thistotal<0) clean_data = false
        total += thistotal
        var class_counts = []
        counts.forEach(function(c,i){
            if(c>0 && clean_data){
                var vehclass = i+1
                class_counts.push([speed,vehclass,+c])
            }
            if(c<0) clean_data = false
            return null
        })
        if(!clean_data) class_counts = []
        return class_counts
    }
    process_line.get_total = function(){return total}
    process_line.reset = function(){
        total=0
        parsed_something=false
        clean_data=true
        return null
    }
    process_line.parsed_something = function(){
        return parsed_something
    }
    process_line.good_read = function(){
        return clean_data
    }

    return process_line

}

module.exports=process_speed_class_lines
