# Parse IRD (and PAT) summary files

This code is based on the original perl from `calvad_data_extract`
repository.  I pulled out the IRD code because I ran into an error
parsing the latest round and the testing there is a mess.

Modeled on the PAT javascript code, which is much nicer to test...more
modular and all that.

# daylight savings time hell

Lordy I hate DST calculations.  Apparently the WIM data is collected
without regard to the current DST dates.  It *might* be that the data
are using some old, hard-coded DST regime, but most likely it is
skipping the official DST and is manually reset.

Regardless, I have to parse as if there is not time zone, in order to
maintain consistency.  The hours in the data are believed to be ground
truth, after adjusting for local time.  So I parse using moment.tz
with the default time zone set to UTC, and then pump into a table in
postgresql that is timestamp without time zone.
