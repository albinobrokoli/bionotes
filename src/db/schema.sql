-- BioNotes local schema (SQLite)

CREATE TABLE IF NOT EXISTS spaces (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  icon TEXT NOT NULL,
  color TEXT NOT NULL,
  order_idx INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS categories (
  id TEXT PRIMARY KEY NOT NULL,
  space_id TEXT NOT NULL,
  name TEXT NOT NULL,
  order_idx INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (space_id) REFERENCES spaces (id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS pages (
  id TEXT PRIMARY KEY NOT NULL,
  category_id TEXT NOT NULL,
  title TEXT NOT NULL,
  content_json TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  favorite INTEGER NOT NULL DEFAULT 0,
  tags TEXT NOT NULL,
  FOREIGN KEY (category_id) REFERENCES categories (id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS preferences (
  key TEXT PRIMARY KEY NOT NULL,
  value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS page_attachments (
  id TEXT PRIMARY KEY NOT NULL,
  page_id TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('pdf', 'image')),
  added_at INTEGER NOT NULL,
  FOREIGN KEY (page_id) REFERENCES pages (id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_page_attachments_page_kind ON page_attachments (page_id, kind, added_at);

CREATE TABLE IF NOT EXISTS annotations (
  id TEXT PRIMARY KEY NOT NULL,
  page_id TEXT NOT NULL,
  pdf_path TEXT NOT NULL,
  pdf_page_num INTEGER NOT NULL,
  quad_points TEXT NOT NULL,
  color TEXT NOT NULL,
  text_excerpt TEXT NOT NULL,
  linked_block_id TEXT,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (page_id) REFERENCES pages (id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_annotations_page_pdf_page ON annotations (page_id, pdf_path, pdf_page_num);

CREATE TABLE IF NOT EXISTS sources (
  id TEXT PRIMARY KEY NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('article', 'book', 'chapter', 'web')),
  title TEXT NOT NULL,
  authors TEXT NOT NULL,
  year INTEGER,
  journal TEXT,
  volume TEXT,
  issue TEXT,
  pages TEXT,
  doi TEXT,
  url TEXT,
  isbn TEXT,
  publisher TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_sources_type_year ON sources (type, year);
CREATE INDEX IF NOT EXISTS idx_sources_doi ON sources (doi);

CREATE TABLE IF NOT EXISTS source_links (
  id TEXT PRIMARY KEY NOT NULL,
  source_id TEXT NOT NULL,
  page_id TEXT NOT NULL,
  block_id TEXT,
  context_excerpt TEXT,
  FOREIGN KEY (source_id) REFERENCES sources (id) ON DELETE CASCADE,
  FOREIGN KEY (page_id) REFERENCES pages (id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_source_links_page ON source_links (page_id, source_id);

CREATE TABLE IF NOT EXISTS backlinks (
  id TEXT PRIMARY KEY NOT NULL,
  source_page_id TEXT NOT NULL,
  target_page_id TEXT NOT NULL,
  block_id TEXT NOT NULL,
  context_excerpt TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (source_page_id) REFERENCES pages (id) ON DELETE CASCADE,
  FOREIGN KEY (target_page_id) REFERENCES pages (id) ON DELETE CASCADE,
  UNIQUE (source_page_id, target_page_id, block_id)
);

CREATE INDEX IF NOT EXISTS idx_backlinks_target_page ON backlinks (target_page_id, source_page_id, created_at);
