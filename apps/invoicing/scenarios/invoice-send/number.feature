Feature: Number an invoice
  Send gives a draft the next number of the app's sequence, from INV-0001, and leaves a number the
  draft has alone.

  Scenario: The first invoice is INV-0001
    Given dana is acting
    And data.clients "Ada Ortiz" has
      | email | ada@example.com |
    And data.invoicing.sequence "invoice" is gone
    And data.invoicing.invoices "draft-1" has
      | client    | Ada Ortiz                                                                          |
      | status    | draft                                                                              |
      | currency  | USD                                                                                |
      | lines     | [{"description":"Service visit","quantity":"1","unit":"visit","unitPrice":"25"}] |
      | from      | Dana Reyes                                                                         |
      | fromEmail | dana@example.com                                                                   |
    When invoicing.invoice-send runs with
      | id | draft-1 |
    Then step "Take the number" was called with
      """
      { "record": { "name": "invoice", "next": 2 }, "ifAbsent": true }
      """
    And a Resend email with "invoice-INV-0001.pdf" attached is sent
    And the run succeeds

  Scenario: A draft with a number keeps it
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
    Then data.invoicing.sequence.save was not called
    And step "Claim it" was called with
      """
      { "record": { "id": "INV-0042", "number": "INV-0042", "status": "draft" } }
      """
    And step "Number it" was not called
    And a Resend email with "invoice-INV-0042.pdf" attached is sent
    And the run succeeds

  Scenario: A draft the invoice check refuses fails before it takes a number
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
      | fromEmail |                                                                                      |
    When invoicing.invoice-send runs with
      | id | draft-1 |
    Then data.invoicing.sequence.save was not called
    And resend.emails.send was not called
    And the run fails
