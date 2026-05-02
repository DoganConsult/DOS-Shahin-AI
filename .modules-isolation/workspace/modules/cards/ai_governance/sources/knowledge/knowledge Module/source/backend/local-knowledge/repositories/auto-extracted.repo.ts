// @ts-nocheck
// Auto-extracted repository
import { safeQuery, emptyResult as _emptyResult, withTransaction as _withTransaction } from '../ports/database.port';
import { getFirstRow as _getFirstRow } from '@dos/db';

export class LocalKnowledgeAutoRepo {

  static async query1(schema: string, args: unknown[]) {
    // Original extracted query
    const query = `SELECT * FROM "${schema}".local_knowledge_documents WHERE document_id = $1 AND deleted_at IS NULL LIMIT 1`;
    return safeQuery(query, args);
  }

  static async query2(schema: string, args: unknown[]) {
    // Original extracted query
    const query = `SELECT * FROM "${schema}".local_knowledge_documents WHERE ${where} ORDER BY ${sortCol} ${sortDir} LIMIT ${limit} OFFSET ${offset}`;
    return safeQuery(query, args);
  }

  static async query3(schema: string, args: unknown[]) {
    // Original extracted query
    const query = `SELECT COUNT(*)::int AS total FROM "${schema}".local_knowledge_documents WHERE ${where}`;
    return safeQuery(query, args);
  }

  static async query4(schema: string, args: unknown[]) {
    // Original extracted query
    const query = `UPDATE "${schema}".local_knowledge_documents SET status = 'chunked', chunk_count = $2, ingested_at = NOW(), updated_at = NOW() WHERE document_id = $1`;
    return safeQuery(query, args);
  }

  static async query5(schema: string, args: unknown[]) {
    // Original extracted query
    const query = `INSERT INTO "${schema}".local_knowledge_chunks
           (document_id, chunk_index, content, token_count, start_offset, end_offset, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, NOW())`;
    return safeQuery(query, args);
  }

  static async query6(schema: string, args: unknown[]) {
    // Original extracted query
    const query = `INSERT INTO "${schema}".local_knowledge_documents
       (title, file_name, mime_type, file_size_bytes, source_id, language_code, tags,
        status, chunk_count, created_by, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending', 0, $8, NOW(), NOW())
     RETURNING document_id, status, chunk_count`;
    return safeQuery(query, args);
  }

  static async query7(schema: string, args: unknown[]) {
    // Original extracted query
    const query = `UPDATE "${schema}".local_knowledge_documents
     SET status = 'pending', updated_at = NOW()
     WHERE deleted_at IS NULL AND status IN ('embedded', 'failed')
     RETURNING document_id`;
    return safeQuery(query, args);
  }

  static async query8(schema: string, args: unknown[]) {
    // Original extracted query
    const query = `SELECT COUNT(*)::int AS total_chunks FROM "${schema}".local_knowledge_chunks WHERE deleted_at IS NULL`;
    return safeQuery(query, args);
  }

  static async query9(schema: string, args: unknown[]) {
    // Original extracted query
    const query = `SELECT
       COUNT(*)::int AS total,
       COUNT(*) FILTER(WHERE status = 'embedded')::int AS embedded,
       COUNT(*) FILTER(WHERE status IN ('pending', 'ingesting', 'chunked'))::int AS pending,
       COUNT(*) FILTER(WHERE status = 'failed')::int AS failed,
       MAX(embedded_at) AS last_run_at
     FROM "${schema}".local_knowledge_documents
     WHERE deleted_at IS NULL`;
    return safeQuery(query, args);
  }

  static async query10(schema: string, args: unknown[]) {
    // Original extracted query
    const query = `INSERT INTO "${schema}".module_configs (module_code, config_key, config_value, updated_at) VALUES ('local-knowledge', 'admin_settings', $1, NOW())`;
    return safeQuery(query, args);
  }

  static async query11(schema: string, args: unknown[]) {
    // Original extracted query
    const query = `CREATE TABLE IF NOT EXISTS "${schema}".module_configs (
         module_code TEXT NOT NULL, config_key TEXT NOT NULL, config_value TEXT, updated_at TIMESTAMPTZ DEFAULT NOW(),
         PRIMARY KEY (module_code, config_key))`;
    return safeQuery(query, args);
  }

  static async query12(schema: string, args: unknown[]) {
    // Original extracted query
    const query = `INSERT INTO "${schema}".module_configs (module_code, config_key, config_value, updated_at)
     VALUES ('local-knowledge', 'admin_settings', $1, NOW())
     ON CONFLICT (module_code, config_key) DO UPDATE SET config_value = $1, updated_at = NOW()`;
    return safeQuery(query, args);
  }

  static async query13(schema: string, args: unknown[]) {
    // Original extracted query
    const query = `SELECT config_value FROM "${schema}".module_configs WHERE module_code = 'local-knowledge' AND config_key = 'admin_settings' LIMIT 1`;
    return safeQuery(query, args);
  }

  static async query14(schema: string, args: unknown[]) {
    // Original extracted query
    const query = `SELECT id, status, updated_at AS "updatedAt" FROM "${schema}".local_knowledge_documents WHERE status = 'stale' ORDER BY updated_at ASC LIMIT 100`;
    return safeQuery(query, args);
  }

  static async query15(schema: string, args: unknown[]) {
    // Original extracted query
    const query = `SELECT id, status, updated_at AS "updatedAt" FROM "${schema}".local_knowledge_documents WHERE status = 'failed' ORDER BY updated_at ASC LIMIT 100`;
    return safeQuery(query, args);
  }

  static async query16(schema: string, args: unknown[]) {
    // Original extracted query
    const query = `SELECT id, status, created_at FROM "${schema}".local_knowledge_documents WHERE id = $1`;
    return safeQuery(query, args);
  }

  static async query17(schema: string, args: unknown[]) {
    // Original extracted query
    const query = `SELECT before_state AS "fromStatus", after_state AS "toStatus", user_id AS "changedBy", created_at AS "changedAt" FROM "${schema}".audit_trail WHERE entity_id = $1 AND module = 'local-knowledge' AND action = 'transition' ORDER BY created_at ASC`;
    return safeQuery(query, args);
  }

  static async query18(schema: string, args: unknown[]) {
    // Original extracted query
    const query = `INSERT INTO "${schema}".audit_trail (tenant_id, user_id, module, action, entity_type, entity_id, before_state, after_state) VALUES ($1,$2,'local-knowledge','transition',$3,$4,$5,$6)`;
    return safeQuery(query, args);
  }

  static async query19(schema: string, args: unknown[]) {
    // Original extracted query
    const query = `UPDATE "${schema}"."${table}" SET status = $1, updated_at = NOW() WHERE id = $2`;
    return safeQuery(query, args);
  }

  static async query20(schema: string, args: unknown[]) {
    // Original extracted query
    const query = `SELECT status FROM "${schema}"."${table}" WHERE id = $1`;
    return safeQuery(query, args);
  }

  static async query21(schema: string, args: unknown[]) {
    // Original extracted query
    const query = `SELECT status FROM "${schema}".local_knowledge_documents WHERE id = $1`;
    return safeQuery(query, args);
  }

  static async query22(schema: string, args: unknown[]) {
    // Original extracted query
    const query = `SELECT user_id, action, before_state, after_state, created_at FROM "${schema}".audit_trail WHERE tenant_id = $1 AND entity_id = $2 AND module = 'local-knowledge' AND action = 'transition' ORDER BY created_at ASC`;
    return safeQuery(query, args);
  }

  static async query23(schema: string, args: unknown[]) {
    // Original extracted query
    const query = `INSERT INTO "${schema}".inbox_inbox (tenant_id, subject, body, entity_type, entity_id, action_required, priority) VALUES ($1, $2, $3, $4, $5, true, 'high')`;
    return safeQuery(query, args);
  }

  static async query24(schema: string, args: unknown[]) {
    // Original extracted query
    const query = `INSERT INTO "${schema}".audit_trail (tenant_id, user_id, module, action, entity_type, entity_id, before_state, after_state) VALUES ($1, $2, $3, 'transition', $4, $5, $6, $7)`;
    return safeQuery(query, args);
  }

  static async query25(schema: string, args: unknown[]) {
    // Original extracted query
    const query = `UPDATE "${schema}".local_knowledge_documents SET status = $1, updated_at = NOW() WHERE id = $2`;
    return safeQuery(query, args);
  }

  static async query26(schema: string, args: unknown[]) {
    // Original extracted query
    const query = `SELECT c.chunk_id, c.document_id, d.title AS document_title, c.content, c.heading_context, 0.5 AS score
       FROM "${schema}".local_knowledge_chunks c
       JOIN "${schema}".local_knowledge_documents d ON d.document_id = c.document_id
       WHERE c.deleted_at IS NULL AND d.deleted_at IS NULL AND LOWER(c.content) LIKE $1
       ORDER BY c.created_at DESC
       LIMIT ${topK}`;
    return safeQuery(query, args);
  }

  static async query27(schema: string, args: unknown[]) {
    // Original extracted query
    const query = `SELECT c.chunk_id, c.document_id, d.title AS document_title, c.content, c.heading_context,
            SIMILARITY(LOWER(c.content), LOWER($1)) AS score
     FROM "${schema}".local_knowledge_chunks c
     JOIN "${schema}".local_knowledge_documents d ON d.document_id = c.document_id
     WHERE ${conditions.join(' AND ')}
     ORDER BY score DESC
     LIMIT ${topK}`;
    return safeQuery(query, args);
  }

  static async query28(schema: string, args: unknown[]) {
    // Original extracted query
    const query = `INSERT INTO "${schema}".local_knowledge_sources
       (name_en, name_ar, source_type, sync_frequency, status, created_by, created_at, updated_at)
     VALUES ($1, $2, $3, $4, 'active', $5, NOW(), NOW())
     RETURNING *, 0 AS document_count, 0 AS total_size_bytes`;
    return safeQuery(query, args);
  }

  static async query29(schema: string, args: unknown[]) {
    // Original extracted query
    const query = `SELECT s.*,
            (SELECT COUNT(*)::int FROM "${schema}".local_knowledge_documents d WHERE d.source_id = s.source_id AND d.deleted_at IS NULL) AS document_count,
            (SELECT COALESCE(SUM(d.file_size_bytes), 0)::bigint FROM "${schema}".local_knowledge_documents d WHERE d.source_id = s.source_id AND d.deleted_at IS NULL) AS total_size_bytes
     FROM "${schema}".local_knowledge_sources s
     WHERE s.source_id = $1 AND s.deleted_at IS NULL LIMIT 1`;
    return safeQuery(query, args);
  }

  static async query30(schema: string, args: unknown[]) {
    // Original extracted query
    const query = `SELECT s.*,
            (SELECT COUNT(*)::int FROM "${schema}".local_knowledge_documents d WHERE d.source_id = s.source_id AND d.deleted_at IS NULL) AS document_count,
            (SELECT COALESCE(SUM(d.file_size_bytes), 0)::bigint FROM "${schema}".local_knowledge_documents d WHERE d.source_id = s.source_id AND d.deleted_at IS NULL) AS total_size_bytes
     FROM "${schema}".local_knowledge_sources s
     WHERE s.deleted_at IS NULL
     ORDER BY s.created_at DESC`;
    return safeQuery(query, args);
  }

  static async query31(schema: string, args: unknown[]) {
    // Original extracted query
    const query = `SELECT policy_id FROM "${schema}".policies
       WHERE status != 'archived' ORDER BY created_at DESC`;
    return safeQuery(query, args);
  }

  static async query32(schema: string, args: unknown[]) {
    // Original extracted query
    const query = `SELECT control_id FROM "${schema}".controls
       WHERE status != 'retired' ORDER BY created_at DESC`;
    return safeQuery(query, args);
  }

  static async query33(schema: string, args: unknown[]) {
    // Original extracted query
    const query = `SELECT id FROM "${schema}".evidence
       WHERE status != 'deleted' ORDER BY created_at DESC`;
    return safeQuery(query, args);
  }

  static async query34(schema: string, args: unknown[]) {
    // Original extracted query
    const query = `SELECT document_id FROM "${schema}".regulatory_documents
       WHERE status != 'deleted' ORDER BY created_at DESC`;
    return safeQuery(query, args);
  }

  static async query35(schema: string, args: unknown[]) {
    // Original extracted query
    const query = `SELECT full_name FROM "${schema}".users WHERE user_id = $1`;
    return safeQuery(query, args);
  }

  static async query36(schema: string, args: unknown[]) {
    // Original extracted query
    const query = `SELECT name FROM "${schema}".frameworks WHERE framework_id = $1`;
    return safeQuery(query, args);
  }

  static async query37(schema: string, args: unknown[]) {
    // Original extracted query
    const query = `SELECT policy_id, title, title_ar, content, content_ar,
            status, classification, domain, owner_id,
            framework_id, version, tags,
            created_at, updated_at
     FROM "${schema}".policies
     WHERE policy_id = $1`;
    return safeQuery(query, args);
  }

  static async query38(schema: string, args: unknown[]) {
    // Original extracted query
    const query = `SELECT requirement_ref FROM "${schema}".compliance_obligations
       WHERE mapped_controls @> ARRAY[$1]::uuid[]
       AND deleted_at IS NULL
       LIMIT 20`;
    return safeQuery(query, args);
  }

  static async query39(schema: string, args: unknown[]) {
    // Original extracted query
    const query = `SELECT full_name FROM "${schema}".users WHERE user_id = $1`;
    return safeQuery(query, args);
  }

  static async query40(schema: string, args: unknown[]) {
    // Original extracted query
    const query = `SELECT c.control_id, c.control_ref, c.title, c.description,
            c.status, c.domain, c.owner_id, c.framework_id,
            c.created_at, c.updated_at,
            f.name AS framework_name
     FROM "${schema}".controls c
     LEFT JOIN "${schema}".frameworks f ON c.framework_id = f.framework_id
     WHERE c.control_id = $1`;
    return safeQuery(query, args);
  }

  static async query41(schema: string, args: unknown[]) {
    // Original extracted query
    const query = `SELECT full_name FROM "${schema}".users WHERE user_id = $1`;
    return safeQuery(query, args);
  }

  static async query42(schema: string, args: unknown[]) {
    // Original extracted query
    const query = `SELECT c.title, c.framework_id, f.name AS framework_name
       FROM "${schema}".controls c
       LEFT JOIN "${schema}".frameworks f ON c.framework_id = f.framework_id
       WHERE c.control_id = $1`;
    return safeQuery(query, args);
  }

  static async query43(schema: string, args: unknown[]) {
    // Original extracted query
    const query = `SELECT id, title, description, file_name, evidence_type,
            control_id, status, sensitivity, tags, uploaded_by,
            created_at, updated_at
     FROM "${schema}".evidence
     WHERE id = $1`;
    return safeQuery(query, args);
  }

  static async query44(schema: string, args: unknown[]) {
    // Original extracted query
    const query = `SELECT clause_id, clause_ref, text, clause_type, severity
     FROM "${schema}".regulatory_clauses
     WHERE document_id = $1
     ORDER BY sort_order ASC`;
    return safeQuery(query, args);
  }

  static async query45(schema: string, args: unknown[]) {
    // Original extracted query
    const query = `SELECT name FROM "${schema}".frameworks WHERE framework_id = $1`;
    return safeQuery(query, args);
  }

  static async query46(schema: string, args: unknown[]) {
    // Original extracted query
    const query = `SELECT document_id, title, title_ar, regulator_id, framework_id,
            status, created_at, updated_at
     FROM "${schema}".regulatory_documents
     WHERE document_id = $1`;
    return safeQuery(query, args);
  }

  static async query47(schema: string, args: unknown[]) {
    // Original extracted query
    const query = `INSERT INTO "${schema}".local_knowledge_custody_chain
        (tenant_id, document_id, event_type, actor_user_id, metadata)
       VALUES ($1, $2, 'accessed', $3, $4)`;
    return safeQuery(query, args);
  }

  static async query48(schema: string, args: unknown[]) {
    // Original extracted query
    const query = `UPDATE "${schema}".local_knowledge_documents
          SET confidentiality_level = $1, updated_at = NOW()
        WHERE document_id = $2 AND tenant_id = $3`;
    return safeQuery(query, args);
  }

  static async query49(schema: string, args: unknown[]) {
    // Original extracted query
    const query = `WITH user_acl AS (
       -- Direct user grants
       SELECT document_id, access_level, 'acl' AS source
         FROM "${schema}".local_knowledge_document_acl
        WHERE tenant_id = $1 AND user_id = $2 AND revoked_at IS NULL
          AND (expires_at IS NULL OR expires_at > NOW())
     ),
     role_acl AS (
       -- Role-based grants
       SELECT acl.document_id, acl.access_level, 'role' AS source
         FROM "${schema}".local_knowledge_document_acl acl
         JOIN "${schema}".user_roles ur ON ur.role_id::text = acl.role_code
        WHERE acl.tenant_id = $1 AND ur.user_id = $2
          AND acl.revoked_at IS NULL AND ur.deleted_at IS NULL
          AND (acl.expires_at IS NULL OR acl.expires_at > NOW())
          AND (ur.valid_to IS NULL OR ur.valid_to > NOW())
     ),
     team_acl AS (
       -- Team-based grants
       SELECT acl.document_id, acl.access_level, 'acl' AS source
         FROM "${schema}".local_knowledge_document_acl acl
         JOIN "${schema}".team_members tm ON tm.team_id = acl.team_id
        WHERE acl.tenant_id = $1 AND tm.user_id = $2
          AND acl.revoked_at IS NULL
          AND (acl.expires_at IS NULL OR acl.expires_at > NOW())
     ),
     public_docs AS (
       -- Public documents
       SELECT document_id, 'read' AS access_level, 'public' AS source
         FROM "${schema}".local_knowledge_documents
        WHERE tenant_id = $1 AND confidentiality_level = 'public'
          AND status = 'active' AND deleted_at IS NULL
     ),
     combined AS (
       SELECT * FROM user_acl
       UNION ALL SELECT * FROM role_acl
       UNION ALL SELECT * FROM team_acl
       UNION ALL SELECT * FROM public_docs
     )
     SELECT document_id,
            -- Pick highest access level: admin > write > read
            (ARRAY_AGG(access_level ORDER BY
              CASE access_level WHEN 'admin' THEN 1 WHEN 'write' THEN 2 ELSE 3 END
            ))[1] AS access_level,
            (ARRAY_AGG(source ORDER BY
              CASE source WHEN 'acl' THEN 1 WHEN 'role' THEN 2 ELSE 3 END
            ))[1] AS source
       FROM combined
      GROUP BY document_id
      ORDER BY document_id`;
    return safeQuery(query, args);
  }

  static async query50(schema: string, args: unknown[]) {
    // Original extracted query
    const query = `SELECT acl_id, document_id, user_id, role_code, team_id, access_level,
            granted_by, granted_at, expires_at, revoked_at
       FROM "${schema}".local_knowledge_document_acl
      WHERE tenant_id = $1 AND document_id = $2 AND revoked_at IS NULL
        AND (expires_at IS NULL OR expires_at > NOW())
      ORDER BY granted_at DESC`;
    return safeQuery(query, args);
  }

  static async query51(schema: string, args: unknown[]) {
    // Original extracted query
    const query = `UPDATE "${schema}".local_knowledge_document_acl
          SET revoked_at = NOW(), revoked_by = $1
        WHERE acl_id = $2 AND tenant_id = $3 AND document_id = $4 AND revoked_at IS NULL`;
    return safeQuery(query, args);
  }

  static async query52(schema: string, args: unknown[]) {
    // Original extracted query
    const query = `INSERT INTO "${schema}".local_knowledge_document_acl
        (tenant_id, document_id, user_id, role_code, team_id, access_level, granted_by, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING acl_id`;
    return safeQuery(query, args);
  }

  static async query53(schema: string, args: unknown[]) {
    // Original extracted query
    const query = `SELECT acl.access_level
         FROM "${schema}".local_knowledge_document_acl acl
         JOIN "${schema}".team_members tm ON tm.team_id = acl.team_id
        WHERE acl.tenant_id = $1 AND acl.document_id = $2 AND tm.user_id = $3
          AND acl.revoked_at IS NULL
          AND (acl.expires_at IS NULL OR acl.expires_at > NOW())
        ORDER BY
          CASE acl.access_level WHEN 'admin' THEN 1 WHEN 'write' THEN 2 ELSE 3 END
        LIMIT 1`;
    return safeQuery(query, args);
  }

  static async query54(schema: string, args: unknown[]) {
    // Original extracted query
    const query = `SELECT acl.access_level
         FROM "${schema}".local_knowledge_document_acl acl
         JOIN "${schema}".user_roles ur ON ur.role_id::text = acl.role_code
        WHERE acl.tenant_id = $1 AND acl.document_id = $2 AND ur.user_id = $3
          AND acl.revoked_at IS NULL AND ur.deleted_at IS NULL
          AND (acl.expires_at IS NULL OR acl.expires_at > NOW())
          AND (ur.valid_to IS NULL OR ur.valid_to > NOW())
        ORDER BY
          CASE acl.access_level WHEN 'admin' THEN 1 WHEN 'write' THEN 2 ELSE 3 END
        LIMIT 1`;
    return safeQuery(query, args);
  }

  static async query55(schema: string, args: unknown[]) {
    // Original extracted query
    const query = `SELECT access_level FROM "${schema}".local_knowledge_document_acl
        WHERE tenant_id = $1 AND document_id = $2 AND user_id = $3
          AND revoked_at IS NULL
          AND (expires_at IS NULL OR expires_at > NOW())
        ORDER BY
          CASE access_level WHEN 'admin' THEN 1 WHEN 'write' THEN 2 ELSE 3 END
        LIMIT 1`;
    return safeQuery(query, args);
  }

  static async query56(schema: string, args: unknown[]) {
    // Original extracted query
    const query = `SELECT confidentiality_level, status
         FROM "${schema}".local_knowledge_documents
        WHERE document_id = $1 AND tenant_id = $2`;
    return safeQuery(query, args);
  }

  static async query57(schema: string, args: unknown[]) {
    // Original extracted query
    const query = `SELECT document_id, confidentiality_level, access_control_list, legal_hold, deleted_at
       FROM "${schema}".local_knowledge_documents
       WHERE tenant_id = $${documentIds.length + 1} AND document_id IN (${placeholders})`;
    return safeQuery(query, args);
  }

  static async query58(schema: string, args: unknown[]) {
    // Original extracted query
    const query = `SELECT al.access_id, al.tenant_id, al.document_id, al.user_id, al.user_role,
            al.access_type, al.granted, al.reason, al.ip_address::text, al.user_agent,
            al.chunk_ids, al.query_text, al.result_count, al.response_time_ms,
            al.source, al.session_id, al.accessed_at
       FROM "${schema}".local_knowledge_access_log al
      WHERE al.tenant_id = $1 AND al.user_id = $2
      ORDER BY al.accessed_at DESC
      LIMIT 500`;
    return safeQuery(query, args);
  }

  static async query59(schema: string, args: unknown[]) {
    // Original extracted query
    const query = `SELECT al.access_id, al.tenant_id, al.document_id, al.user_id, al.user_role,
            al.access_type, al.granted, al.reason, al.ip_address::text, al.user_agent,
            al.chunk_ids, al.query_text, al.result_count, al.response_time_ms,
            al.source, al.session_id, al.accessed_at
       FROM "${schema}".local_knowledge_access_log al
      WHERE al.tenant_id = $1 AND al.document_id = $2
      ORDER BY al.accessed_at DESC
      LIMIT 500`;
    return safeQuery(query, args);
  }

  static async query60(schema: string, args: unknown[]) {
    // Original extracted query
    const query = `SELECT al.access_type AS action, COUNT(*)::int AS count
         FROM "${schema}".local_knowledge_access_log al
        WHERE ${timeCondition}
        GROUP BY al.access_type
        ORDER BY count DESC`;
    return safeQuery(query, args);
  }

  static async query61(schema: string, args: unknown[]) {
    // Original extracted query
    const query = `SELECT ROUND(AVG(al.response_time_ms))::int AS avg_response_time_ms
         FROM "${schema}".local_knowledge_access_log al
        WHERE ${timeCondition} AND al.response_time_ms IS NOT NULL`;
    return safeQuery(query, args);
  }

  static async query62(schema: string, args: unknown[]) {
    // Original extracted query
    const query = `SELECT DATE(al.accessed_at) AS date, COUNT(*)::int AS access_count
         FROM "${schema}".local_knowledge_access_log al
        WHERE ${timeCondition}
        GROUP BY DATE(al.accessed_at)
        ORDER BY date ASC`;
    return safeQuery(query, args);
  }

  static async query63(schema: string, args: unknown[]) {
    // Original extracted query
    const query = `SELECT LOWER(TRIM(al.query_text)) AS query_text, COUNT(*)::int AS frequency
         FROM "${schema}".local_knowledge_access_log al
        WHERE ${timeCondition} AND al.query_text IS NOT NULL AND al.query_text <> ''
        GROUP BY LOWER(TRIM(al.query_text))
        ORDER BY frequency DESC
        LIMIT 20`;
    return safeQuery(query, args);
  }

  static async query64(schema: string, args: unknown[]) {
    // Original extracted query
    const query = `SELECT al.user_id, COUNT(*)::int AS access_count
         FROM "${schema}".local_knowledge_access_log al
        WHERE ${timeCondition}
        GROUP BY al.user_id
        ORDER BY access_count DESC
        LIMIT 10`;
    return safeQuery(query, args);
  }

  static async query65(schema: string, args: unknown[]) {
    // Original extracted query
    const query = `SELECT al.document_id, d.title, COUNT(*)::int AS access_count
         FROM "${schema}".local_knowledge_access_log al
         LEFT JOIN "${schema}".local_knowledge_documents d ON d.document_id = al.document_id
        WHERE ${timeCondition} AND al.document_id IS NOT NULL
        GROUP BY al.document_id, d.title
        ORDER BY access_count DESC
        LIMIT 10`;
    return safeQuery(query, args);
  }

  static async query66(schema: string, args: unknown[]) {
    // Original extracted query
    const query = `SELECT al.access_id, al.tenant_id, al.document_id, al.user_id, al.user_role,
            al.access_type, al.granted, al.reason, al.ip_address::text, al.user_agent,
            al.chunk_ids, al.query_text, al.result_count, al.response_time_ms,
            al.source, al.session_id, al.accessed_at,
            d.title AS document_title
       FROM "${schema}".local_knowledge_access_log al
       LEFT JOIN "${schema}".local_knowledge_documents d
         ON d.document_id = al.document_id
      WHERE ${whereClause}
      ORDER BY al.accessed_at DESC
      LIMIT $${paramIdx} OFFSET $${paramIdx + 1}`;
    return safeQuery(query, args);
  }

  static async query67(schema: string, args: unknown[]) {
    // Original extracted query
    const query = `SELECT COUNT(*)::int AS total
       FROM "${schema}".local_knowledge_access_log al
      WHERE ${whereClause}`;
    return safeQuery(query, args);
  }

  static async query68(schema: string, args: unknown[]) {
    // Original extracted query
    const query = `INSERT INTO "${schema}".local_knowledge_access_log
        (tenant_id, document_id, user_id, user_role, access_type, granted, reason,
         ip_address, user_agent, chunk_ids, query_text, result_count,
         response_time_ms, source, session_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8::inet, $9, $10, $11, $12, $13, $14, $15)
       RETURNING access_id`;
    return safeQuery(query, args);
  }

  static async query69(schema: string, args: unknown[]) {
    // Original extracted query
    const query = `UPDATE "${schema}".local_knowledge_cache
     SET hit_count  = hit_count + 1,
         last_hit_at = NOW()
     WHERE tenant_id = $1
       AND query_hash = $2
       AND invalidated = FALSE`;
    return safeQuery(query, args);
  }

  static async query70(schema: string, args: unknown[]) {
    // Original extracted query
    const query = `DELETE FROM "${schema}".local_knowledge_cache
       WHERE tenant_id = $1
         AND (expires_at <= NOW() OR invalidated = TRUE)`;
    return safeQuery(query, args);
  }

  static async query71(schema: string, args: unknown[]) {
    // Original extracted query
    const query = `SELECT
         COUNT(*)::int                                                AS total_entries,
         COUNT(*) FILTER (WHERE invalidated = FALSE AND expires_at > NOW())::int AS active_entries,
         COUNT(*) FILTER (WHERE invalidated = TRUE)::int              AS invalidated_entries,
         COUNT(*) FILTER (WHERE invalidated = FALSE AND expires_at <= NOW())::int AS expired_entries,
         COALESCE(SUM(hit_count), 0)::int                             AS total_hits,
         COALESCE(AVG(avg_response_ms) FILTER (WHERE avg_response_ms > 0), 0)::float AS avg_response_ms,
         COALESCE(SUM(pg_column_size(result)), 0)::bigint             AS storage_bytes_estimate
       FROM "${schema}".local_knowledge_cache
       WHERE tenant_id = $1`;
    return safeQuery(query, args);
  }

  static async query72(schema: string, args: unknown[]) {
    // Original extracted query
    const query = `UPDATE "${schema}".local_knowledge_cache
         SET invalidated = TRUE
         WHERE tenant_id = $1
           AND invalidated = FALSE
         RETURNING query_hash`;
    return safeQuery(query, args);
  }

  static async query73(schema: string, args: unknown[]) {
    // Original extracted query
    const query = `UPDATE "${schema}".local_knowledge_cache
         SET invalidated = TRUE
         WHERE tenant_id = $1
           AND $2 = ANY(document_ids)
           AND invalidated = FALSE
         RETURNING query_hash`;
    return safeQuery(query, args);
  }

  static async query74(schema: string, args: unknown[]) {
    // Original extracted query
    const query = `INSERT INTO "${schema}".local_knowledge_cache
         (tenant_id, query_hash, query_text, result, document_ids,
          ttl_seconds, expires_at, hit_count, avg_response_ms, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 0, $8, NOW())
       ON CONFLICT (tenant_id, query_hash) WHERE invalidated = FALSE
       DO UPDATE SET
         result       = EXCLUDED.result,
         query_text   = COALESCE(EXCLUDED.query_text, local_knowledge_cache.query_text),
         document_ids = COALESCE(EXCLUDED.document_ids, local_knowledge_cache.document_ids),
         ttl_seconds  = EXCLUDED.ttl_seconds,
         expires_at   = EXCLUDED.expires_at,
         invalidated  = FALSE,
         avg_response_ms = EXCLUDED.avg_response_ms`;
    return safeQuery(query, args);
  }

  static async query75(schema: string, args: unknown[]) {
    // Original extracted query
    const query = `SELECT result, hit_count, expires_at
       FROM "${schema}".local_knowledge_cache
       WHERE tenant_id = $1
         AND query_hash = $2
         AND invalidated = FALSE
         AND expires_at > NOW()
       LIMIT 1`;
    return safeQuery(query, args);
  }

  static async query76(schema: string, args: unknown[]) {
    // Original extracted query
    const query = `SELECT chunk_index, chunk_text
           FROM "${schema}".local_knowledge_chunks
          WHERE document_id = $1 AND tenant_id = $2
            AND chunk_index = ANY($3::int[])`;
    return safeQuery(query, args);
  }

  static async query77(schema: string, args: unknown[]) {
    // Original extracted query
    const query = `SELECT c.chunk_id, c.tenant_id, c.document_id, c.ingestion_id,
            c.chunk_index, c.chunk_text, c.chunk_type, c.metadata, c.created_at,
            d.title AS document_title, d.document_type,
            similarity(c.chunk_text, $2) AS sim_score
       FROM "${schema}".local_knowledge_chunks c
       LEFT JOIN "${schema}".local_knowledge_documents d
         ON d.document_id = c.document_id AND d.tenant_id = c.tenant_id
      WHERE ${whereClause}
        AND c.chunk_text ILIKE $2
      ORDER BY sim_score DESC
      LIMIT $3 OFFSET $4`;
    return safeQuery(query, args);
  }

  static async query78(schema: string, args: unknown[]) {
    // Original extracted query
    const query = `SELECT chunk_id, tenant_id, document_id, ingestion_id,
              chunk_index, chunk_text, chunk_type, metadata, created_at
         FROM "${schema}".local_knowledge_chunks
        WHERE document_id = $1
          AND tenant_id = $2
          AND chunk_index >= $3
          AND chunk_index <= $4
        ORDER BY chunk_index ASC`;
    return safeQuery(query, args);
  }

  static async query79(schema: string, args: unknown[]) {
    // Original extracted query
    const query = `SELECT document_id, chunk_index
         FROM "${schema}".local_knowledge_chunks
        WHERE chunk_id = $1 AND tenant_id = $2`;
    return safeQuery(query, args);
  }

  static async query80(schema: string, args: unknown[]) {
    // Original extracted query
    const query = `DELETE FROM "${schema}".local_knowledge_index
          WHERE tenant_id = $1
            AND knowledge_item_type = 'chunk'
            AND knowledge_item_id = ANY($2::uuid[])`;
    return safeQuery(query, args);
  }

  static async query81(schema: string, args: unknown[]) {
    // Original extracted query
    const query = `DELETE FROM "${schema}".local_knowledge_chunks
        WHERE document_id = $1 AND tenant_id = $2
        RETURNING chunk_id`;
    return safeQuery(query, args);
  }

  static async query82(schema: string, args: unknown[]) {
    // Original extracted query
    const query = `INSERT INTO "${schema}".local_knowledge_chunks
           (chunk_id, tenant_id, document_id, ingestion_id, chunk_index,
            chunk_text, chunk_type, metadata, created_at)
         VALUES (
           gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7::jsonb, NOW()
         )
         ON CONFLICT (document_id, chunk_index) DO UPDATE
           SET chunk_text = EXCLUDED.chunk_text,
               chunk_type = EXCLUDED.chunk_type,
               metadata   = EXCLUDED.metadata
         RETURNING *`;
    return safeQuery(query, args);
  }

  static async query83(schema: string, args: unknown[]) {
    // Original extracted query
    const query = `SELECT ingestion_id FROM "${schema}".local_knowledge_documents
          WHERE document_id = $1 AND tenant_id = $2`;
    return safeQuery(query, args);
  }

  static async query84(schema: string, args: unknown[]) {
    // Original extracted query
    const query = `SELECT c.chunk_id, c.tenant_id, c.document_id, c.ingestion_id,
              c.chunk_index, c.chunk_text, c.chunk_type, c.metadata, c.created_at,
              d.title AS document_title, d.document_type,
              ts_rank_cd(
                to_tsvector('english', c.chunk_text),
                to_tsquery('english', $2)
              ) AS rank
         FROM "${schema}".local_knowledge_chunks c
         LEFT JOIN "${schema}".local_knowledge_documents d
           ON d.document_id = c.document_id AND d.tenant_id = c.tenant_id
        WHERE ${whereClause}
          AND to_tsvector('english', c.chunk_text) @@ to_tsquery('english', $2)
        ORDER BY rank DESC
        LIMIT $3 OFFSET $4`;
    return safeQuery(query, args);
  }

  static async query85(schema: string, args: unknown[]) {
    // Original extracted query
    const query = `SELECT chunk_id, tenant_id, document_id, ingestion_id,
              chunk_index, chunk_text, chunk_type, metadata, created_at
         FROM "${schema}".local_knowledge_chunks
        WHERE document_id = $1 AND tenant_id = $2
        ORDER BY chunk_index ASC`;
    return safeQuery(query, args);
  }

  static async query86(schema: string, args: unknown[]) {
    // Original extracted query
    const query = `DELETE FROM "${schema}".local_knowledge_published p
       USING "${schema}".local_knowledge_published p2
       LEFT JOIN "${schema}".local_knowledge_documents d ON d.document_id = p2.document_id AND d.tenant_id = p2.tenant_id
       WHERE p.published_id = p2.published_id
         AND p.tenant_id = $1
         AND d.document_id IS NULL
       RETURNING p.published_id`;
    return safeQuery(query, args);
  }

  static async query87(schema: string, args: unknown[]) {
    // Original extracted query
    const query = `DELETE FROM "${schema}".local_knowledge_chunks c
       USING "${schema}".local_knowledge_chunks c2
       LEFT JOIN "${schema}".local_knowledge_documents d ON d.document_id = c2.document_id AND d.tenant_id = c2.tenant_id
       WHERE c.chunk_id = c2.chunk_id
         AND c.tenant_id = $1
         AND d.document_id IS NULL
       RETURNING c.chunk_id`;
    return safeQuery(query, args);
  }

  static async query88(schema: string, args: unknown[]) {
    // Original extracted query
    const query = `SELECT p.published_id
       FROM "${schema}".local_knowledge_published p
       LEFT JOIN "${schema}".local_knowledge_documents d ON d.document_id = p.document_id AND d.tenant_id = p.tenant_id
       WHERE p.tenant_id = $1 AND d.document_id IS NULL
       LIMIT 100`;
    return safeQuery(query, args);
  }

  static async query89(schema: string, args: unknown[]) {
    // Original extracted query
    const query = `SELECT i.ingestion_id
       FROM "${schema}".local_knowledge_ingestion_log i
       LEFT JOIN "${schema}".local_knowledge_sources s ON s.source_id = i.source_id AND s.tenant_id = i.tenant_id
       WHERE i.tenant_id = $1 AND s.source_id IS NULL
       LIMIT 100`;
    return safeQuery(query, args);
  }

  static async query90(schema: string, args: unknown[]) {
    // Original extracted query
    const query = `SELECT d.document_id
       FROM "${schema}".local_knowledge_documents d
       LEFT JOIN "${schema}".local_knowledge_ingestion_log i ON i.ingestion_id = d.ingestion_id AND i.tenant_id = d.tenant_id
       WHERE d.tenant_id = $1 AND i.ingestion_id IS NULL
       LIMIT 100`;
    return safeQuery(query, args);
  }

  static async query91(schema: string, args: unknown[]) {
    // Original extracted query
    const query = `SELECT c.chunk_id
       FROM "${schema}".local_knowledge_chunks c
       LEFT JOIN "${schema}".local_knowledge_documents d ON d.document_id = c.document_id AND d.tenant_id = c.tenant_id
       WHERE c.tenant_id = $1 AND d.document_id IS NULL
       LIMIT 100`;
    return safeQuery(query, args);
  }

  static async query92(schema: string, args: unknown[]) {
    // Original extracted query
    const query = `SELECT document_id, version, status, canonical_data, updated_at
       FROM "${schema}".local_knowledge_documents
       WHERE document_id = $1 AND tenant_id = $2`;
    return safeQuery(query, args);
  }

  static async query93(schema: string, args: unknown[]) {
    // Original extracted query
    const query = `SELECT custody_id, tenant_id, document_id, event_type, actor_user_id, actor_role,
              event_timestamp, metadata, previous_custody_id, checksum
       FROM "${schema}".local_knowledge_custody_chain
       WHERE tenant_id = $1 AND document_id = $2
       ORDER BY event_timestamp ASC`;
    return safeQuery(query, args);
  }

  static async query94(schema: string, args: unknown[]) {
    // Original extracted query
    const query = `SELECT document_id, title, document_type, deleted_at, deleted_by, recovery_period_days,
              (deleted_at + INTERVAL '1 day' * COALESCE(recovery_period_days, 30)) as expires_at
       FROM "${schema}".local_knowledge_documents
       WHERE tenant_id = $1 AND deleted_at IS NOT NULL
       ORDER BY deleted_at DESC
       LIMIT $2`;
    return safeQuery(query, args);
  }

  static async query95(schema: string, args: unknown[]) {
    // Original extracted query
    const query = `DELETE FROM "${schema}".local_knowledge_documents
           WHERE document_id = $1 AND tenant_id = $2`;
    return safeQuery(query, args);
  }

  static async query96(schema: string, args: unknown[]) {
    // Original extracted query
    const query = `SELECT document_id, deleted_at, recovery_period_days, legal_hold
       FROM "${schema}".local_knowledge_documents
       WHERE tenant_id = $1
         AND deleted_at IS NOT NULL
         AND (deleted_at + INTERVAL '1 day' * COALESCE(recovery_period_days, 30)) < NOW()
         AND (legal_hold IS NULL OR legal_hold = FALSE)`;
    return safeQuery(query, args);
  }

  static async query97(schema: string, args: unknown[]) {
    // Original extracted query
    const query = `UPDATE "${schema}".local_knowledge_documents
       SET deleted_at = NULL, deleted_by = NULL, updated_at = NOW()
       WHERE document_id = $1 AND tenant_id = $2`;
    return safeQuery(query, args);
  }

  static async query98(schema: string, args: unknown[]) {
    // Original extracted query
    const query = `SELECT document_id, deleted_at, recovery_period_days FROM "${schema}".local_knowledge_documents
       WHERE document_id = $1 AND tenant_id = $2 AND deleted_at IS NOT NULL`;
    return safeQuery(query, args);
  }

  static async query99(schema: string, args: unknown[]) {
    // Original extracted query
    const query = `SELECT version_id, document_id, version_number, canonical_data, searchable_text, created_at
       FROM "${schema}".local_knowledge_document_versions
       WHERE tenant_id = $1 AND document_id = $2 AND version_number = $3`;
    return safeQuery(query, args);
  }

  static async query100(schema: string, args: unknown[]) {
    // Original extracted query
    const query = `SELECT version_id, document_id, version_number, canonical_data, searchable_text, created_at
       FROM "${schema}".local_knowledge_document_versions
       WHERE tenant_id = $1 AND document_id = $2
       ORDER BY version_number DESC`;
    return safeQuery(query, args);
  }

  static async query101(schema: string, args: unknown[]) {
    // Original extracted query
    const query = `INSERT INTO "${schema}".local_knowledge_sources
       (source_id, tenant_id, source_name, source_type, source_config, scope_type, trust_level, status, created_at, updated_at)
     VALUES (gen_random_uuid(), $1, 'manual-upload', 'local_folder', '{"type":"manual"}'::jsonb, 'tenant', 'standard', 'active', NOW(), NOW())
     ON CONFLICT (tenant_id, source_name) DO UPDATE SET updated_at = NOW()
     RETURNING source_id`;
    return safeQuery(query, args);
  }

  static async query102(schema: string, args: unknown[]) {
    // Original extracted query
    const query = `SELECT source_id FROM "${schema}".local_knowledge_sources
     WHERE tenant_id = $1 AND source_name = 'manual-upload'
     LIMIT 1`;
    return safeQuery(query, args);
  }

  static async query103(schema: string, args: unknown[]) {
    // Original extracted query
    const query = `SELECT
           COALESCE(AVG(chunk_count), 0)::float AS avg_chunks,
           COALESCE(SUM(chunk_count), 0)::int AS total_chunks
         FROM (
           SELECT d.document_id, COUNT(c.chunk_id)::int AS chunk_count
           FROM "${schema}".local_knowledge_documents d
           LEFT JOIN "${schema}".local_knowledge_chunks c ON c.document_id = d.document_id
           WHERE d.tenant_id = $1 AND d.deleted_at IS NULL
           GROUP BY d.document_id
         ) sub`;
    return safeQuery(query, args);
  }

  static async query104(schema: string, args: unknown[]) {
    // Original extracted query
    const query = `SELECT COUNT(DISTINCT c.document_id)::int AS count
         FROM "${schema}".local_knowledge_chunks c
         JOIN "${schema}".local_knowledge_documents d ON d.document_id = c.document_id
         WHERE c.tenant_id = $1 AND c.embedding IS NOT NULL AND d.deleted_at IS NULL`;
    return safeQuery(query, args);
  }

  static async query105(schema: string, args: unknown[]) {
    // Original extracted query
    const query = `SELECT
           COALESCE(SUM(OCTET_LENGTH(COALESCE(searchable_text, '')) + OCTET_LENGTH(COALESCE(canonical_data::text, ''))), 0)::bigint AS total_bytes
         FROM "${schema}".local_knowledge_documents
         WHERE tenant_id = $1 AND deleted_at IS NULL`;
    return safeQuery(query, args);
  }

  static async query106(schema: string, args: unknown[]) {
    // Original extracted query
    const query = `SELECT knowledge_lane, COUNT(*)::int AS count
         FROM "${schema}".local_knowledge_documents
         WHERE tenant_id = $1 AND deleted_at IS NULL
         GROUP BY knowledge_lane`;
    return safeQuery(query, args);
  }

  static async query107(schema: string, args: unknown[]) {
    // Original extracted query
    const query = `SELECT status, COUNT(*)::int AS count
         FROM "${schema}".local_knowledge_documents
         WHERE tenant_id = $1 AND deleted_at IS NULL
         GROUP BY status`;
    return safeQuery(query, args);
  }

  static async query108(schema: string, args: unknown[]) {
    // Original extracted query
    const query = `SELECT document_type, COUNT(*)::int AS count
         FROM "${schema}".local_knowledge_documents
         WHERE tenant_id = $1 AND deleted_at IS NULL
         GROUP BY document_type`;
    return safeQuery(query, args);
  }

  static async query109(schema: string, args: unknown[]) {
    // Original extracted query
    const query = `UPDATE "${schema}".local_knowledge_documents SET ${sets.join(', ')} ${whereClause}`;
    return safeQuery(query, args);
  }

  static async query110(schema: string, args: unknown[]) {
    // Original extracted query
    const query = `SELECT MAX(accessed_at) AS last_accessed_at
       FROM "${schema}".local_knowledge_access_log
       WHERE document_id = $1 AND tenant_id = $2`;
    return safeQuery(query, args);
  }

  static async query111(schema: string, args: unknown[]) {
    // Original extracted query
    const query = `SELECT COUNT(*)::int AS chunk_count
       FROM "${schema}".local_knowledge_chunks
       WHERE document_id = $1 AND tenant_id = $2`;
    return safeQuery(query, args);
  }

  static async query112(schema: string, args: unknown[]) {
    // Original extracted query
    const query = `INSERT INTO "${schema}".local_knowledge_documents
       (document_id, tenant_id, title, document_type, ingestion_id, canonical_data, searchable_text,
        confidentiality_level, workspace_id, module_scope, status, created_at, updated_at)
     VALUES (gen_random_uuid(), $1, $2, $3, $4, $5::jsonb, $6, $7, $8, $9, 'active', NOW(), NOW())
     RETURNING *`;
    return safeQuery(query, args);
  }

  static async query113(schema: string, args: unknown[]) {
    // Original extracted query
    const query = `SELECT * FROM "${schema}".local_knowledge_documents
     WHERE document_id = $1 AND tenant_id = $2`;
    return safeQuery(query, args);
  }

  static async query114(schema: string, args: unknown[]) {
    // Original extracted query
    const query = `SELECT COUNT(*)::int AS total FROM "${schema}".local_knowledge_documents WHERE ${where}`;
    return safeQuery(query, args);
  }

  static async query115(schema: string, args: unknown[]) {
    // Original extracted query
    const query = `SELECT * FROM "${schema}".local_knowledge_documents WHERE ${where} ORDER BY updated_at DESC LIMIT $${idx++} OFFSET $${idx++}`;
    return safeQuery(query, args);
  }

  static async query116(schema: string, args: unknown[]) {
    // Original extracted query
    const query = `SELECT COUNT(*)::int AS total FROM "${schema}".local_knowledge_documents
     WHERE tenant_id = $1 AND deleted_at IS NULL AND searchable_text ILIKE $2`;
    return safeQuery(query, args);
  }

  static async query117(schema: string, args: unknown[]) {
    // Original extracted query
    const query = `SELECT * FROM "${schema}".local_knowledge_documents
     WHERE tenant_id = $1 AND deleted_at IS NULL AND searchable_text ILIKE $2
     ORDER BY updated_at DESC LIMIT $3 OFFSET $4`;
    return safeQuery(query, args);
  }

  static async query118(schema: string, args: unknown[]) {
    // Original extracted query
    const query = `SELECT c.chunk_id, c.document_id, c.chunk_text, c.chunk_index, c.metadata,
            d.title AS document_title, d.document_type,
            ts_rank_cd(
              to_tsvector('english', c.chunk_text),
              to_tsquery('english', $2)
            ) AS rank
       FROM "${schema}".local_knowledge_chunks c
       LEFT JOIN "${schema}".local_knowledge_documents d
         ON d.document_id = c.document_id AND d.tenant_id = c.tenant_id
      WHERE ${whereClause}
        AND to_tsvector('english', c.chunk_text) @@ to_tsquery('english', $2)
      ORDER BY rank DESC
      LIMIT $3`;
    return safeQuery(query, args);
  }

  static async query119(schema: string, args: unknown[]) {
    // Original extracted query
    const query = `DELETE FROM "${schema}".local_knowledge_index
          WHERE tenant_id = $1
            AND knowledge_item_type = 'chunk'
            AND knowledge_item_id = ANY($2::uuid[])`;
    return safeQuery(query, args);
  }

  static async query120(schema: string, args: unknown[]) {
    // Original extracted query
    const query = `UPDATE "${schema}".local_knowledge_chunks
         SET embedding = NULL
       WHERE document_id = $1 AND tenant_id = $2
       RETURNING chunk_id`;
    return safeQuery(query, args);
  }

  static async query121(schema: string, args: unknown[]) {
    // Original extracted query
    const query = `SELECT c.chunk_id, c.document_id, c.chunk_text, c.chunk_index, c.metadata,
                d.title AS document_title, d.document_type,
                (1 - (c.embedding <=> $2::vector)) AS similarity
           FROM "${schema}".local_knowledge_chunks c
           LEFT JOIN "${schema}".local_knowledge_documents d
             ON d.document_id = c.document_id AND d.tenant_id = c.tenant_id
          WHERE ${whereClause}
            AND (1 - (c.embedding <=> $2::vector)) >= $3
          ORDER BY c.embedding <=> $2::vector
          LIMIT $4`;
    return safeQuery(query, args);
  }

  static async query122(schema: string, args: unknown[]) {
    // Original extracted query
    const query = `INSERT INTO "${schema}".local_knowledge_index
         (tenant_id, knowledge_item_type, knowledge_item_id, embedding, indexed_at)
       VALUES ($1, 'chunk', $2, $3::vector, NOW())
       ON CONFLICT (knowledge_item_type, knowledge_item_id)
         WHERE tenant_id = $1
       DO UPDATE SET embedding = EXCLUDED.embedding, indexed_at = NOW()`;
    return safeQuery(query, args);
  }

  static async query123(schema: string, args: unknown[]) {
    // Original extracted query
    const query = `UPDATE "${schema}".local_knowledge_chunks
         SET embedding = $1::vector
       WHERE chunk_id = $2 AND tenant_id = $3`;
    return safeQuery(query, args);
  }

  static async query124(schema: string, args: unknown[]) {
    // Original extracted query
    const query = `SELECT * FROM "${schema}".local_knowledge_ingestions WHERE id = $1`;
    return safeQuery(query, args);
  }

  static async query125(schema: string, args: unknown[]) {
    // Original extracted query
    const query = `SELECT
         (SELECT COUNT(*)::int FROM "${schema}".local_knowledge_index WHERE tenant_id = $1)
           AS total_indexed,
         (
           SELECT AGE(NOW(), d.created_at)::text
           FROM "${schema}".local_knowledge_documents d
           WHERE d.tenant_id = $1
             AND d.status = 'active'
             AND d.deleted_at IS NULL
             AND NOT EXISTS (
               SELECT 1 FROM "${schema}".local_knowledge_index i
               WHERE i.knowledge_item_id = d.document_id
                 AND i.knowledge_item_type = 'document'
             )
           ORDER BY d.created_at ASC
           LIMIT 1
         ) AS oldest_unindexed_age,
         (
           SELECT COUNT(*)::int
           FROM "${schema}".local_knowledge_index i
           WHERE i.tenant_id = $1
             AND i.indexed_at < NOW() - INTERVAL '7 days'
         ) AS stale_entries`;
    return safeQuery(query, args);
  }

  static async query126(schema: string, args: unknown[]) {
    // Original extracted query
    const query = `SELECT
         COUNT(*) FILTER (WHERE success IS NULL AND ingested_at > NOW() - INTERVAL '5 minutes')::int
           AS pending,
         COUNT(*) FILTER (WHERE success IS NULL AND ingested_at <= NOW() - INTERVAL '5 minutes'
                                                AND ingested_at > NOW() - INTERVAL '1 hour')::int
           AS in_progress,
         COUNT(*) FILTER (WHERE success = FALSE)::int
           AS failed,
         COUNT(*) FILTER (WHERE success = TRUE)::int
           AS succeeded,
         COUNT(*)::int AS total
       FROM "${schema}".local_knowledge_ingestion_log
       WHERE tenant_id = $1
         AND ingested_at > NOW() - INTERVAL '30 days'`;
    return safeQuery(query, args);
  }

  static async query127(schema: string, args: unknown[]) {
    // Original extracted query
    const query = `SELECT
         COUNT(DISTINCT CASE WHEN c.embedding IS NOT NULL THEN d.document_id END)::int
           AS with_embeddings,
         COUNT(DISTINCT CASE WHEN c.embedding IS NULL THEN d.document_id END)::int
           AS without_embeddings
       FROM "${schema}".local_knowledge_documents d
       LEFT JOIN "${schema}".local_knowledge_chunks c
         ON c.document_id = d.document_id AND c.tenant_id = d.tenant_id
       WHERE d.tenant_id = $1
         AND d.status = 'active'
         AND d.deleted_at IS NULL`;
    return safeQuery(query, args);
  }

  static async query128(schema: string, args: unknown[]) {
    // Original extracted query
    const query = `SELECT
         COUNT(*)::int                                             AS total,
         COALESCE(
           COUNT(*)::float / NULLIF(
             (SELECT COUNT(*)::float FROM "${schema}".local_knowledge_documents WHERE tenant_id = $1),
             0
           ), 0
         )                                                          AS avg_per_document,
         (
           SELECT COUNT(*)::int
           FROM "${schema}".local_knowledge_chunks c
           WHERE c.tenant_id = $1
             AND NOT EXISTS (
               SELECT 1 FROM "${schema}".local_knowledge_documents d
               WHERE d.document_id = c.document_id
             )
         )                                                          AS orphaned_chunks
       FROM "${schema}".local_knowledge_chunks
       WHERE tenant_id = $1`;
    return safeQuery(query, args);
  }

  static async query129(schema: string, args: unknown[]) {
    // Original extracted query
    const query = `SELECT
         COUNT(*)::int                                                           AS total,
         COUNT(*) FILTER (WHERE status = 'active' AND deleted_at IS NULL)::int   AS active,
         COUNT(*) FILTER (WHERE status = 'active' AND deleted_at IS NULL
                          AND created_at > NOW() - INTERVAL '1 hour')::int       AS processing,
         COUNT(*) FILTER (WHERE status = 'superseded')::int                      AS failed,
         COUNT(*) FILTER (WHERE status = 'archived')::int                        AS archived,
         COUNT(*) FILTER (WHERE deleted_at IS NOT NULL)::int                     AS deleted
       FROM "${schema}".local_knowledge_documents
       WHERE tenant_id = $1`;
    return safeQuery(query, args);
  }

  static async query130(schema: string, args: unknown[]) {
    // Original extracted query
    const query = `SELECT
         COUNT(*)::int                                                  AS total_searches,
         COALESCE(AVG(avg_response_ms) FILTER (WHERE avg_response_ms > 0), 0)::float
                                                                        AS avg_response_ms,
         COALESCE(AVG(hit_count), 0)::float                             AS avg_result_count,
         COUNT(*) FILTER (WHERE hit_count = 0)::int                     AS zero_result_searches
       FROM "${schema}".local_knowledge_cache
       WHERE tenant_id = $1
         AND created_at >= $2::timestamptz
         AND created_at <= $3::timestamptz`;
    return safeQuery(query, args);
  }

  static async query131(schema: string, args: unknown[]) {
    // Original extracted query
    const query = `SELECT extraction_method, COUNT(*)::int AS cnt
       FROM "${schema}".local_knowledge_ingestion_log
       WHERE tenant_id = $1
         AND ingested_at >= $2::timestamptz
         AND ingested_at <= $3::timestamptz
       GROUP BY extraction_method`;
    return safeQuery(query, args);
  }

  static async query132(schema: string, args: unknown[]) {
    // Original extracted query
    const query = `SELECT
         COUNT(*)::int                                                  AS total,
         COUNT(*) FILTER (WHERE success = TRUE)::int                    AS successful,
         COUNT(*) FILTER (WHERE success = FALSE)::int                   AS failed,
         COALESCE(
           AVG(EXTRACT(EPOCH FROM (created_at - ingested_at)) * 1000)
             FILTER (WHERE success = TRUE), 0
         )::float                                                       AS avg_processing_ms,
         COALESCE(
           COUNT(*) FILTER (WHERE success = TRUE) /
             NULLIF(EXTRACT(DAY FROM ($3::timestamptz - $2::timestamptz)), 0),
           0
         )::float                                                       AS throughput_per_day
       FROM "${schema}".local_knowledge_ingestion_log
       WHERE tenant_id = $1
         AND ingested_at >= $2::timestamptz
         AND ingested_at <= $3::timestamptz`;
    return safeQuery(query, args);
  }

  static async query133(schema: string, args: unknown[]) {
    // Original extracted query
    const query = `SELECT * FROM "${schema}".local_knowledge_ingestions ORDER BY created_at DESC LIMIT $1 OFFSET $2`;
    return safeQuery(query, args);
  }

  static async query134(schema: string, args: unknown[]) {
    // Original extracted query
    const query = `SELECT COUNT(*)::int AS total FROM "${schema}".local_knowledge_ingestions`;
    return safeQuery(query, args);
  }

  static async query135(schema: string, args: unknown[]) {
    // Original extracted query
    const query = `INSERT INTO "${schema}".local_knowledge_ingestions (document_id, metadata)
     VALUES ($1, $2) RETURNING id`;
    return safeQuery(query, args);
  }

  static async query136(schema: string, args: unknown[]) {
    // Original extracted query
    const query = `SELECT * FROM "${schema}".local_knowledge_ingestions WHERE id = $1`;
    return safeQuery(query, args);
  }

  static async query137(schema: string, args: unknown[]) {
    // Original extracted query
    const query = `UPDATE "${schema}".local_knowledge_ingestions
     SET metadata = COALESCE(metadata, '{}'::jsonb) || $1::jsonb, updated_at = NOW()
     WHERE id = $2`;
    return safeQuery(query, args);
  }

  static async query138(schema: string, args: unknown[]) {
    // Original extracted query
    const query = `INSERT INTO "${schema}".local_knowledge_index
         (index_id, tenant_id, knowledge_item_type, knowledge_item_id, search_terms, entity_links, indexed_at)
       VALUES (gen_random_uuid(), $1, 'document', $2, $3, $4, NOW())`;
    return safeQuery(query, args);
  }

  static async query139(schema: string, args: unknown[]) {
    // Original extracted query
    const query = `DELETE FROM "${schema}".local_knowledge_index
       WHERE knowledge_item_id = $1 AND tenant_id = $2`;
    return safeQuery(query, args);
  }

  static async query140(schema: string, args: unknown[]) {
    // Original extracted query
    const query = `SELECT COUNT(*)::int AS count FROM "${schema}".local_knowledge_chunks
       WHERE document_id = $1 AND tenant_id = $2`;
    return safeQuery(query, args);
  }

  static async query141(schema: string, args: unknown[]) {
    // Original extracted query
    const query = `DELETE FROM "${schema}".local_knowledge_index WHERE knowledge_item_id = $1 AND tenant_id = $2`;
    return safeQuery(query, args);
  }

  static async query142(schema: string, args: unknown[]) {
    // Original extracted query
    const query = `DELETE FROM "${schema}".local_knowledge_chunks WHERE document_id = $1 AND tenant_id = $2`;
    return safeQuery(query, args);
  }

  static async query143(schema: string, args: unknown[]) {
    // Original extracted query
    const query = `UPDATE "${schema}".local_knowledge_documents
         SET canonical_data = canonical_data || $1::jsonb, updated_at = NOW()
         WHERE document_id = $2 AND tenant_id = $3`;
    return safeQuery(query, args);
  }

  static async query144(schema: string, args: unknown[]) {
    // Original extracted query
    const query = `UPDATE "${schema}".local_knowledge_documents
       SET status = 'active',
           searchable_text = $1,
           canonical_data = canonical_data || $2::jsonb,
           updated_at = NOW()
       WHERE document_id = $3 AND tenant_id = $4`;
    return safeQuery(query, args);
  }

  static async query145(schema: string, args: unknown[]) {
    // Original extracted query
    const query = `DELETE FROM "${schema}".local_knowledge_chunks
       WHERE document_id = $1 AND tenant_id = $2`;
    return safeQuery(query, args);
  }

  static async query146(schema: string, args: unknown[]) {
    // Original extracted query
    const query = `SELECT document_id, title, legal_hold_until
       FROM "${schema}".local_knowledge_documents
       WHERE tenant_id = $1 AND legal_hold = TRUE AND deleted_at IS NULL
       ORDER BY legal_hold_placed_at DESC`;
    return safeQuery(query, args);
  }

  static async query147(schema: string, args: unknown[]) {
    // Original extracted query
    const query = `SELECT legal_hold, legal_hold_reason, legal_hold_until, legal_hold_placed_by, legal_hold_placed_at
       FROM "${schema}".local_knowledge_documents
       WHERE document_id = $1 AND tenant_id = $2`;
    return safeQuery(query, args);
  }

  static async query148(schema: string, args: unknown[]) {
    // Original extracted query
    const query = `INSERT INTO "${schema}".local_knowledge_legal_hold_audit
         (tenant_id, document_id, action, placed_by, reason, hold_until, created_at)
       VALUES ($1, $2, 'extended', $3, $4, $5, NOW())`;
    return safeQuery(query, args);
  }

  static async query149(schema: string, args: unknown[]) {
    // Original extracted query
    const query = `UPDATE "${schema}".local_knowledge_documents
       SET legal_hold_until = $1,
           updated_at = NOW()
       WHERE document_id = $2 AND tenant_id = $3 AND legal_hold = TRUE`;
    return safeQuery(query, args);
  }

  static async query150(schema: string, args: unknown[]) {
    // Original extracted query
    const query = `INSERT INTO "${schema}".local_knowledge_legal_hold_audit
         (tenant_id, document_id, action, placed_by, reason, created_at)
       VALUES ($1, $2, 'removed', $3, $4, NOW())`;
    return safeQuery(query, args);
  }

  static async query151(schema: string, args: unknown[]) {
    // Original extracted query
    const query = `UPDATE "${schema}".local_knowledge_documents
       SET legal_hold = FALSE,
           legal_hold_reason = NULL,
           legal_hold_until = NULL,
           legal_hold_placed_by = NULL,
           legal_hold_placed_at = NULL,
           updated_at = NOW()
       WHERE document_id = $1 AND tenant_id = $2`;
    return safeQuery(query, args);
  }

  static async query152(schema: string, args: unknown[]) {
    // Original extracted query
    const query = `INSERT INTO "${schema}".local_knowledge_legal_hold_audit
         (tenant_id, document_id, action, placed_by, reason, hold_until, created_at)
       VALUES ($1, $2, 'placed', $3, $4, $5, NOW())`;
    return safeQuery(query, args);
  }

  static async query153(schema: string, args: unknown[]) {
    // Original extracted query
    const query = `UPDATE "${schema}".local_knowledge_documents
       SET legal_hold = TRUE,
           legal_hold_reason = $1,
           legal_hold_until = $2,
           legal_hold_placed_by = $3,
           legal_hold_placed_at = NOW(),
           updated_at = NOW()
       WHERE document_id = $4 AND tenant_id = $5`;
    return safeQuery(query, args);
  }

  static async query154(schema: string, args: unknown[]) {
    // Original extracted query
    const query = `SELECT document_id FROM "${schema}".local_knowledge_documents
       WHERE document_id = $1 AND tenant_id = $2 AND deleted_at IS NULL`;
    return safeQuery(query, args);
  }

  static async query155(schema: string, args: unknown[]) {
    // Original extracted query
    const query = `SELECT user_id FROM "${schema}".users WHERE role = 'admin' AND is_active = TRUE LIMIT 10`;
    return safeQuery(query, args);
  }

  static async query156(schema: string, args: unknown[]) {
    // Original extracted query
    const query = `SELECT user_id FROM "${schema}".users WHERE role = 'admin' AND is_active = TRUE LIMIT 10`;
    return safeQuery(query, args);
  }

  static async query157(schema: string, args: unknown[]) {
    // Original extracted query
    const query = `INSERT INTO "${schema}".local_knowledge_access_log
         (tenant_id, user_id, access_type, granted, reason, accessed_at)
       VALUES ($1, $2, 'read', true, $3, NOW())`;
    return safeQuery(query, args);
  }

  static async query158(schema: string, args: unknown[]) {
    // Original extracted query
    const query = `SELECT ${config.titleCol} AS title${descSelect}
         FROM "${schema}".${config.table}
        WHERE ${config.idCol} = $1
        LIMIT 1`;
    return safeQuery(query, args);
  }

  static async query159(schema: string, args: unknown[]) {
    // Original extracted query
    const query = `SELECT metadata FROM "${schema}".local_knowledge_ingestions WHERE id = $1`;
    return safeQuery(query, args);
  }

  static async query160(schema: string, args: unknown[]) {
    // Original extracted query
    const query = `SELECT * FROM "${schema}".local_knowledge_published
       WHERE tenant_id = $1
         AND status IN ('approved', 'published')
         AND to_tsvector('english', COALESCE(searchable_text, '')) @@ to_tsquery('english', $2)
       ORDER BY ts_rank(to_tsvector('english', COALESCE(searchable_text, '')), to_tsquery('english', $2)) DESC
       LIMIT $3`;
    return safeQuery(query, args);
  }

  static async query161(schema: string, args: unknown[]) {
    // Original extracted query
    const query = query;
    return safeQuery(query, args);
  }

  static async query162(schema: string, args: unknown[]) {
    // Original extracted query
    const query = countQuery;
    return safeQuery(query, args);
  }

  static async query163(schema: string, args: unknown[]) {
    // Original extracted query
    const query = `SELECT * FROM "${schema}".local_knowledge_published WHERE published_id = $1 AND tenant_id = $2`;
    return safeQuery(query, args);
  }

  static async query164(schema: string, args: unknown[]) {
    // Original extracted query
    const query = `UPDATE "${schema}".local_knowledge_published
       SET status = 'published', approved_by = $1, approved_at = NOW(), published_at = NOW(), updated_at = NOW()
       WHERE published_id = $2 AND tenant_id = $3
       RETURNING *`;
    return safeQuery(query, args);
  }

  static async query165(schema: string, args: unknown[]) {
    // Original extracted query
    const query = `INSERT INTO "${schema}".local_knowledge_published
         (published_id, tenant_id, workspace_id, source_document_id, source_ingestion_id,
          knowledge_type, title, content, summary, tags, modules, frameworks, controls,
          org_units, approved_by, approved_at, status, searchable_text, created_at, updated_at)
       VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, NOW(), NOW())
       RETURNING *`;
    return safeQuery(query, args);
  }

  static async query166(schema: string, args: unknown[]) {
    // Original extracted query
    const query = `UPDATE "${schema}".local_knowledge_published
       SET title = $1, content = $2, summary = $3, tags = $4, modules = $5,
           frameworks = $6, controls = $7, org_units = $8, status = $9,
           searchable_text = $10, updated_at = NOW()
       WHERE published_id = $11 AND tenant_id = $12
       RETURNING *`;
    return safeQuery(query, args);
  }

  static async query167(schema: string, args: unknown[]) {
    // Original extracted query
    const query = `SELECT published_id FROM "${schema}".local_knowledge_published
     WHERE tenant_id = $1 AND source_document_id = $2 AND knowledge_type = $3
     LIMIT 1`;
    return safeQuery(query, args);
  }

  static async query168(schema: string, args: unknown[]) {
    // Original extracted query
    const query = `UPDATE "${schema}".local_knowledge_documents
                 SET deleted_at = NOW(), updated_at = NOW()
                 WHERE document_id = $1 AND tenant_id = $2`;
    return safeQuery(query, args);
  }

  static async query169(schema: string, args: unknown[]) {
    // Original extracted query
    const query = `UPDATE "${schema}".local_knowledge_documents
               SET status = 'archived', updated_at = NOW()
               WHERE document_id = $1 AND tenant_id = $2`;
    return safeQuery(query, args);
  }

  static async query170(schema: string, args: unknown[]) {
    // Original extracted query
    const query = `SELECT document_id, retention_rule, legal_hold, updated_at
       FROM "${schema}".local_knowledge_documents
       WHERE tenant_id = $1
         AND retention_rule IS NOT NULL
         AND deleted_at IS NULL
         AND status = 'active'`;
    return safeQuery(query, args);
  }

  static async query171(schema: string, args: unknown[]) {
    // Original extracted query
    const query = `UPDATE "${schema}".local_knowledge_documents
       SET retention_rule = $1, updated_at = NOW()
       WHERE document_id = $2 AND tenant_id = $3`;
    return safeQuery(query, args);
  }

  static async query172(schema: string, args: unknown[]) {
    // Original extracted query
    const query = `SELECT document_id FROM "${schema}".local_knowledge_documents
       WHERE document_id = $1 AND tenant_id = $2 AND deleted_at IS NULL`;
    return safeQuery(query, args);
  }

  static async query173(schema: string, args: unknown[]) {
    // Original extracted query
    const query = `SELECT DISTINCT source_type
       FROM "${schema}".local_knowledge_sources
       WHERE tenant_id = $1 AND status = 'active'`;
    return safeQuery(query, args);
  }

  static async query174(schema: string, args: unknown[]) {
    // Original extracted query
    const query = `SELECT retention_rule FROM "${schema}".local_knowledge_documents
       WHERE document_id = $1 AND tenant_id = $2`;
    return safeQuery(query, args);
  }

  static async query175(schema: string, args: unknown[]) {
    // Original extracted query
    const query = `DELETE FROM "${schema}".local_knowledge_documents
           WHERE document_id = $1 AND tenant_id = $2`;
    return safeQuery(query, args);
  }

  static async query176(schema: string, args: unknown[]) {
    // Original extracted query
    const query = `SELECT legal_hold FROM "${schema}".local_knowledge_documents
           WHERE document_id = $1 AND tenant_id = $2`;
    return safeQuery(query, args);
  }

  static async query177(schema: string, args: unknown[]) {
    // Original extracted query
    const query = `SELECT d.document_id, d.ingestion_id
       FROM "${schema}".local_knowledge_documents d
       INNER JOIN "${schema}".local_knowledge_ingestion_log i ON i.ingestion_id = d.ingestion_id
       INNER JOIN "${schema}".local_knowledge_sources s ON s.source_id = i.source_id
       WHERE d.tenant_id = $1
         AND s.source_type = $2
         AND d.status = 'archived'
         AND d.updated_at < $3
         AND (d.legal_hold IS NULL OR d.legal_hold = FALSE)`;
    return safeQuery(query, args);
  }

  static async query178(schema: string, args: unknown[]) {
    // Original extracted query
    const query = `UPDATE "${schema}".local_knowledge_documents
             SET status = 'archived', updated_at = NOW()
             WHERE document_id = $1 AND version = $2 AND tenant_id = $3`;
    return safeQuery(query, args);
  }

  static async query179(schema: string, args: unknown[]) {
    // Original extracted query
    const query = `SELECT d.document_id, d.ingestion_id, d.version, d.created_at
       FROM "${schema}".local_knowledge_documents d
       INNER JOIN "${schema}".local_knowledge_ingestion_log i ON i.ingestion_id = d.ingestion_id
       INNER JOIN "${schema}".local_knowledge_sources s ON s.source_id = i.source_id
       WHERE d.tenant_id = $1
         AND s.source_type = $2
         AND d.status = 'active'
         AND d.created_at < $3
       ORDER BY d.document_id, d.version DESC`;
    return safeQuery(query, args);
  }

  static async query180(schema: string, args: unknown[]) {
    // Original extracted query
    const query = `SELECT 1 FROM "${schema}".local_knowledge_sources WHERE source_id = $1 LIMIT 1`;
    return safeQuery(query, args);
  }

  static async query181(schema: string, args: unknown[]) {
    // Original extracted query
    const query = `SELECT * FROM "${schema}".local_knowledge_sources WHERE source_id = $1 AND tenant_id = $2 LIMIT 1`;
    return safeQuery(query, args);
  }

  static async query182(schema: string, args: unknown[]) {
    // Original extracted query
    const query = `SELECT sync_id, source_id, status, started_at, completed_at,
            documents_added, documents_updated, documents_failed,
            errors, triggered_by
       FROM "${schema}".local_knowledge_source_sync_history
      WHERE tenant_id = $1 AND source_id = $2
      ORDER BY started_at DESC
      LIMIT $3`;
    return safeQuery(query, args);
  }

  static async query183(schema: string, args: unknown[]) {
    // Original extracted query
    const query = `UPDATE "${schema}".local_knowledge_sources
        SET health_status = $1, last_health_check = NOW(), updated_at = NOW()
      WHERE source_id = $2 AND tenant_id = $3`;
    return safeQuery(query, args);
  }

  static async query184(schema: string, args: unknown[]) {
    // Original extracted query
    const query = `SELECT source_id, health_status, last_health_check, health_check_error,
            consecutive_failures, last_sync_at, last_sync_status
       FROM "${schema}".local_knowledge_sources
      WHERE source_id = $1 AND tenant_id = $2`;
    return safeQuery(query, args);
  }

  static async query185(schema: string, args: unknown[]) {
    // Original extracted query
    const query = `UPDATE "${schema}".local_knowledge_sources
          SET last_sync_status = 'failed', last_sync_error = $1,
              consecutive_failures = consecutive_failures + 1,
              updated_at = NOW()
        WHERE source_id = $2 AND tenant_id = $3`;
    return safeQuery(query, args);
  }

  static async query186(schema: string, args: unknown[]) {
    // Original extracted query
    const query = `UPDATE "${schema}".local_knowledge_source_sync_history
          SET status = 'failed', completed_at = NOW(),
              errors = $1::jsonb
        WHERE sync_id = $2 AND tenant_id = $3`;
    return safeQuery(query, args);
  }

  static async query187(schema: string, args: unknown[]) {
    // Original extracted query
    const query = `UPDATE "${schema}".local_knowledge_sources
          SET last_sync_at = NOW(), last_sync_status = 'completed',
              last_sync_error = NULL, consecutive_failures = 0,
              updated_at = NOW()
        WHERE source_id = $1 AND tenant_id = $2`;
    return safeQuery(query, args);
  }

  static async query188(schema: string, args: unknown[]) {
    // Original extracted query
    const query = `UPDATE "${schema}".local_knowledge_source_sync_history
          SET status = 'completed', completed_at = NOW(),
              documents_added = $1, documents_updated = $2
        WHERE sync_id = $3 AND tenant_id = $4`;
    return safeQuery(query, args);
  }

  static async query189(schema: string, args: unknown[]) {
    // Original extracted query
    const query = statsQuery;
    return safeQuery(query, args);
  }

  static async query190(schema: string, args: unknown[]) {
    // Original extracted query
    const query = `SELECT last_sync_at FROM "${schema}".local_knowledge_sources
        WHERE source_id = $1 AND tenant_id = $2`;
    return safeQuery(query, args);
  }

  static async query191(schema: string, args: unknown[]) {
    // Original extracted query
    const query = `INSERT INTO "${schema}".local_knowledge_source_sync_history
      (tenant_id, source_id, status, triggered_by)
     VALUES ($1, $2, 'running', $3)
     RETURNING sync_id`;
    return safeQuery(query, args);
  }

  static async query192(schema: string, args: unknown[]) {
    // Original extracted query
    const query = `UPDATE "${schema}".local_knowledge_sources
          SET status = 'disabled', updated_at = NOW()
        WHERE source_id = $1 AND tenant_id = $2`;
    return safeQuery(query, args);
  }

  static async query193(schema: string, args: unknown[]) {
    // Original extracted query
    const query = `UPDATE "${schema}".local_knowledge_sources
          SET ${setClauses.join(', ')}
        WHERE source_id = $${paramIdx++} AND tenant_id = $${paramIdx}
        RETURNING *`;
    return safeQuery(query, args);
  }

  static async query194(schema: string, args: unknown[]) {
    // Original extracted query
    const query = `INSERT INTO "${schema}".local_knowledge_sources
        (tenant_id, workspace_id, source_name, source_type, source_config,
         scope_type, scope_value, trust_level, schedule_config, adapter_class,
         status, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'active', $11)
       RETURNING *`;
    return safeQuery(query, args);
  }

  static async query195(schema: string, args: unknown[]) {
    // Original extracted query
    const query = `SELECT s.*,
            COALESCE(doc_stats.doc_count, 0)::int AS document_count
       FROM "${schema}".local_knowledge_sources s
       LEFT JOIN LATERAL (
         SELECT COUNT(DISTINCT il.ingestion_id)::int AS doc_count
           FROM "${schema}".local_knowledge_ingestion_log il
          WHERE il.source_id = s.source_id AND il.success = TRUE
       ) doc_stats ON TRUE
      WHERE ${whereClause}
      ORDER BY s.created_at DESC
      LIMIT $${paramIdx} OFFSET $${paramIdx + 1}`;
    return safeQuery(query, args);
  }

  static async query196(schema: string, args: unknown[]) {
    // Original extracted query
    const query = `SELECT COUNT(*)::int AS total
       FROM "${schema}".local_knowledge_sources s
      WHERE ${whereClause}`;
    return safeQuery(query, args);
  }

  static async query197(schema: string, args: unknown[]) {
    // Original extracted query
    const query = `INSERT INTO "${schema}".local_knowledge_storage_quota
         (tenant_id, storage_quota_bytes, storage_used_bytes, last_calculated_at, created_at, updated_at)
       VALUES ($1, $2, 0, NOW(), NOW(), NOW())
       ON CONFLICT (tenant_id) DO UPDATE SET
         storage_quota_bytes = $2,
         updated_at = NOW()`;
    return safeQuery(query, args);
  }

  static async query198(schema: string, args: unknown[]) {
    // Original extracted query
    const query = `UPDATE "${schema}".local_knowledge_storage_quota
       SET storage_used_bytes = $1,
           last_calculated_at = NOW(),
           alert_threshold_80 = $2,
           alert_threshold_90 = $3,
           alert_threshold_100 = $4,
           updated_at = NOW()
       WHERE tenant_id = $5`;
    return safeQuery(query, args);
  }

  static async query199(schema: string, args: unknown[]) {
    // Original extracted query
    const query = `SELECT COALESCE(SUM(file_size_bytes), 0) as total_bytes
       FROM "${schema}".file_storage
       WHERE tenant_id = $1
         AND entity_type = 'local_knowledge'
         AND deleted_at IS NULL`;
    return safeQuery(query, args);
  }

  static async query200(schema: string, args: unknown[]) {
    // Original extracted query
    const query = `INSERT INTO "${schema}".local_knowledge_storage_quota
           (tenant_id, storage_quota_bytes, storage_used_bytes, last_calculated_at, created_at, updated_at)
         VALUES ($1, $2, 0, NOW(), NOW(), NOW())
         RETURNING *`;
    return safeQuery(query, args);
  }

  static async query201(schema: string, args: unknown[]) {
    // Original extracted query
    const query = `SELECT quota_id, tenant_id, storage_quota_bytes, storage_used_bytes, last_calculated_at,
              alert_threshold_80, alert_threshold_90, alert_threshold_100, created_at, updated_at
       FROM "${schema}".local_knowledge_storage_quota
       WHERE tenant_id = $1`;
    return safeQuery(query, args);
  }

  static async query202(schema: string, args: unknown[]) {
    // Original extracted query
    const query = `SELECT COUNT(*)::int AS cnt
         FROM "${schema}".local_knowledge_index i
         WHERE i.tenant_id = $1
           AND i.knowledge_item_type = 'document'
           AND NOT EXISTS (
             SELECT 1 FROM "${schema}".local_knowledge_documents d
             WHERE d.document_id = i.knowledge_item_id
           )`;
    return safeQuery(query, args);
  }

  static async query203(schema: string, args: unknown[]) {
    // Original extracted query
    const query = `SELECT COUNT(*)::int AS cnt
         FROM "${schema}".local_knowledge_documents d
         WHERE d.tenant_id = $1
           AND d.status = 'active'
           AND d.deleted_at IS NULL
           AND NOT EXISTS (
             SELECT 1 FROM "${schema}".local_knowledge_chunks c
             WHERE c.document_id = d.document_id
           )`;
    return safeQuery(query, args);
  }

  static async query204(schema: string, args: unknown[]) {
    // Original extracted query
    const query = `SELECT
         (
           SELECT COUNT(*)::int
           FROM "${schema}".local_knowledge_chunks c
           WHERE c.tenant_id = $1
             AND NOT EXISTS (
               SELECT 1 FROM "${schema}".local_knowledge_documents d
               WHERE d.document_id = c.document_id
             )
         ) AS orphaned_chunks,
         (
           SELECT COUNT(*)::int
           FROM "${schema}".local_knowledge_chunks c
           WHERE c.tenant_id = $1
             AND c.embedding IS NOT NULL
             AND c.created_at < NOW() - INTERVAL '7 days'
             AND NOT EXISTS (
               SELECT 1 FROM "${schema}".local_knowledge_index i
               WHERE i.knowledge_item_id = c.chunk_id
                 AND i.knowledge_item_type = 'chunk'
                 AND i.indexed_at > c.created_at
             )
         ) AS stale_embeddings`;
    return safeQuery(query, args);
  }

  static async query205(schema: string, args: unknown[]) {
    // Original extracted query
    const query = `SELECT
         COUNT(*)::int                                                       AS total,
         COUNT(*) FILTER (WHERE LENGTH(TRIM(chunk_text)) = 0)::int           AS empty,
         COUNT(*) FILTER (WHERE LENGTH(chunk_text) > $3)::int                AS oversized,
         COUNT(*) FILTER (WHERE LENGTH(chunk_text) < $4)::int                AS undersized,
         COUNT(*) FILTER (WHERE embedding IS NULL)::int                      AS no_vectors,
         MAX(chunk_index)::int                                               AS max_index,
         MIN(chunk_index)::int                                               AS min_index
       FROM "${schema}".local_knowledge_chunks
       WHERE tenant_id = $1
         AND document_id = $2`;
    return safeQuery(query, args);
  }

  static async query206(schema: string, args: unknown[]) {
    // Original extracted query
    const query = `SELECT COUNT(*)::int AS cnt
         FROM "${schema}".local_knowledge_ingestion_log
         WHERE tenant_id = $1
           AND checksum = $2
           AND ingestion_id != (
             SELECT ingestion_id FROM "${schema}".local_knowledge_documents
             WHERE document_id = $3
           )`;
    return safeQuery(query, args);
  }

  static async query207(schema: string, args: unknown[]) {
    // Original extracted query
    const query = `SELECT d.document_id, d.title, d.document_type, d.canonical_data,
              d.searchable_text, d.status, d.created_at,
              i.raw_content_storage_path, i.parser_used,
              i.checksum,
              LENGTH(d.searchable_text) AS content_length
       FROM "${schema}".local_knowledge_documents d
       LEFT JOIN "${schema}".local_knowledge_ingestion_log i
         ON i.ingestion_id = d.ingestion_id
       WHERE d.document_id = $1
         AND d.tenant_id = $2`;
    return safeQuery(query, args);
  }

}
