/* global require console process it describe after before */

var should = require('should')
var _ = require('lodash');

var ppr = require('../lib/file_parser.js')

describe ('process speed lane lines',function(){
    it('should exist', function(done){
        var psll = ppr.process_speed_lane_lines
        should.exist(psll)
        done()
    })
    it('should process class lane data lines properly',function(done){
        var lines =[
'	Class and Speed Count by Lane  Report',
'	-------------------------------------',
'Site: 020-LOLETA_HUM-101-65.6	Lanes: NB#2 NB#1 SB#1 SB#2 ',
'Classification: CALIF	Start Class 0 End Class 15',
'FROM: Fri Mar 02 01:00:00 2012  TO: Fri Mar 02 02:00:00 2012',
'                                                 Lane Number',
'                                                      ',
'  Class  |    1    |   1    |   2    |   2    |   3    |   3    |   4    |   4    |   ALL  |   ALL  ',
'- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - ',
'             Count        % |  Count        % |  Count        % |  Count        % |  Count        % ',
'   0     |       0      0.0        0      0.0        0      0.0        0      0.0        0      0.0 ',
'   1     |       0      0.0        0      0.0        0      0.0        0      0.0        0      0.0 ',
'   2     |      32     66.7        4     66.7        6     75.0       18     62.1       60     65.9 ',
'   3     |      12     25.0        1     16.7        1     12.5        7     24.1       21     23.1 ',
'   4     |       0      0.0        0      0.0        0      0.0        0      0.0        0      0.0 ',
'   5     |       1      2.1        1     16.7        1     12.5        2      6.9        5      5.5 ',
'   6     |       0      0.0        0      0.0        0      0.0        0      0.0        0      0.0 ',
'   7     |       0      0.0        0      0.0        0      0.0        0      0.0        0      0.0 ',
'   8     |       0      0.0        0      0.0        0      0.0        0      0.0        0      0.0 ',
'   9     |       3      6.3        0      0.0        0      0.0        2      6.9        5      5.5 ',
'   10    |       0      0.0        0      0.0        0      0.0        0      0.0        0      0.0 ',
'   11    |       0      0.0        0      0.0        0      0.0        0      0.0        0      0.0 ',
'   12    |       0      0.0        0      0.0        0      0.0        0      0.0        0      0.0 ',
'   13    |       0      0.0        0      0.0        0      0.0        0      0.0        0      0.0 ',
'   14    |       0      0.0        0      0.0        0      0.0        0      0.0        0      0.0 ',
'   15    |       0      0.0        0      0.0        0      0.0        0      0.0        0      0.0 ',
'= = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = ',
'  Total  |      48     52.7        6      6.6        8      8.8       29     31.9       91    100.0 ',
'                                                                                                    ',
'                                                                                                    ',
'                                                                                                    ',
'  Speed  |                                                                                          ',
'- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - ',
'  0->5   |       0      0.0        0      0.0        0      0.0        0      0.0        0      0.0 ',
'  5->10  |       0      0.0        0      0.0        0      0.0        0      0.0        0      0.0 ',
' 10->15  |       0      0.0        0      0.0        0      0.0        0      0.0        0      0.0 ',
' 15->20  |       0      0.0        0      0.0        0      0.0        0      0.0        0      0.0 ',
' 20->25  |       0      0.0        0      0.0        0      0.0        0      0.0        0      0.0 ',
' 25->30  |       0      0.0        0      0.0        0      0.0        0      0.0        0      0.0 ',
' 30->35  |       0      0.0        0      0.0        0      0.0        0      0.0        0      0.0 ',
' 35->40  |       0      0.0        0      0.0        0      0.0        0      0.0        0      0.0 ',
' 40->45  |       0      0.0        0      0.0        0      0.0        0      0.0        0      0.0 ',
' 45->50  |       0      0.0        0      0.0        0      0.0        1      3.4        1      1.1 ',
' 50->55  |       3      6.3        1     16.7        0      0.0        2      6.9        6      6.6 ',
' 55->60  |      10     20.8        1     16.7        0      0.0        8     27.6       19     20.9 ',
' 60->65  |      15     31.3        1     16.7        2     25.0        7     24.1       25     27.5 ',
' 65->70  |      16     33.3        2     33.3        4     50.0        6     20.7       28     30.8 ',
' 70->75  |       4      8.3        1     16.7        1     12.5        3     10.3        9      9.9 ',
' 75->80  |       0      0.0        0      0.0        0      0.0        1      3.4        1      1.1 ',
' 80->85  |       0      0.0        0      0.0        0      0.0        0      0.0        0      0.0 ',
' 85->90  |       0      0.0        0      0.0        0      0.0        0      0.0        0      0.0 ',
' 90->95  |       0      0.0        0      0.0        0      0.0        0      0.0        0      0.0 ',
' 95->100 |       0      0.0        0      0.0        1     12.5        1      3.4        2      2.2 ',
' 100 +   |       0      0.0        0      0.0        0      0.0        0      0.0        0      0.0 ',
'= = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = ',
'  Total  |      48     52.7        6      6.6        8      8.8       29     31.9       91    100.0 ',
            ''
        ]

        var psll = ppr.process_speed_lane_lines
        var result

        var collect = []
        _.range(0,33).forEach(function(i){
            result = psll(lines[i])
            should.not.exist(result)
        })


        // now should have non null results
        _.range(33,53).forEach(function(i){
            result = psll(lines[i])
            if(result && result.length > 0){
                collect = collect.concat(result)
            }
        })

        // no more matches
        _.range(53,lines.length).forEach(function(i){
            result = psll(lines[i])
            should.not.exist(result)
        })

        collect.should.have.length(22)
        collect.forEach(function(row){
            row.should.have.length(3)
            return null
        })
        // collect is lane,class,count
        collect[0].should.eql([4,47.5,1])
        collect[1].should.eql([1,52.5,3])
        collect[2].should.eql([2,52.5,1])
        collect[3].should.eql([4,52.5,2])
        collect[4].should.eql([1,57.5,10])
        collect[5].should.eql([2,57.5,1])
        collect[6].should.eql([4,57.5,8])
        collect[7].should.eql([1,62.5,15])
        collect[8].should.eql([2,62.5,1])
        collect[9].should.eql([3,62.5,2])
        collect[10].should.eql([4,62.5,7])
        collect[11].should.eql([1,67.5,16])
        collect[12].should.eql([2,67.5,2])
        collect[13].should.eql([3,67.5,4])
        collect[14].should.eql([4,67.5,6])
        collect[15].should.eql([1,72.5,4])
        collect[16].should.eql([2,72.5,1])
        collect[17].should.eql([3,72.5,1])
        collect[18].should.eql([4,72.5,3])
        collect[19].should.eql([4,77.5,1])
        collect[20].should.eql([3,97.5,1])
        collect[21].should.eql([4,97.5,1])


        done()
    })

})