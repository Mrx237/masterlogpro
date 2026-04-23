-- Schedule auto-refresh of economic news every 30 minutes
SELECT cron.schedule(
  'fetch-news-every-30min',
  '*/30 * * * *',
  $$
  SELECT net.http_post(
    url:='https://qaqdfvjmrghfqknvhyso.supabase.co/functions/v1/fetch-news',
    headers:='{"Content-Type":"application/json","Authorization":"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFhcWRmdmptcmdoZnFrbnZoeXNvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY2NjY5MzIsImV4cCI6MjA5MjI0MjkzMn0.ZSMyGlVM7vQSJ3P71Vom5M_Uo_TiHpemSV4HPrTicC8"}'::jsonb,
    body:='{"source":"cron"}'::jsonb
  );
  $$
);