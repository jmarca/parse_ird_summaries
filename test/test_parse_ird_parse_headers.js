/* global require console process it describe after before */

var should = require('should')
var _ = require('lodash');

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

})
