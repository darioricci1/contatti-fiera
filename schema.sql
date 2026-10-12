-- contatti-fiera/schema.sql
-- version: 0.3.0
--
-- Lo schema `fiera` nel database unico di Alma (Neon, lo stesso del
-- gestionale). Una riga per contatto, con le colonne del foglio
-- «Contatti fiera» piu' quello che serve a ricontrollarlo.

create schema if not exists fiera;

create table if not exists fiera.impostazione (
  chiave text primary key,
  valore text
);

create table if not exists fiera.contatto (
  id            uuid primary key,              -- lo crea il telefono, cosi' un salvataggio ripetuto non duplica
  data_contatto date not null default current_date,
  nome          text not null default '',
  cognome       text not null default '',
  ruolo         text not null default '',
  comune        text not null default '',
  provincia     text not null default '',
  email         text not null default '',
  telefono      text not null default '',
  interesse     text not null default '',
  note          text not null default '',
  fiera         text not null default '',      -- il nome dell'evento
  registrato_da text not null default '',      -- chi era allo stand
  trascrizione  text not null default '',      -- quello che e' stato detto, per ricontrollare
  creato_il     timestamptz not null default now(),
  aggiornato_il timestamptz not null default now(),
  cancellato_il timestamptz
);

create index if not exists contatto_data on fiera.contatto (data_contatto desc, creato_il desc);

-- Chi puo' entrare con Google, oltre agli amministratori (FIERA_AMMINISTRATORI).
create table if not exists fiera.ammesso (
  email      text primary key,
  aggiunto_da text not null default '',
  creato_il  timestamptz not null default now()
);

-- Il calendario delle fiere: un contatto salvato in un giorno fra «dal» e «al»
-- appartiene a quella fiera (api/contatti.js, api/fiere.js).
create table if not exists fiera.evento (
  id        serial primary key,
  nome      text not null,
  luogo     text not null default '',
  dal       date not null,
  al        date not null,
  creato_da text not null default '',
  creato_il timestamptz not null default now()
);
