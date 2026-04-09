-- 0001_init
-- Bootstrap migration for local MVP. Generated manually to match Prisma schema.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TYPE "CalendarProvider" AS ENUM ('GOOGLE', 'OUTLOOK');
CREATE TYPE "ConnectionStatus" AS ENUM ('ACTIVE', 'REVOKED', 'ERROR', 'PENDING');
CREATE TYPE "SmartEventType" AS ENUM ('TASK', 'HABIT', 'FOCUS', 'MEETING', 'BUFFER', 'LINK_HOLD', 'PTO');
CREATE TYPE "SmartEventPriority" AS ENUM ('P1', 'P2', 'P3', 'P4');
CREATE TYPE "SmartEventStatus" AS ENUM ('DRAFT', 'SCHEDULED', 'IN_PROGRESS', 'DONE', 'CANCELLED', 'MISSED');
CREATE TYPE "Flexibility" AS ENUM ('FLEXIBLE', 'SEMI_FLEXIBLE', 'FIXED');
CREATE TYPE "LockState" AS ENUM ('FREE', 'BUSY', 'SOFT_LOCKED', 'HARD_LOCKED');
CREATE TYPE "EventSource" AS ENUM ('INTERNAL', 'GOOGLE', 'OUTLOOK');
CREATE TYPE "EnergyProfile" AS ENUM ('LOW', 'MEDIUM', 'HIGH');
CREATE TYPE "SchedulingDecisionType" AS ENUM ('KEEP', 'MOVE', 'SPLIT', 'UNSCHEDULE', 'LOCK_UPGRADE', 'LOCK_DOWNGRADE');
CREATE TYPE "RescheduleTriggerType" AS ENUM ('MANUAL', 'CALENDAR_SYNC', 'USER_CHANGE', 'POLICY_CHANGE', 'WEBHOOK', 'SYSTEM');
CREATE TYPE "RescheduleJobStatus" AS ENUM ('QUEUED', 'RUNNING', 'SUCCEEDED', 'FAILED', 'PARTIAL');
CREATE TYPE "ConstraintKind" AS ENUM ('DEADLINE', 'WORK_HOUR', 'AVAILABILITY', 'BUFFER', 'LOCK', 'CONTEXT_SWITCH', 'STABILITY', 'CUSTOM');
CREATE TYPE "AvailabilityRuleType" AS ENUM ('AVAILABLE', 'UNAVAILABLE', 'NO_MEETING');
CREATE TYPE "WorkHourKind" AS ENUM ('WORK', 'PERSONAL', 'DEEP_WORK');
CREATE TYPE "AuditActorType" AS ENUM ('USER', 'SYSTEM', 'WORKER');

CREATE TABLE "User" (
  "id" TEXT PRIMARY KEY,
  "email" TEXT NOT NULL UNIQUE,
  "emailVerified" TIMESTAMP,
  "name" TEXT,
  "image" TEXT,
  "timezone" TEXT NOT NULL DEFAULT 'UTC',
  "locale" TEXT NOT NULL DEFAULT 'en-US',
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "deletedAt" TIMESTAMP
);

CREATE TABLE "Account" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "providerAccountId" TEXT NOT NULL,
  "refresh_token" TEXT,
  "access_token" TEXT,
  "expires_at" INTEGER,
  "token_type" TEXT,
  "scope" TEXT,
  "id_token" TEXT,
  "session_state" TEXT,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "deletedAt" TIMESTAMP,
  CONSTRAINT "Account_user_fk" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE,
  CONSTRAINT "Account_provider_unique" UNIQUE ("provider", "providerAccountId")
);
CREATE INDEX "Account_user_idx" ON "Account"("userId");

CREATE TABLE "Session" (
  "id" TEXT PRIMARY KEY,
  "sessionToken" TEXT NOT NULL UNIQUE,
  "userId" TEXT NOT NULL,
  "expires" TIMESTAMP NOT NULL,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "deletedAt" TIMESTAMP,
  CONSTRAINT "Session_user_fk" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE
);
CREATE INDEX "Session_user_idx" ON "Session"("userId");

CREATE TABLE "VerificationToken" (
  "identifier" TEXT NOT NULL,
  "token" TEXT NOT NULL,
  "expires" TIMESTAMP NOT NULL,
  CONSTRAINT "VerificationToken_unique" UNIQUE ("identifier", "token")
);
CREATE INDEX "VerificationToken_expires_idx" ON "VerificationToken"("expires");

CREATE TABLE "CalendarConnection" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "provider" "CalendarProvider" NOT NULL,
  "status" "ConnectionStatus" NOT NULL DEFAULT 'PENDING',
  "accountEmail" TEXT,
  "scopes" TEXT[] NOT NULL DEFAULT '{}',
  "accessTokenEnc" TEXT,
  "refreshTokenEnc" TEXT,
  "tokenExpiresAt" TIMESTAMP,
  "syncCursor" TEXT,
  "lastSyncedAt" TIMESTAMP,
  "lastWebhookAt" TIMESTAMP,
  "lastError" TEXT,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "deletedAt" TIMESTAMP,
  CONSTRAINT "CalendarConnection_user_fk" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE,
  CONSTRAINT "CalendarConnection_unique" UNIQUE ("userId", "provider", "accountEmail")
);
CREATE INDEX "CalendarConnection_lookup_idx" ON "CalendarConnection"("userId", "provider", "status");

CREATE TABLE "ExternalCalendar" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "connectionId" TEXT NOT NULL,
  "providerCalendarId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "timezone" TEXT NOT NULL,
  "color" TEXT,
  "isPrimary" BOOLEAN NOT NULL DEFAULT false,
  "isReadOnly" BOOLEAN NOT NULL DEFAULT false,
  "isSelectedForSync" BOOLEAN NOT NULL DEFAULT true,
  "isSelectedForScheduling" BOOLEAN NOT NULL DEFAULT true,
  "syncToken" TEXT,
  "lastSyncedAt" TIMESTAMP,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "deletedAt" TIMESTAMP,
  CONSTRAINT "ExternalCalendar_user_fk" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE,
  CONSTRAINT "ExternalCalendar_connection_fk" FOREIGN KEY ("connectionId") REFERENCES "CalendarConnection"("id") ON DELETE CASCADE,
  CONSTRAINT "ExternalCalendar_unique" UNIQUE ("connectionId", "providerCalendarId")
);
CREATE INDEX "ExternalCalendar_sched_idx" ON "ExternalCalendar"("userId", "isSelectedForScheduling");

CREATE TABLE "SmartEvent" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "calendarId" TEXT,
  "parentEventId" TEXT,
  "type" "SmartEventType" NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "startAt" TIMESTAMP NOT NULL,
  "endAt" TIMESTAMP NOT NULL,
  "timezone" TEXT NOT NULL,
  "priority" "SmartEventPriority" NOT NULL DEFAULT 'P3',
  "status" "SmartEventStatus" NOT NULL DEFAULT 'SCHEDULED',
  "flexibility" "Flexibility" NOT NULL DEFAULT 'FLEXIBLE',
  "lockState" "LockState" NOT NULL DEFAULT 'FREE',
  "source" "EventSource" NOT NULL DEFAULT 'INTERNAL',
  "recurrenceRule" TEXT,
  "dueAt" TIMESTAMP,
  "energyProfile" "EnergyProfile",
  "isAllDay" BOOLEAN NOT NULL DEFAULT false,
  "metadata" JSONB,
  "softLockAt" TIMESTAMP,
  "hardLockAt" TIMESTAMP,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "deletedAt" TIMESTAMP,
  CONSTRAINT "SmartEvent_user_fk" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE,
  CONSTRAINT "SmartEvent_calendar_fk" FOREIGN KEY ("calendarId") REFERENCES "ExternalCalendar"("id") ON DELETE SET NULL,
  CONSTRAINT "SmartEvent_parent_fk" FOREIGN KEY ("parentEventId") REFERENCES "SmartEvent"("id") ON DELETE SET NULL
);
CREATE INDEX "SmartEvent_window_idx" ON "SmartEvent"("userId", "startAt", "endAt");
CREATE INDEX "SmartEvent_due_priority_idx" ON "SmartEvent"("userId", "dueAt", "priority");
CREATE INDEX "SmartEvent_lock_idx" ON "SmartEvent"("userId", "lockState", "startAt");
CREATE INDEX "SmartEvent_calendar_window_idx" ON "SmartEvent"("calendarId", "startAt", "endAt");
CREATE INDEX "SmartEvent_type_status_idx" ON "SmartEvent"("type", "status");

CREATE TABLE "ExternalEventMirror" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "externalCalendarId" TEXT NOT NULL,
  "smartEventId" TEXT NOT NULL UNIQUE,
  "externalEventId" TEXT NOT NULL,
  "etag" TEXT,
  "externalUpdatedAt" TIMESTAMP,
  "rawPayload" JSONB,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "deletedAt" TIMESTAMP,
  CONSTRAINT "ExternalEventMirror_user_fk" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE,
  CONSTRAINT "ExternalEventMirror_calendar_fk" FOREIGN KEY ("externalCalendarId") REFERENCES "ExternalCalendar"("id") ON DELETE CASCADE,
  CONSTRAINT "ExternalEventMirror_event_fk" FOREIGN KEY ("smartEventId") REFERENCES "SmartEvent"("id") ON DELETE CASCADE,
  CONSTRAINT "ExternalEventMirror_unique" UNIQUE ("externalCalendarId", "externalEventId")
);
CREATE INDEX "ExternalEventMirror_updated_idx" ON "ExternalEventMirror"("userId", "externalUpdatedAt");

CREATE TABLE "Task" (
  "id" TEXT PRIMARY KEY,
  "smartEventId" TEXT NOT NULL UNIQUE,
  "estimateMinutes" INTEGER NOT NULL,
  "remainingMinutes" INTEGER,
  "effortScore" INTEGER NOT NULL DEFAULT 1,
  "autoSchedule" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "deletedAt" TIMESTAMP,
  CONSTRAINT "Task_event_fk" FOREIGN KEY ("smartEventId") REFERENCES "SmartEvent"("id") ON DELETE CASCADE
);
CREATE INDEX "Task_estimate_idx" ON "Task"("estimateMinutes");

CREATE TABLE "Habit" (
  "id" TEXT PRIMARY KEY,
  "smartEventId" TEXT NOT NULL UNIQUE,
  "rrule" TEXT NOT NULL,
  "targetPerWeek" INTEGER,
  "minDurationMinutes" INTEGER NOT NULL,
  "maxDurationMinutes" INTEGER,
  "anchorPreference" TEXT,
  "lastExpandedAt" TIMESTAMP,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "deletedAt" TIMESTAMP,
  CONSTRAINT "Habit_event_fk" FOREIGN KEY ("smartEventId") REFERENCES "SmartEvent"("id") ON DELETE CASCADE
);
CREATE INDEX "Habit_expanded_idx" ON "Habit"("lastExpandedAt");

CREATE TABLE "FocusBlock" (
  "id" TEXT PRIMARY KEY,
  "smartEventId" TEXT NOT NULL UNIQUE,
  "minBlockMinutes" INTEGER NOT NULL DEFAULT 30,
  "maxBlockMinutes" INTEGER NOT NULL DEFAULT 120,
  "requiresDeepWork" BOOLEAN NOT NULL DEFAULT true,
  "contextTag" TEXT,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "deletedAt" TIMESTAMP,
  CONSTRAINT "FocusBlock_event_fk" FOREIGN KEY ("smartEventId") REFERENCES "SmartEvent"("id") ON DELETE CASCADE
);

CREATE TABLE "MeetingTemplate" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "smartEventId" TEXT UNIQUE,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "defaultDurationMinutes" INTEGER NOT NULL,
  "locationType" TEXT NOT NULL DEFAULT 'video',
  "conferenceProvider" TEXT,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "deletedAt" TIMESTAMP,
  CONSTRAINT "MeetingTemplate_user_fk" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE,
  CONSTRAINT "MeetingTemplate_event_fk" FOREIGN KEY ("smartEventId") REFERENCES "SmartEvent"("id") ON DELETE SET NULL
);
CREATE INDEX "MeetingTemplate_user_duration_idx" ON "MeetingTemplate"("userId", "defaultDurationMinutes");

CREATE TABLE "SchedulingLink" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "meetingTemplateId" TEXT NOT NULL,
  "slug" TEXT NOT NULL UNIQUE,
  "title" TEXT NOT NULL,
  "durationMinutes" INTEGER NOT NULL,
  "noticeMinutes" INTEGER NOT NULL DEFAULT 120,
  "minSchedulingHours" INTEGER NOT NULL DEFAULT 12,
  "maxSchedulingDays" INTEGER NOT NULL DEFAULT 30,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "metadata" JSONB,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "deletedAt" TIMESTAMP,
  CONSTRAINT "SchedulingLink_user_fk" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE,
  CONSTRAINT "SchedulingLink_template_fk" FOREIGN KEY ("meetingTemplateId") REFERENCES "MeetingTemplate"("id") ON DELETE CASCADE
);
CREATE INDEX "SchedulingLink_user_active_idx" ON "SchedulingLink"("userId", "isActive");

CREATE TABLE "BufferRule" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "appliesTo" "SmartEventType"[] NOT NULL DEFAULT '{}',
  "beforeMinutes" INTEGER NOT NULL DEFAULT 0,
  "afterMinutes" INTEGER NOT NULL DEFAULT 0,
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "priority" INTEGER NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "deletedAt" TIMESTAMP,
  CONSTRAINT "BufferRule_user_fk" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE
);
CREATE INDEX "BufferRule_user_enabled_idx" ON "BufferRule"("userId", "enabled", "priority");

CREATE TABLE "AvailabilityRule" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "dayOfWeek" INTEGER NOT NULL,
  "startTime" TEXT NOT NULL,
  "endTime" TEXT NOT NULL,
  "timezone" TEXT NOT NULL,
  "ruleType" "AvailabilityRuleType" NOT NULL,
  "priority" INTEGER NOT NULL DEFAULT 1,
  "effectiveFrom" TIMESTAMP,
  "effectiveTo" TIMESTAMP,
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "deletedAt" TIMESTAMP,
  CONSTRAINT "AvailabilityRule_user_fk" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE
);
CREATE INDEX "AvailabilityRule_lookup_idx" ON "AvailabilityRule"("userId", "dayOfWeek", "enabled", "priority");

CREATE TABLE "WorkHourRule" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "dayOfWeek" INTEGER NOT NULL,
  "startTime" TEXT NOT NULL,
  "endTime" TEXT NOT NULL,
  "timezone" TEXT NOT NULL,
  "kind" "WorkHourKind" NOT NULL DEFAULT 'WORK',
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "deletedAt" TIMESTAMP,
  CONSTRAINT "WorkHourRule_user_fk" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE
);
CREATE INDEX "WorkHourRule_lookup_idx" ON "WorkHourRule"("userId", "dayOfWeek", "kind", "enabled");

CREATE TABLE "TimePolicy" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL UNIQUE,
  "defaultTimezone" TEXT NOT NULL,
  "workdayStart" TEXT NOT NULL DEFAULT '09:00',
  "workdayEnd" TEXT NOT NULL DEFAULT '18:00',
  "maxMeetingsPerDay" INTEGER NOT NULL DEFAULT 6,
  "focusTargetMinutesPerDay" INTEGER NOT NULL DEFAULT 120,
  "softLockLeadHours" INTEGER NOT NULL DEFAULT 24,
  "hardLockLeadHours" INTEGER NOT NULL DEFAULT 4,
  "allowOvertime" BOOLEAN NOT NULL DEFAULT false,
  "noMeetingWeekdays" INTEGER[] NOT NULL DEFAULT '{}',
  "defaultBufferBeforeMinutes" INTEGER NOT NULL DEFAULT 5,
  "defaultBufferAfterMinutes" INTEGER NOT NULL DEFAULT 5,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "deletedAt" TIMESTAMP,
  CONSTRAINT "TimePolicy_user_fk" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE
);

CREATE TABLE "SchedulingConstraint" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "smartEventId" TEXT,
  "kind" "ConstraintKind" NOT NULL,
  "name" TEXT NOT NULL,
  "isHard" BOOLEAN NOT NULL DEFAULT false,
  "weight" DOUBLE PRECISION NOT NULL DEFAULT 1,
  "payload" JSONB NOT NULL,
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "deletedAt" TIMESTAMP,
  CONSTRAINT "SchedulingConstraint_user_fk" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE,
  CONSTRAINT "SchedulingConstraint_event_fk" FOREIGN KEY ("smartEventId") REFERENCES "SmartEvent"("id") ON DELETE CASCADE
);
CREATE INDEX "SchedulingConstraint_user_idx" ON "SchedulingConstraint"("userId", "enabled", "kind");
CREATE INDEX "SchedulingConstraint_event_idx" ON "SchedulingConstraint"("smartEventId", "enabled");

CREATE TABLE "RescheduleJob" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "triggerType" "RescheduleTriggerType" NOT NULL,
  "triggerRef" TEXT,
  "windowStart" TIMESTAMP NOT NULL,
  "windowEnd" TIMESTAMP NOT NULL,
  "status" "RescheduleJobStatus" NOT NULL DEFAULT 'QUEUED',
  "attempt" INTEGER NOT NULL DEFAULT 0,
  "requestedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "startedAt" TIMESTAMP,
  "finishedAt" TIMESTAMP,
  "errorMessage" TEXT,
  "inputDigest" TEXT,
  "stats" JSONB,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "deletedAt" TIMESTAMP,
  CONSTRAINT "RescheduleJob_user_fk" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE
);
CREATE INDEX "RescheduleJob_status_idx" ON "RescheduleJob"("userId", "status", "requestedAt");
CREATE INDEX "RescheduleJob_window_idx" ON "RescheduleJob"("windowStart", "windowEnd");

CREATE TABLE "SchedulingDecision" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "smartEventId" TEXT NOT NULL,
  "rescheduleJobId" TEXT,
  "decisionType" "SchedulingDecisionType" NOT NULL,
  "previousStartAt" TIMESTAMP,
  "previousEndAt" TIMESTAMP,
  "newStartAt" TIMESTAMP,
  "newEndAt" TIMESTAMP,
  "scoreDelta" DOUBLE PRECISION,
  "reason" JSONB NOT NULL,
  "reasonText" TEXT NOT NULL,
  "explainVersion" INTEGER NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT "SchedulingDecision_user_fk" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE,
  CONSTRAINT "SchedulingDecision_event_fk" FOREIGN KEY ("smartEventId") REFERENCES "SmartEvent"("id") ON DELETE CASCADE,
  CONSTRAINT "SchedulingDecision_job_fk" FOREIGN KEY ("rescheduleJobId") REFERENCES "RescheduleJob"("id") ON DELETE SET NULL
);
CREATE INDEX "SchedulingDecision_user_idx" ON "SchedulingDecision"("userId", "createdAt");
CREATE INDEX "SchedulingDecision_event_idx" ON "SchedulingDecision"("smartEventId", "createdAt");
CREATE INDEX "SchedulingDecision_job_idx" ON "SchedulingDecision"("rescheduleJobId");

CREATE TABLE "AnalyticsSnapshot" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "periodStart" TIMESTAMP NOT NULL,
  "periodEnd" TIMESTAMP NOT NULL,
  "timezone" TEXT NOT NULL,
  "focusMinutes" INTEGER NOT NULL DEFAULT 0,
  "meetingMinutes" INTEGER NOT NULL DEFAULT 0,
  "taskCompleted" INTEGER NOT NULL DEFAULT 0,
  "taskCreated" INTEGER NOT NULL DEFAULT 0,
  "overtimeMinutes" INTEGER NOT NULL DEFAULT 0,
  "utilization" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "payload" JSONB,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "deletedAt" TIMESTAMP,
  CONSTRAINT "AnalyticsSnapshot_user_fk" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE,
  CONSTRAINT "AnalyticsSnapshot_unique" UNIQUE ("userId", "periodStart", "periodEnd")
);
CREATE INDEX "AnalyticsSnapshot_user_period_idx" ON "AnalyticsSnapshot"("userId", "periodStart");

CREATE TABLE "AuditLog" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT,
  "actorType" "AuditActorType" NOT NULL,
  "actorId" TEXT,
  "action" TEXT NOT NULL,
  "entityType" TEXT NOT NULL,
  "entityId" TEXT NOT NULL,
  "before" JSONB,
  "after" JSONB,
  "ip" TEXT,
  "userAgent" TEXT,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT "AuditLog_user_fk" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL
);
CREATE INDEX "AuditLog_user_idx" ON "AuditLog"("userId", "createdAt");
CREATE INDEX "AuditLog_entity_idx" ON "AuditLog"("entityType", "entityId", "createdAt");
