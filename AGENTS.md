# Architecture rules
- Forum attachments use the private forum-media bucket and short-lived signed URLs; message rows store object paths, never public URLs.
- Forum media recording and composition live in dedicated components; validate MIME types and size before uploads and enforce ownership in storage policies.
- Payment approval activates subscriptions through the database trigger only; the admin page must not independently overwrite subscription expiry or roles, to preserve renewals and atomic commission creation.