#!/usr/bin/perl -w

use warnings;
use strict;
use Data::Dumper;
use version; our $VERSION = qv('0.0.2');
use English qw(-no_match_vars);
use Carp;

use Spreadsheet::Read;

use Getopt::Long;
use DateTime::Format::DateParse;
use DateTime::Format::Pg;
use Testbed::Spatial::VDS::Schema::Public;

my @files = ();
my $user   = $ENV{PSQL_USER} || q{};
my $pass   = $ENV{PSQL_PASS} || q{};
my $host   = $ENV{PSQL_HOST} || q{};
my $dbname = $ENV{PSQL_DB}   || 'spatialvds';
my $port   = $ENV{PSQL_PORT} || 5432;

my $year;
my $result = GetOptions(
    'files:s'    => \@files,
    'year=i'     => \$year,
    'database:s' => \$dbname,
    'user=s'     => \$user,
    'pass=s'     => \$pass,
);

if (@files) {
    my $temp_string = join q{,}, @files;

    @files = split /,/sxm, $temp_string;
}
if ( !$year ) {
    croak
'need to have a year passed.  Yes I could parse it from the file name, but those tend to be all over the map';
}
if ( !@files ) {
    croak
'need to have files passed on the command line with option --files="somefile.xls,anotherfile.xls" --files="yetanother.xls"';
}
carp 'going to process ', Dumper \@files;

my $vdb =
  Testbed::Spatial::VDS::Schema::Public->connect( "dbi:Pg:dbname=$dbname;host=$host",
    $user, $pass );

my @bulk;

sub checkbulk {
    my $args    = shift;
    my $datarow = $vdb->resultset('WimStatus')->find($args);
    if ($datarow) {
      # carp 'found datarow in db for ', Dumper $args;
        return 0;
    }
    else {
        return 1;
    }
}
my @created_codes = ();

sub check_status_code {
    my $code    = shift;
    my $datarow = $vdb->resultset('WimStatusCodes')->find($code);
    if ( !$datarow ) {

        # need to enter status code into table
        carp " don't have status code $code in database !";
        $vdb->resultset('WimStatusCodes')->create( { 'status' => $code } );
        push @created_codes, $code;
    }
    return;
}

sub bulksave {

    # take the arguments, create 24 entries in the bulk save list
    my $args = shift;
    my $ts   = $args->{'ts'};
    if (
        checkbulk(
            {
                'site_no' => $args->{'site_no'},
                'ts'      => $ts,
            }
        )
      )
    {
        check_status_code( $args->{'class_status'} );
        check_status_code( $args->{'weight_status'} );

        push @bulk,
          {
            'site_no'       => $args->{'site_no'},
            'ts'            => $ts,
            'class_status'  => $args->{'class_status'},
            'class_notes'   => $args->{'class_notes'},
            'weight_status' => $args->{'weight_status'},
            'weight_notes'  => $args->{'weight_notes'},
          };
    }
    return scalar @bulk;
}

# parse all files in the list of files to parse.

# this version will parse the monthly IRD and PAT xls files

foreach my $file (@files) {
    carp "processing $file";
    my $ref = ReadData( $file, 'attr' => 1 );

# row 1 is headers.  Parse from Row 2 onwards.  Bail when no more data in col 1, row n
    my $month = $ref->[1]->{'E1'};
    my $ts    = DateTime::Format::DateParse->parse_datetime("$month 1, $year");
    my $row   = 2;
    while ( $ref->[1]->{"A$row"} ) {
        my $site          = $ref->[1]->{"A$row"};
        my $class_status  = uc $ref->[1]->{"E$row"};
        my $class_notes   = $ref->[1]->{"F$row"};
        my $weight_status = uc $ref->[1]->{"H$row"};
        my $weight_notes  = $ref->[1]->{"I$row"};
        foreach ( $site, $class_status, $class_notes, $weight_status,
            $weight_notes )
        {
            s/^\s+//sxm;
            s/\s+$//sxm;
        }

        # catch a typo I found once
        for my $code ( $class_status, $weight_status ) {
            if ( $code =~ /GG|BB|MM/sxm ) {
                for my $char (qw/G B M/) {
                    $code =~ s/$char+/$char/sxm;
                }
            }
        }
        if ( !$class_status || !$weight_status ) {

            # possible mistake
            if ( !$class_status && $class_notes ) {

                # check for RED, if so, set class_status to bad
                if ( $ref->[1]->{'attr'}->[5]->[$row]->{'fgcolor'} eq '#ff0000'
                    || $ref->[1]->{'attr'}->[5]->[$row]->{'bgcolor'} eq
                    '#ff0000' )
                {

                    # red fg or bg color means bad status should be
                    $class_status = q{B};
                    carp "had to fix class status on row $row";
                }
            }
            if ( !$weight_status && $weight_notes ) {

                # check for RED, if so, set class_status to bad
                if ( $ref->[1]->{'attr'}->[8]->[$row]->{'fgcolor'} eq '#ff0000'
                    || $ref->[1]->{'attr'}->[8]->[$row]->{'bgcolor'} eq
                    '#ff0000' )
                {

                    # red fg or bg color means bad status should be
                    $weight_status = q{B};
                    carp "had to fix weight status on row $row";
                }
            }
        }

        # try again, this time, assume that if one is good and the
        # prior month is good but just this month is blank, then set
        # them both good, assuming that people make sure to note
        # errors but sometimes overlook good data.

        if ( !$class_status && $weight_status =~ /G/sxm ) {
            if ( ( uc $ref->[1]->{"D$row"} ) =~ /G/sxm ) {
                $class_status = $weight_status;
                carp "had to fix class status on row $row";
            }
        }
        elsif ( !$weight_status && $class_status =~ /G/sxm ) {
            if ( ( uc $ref->[1]->{"G$row"} ) =~ /G/sxm ) {
                $weight_status = $class_status;
                carp "had to fix weight status on row $row";
            }
        }

        #and now the special cases I've inspected as the program fails
        if ( !$weight_status ) {
            if ( $weight_notes =~ /NEED WGT OVER LIMTS CHANGED/ism ) {
                $weight_status = q{G};
                carp "had to fix weight status on row $row";
            }

#             if ( $weight_notes =~ /NEED WGT OVER LIMTS CHANGED/ism ) {
#                 $ts.weight_status eq DateTime::Format::DateParse->parse_datetime('2006-11-01') &&
# 		  # right in mid hack here, custom sticking in an exception.  just rerun and look for the bug report on crash.

#                 carp "had to fix weight status on row $row";
#             }

            if ( $weight_status =~ /XX/ism && !$class_status ) {
                $class_status = $weight_status;
                carp "had to fix class status on row $row";
            }
            if ( $class_status =~ /XX/ism && !$weight_status ) {
                $weight_status = $class_status;
                carp "had to fix weight status on row $row";
            }

        }

        # try it again.  if the above  failed, bail out
        if ( !$class_status || !$weight_status ) {
            if (   ( $class_status || $weight_status )
                || ( $class_notes || $weight_notes ) )
            {
                carp Dumper $ref->[1]->{'attr'}->[5]->[$row];
                carp Dumper $ref->[1]->{"I$row"};

                # um, oops!
                carp Dumper {
                    'site_no'       => $site,
                    'ts'            => DateTime::Format::Pg->format_date($ts),
                    'class_status'  => $class_status,
                    'class_notes'   => $class_notes,
                    'weight_status' => $weight_status,
                    'weight_notes'  => $weight_notes,
                };

                # no don't croak if it is red it is bad, so fix it.
                croak
'inconsistent data :  look at ( $class_status || $weight_status ) || ( $class_notes || $weight_notes )';
            }

            # otherwise, nothing to see here.  move along
            next;
        }

    # 	carp Dumper {
    #                 'site_no'       => $site,
    #                 'ts'            => DateTime::Format::Pg->format_date($ts),
    #                 'class_status'  => $class_status,
    #                 'class_notes'    => $class_notes,
    #                 'weight_status' => $weight_status,
    #                 'weight_notes'   => $weight_notes,
    #             };
        bulksave(
            {
                'site_no'       => $site,
                'ts'            => DateTime::Format::Pg->format_date($ts),
                'class_status'  => $class_status,
                'class_notes'   => $class_notes,
                'weight_status' => $weight_status,
                'weight_notes'  => $weight_notes,
            }
        );
    }
    continue {

        # increment the row
        $row++;
    }

    #done parsing this report
    if (@bulk) {
        my $output = $vdb->resultset('WimStatus')->populate( \@bulk );
        @bulk = ();
    }

    # look at the next file
}

#all done.  spit any status files that were created
carp 'created status fields in db', Dumper( \@created_codes );

#buh-bye
1;

__END__

