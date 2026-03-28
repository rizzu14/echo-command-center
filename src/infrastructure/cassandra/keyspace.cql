-- ECHO Liquid Ledger keyspace
-- Replication factor 3 for multi-AZ durability (Req 9.3)
-- Run this before schema.cql

CREATE KEYSPACE IF NOT EXISTS echo_liquid_ledger
  WITH replication = {
    'class': 'NetworkTopologyStrategy',
    'datacenter1': 3
  }
  AND durable_writes = true;

USE echo_liquid_ledger;
