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
    'dbi:Pg:dbname=spatialvds;host=metis.its.uci.edu',
    'slash', 'grace' );

