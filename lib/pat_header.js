var moment = require('moment-timezone');

function process_header_lines(){

    var lane=null;
    var site_no=null;
    var date=null;
    var direction=null;

    var space_re = /\s+/;
    var site_no_regex = /SITE NO\s*:\s*0*(\d+).*Lane.*:\s*(\d+)/i
    var date_regex = /DATE\s*:\s*(\d+)\/(\d+)\/(\d+).*Direction.*:\s*(\d)/i

    function process_line(line){
        var match = site_no_regex.exec(line)
        if(match !== null){
            site_no = +match[1]
            lane = +match[2]
            return true
        }
        match = date_regex.exec(line)
        if(match !== null){
            var date_string = 20+match[3]+'-'+match[1]+'-'+match[2] +'T00:00'
            date = moment.tz(date_string,"YYYY-MM-DDTHH:mm",'UTC')
            direction = +match[4]
            return true
        }
        return null
    }

    process_line.reset = function(){
                            lane = null
                            date = null
                            direction = null
                            site_no=null
                        }
    process_line.get_lane      = function(){return lane}
    process_line.get_date      = function(){return date     }
    process_line.get_direction = function(){return direction}
    process_line.get_site_no   = function(){return site_no  }

    process_line.get_record = function(hour){
            if(this.ready()){
                if(!hour) hour = 0
                var output_date = moment(date) // clone
                output_date.add(hour, 'hours')
                var ts = "'"+output_date.format('YYYY-MM-DD HH:mm:ss')+"'"
                return [site_no,ts,lane]
            }
                              return null
                          }
    process_line.ready = function(){
        return (date !== null &&
                site_no !== null &&
                lane !== null &&
                direction !== null
               )
    }

    return process_line;
}
module.exports=process_header_lines
