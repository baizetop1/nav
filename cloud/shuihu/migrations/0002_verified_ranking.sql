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
