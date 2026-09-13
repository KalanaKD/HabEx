-- One-off cleanup: remove duplicate categories created by concurrent seeding.
-- Keeps, per user and name, the copy that has expenses/budgets attached
-- (or the oldest id if none do). Run in the Supabase SQL editor.
with ranked as (
  select c.id,
         row_number() over (
           partition by c.user_id, c.name
           order by (exists (select 1 from expenses e where e.category_id = c.id)
                  or exists (select 1 from budgets  b where b.category_id = c.id)) desc,
                    c.id
         ) as rn
  from categories c
)
delete from categories where id in (select id from ranked where rn > 1);

-- Should now show 10 per user:
select user_id, count(*) from categories group by user_id;
