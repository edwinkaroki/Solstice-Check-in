 # Scope Delta Analysis

## Client Pivot

The client introduced a non-negotiable architectural pivot with a
48-hour deadline. The original polling-based approach was to be
removed or deprecated, with no extension to the deadline and no
option to revert to the previous scope.

## Original Scope

The original check-in implementation handled badge printing
synchronously. When an attendee was scanned, the server directly
called the badge printer REST API and waited for the printer to
respond before completing the check-in.

The synchronous implementation ensured that an attendee was only
marked as checked in after the badge printer successfully completed
the request.

## Scope Change

The implementation was changed to an asynchronous architecture using
RabbitMQ.

Instead of keeping the kiosk request waiting for the printer, the
server now creates a print job and publishes it to a RabbitMQ queue.
The server immediately returns a queued response while a background
worker processes the print job.

The worker calls the badge printer's REST API and updates the job
status based on the printer response.

## Implementation Changes

### Removed/Deprecated

The previous synchronous printer workflow was deprecated rather than
silently removed. It is retained as a reference to the original
implementation and is clearly marked as deprecated in the code.

### New Components

- `queue.js` — handles RabbitMQ connection and publishing.
- `worker.js` — consumes print jobs and communicates with the printer.
- `jobStore.js` — tracks print-job status.
- `print_jobs.json` — stores print-job state.

### Modified Components

- `server.js` — changed from direct synchronous printing to
  asynchronous job creation and queue publishing.
- `attendees.json` — now tracks temporary `printPending` state.

## New Flow

QR Scan
    ↓
server.js
    ↓
Create print job
    ↓
RabbitMQ
    ↓
Return queued response
    ↓
worker.js
    ↓
Printer REST API
    ↓
Successful print
    ↓
Update job status
    ↓
Mark attendee as checked in

## Duplicate Scan Handling

The revised implementation prevents duplicate badge printing.

An attendee who is already checked in is rejected. An attendee whose
badge is currently being processed is also prevented from creating
another print job.

## Testing

The asynchronous implementation was tested with at least three
attendees.

- A001 — tested successfully.
- A002 — tested successfully.
- A003 — successfully processed through the asynchronous queue.
- A003 duplicate scan — rejected with an "Attendee has already
  checked in" response.

The tests demonstrated that an attendee is only marked as checked in
after successful badge printing.

## Outcome

The implementation successfully adapted to the architectural pivot
within the existing project and deadline.

The obsolete approach was deprecated, while the new asynchronous
RabbitMQ-based implementation became the active check-in workflow.
The REST printer integration and duplicate-check-in requirements were
preserved while changing the processing model from synchronous to
asynchronous.

## What I Learnt

This task taught me how to adapt an existing software implementation
when the client changes the technical requirements under a strict
deadline.

I learnt the difference between synchronous and asynchronous
processing. In the original implementation, the server waited for the
badge printer to respond before completing the check-in. With the new
architecture, the server publishes a print job to RabbitMQ and the
worker processes it independently.

I also learnt how message queues can decouple different parts of a
system. The check-in server no longer needs to communicate directly
with the printer during the user's request.

Working with RabbitMQ also taught me about producers, consumers,
queues, acknowledgements, and job states such as queued, printing,
printed, and failed.

Another important lesson was that changing architecture does not mean
throwing away everything that already works. I learnt how to identify
obsolete code, deprecate it clearly, and build the replacement while
preserving important requirements such as duplicate-scan protection.

Finally, I learnt the importance of testing the complete workflow
rather than only checking whether individual components run. I tested
multiple attendees, successful printing, job status, and duplicate
scans to verify that the new asynchronous implementation behaved as
required.