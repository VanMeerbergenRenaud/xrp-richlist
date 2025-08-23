CREATE TABLE accounts (
  account TEXT PRIMARY KEY,
  balance_xrp NUMERIC NOT NULL,
  is_exchange BOOLEAN DEFAULT FALSE,
  is_blackhole BOOLEAN DEFAULT FALSE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE snapshots (
  id SERIAL PRIMARY KEY,
  ledger_index BIGINT NOT NULL,
  taken_at TIMESTAMPTZ NOT NULL,
  accounts_count BIGINT NOT NULL,
  total_supply_xrp NUMERIC NOT NULL,
  gini NUMERIC NOT NULL
);

CREATE TABLE distribution_bins (
  snapshot_id INT REFERENCES snapshots(id),
  bin_label TEXT,
  accounts BIGINT,
  supply_share NUMERIC,
  PRIMARY KEY (snapshot_id, bin_label)
);

CREATE INDEX ON accounts (balance_xrp DESC);
