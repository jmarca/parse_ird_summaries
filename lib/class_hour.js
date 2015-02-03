var re = /\s+/;
var process_class_hour_lines = function(){

    var total = 0
    var parsed_something = false
    function process_line(line){
        // no need to check header line for class...just integers
        var match = /(\d+)-\s*\d+\s+(.*)/.exec(line)
        if(match === null){
            return null
        }
        parsed_something=true
        var hour = +match[1]
        // split on whitespace
        var counts = match[2].trim().split(re)
        total += +counts.pop() // total for row is last entry
        var class_counts = []
        counts.forEach(function(c,i){
            if(c>0){
                class_counts.push([hour,i+1,+c])
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
module.exports=process_class_hour_lines