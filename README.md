# Parse IRD (and PAT) summary files

This code is based on the original perl from `calvad_data_extract`
repository.  I pulled out the IRD code because I ran into an error
parsing the latest round and the testing there is a mess.

Modeled on the PAT javascript code, which is much nicer to test...more
modular and all that.

# daylight savings time hell

Lordy I hate DST calculations.  Apparently moment is broken with
converting local dates to UTC, because it is giving different answers
on my laptop and my server.  So there is a bug right now that I have
to make moment believe that the data is floating timezone, like perl
