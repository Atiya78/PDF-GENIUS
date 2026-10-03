---
name: Resend email readiness
description: Generic reset responses hide email failures; sender verification and the hosting-specific transport matter.
---

Password reset's generic success response does not prove that the code was emailed. Missing or invalid Resend configuration can leave a stored reset code that the user never receives.

**Why:** the endpoint must never reveal whether an email is registered, so it cannot surface email-delivery failure to the client.

**How to apply:** if a user reports "I never got my reset code," check the active Resend connection or direct-key configuration and delivery logs first. Do not infer delivery from HTTP success or response timing. Preserve the external-host direct-key path when changing Replit connector support; see the Railway storage/email topic.

## Verified-domain sender (required)
Use the verified PDF Genius sender domain, not an arbitrary connector-configured sender.

**Why:** a previously configured free-mail sender was rejected by Resend. The shared Resend onboarding sender is restricted to account-owner testing and is not suitable for public signup/reset delivery.

**How to apply:** verify the approved domain when reconnecting Resend and keep the approved PDF Genius sender for real users.
