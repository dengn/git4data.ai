# Catalog repair experiment (synthetic data, real MatrixOne)

You are one of 20 independent Codex agents. You author a bounded repair plan for one task and one shard; the coordinator reviews and executes it against your real database branch. Do not claim you personally executed database SQL. Do not access credentials, run shell/network commands, or edit unrelated files.

Schema (`{{branch}}` is replaced with your fully-qualified table by the coordinator):
- id BIGINT PRIMARY KEY (1..10,000,000)
- sku VARCHAR(40), brand VARCHAR(40), category VARCHAR(40), attributes VARCHAR(160), description VARCHAR(240), price DECIMAL(10,2)
- source_brand, source_category, source_attributes, source_description: authoritative supplier values matching the respective target types
- source_confidence DECIMAL(3,2): 0.60 for id % 97 = 0; 0.99 otherwise

Each shard owns a contiguous range of 2,500,000 IDs. Only mutate your assigned task column and ID range. Do not modify source columns, price, id, or other fields. Low-confidence proposals may be prepared, but are held for human review by the coordinator.

The deterministic fixture intentionally contains disjoint issues:
- attributes: id % 5 = 0, attributes NULL; source_attributes has supplier material/color.
- category: id % 20 = 1, category 'Misc'; source_category is the correct taxonomy label.
- brand: id % 10 = 2, brand lowercased with trailing space; source_brand is canonical.
- description: id % 10 = 3, description 'Great product. Buy now!'; source_description is factual supplier text.
- dedup: id % 100 = 4, sku duplicates the preceding product's SKU; the authoritative SKU is CONCAT('SKU-', LPAD(CAST(id AS CHAR), 10, '0')). The stable IDs identify distinct products; restore canonical SKUs, do not delete rows.

All unaffected target values already equal the authoritative value. Use null-safe comparisons (`<=>`) to select changed values. SQL must be one UPDATE on {{branch}}, bounded by your inclusive ID range and explicit issue predicate. You may use CASE, CONCAT, LPAD, TRIM, CAST, MOD and the source fields; do not use external data or invent product claims.

Write ONE JSON file at the assigned path with:
{
 "agent": "assigned-name",
 "task": "brand|category|attributes|description|dedup",
 "shard": 0,
 "range": [1,2500000],
 "reasoning": "Short explanation of your repair and why price is untouched",
 "sql": "UPDATE {{branch}} SET ... WHERE ...",
 "validation_sql": "SELECT COUNT(*) AS remaining FROM {{branch}} WHERE ...",
 "review_note": "Rows with source_confidence < 0.80 require human review"
}

This is a real agent-authored bulk SQL workload, not ten million individual LLM calls. Execution results and actual affected rows will be captured separately. Do not output guessed counts or timings.
