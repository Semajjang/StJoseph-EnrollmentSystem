/**
 * Shared audit-log types, mappers, and human-readable formatters used by both
 * the admin dashboard audit viewer and the standalone Activity Logs page.
 * Logic is ported from the original pages so summaries stay identical.
 */

export interface ActivityLog {
  id: string;
  actorName: string;
  actorRole: string;
  action: string;
  entityType: string;
  entityId: string;
  details: Record<string, unknown>;
  createdAt: string;
}

export interface ActivityLogRow {
  id: string;
  actor_name: string | null;
  actor_role: string | null;
  action: string;
  entity_type: string;
  entity_id: string;
  details: Record<string, unknown> | null;
  created_at: string;
}

export type AuditEntityFilter =
  | 'all'
  | 'enrollment'
  | 'site_content'
  | 'contact_message'
  | 'staff_access';

export const auditFilterOptions: Array<{ value: AuditEntityFilter; label: string }> = [
  { value: 'all', label: 'All activity' },
  { value: 'enrollment', label: 'Enrollment' },
  { value: 'site_content', label: 'Site content' },
  { value: 'contact_message', label: 'Contact messages' },
  { value: 'staff_access', label: 'Staff access' },
];

export const ACTIVITY_LOG_COLUMNS =
  'id, actor_name, actor_role, action, entity_type, entity_id, details, created_at';

export const mapActivityLog = (row: ActivityLogRow): ActivityLog => ({
  id: row.id,
  actorName: row.actor_name || 'Unknown user',
  actorRole: row.actor_role || 'unknown',
  action: row.action,
  entityType: row.entity_type,
  entityId: row.entity_id,
  details: row.details || {},
  createdAt: row.created_at,
});

const titleCase = (value: string) =>
  value
    .split('_')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');

export const formatActivityAction = titleCase;
export const formatActivityEntity = titleCase;

export const formatDateTime = (value: string) => {
  if (!value) {
    return 'Not available';
  }
  return new Date(value).toLocaleString();
};

/** Rich, human-readable summary of a single audit entry. */
export const formatActivityDetails = (log: ActivityLog): string => {
  const details = log.details || {};
  const getText = (key: string) => {
    const value = details[key];
    return typeof value === 'string' ? value : '';
  };

  if (log.entityType === 'enrollment') {
    const childName =
      `${getText('child_first_name')} ${getText('child_last_name')}`.trim() || 'Student';
    const program = getText('program');
    const oldStatus = getText('old_status');
    const newStatus = getText('new_status');
    const oldSection = getText('old_section') || 'Unassigned';
    const newSection = getText('new_section') || 'Unassigned';
    const statusChanged = oldStatus && newStatus && oldStatus !== newStatus;
    const sectionChanged = oldSection !== newSection;
    const programSuffix = program ? ` (${program})` : '';

    if (statusChanged && sectionChanged) {
      return `Changed ${childName}${programSuffix}'s status from ${oldStatus} to ${newStatus}, and section from ${oldSection} to ${newSection}.`;
    }
    if (statusChanged) {
      return `Changed ${childName}${programSuffix}'s status from ${oldStatus} to ${newStatus}.`;
    }
    if (sectionChanged) {
      return `Changed ${childName}${programSuffix}'s section from ${oldSection} to ${newSection}.`;
    }
    return `Updated ${childName}${programSuffix} enrollment details.`;
  }

  if (log.entityType === 'site_content') {
    const key = getText('key');
    const countRaw = details.count;
    const count = typeof countRaw === 'number' ? countRaw : null;

    if (log.action === 'edit_homepage_hero_content') {
      return 'Edited hero content.';
    }
    if (log.action === 'edit_homepage_highlight_cards') {
      return 'Edited highlight cards.';
    }
    if (log.action === 'edit_homepage_portal_sections') {
      return 'Edited portal sections.';
    }
    if (log.action === 'edit_homepage_announcements') {
      return 'Edited announcements.';
    }
    if (log.action === 'add_homepage_announcement') {
      return count && count > 1 ? `Added ${count} announcements.` : 'Added an announcement.';
    }
    if (log.action === 'delete_homepage_announcement') {
      return count && count > 1 ? `Deleted ${count} announcements.` : 'Deleted an announcement.';
    }
    if (log.action === 'edit_contact_page_details') {
      return 'Edited public contact details.';
    }
    if (key === 'homepage') {
      return 'Updated homepage content.';
    }
    if (key === 'contact-page') {
      return 'Updated contact page content.';
    }
    return key ? `Updated site content for '${key}'.` : 'Updated site content.';
  }

  if (log.entityType === 'contact_message') {
    const subject = getText('subject');
    const oldStatus = getText('old_status');
    const newStatus = getText('new_status');
    const replyCountRaw = details.reply_count;
    const replyCount = typeof replyCountRaw === 'number' ? replyCountRaw : null;

    if (oldStatus && newStatus && oldStatus !== newStatus) {
      return `${subject ? `Changed '${subject}' ` : 'Changed contact thread '}status from ${oldStatus} to ${newStatus}${
        replyCount !== null ? ` (replies: ${replyCount})` : ''
      }.`;
    }
    if (replyCount !== null) {
      return `${subject ? `Updated '${subject}' thread` : 'Updated contact thread'} with ${replyCount} repl${
        replyCount === 1 ? 'y' : 'ies'
      }.`;
    }
    return subject ? `Updated '${subject}' contact thread.` : 'Updated contact thread.';
  }

  if (log.entityType === 'staff_access') {
    const openedBy = getText('opened_by') || log.actorName;
    const teacherId = getText('teacher_id');
    const accountName = getText('account_name');
    return `Verified staff access for ${openedBy}${teacherId ? ` using teacher ID ${teacherId}` : ''}${
      accountName ? ` on account ${accountName}` : ''
    }.`;
  }

  return JSON.stringify(details, null, 0);
};
