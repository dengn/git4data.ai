-- ─────────────────────────────────────────────────────────────
-- git4data.ai playground · one-time setup
--
-- Run this once against the MatrixOne instance the playground will
-- use. It creates the base dataset every visitor branches from.
--
--   mysql -h <host> -P 6001 -u <user> -p<password> < scripts/seed-playground.sql
--
-- The data is deliberately messy: inconsistent country spellings,
-- missing emails, and a few duplicate people. That is the point —
-- it gives a visitor something real to repair on their branch.
-- ─────────────────────────────────────────────────────────────

CREATE DATABASE IF NOT EXISTS g4d_demo;
USE g4d_demo;

DROP TABLE IF EXISTS customers;
CREATE TABLE customers (
  id      INT PRIMARY KEY,
  name    VARCHAR(64)  NOT NULL,
  email   VARCHAR(128),
  country VARCHAR(32)  NOT NULL,
  spend   DECIMAL(10,2) NOT NULL
);

INSERT INTO customers (id, name, email, country, spend) VALUES
  (1, 'Sofia Sato', 'sofia.sato@example.com', 'DE', 3465.19),
  (2, 'Mei Wang', 'mei.wang@example.com', 'FR', 1934.82),
  (3, 'Luis Lopez', 'luis.lopez@example.com', 'jp', 2581.62),
  (4, 'Nina Tanaka', 'nina.tanaka@example.com', 'Netherlands', 1038.55),
  (5, 'Ines Baker', 'ines.baker@example.com', 'Netherlands', 938.17),
  (6, 'Ines Petrova', 'ines.petrova@example.com', 'France', 4056.85),
  (7, 'Jonas Ortega', 'jonas.ortega@example.com', 'nl', 863.26),
  (8, 'Mei Lin', 'mei.lin@example.com', 'US', 46.53),
  (9, 'Nora Sato', 'nora.sato@example.com', 'jp', 946.26),
  (10, 'Hana Bello', 'hana.bello@example.com', 'United Kingdom', 784.40),
  (11, 'Luis Wang', 'luis.wang@example.com', 'fr', 2227.26),
  (12, 'Diego Lin', 'diego.lin@example.com', 'Brazil', 2268.30),
  (13, 'Kai Nowak', 'kai.nowak@example.com', 'France', 1988.46),
  (14, 'Ines Conti', 'ines.conti@example.com', 'Netherlands', 891.57),
  (15, 'Amara Iyer', 'amara.iyer@example.com', 'Brazil', 2686.24),
  (16, 'Yuki Silva', 'yuki.silva@example.com', 'nl', 1340.57),
  (17, 'Sofia Tanaka', 'sofia.tanaka@example.com', 'usa', 4486.77),
  (18, 'Ana Silva', 'ana.silva@example.com', 'USA', 3350.63),
  (19, 'Hana Sund', 'hana.sund@example.com', 'usa', 99.08),
  (20, 'Omar Moreau', 'omar.moreau@example.com', 'uk', 4136.25),
  (21, 'Kai Wang', 'kai.wang@example.com', 'US', 2969.69),
  (22, 'Hana Haddad', 'hana.haddad@example.com', 'Netherlands', 1839.27),
  (23, 'Ravi Okafor', 'ravi.okafor@example.com', 'FR', 1751.60),
  (24, 'Elena Petrova', 'elena.petrova@example.com', 'US', 2748.13),
  (25, 'Piotr Bello', NULL, 'NL', 556.00),
  (26, 'Pablo Kovac', 'pablo.kovac@example.com', 'br', 3252.65),
  (27, 'Luis Lin', 'luis.lin@example.com', 'JP', 2801.80),
  (28, 'Luis Tanaka', 'luis.tanaka@example.com', 'jp', 1414.44),
  (29, 'Ines Nowak', 'ines.nowak@example.com', 'JP', 978.09),
  (30, 'Lena Silva', 'lena.silva@example.com', 'nl', 2028.81),
  (31, 'Aisha Nowak', NULL, 'JP', 910.76),
  (32, 'Tom Lopez', 'tom.lopez@example.com', 'jp', 1008.22),
  (33, 'Tom Haddad', 'tom.haddad@example.com', 'usa', 257.50),
  (34, 'Amara Tanaka', 'amara.tanaka@example.com', 'BR', 1941.38),
  (35, 'Ines Silva', 'ines.silva@example.com', 'JP', 1867.22),
  (36, 'Amara Kovac', 'amara.kovac@example.com', 'usa', 1430.23),
  (37, 'Ines Iyer', 'ines.iyer@example.com', 'uk', 2540.18),
  (38, 'Kai Baker', 'kai.baker@example.com', 'usa', 4430.37),
  (39, 'Mei Baker', NULL, 'Brazil', 3212.07),
  (40, 'Felix Haddad', NULL, 'Netherlands', 3206.51),
  (41, 'Nina Moreau', 'nina.moreau@example.com', 'United Kingdom', 2737.36),
  (42, 'Jonas Nowak', 'jonas.nowak@example.com', 'FR', 1023.20),
  (43, 'Felix Baker', 'felix.baker@example.com', 'DE', 1907.01),
  (44, 'Jonas Lopez', 'jonas.lopez@example.com', 'Japan', 267.68),
  (45, 'Nina Sund', 'nina.sund@example.com', 'br', 1595.12),
  (46, 'Lena Ortega', NULL, 'United Kingdom', 138.37),
  (47, 'Felix Tanaka', 'felix.tanaka@example.com', 'JP', 2697.14),
  (48, 'Omar Silva', 'omar.silva@example.com', 'USA', 393.56),
  (49, 'Ana Sato', 'ana.sato@example.com', 'USA', 3974.36),
  (50, 'Chen Conti', 'chen.conti@example.com', 'GB', 995.23),
  (51, 'Jonas Lopez', 'jonas.lopez@example.com', 'JP', 4108.01),
  (52, 'Mei Tanaka', 'mei.tanaka@example.com', 'br', 3834.52),
  (53, 'Aisha Bello', 'aisha.bello@example.com', 'United Kingdom', 332.40),
  (54, 'Piotr Moreau', 'piotr.moreau@example.com', 'US', 4463.64),
  (55, 'Yuki Lin', 'yuki.lin@example.com', 'Germany', 1791.23),
  (56, 'Nora Haddad', 'nora.haddad@example.com', 'usa', 2378.49),
  (57, 'Chen Rossi', 'chen.rossi@example.com', 'Germany', 38.63),
  (58, 'Chen Tanaka', 'chen.tanaka@example.com', 'JP', 3776.42),
  (59, 'Diego Wang', 'diego.wang@example.com', 'jp', 1187.17),
  (60, 'Elena Lopez', 'elena.lopez@example.com', 'Germany', 4732.03),
  (61, 'Kai Silva', 'kai.silva@example.com', 'br', 4357.77),
  (62, 'Marco Okafor', 'marco.okafor@example.com', 'US', 4497.10),
  (63, 'Marco Braun', 'marco.braun@example.com', 'br', 2128.61),
  (64, 'Felix Petrova', 'felix.petrova@example.com', 'usa', 650.02),
  (65, 'Omar Sund', 'omar.sund@example.com', 'br', 862.68),
  (66, 'Elena Nowak', 'elena.nowak@example.com', 'BR', 3813.17),
  (67, 'Mei Wang', 'mei.wang@example.com', 'GB', 3103.53),
  (68, 'Ravi Moreau', 'ravi.moreau@example.com', 'USA', 1576.11),
  (69, 'Ana Braun', 'ana.braun@example.com', 'FR', 2520.60),
  (70, 'Mei Petrova', 'mei.petrova@example.com', 'DE', 770.73),
  (71, 'Lena Sund', NULL, 'BR', 4764.17),
  (72, 'Yuki Kovac', 'yuki.kovac@example.com', 'Brazil', 2306.08),
  (73, 'Sofia Braun', 'sofia.braun@example.com', 'US', 4095.09),
  (74, 'Felix Lopez', 'felix.lopez@example.com', 'JP', 3380.79),
  (75, 'Sofia Iyer', 'sofia.iyer@example.com', 'Japan', 3013.10),
  (76, 'Jonas Ortega', 'jonas.ortega@example.com', 'GB', 4654.03),
  (77, 'Marco Bello', 'marco.bello@example.com', 'BR', 75.12),
  (78, 'Chen Conti', 'chen.conti@example.com', 'Japan', 2955.47),
  (79, 'Jonas Braun', NULL, 'FR', 759.18),
  (80, 'Ines Petrova', 'ines.petrova@example.com', 'br', 3824.39),
  (81, 'Tom Fischer', 'tom.fischer@example.com', 'nl', 3076.03),
  (82, 'Felix Wang', NULL, 'de', 4436.11),
  (83, 'Omar Silva', 'omar.silva@example.com', 'Germany', 1917.18),
  (84, 'Felix Lin', 'felix.lin@example.com', 'Japan', 1268.06),
  (85, 'Nina Tanaka', 'nina.tanaka@example.com', 'NL', 164.01),
  (86, 'Yuki Baker', 'yuki.baker@example.com', 'fr', 4219.30),
  (87, 'Felix Moreau', 'felix.moreau@example.com', 'Germany', 3513.59),
  (88, 'Omar Wang', NULL, 'Japan', 1756.31),
  (89, 'Chen Haddad', 'chen.haddad@example.com', 'jp', 1984.28),
  (90, 'Hana Fischer', 'hana.fischer@example.com', 'jp', 336.63),
  (91, 'Tom Ortega', 'tom.ortega@example.com', 'GB', 2584.85),
  (92, 'Jonas Iyer', 'jonas.iyer@example.com', 'Germany', 1864.02),
  (93, 'Ana Baker', 'ana.baker@example.com', 'FR', 1467.54),
  (94, 'Mei Kovac', 'mei.kovac@example.com', 'DE', 4075.04),
  (95, 'Sofia Lopez', 'sofia.lopez@example.com', 'Japan', 53.24),
  (96, 'Chen Kovac', 'chen.kovac@example.com', 'United Kingdom', 4782.95),
  (97, 'Kai Weber', 'kai.weber@example.com', 'usa', 4069.87),
  (98, 'Amara Nowak', 'amara.nowak@example.com', 'DE', 2285.87),
  (99, 'Elena Sato', 'elena.sato@example.com', 'Brazil', 3994.85),
  (100, 'Pablo Silva', 'pablo.silva@example.com', 'Brazil', 1027.06),
  (101, 'Kai Okafor', 'kai.okafor@example.com', 'US', 3767.40),
  (102, 'Ravi Wang', 'ravi.wang@example.com', 'nl', 4288.62),
  (103, 'Kai Silva', 'kai.silva@example.com', 'br', 1555.41),
  (104, 'Elena Wang', 'elena.wang@example.com', 'Germany', 3428.28),
  (105, 'Chen Braun', 'chen.braun@example.com', 'nl', 198.58),
  (106, 'Ravi Braun', 'ravi.braun@example.com', 'de', 3347.85),
  (107, 'Diego Rossi', 'diego.rossi@example.com', 'France', 4052.39),
  (108, 'Felix Rossi', 'felix.rossi@example.com', 'fr', 62.31),
  (109, 'Piotr Petrova', 'piotr.petrova@example.com', 'nl', 4274.10),
  (110, 'Hana Weber', NULL, 'Brazil', 2907.81),
  (111, 'Aisha Fischer', 'aisha.fischer@example.com', 'France', 3622.35),
  (112, 'Hana Lin', 'hana.lin@example.com', 'US', 3788.94),
  (113, 'Aisha Iyer', 'aisha.iyer@example.com', 'Germany', 1040.03),
  (114, 'Aisha Baker', 'aisha.baker@example.com', 'usa', 3630.69),
  (115, 'Ines Bello', 'ines.bello@example.com', 'usa', 3604.35),
  (116, 'Tom Ortega', 'tom.ortega@example.com', 'France', 156.04),
  (117, 'Hana Sund', 'hana.sund@example.com', 'Brazil', 645.94),
  (118, 'Mei Kovac', 'mei.kovac@example.com', 'br', 453.12),
  (119, 'Tom Sund', 'tom.sund@example.com', 'NL', 4275.97),
  (120, 'Yuki Moreau', 'yuki.moreau@example.com', 'usa', 50.09),
  (121, 'Ana Rossi', 'ana.rossi@example.com', 'France', 880.10),
  (122, 'Ana  Rossi', 'ana.rossi@example.com', 'FR', 880.10),
  (123, 'Chen Lin', 'chen.lin@example.com', 'cn', 1420.00),
  (124, 'Chen Lin', NULL, 'China', 1420.00);

-- Bookkeeping for playground sessions. One row per visitor branch.
DROP TABLE IF EXISTS _sessions;
CREATE TABLE _sessions (
  id        VARCHAR(32) PRIMARY KEY,
  created   BIGINT NOT NULL,
  last_seen BIGINT NOT NULL,
  queries   INT    NOT NULL DEFAULT 0
);

-- The snapshot every visitor branch is forked from. Recreate it if you
-- ever change the seed data above.
DROP SNAPSHOT IF EXISTS g4d_base;
CREATE SNAPSHOT g4d_base FOR TABLE g4d_demo.customers;

SELECT COUNT(*) AS seeded_rows FROM customers;
