# Implementation Plan: Hybrid Notification, Activation, and White-label Messaging

## 1. Objective

Build a tenant-aware activation and messaging system for Payqusta that supports:

- smart routing between `SMS` and `Email`
- automatic fallback from one channel to the other
- white-label sender identity per store
- centralized control for the system owner
- branded customer-facing activation pages with subtle `Powered by Payqusta`

This plan covers employees, customers, tenant admins, and the Payqusta system owner.

## 2. What Must Be True After Implementation

### For the customer

- If the customer enters `phone only`, the system sends `SMS OTP` or `SMS activation link` according to the flow.
- If the customer enters `email only`, the system sends an `Email activation link`.
- If the customer enters both, the UI asks which channel they prefer.
- If the preferred channel fails and the alternate channel is available and enabled, the system falls back automatically.
- The activation page uses the store branding and shows `Powered by Payqusta` in a clean footer.

### For the employee / cashier

- When creating a customer from `CustomersPage`, the form should no longer require a password.
- If the cashier enters a phone number, the UI should preselect `send via SMS`.
- If the cashier enters an email, the UI should preselect `send via Email`.
- If both are available, the employee can override the recommended channel before saving.
- If dispatch fails on the selected channel, fallback should happen automatically when possible.

### For internal employees added to the store

- When creating an employee from `AdminUsersPage` or tenant user management, the form should no longer require a password on create.
- The new employee should receive an invitation link through the selected routing channel.
- The employee record should clearly show invitation status: `pending`, `sent`, `delivered`, `failed`, `activated`, `expired`.
- Admins should be able to resend the invitation.

### For the tenant admin

- The store should have a dedicated settings area for `Notification Channels`.
- The store can configure its own `SMTP` and `SMS provider`.
- If the store does not configure one channel, Payqusta fallback defaults can be used if allowed by the platform owner.
- The visible sender identity should reflect the store brand as much as the channel supports.

### For the Payqusta system owner

- There must be a system-level control panel for enabling/disabling platform email and SMS.
- There must be platform defaults for `SMTP`, `SMS`, link domain, fallback policy, and `Powered by` behavior.
- The owner should be able to decide whether tenants may use:
  - platform email only
  - custom SMTP
  - platform SMS only
  - custom SMS gateway
  - mixed mode
- There should be visibility into delivery failures, fallback usage, quotas, and test sends.

## 3. Key Architecture Decisions

### 3.1 Use a routing/orchestration layer, not direct controller-to-channel calls

The current codebase already has channel-specific logic in services such as `WhatsAppService`.  
For SMS/Email activation we should not scatter decision logic across controllers.

We need a dedicated service layer such as:

- `NotificationRoutingService`
- `ActivationService`
- `SmsService`
- `ShortLinkService` or `ActivationLinkService`

This layer decides:

- primary channel
- alternate channel
- sender identity
- template
- whether fallback is allowed
- what to persist as delivery status

### 3.2 Reuse the current tenant-scoped settings pattern

The project already stores tenant-specific WhatsApp configuration inside [`backend/src/models/Tenant.js`](d:/New%20folder%20%283%29/payqusta/backend/src/models/Tenant.js) and exposes it through [`backend/src/controllers/settingsController.js`](d:/New%20folder%20%283%29/payqusta/backend/src/controllers/settingsController.js).

The new notification design should follow the same pattern instead of inventing a separate configuration style.

### 3.3 Separate activation delivery from marketing/operational messaging

Phase 1 should focus on:

- employee invitation
- customer activation
- resend invitation
- OTP / link selection
- fallback logic

It should not merge with WhatsApp reminders, invoice broadcasting, or supplier reminders in the first step.

## 4. Data Model Changes

### 4.1 [`backend/src/models/SystemConfig.js`](d:/New%20folder%20%283%29/payqusta/backend/src/models/SystemConfig.js)

Extend system config with platform-wide notification controls:

- `notifications.platformEmail`
  - `enabled`
  - `host`
  - `port`
  - `secure`
  - `user`
  - `pass`
  - `fromEmail`
  - `fromName`
- `notifications.platformSms`
  - `enabled`
  - `provider`
  - `baseUrl`
  - `apiKey`
  - `apiSecret`
  - `senderId`
  - `supportsCustomSenderId`
- `notifications.defaults`
  - `routingMode` = `smart | email_only | sms_only`
  - `fallbackEnabled`
  - `allowEmailFallbackToSms`
  - `allowSmsFallbackToEmail`
  - `activationLinkBaseUrl`
  - `shortLinkDomain`
  - `poweredByEnabled`
  - `poweredByUrl`
- `notifications.tenantPolicy`
  - `allowCustomSmtp`
  - `allowCustomSms`
  - `allowPlatformEmailFallback`
  - `allowPlatformSmsFallback`

### 4.2 [`backend/src/models/Tenant.js`](d:/New%20folder%20%283%29/payqusta/backend/src/models/Tenant.js)

Add tenant-scoped notification configuration:

- `notificationChannels.email`
  - `mode` = `platform_default | custom_smtp | disabled`
  - `enabled`
  - `host`
  - `port`
  - `secure`
  - `user`
  - `pass`
  - `fromEmail`
  - `fromName`
- `notificationChannels.sms`
  - `mode` = `platform_default | custom_provider | disabled`
  - `enabled`
  - `provider`
  - `baseUrl`
  - `apiKey`
  - `apiSecret`
  - `senderId`
- `notificationChannels.routing`
  - `mode` = `smart | email_only | sms_only`
  - `fallbackEnabled`
  - `preferSmsWhenPhoneExists`
  - `preferEmailWhenEmailExists`
- `notificationBranding`
  - `senderName`
  - `replyToEmail`
  - `supportPhone`
  - `supportEmail`
  - `showPoweredByFooter`

This should be aligned with the existing `branding` object, not replace it.

### 4.3 [`backend/src/models/User.js`](d:/New%20folder%20%283%29/payqusta/backend/src/models/User.js)

Current user creation requires a password.  
That conflicts with invitation-based onboarding.

Add:

- make password conditionally optional for pending invited users
- `invitation.status`
- `invitation.channel`
- `invitation.fallbackChannel`
- `invitation.tokenHash`
- `invitation.expiresAt`
- `invitation.sentAt`
- `invitation.activatedAt`
- `invitation.lastError`

Recommended statuses:

- `not_sent`
- `pending`
- `sent`
- `fallback_sent`
- `failed`
- `activated`
- `expired`

### 4.4 [`backend/src/models/Customer.js`](d:/New%20folder%20%283%29/payqusta/backend/src/models/Customer.js)

Customer currently stores a portal password directly on create flow.  
That should be replaced with activation state.

Add:

- `portalAccess.status`
- `portalAccess.channel`
- `portalAccess.fallbackChannel`
- `portalAccess.activationTokenHash`
- `portalAccess.activationExpiresAt`
- `portalAccess.activatedAt`
- `portalAccess.lastInviteAt`
- `portalAccess.lastDeliveryStatus`
- `portalAccess.lastDeliveryError`
- `portalAccess.otp`
  - `codeHash`
  - `expiresAt`
  - `attempts`
  - `lastSentAt`

### 4.5 New model: delivery audit

Add a lightweight log model such as:

- [`backend/src/models/NotificationDispatch.js`](d:/New%20folder%20%283%29/payqusta/backend/src/models/NotificationDispatch.js)

Purpose:

- track primary send attempt
- track fallback attempt
- store provider response id
- store masked destination
- support admin diagnostics without reading raw provider logs

This will materially help the system owner and tenant admins.

## 5. Service Layer Changes

### 5.1 [`backend/src/services/EmailService.js`](d:/New%20folder%20%283%29/payqusta/backend/src/services/EmailService.js)

Refactor the email service so it can build a transporter dynamically from:

1. tenant custom SMTP
2. platform default SMTP

Needed changes:

- remove single global transporter assumption
- add `buildTransportForTenant(tenant, systemConfig)`
- add `sendActivationEmail({ recipient, token, tenant, actorType })`
- add branded templates based on tenant logo/colors/name
- keep Payqusta footer subtle and configurable

### 5.2 New service: [`backend/src/services/SmsService.js`](d:/New%20folder%20%283%29/payqusta/backend/src/services/SmsService.js)

Start with provider abstraction, not provider lock-in.

Required interface:

- `isConfigured(config)`
- `sendOtp({ phone, code, tenant, context })`
- `sendActivationLink({ phone, url, tenant, context })`
- `sendTestMessage({ phone, tenant })`

Implementation detail:

- first provider can be a generic HTTP adapter
- provider-specific adapters can be added later without changing controller logic

### 5.3 New service: [`backend/src/services/NotificationRoutingService.js`](d:/New%20folder%20%283%29/payqusta/backend/src/services/NotificationRoutingService.js)

Responsibilities:

- evaluate available customer/user contact data
- evaluate tenant configuration
- evaluate platform defaults
- pick primary and fallback channels
- return a normalized routing decision

### 5.4 New service: [`backend/src/services/ActivationService.js`](d:/New%20folder%20%283%29/payqusta/backend/src/services/ActivationService.js)

Responsibilities:

- create invitation token / OTP
- hash and persist secrets
- generate activation URL
- call routing service
- send through primary channel
- fallback automatically when allowed
- update invitation status
- log dispatch results

## 6. Controller and Route Changes

### 6.1 Employee creation flows

Employee creation currently exists in both:

- [`backend/src/controllers/authController.js`](d:/New%20folder%20%283%29/payqusta/backend/src/controllers/authController.js)
- [`backend/src/controllers/adminController.js`](d:/New%20folder%20%283%29/payqusta/backend/src/controllers/adminController.js)

Both must be updated consistently.

Needed behavior:

- remove required password on create
- accept optional invitation preference:
  - `sendVia = sms | email | auto`
- create user in pending invitation state
- send invitation through activation service
- expose invitation status in API response

### 6.2 Customer creation flows

Customer creation currently happens in [`backend/src/controllers/customerController.js`](d:/New%20folder%20%283%29/payqusta/backend/src/controllers/customerController.js).

Needed behavior:

- remove password requirement on create
- if request is from staff UI:
  - infer recommended channel from entered fields
  - allow manual override
  - dispatch invitation after create
- if request is from online store:
  - `phone only` -> SMS OTP / SMS link
  - `email only` -> email link
  - `both` -> return a response telling the UI to ask for preferred channel

### 6.3 Public activation endpoints

Add endpoints for:

- `POST /auth/activate/request`
- `POST /auth/activate/channel-choice`
- `POST /auth/activate/verify-otp`
- `POST /auth/activate/complete`
- `POST /auth/invitations/:id/resend`

The exact route naming can vary, but these actions must exist.

### 6.4 Settings endpoints

Extend [`backend/src/controllers/settingsController.js`](d:/New%20folder%20%283%29/payqusta/backend/src/controllers/settingsController.js) with tenant-level endpoints:

- `PUT /settings/notification-channels`
- `POST /settings/notification-channels/test-email`
- `POST /settings/notification-channels/test-sms`
- `GET /settings/notification-channels/status`

### 6.5 System-owner endpoints

Extend super admin or system owner control with:

- platform SMTP settings
- platform SMS settings
- tenant policy toggles
- powered-by controls
- link domain and fallback policy

These should live behind:

- [`backend/src/routes/superAdminRoutes.js`](d:/New%20folder%20%283%29/payqusta/backend/src/routes/superAdminRoutes.js)
- [`backend/src/controllers/superAdminController.js`](d:/New%20folder%20%283%29/payqusta/backend/src/controllers/superAdminController.js)

## 7. Frontend Changes

### 7.1 Employee management

Update:

- [`frontend/src/pages/AdminUsersPage.jsx`](d:/New%20folder%20%283%29/payqusta/frontend/src/pages/AdminUsersPage.jsx)
- [`frontend/src/components/settings/SettingsUsers.jsx`](d:/New%20folder%20%283%29/payqusta/frontend/src/components/settings/SettingsUsers.jsx)

Changes:

- remove password as mandatory field for create
- add invitation delivery options
- show invitation status badge
- add `Resend invitation`
- show last sent channel and failure message when relevant

### 7.2 Customer management

Update:

- [`frontend/src/pages/CustomersPage.jsx`](d:/New%20folder%20%283%29/payqusta/frontend/src/pages/CustomersPage.jsx)

Changes:

- remove password and confirm password from create modal
- add delivery channel selectors:
  - `auto`
  - `sms`
  - `email`
- auto-select based on entered phone/email
- show portal activation status in details view
- add resend activation action

### 7.3 Settings navigation

Update:

- [`frontend/src/pages/SettingsPage.jsx`](d:/New%20folder%20%283%29/payqusta/frontend/src/pages/SettingsPage.jsx)

Add a tenant-admin tab such as:

- `Notification Channels`

Do not overload the current `WhatsApp` tab with SMS and Email activation responsibilities.

### 7.4 Tenant notification settings UI

Add a new component such as:

- [`frontend/src/components/settings/SettingsNotificationChannels.jsx`](d:/New%20folder%20%283%29/payqusta/frontend/src/components/settings/SettingsNotificationChannels.jsx)

Capabilities:

- configure custom SMTP
- configure custom SMS
- set sender display name
- enable/disable fallback
- send test email
- send test SMS
- preview branded activation email

### 7.5 System owner UI

Add a new page or settings section for platform controls, likely under super admin.

Recommended new component/page:

- [`frontend/src/pages/SuperAdminNotificationSettingsPage.jsx`](d:/New%20folder%20%283%29/payqusta/frontend/src/pages/SuperAdminNotificationSettingsPage.jsx)

Capabilities:

- platform SMTP
- platform SMS
- policy toggles
- default routing mode
- default fallback rules
- powered-by configuration
- short link domain

### 7.6 Public activation page

Add:

- [`frontend/src/pages/ActivateAccountPage.jsx`](d:/New%20folder%20%283%29/payqusta/frontend/src/pages/ActivateAccountPage.jsx)

Requirements:

- supports employee and customer activation
- store logo and colors
- clear channel-specific copy
- mobile-friendly
- subtle `Powered by Payqusta`

## 8. Routing and Fallback Matrix

### 8.1 Self-registration / public customer flow

- `phone only`
  - primary: SMS
  - fallback: none unless email exists later
- `email only`
  - primary: Email
  - fallback: none unless phone exists later
- `phone + email`
  - UI asks preferred channel
  - if selected channel fails, fallback to the other one automatically if enabled

### 8.2 Staff-created customer flow

- `phone only`
  - default selected channel = SMS
- `email only`
  - default selected channel = Email
- `phone + email`
  - default = tenant routing preference
  - staff can override
- if chosen channel is disabled/unconfigured but alternate exists
  - system auto-switches
- if both channels unavailable
  - customer is created as `pending activation / no dispatch`
  - UI must warn the staff member

### 8.3 Staff-created employee flow

- same routing logic as customer invitation
- no password at creation
- invitation expires and can be resent

### 8.4 Reverse fallback requirement

The user explicitly requested:

- if SMS is not enabled, use Email when possible
- if Email is not enabled, use SMS when possible

This must be implemented at the routing layer, not the UI layer.

## 9. Branding and White-label Rules

### Email

- sender email:
  - tenant SMTP sender if configured
  - otherwise Payqusta default sender
- sender display name:
  - store name first
  - never show raw technical account names to end users
- template:
  - tenant logo
  - tenant colors
  - store support details
  - small `Powered by Payqusta`

### SMS

- sender ID:
  - tenant sender ID if provider supports it
  - otherwise platform sender
- message body:
  - must stay short
  - should prioritize brand name and activation action
  - do not waste SMS length on long marketing copy

Recommended format:

`مرحبا بك في {StoreName}. لتفعيل حسابك افتح: {shortLink}`

### Activation page

- store branding first
- Payqusta attribution in footer only

## 10. Security and Reliability Requirements

- hash activation tokens and OTP codes before storing
- add expiration windows
- rate-limit resend and OTP verification
- mask secrets in API responses
- do not return raw SMTP or SMS secrets to normal clients after save
- store provider errors in audit-friendly form
- add audit log entries for:
  - invitation sent
  - fallback triggered
  - activation completed
  - resend requested

## 11. Compatibility Notes Against Current Codebase

The current plan needed correction in these areas:

- employee create flow is not only in `authController`; it is also in `adminController`
- current customer flow in [`frontend/src/pages/CustomersPage.jsx`](d:/New%20folder%20%283%29/payqusta/frontend/src/pages/CustomersPage.jsx) still requires password fields
- current employee flow in [`frontend/src/pages/AdminUsersPage.jsx`](d:/New%20folder%20%283%29/payqusta/frontend/src/pages/AdminUsersPage.jsx) still requires password fields
- current settings structure already has a tenant-level config pattern through `Tenant.whatsapp`; the new channels should follow that structure
- the current `SettingsWhiteLabel` page handles visual branding only; it is not enough for sender identity or channel configuration
- `SystemConfig` currently only handles payments; it must be expanded to support platform communication governance

## 12. Delivery Phases

### Phase 1: Backend foundation

- models
- routing service
- activation service
- email refactor
- SMS service
- dispatch logging

### Phase 2: Employee and customer invitation flows

- update admin/user creation
- update customer creation
- add resend endpoints
- add activation endpoints

### Phase 3: Tenant settings UI

- notification channels page
- testing tools
- branding-aware previews

### Phase 4: System owner controls

- platform communication settings
- tenant policy controls
- quota and diagnostics visibility

### Phase 5: Public activation UX

- activation page
- channel preference selection
- powered-by footer

## 13. Verification Checklist

### Backend verification

- create employee with `phone only` and confirm SMS route
- create employee with `email only` and confirm email route
- create employee with both and force primary failure to confirm fallback
- create customer from staff UI and confirm recommended channel selection is respected
- self-register customer with both channels and confirm channel-choice API flow
- confirm activation token and OTP expiry
- confirm delivery statuses are persisted correctly

### Frontend verification

- employee create form no longer requires password
- customer create form no longer requires password
- resend invitation buttons appear only for pending/failed users
- notification settings pages are visible to correct roles only
- activation page renders tenant branding correctly on mobile and desktop

### System owner verification

- disabling platform SMS forces email fallback where available
- disabling platform Email forces SMS fallback where available
- disabling both prevents send and surfaces a clear admin error
- platform defaults do not leak one tenant's credentials into another tenant

## 14. Recommended Implementation Order

1. Update models and add dispatch log
2. Build routing and activation services
3. Refactor `EmailService`
4. Add `SmsService`
5. Update employee creation APIs
6. Update customer creation APIs
7. Add activation endpoints
8. Update employee and customer UIs
9. Add tenant notification settings UI
10. Add system owner controls

## 15. Final Assessment

The previous plan was directionally correct, but it was incomplete for the actual Payqusta architecture.

The corrected implementation must explicitly cover:

- employee invitations
- customer invitations
- tenant white-label email and SMS
- system owner platform controls
- automatic bidirectional fallback
- delivery status tracking
- branded activation UX

With these changes, the plan is now aligned with the business model and with the real files and flow structure in this repository.
