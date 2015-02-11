/* global require console process it describe after before */

var should = require('should')
var _ = require('lodash');
var speed_class = require('../lib/speed_class.js')


describe ('process speed class lines',function(){
    it('should exist', function(done){
        var psc = speed_class()
        should.exist(psc)
        psc.should.be.a.Function;
        psc.should.have.property('get_total')
        psc.should.have.property('reset')
        psc.should.have.property('parsed_something')
        psc.should.have.property('good_read')
        done()
    })
    it('should process speed class data lines properly',function(done){
        var lines =[
            'DISTRIBUTION OF SPEEDS BY VEHICLE CLASSIFICATION'
          ,'========================================================================================================================'
          ,'SITE NO :        035               Location :  PACHECO-SCL-152, 26.9                  Lane(s) :     1'
          ,'DATE    :   01/01/10               County   :  SCL          State-ID : 06             Direction :   7'
          ,'========================================================================================================================'
          ,''
          ,'                                                  VEHICLE COUNTS'
          ,'                                                  --------------'
          ,'SPEED'
          ,'( mph)           1     2     3     4     5     6     7     8     9    10    11    12    13    14    15    TOTALS'
          ,'------------------------------------------------------------------------------------------------------------------------'
          ,'  1-  5          0     0     0     0     0     0     0     0     0     0     0     0     0     0     0       0'
          ,'  6- 10          0     0     0     0     0     0     0     0     0     0     0     0     0     0     0       0'
          ,' 11- 15          0     0     0     0     0     0     0     0     0     0     0     0     0     0     0       0'
          ,' 16- 20          0     0     0     0     0     0     0     0     0     0     0     0     0     0     0       0'
          ,' 21- 25          0     0     0     0     0     0     0     0     0     0     0     0     0     0     0       0'
          ,' 26- 30          0     0     1     0     0     0     0     0     0     0     0     0     0     0     0       1'
          ,' 31- 35          0     3     1     0     1     0     0     0     0     0     0     0     0     0     0       5'
          ,' 36- 40          0     1     1     0     0     0     0     0     0     0     0     0     0     0     0       2'
          ,' 41- 45          0     5     0     0     0     0     0     0     0     0     0     0     0     0     0       5'
          ,' 46- 50          0    18     3     0     7     0     0     0    15     0     2     0     0     0     0      45'
          ,' 51- 55          0   126    30     4    27     1     0    17    87     1     9     0     0     2     3     307'
          ,' 56- 60          0   578   123     1    64     0     0    18    81     0    18     2     0     0     1     886'
          ,' 61- 65          0  2026   533    11   137     1     0     8    16     0     0     0     0     0     3    2735'
          ,' 66- 70          0  1655   401     3    55     0     0     0     1     0     0     0     0     0     1    2116'
          ,' 71- 75          0   756   255     0    22     1     0     1     0     0     0     0     0     0     0    1035'
          ,' 76- 80          0   221    62     0     3     0     0     0     0     0     0     0     0     0     0     286'
          ,' 81- 85          0    40     9     0     0     0     0     0     0     0     0     0     0     0     0      49'
          ,' 86- 90          0     1     1     0     0     0     0     0     0     0     0     0     0     0     0       2'
          ,' 91- 95          0     0     0     0     0     0     0     0     0     0     0     0     0     0     0       0'
          ,' 96-100          0     1     1     0     0     0     0     0     0     0     0     0     0     0     0       2'
          ,'  > 100          0     2     2     0     0     0     0     0     0     0     0     0     0     0     0       4'
          ,'------------------------------------------------------------------------------------------------------------------------'
          ,' TOTALS          0  5433  1423    19   316     3     0    44   200     1    29     2     0     2     8    7480'
          ,''
          ,'AVG. SPEED       0    66    66    61    62    63     0    57    56    53    56    58     0    53    59      65'
          ,'======================14====28====32====40=====43=========47=====52====53====56===57===========58====62========================================='
          ,''
          ,'DAILY SPEED SUMMARY'
          ,'-------------------'
          ,''
          ,'TOTAL VEHICLES   :   7480     TOTAL VEHICLES >  55 mph --  7115     PERCENTAGE OF VEHICLES >  55 mph --  95.1'
          ,'AVERAGE SPEED    :   65.4     TOTAL VEHICLES >  60 mph --  6229     PERCENTAGE OF VEHICLES >  60 mph --  83.3'
          ,'MEDIAN SPEED     :   64.8     TOTAL VEHICLES >  65 mph --  3494     PERCENTAGE OF VEHICLES >  65 mph --  46.7'
          ,'85th PERCENTILE  :   74.7     TOTAL VEHICLES >  70 mph --  1378     PERCENTAGE OF VEHICLES >  70 mph --  18.4'
          ,'========================================================================================================================'
        ]

        var psc = speed_class()
        var result

        var collect = []
        _.range(0,11).forEach(function(i){
            psc.parsed_something().should.not.be.ok;
            result = psc(lines[i])
            should.not.exist(result)
            return null
        })

        _.range(11,16).forEach(function(i){
            result = psc(lines[i])
            should.exist(result)
            result.should.be.instanceOf(Array).with.lengthOf(0)
            psc.parsed_something().should.be.ok;
            return null
        })


        // now should have non empty results
        _.range(16,29).forEach(function(i){
            result = psc(lines[i])
            should.exist(result)
            collect = collect.concat(result)
            return null
        })

        result = psc(lines[29])
        should.exist(result)
        result.should.be.instanceOf(Array).with.lengthOf(0)

        _.range(30,32).forEach(function(i){
            result = psc(lines[i])
            should.exist(result)
            collect = collect.concat(result)
            return null
        })


        collect[0].should.have.length(3)
        collect[8].should.have.length(3)
        collect.should.have.length(62)
        var popped = collect.pop()
        popped.should.eql([100,3,2])
        psc.reset()
        psc.parsed_something().should.not.be.ok;
        return done()
    })

    it('should process broken speed class data lines and not crash',function(done){
        var lines =[
           'DISTRIBUTION OF SPEEDS BY VEHICLE CLASSIFICATION'
          ,'========================================================================================================================'
          ,'SITE NO :        055               Location :  DUBLIN,SB-CC-680, R0.1                 Lane(s) :     3                   '
          ,'DATE    :   05/03/10               County   :   CC          State-ID : 06             Direction :   5                   '
          ,'========================================================================================================================'
          ,'                                                                                                                        '
          ,'                                                  VEHICLE COUNTS                                                        '
          ,'                                                  --------------                                                        '
          ,'SPEED                                                                                                                   '
          ,'( mph)           1     2     3     4     5     6     7     8     9    10    11    12    13    14    15    TOTALS        '
          ,'------------------------------------------------------------------------------------------------------------------------'
          ,'  1-  5          0     3     0    94    56     0     0     0     0     0     0    43    24     0     0     220          '
          ,'  6- 10          0     0     0    58   184     0     0     0     0     0     0    27   101     0     0     370          '
          ,' 11- 15          1    45     0     0   315     0     0     0     0     0     0     0   127     4    35     527          '
          ,' 16- 20          0     0     0     0    60    60     0     0     0     0     0     0    41    35   143     339          '
          ,' 21- 25          0     0     0     0    53   213     0     0     0     0     0     0    25    79   349     719          '
          ,' 26- 30          0     0     0     0     0   293     1     0     0     0     0     0     0    95   415     804          '
          ,' 31- 35          0     0     0     0     0    74    45     0     0     0     0     0     0    27   283     429          '
          ,' 36- 40          0     0     0     0     0    51   185     0     0     0     0     0     0    17    99     352          '
          ,' 41- 45          0     0     0     0     0     0   352     2     0     0     0     0     0     0    82     436          '
          ,' 46- 50          0     0     0     0     0     0    79    66     0     0     0     0     0     0    22     167          '
          ,' 51- 55          0     0     0     0     1     0    56   223     0     0     0     0     0     0    10     290          '
          ,' 56- 60          9     0     0     0     0     0     0   236     9     0     0-18762     0     0     0  -18508          '
          ,' 61- 65        136     1     0     0     0     0     0    49   127     0     0 10752     0     0     0   11065          '
          ,' 66- 70        405     2     0     1     0     0     0    39   253     3     0  3072     0     0     2    3777          '
          ,' 71- 75        459    17     1     3     0     0     0     0   237    14     0     0-18762     0     0  -18031          '
          ,' 76- 80         75    69     0     1     0     0     0     0    48   183     0     0 10752     0     0   11128          '
          ,' 81- 85         36   304     1     1     0     0     0     0    18   319     0     0  3072     0     0    3751          '
          ,' 86- 90          0   340     2     2     0     0     0     0     0   241     2     0     0-18762     0  -18175          '
          ,' 91- 95          0    88    31     2     0     0     0     0     0    38    70     0     0 10752     0   10981          '
          ,' 96-100          0    76   225     0     0     0     0     0     0    13   169     0     0  3072     0    3555          '
          ,'  > 100          0   283   320     2     0     0     0     0     0     0   182     0     0     0-18762  -17975          '
          ,'------------------------------------------------------------------------------------------------------------------------'
          ,' TOTALS       1121  1228   580   164   669   691   718   615   692   811   423 -4868 -4620 -4681-17322  -23779          '
          ,'                                                                                                                        '
          ,'AVG. SPEED      70    87   100    11    12    27    42    56    70    84    99    41    59    73   109      93          '
          ,'========================================================================================================================'
          ,'                                                                                                                        '
          ,'DAILY SPEED SUMMARY                                                                                                     '
          ,'-------------------                                                                                                     '
          ,'                                                                                                                        '
          ,'TOTAL VEHICLES   : -23779     TOTAL VEHICLES >  55 mph -- -28432     PERCENTAGE OF VEHICLES >  55 mph -- 119.6          '
          ,'AVERAGE SPEED    :   93.0     TOTAL VEHICLES >  60 mph -- -9924     PERCENTAGE OF VEHICLES >  60 mph --  41.7           '
          ,'MEDIAN SPEED     :    0.0     TOTAL VEHICLES >  65 mph -- -20989     PERCENTAGE OF VEHICLES >  65 mph --  88.3          '
          ,'85th PERCENTILE  :    0.0     TOTAL VEHICLES >  70 mph -- -24766     PERCENTAGE OF VEHICLES >  70 mph -- 104.2          '
          ,'========================================================================================================================'
        ]

        var psc = speed_class()
        var result

        var collect = []
        _.range(0,11).forEach(function(i){
            psc.parsed_something().should.not.be.ok;
            result = psc(lines[i])
            should.not.exist(result)
            return null
        })
        psc.good_read().should.be.ok;

        _.range(11,22).forEach(function(i){
            result = psc(lines[i])
            should.exist(result)
            result.should.be.instanceOf(Array)
            result.length.should.be.above(0)
            return null
        })

        psc.parsed_something().should.be.ok;
        psc.good_read().should.be.ok;

        _.range(22,32).forEach(function(i){
            result = psc(lines[i])
            should.exist(result)
            result.should.be.instanceOf(Array)
            result.length.should.eql(0)
            return null
        })

        psc.parsed_something().should.be.ok;
        psc.good_read().should.not.be.ok;

        _.range(32,lines.length).forEach(function(i){
            result = psc(lines[i])
            should.not.exist(result)
            return null
        })

        psc.good_read().should.not.be.ok;

        psc.reset()
        psc.parsed_something().should.not.be.ok;
        psc.good_read().should.be.ok;
        return done()
    })

})
