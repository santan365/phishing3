# Data Model

## Scenario Object (MVP — in-memory)
```
{
  id:            string,               // e.g. 'sms-001'
  channel_type:  'sms' | 'email',
  sender_name:   string,
  sender_contact: string,              // phone number or email address
  subject:       string | null,        // email only, null for SMS
  message_body:  string,
  display_link:  string | null,        // shown as inert text, not clickable
  correct_action: 'REPORT' | 'PROCEED',
  is_phishing:   boolean,
  difficulty:    1 | 2 | 3 | 4 | 5,
  created_at:    string,               // ISO date string
  cues:          Cue[]
}
```

## Cue Object (MVP — embedded in Scenario)
```
{
  cue_id:    string,                          // e.g. 'cue-001'
  cue_text:  string,                          // e.g. 'Urgency language used'
  cue_type:  'urgency' | 'link' | 'sender' | 'grammar' | 'request',
  severity:  'low' | 'med' | 'high'
}
```

## Session Object (MVP — in-memory)
```
{
  session_id:    string,
  started_at:    string,         // ISO date string
  ended_at:      string | null,
  total_score:   number,
  total_attempts: number,
  device:        string | null,
  app_version:   string,
  attempts:      Attempt[]
}
```

## Attempt Object (MVP — in-memory)
```
{
  attempt_id:       string,
  session_id:       string,              // FK → Session
  scenario_id:      string,             // FK → Scenario
  selected_action:  'REPORT' | 'PROCEED',
  is_correct:       boolean,
  answered_at:      string,             // ISO date string
  response_time_ms: number | null
}
```

---
Note: In the current MVP (v0.1), everything is stored in-memory and resets on
page refresh. The structure is kept aligned with the ERD (ERD_v2) so that adding
proper data persistence later — whether that ends up being SQLite, localStorage,
IndexedDB, or something else — should not require a major rewrite. The final
choice of storage hasn't been decided yet and may change depending on how the
project develops.
