function process_header_lines(){

    var lane=null;
    var site_no=null;
    var date=null;
    var direction=null;

    // stateful parsing of lines.  When the SITE NO line is detected,
    // all data are reset

    var site_no_regex = /SITE NO\s*:\s*0*(\d+).*Lane.*:\s*(\d+)/i
    var date_regex = /DATE\s*:\s*0?(\d+)\/0?(\d+)\/(\d+).*Direction.*:\s*(\d)/i

    function process_line(line){
        var match = site_no_regex.exec(line)
        if(match !== null){
            site_no = +match[1]
            lane = +match[2]
            return true
        }
        match = date_regex.exec(line)
        if(match !== null){
            date = new Date(2000+(+match[3]),match[1]-1,match[2])
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
                var d = new Date(date)
                    d.setHours(hour)
                var ts = "'"+d.toISOString()+"'"
                return [site_no,ts,lane]
            }
                              return null
                          }
    process_line.ready = function(){
                      return (date !== null && site_no !== null && lane !== null)
                  }

    return process_line;
}
