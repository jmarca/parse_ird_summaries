#!/usr/bin/perl -w

use warnings;
use strict;
use Data::Dumper;
use version; our $VERSION = qv('0.0.2');
use English qw(-no_match_vars);
use Carp;

use IO::File;
use Text::CSV;

use Getopt::Long;
use DateTime::Format::DateParse;
use DateTime::Format::Pg;
use Testbed::Spatial::VDS::Schema;

my $fh = IO::File->new();

my $dir;

my $db='spatialvds';
my $host='metis.its.uci.edu';
my $dbuser;
my $dbpass;

#### This is the part where options are set

my $user   = 'slash';
my $pass   = 'grace';
my $host   = 'metis.its.uci.edu';
my $dbname = 'spatialvds';
my $port   = 5432;
my $month;
my $year;
my $site_no;
my $path;
my $help;
my $deletedb;
my $dumpsize = 1000;

my $cdb_host   = '127.0.0.1';
my $cdb_port   = '5984';
my $cdb_dbname = 'wimrawdocs';
my $cdb_user   = 'james';
my $cdb_pass   = 'magicn0mb3r';

my $reparse;
my $pat;

my $result = GetOptions(
    'username:s'  => \$user,
    'password:s'  => \$pass,
    'host:s'      => \$host,
    'db:s'        => \$dbname,
    'port:i'      => \$port,
    'cusername:s' => \$cdb_user,
    'cpassword:s' => \$cdb_pass,
    'chost:s'     => \$cdb_host,
    'cdb:s'       => \$cdb_dbname,
    'cport:i'     => \$cdb_port,
    'month=i'     => \$month,
    'year=i'      => \$year,
    'site:i'      => \$site_no,
    'path=s'      => \$path,
    'delete'      => \$deletedb,
    'reparse'     => \$reparse,
    'pat'         => \$pat,
    'bulksize=i'  => \$dumpsize,
    'help|?'      => \$help
);

if ( !$result || $help ) {
    pod2usage(1);
}

#now make the postgres connector
my $vdb =
  Testbed::Spatial::VDS::Schema->connect( "dbi:Pg:dbname=$dbname;host=$host",
    $user, $pass, {}, { disable_sth_caching => 1 } );

my $csv_speed = Text::CSV->new(
    {
        allow_whitespace => 1,
        blank_is_undef   => 1,
        empty_is_undef   => 1,
    }
);

# bind variables to lines
$csv_speed->column_names(
    qw{lane
      month
      day
      year
      hour
      minute
      second
      veh_no
      veh_class
      gross_weight
      veh_len
      speed
      violation_code
      axle_1_rt_weight
      axle_1_lt_weight
      axle_2_rt_weight
      axle_2_lt_weight
      axle_1_2_spacing
      axle_3_rt_weight
      axle_3_lt_weight
      axle_2_3_spacing
      axle_4_rt_weight
      axle_4_lt_weight
      axle_3_4_spacing
      axle_5_rt_weight
      axle_5_lt_weight
      axle_4_5_spacing
      axle_6_rt_weight
      axle_6_lt_weight
      axle_5_6_spacing
      axle_7_rt_weight
      axle_7_lt_weight
      axle_6_7_spacing
      axle_8_rt_weight
      axle_8_lt_weight
      axle_7_8_spacing
      axle_9_rt_weight
      axle_9_lt_weight
      axle_8_9_spacing
      }
);
$csv_speed->types(
    [
        Text::CSV::PV(), Text::CSV::IV(), Text::CSV::NV(), Text::CSV::IV(), Text::CSV::IV(),
        Text::CSV::IV(), Text::CSV::IV(), Text::CSV::IV(), Text::CSV::IV(),
        Text::CSV::IV(), Text::CSV::NV(), Text::CSV::NV(), Text::CSV::NV(),
        Text::CSV::IV(), Text::CSV::NV(), Text::CSV::NV(), Text::CSV::NV(),
        Text::CSV::NV(), Text::CSV::NV(), Text::CSV::NV(), Text::CSV::NV(),
        Text::CSV::NV(), Text::CSV::NV(), Text::CSV::NV(), Text::CSV::NV(),
        Text::CSV::NV(), Text::CSV::NV(), Text::CSV::NV(), Text::CSV::NV(),
        Text::CSV::NV(), Text::CSV::NV(), Text::CSV::NV(), Text::CSV::NV(),
        Text::CSV::NV(), Text::CSV::NV(), Text::CSV::NV(), Text::CSV::NV(),
        Text::CSV::NV(), Text::CSV::NV(), Text::CSV::NV(),
    ]
);


sub skipto{
  my $fh = shift;
  my $target = shift;
  my $skip=0;
  my $maxskip=6;
  while ($line = $fh->getline() && $skip++ < $maxskip){
    if($line =~ /$target/){
      last;
    }
  }
  if( $line =~ /Class/){
    $skip=0;
  }else{
    croak 'problem parsing at line ', $fh->input_line_number();
  }
  return;
}


sub bulk_docs {
    my $reset = shift;
    $rs = $couchdb->bulk_docs( \@trackdocs );

    #reset the holding arrays
    if ($reset) {
        @trackdocs = ();
    }
    return;
}
sub track_processed_docs {
    my $args            = shift;
    my $id              = $args->{'id'};
    my $row             = $args->{'row'};
    my $done            = $args->{'processed'};
    my $okay_to_process = 0;
    my $doc             = $couchdb->get_doc($id);
    $row ||= 1;

    if ( !$doc->err ) {

        # have an existing doc
        if ($done) {
            $doc->{'processed'} = 1;
            $okay_to_process = 1;
        }
        if ($row) {
            if ( !$doc->{'row'} ) {
                $doc->{'row'} = $row;
                $okay_to_process = 1;
            }
            elsif ( $doc->{'row'} < $row ) {
                $doc->{'row'} = $row;
                $okay_to_process = 1;
            }
        }

        # report back where we are
        if ( $doc->{'processed'} ) {
            $row = -1;
        }
        elsif ( $doc->{'row'} ) {
            $row = $doc->{'row'};
        }
    }
    else {

        # no document exists.  create it
        $doc = { '_id' => $id, 'processed' => $done, 'row' => $row, };
        $okay_to_process = 1;
    }
    if ($okay_to_process) {
        push @trackdocs, $doc;
    }

    # report back where we are (0, 1, or some number)
    return $row;
}



# file parsing routines

# process header block
# process class table
# process speed table

sub process_speed_table {
    my $args = shift;
    my $fh   = $args->{'fh'};

# run through the speed categories, discarding other stuff, bail if you see "Class"
    while ( my $line = $fh->getline() ) {
        if ( $line =~ /Class/sxmi ) {

            # bail out
            last;
        }

        # line should look like one of
        #   Speed  |
        # - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
        #   0->5   |       0      0.0        0      0.0        0      0.0        0      0.0
        #   5->10  |       0      0.0        0      0.0        0      0.0        0      0.0


        if ( $line =~ /100+/sxmi ) {

            # bail out
            last;
        }
    }
}
my @files = ();

sub loadfiles {
    if (-f) {
        push @files, grep { /$pattern/sxm } $File::Find::name;
    }
    return;
}

# read files according to passed command line arguments
carp "directory path is $path, looking for $pattern";
find( \&loadfiles, $path );

@files = sort { $a cmp $b } @files;
carp 'going to process ', Dumper \@files;

# parse all files in the list of files to parse.

# for the moment, just parse lane by hour reports in the report file
foreach my $file (@files) {
    carp "processing $file";
    if ( $fh->open("$file") ) {


        my $filename;
        if ( $file =~ /.*\/(.*)$/sxm ) {
          $filename = $1;
        }    # set up the bulkload checks
    my $seekpos = track_processed_docs( { 'id' => $filename, } );
    if ( $seekpos < 0 ) {
        carp "skipping $filename, already done according to couchdb";
        next;    # skip this document, go onto the next one
    }
    elsif ( $seekpos > 100 && !$reparse ) {
        carp
"skipping $filename, some other process is probably already parsing it";
        next;    # skip this document, go onto the next one
    }
    bulk_docs(1);

        #look for Lane by Hour Report
        while ( defined( my $line = $fh->getline() ) ) {
            skipto( $fh, 'Report' );

                # the next batch of lines is the report.  parse it
                my $site;
                my @lanes      = ();
                my @directions = ();
                my $ts;
                my @data = ();
                $line = $fh->getline();    # garbage line
                $line = $fh->getline();    # has site and lanes
                my $laneinfo;

                if ( $line =~ /Site:\s*0*(\d+).*?Lanes:(.*)/xsm ) {
                    $site     = $1;
                    $laneinfo = $2;
                }
                else {
                    croak 'no site info';
                }
                carp "site is $site, laneinfo is $laneinfo";

                # get the timestamp
                $line = $fh->getline();    # useless line about vehicle classes
                $line = $fh->getline();    # from to timestamp line
                if ( $line =~ /FROM:\s*(.*)\s*TO/xsm ) {
                    $ts = DateTime::Format::DateParse->parse_datetime( $1,
                        'floating' );
                }
                else {
                    croak 'no timestamp where expected';
                }

                # now get down to parsing the table.  first comes Class
                skipto( $fh, 'Class' );
                $line = $fh->getline()
                  ;    # - - - - - - - - - - - - - - - - - - - - - - - - - - - -
                $line = $fh->getline()
                  ;    #             Count        % |  Count        % | ...
                       # now comes data I want
                while ( !$line =~ /= = = =/sxm ) {
                    $line = $fh->getline();
                    if ( $line =~ /(\d{1,2})\s+\|\s+(.*)/ ) {
                        my $class  = $1;
                        my $counts = $2;

                        #parse the counts
                        while ( $counts =~ /(\d+)\s+(\d+\.\d+)/gsxm ) {
                            my $count = $1;

                            # only bother writing non-zero data
                            if ($count) {
                                push @class_data,
                                  [ $site, $ts->datetime(), $class, $count ];
                            }
                        }
                    }
                }

                # next comes Speed
                skipto( $fh, 'Speed' );
                $line = $fh->getline()
                  ;    # - - - - - - - - - - - - - - - - - - - - - - - -
                       # now comes data I want
                       # now comes data I want
                while ( !$line =~ /= = = =/sxm ) {
                    $line = $fh->getline();
                    if ( $line =~ /(\d+->\d+|100 +)\s+\|\s+(.*)/ ) {
                        my $speed  = $1;
                        my $counts = $2;

                        #parse the counts
                        while ( $counts =~ /(\d+)\s+(\d+\.\d+)/gsxm ) {
                            my $count = $1;

                            # only bother writing non-zero data
                            if ($count) {
                                push @speed_data,
                                  [ $site, $ts->datetime(), $speed, $count ];
                            }
                        }
                    }
                }
            }    #done parsing this report

            # do the bulk save thing for @class_data, @speed_data

        track_processed_docs(
            {
                'id'        => $file,
                'row'       => $fh->input_line_number(),
                'processed' => 1,
            }
    bulk_docs(1);


      }
    }
    else {
        croak "couldn't open $file";
    }
}

