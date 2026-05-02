/**
 * Regulatory Calendar Service
 * Priority 15: Regulatory Calendar with Auto-Deadlines
 * 
 * Manages regulatory deadlines (assessment dates, renewal deadlines, filing dates)
 * and automatically creates process_tasks 30/14/7 days before each deadline
 * with escalating priority as the deadline approaches.
 */

import { safeQuery, tenantSchema } from '../../ports/database.port';
import { createProcessTask, type ProcessTaskInput } from '../../ports/lifecycle.port';
import { toErrorMessage } from '@dos/module-sdk';
import type { GenericRow } from '@dos/types';

// ── Types ────────────────────────────────────────────────────────────────────

export interface RegulatoryCalendarEntry {
  calendar_id: string;
  tenant_id: string;
  framework_id: string;
  deadline_type: 'assessment' | 'renewal' | 'filing' | 'review' | 'audit' | 'reporting' | 'other';
  deadline_date: string; // ISO date string
  title_en: string;
  title_ar?: string;
  description_en?: string;
  description_ar?: string;
  regulator_name?: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  recurring: boolean;
  recurrence_pattern?: string;
  owner_role?: string;
  metadata?: Record<string, unknown>;
}

export interface CalendarDeadlineTask {
  calendar_id: string;
  deadline_date: string;
  title_en: string;
  title_ar?: string;
  days_until_deadline: number;
  priority: 'critical' | 'high' | 'medium' | 'low';
  task_id?: string;
}

// ── Seeding Functions ────────────────────────────────────────────────────────

/**
 * Seed regulatory calendar entries from framework metadata during workspace provisioning.
 * Extracts deadline information from frameworks.target_date, framework metadata,
 * and obligation review_frequency fields.
 */
export async function seedRegulatoryCalendarFromFrameworks(
  tenantId: string,
  frameworkIds?: string[]
): Promise<{ seeded: number; errors: string[] }> {
  const schema = tenantSchema(tenantId);
  const errors: string[] = [];
  let seeded = 0;

  try {
    // Query frameworks for deadline metadata
    let frameworksQuery = `
      SELECT framework_id, name, description, target_date, category
      FROM "${schema}".frameworks
      WHERE deleted_at IS NULL
    `;
    const params: unknown[] = [];
    
    if (frameworkIds && frameworkIds.length > 0) {
      frameworksQuery += ` AND framework_id = ANY($1)`;
      params.push(frameworkIds);
    }

    const frameworksResult = await safeQuery(frameworksQuery, params);

    for (const fw of frameworksResult.rows) {
      try {
        // Extract deadlines from framework.target_date (if set)
        if (fw.target_date) {
          const deadlineDate = new Date(fw.target_date);
          if (deadlineDate >= new Date()) {
            await insertCalendarEntry(tenantId, {
              framework_id: fw.framework_id,
              deadline_type: 'assessment',
              deadline_date: deadlineDate.toISOString().split('T')[0],
              title_en: `Assessment deadline: ${fw.name}`,
              title_ar: `موعد تقييم: ${fw.name}`,
              description_en: `Annual assessment deadline for ${fw.name}`,
              description_ar: `موعد التقييم السنوي لـ ${fw.name}`,
              priority: 'high',
              recurring: true,
              recurrence_pattern: 'annual',
              owner_role: 'compliance_manager',
            });
            seeded++;
          }
        }

        // Check for obligations with review_frequency (annual assessments)
        try {
          const obligationsResult = await safeQuery(
            `SELECT obligation_id, framework_id, requirement_ref, title_en, review_frequency
             FROM "${schema}".compliance_obligations
             WHERE framework_id = $1 AND review_frequency IS NOT NULL AND deleted_at IS NULL
             LIMIT 10`,
            [fw.framework_id]
          );

          for (const obl of obligationsResult.rows) {
            if (obl.review_frequency === 'annual' || obl.review_frequency === 'quarterly') {
              // Calculate next review date (assume 1 year from now for annual, 3 months for quarterly)
              const nextReview = new Date();
              if (obl.review_frequency === 'annual') {
                nextReview.setFullYear(nextReview.getFullYear() + 1);
              } else if (obl.review_frequency === 'quarterly') {
                nextReview.setMonth(nextReview.getMonth() + 3);
              }

              await insertCalendarEntry(tenantId, {
                framework_id: fw.framework_id,
                deadline_type: 'review',
                deadline_date: nextReview.toISOString().split('T')[0],
                title_en: `Review: ${obl.title_en || obl.requirement_ref}`,
                title_ar: `مراجعة: ${obl.title_en || obl.requirement_ref}`,
                description_en: `${obl.review_frequency} review for ${obl.requirement_ref}`,
                description_ar: `مراجعة ${obl.review_frequency} لـ ${obl.requirement_ref}`,
                priority: 'medium',
                recurring: true,
                recurrence_pattern: obl.review_frequency,
                owner_role: 'control_owner',
                metadata: { obligation_id: obl.obligation_id, requirement_ref: obl.requirement_ref },
              });
              seeded++;
            }
          }
        } catch (_oblErr) {
          // Obligations table may not exist yet — skip silently
        }
      } catch (fwErr) {
        errors.push(`Framework ${fw.framework_id}: ${toErrorMessage(fwErr)}`);
      }
    }
  } catch (err) {
    errors.push(`Seed failed: ${toErrorMessage(err)}`);
  }

  return { seeded, errors };
}

/**
 * Insert a single calendar entry (helper function).
 */
async function insertCalendarEntry(
  tenantId: string,
  entry: Omit<RegulatoryCalendarEntry, 'calendar_id' | 'tenant_id' | 'created_at' | 'updated_at'>
): Promise<void> {
  const schema = tenantSchema(tenantId);
  await safeQuery(
    `INSERT INTO "${schema}".regulatory_calendar
     (tenant_id, framework_id, deadline_type, deadline_date, title_en, title_ar, description_en, description_ar,
      regulator_name, priority, recurring, recurrence_pattern, owner_role, metadata, created_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, 'system')
     ON CONFLICT DO NOTHING`,
    [
      tenantId,
      entry.framework_id,
      entry.deadline_type,
      entry.deadline_date,
      entry.title_en,
      entry.title_ar || null,
      entry.description_en || null,
      entry.description_ar || null,
      entry.regulator_name || null,
      entry.priority,
      entry.recurring,
      entry.recurrence_pattern || null,
      entry.owner_role || null,
      JSON.stringify(entry.metadata || {}),
    ]
  );
}

// ── Deadline Monitoring & Task Creation ─────────────────────────────────────

/**
 * Check for upcoming regulatory deadlines and create process_tasks
 * at 30/14/7 days before each deadline, with escalating priority.
 * 
 * Priority escalation:
 * - 30 days before: 'medium'
 * - 14 days before: 'high'
 * - 7 days before: 'critical'
 */
export async function monitorRegulatoryDeadlines(tenantId: string): Promise<{
  tasksCreated: number;
  errors: string[];
}> {
  const schema = tenantSchema(tenantId);
  const errors: string[] = [];
  let tasksCreated = 0;

  try {
    const today = new Date();
    const reminders = [
      { daysBefore: 30, priority: 'medium' as const },
      { daysBefore: 14, priority: 'high' as const },
      { daysBefore: 7, priority: 'critical' as const },
    ];

    for (const reminder of reminders) {
      const targetDate = new Date(today);
      targetDate.setDate(targetDate.getDate() + reminder.daysBefore);
      const targetDateStr = targetDate.toISOString().split('T')[0];

      // Find deadlines that are exactly N days away and haven't had a task created for this reminder
      const deadlinesResult = await safeQuery(
        `SELECT c.calendar_id, c.deadline_date, c.title_en, c.title_ar, c.description_en,
                c.framework_id, c.owner_role, c.priority as base_priority, c.regulator_name
         FROM "${schema}".regulatory_calendar c
         LEFT JOIN "${schema}".regulatory_calendar_task_links l
           ON l.calendar_id = c.calendar_id AND l.reminder_days_before = $1
         WHERE c.deadline_date = $2
           AND c.deleted_at IS NULL
           AND l.link_id IS NULL
         ORDER BY c.deadline_date ASC`,
        [reminder.daysBefore, targetDateStr]
      );

      for (const deadline of deadlinesResult.rows) {
        try {
          // Use escalated priority (higher than base priority)
          const taskPriority = reminder.priority;

          const taskTitle = `${deadline.title_en} — ${reminder.daysBefore} days remaining`;
          const taskDescription = deadline.description_en
            ? `${deadline.description_en}\n\nDeadline: ${deadline.deadline_date}\nDays remaining: ${reminder.daysBefore}`
            : `Regulatory deadline approaching: ${deadline.title_en}\nDeadline: ${deadline.deadline_date}\nDays remaining: ${reminder.daysBefore}`;

          const taskInput: ProcessTaskInput = {
            title: taskTitle,

            description: taskDescription,
            taskType: 'audit_response', // Appropriate task type for regulatory deadlines
            priority: taskPriority,
            entityType: 'framework',
            entityId: deadline.framework_id,
            dueInHours: reminder.daysBefore * 24, // Due date is the deadline itself
            triggerSource: 'regulatory-calendar',
            triggerData: {
              calendar_id: deadline.calendar_id,
              deadline_date: deadline.deadline_date,
              reminder_days_before: reminder.daysBefore,
              regulator_name: deadline.regulator_name,
            },
            assigneeRole: deadline.owner_role || 'compliance_manager',
          };

          const task = await createProcessTask(tenantId, taskInput);

          // Record the task link to prevent duplicates
          await safeQuery(
            `INSERT INTO "${schema}".regulatory_calendar_task_links
             (calendar_id, task_id, reminder_days_before)
             VALUES ($1, $2, $3)
             ON CONFLICT (calendar_id, reminder_days_before, task_id) DO NOTHING`,
            [deadline.calendar_id, task.taskId, reminder.daysBefore]
          );

          tasksCreated++;
        } catch (taskErr) {
          errors.push(`Deadline ${deadline.calendar_id} (${reminder.daysBefore}d): ${toErrorMessage(taskErr)}`);
        }
      }
    }

    // Handle recurring deadlines: if a deadline has passed and is recurring, create next occurrence
    await handleRecurringDeadlines(tenantId);
  } catch (err) {
    errors.push(`Monitor failed: ${toErrorMessage(err)}`);
  }

  return { tasksCreated, errors };
}

/**
 * Handle recurring deadlines: create next occurrence after current deadline passes.
 */
async function handleRecurringDeadlines(tenantId: string): Promise<void> {
  const schema = tenantSchema(tenantId);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  try {
    // Find recurring deadlines that have passed
    const passedDeadlines = await safeQuery(
      `SELECT calendar_id, deadline_date, recurrence_pattern, framework_id,
              deadline_type, title_en, title_ar, description_en, description_ar,
              regulator_name, priority, owner_role, metadata
       FROM "${schema}".regulatory_calendar
       WHERE recurring = TRUE
         AND deadline_date < $1
         AND deleted_at IS NULL
       ORDER BY deadline_date DESC
       LIMIT 50`,
      [today.toISOString().split('T')[0]]
    );

    for (const deadline of passedDeadlines.rows) {
      try {
        const nextDate = new Date(deadline.deadline_date);
        
        if (deadline.recurrence_pattern === 'annual') {
          nextDate.setFullYear(nextDate.getFullYear() + 1);
        } else if (deadline.recurrence_pattern === 'quarterly') {
          nextDate.setMonth(nextDate.getMonth() + 3);
        } else if (deadline.recurrence_pattern === 'monthly') {
          nextDate.setMonth(nextDate.getMonth() + 1);
        } else {
          // Default to annual
          nextDate.setFullYear(nextDate.getFullYear() + 1);
        }

        // Check if next occurrence already exists
        const existing = await safeQuery(
          `SELECT calendar_id FROM "${schema}".regulatory_calendar
           WHERE framework_id = $1
             AND deadline_type = $2
             AND deadline_date = $3
             AND deleted_at IS NULL
           LIMIT 1`,
          [deadline.framework_id, deadline.deadline_type, nextDate.toISOString().split('T')[0]]
        );

        if (existing.rows.length === 0) {
          // Create next occurrence
          await insertCalendarEntry(tenantId, {
            framework_id: deadline.framework_id,
            deadline_type: deadline.deadline_type,
            deadline_date: nextDate.toISOString().split('T')[0],
            title_en: deadline.title_en,
            title_ar: deadline.title_ar,
            description_en: deadline.description_en,
            description_ar: deadline.description_ar,
            regulator_name: deadline.regulator_name,
            priority: deadline.priority,
            recurring: true,
            recurrence_pattern: deadline.recurrence_pattern,
            owner_role: deadline.owner_role,
            metadata: deadline.metadata || {},
          });
        }
      } catch (_recurErr) {
        // Skip individual errors
      }
    }
  } catch (_err) {
    // Non-fatal
  }
}

// ── Query Functions ──────────────────────────────────────────────────────────

/**
 * Get upcoming regulatory deadlines for a tenant.
 */
export async function getUpcomingDeadlines(
  tenantId: string,
  daysAhead: number = 90
): Promise<CalendarDeadlineTask[]> {
  const schema = tenantSchema(tenantId);
  const endDate = new Date();
  endDate.setDate(endDate.getDate() + daysAhead);

  const result = await safeQuery(
    `SELECT c.calendar_id, c.deadline_date, c.title_en, c.title_ar,
            c.priority, c.framework_id, c.regulator_name
     FROM "${schema}".regulatory_calendar c
     WHERE c.deadline_date >= CURRENT_DATE
       AND c.deadline_date <= $1
       AND c.deleted_at IS NULL
     ORDER BY c.deadline_date ASC`,
    [endDate.toISOString().split('T')[0]]
  );

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return result.rows.map((row: GenericRow) => {
    const deadlineDate = new Date(row.deadline_date);
    const daysUntil = Math.ceil((deadlineDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    return {
      calendar_id: row.calendar_id,
      deadline_date: row.deadline_date,
      title_en: row.title_en,
      title_ar: row.title_ar,
      days_until_deadline: daysUntil,
      priority: row.priority,
    };
  });
}

/**
 * Get all calendar entries for a framework.
 */
export async function getCalendarEntriesForFramework(
  tenantId: string,
  frameworkId: string
): Promise<RegulatoryCalendarEntry[]> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT calendar_id, tenant_id, framework_id, deadline_type, deadline_date,
            title_en, title_ar, description_en, description_ar, regulator_name,
            priority, recurring, recurrence_pattern, owner_role, metadata
     FROM "${schema}".regulatory_calendar
     WHERE framework_id = $1 AND deleted_at IS NULL
     ORDER BY deadline_date ASC`,
    [frameworkId]
  );

  return result.rows.map((row: GenericRow) => ({
    calendar_id: row.calendar_id,
    tenant_id: row.tenant_id,
    framework_id: row.framework_id,
    deadline_type: row.deadline_type,
    deadline_date: row.deadline_date,
    title_en: row.title_en,
    title_ar: row.title_ar,
    description_en: row.description_en,
    description_ar: row.description_ar,
    regulator_name: row.regulator_name,
    priority: row.priority,
    recurring: row.recurring,
    recurrence_pattern: row.recurrence_pattern,
    owner_role: row.owner_role,
    metadata: row.metadata || {},
  }));
}
