-- ============================================================================
-- COMPLETE GRC DATABASE SCHEMA
-- Saudi Arabian Multi-Tenant GRC Platform
-- Version: 2.0 - Full Schema with All Relationships
-- Generated: December 2025
-- ============================================================================

-- ============================================================================
-- PART 1: CORE REFERENCE TABLES
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1.1 COUNTRIES
-- ----------------------------------------------------------------------------
DROP TABLE IF EXISTS countries CASCADE;
CREATE TABLE countries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(3) NOT NULL UNIQUE,                    -- ISO 3166-1 alpha-3 (SAU)
    code_alpha2 VARCHAR(2) NOT NULL UNIQUE,             -- ISO 3166-1 alpha-2 (SA)
    name_en VARCHAR(100) NOT NULL,
    name_ar VARCHAR(100) NOT NULL,
    region VARCHAR(50) NOT NULL,                        -- GCC, MENA, EU, NA, APAC
    sub_region VARCHAR(50),
    currency_code VARCHAR(3),
    currency_name_en VARCHAR(50),
    currency_name_ar VARCHAR(50),
    currency_symbol VARCHAR(10),
    phone_code VARCHAR(10),
    capital_en VARCHAR(100),
    capital_ar VARCHAR(100),
    timezone VARCHAR(50),
    language_codes VARCHAR(50),
    is_gcc_member BOOLEAN DEFAULT FALSE,
    is_mena_member BOOLEAN DEFAULT FALSE,
    gdp_usd_billions DECIMAL(12,2),
    population_millions DECIMAL(8,2),
    regulatory_complexity_score INT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ----------------------------------------------------------------------------
-- 1.2 SECTORS / INDUSTRIES
-- ----------------------------------------------------------------------------
DROP TABLE IF EXISTS sectors CASCADE;
CREATE TABLE sectors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) NOT NULL UNIQUE,
    name_en VARCHAR(100) NOT NULL,
    name_ar VARCHAR(100) NOT NULL,
    description_en TEXT,
    description_ar TEXT,
    parent_sector_id UUID REFERENCES sectors(id),
    icon VARCHAR(50),
    color VARCHAR(7),
    display_order INT DEFAULT 0,
    is_regulated BOOLEAN DEFAULT TRUE,
    risk_level VARCHAR(20) DEFAULT 'medium',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ----------------------------------------------------------------------------
-- 1.3 REGULATORS
-- ----------------------------------------------------------------------------
DROP TABLE IF EXISTS regulators CASCADE;
CREATE TABLE regulators (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(20) NOT NULL UNIQUE,
    name_en VARCHAR(200) NOT NULL,
    name_ar VARCHAR(200) NOT NULL,
    acronym_en VARCHAR(20),
    acronym_ar VARCHAR(20),
    country_id UUID REFERENCES countries(id),
    regulator_type VARCHAR(50) NOT NULL,
    category VARCHAR(50) NOT NULL,
    jurisdiction_en TEXT,
    jurisdiction_ar TEXT,
    parent_regulator_id UUID REFERENCES regulators(id),
    ministry_en VARCHAR(200),
    ministry_ar VARCHAR(200),
    reports_to VARCHAR(200),
    website VARCHAR(255),
    portal_url VARCHAR(255),
    email VARCHAR(100),
    phone VARCHAR(50),
    fax VARCHAR(50),
    address_en TEXT,
    address_ar TEXT,
    city_en VARCHAR(100),
    city_ar VARCHAR(100),
    postal_code VARCHAR(20),
    established_year INT,
    legal_basis_en TEXT,
    legal_basis_ar TEXT,
    mandate_en TEXT,
    mandate_ar TEXT,
    logo_url VARCHAR(255),
    primary_color VARCHAR(7),
    enforcement_power BOOLEAN DEFAULT TRUE,
    issues_licenses BOOLEAN DEFAULT FALSE,
    issues_fines BOOLEAN DEFAULT TRUE,
    max_fine_sar DECIMAL(15,2),
    status VARCHAR(20) DEFAULT 'active',
    merged_into_id UUID REFERENCES regulators(id),
    dissolution_date DATE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ----------------------------------------------------------------------------
-- 1.4 REGULATOR-SECTOR MAPPING
-- ----------------------------------------------------------------------------
DROP TABLE IF EXISTS regulator_sectors CASCADE;
CREATE TABLE regulator_sectors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    regulator_id UUID NOT NULL REFERENCES regulators(id) ON DELETE CASCADE,
    sector_id UUID NOT NULL REFERENCES sectors(id) ON DELETE CASCADE,
    is_primary BOOLEAN DEFAULT FALSE,
    jurisdiction_scope VARCHAR(50),
    notes TEXT,
    effective_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(regulator_id, sector_id)
);
