-- Enable Realtime for the messages table so that postgres_changes
-- subscriptions in MessageThread.tsx fire on new message inserts.
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
