var re = /\s+/;
var process_class_hour_lines = function(){

    var total = 0
    var parsed_something = false
    var clean_data = true
    function process_line(line){
        // no need to check header line for class...just integers
        var match = /(\d+)-\s*\d+\s+(.*)/.exec(line)
        // console.log('class_hour',match)
        if(match === null){
            // could be QTR totals, or table breaks
            if(parsed_something && /QTR TOTALS|^-+$|^=+$/.test(line)){
                // fake plain missing data
                return []
            }
            return null
        }
        parsed_something=true
        var hour = +match[1]
        // split on whitespace
        var counts = match[2].trim().split(re)
        var thistotal = +counts.pop() // total for row is last entry
        if (thistotal<0) clean_data = false
        total += thistotal
        var class_counts = []
        counts.forEach(function(c,i){
            if(c>0 && clean_data){
                class_counts.push([hour,i+1,+c])
            }
            if(c<0) clean_data = false
            return null
        })
        if(!clean_data) speed_counts = []
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
module.exports=process_class_hour_lines
