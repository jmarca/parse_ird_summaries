/* global require console process it describe after before */

var should = require('should')
var _ = require('lodash');
var fs = require('fs')
var path = require('path')
var rootdir = path.normalize(__dirname+'/..')
var byline = require('byline')

var process_title = require('../lib/pat_titleparse.js')

describe ('process header lines',function(){
    it('should exist', function(done){
        var phl
        process_title.bind(null, null).should.throw();

        phl=process_title({speed_state:1
                          ,class_state:2
                          ,speed_class_state:3})

        should.exist(phl)
        phl.should.have.property('get_state')
        phl.should.be.a.Function;
        return done()
    })
    it('should process header lines properly',function(done){
        var lines = [
'                    DISTRIBUTION OF VEHICLE CLASSIFICATIONS BY HOUR OF DAY'
,'========================================================================================================================'
,'SITE NO :        035               Location :  PACHECO-SCL-152, 26.9                  Lane(s) :     1                   '
,'DATE    :   02/01/10               County   :  SCL          State-ID : 06             Direction :   7                   '
,'========================================================================================================================'
,'                                                                                                                        '
,'HOURLY SUMMARY                                   VEHICLE COUNTS                                                         '
,'--------------                                   --------------                                                         '
,'HOUR                1     2     3     4     5     6     7     8     9    10    11    12    13    14    15     TOTALS    '
,'------------------------------------------------------------------------------------------------------------------------'
,' 0- 1               0    96    19     5    10     1     0     1    22     0     2     0     0     0     0      156      '
,' 1- 2               0    48    15     6     5     0     0     3    24     0     1     0     0     0     1      103      '
,' 2- 3               0    39    11     1     2     0     0     2    33     0     1     1     0     1     1       92      '
,' 3- 4               0    38    19     0     4     0     0     2    60     0     2     0     0     0     1      126      '
,' 4- 5               0   151    33     1    14     1     0     1    57     1     4     0     0     1     0      264      '
,' 5- 6               0   255    89     1    31     0     0     5    75     0     5     1     0     0     1      463      '
,'------------------------------------------------------------------------------------------------------------------------'
,'QTR TOTALS          0   627   186    14    66     2     0    14   271     1    15     2     0     2     4     1204      '
,'========================================================================================================================'
,' 6- 7               0   285   107     0    38     3     0     6    88     1     7     0     0     0     0      535      '
,' 7- 8               0   295   103     1    38     2     0     6    65     1     0     0     0     3     0      514      '
,' 8- 9               0   216    79     0    46     2     0     5    72     0     3     1     0     2     2      428      '
,' 9-10               0   207    93     1    41     0     0     6    56     0     4     0     0     1     3      412      '
,'10-11               0   192    90     1    23     3     0     6    58     1    15     0     0     0     2      391      '
,'11-12               0   182    65     0    23     1     1     8    77     0     4     1     0     1     3      366      '
,'------------------------------------------------------------------------------------------------------------------------'
,'QTR TOTALS          0  1377   537     3   209    11     1    37   416     3    33     2     0     7    10     2646      '
,'========================================================================================================================'
,'12-13               0   178    64     0    24     1     0     1    67     1     7     1     0     2     0      346      '
,'13-14               0   205    58     0    36     2     0    11    42     0     5     1     0     2     2      364      '
,'14-15               0   203    71     1    35     1     0     3    43     0     4     0     0     0     1      362      '
,'15-16               0   199    59     2    17     2     0    10    44     1     3     1     0     0     1      339      '
,'16-17               0   182    69     2    28     3     0     0    31     2     6     0     0     1     1      325      '
,'17-18               0   151    63     4    20     1     0     5    35     0     4     0     0     0     0      283      '
,'------------------------------------------------------------------------------------------------------------------------'
,'QTR TOTALS          0  1118   384     9   160    10     0    30   262     4    29     3     0     5     5     2019      '
,'========================================================================================================================'
,'18-19               0   164    60     1    17     1     0     4    35     0     1     0     0     0     0      283      '
,'19-20               0   150    39     2    11     0     0     4    34     0     1     0     0     0     1      242      '
,'20-21               0   116    43     1     7     2     0     2    36     0     2     1     0     0     2      212      '
,'21-22               0    87    32     0    15     0     0     3    32     0     4     2     0     0     0      175      '
,'22-23               0    86    28     1     7     0     0     1    28     0     4     0     0     0     0      155      '
,'23-24               0    61    19     0     7     0     0     1    29     0     2     1     0     0     0      120      '
,'------------------------------------------------------------------------------------------------------------------------'
,'QTR TOTALS          0   664   221     5    64     3     0    15   194     0    14     4     0     0     3     1187      '
,'========================================================================================================================'
,'                                                                                                                        '
,'DAILY SUMMARY                                        VEHICLE COUNTS                                                     '
,'------------------------------------------------------------------------------------------------------------------------'
,'                    1     2     3     4     5     6     7     8     9    10    11    12    13    14    15     TOTALS    '
,'                                                                                                                        '
,'TOTAL               0  3786  1328    31   499    26     1    96  1143     8    91    11     0    14    22       7056    '
,'PERCENT           0.0  53.7  18.8   0.4   7.1   0.4   0.0   1.4  16.2   0.1   1.3   0.2   0.0   0.2   0.3      100.0    '
,'                                                                                                                        '
,'========================================================================================================================'
,'                                                                                                                      '
,'DISTRIBUTION OF SPEEDS BY VEHICLE CLASSIFICATION                                                                        '
,'========================================================================================================================'
,'SITE NO :        035               Location :  PACHECO-SCL-152, 26.9                  Lane(s) :     1                   '
,'DATE    :   02/01/10               County   :  SCL          State-ID : 06             Direction :   7                   '
,'========================================================================================================================'
,'                                                                                                                        '
,'                                                  VEHICLE COUNTS                                                        '
,'                                                  --------------                                                        '
,'SPEED                                                                                                                   '
,'( mph)           1     2     3     4     5     6     7     8     9    10    11    12    13    14    15    TOTALS        '
,'------------------------------------------------------------------------------------------------------------------------'
,'  1-  5          0     1     0     0     0     0     0     0     0     0     0     0     0     0     0       1          '
,'  6- 10          0     0     0     0     0     0     0     0     0     0     0     0     0     0     0       0          '
,' 11- 15          0     0     0     0     0     0     0     0     0     0     0     0     0     0     0       0          '
,' 16- 20          0     0     0     0     0     0     0     0     0     0     0     0     0     0     0       0          '
,' 21- 25          0     0     0     0     0     0     0     0     0     0     0     0     0     0     0       0          '
,' 26- 30          0     0     0     0     0     0     0     0     0     0     0     0     0     0     0       0          '
,' 31- 35          0     0     2     0     3     0     0     0     1     0     0     0     0     0     0       6          '
,' 36- 40          0     4     0     0     0     0     0     0     0     0     0     0     0     0     0       4          '
,' 41- 45          0     0     0     0     2     0     0     1     3     0     0     0     0     0     0       6          '
,' 46- 50          0     9     3     1     3     1     0     3    51     0     5     0     0     0     1      77          '
,' 51- 55          0    82    24     2    52     8     0    41   501     5    42     5     0     6     7     775          '
,' 56- 60          0   419   139     7   135     7     1    41   498     3    38     5     0     7     8    1308          '
,' 61- 65          0  1478   483    15   181     8     0     9    88     0     6     1     0     1     1    2271          '
,' 66- 70          0  1110   417     5    90     2     0     1     1     0     0     0     0     0     0    1626          '
,' 71- 75          0   519   204     0    24     0     0     0     0     0     0     0     0     0     0     747          '
,' 76- 80          0   131    47     1     7     0     0     0     0     0     0     0     0     0     0     186          '
,' 81- 85          0    28     7     0     0     0     0     0     0     0     0     0     0     0     0      35          '
,' 86- 90          0     2     0     0     0     0     0     0     0     0     0     0     0     0     0       2          '
,' 91- 95          0     0     0     0     0     0     0     0     0     0     0     0     0     0     0       0          '
,' 96-100          0     1     0     0     0     0     0     0     0     0     0     0     0     0     0       1          '
,'  > 100          0     2     2     0     2     0     0     0     0     0     0     0     0     0     5      11          '
,'------------------------------------------------------------------------------------------------------------------------'
,' TOTALS          0  3786  1328    31   499    26     1    96  1143     8    91    11     0    14    22    7056          '
,'                                                                                                                        '
,'AVG. SPEED       0    66    66    62    62    58    58    56    56    55    55    56     0    56    66      64          '
,'========================================================================================================================'
,'                                                                                                                        '
,'DAILY SPEED SUMMARY                                                                                                     '
,'-------------------                                                                                                     '
,'                                                                                                                        '
,'TOTAL VEHICLES   :   7056     TOTAL VEHICLES >  55 mph --  6187     PERCENTAGE OF VEHICLES >  55 mph --  87.7           '
,'AVERAGE SPEED    :   63.5     TOTAL VEHICLES >  60 mph --  4879     PERCENTAGE OF VEHICLES >  60 mph --  69.1           '
,'MEDIAN SPEED     :   64.7     TOTAL VEHICLES >  65 mph --  2608     PERCENTAGE OF VEHICLES >  65 mph --  37.0           '
,'85th PERCENTILE  :   69.0     TOTAL VEHICLES >  70 mph --   982     PERCENTAGE OF VEHICLES >  70 mph --  13.9           '
,'========================================================================================================================'
,'                                                                                                                        '
,'                                                                                                                      '
,'                    DISTRIBUTION OF VEHICLE SPEEDS BY HOUR OF DAY                                                       '
,'========================================================================================================================'
,'SITE NO :        035               Location :  PACHECO-SCL-152, 26.9                  Lane(s) :     1                   '
,'DATE    :   02/01/10               County   :  SCL          State-ID : 06             Direction :   7                   '
,'========================================================================================================================'
,'                                                                                                                        '
,'                                             SPEED  RANGE, ( mph)                                                       '
,'                                             --------------------                                                       '
,'HOUR           00-35   36-40   41-45   46-50   51-55   56-60   61-65   66-70   71-75   76-80   81-85    > 85  TOTALS    '
,'------------------------------------------------------------------------------------------------------------------------'
,' 0- 1             0       0       0       3      10      24      44      34      27      10       4       0     156     '
,' 1- 2             0       0       0       3      16      30      24      16      10       2       2       0     103     '
,' 2- 3             0       0       0       1      14      26      19      16      12       2       1       1      92     '
,' 3- 4             0       0       0       3      28      37      32      18       5       2       0       1     126     '
,' 4- 5             0       0       0       1      42      50      83      57      23       6       1       1     264     '
,' 5- 6             0       0       0       3      36      73     144     119      61      17       7       3     463     '
,'------------------------------------------------------------------------------------------------------------------------'
,'QTR TOTALS        0       0       0      14     146     240     346     260     138      39      15       6    1204     '
,'========================================================================================================================'
,' 6- 7             0       0       0       1      50      94     199     119      53      18       1       0     535     '
,' 7- 8             0       1       0       1      26      78     161     152      67      21       6       1     514     '
,' 8- 9             0       0       0       5      58      89     143      88      39       4       1       1     428     '
,' 9-10             1       0       0       3      47      67     155      92      39       5       0       3     412     '
,'10-11             0       0       1       7      51      76     124      86      37       8       0       1     391     '
,'11-12             3       0       2       1      36      87     119      80      22      12       3       1     366     '
,'------------------------------------------------------------------------------------------------------------------------'
,'QTR TOTALS        4       1       3      18     268     491     901     617     257      68      11       7    2646     '
,'========================================================================================================================'
,'12-13             1       2       1       7      36      64     113      74      40       7       1       0     346     '
,'13-14             0       0       0       5      45      60     125      84      40       4       1       0     364     '
,'14-15             1       0       0       1      41      57     107     103      40      12       0       0     362     '
,'15-16             0       0       0       3      38      62     101      89      39       6       1       0     339     '
,'16-17             0       0       0       2      24      63     119      77      37       3       0       0     325     '
,'17-18             0       0       0       2      27      51      84      68      32      16       3       0     283     '
,'------------------------------------------------------------------------------------------------------------------------'
,'QTR TOTALS        2       2       1      20     211     357     649     495     228      48       6       0    2019     '
,'========================================================================================================================'
,'18-19             1       0       0       6      34      44      89      66      34       8       0       1     283     '
,'19-20             0       1       0       7      29      44      74      54      25       8       0       0     242     '
,'20-21             0       0       1       4      35      39      75      44      13       1       0       0     212     '
,'21-22             0       0       0       3      26      40      51      32      20       2       1       0     175     '
,'22-23             0       0       1       4      13      26      56      31      18       6       0       0     155     '
,'23-24             0       0       0       1      13      27      30      27      14       6       2       0     120     '
,'------------------------------------------------------------------------------------------------------------------------'
,'QTR TOTALS        1       1       2      25     150     220     375     254     124      31       3       1    1187     '
,'========================================================================================================================'
,'                                                                                                                        '
,'                                                                                                                        '
,'SUMMARY         00-35   36-40   41-45   46-50   51-55   56-60   61-65   66-70   71-75   76-80   81-85    > 85  TOTALS   '
,'------------------------------------------------------------------------------------------------------------------------'
,'TOTAL             7       4       6      77     775    1308    2271    1626     747     186      35      14    7056     '
,'PERCENT         0.1     0.1     0.1     1.1    11.0    18.5    32.2    23.0    10.6     2.6     0.5     0.2   100.0     '
,'                                                                                                                        '
,'                                                                                                                        '
,'                                                                                                                        '
,'DAILY SPEED SUMMARY                                                                                                     '
,'-------------------                                                                                                     '
,'                                                                                                                        '
,'TOTAL VEHICLES   :   7056     TOTAL VEHICLES >  55 mph --  6187     PERCENTAGE OF VEHICLES >  55 mph --  87.7           '
,'AVERAGE SPEED    :   63.5     TOTAL VEHICLES >  60 mph --  4879     PERCENTAGE OF VEHICLES >  60 mph --  69.1           '
,'MEDIAN SPEED     :   64.7     TOTAL VEHICLES >  65 mph --  2608     PERCENTAGE OF VEHICLES >  65 mph --  37.0           '
,'85th PERCENTILE  :   69.0     TOTAL VEHICLES >  70 mph --   982     PERCENTAGE OF VEHICLES >  70 mph --  13.9           '
,'========================================================================================================================'
        ]
        var phl=process_title({speed_state:1
                              ,class_state:2
                              ,speed_class_state:3})
        var state = phl.get_state()
        state.should.eql(0)

        // now run through the above.  Should hit all three "states"
        var hits = []
        lines.forEach(function(line){
            var r = phl(line)
            if(r){
                // switched state
                hits.push(phl.get_state())
            }
            return null
        })
        hits.sort()
        hits.should.eql([1,2,3])
        return done()
    })
})