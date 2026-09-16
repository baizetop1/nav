-- 0.29 cooperative records. Safe to re-run; no existing saves are overwritten.
CREATE TABLE IF NOT EXISTS cooperative_attempts (
 period TEXT NOT NULL, slot INTEGER NOT NULL REFERENCES slots(id), day TEXT NOT NULL,
 attempt INTEGER NOT NULL CHECK(attempt IN (1,2)), request_id TEXT NOT NULL,
 source_revision INTEGER NOT NULL, damage INTEGER NOT NULL CHECK(damage BETWEEN 0 AND 2000),
 outcome TEXT NOT NULL, elapsed INTEGER NOT NULL, created_at TEXT NOT NULL,
 PRIMARY KEY(period,slot,day,attempt), UNIQUE(slot,request_id)
);
CREATE TABLE IF NOT EXISTS cooperative_claims (
 period TEXT NOT NULL, slot INTEGER NOT NULL REFERENCES slots(id), stage INTEGER NOT NULL CHECK(stage BETWEEN 1 AND 3),
 token TEXT NOT NULL, created_at TEXT NOT NULL, PRIMARY KEY(period,slot,stage)
);
