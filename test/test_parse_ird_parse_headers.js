/* global require console process it describe after before */

var should = require('should')
var _ = require('lodash');
var fs = require('fs')
var path = require('path')
var rootdir = path.normalize(__dirname+'/..')
var byline = require('byline')

var process_header_lines = require('../lib/ird_header.js')

describe ('process header lines',function(){
    it('should exist', function(done){
        var phl = process_header_lines()
        should.exist(phl)
        phl.should.have.property('reset')
        phl.should.have.property('get_lanes')
        phl.should.have.property('get_date')
        phl.should.have.property('get_site_no')
        phl.should.have.property('get_name')
        phl.should.have.property('ready')
        done()
    })
    it('should process header lines properly',function(done){
        var lines = [
'	Class and Speed Count by Lane  Report',
'	-------------------------------------',
'Site: 020-LOLETA_HUM-101-65.6	Lanes: NB#2 NB#1 SB#1 SB#2 ',
'Classification: CALIF	Start Class 0 End Class 15',
'FROM: Fri Mar 02 01:00:00 2012  TO: Fri Mar 02 02:00:00 2012',
'                                                 Lane Number',
'                                                      ',
'  Class  |    1    |   1    |   2    |   2    |   3    |   3    |   4    |   4    |   ALL  |   ALL  '
]

        var phl = process_header_lines()
        var notready = phl.ready()
        notready.should.not.be.ok;

        phl(lines[0])
        notready = phl.ready()
        notready.should.not.be.ok

        phl(lines[1])
        notready = phl.ready()
        notready.should.not.be.ok

        phl(lines[2])
        notready = phl.ready()
        notready.should.not.be.ok

        var site_no = phl.get_site_no()
        site_no.should.eql(20)

        var lanes = phl.get_lanes()
        lanes.should.have.length(4)
        lanes[0].should.eql('NB#2')
        lanes[1].should.eql('NB#1')
        lanes[2].should.eql('SB#1')
        lanes[3].should.eql('SB#2')

        var record = phl.get_record()
        should.not.exist(record)

        phl(lines[3])
        notready = phl.ready()
        notready.should.not.be.ok

        phl(lines[4])
        notready = phl.ready()
        notready.should.be.ok

        var date = phl.get_date()
        var date_string = date.toISOString()
        date_string.should.eql( (new Date('2012-03-02T01:00:00-0800')).toISOString())

        record = phl.get_record()
        record.should.be.ok
        record.should.eql([20,"'2012-03-02T09:00:00.000Z'"])

        phl.reset()
        notready = phl.ready()
        notready.should.not.be.ok

        done()
    })

    it('should parse a bigger file and successfully turn on header',function(done){
        var filename = rootdir+'/test/ird_small_test_file.txt'
        var stream = fs.createReadStream(filename)
        var phl = process_header_lines()
        var ready = phl.ready()
        ready.should.not.be.ok
        stream = byline.createStream(stream)
        stream.on('data', function(line) {
            phl(line)
            return null
        })
        stream.on('end',function(err){
            ready = phl.ready()
            ready.should.be.ok;
            return done()
        })
        return null
    })
    it('should parse a real file without duplicate times',function(done){
        var filename = rootdir+'/test/2012/STATION.020'
        var stream = fs.createReadStream(filename,{ encoding: 'utf8' })
        stream = byline.createStream(stream,{keepEmptyLines :true})

        var phl = process_header_lines()
        var ready = phl.ready()
        ready.should.not.be.ok
        var times = {}
        var hdr_count = 0
        var line_number = 0
        stream.on('readable', function() {
            var line;
            while (null !== (line = stream.read())) {
                phl(line)
                line_number++
                var key = phl.get_record()
                if(key){
                    key = key.join(' ')
                    if(times[key] !== undefined){
                        // the data is so ugly!  first, we've got
                        // Daylight Savings Time handled incorrectly
                        // (it just rolls along without fixing the
                        // hour)

                        // then we've got a whole block of data repeated on Mar 20 for some reason

                        var d = phl.get_date()
                        var test_DST = d.toISOString() == '2012-03-11T10:00:00.000Z' || d.toISOString() == '2012-03-11T09:00:00.000Z' // jeez I hate DST and all the broken parsing and hashing surrounding it
                        var test_dupe_data_day = d.isBetween('2012-03-19T23:59:00', '2012-03-21T00:00:01');

                        var test_dup_okay = test_DST || test_dupe_data_day
                        if(!test_dup_okay){
                            // debugging
                            console.log(JSON.stringify(line.toString()))
                            console.log(line_number)
                            console.log(d.toISOString())
                        }

                        test_dup_okay.should.be.ok;


                    }else{
                        hdr_count++
                    }
                    times[key]=1
                    phl.reset()
                }
            }
        return null
        })

        stream.on('end',function(err){
            (Object.keys(times)).should.have.lengthOf(hdr_count)
            return done()
        })
        return null
    })
})
