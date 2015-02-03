/* global require console process it describe after before */

var should = require('should')
var _ = require('lodash');
// eventually, work out how to do
// var rewire = require("rewire");
// // rewire acts exactly like require.
// var myModule = rewire("../lib/parse_pat_reports");

var parse_head = require('../lib/pat_header.js')



describe ('process header lines',function(){
    it('should exist', function(){
        var ph = parse_head()
        should.exist(ph)
        ph.should.have.property('reset')
        ph.should.have.property('get_lane')
        ph.should.have.property('get_date')
        ph.should.have.property('get_direction')
        ph.should.have.property('get_site_no')
        ph.should.have.property('ready')
        return null
    })
    it('should process header lines properly',function(done){
        var lines = ['                    DISTRIBUTION OF VEHICLE SPEEDS BY HOUR OF DAY'
                    ,'========================================================================================================================'
                    ,'SITE NO :        035               Location :  PACHECO-SCL-152, 26.9                  Lane(s) :     1'
                    ,'DATE    :   01/12/10               County   :  SCL          State-ID : 06             Direction :   7'
                    ,'========================================================================================================================']

        var ph = parse_head()
        var notready = ph.ready()
        notready.should.not.be.ok

        ph(lines[0])
        notready = ph.ready()
        notready.should.not.be.ok

        ph(lines[1])
        notready = ph.ready()
        notready.should.not.be.ok

        ph(lines[2])
        notready = ph.ready()
        notready.should.not.be.ok

        var site_no = ph.get_site_no()
        site_no.should.eql(35)

        var lane = ph.get_lane()
        lane.should.eql(1)

        var record = ph.get_record(15)
        should.not.exist(record)

        ph(lines[3])
        notready = ph.ready()
        notready.should.be.ok

        ph(lines[4])
        notready = ph.ready()
        notready.should.be.ok

        var date = ph.get_date()
        var date_string = date.toISOString()
        date_string.should.eql( (new Date('2010-01-12T00:00:00-0000')).toISOString())

        var direction = ph.get_direction()
        direction.should.eql(7)

        record = ph.get_record(15)
        record.should.be.ok
        record.should.eql([35,"'2010-01-12 15:00:00'",1])

        ph(lines[4])
        notready = ph.ready()
        notready.should.be.ok

        ph.reset()
        notready = ph.ready()
        notready.should.not.be.ok

        done()
    })

})