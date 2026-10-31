# Architecture rules
- Forum attachments use the private forum-media bucket and short-lived signed URLs; message rows store object paths, never public URLs.
- Forum media recording and composition live in dedicated components; validate MIME types and size before uploads and enforce ownership in storage policies.