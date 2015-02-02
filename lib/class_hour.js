var process_class_hour_lines = function(line){
    // no need to check header line for class...just integers
    var match = /(\d+)-\s*\d+\s+(.*)/.exec(line)
    if(match === null){
        return null
    }
    var hour = +match[1]
    var counts = match[2].trim().split(/\s+/) // split on whitespace
    counts.pop() // don't care about totals
    var class_counts = []
    counts.forEach(function(c,i){
        if(c>0){
            class_counts.push([hour,i+1,+c])
        }
    })
    return class_counts
}
module.exports=process_class_hour_lines