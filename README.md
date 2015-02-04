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

# tests

at the moment, every program is tested and the tests all pass.

as stuff breaks (due mostly to bad files) I write test cases.  The
edge cases test loads up broken files and they should *not* be parsed,
but rather they should show up in a broken files list.  I haven't yet
written the test that automatically verifies that the files end up in
that file.  Also the file name is hard coded in the code.


To run all the tests, just do

```
mocha test --timeout 50000
```

The first time through you will see a big nag that you haven't set up
the config file properly.  You should create a file called
test.config.json, chmod it to 0600, (make it so it is only read/write
by the owner of the file, no one else), and fill it with something
like:

```json
{
    "postgresql":{
        "host":"my.database.host.com",
        "port":5432,
        "username":"blechity",
        "password":"passuwordo",
        "parse_ird_summaries_db":"thedb",
        "parse_pat_summaries_db":"thedb"
    }
}
```

Obviously, put in your real database host (I use 127.0.0.1 with an ssh
tunnel to my real DB) and your real username and password.  The two
database entries are needed, but the tests that write to the db will
create tables and delete them at the end of the test.

# Running for real

To run the real code, you need a similar config file, named
config.json.  I usually just copy the test.config.json file and add a
few things.  It should look like this:

```json
{
    "postgresql":{
        "host":"my.database.host.com",
        "port":5432,
        "username":"blechity",
        "password":"passuwordo",
        "parse_ird_summaries_db":"thedb",
        "parse_pat_summaries_db":"thedb"
        "speed_table" : "wim.summaries_5min_speed",
        "class_table" : "wim.summaries_5min_class",
        "speed_class_table" : "wim.summaries_daily_speed_class"
    }
}
```

You have to add the three tables, `speed_table, class_table,
speed_class_table` in order to run the code.  Add any necessary schema
scoping.  Here I have the three tables in the `wim` schema.

The code to create the database tables was originally located in the
`calvad_data_extract` repo in the file `WIM/wim_5min_tables.sql`.  I
reproduce that below:

```sql
CREATE TABLE wim.summaries_5min_class (
    site_no integer not null REFERENCES wim_stations (site_no)   ON DELETE RESTRICT,
    ts      timestamp not null,
    wim_lane_no integer not null,
    veh_class integer not null,
    veh_count integer not null,
    primary key (site_no,ts,wim_lane_no,veh_class)
);
CREATE TABLE wim.summaries_5min_speed (
    site_no integer not null REFERENCES wim_stations (site_no)   ON DELETE RESTRICT,
    ts      timestamp not null,
    wim_lane_no integer not null,
    veh_speed numeric not null,
    veh_count integer not null,
    primary key (site_no,ts,wim_lane_no,veh_speed)
);

-- PAT has speed vs class too
CREATE TABLE wim.summaries_daily_speed_class (
    site_no integer not null REFERENCES wim_stations (site_no)   ON DELETE RESTRICT,
    ts      timestamp not null,
    wim_lane_no integer not null,
    veh_class integer not null,
    veh_speed numeric not null,
    veh_count integer not null,
    primary key (site_no,ts,wim_lane_no,veh_class,veh_speed)
);


CREATE INDEX wim_summaries_5min_spped_ts_idx ON wim.summaries_5min_speed(ts);

CREATE INDEX wim_summaries_5min_class_ts_idx ON wim.summaries_5min_class(ts);

CREATE INDEX wim_summaries_daily_speed_class_ts_idx ON wim.summaries_daily_speed_class(ts);
```

Note that the timestamp is `timestamp without time zone`.  This is
because the WIM data is extremely careless with time, especially
around daylight savings time.  If you use a proper timezone, you get
crazy inconsistencies.  The best approach I've found is to just
believe that the time reported is adjusted for the time zone (with and
without DST), but the exact shift to daylight savings time is wrong so
just live with it.  At some point there is a gap in the data or a
repeated hour and that's the way it goes.

But for sure the timezone is not handled strictly correctly.
