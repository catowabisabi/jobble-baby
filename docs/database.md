# Jobble Baby - Database Architecture

## Overview

PostgreSQL database for Jobble Baby job-hunting AI assistant app.

## Tables

### 1. users
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| email | VARCHAR(255) | Unique email |
| password_hash | VARCHAR(255) | Hashed password |
| full_name | VARCHAR(100) | User's full name |
| phone | VARCHAR(20) | Phone number (optional) |
| subscription_tier | VARCHAR(20) | free / premium |
| subscription_expires_at | TIMESTAMP | Subscription expiry |
| created_at | TIMESTAMP | Account creation date |
| updated_at | TIMESTAMP | Last update |

### 2. cvs
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| user_id | UUID | Foreign key to users |
| file_path | VARCHAR(500) | S3/storage path |
| file_name | VARCHAR(255) | Original filename |
| file_type | VARCHAR(20) | pdf / docx / image |
| score | INTEGER | AI CV score 1-10 |
| analysis | JSONB | AI analysis result |
| analyzed_at | TIMESTAMP | Analysis timestamp |
| created_at | TIMESTAMP | Upload timestamp |

### 3. salary_data
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| job_title | VARCHAR(100) | Job title |
| company_size | VARCHAR(20) | startup / sme / corporate |
| experience_level | VARCHAR(20) | junior / mid / senior |
| min_salary | INTEGER | Minimum salary (HKD) |
| median_salary | INTEGER | Median salary (HKD) |
| max_salary | INTEGER | Maximum salary (HKD) |
| data_source | VARCHAR(100) | Anonymous source |
| region | VARCHAR(50) | HK / China / Taiwan |
| collected_at | TIMESTAMP | Data collection date |

### 4. interviews
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| user_id | UUID | Foreign key to users |
| cv_id | UUID | Foreign key to cvs |
| job_title | VARCHAR(100) | Target job |
| company_type | VARCHAR(50) | Company description |
| interview_type | VARCHAR(20) | hr / technical / final |
| session_data | JSONB | Questions & answers |
| feedback | JSONB | AI feedback |
| score | INTEGER | Performance score 1-10 |
| created_at | TIMESTAMP | Session start |
| completed_at | TIMESTAMP | Session end |

### 5. job_matches
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| user_id | UUID | Foreign key to users |
| job_title | VARCHAR(100) | Matched job title |
| company_name | VARCHAR(100) | Company name |
| salary_range | VARCHAR(50) | Salary range |
| location | VARCHAR(100) | Job location |
| match_score | FLOAT | AI match score 0-1 |
| source_url | VARCHAR(500) | Job posting URL |
| is_read | BOOLEAN | User viewed? |
| created_at | TIMESTAMP | Match date |

### 6. user_preferences
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| user_id | UUID | Foreign key to users |
| preferred_salary_min | INTEGER | Minimum salary expectation |
| preferred_salary_max | INTEGER | Maximum salary expectation |
| preferred_locations | JSONB | Array of locations |
| preferred_job_types | JSONB | Array of job types |
| preferred_industries | JSONB | Array of industries |
| notify_new_jobs | BOOLEAN | Enable notifications |
| notify_salary_updates | BOOLEAN | Enable notifications |
| created_at | TIMESTAMP | Setup date |
| updated_at | TIMESTAMP | Last update |

## Indexes

- `idx_cvs_user_id` on cvs(user_id)
- `idx_interviews_user_id` on interviews(user_id)
- `idx_job_matches_user_id` on job_matches(user_id)
- `idx_salary_data_job_title` on salary_data(job_title)

## Migrations

Using Alembic for database migrations.