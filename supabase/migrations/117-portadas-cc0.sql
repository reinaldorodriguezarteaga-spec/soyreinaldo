-- 117: portadas de los análisis con fotos CC0 propias (21-nov-2026).
-- 17 análisis enlazaban fotos de otros medios (Cadena SER, Marca, Goal, web del
-- Barça, Twitter…): riesgo de copyright y señal mala para AdSense. Se cambian
-- por fotos CC0 de Wikimedia Commons servidas desde /public/portadas (fuentes en
-- public/portadas/FUENTES.md). APLICAR DESPUÉS de desplegar (si no, 404).
begin;
update articles set cover_url = 'https://www.soyreinaldo.com/portadas/camp-nou-grada.jpg' where id = '51894fa9-fe85-4b3a-bead-cc48871481c4'; -- empieza-igual-que-termino-el-barca-golea-sin-despeinarse
update articles set cover_url = 'https://www.soyreinaldo.com/portadas/metropolitano-bandera.jpg' where id = 'c900eb0e-1a9d-40bb-80f8-c8b288c05042'; -- quedense-con-julian-pero-no-lo-linchen
update articles set cover_url = 'https://www.soyreinaldo.com/portadas/bernabeu.jpg' where id = '8e73d568-5ec4-4690-9f05-f98565fc4f37'; -- el-madrid-empieza-a-engranar
update articles set cover_url = 'https://www.soyreinaldo.com/portadas/camp-nou-lateral.jpg' where id = '6f68dbb6-73ca-4b56-86c3-4a4e841422bd'; -- el-barcelona-le-mete-5-al-rayo-raphinha-se-corona-pichichi-y-el-discur
update articles set cover_url = 'https://www.soyreinaldo.com/portadas/balon.jpg' where id = '742e2cf4-3030-4b61-a0ea-30a2b6158f7a'; -- la-liga-de-los-lloros-se-cobra-otra-victima
update articles set cover_url = 'https://www.soyreinaldo.com/portadas/san-mames.jpg' where id = 'a542855a-00a5-4646-80a5-e618897e232a'; -- el-athletic-le-da-la-razon-a-los-que-se-reian-del-relato-colchonero
update articles set cover_url = 'https://www.soyreinaldo.com/portadas/camp-nou-obras.jpg' where id = '5702e484-2a18-4094-bcba-1525a4f18d5c'; -- barcelona-imperial-5-1-al-feyenoord-con-raphinha-y-lamine-escribiendo-
update articles set cover_url = 'https://www.soyreinaldo.com/portadas/campo-noche.jpg' where id = '509561c2-e772-498e-889f-14f07d907b27'; -- dejen-de-llorar-por-los-arbitros-y-miren-el-partido
update articles set cover_url = 'https://www.soyreinaldo.com/portadas/metropolitano-exterior.jpg' where id = 'adc67323-d751-4476-ad50-bb02523ca616'; -- el-madrid-llora-por-kang-in-lee-pero-celebro-el-error-que-hundio-al-at
update articles set cover_url = 'https://www.soyreinaldo.com/portadas/bernabeu-centro.jpg' where id = '450e0bb5-47c0-407f-b601-3706bc65eb1e'; -- gana-el-madrid-llora-el-madrid
update articles set cover_url = 'https://www.soyreinaldo.com/portadas/bota.jpg' where id = 'e10c9506-e76f-4997-9214-4a9edf507baa'; -- el-barca-se-juega-la-racha-en-estambul
update articles set cover_url = 'https://www.soyreinaldo.com/portadas/camp-nou-exterior.jpg' where id = '2b71bdaa-eaf7-4f5d-bb52-9faffaa130d3'; -- gana-el-barcelona-golea-el-barcelona-llora-el-madridismo
update articles set cover_url = 'https://www.soyreinaldo.com/portadas/bernabeu-area.jpg' where id = '633a4633-886a-41d3-8249-921e637c274a'; -- el-madrid-llora-el-madrid-gana
update articles set cover_url = 'https://www.soyreinaldo.com/portadas/bernabeu.jpg' where id = '3389925e-6679-4b19-af74-faee98a499ab'; -- el-madrid-se-lleva-el-clasico-con-suerte
update articles set cover_url = 'https://www.soyreinaldo.com/portadas/camp-nou-grada.jpg' where id = 'b85c8c59-0bc4-49c1-8be9-e5cf8ed84ae4'; -- 106-a-106-el-clasico-que-puede-romperlo-todo
update articles set cover_url = 'https://www.soyreinaldo.com/portadas/balon.jpg' where id = '94b672a1-c091-477c-875d-a2e298eb0a91'; -- ganar-golear-y-no-perder-puntos-el-barca-se-juega-el-top-8
update articles set cover_url = 'https://www.soyreinaldo.com/portadas/bernabeu-centro.jpg' where id = '1b5ff262-1fd0-441a-9387-e7e5a5343bf4'; -- gana-el-madrid-golea-el-madrid-y-el-futbol-se-queda-en-el-tunel
commit;
