Feature: Remind a client
  Seven days after an invoice is sent, the client is emailed again with its PDF unless it has been
  paid. invoice-send does it after its wait; invoice-remind does it on its own, at any time.

  Scenario: Seven days unpaid, the client is reminded
    Given dana is acting
    And data.clients "Ada Ortiz" has
      | email | ada@example.com |
    And data.invoicing.invoices "INV-0042" has
      | number    | INV-0042                                                                            |
      | client    | Ada Ortiz                                                                           |
      | status    | draft                                                                               |
      | currency  | USD                                                                                 |
      | lines     | [{"description":"Service visit","quantity":"5","unit":"visit","unitPrice":"25.00"}] |
      | from      | Dana Reyes                                                                          |
      | fromEmail | dana@example.com                                                                    |
    When invoicing.invoice-send runs with
      | id | INV-0042 |
    Then step "Wait 7 days" ran 1 time
    And step "Email the reminder" was called with
      """
      { "to": "ada@example.com", "subject": "Reminder: invoice INV-0042 from Dana Reyes" }
      """
    And step "Note the reminder" was called
    And the run succeeds

  Scenario: An unpaid invoice is reminded with its PDF
    Given dana is acting
    And data.clients "Ada Ortiz" has
      | email | ada@example.com |
    And data.invoicing.invoices "INV-0041" has
      | number    | INV-0041                                                                           |
      | client    | Ada Ortiz                                                                          |
      | status    | sent                                                                               |
      | currency  | USD                                                                                |
      | lines     | [{"description":"Service visit","quantity":"8","unit":"visit","unitPrice":"30"}] |
      | from      | Dana Reyes                                                                         |
      | fromEmail | dana@example.com                                                                   |
      | issuedOn  | 2026-10-06                                                                         |
      | dueOn     | 2026-10-20                                                                         |
    When invoicing.invoice-remind runs with
      | id | INV-0041 |
    Then a Resend email with "invoice-INV-0041.pdf" attached is sent
    And step "Email the reminder" was called with
      """
      { "to": "ada@example.com", "subject": "Reminder: invoice INV-0041 from Dana Reyes" }
      """
    And step "Note the reminder" was called
    And the run succeeds

  Scenario: A paid invoice is not reminded
    Given dana is acting
    And data.clients "Ada Ortiz" has
      | email | ada@example.com |
    And data.invoicing.invoices "INV-0039" has
      | number    | INV-0039                                                                           |
      | client    | Ada Ortiz                                                                          |
      | status    | paid                                                                               |
      | currency  | USD                                                                                |
      | lines     | [{"description":"Service visit","quantity":"4","unit":"visit","unitPrice":"30"}] |
      | from      | Dana Reyes                                                                         |
      | fromEmail | dana@example.com                                                                   |
      | issuedOn  | 2026-10-01                                                                         |
      | paidOn    | 2026-10-09                                                                         |
    When invoicing.invoice-remind runs with
      | id | INV-0039 |
    Then resend.emails.send was not called
    And step "Note the reminder" was not called
    And the run succeeds
