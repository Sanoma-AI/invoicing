Feature: The company a demo opens on
  Dana's business bills four clients. Three invoices have gone out: one paid, one sent, one past
  its due date and reminded. Ada Ortiz's invoice for $180.00 is a draft, ready to send, and two
  jobs are not on an invoice yet.

  Scenario: Dana's Pet Care
    Given data.clients "Ada Ortiz" has
      | email   | ada@example.com          |
      | address | 14 Elm St, Springfield   |
    And data.clients "Marcus Lee" has
      | email | marcus@example.com |
    And data.clients "Priya Nair" has
      | email | priya@example.com |
    And data.clients "Jonah Weiss" has
      | email | jonah@example.com |
    And data.jobs "job-1" has
      | client      | Ada Ortiz         |
      | description | Service visit     |
      | quantity    | 5                 |
      | unit        | visit             |
      | rate        | 25                |
      | doneOn      | 2026-11-07        |
      | invoice     | INV-0042          |
    And data.jobs "job-2" has
      | client      | Ada Ortiz          |
      | description | Additional service |
      | quantity    | 5                  |
      | unit        | visit              |
      | rate        | 8                  |
      | doneOn      | 2026-11-07         |
      | invoice     | INV-0042           |
    And data.jobs "job-3" has
      | client      | Ada Ortiz         |
      | description | Weekend surcharge |
      | quantity    | 1                 |
      | unit        | charge            |
      | rate        | 15                |
      | doneOn      | 2026-11-08        |
      | invoice     | INV-0042          |
    And data.jobs "job-4" has
      | client      | Ada Ortiz     |
      | description | Service visit |
      | quantity    | 2             |
      | unit        | visit         |
      | rate        | 25            |
      | doneOn      | 2026-11-10    |
    And data.jobs "job-5" has
      | client      | Marcus Lee    |
      | description | Service visit |
      | quantity    | 3             |
      | unit        | visit         |
      | rate        | 30            |
      | doneOn      | 2026-11-09    |
    And data.invoicing.sequence "invoice" has
      | next | 43 |
    And data.invoicing.invoices "INV-0039" has
      | number    | INV-0039                                                                           |
      | client    | Marcus Lee                                                                         |
      | status    | paid                                                                               |
      | currency  | USD                                                                                |
      | lines     | [{"description":"Service visit","quantity":"4","unit":"visit","unitPrice":"30.00"}] |
      | from      | Dana's Pet Care                                                                    |
      | fromEmail | dana@example.com                                                                   |
      | issuedOn  | 2026-10-12                                                                         |
      | dueOn     | 2026-10-26                                                                         |
      | paidOn    | 2026-10-20                                                                         |
    And data.invoicing.invoices "INV-0040" has
      | number    | INV-0040                                                                           |
      | client    | Priya Nair                                                                         |
      | status    | sent                                                                               |
      | currency  | USD                                                                                |
      | lines     | [{"description":"Service visit","quantity":"2","unit":"visit","unitPrice":"42.50"}] |
      | from      | Dana's Pet Care                                                                    |
      | fromEmail | dana@example.com                                                                   |
      | issuedOn  | 2026-11-06                                                                         |
      | dueOn     | 2026-11-20                                                                         |
    And data.invoicing.invoices "INV-0041" has
      | number     | INV-0041                                                                           |
      | client     | Jonah Weiss                                                                        |
      | status     | sent                                                                               |
      | currency   | USD                                                                                |
      | lines      | [{"description":"Service visit","quantity":"8","unit":"visit","unitPrice":"30.00"}] |
      | from       | Dana's Pet Care                                                                    |
      | fromEmail  | dana@example.com                                                                   |
      | issuedOn   | 2026-10-06                                                                         |
      | dueOn      | 2026-10-20                                                                         |
      | remindedOn | 2026-10-13                                                                         |
    And data.invoicing.invoices "INV-0042" has
      | number    | INV-0042                                                                                                                                                                                                                          |
      | client    | Ada Ortiz                                                                                                                                                                                                                         |
      | status    | draft                                                                                                                                                                                                                             |
      | currency  | USD                                                                                                                                                                                                                               |
      | lines     | [{"description":"Service visit","quantity":"5","unit":"visit","unitPrice":"25.00"},{"description":"Additional service","quantity":"5","unit":"visit","unitPrice":"8.00"},{"description":"Weekend surcharge","quantity":"1","unit":"charge","unitPrice":"15.00"}] |
      | from      | Dana's Pet Care                                                                                                                                                                                                                   |
      | fromEmail | dana@example.com                                                                                                                                                                                                                  |
