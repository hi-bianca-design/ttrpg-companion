alter table public.classes add constraint classes_name_key unique (name);
alter table public.species add constraint species_name_key unique (name);
alter table public.backgrounds add constraint backgrounds_name_key unique (name);
alter table public.spells add constraint spells_name_key unique (name);
alter table public.subclasses add constraint subclasses_class_id_name_key unique (class_id, name);
