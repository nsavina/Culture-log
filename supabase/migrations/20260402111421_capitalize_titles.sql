-- Capitalize first letter of all existing entry titles
update public.entries
set title = upper(left(title, 1)) || substring(title from 2)
where left(title, 1) <> upper(left(title, 1));
