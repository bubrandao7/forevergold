-- Dados fixos: as cinco lojas (FGCore.LOJAS_BASE) e as oito contas da equipa (FGCore.CONTAS).
insert into public.lojas (id, nome, zona, morada, horario, tel, whats, email, ordem) values
  ('valbom',    'Valbom',       'Gondomar',             'Rua Novais da Cunha, 1135, Valbom 4420-226',                   '9h30 – 13h00 · 14h00 – 18h30', '220180168', '932656581', 'geralforevergold@gmail.com', 1),
  ('stovidio',  'Santo Ovídio', 'Vila Nova de Gaia',    'Rua Conceição Fernandes, 72, 4430-062 Vila Nova de Gaia',      '9h30 – 13h00 · 14h00 – 18h30', '220935909', '932656581', 'geralforevergold@gmail.com', 2),
  ('pedroucos', 'Pedrouços',    'Maia',                 'Rua D. Afonso Henriques, 1502, 4435-003',                      '9h30 – 12h30 · 14h00 – 19h00', '223174709', '932656581', 'geralforevergold@gmail.com', 3),
  ('riotinto',  'Rio Tinto',    'Gondomar',             'Av. Dr. Domingos Gonçalves de Sá 434 Lj 12, 4435-213 Rio Tinto', '9h00 – 13h00 · 14h00 – 18h00', '220920620', '932656581', 'geralforevergold@gmail.com', 4),
  ('arrifana',  'Arrifana',     'Santa Maria da Feira', 'Rua Terras de Santa Maria, 1521, 3700-398 Arrifana',           '9h30 – 12h30 · 14h00 – 19h00', '256038450', '932656581', 'forevergold.arrifana@gmail.com', 5);

insert into public.contas (id, nome, tipo, loja, pub) values
  ('forevervalbom',    'Valbom',       'loja',   'valbom',    false),
  ('foreverstovidio',  'Santo Ovídio', 'loja',   'stovidio',  false),
  ('foreverpedroucos', 'Pedrouços',    'loja',   'pedroucos', false),
  ('foreverriotinto',  'Rio Tinto',    'loja',   'riotinto',  false),
  ('foreverarrifana',  'Arrifana',     'loja',   'arrifana',  false),
  ('foreveroficina',   'Oficina',      'equipa', null,        false),
  ('foreverbu',        'BU',           'equipa', null,        true),
  ('foreverfilipe',    'Filipe',       'equipa', null,        false);
