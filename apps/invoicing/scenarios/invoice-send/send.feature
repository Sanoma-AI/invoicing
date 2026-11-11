Feature: Send an invoice
  Send numbers a draft, makes its PDF, emails it to the client with the PDF attached and marks it
  sent. A scenario does not wait on the seven days: the reminder's scenarios are in remind.feature.

  Scenario: A draft is numbered, emailed with its PDF and marked sent
    Given dana is acting
    And data.clients "Ada Ortiz" has
      | email | ada@example.com |
    And data.invoicing.sequence "invoice" has
      | next | 43 |
    And data.invoicing.invoices "draft-1" has
      | client    | Ada Ortiz                                                                            |
      | status    | draft                                                                                |
      | currency  | USD                                                                                  |
      | lines     | [{"description":"Service visit","quantity":"5","unit":"visit","unitPrice":"25.00"}] |
      | from      | Dana Reyes                                                                           |
      | fromEmail | dana@example.com                                                                     |
    When invoicing.invoice-send runs with
      | id | draft-1 |
    Then step "Number it" was called with
      """
      { "record": { "id": "draft-1", "number": "INV-0043", "status": "draft" } }
      """
    And a Resend email to "ada@example.com" is sent
    And a Resend email with "invoice-INV-0043.pdf" attached is sent
    And step "Email the invoice" was called with
      """
      { "subject": "Invoice INV-0043 from Dana Reyes", "from": "Dana Reyes <dana@example.com>" }
      """
    And step "Mark it sent" was called with
      """
      { "record": { "id": "draft-1", "number": "INV-0043", "status": "sent" } }
      """
    And the run succeeds

  Scenario: An invoice that is not a draft is left alone
    Given dana is acting
    And data.clients "Ada Ortiz" has
      | email | ada@example.com |
    And data.invoicing.invoices "INV-0040" has
      | number    | INV-0040                                                                          |
      | client    | Ada Ortiz                                                                         |
      | status    | sent                                                                              |
      | currency  | USD                                                                               |
      | lines     | [{"description":"Service visit","quantity":"1","unit":"visit","unitPrice":"85"}] |
      | from      | Dana Reyes                                                                        |
      | fromEmail | dana@example.com                                                                  |
      | issuedOn  | 2026-11-02                                                                        |
    When invoicing.invoice-send runs with
      | id | INV-0040 |
    Then resend.emails.send was not called
    And step "Mark it sent" was not called
    And the run succeeds

  Scenario: Someone outside admin sends only once admin approves
    Given data.clients "Ada Ortiz" has
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
    And "Send this invoice?" is approved by dana
    And "Review before it goes out" is approved by dana
    Then resend.emails.send was held for group "admin"
    And a Resend email with "invoice-INV-0042.pdf" attached is sent
    And the run succeeds
