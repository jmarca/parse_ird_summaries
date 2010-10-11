#!/usr/bin/perl -w

use warnings;
use strict;
use Data::Dumper;
use version; our $VERSION = qv('0.0.2');
use English qw(-no_match_vars);
use Carp;

use IO::File;
use Text::CSV;

use Testbed::Spatial::VDS::Schema;

my $vdb = Testbed::Spatial::VDS::Schema->connect(
    'dbi:Pg:dbname=spatialvds;host=themisto.its.uci.edu',
    'slash', 'grace' );

my @tablerows = qw{
  cal_pm
  loc
  site_no
  vendor
  lanes
  wim_type
  longitude
  latitude
};
my @maybemepty = qw{
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
};

sub checkbulkload {
    my $data    = shift;
    my $bulk  = shift;
    my $datarow = $vdb->resultset('WimData')->find(
        {
            'site_no' => $data->{'site_no'},
            'lane'    => $data->{'lane'},
            'ts'      => $data->{'ts'},
            'veh_no'  => $data->{'veh_no'},
        }
    );
    if ( !$datarow ) {
      push @{$bulk},$data;
    }
    return ;
};

sub dbload {
    my $data = shift;
    my $bulk = shift;
    # data is a hashref for populating columns of db
    # fix the year
    $data->{'year'} += 2000;
    my $ts;
    for (qw{ month day hour minute second }) {
        if ( $data->{$_} < 10 ) {
            $data->{$_} = q{0} . $data->{$_};
        }
    }

    # compute the timestamp of observation
    $ts = join q{ },
      ( join q{-}, map { $data->{$_} } qw{ year month day } ),
      ( join q{:}, map { $data->{$_} } qw{ hour minute second } );
    $data->{'ts'} = $ts;

    # delete teh usele55
    delete $data->{'month'};
    delete $data->{'day'};
    delete $data->{'year'};
    delete $data->{'hour'};
    delete $data->{'minute'};
    delete $data->{'second'};

    # check      that data is not empty
    for (@maybemepty) {
        if ( !$data->{$_} ) {
	  $data->{$_}=undef;
        }
    }
    if(!$data->{'veh_len'}){
      croak $data;
    }
    # pending
    checkbulkload($data,$bulk);
    return;
}


sub deal_with_failed_transaction {
    my $data = shift;
    carp 'The transaction failed for some reason, probably ffff bug? ',
      Dumper $data;
    carp $EVAL_ERROR;

    # keep on going.  so far just an ffff bug
    return;
}

my $fh = new IO::File;

my $dir = shift || q{.};
opendir DIR, $dir;
my @files = grep { -f } readdir DIR;
closedir DIR;

# set up the csv parser
my $csv = Text::CSV->new();

$csv->allow_whitespace(1);

# bind variables to lines
$csv->column_names(
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

for my $file (@files) {
    carp $file;
    if ( $fh->open("$dir/$file") ) {
        my $wim_no;
	my $bulk=[];
        # file is either IRD or PAT
        if ( $file =~ /^A0*(\d{1,3})\d{4}.\d{2}$/xm ) {

            # um, retarded test for PAT
            $wim_no = $1;
        }
        elsif ( $file =~ /.0*(\d+)$/xm ) {
            $wim_no = $1;
        }
        else {
            croak "cannot determine wim no from filename $file";
        }
        my $data = $csv->getline_hr($fh);
        while ( !$csv->eof() ) {

            #good read
            # stuff the db
            $data->{'site_no'} = $wim_no;
	    dbload($data,$bulk);
            #reload the hashref
            $data = $csv->getline_hr($fh);
        }
        $fh->close;
	if(@{$bulk}){
	  my @output = $vdb->resultset('WimData')->populate(
					       $bulk
					      );
#	  croak Dumper $bulk;

	}

    }
    else {
        croak 'cannot open file for readin';
    }
}

1;

__END__
