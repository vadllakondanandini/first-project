-- Campus Quest: The Freshman Survival and Navigation Maps
-- Run this entire script in the Supabase SQL Editor.
create extension if not exists pgcrypto;

create table if not exists public.places (
  id uuid primary key default gen_random_uuid(),
  name varchar(100) not null,
  slug varchar(100) not null unique,
  category varchar(20) not null check (category in ('academic','library','food','office','sports','health','transport','services','hostel','other')),
  description varchar(500) not null,
  building varchar(100),
  floor varchar(50),
  landmark varchar(200),
  opening_hours varchar(120),
  accessibility_notes varchar(500),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.campus_routes (
  id uuid primary key default gen_random_uuid(),
  from_place_id uuid not null references public.places(id) on delete cascade,
  to_place_id uuid not null references public.places(id) on delete cascade,
  instructions varchar(1500) not null,
  estimated_minutes integer check (estimated_minutes between 1 and 180),
  accessibility_notes varchar(500),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint campus_routes_different_places check (from_place_id <> to_place_id),
  constraint campus_routes_pair_unique unique (from_place_id, to_place_id)
);

create table if not exists public.issue_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_name varchar(80),
  issue_type varchar(30) not null check (issue_type in ('wrong_information','place_closed','missing_place','accessibility','other')),
  details varchar(1000) not null check (char_length(trim(details)) between 10 and 1000),
  status varchar(20) not null default 'new' check (status in ('new','reviewing','resolved','dismissed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists places_active_category_idx on public.places(is_active, category);
create index if not exists routes_from_idx on public.campus_routes(from_place_id, is_active);
create index if not exists routes_to_idx on public.campus_routes(to_place_id, is_active);
create index if not exists issues_status_created_idx on public.issue_reports(status, created_at desc);

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists places_set_updated_at on public.places;
create trigger places_set_updated_at before update on public.places for each row execute function public.set_updated_at();
drop trigger if exists routes_set_updated_at on public.campus_routes;
create trigger routes_set_updated_at before update on public.campus_routes for each row execute function public.set_updated_at();
drop trigger if exists issues_set_updated_at on public.issue_reports;
create trigger issues_set_updated_at before update on public.issue_reports for each row execute function public.set_updated_at();

-- RLS is enabled. The server uses the service-role key only after applying API checks.
-- Never put that key in browser code. No anonymous direct table policies are created.
alter table public.places enable row level security;
alter table public.campus_routes enable row level security;
alter table public.issue_reports enable row level security;

-- Demo seed data for a sample campus. Replace these places/routes with verified college information.
insert into public.places (name,slug,category,description,building,floor,landmark,opening_hours,accessibility_notes)
values
 ('Main Academic Block','main-academic-block','academic','Main building for lectures, classrooms and department offices.','Academic Block','Ground and upper floors','Near the main entrance','College hours; verify locally','Ask reception for lift and step-free access details.'),
 ('Central Library','central-library','library','Quiet study space with books, reading desks and learning resources.','Library Building','Ground floor','Beside the academic block','Check library notice board','Ask library staff about accessible seating.'),
 ('Cafeteria','cafeteria','food','Food and refreshments for students between classes.','Student Centre','Ground floor','Near the central courtyard','Check posted timings','Ask staff about step-free entrance.'),
 ('Admissions Office','admissions-office','office','Help with admissions, student records and general office questions.','Administration Block','Ground floor','Next to the main gate','Office hours; verify locally','Contact the office for access assistance.'),
 ('Computer Laboratory','computer-laboratory','academic','Computer lab for programming and practical sessions.','CSE Block','First floor','CSE department corridor','During scheduled lab sessions','Ask the department about accessible workstations.'),
 ('Health Centre','health-centre','health','First point of contact for basic health support on campus.','Student Services Block','Ground floor','Near the student services desk','Check posted timings','Ask reception for the accessible entrance.'),
 ('Bus Pickup Point','bus-pickup-point','transport','Designated place to find campus buses and transport information.','Main Gate','Outdoor','Outside the main entrance','Check transport notice board','Confirm the boarding area with transport staff.'),
 ('Sports Ground','sports-ground','sports','Outdoor space for sports, fitness activities and college events.','Sports Area','Outdoor','Behind the student centre','Check campus schedule','Surface and access may vary; ask sports staff.'),
 ('Boys Hostel Office','boys-hostel-office','hostel','Hostel office for accommodation-related questions and support.','Hostel Zone','Ground floor','Near hostel entrance','Check office timings','Ask hostel staff for step-free access information.'),
 ('Student Help Desk','student-help-desk','services','Ask for help finding rooms, offices, facilities and student services.','Main Academic Block','Ground floor','Inside the main entrance','College hours; verify locally','Staff can help identify accessible routes.')
on conflict (slug) do nothing;

-- Add route notes only when both seeded place slugs exist. These are illustrative; verify directions on your campus.
insert into public.campus_routes (from_place_id,to_place_id,instructions,estimated_minutes,accessibility_notes)
select a.id,b.id,'From the main entrance, follow the signed central walkway toward the library building. Ask reception if a room entrance is unclear.',3,'Confirm step-free access with campus staff.'
from public.places a, public.places b where a.slug='main-academic-block' and b.slug='central-library'
on conflict (from_place_id,to_place_id) do nothing;

insert into public.campus_routes (from_place_id,to_place_id,instructions,estimated_minutes,accessibility_notes)
select a.id,b.id,'Exit the academic block toward the central courtyard, then follow the signs to the student centre cafeteria.',4,'Ask staff for the step-free route if needed.'
from public.places a, public.places b where a.slug='main-academic-block' and b.slug='cafeteria'
on conflict (from_place_id,to_place_id) do nothing;

insert into public.campus_routes (from_place_id,to_place_id,instructions,estimated_minutes,accessibility_notes)
select a.id,b.id,'Walk from the main entrance toward the administration block and look for the Admissions Office sign.',3,'Contact reception for accessible entrance details.'
from public.places a, public.places b where a.slug='main-academic-block' and b.slug='admissions-office'
on conflict (from_place_id,to_place_id) do nothing;
