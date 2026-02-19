-- Enable replication for specific tables to support Realtime

-- 1. Enable replication for 'marks' table
alter publication supabase_realtime add table marks;

-- 2. Enable replication for 'enrollments' table
alter publication supabase_realtime add table enrollments;

-- 3. Enable replication for 'attendance' table (if exists)
do $$
begin
  if exists (select from pg_tables where schemaname = 'public' and tablename = 'attendance') then
    alter publication supabase_realtime add table attendance;
  end if;
end
$$;
