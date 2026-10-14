---
course: prep
module: nosql
title: NoSQL
order: 121
---
=== lesson: document-modeling | Document modeling
Document databases (MongoDB, Firestore, Couchbase, DynamoDB's document mode) store JSON-like documents. The design rule is the opposite of relational normalisation: **model around how the data is read**.

## The process

1. List the application's access patterns: "show an order with its items", "list a user's recent orders", "search products by category".
2. Design documents so the most frequent reads fetch **one document** (or one query).
3. Accept duplication where it serves reads; plan how duplicates are updated.

```js
// an order document: everything the order page needs
{
  _id: "o_4821",
  userId: "u_42",
  status: "shipped",
  createdAt: ISODate("2026-10-12T09:30:00Z"),
  shippingAddress: { line1: "12 MG Road", city: "Kanpur", pin: "208001" },   // snapshot at order time
  items: [
    { productId: "p_7", name: "Keyboard", priceAtPurchase: 2500, qty: 1 },    // name/price copied deliberately
    { productId: "p_2", name: "Mouse", priceAtPurchase: 800, qty: 2 }
  ],
  totalPaise: 410000
}
```

## Guidelines

- Data accessed together, stored together.
- Keep documents bounded: MongoDB's limit is 16 MB, and huge documents are slow to update.
- Indexes still matter: create them for every query pattern (`{ userId: 1, createdAt: -1 }`).
- Schema validation exists (JSON Schema validators, Mongoose schemas): "schemaless" shouldn't mean "no rules".
- Store a schema version field to handle old document shapes.

=== lesson: embedding-vs-referencing | Embedding vs referencing
The core document-modelling decision: put related data **inside** the parent document, or store it separately with an ID reference.

| Embed when | Reference when |
|---|---|
| one-to-few (a user's 3 addresses) | one-to-many that grows without bound (a post's comments, a user's orders) |
| always read together | often read separately |
| the child belongs to the parent only | the child is shared by many parents (products in many orders) |
| needs atomic updates with the parent (single-document writes are atomic) | updated independently and frequently |

```js
// embed: addresses live inside the user
{ _id: "u_42", name: "Asha", addresses: [{ label: "home", city: "Kanpur" }] }

// reference: comments in their own collection, pointing to the post
{ _id: "c_9", postId: "post_1", userId: "u_7", text: "Great post", createdAt: … }
```

## Hybrid: extended reference

Store the ID **plus** a few fields you display often (author name and avatar on a comment), accepting that they may need updating if the source changes.

## Patterns worth naming

- **Subset pattern**: embed the latest 10 reviews in the product document, keep all reviews in their own collection.
- **Bucket pattern**: group time-series readings into one document per sensor per hour.
- **Computed pattern**: store precomputed totals (rating average, count) updated on write.

=== lesson: when-not-to-use-nosql | When NOT to use NoSQL
(See SQL and Postgres → SQL vs NoSQL for the full comparison.)

Document stores are a poor fit when:

- **Data is highly relational** and queried from many angles: orders ↔ users ↔ products ↔ payments ↔ refunds, with reports joining them all.
- **Strong integrity matters across entities**: money movements, inventory, bookings. Relational constraints and multi-row transactions do this naturally.
- **Ad-hoc queries and analytics** are frequent: SQL is far more expressive than most document query languages.
- **Access patterns are unknown or changing**: documents designed for today's reads make tomorrow's reads awkward; relational schemas are more neutral.
- **The team chose it because "it scales" or "no schema"**: Postgres scales far beyond most products' needs, and the schema still exists, just in application code.

## When it's a good fit

Self-contained aggregates read as a whole (content, catalogues with varied attributes, user profiles and settings), very high write throughput with known key-based access (DynamoDB for sessions, carts, IoT data), mobile/offline sync (Firestore, Realm), and rapidly evolving prototypes.

A balanced interview answer acknowledges both: "If I were designing it again, I'd use Postgres with a `jsonb` column for the flexible attributes."

=== lesson: aggregation-pipeline | Aggregation pipeline
MongoDB's aggregation framework processes documents through a sequence of **stages**, each transforming the stream: like a Unix pipe, or SQL's `WHERE → GROUP BY → ORDER BY`.

```js
db.orders.aggregate([
  { $match: { status: { $ne: "cancelled" }, createdAt: { $gte: ISODate("2026-10-01") } } },  // WHERE (use an index: put $match first)
  { $unwind: "$items" },                                                                     // one doc per item
  { $group: { _id: "$items.productId", units: { $sum: "$items.qty" },
              revenue: { $sum: { $multiply: ["$items.qty", "$items.priceAtPurchase"] } } } }, // GROUP BY
  { $sort: { revenue: -1 } },
  { $limit: 10 },
  { $lookup: { from: "products", localField: "_id", foreignField: "_id", as: "product" } }   // a left join
]);
```

## Common stages

`$match` (filter), `$project` / `$addFields` (shape fields), `$group` (aggregate), `$sort`, `$limit`, `$skip`, `$unwind` (flatten arrays), `$lookup` (join another collection), `$facet` (several pipelines at once, e.g. results + counts), `$bucket`, `$merge`/`$out` (write results to a collection).

## Performance

Put `$match` and `$sort` early so they can use indexes; reduce document size early with `$project`; `$lookup` on large collections is expensive (a sign the data may be better modelled relationally); stages have memory limits (allow disk use for big sorts).

=== lesson: elasticsearch-basics | Elasticsearch basics
Elasticsearch (and its fork OpenSearch) is a distributed **search and analytics engine** built on Lucene. It's used beside your main database, not instead of it.

## Core ideas

- **Inverted index**: maps each term to the documents containing it, like a book's index: "keyboard" → [doc 7, doc 12, …]. That makes full-text search fast.
- **Analysers**: tokenise and normalise text (lowercase, stemming "running" → "run", synonyms, language-specific rules) at index and query time.
- **Relevance scoring** (BM25): ranks results by how well they match.
- Documents live in **indices**, split into **shards** across nodes, with **replicas**.

## What it's good at

Full-text search with typo tolerance (fuzzy matching), autocomplete, faceted search (filters with counts: "Brand: Logitech (12)"), log analytics (the ELK stack), geo search, and now vector/hybrid search.

## Architecture with a primary database

```text
Postgres (source of truth) ──changes (CDC / outbox / queue)──▶ indexer ──▶ Elasticsearch ◀── search API
```

Search results can lag the database slightly (near real time, typically about a second). Rebuild indices from the source of truth when mappings change.

Lighter alternatives: Postgres full-text search (`tsvector` + GIN) and `pg_trgm` for small/medium apps; Meilisearch, Typesense or Algolia for hosted or simpler product search.

=== lesson: vector-databases | Vector databases
A **vector database** stores embeddings (vectors representing meaning) and finds the nearest ones to a query vector quickly. They power semantic search, RAG, recommendations ("similar products"), deduplication and image search.

## How they're fast

Exact nearest-neighbour search compares the query with every vector, which is too slow at millions. **Approximate nearest neighbour (ANN)** indexes trade a little recall for big speed-ups:

- **HNSW**: a layered graph you greedily walk towards the nearest neighbours. Fast and accurate; memory-hungry. The common default.
- **IVF**: cluster vectors, search only the nearest clusters.
- **Product quantization**: compress vectors to save memory.

## Options

| Option | Notes |
|---|---|
| **pgvector** (Postgres) | vectors next to your relational data, joins and filters in SQL, one less system; great up to tens of millions of vectors |
| Pinecone, Turbopuffer | managed, serverless scaling |
| Qdrant, Weaviate, Milvus, Chroma | open-source vector databases with rich filtering |
| Elasticsearch / OpenSearch, MongoDB Atlas, Redis | vector search added to existing engines |

## Choosing

Start with **pgvector** if you already use Postgres (Supabase includes it). Move to a dedicated store when vector count, query rate or advanced features (multi-tenancy at scale, hybrid search quality) demand it. Always consider metadata filtering (tenant, permissions) together with similarity, and re-embedding costs when you change embedding models.
