# Forum media
- [x] Add private storage and message attachment fields.
- [x] Add photo/video selection, voice recording, previews and media playback.
- [x] Verify authenticated sending and playback, and small-screen layout.
# Forum usernames
- [x] Username field in profile, @name shown in forum, mention highlight and suggestions.

# Manual Mobile Money payments
- [x] Improve transfer submission and persisted request tracking.
- [x] Inspect live administrator policies and activation trigger; remove duplicate client-side activation.
- [x] Test authenticated declaration, reload and rejection readback; payment rules tests pass.
- [ ] Exercise approval through the admin page — requires an authorized admin session; current session is a non-admin member.

# Crypto payment repair
- [x] Reproduce checkout: redirect works but old pricing charged 17 USD / 10000 FCFA.
- [x] Repair pricing, invoice validation, visible errors and signed notification idempotency; deploy functions.
- [x] Verify authenticated invoice at 4.17 USD / 2500 FCFA, currency selector and seven passing payment tests.
- [ ] Verify settlement and subscription activation with a real crypto transaction — requires a funded payment; no money sent during checks.
