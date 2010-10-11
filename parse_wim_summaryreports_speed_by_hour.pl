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

croak 'do not use this script.  Use parse_WIM_summaries_5min.pl instead';

my $fh = new IO::File;

my $dir;
my @files=();
my $db='spatialvds';
my $host='metis.its.uci.edu';
my $dbuser;
my $dbpass;

my $result = GetOptions(
			'files:s' => \@files,
			'dir:s'     => \$dir,
			'database:s'=>\$db,
			'user=s'=>\$dbuser,
			'pass=s'=>\$dbpass,
);
if(@files){
  my $temp_string = join q{,} , @files;

  @files = split /,/sxm, $temp_string ;
}
if($dir){
  opendir DIR, $dir;
  push @files , map {$dir/$_} grep { -f } readdir DIR;
  closedir DIR;
}
if(!@files){
  croak 'need to have either a directory with stuff in it, or files passed on the command line';
}

my $vdb = Testbed::Spatial::VDS::Schema->connect(
    "dbi:Pg:dbname=$db;host=$host",
    $dbuser, $dbpass );

my @bulk;

sub checkbulk{
  my $args=shift;
  my $datarow = $vdb->resultset('WimLaneByHourReport')->find($args);
  if($datarow){
    return 0;
  }else{
    return 1;
  }
}
sub bulksave{
  # take the arguments, create 24 entries in the bulk save list
  my $args = shift;
  my $ts = $args->{'ts'};
  foreach my $row (@{$args->{'data'}}){
    my $datalane = 1;
    foreach my $lane (@{$args->{'lanes'}}){
      if(checkbulk ({
		   'site_no'=>$args->{'site'},
		   'wim_lane_no'=>$datalane,
		   'ts_hour'=>DateTime::Format::Pg->format_datetime($ts),
		    }) ){
      push @bulk, {
		   'site_no'=>$args->{'site'},
		   'direction'=>$args->{'directions'}->[$datalane-1],
		   'wim_lane_no'=>$datalane,
		   'lane_no'=>$lane,
		   'ts_hour'=>DateTime::Format::Pg->format_datetime($ts),
		   'volume'=>$row->[$datalane-1],
		  };
    }
      $datalane++;
    }
    $ts->add( 'hours' => 1 );
  }
  return scalar @bulk;
}

# parse all files in the list of files to parse.

# for the moment, just parse lane by hour reports in the report file

foreach my $file (@files){
  carp "processing $file";
     if ( $fh->open("$file") ) {
       my $linecount = 0;
       #look for Lane by Hour Report
       while(defined(my $line = $fh->getline)){
	 if($line =~ /Lane\ by\ Hour\ Report/isxm){
	   carp 'found report';
	   # the next batch of lines is a report.  parse it
	   my $site;
	   my @lanes=();
	   my @directions=();
	   my $ts;
	   my @data=();
	   $line = $fh->getline(); # garbage line
	   $line = $fh->getline(); # has site and lanes
	   carp $linecount++, $line;
	   my $laneinfo;
	   if($line=~/Site:\s*0*(\d+).*?Lanes:(.*)/xsm){
	     $site = $1;
	     $laneinfo= $2;
	   }else{
	     croak 'no site info';
	   }
	   carp "site is $site, laneinfo is $laneinfo";
	   # got site num, now get lanes def
	   # while($laneinfo =~ /\G([NSEW])B*(.*?)\#*(\d)/gxsm){
	   while($laneinfo =~ /([NSEW])B*(,*?)\#*(\d)/gsxm){
	     carp "regex found 1:$1  2:$2  3:$3";
	     push @directions, $1;
	     push @lanes, $3;
	   }
	   carp 'lanes are ',Dumper \@lanes;
	   # get the timestamp
	   $line = $fh->getline(); # useless line about vehicle classes
	   $line = $fh->getline(); # from to timestamp line
	 carp $linecount++, $line;
	   if($line=~/FROM:\s*(.*)\s*TO/xsm){
	     $ts = DateTime::Format::DateParse->parse_datetime( $1,
                'floating' );
	   }else{
	     croak 'no timestamp where expected';
	   }
	   # now get down to parsing the table
	   $line = $fh->getline(); # Number of Vehicles
	   $line = $fh->getline(); # Lane Number
	   $line = $fh->getline(); # Hour  | NB#2    |NB#1    |SB#1    |SB#2       Total
	   $line = $fh->getline(); # - - - - - - - - - - - - - - - - - - - - - - - - - - - -
	   # table rows, hour 0 to 23, iterspersed with subtotals
	   for (0 .. 23 ){
	     $line = $fh->getline();
	     my $rowdata=[];
	     if($line =~ /\d+->\d+./sxm){
	       # this is an hour reading, not a subtotal, so read id
	       while($line =~ /(\d+)\s+/gsxm){
		 push @{$rowdata},$1;
	       } # this will also slurp up Total, but who cares
	       push @data,$rowdata;
	     }# if not, skip this line and go on
	   }
	   # okay, read table.  save it to the db
	   bulksave({'site'=>$site,
		     'lanes'=>\@lanes,
		     'directions'=>\@directions,
		     'ts'=>$ts,
		     'data'=>\@data,
		    });
	 } #done parsing this report
	 if ( @bulk ) {
	   my $output = $vdb->resultset('WimLaneByHourReport')->populate(\@bulk);
	   @bulk=();
	 }

       } # look for the start of the next report
     }else{
       croak "couldn't open $file";
     }
}

