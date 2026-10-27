-- Verified email fingerprints are private duplicate-account checks, never login credentials.
CREATE TABLE identity_emails (
    identity_id TEXT NOT NULL REFERENCES user_identities(id) ON DELETE CASCADE,
    email_hash TEXT NOT NULL,
    PRIMARY KEY (identity_id, email_hash)
);
CREATE INDEX idx_identity_emails_hash ON identity_emails(email_hash);

-- Multiple identities belonging to one user can share an address. Different users cannot.
-- Enforce ownership inside the same D1 transaction as identity creation, including races.
CREATE TRIGGER identity_emails_same_user
BEFORE INSERT ON identity_emails
WHEN EXISTS (
    SELECT 1 FROM identity_emails e
    JOIN user_identities owner ON owner.id = e.identity_id
    JOIN user_identities incoming ON incoming.id = NEW.identity_id
    WHERE e.email_hash = NEW.email_hash AND owner.user_id <> incoming.user_id
)
BEGIN
    SELECT RAISE(ABORT, 'Verified email already registered');
END;
