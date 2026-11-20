# Plan

## Now
<!-- Overwritten at the end of every session. -->
- **Stage:** 4 of 5 · Build
- **Doing:** slices 1–8 are built: skeleton, expenses, balances, payments, polish, then correcting and deleting expenses and removing people
- **Unverified:** nothing runs against a hosted database yet; no browser-based end-to-end test (recorded under *Deferred*)
- **Next:** the owner tries correcting and deleting, then picks the next slice: sign-in with per-household access, or the Supabase adapter
- **Waiting on the owner:** a first run of `npm run dev`, and the GitHub/Supabase accounts when hosting is wanted

## Stages
1. **Plan:** product documents in `docs/product/`.
2. **Decide:** `docs/decisions.md`, with later choices under *Deferred*.
3. **Set up:** the first feature working end to end, with checks, CI and a staging pipeline.
4. **Build:** the slices below, one per session.
5. **Launch:** the launch parts, added below as slices.

## Slices

### 1 · Walking skeleton: groups list and a group page · risk: normal · status: done
- **Goal:** create a group and open it, with the data coming from the database through the data layer.
- **Acceptance:**
  - Creating a group with a name and currency saves it and opens its page.
  - An empty name shows a message next to the field and saves nothing.
  - The groups list shows the new group with its currency, and survives a restart.

### 2 · People and expenses · risk: normal · status: done
- **Goal:** add the people in a group and record expenses, split equally.
- **Acceptance:**
  - Adding a person shows them in the list and in the expense form.
  - Adding a duplicate name shows a message and adds nothing.
  - An expense stores one share per participant, and the shares add up to the amount to the cent.
  - A zero amount, or someone outside the group, is refused with a message next to the field.

### 3 · Balances and who pays whom · risk: normal · status: done
- **Goal:** see each person's balance and the fewest payments that clear the group.
- **Acceptance:**
  - Each member's balance is shown as a sentence with the group's currency.
  - The balances add up to zero on every group page, and the page says so.
  - The suggested payments clear every balance and number at most one fewer than the people with a non-zero balance.

### 4 · Record a payment · risk: normal · status: done
- **Goal:** mark money that already changed hands, so balances go back to zero.
- **Acceptance:**
  - A recorded payment changes both balances and appears in the payments list.
  - A payment to the same person is refused with a message.
  - After settling, the page says everyone is settled up.

### 5 · Empty states, not-found and checks · risk: normal · status: done
- **Goal:** the app guides the owner when a group or list is empty, and the checks run on every push.
- **Acceptance:**
  - An unknown group address returns 404 with a way back to the list.
  - Each empty block says what to do next.
  - `verify` passes: lint, types, tests and build. The smoke test passes against the built app.

### 6 · Correct an expense · risk: normal · status: done
- **Goal:** fix a wrong amount, description, payer, date or set of participants without deleting and re-entering.
- **Acceptance:**
  - Each expense row has an Edit link that opens the expense with every value filled in.
  - Saving replaces the shares, so the old shares never linger and the total still adds up.
  - An invalid correction shows the message next to the field and keeps the stored values.

### 7 · Delete an expense · risk: normal · status: done
- **Goal:** remove an expense entered by mistake.
- **Acceptance:**
  - Deletion asks for confirmation that names the expense; cancelling changes nothing.
  - After confirming, the expense, its shares and its effect on every balance are gone, and the group page says so.
  - Deleting an expense that is already gone still ends on the group page, without an error.

### 8 · Remove a person · risk: normal · status: done
- **Goal:** take out someone added by mistake, without breaking the arithmetic.
- **Acceptance:**
  - A person with no expenses and no payments is removed after a confirmation.
  - A person named in an expense or a payment is not removed; the app explains why in words and changes nothing.
  - No expense loses a share, and balances still add up to zero.
