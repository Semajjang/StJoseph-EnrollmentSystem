import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';

interface ActivityLog {
  id: string;
  actorName: string;
  actorRole: string;
  action: string;
  entityType: string;
  entityId: string;
  details: Record<string, unknown>;
  createdAt: string;
}

interface ActivityLogRow {
  id: string;
  actor_name: string | null;
  actor_role: string | null;
  action: string;
  entity_type: string;
  entity_id: string;
  details: Record<string, unknown> | null;
  created_at: string;
}

interface ActivityRealtimePayload {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE';
  new: ActivityLogRow | null;
  old: ActivityLogRow | null;
}

const formatActivityAction = (value: string) =>
  value
    .split('_')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');

const formatActivityEntity = (value: string) =>
  value
    .split('_')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');

const mapActivityLog = (row: ActivityLogRow): ActivityLog => ({
  id: row.id,
  actorName: row.actor_name || 'Unknown User',
  actorRole: row.actor_role || 'unknown',
  action: row.action,
  entityType: row.entity_type,
  entityId: row.entity_id,
  details: row.details || {},
  createdAt: row.created_at
});

const formatDetails = (log: ActivityLog): string => {
  const details = log.details || {};
  const getText = (key: string) => {
    const value = details[key];
    return typeof value === 'string' ? value : '';
  };

  if (log.entityType === 'enrollment') {
    const childFirstName = getText('child_first_name');
    const childLastName = getText('child_last_name');
    const childName = `${childFirstName} ${childLastName}`.trim() || 'Student';
    const program = getText('program');
    const oldStatus = getText('old_status');
    const newStatus = getText('new_status');
    const oldSection = getText('old_section') || 'Unassigned';
    const newSection = getText('new_section') || 'Unassigned';
    const statusChanged = oldStatus && newStatus && oldStatus !== newStatus;
    const sectionChanged = oldSection !== newSection;

    if (statusChanged && sectionChanged) {
      return `Changed ${childName}${program ? ` (${program})` : ''}'s status from ${oldStatus} to ${newStatus}, and section from ${oldSection} to ${newSection}.`;
    }

    if (statusChanged) {
      return `Changed ${childName}${program ? ` (${program})` : ''}'s status from ${oldStatus} to ${newStatus}.`;
    }

    if (sectionChanged) {
      return `Changed ${childName}${program ? ` (${program})` : ''}'s section from ${oldSection} to ${newSection}.`;
    }

    return `Updated ${childName}${program ? ` (${program})` : ''} enrollment details.`;
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
      return `${subject ? `Changed '${subject}' ` : 'Changed contact thread '}status from ${oldStatus} to ${newStatus}${replyCount !== null ? ` (replies: ${replyCount})` : ''}.`;
    }

    if (replyCount !== null) {
      return `${subject ? `Updated '${subject}' thread` : 'Updated contact thread'} with ${replyCount} repl${replyCount === 1 ? 'y' : 'ies'}.`;
    }

    return subject ? `Updated '${subject}' contact thread.` : 'Updated contact thread.';
  }

  return JSON.stringify(details, null, 0);
};

export function ActivityLogsPage() {
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [activityFilter, setActivityFilter] = useState<'all' | 'enrollment' | 'site_content' | 'contact_message'>('all');
  const [isLoadingActivities, setIsLoadingActivities] = useState(false);
  const [activityError, setActivityError] = useState('');

  const filteredActivityLogs = useMemo(() => {
    if (activityFilter === 'all') {
      return activityLogs;
    }

    return activityLogs.filter((log) => log.entityType === activityFilter);
  }, [activityFilter, activityLogs]);

  const activitySummary = useMemo(() => {
    return {
      total: activityLogs.length,
      enrollment: activityLogs.filter((log) => log.entityType === 'enrollment').length,
      siteContent: activityLogs.filter((log) => log.entityType === 'site_content').length,
      contact: activityLogs.filter((log) => log.entityType === 'contact_message').length
    };
  }, [activityLogs]);

  const loadActivityLogs = useCallback(async (showLoader = true) => {
    if (showLoader) {
      setIsLoadingActivities(true);
    }
    setActivityError('');

    const { data, error } = await supabase
      .from('activity_logs')
      .select('id, actor_name, actor_role, action, entity_type, entity_id, details, created_at')
      .order('created_at', { ascending: false })
      .limit(100);

    if (showLoader) {
      setIsLoadingActivities(false);
    }

    if (error || !data) {
      setActivityError(error?.message || 'Unable to load activity logs.');
      return;
    }

    setActivityLogs((data as ActivityLogRow[]).map(mapActivityLog));
  }, []);

  useEffect(() => {
    void loadActivityLogs();
  }, [loadActivityLogs]);

  useEffect(() => {
    const activityChannel = supabase
      .channel('activity-logs-live')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'activity_logs'
        },
        (payload) => {
          const eventPayload = payload as unknown as ActivityRealtimePayload;

          setActivityLogs((previousLogs) => {
            if (eventPayload.eventType === 'INSERT' && eventPayload.new) {
              const nextLog = mapActivityLog(eventPayload.new);
              const withoutDuplicate = previousLogs.filter((log) => log.id !== nextLog.id);

              return [nextLog, ...withoutDuplicate]
                .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())
                .slice(0, 100);
            }

            if (eventPayload.eventType === 'UPDATE' && eventPayload.new) {
              const nextLog = mapActivityLog(eventPayload.new);

              return previousLogs
                .map((log) => (log.id === nextLog.id ? nextLog : log))
                .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())
                .slice(0, 100);
            }

            if (eventPayload.eventType === 'DELETE' && eventPayload.old) {
              return previousLogs.filter((log) => log.id !== eventPayload.old?.id);
            }

            return previousLogs;
          });
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(activityChannel);
    };
  }, []);

  return (
    <div className="h-screen overflow-hidden p-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-sky-600">
            Audit Trail
          </p>
          <h1 className="text-3xl font-extrabold text-gray-800">Activity Logs</h1>
          <p className="mt-1 text-gray-500">
            Staff and admin changes for enrollment actions, homepage content, and contact management.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={activityFilter}
            onChange={(event) =>
              setActivityFilter(
                event.target.value as 'all' | 'enrollment' | 'site_content' | 'contact_message'
              )
            }
            className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 outline-none focus:border-sky-300"
          >
            <option value="all">All Activity</option>
            <option value="enrollment">Enrollment</option>
            <option value="site_content">Site Content</option>
            <option value="contact_message">Contact Messages</option>
          </select>
        </div>
      </div>

      <section className="flex h-[calc(100vh-190px)] min-h-0 flex-col rounded-2xl border border-gray-100 bg-white shadow-md overflow-hidden">
        <div className="grid grid-cols-1 gap-3 border-b border-gray-100 bg-[#F8FAFC] px-6 py-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-xl border border-blue-100 bg-white px-4 py-3">
            <p className="text-[11px] font-bold uppercase tracking-wide text-blue-600">Total Events</p>
            <p className="mt-1 text-2xl font-extrabold text-gray-800">{activitySummary.total}</p>
          </div>
          <div className="rounded-xl border border-yellow-100 bg-white px-4 py-3">
            <p className="text-[11px] font-bold uppercase tracking-wide text-yellow-700">Enrollment</p>
            <p className="mt-1 text-2xl font-extrabold text-gray-800">{activitySummary.enrollment}</p>
          </div>
          <div className="rounded-xl border border-sky-100 bg-white px-4 py-3">
            <p className="text-[11px] font-bold uppercase tracking-wide text-sky-700">Site Content</p>
            <p className="mt-1 text-2xl font-extrabold text-gray-800">{activitySummary.siteContent}</p>
          </div>
          <div className="rounded-xl border border-purple-100 bg-white px-4 py-3">
            <p className="text-[11px] font-bold uppercase tracking-wide text-purple-700">Contact Messages</p>
            <p className="mt-1 text-2xl font-extrabold text-gray-800">{activitySummary.contact}</p>
          </div>
        </div>

        {activityError ?
          <div className="border-b border-red-100 bg-red-50 px-6 py-3 text-sm font-semibold text-red-700">
            {activityError}
          </div> :
          null}

        <div className="min-h-0 flex-1 overflow-auto">
          <table className="w-full min-w-[820px]">
            <thead className="sticky top-0 z-10 bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-500">Time</th>
                <th className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-500">Staff/Admin</th>
                <th className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-500">Action</th>
                <th className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-500">Entity</th>
                <th className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-500">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoadingActivities ?
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center text-sm font-medium text-gray-500">
                    Loading activity logs...
                  </td>
                </tr> :
                filteredActivityLogs.length === 0 ?
                  <tr>
                    <td colSpan={5} className="px-6 py-10 text-center text-sm font-medium text-gray-500">
                      No activity logs found for the selected filter.
                    </td>
                  </tr> :
                  filteredActivityLogs.map((log, index) => (
                    <tr key={log.id} className={index % 2 === 0 ? 'bg-white' : 'bg-[#FFFBEB]'}>
                      <td className="px-6 py-3 text-sm text-gray-600 whitespace-nowrap">
                        {new Date(log.createdAt).toLocaleString()}
                      </td>
                      <td className="px-6 py-3 text-sm text-gray-700 whitespace-nowrap">
                        <span className="font-bold text-gray-800">{log.actorName}</span>
                        <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-600">
                          {log.actorRole}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-sm font-semibold text-gray-700 whitespace-nowrap">
                        {formatActivityAction(log.action)}
                      </td>
                      <td className="px-6 py-3 text-sm text-gray-700 whitespace-nowrap">
                        <span className="font-semibold">{formatActivityEntity(log.entityType)}</span>
                        <span className="ml-2 text-xs text-gray-400">#{log.entityId.slice(0, 8)}</span>
                      </td>
                      <td className="px-6 py-3 text-xs text-gray-600">
                        <p className="whitespace-pre-wrap break-words text-[12px] leading-5 text-gray-700">
                          {formatDetails(log)}
                        </p>
                      </td>
                    </tr>
                  ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
