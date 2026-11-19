# Legacy contact form (EmailJS)

The old website's Contact page had a five-field form (first name, last name,
email, phone, query) that sent submissions through EmailJS from the browser.
It is removed with the old SPA; the new site sends people to the Get a quote
form and to phone, email and WhatsApp links.

**Why this matters:** the PRD asks whether that form ever submitted
anywhere. If it did, past leads are sitting in whichever inbox the EmailJS
service was connected to.

## IDs

Taken from the public JavaScript bundle of the live site
(`docs/assets/index-*.js`), where they were visible to every visitor; nothing
was read from `.env`.

| Setting | Value |
| --- | --- |
| EmailJS service ID | `service_3ylh3cj` |
| EmailJS template ID | `template_90d9edo` |
| Public key | the `VITE_PUBLIC_KEY` entry in the owner's `.env` (not copied here) |

## What to check

1. Sign in at https://dashboard.emailjs.com with the account that created the
   form.
2. **Email Services** > `service_3ylh3cj`: note which email account it sends
   through and to which address the template delivers.
3. **Email Templates** > `template_90d9edo`: the "To email" field is the
   inbox that received every submission.
4. Search that inbox for the template's subject line and copy any unanswered
   enquiries into the pricing desk (`/desk/new`, channel "Email").
5. **Email History** in EmailJS shows recent sends (retention depends on the
   EmailJS plan).

When the inbox has been checked, the EmailJS service can be deleted.
