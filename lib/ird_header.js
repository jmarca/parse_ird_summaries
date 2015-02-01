var moment = require('moment')

function process_header_lines(){

    var lanes=null;
    var site_no=null;
    var name=null;
    var date=null;

    // stateful parsing of lines.  When the SITE NO line is detected,
    // all data are reset
    var space_re = /\s+/;

    // sample site id line:
    // Site: 020-LOLETA_HUM-101-65.6	Lanes: NB#2 NB#1 SB#1 SB#2

    var site_no_regex = /^\s*Site:\s*0*(\d+)-(.*)\s+Lanes:\s*(.*)$/i;
    // first match is site number
    // second match is site name
    // third match is all the lanes (NB#2 NB#1, etc etc).  split on white space

    // sample date,hour line:
    // FROM: Thu Mar 01 00:00:00 2012  TO: Thu Mar 01 01:00:00 2012
    var date_regex = /FROM:\s*(?:Sun|Mon|Tue|Wed|Thu|Fri|Sat)\s*(.*)\s*TO/i;

    function process_line(line){
        var match = site_no_regex.exec(line)
        if(match !== null){
            site_no = +match[1]
            name = match[2]
            lanes = match[3].trim().split(space_re)
            return true
        }
        match = date_regex.exec(line)
        if(match !== null){
            //console.log(match)
            date = moment(match[1],"MMM DD HH:mm:ss YYYY")
            return true
        }
        return null
    }

    process_line.reset = function(){
        lanes=null;
        site_no=null;
        name=null;
        date=null;
    }
    process_line.get_lanes      = function(){return lanes}
    process_line.get_date      = function(){return date     }
    process_line.get_site_no   = function(){return site_no  }
    process_line.get_name      = function(){return name}

    process_line.get_record = function(){
            if(this.ready()){
                var ts = "'"+date.toISOString()+"'"
                return [site_no,ts]
            }
        return null
    }
    process_line.ready = function(){
        return (date !== null && site_no !== null)
    }

    return process_line;
}
module.exports=process_header_lines