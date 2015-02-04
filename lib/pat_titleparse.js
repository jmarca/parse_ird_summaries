function title_line_parser(options){

    if(!options) throw new Error('options object required')
    var speed_state = options.speed_state
    var class_state = options.class_state
    var speed_class_state = options.speed_class_state

    var class_test = /DISTRIBUTION OF VEHICLE CLASSIFICATIONS BY HOUR OF DAY/i
    var speed_class_test = /DISTRIBUTION OF SPEEDS BY VEHICLE CLASSIFICATION/i
    var speed_test = /DISTRIBUTION OF VEHICLE SPEEDS BY HOUR OF DAY/i
    if(speed_state === undefined ||
       class_state === undefined ||
       speed_class_state === undefined
      ){
        throw new Error('need speed_state, '
                        + 'class_state, and speed_class_state '
                        + 'defined in options object')
    }
    var state = 0
    function parse_line(line){
        if(class_test.test(line)){
            state = class_state
            return 1
        }
        if(speed_test.test(line)){
            state = speed_state
            return 1
        }
        if(speed_class_test.test(line)){
            state = speed_class_state
            return 1
        }
        return 0
    }
    parse_line.get_state = function(){ return state }
    return parse_line
}
module.exports=title_line_parser
