CREATE TABLE IF NOT EXISTS slots (
  id INTEGER PRIMARY KEY CHECK(id BETWEEN 1 AND 20),
  name TEXT NOT NULL,
  public INTEGER NOT NULL DEFAULT 0 CHECK(public IN (0,1)),
  revision INTEGER NOT NULL DEFAULT 0,
  raw TEXT,
  key_hash TEXT,
  updated_at TEXT
);
WITH RECURSIVE n(x) AS (SELECT 1 UNION ALL SELECT x+1 FROM n WHERE x<20)
INSERT OR IGNORE INTO slots(id,name) SELECT x,printf('%02d号江湖',x) FROM n;
CREATE TABLE IF NOT EXISTS history (
  slot INTEGER NOT NULL REFERENCES slots(id),
  revision INTEGER NOT NULL,
  name TEXT NOT NULL,
  raw TEXT NOT NULL,
  updated_at TEXT,
  PRIMARY KEY(slot,revision)
);
CREATE TRIGGER IF NOT EXISTS keep_history BEFORE UPDATE ON slots
WHEN OLD.raw IS NOT NULL AND NEW.revision > OLD.revision
BEGIN
  INSERT OR IGNORE INTO history(slot,revision,name,raw,updated_at)
  VALUES(OLD.id,OLD.revision,OLD.name,OLD.raw,OLD.updated_at);
  DELETE FROM history WHERE slot=OLD.id AND revision NOT IN
    (SELECT revision FROM history WHERE slot=OLD.id ORDER BY revision DESC LIMIT 10);
END;
CREATE TABLE IF NOT EXISTS rate_limits (
  bucket TEXT PRIMARY KEY,
  window INTEGER NOT NULL,
  count INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS verified_scores (
  slot INTEGER NOT NULL REFERENCES slots(id),
  period TEXT NOT NULL,
  tier INTEGER NOT NULL CHECK(tier BETWEEN 1 AND 5),
  score INTEGER NOT NULL,
  elapsed INTEGER NOT NULL,
  hp INTEGER NOT NULL,
  source_revision INTEGER NOT NULL,
  engine TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY(slot,period)
);
