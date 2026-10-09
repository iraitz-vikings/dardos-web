// Textos del aviso legal y de la política de privacidad, en los tres
// idiomas de la web (2026-10-08). Los datos del titular salen de
// club.config.js (titular y contacto), así que con el NIF o el domicilio
// nuevos basta con cambiar ese archivo.
//
// Cada página es { titulo, secciones: [{ titulo, parrafos: [] | lista: [] }] }.
// Si algún día se añade un servicio externo nuevo que reciba datos de los
// socios (otro proveedor de avisos, de alojamiento, de fotos...), hay que
// añadirlo en "destinatarios" de la política de privacidad.
import { CLUB } from "./club.js";

const { razonSocial, nif, domicilio } = CLUB.titular;
const email = CLUB.contacto.email;
const dominio = CLUB.dominio.replace(/^https?:\/\//, "");

export const textosLegales = {
  es: {
    avisoLegal: {
      titulo: "Aviso legal",
      secciones: [
        {
          titulo: "Titular de la web",
          parrafos: [
            "En cumplimiento del artículo 10 de la Ley 34/2002, de servicios de la sociedad de la información y de comercio electrónico (LSSI), se informa de los datos del titular de esta web:",
          ],
          lista: [
            `Titular: ${razonSocial}`,
            `NIF: ${nif}`,
            `Domicilio: ${domicilio}`,
            `Correo electrónico: ${email}`,
            `Web: ${dominio}`,
          ],
        },
        {
          titulo: "Objeto",
          parrafos: [
            "Esta web es la página del club: noticias, torneos, ligas, resultados y galería, y una zona privada para los miembros donde se gestionan sus perfiles, partidos y avisos. No se vende nada a través de ella.",
          ],
        },
        {
          titulo: "Condiciones de uso",
          parrafos: [
            "Quien usa la web se compromete a hacerlo de buena fe, sin dañarla ni usarla para fines ilícitos. El club puede retirar el acceso a la zona de miembros a quien haga un uso indebido de ella.",
            "El club procura que la información publicada (horarios, resultados, clasificaciones) sea correcta, pero parte de ella procede de plataformas externas y puede contener errores o retrasos. Ante cualquier duda manda la información oficial de cada competición.",
          ],
        },
        {
          titulo: "Propiedad intelectual",
          parrafos: [
            "Los textos, el escudo y las fotos del club pertenecen al club o a sus autores. No se pueden reutilizar con fines comerciales sin permiso. Los nombres y logos de los fabricantes y plataformas de dardos pertenecen a sus respectivos dueños.",
          ],
        },
        {
          titulo: "Enlaces externos",
          parrafos: [
            "La web enlaza a páginas de terceros (plataformas de dardos, Google Maps, YouTube, Telegram...). El club no se hace responsable de su contenido. El vídeo y el mapa no se cargan hasta que se pulsan.",
          ],
        },
        {
          titulo: "Cookies",
          parrafos: [
            "Esta web no usa cookies de análisis ni de publicidad. Solo guarda en el navegador lo imprescindible para que funcione (el idioma elegido y la sesión de la zona de miembros), lo que no requiere consentimiento.",
          ],
        },
        {
          titulo: "Legislación aplicable",
          parrafos: ["Este aviso se rige por la legislación española."],
        },
      ],
    },
    privacidad: {
      titulo: "Política de privacidad",
      secciones: [
        {
          titulo: "Responsable del tratamiento",
          lista: [
            `${razonSocial} — NIF ${nif}`,
            domicilio,
            `Contacto: ${email}`,
          ],
        },
        {
          titulo: "Qué datos tratamos",
          lista: [
            "Miembros con cuenta: nombre, correo electrónico, contraseña (guardada cifrada, nadie puede leerla) y rol en el club.",
            "Ficha de jugador (miembros y jugadores invitados): nombre, apodo, foto y presentación si se añaden, identificadores en plataformas de dardos y sus medias, equipos, y resultados y estadísticas de torneos, ligas y partidas.",
            "Avisos: la suscripción del dispositivo a las notificaciones (dirección técnica del servicio de avisos y tipo de navegador), un registro de los avisos enviados, y el chat de Telegram de quien lo vincule.",
            "Fotos de la galería y de las competiciones.",
          ],
        },
        {
          titulo: "Para qué y con qué base",
          lista: [
            "Gestionar el club y sus competiciones (cuentas, equipos, torneos, ligas, calendario y resultados): relación con el club como miembro o participante (art. 6.1.b RGPD).",
            "Mandar avisos de partidos y del club: consentimiento, que se da al activar los avisos en el dispositivo o al vincular Telegram, y se puede retirar en cualquier momento desactivándolos (art. 6.1.a RGPD).",
            "Publicar resultados, clasificaciones e historiales de las competiciones, y fotos de los eventos del club: interés legítimo del club en dar a conocer su actividad deportiva (art. 6.1.f RGPD). Puedes oponerte escribiendo al correo de contacto.",
          ],
        },
        {
          titulo: "A quién se comunican",
          parrafos: [
            "No se venden ni se ceden datos a nadie. Para funcionar, la web usa estos proveedores, que tratan los datos solo por encargo del club:",
          ],
          lista: [
            "Railway (alojamiento de la web y de la base de datos).",
            "Cloudinary (almacenamiento de fotos e imágenes).",
            "Los servicios de avisos de Google, Apple o Mozilla, según el navegador (entrega de las notificaciones).",
            "Telegram, solo para quien vincula su cuenta.",
            "Cloudflare, solo si se usan las cámaras en directo de una partida (la imagen pasa en directo y no se graba).",
          ],
        },
        {
          titulo: "Transferencias internacionales",
          parrafos: [
            "Algunos de estos proveedores tienen servidores fuera del Espacio Económico Europeo (sobre todo en Estados Unidos). Esas transferencias se amparan en el Marco de Privacidad de Datos UE-EE. UU. o en las cláusulas contractuales tipo de la Comisión Europea.",
          ],
        },
        {
          titulo: "Cuánto tiempo",
          parrafos: [
            "Los datos de la cuenta se guardan mientras se es miembro. Al dar de baja una cuenta se borran el acceso y el correo; la ficha de jugador con su historial deportivo se conserva como parte del palmarés del club, salvo que se pida su borrado. El registro de avisos enviados se borra solo a los 60 días.",
          ],
        },
        {
          titulo: "Tus derechos",
          parrafos: [
            `Puedes pedir el acceso, la rectificación, la supresión, la limitación, la portabilidad de tus datos u oponerte a su tratamiento escribiendo a ${email}. Si crees que no se han respetado tus derechos, puedes reclamar ante la Agencia Española de Protección de Datos (www.aepd.es).`,
          ],
        },
      ],
    },
  },

  eu: {
    avisoLegal: {
      titulo: "Lege-oharra",
      secciones: [
        {
          titulo: "Webgunearen titularra",
          parrafos: [
            "Informazioaren gizartearen zerbitzuei eta merkataritza elektronikoari buruzko 34/2002 Legearen (LSSI) 10. artikuluan ezarritakoa betez, webgune honen titularraren datuak jakinarazten dira:",
          ],
          lista: [
            `Titularra: ${razonSocial}`,
            `IFZ: ${nif}`,
            `Helbidea: ${domicilio}`,
            `Posta elektronikoa: ${email}`,
            `Webgunea: ${dominio}`,
          ],
        },
        {
          titulo: "Xedea",
          parrafos: [
            "Webgune hau klubaren orria da: albisteak, txapelketak, ligak, emaitzak eta galeria, eta kideentzako eremu pribatu bat, non beren profilak, partidak eta abisuak kudeatzen diren. Ez da ezer saltzen bertan.",
          ],
        },
        {
          titulo: "Erabilera-baldintzak",
          parrafos: [
            "Webgunea erabiltzen duenak fede onez erabiltzeko konpromisoa hartzen du, kalterik egin gabe eta legez kontrako helburuetarako erabili gabe. Klubak kideen eremurako sarbidea ken diezaioke behar ez bezala erabiltzen duenari.",
            "Klubak argitaratutako informazioa (ordutegiak, emaitzak, sailkapenak) zuzena izaten saiatzen da, baina horren zati bat kanpoko plataformetatik dator eta akatsak edo atzerapenak izan ditzake. Zalantzarik izanez gero, lehiaketa bakoitzaren informazio ofizialak agintzen du.",
          ],
        },
        {
          titulo: "Jabetza intelektuala",
          parrafos: [
            "Testuak, ikurra eta klubaren argazkiak klubarenak edo haien egileenak dira. Ezin dira helburu komertzialetarako berrerabili baimenik gabe. Dardo-fabrikatzaile eta -plataformen izenak eta logoak beren jabeenak dira.",
          ],
        },
        {
          titulo: "Kanpoko estekak",
          parrafos: [
            "Webguneak hirugarrenen orrietara estekak ditu (dardo-plataformak, Google Maps, YouTube, Telegram...). Klubak ez du haien edukiaren erantzukizunik. Bideoa eta mapa ez dira kargatzen sakatu arte.",
          ],
        },
        {
          titulo: "Cookieak",
          parrafos: [
            "Webgune honek ez du analisi- edo publizitate-cookierik erabiltzen. Funtzionatzeko ezinbestekoa dena baino ez du gordetzen nabigatzailean (aukeratutako hizkuntza eta kideen eremuko saioa), eta horrek ez du baimenik behar.",
          ],
        },
        {
          titulo: "Legedi aplikagarria",
          parrafos: ["Ohar hau Espainiako legediaren arabera arautzen da."],
        },
      ],
    },
    privacidad: {
      titulo: "Pribatutasun-politika",
      secciones: [
        {
          titulo: "Tratamenduaren arduraduna",
          lista: [`${razonSocial} — IFZ ${nif}`, domicilio, `Harremanetarako: ${email}`],
        },
        {
          titulo: "Zer datu tratatzen ditugun",
          lista: [
            "Kontua duten kideak: izena, posta elektronikoa, pasahitza (zifratuta gordea, inork ezin du irakurri) eta klubeko rola.",
            "Jokalari-fitxa (kideak eta jokalari gonbidatuak): izena, ezizena, argazkia eta aurkezpena gehitzen badira, dardo-plataformetako identifikatzaileak eta haien batez bestekoak, taldeak, eta txapelketa, liga eta partiden emaitzak eta estatistikak.",
            "Abisuak: gailuaren harpidetza jakinarazpenetara (abisu-zerbitzuaren helbide teknikoa eta nabigatzaile mota), bidalitako abisuen erregistroa, eta lotzen duenaren Telegram txata.",
            "Galeriako eta lehiaketetako argazkiak.",
          ],
        },
        {
          titulo: "Zertarako eta zein oinarrirekin",
          lista: [
            "Kluba eta haren lehiaketak kudeatzea (kontuak, taldeak, txapelketak, ligak, egutegia eta emaitzak): klubarekiko harremana, kide edo parte-hartzaile gisa (DBEO 6.1.b art.).",
            "Partiden eta klubaren abisuak bidaltzea: baimena, gailuan abisuak aktibatzean edo Telegram lotzean ematen dena; edonoiz ken daiteke abisuak desaktibatuz (DBEO 6.1.a art.).",
            "Lehiaketen emaitzak, sailkapenak eta historialak, eta klubaren ekitaldietako argazkiak argitaratzea: klubak bere kirol-jarduera ezagutarazteko duen interes legitimoa (DBEO 6.1.f art.). Horren aurka egin dezakezu harremanetarako postara idatzita.",
          ],
        },
        {
          titulo: "Nori jakinarazten zaizkion",
          parrafos: [
            "Ez da daturik saltzen ezta inori lagatzen ere. Funtzionatzeko, webguneak hornitzaile hauek erabiltzen ditu, eta klubaren aginduz baino ez dituzte datuak tratatzen:",
          ],
          lista: [
            "Railway (webgunearen eta datu-basearen ostatatzea).",
            "Cloudinary (argazkien eta irudien biltegiratzea).",
            "Google, Apple edo Mozillaren abisu-zerbitzuak, nabigatzailearen arabera (jakinarazpenak entregatzea).",
            "Telegram, bere kontua lotzen duenarentzat soilik.",
            "Cloudflare, partida bateko zuzeneko kamerak erabiltzen badira soilik (irudia zuzenean igarotzen da eta ez da grabatzen).",
          ],
        },
        {
          titulo: "Nazioarteko transferentziak",
          parrafos: [
            "Hornitzaile horietako batzuek Europako Esparru Ekonomikotik kanpo dituzte zerbitzariak (batez ere Estatu Batuetan). Transferentzia horiek EB eta AEBen arteko Datuen Pribatutasun Esparruan edo Europako Batzordearen kontratu-klausula estandarretan oinarritzen dira.",
          ],
        },
        {
          titulo: "Zenbat denboran",
          parrafos: [
            "Kontuaren datuak kide den bitartean gordetzen dira. Kontua ezabatzean, sarbidea eta posta elektronikoa ezabatzen dira; jokalari-fitxa eta haren kirol-historiala klubaren palmaresaren zati gisa gordetzen dira, ezabatzeko eskatzen ez bada. Bidalitako abisuen erregistroa 60 egunen buruan ezabatzen da berez.",
          ],
        },
        {
          titulo: "Zure eskubideak",
          parrafos: [
            `Zure datuak eskuratzeko, zuzentzeko, ezabatzeko, mugatzeko edo eramateko eskatu dezakezu, edo haien tratamenduaren aurka egin, ${email} helbidera idatzita. Zure eskubideak errespetatu ez direla uste baduzu, Datuak Babesteko Espainiako Agentzian erreklamatu dezakezu (www.aepd.es).`,
          ],
        },
      ],
    },
  },

  fr: {
    avisoLegal: {
      titulo: "Mentions légales",
      secciones: [
        {
          titulo: "Éditeur du site",
          parrafos: [
            "Conformément à l'article 10 de la loi espagnole 34/2002 sur les services de la société de l'information et le commerce électronique (LSSI), voici les informations sur l'éditeur de ce site :",
          ],
          lista: [
            `Éditeur : ${razonSocial}`,
            `NIF (numéro d'identification fiscale) : ${nif}`,
            `Adresse : ${domicilio}`,
            `E-mail : ${email}`,
            `Site : ${dominio}`,
          ],
        },
        {
          titulo: "Objet",
          parrafos: [
            "Ce site est celui du club : actualités, tournois, ligues, résultats et galerie, ainsi qu'un espace privé pour les membres où sont gérés leurs profils, leurs matchs et leurs notifications. Rien n'y est vendu.",
          ],
        },
        {
          titulo: "Conditions d'utilisation",
          parrafos: [
            "Toute personne qui utilise le site s'engage à le faire de bonne foi, sans l'endommager ni l'utiliser à des fins illicites. Le club peut retirer l'accès à l'espace membres en cas d'usage abusif.",
            "Le club veille à ce que les informations publiées (horaires, résultats, classements) soient exactes, mais une partie provient de plateformes externes et peut comporter des erreurs ou des retards. En cas de doute, les informations officielles de chaque compétition font foi.",
          ],
        },
        {
          titulo: "Propriété intellectuelle",
          parrafos: [
            "Les textes, l'écusson et les photos du club appartiennent au club ou à leurs auteurs. Ils ne peuvent pas être réutilisés à des fins commerciales sans autorisation. Les noms et logos des fabricants et plateformes de fléchettes appartiennent à leurs propriétaires.",
          ],
        },
        {
          titulo: "Liens externes",
          parrafos: [
            "Le site renvoie vers des pages de tiers (plateformes de fléchettes, Google Maps, YouTube, Telegram...). Le club n'est pas responsable de leur contenu. La vidéo et la carte ne se chargent que lorsqu'on clique dessus.",
          ],
        },
        {
          titulo: "Cookies",
          parrafos: [
            "Ce site n'utilise pas de cookies d'analyse ni de publicité. Il ne conserve dans le navigateur que ce qui est indispensable à son fonctionnement (la langue choisie et la session de l'espace membres), ce qui ne nécessite pas de consentement.",
          ],
        },
        {
          titulo: "Droit applicable",
          parrafos: ["Les présentes mentions sont régies par le droit espagnol."],
        },
      ],
    },
    privacidad: {
      titulo: "Politique de confidentialité",
      secciones: [
        {
          titulo: "Responsable du traitement",
          lista: [`${razonSocial} — NIF ${nif}`, domicilio, `Contact : ${email}`],
        },
        {
          titulo: "Quelles données nous traitons",
          lista: [
            "Membres avec compte : nom, adresse e-mail, mot de passe (stocké chiffré, personne ne peut le lire) et rôle au sein du club.",
            "Fiche de joueur (membres et joueurs invités) : nom, surnom, photo et présentation s'ils sont ajoutés, identifiants sur les plateformes de fléchettes et leurs moyennes, équipes, ainsi que résultats et statistiques des tournois, ligues et parties.",
            "Notifications : l'abonnement de l'appareil aux notifications (adresse technique du service de notifications et type de navigateur), un registre des notifications envoyées, et le chat Telegram de qui le relie.",
            "Photos de la galerie et des compétitions.",
          ],
        },
        {
          titulo: "Finalités et bases juridiques",
          lista: [
            "Gérer le club et ses compétitions (comptes, équipes, tournois, ligues, calendrier et résultats) : relation avec le club en tant que membre ou participant (art. 6.1.b RGPD).",
            "Envoyer les notifications de matchs et du club : consentement, donné en activant les notifications sur l'appareil ou en reliant Telegram, et révocable à tout moment en les désactivant (art. 6.1.a RGPD).",
            "Publier les résultats, classements et historiques des compétitions, ainsi que les photos des événements du club : intérêt légitime du club à faire connaître son activité sportive (art. 6.1.f RGPD). Vous pouvez vous y opposer en écrivant à l'adresse de contact.",
          ],
        },
        {
          titulo: "Destinataires",
          parrafos: [
            "Aucune donnée n'est vendue ni cédée. Pour fonctionner, le site fait appel à ces prestataires, qui ne traitent les données que pour le compte du club :",
          ],
          lista: [
            "Railway (hébergement du site et de la base de données).",
            "Cloudinary (stockage des photos et images).",
            "Les services de notifications de Google, Apple ou Mozilla, selon le navigateur (envoi des notifications).",
            "Telegram, uniquement pour qui relie son compte.",
            "Cloudflare, uniquement si les caméras en direct d'une partie sont utilisées (l'image passe en direct et n'est pas enregistrée).",
          ],
        },
        {
          titulo: "Transferts internationaux",
          parrafos: [
            "Certains de ces prestataires ont des serveurs en dehors de l'Espace économique européen (principalement aux États-Unis). Ces transferts reposent sur le cadre de protection des données UE–États-Unis ou sur les clauses contractuelles types de la Commission européenne.",
          ],
        },
        {
          titulo: "Durée de conservation",
          parrafos: [
            "Les données du compte sont conservées tant que l'on est membre. À la suppression d'un compte, l'accès et l'adresse e-mail sont effacés ; la fiche de joueur et son historique sportif sont conservés dans le palmarès du club, sauf demande de suppression. Le registre des notifications envoyées est effacé automatiquement au bout de 60 jours.",
          ],
        },
        {
          titulo: "Vos droits",
          parrafos: [
            `Vous pouvez demander l'accès, la rectification, l'effacement, la limitation ou la portabilité de vos données, ou vous opposer à leur traitement, en écrivant à ${email}. Si vous estimez que vos droits n'ont pas été respectés, vous pouvez introduire une réclamation auprès de l'Agence espagnole de protection des données (www.aepd.es).`,
          ],
        },
      ],
    },
  },
};
