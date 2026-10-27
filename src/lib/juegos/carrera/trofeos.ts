/**
 * Fotos reales de los trofeos para el palmarés del modo carrera (28-oct, pedido
 * del dueño). Solo de Wikimedia Commons con licencia libre (CC o dominio
 * público); se citan autor y licencia en el palmarés, como piden las CC.
 * Lo que no tiene foto libre sale con un icono.
 */

export type FotoTrofeo = { foto: string; autor: string; licencia: string; pagina: string };

const FOTOS: Record<string, FotoTrofeo> = {
  asia: { foto: "https://thumb.wikimedia.org/wikipedia/commons/thumb/3/33/AFC_Asian_Cup_at_Fed_Square.jpg/250px-AFC_Asian_Cup_at_Fed_Square.jpg", autor: "SuperJew", licencia: "CC BY-SA 4.0", pagina: "https://commons.wikimedia.org/wiki/File:AFC_Asian_Cup_at_Fed_Square.jpg" },
  balondeoro: { foto: "https://thumb.wikimedia.org/wikipedia/commons/thumb/1/16/Zinedine_Zidane%27s_1998_Ballon_d%27Or_trophy%2C_Real_Madrid_Museum%2C_Santiago_Bernab%C3%A9u%2C_Madrid%2C_Spain_%28Ank_Kumar%2C_Infosys_Limited%29_01.jpg/250px-Zinedine_Zidane%27s_1998_Ballon_d%27Or_trophy%2C_Real_Madrid_Museum%2C_Santiago_Bernab%C3%A9u%2C_Madrid%2C_Spain_%28Ank_Kumar%2C_Infosys_Limited%29_01.jpg", autor: "Ank Kumar", licencia: "CC BY-SA 4.0", pagina: "https://commons.wikimedia.org/wiki/File:Zinedine_Zidane%27s_1998_Ballon_d%27Or_trophy,_Real_Madrid_Museum,_Santiago_Bernab%C3%A9u,_Madrid,_Spain_(Ank_Kumar,_Infosys_Limited)_01.jpg" },
  botadeoro: { foto: "https://thumb.wikimedia.org/wikipedia/commons/thumb/a/a9/Golden_Shoe_2008.jpg/250px-Golden_Shoe_2008.jpg", autor: "Erko", licencia: "CC BY-SA 4.0", pagina: "https://commons.wikimedia.org/wiki/File:Golden_Shoe_2008.jpg" },
  bundesliga: { foto: "https://thumb.wikimedia.org/wikipedia/commons/thumb/5/51/Frankfurter_Buchmesse_2015_-_Meisterschale_%28cropped%29.JPG/250px-Frankfurter_Buchmesse_2015_-_Meisterschale_%28cropped%29.JPG", autor: "JCS", licencia: "CC BY 3.0", pagina: "https://commons.wikimedia.org/wiki/File:Frankfurter_Buchmesse_2015_-_Meisterschale_(cropped).JPG" },
  champions: { foto: "https://upload.wikimedia.org/wikipedia/commons/9/95/UEFA_Champions_League_Trophy_-_cropped.JPG", autor: "User;KTo288", licencia: "CC BY-SA 3.0", pagina: "https://commons.wikimedia.org/wiki/File:UEFA_Champions_League_Trophy_-_cropped.JPG" },
  copaamerica: { foto: "https://thumb.wikimedia.org/wikipedia/commons/thumb/9/97/Copa_america_trofeo.jpg/250px-Copa_america_trofeo.jpg", autor: "Casa Escasany de Buenos Aires (trophy) Hazaña17 (photo)", licencia: "Public domain", pagina: "https://commons.wikimedia.org/wiki/File:Copa_america_trofeo.jpg" },
  copadelrey: { foto: "https://thumb.wikimedia.org/wikipedia/commons/thumb/e/e3/Copa_del_Rey_de_Futbol.JPG/250px-Copa_del_Rey_de_Futbol.JPG", autor: "Ignasi", licencia: "CC BY-SA 4.0", pagina: "https://commons.wikimedia.org/wiki/File:Copa_del_Rey_de_Futbol.JPG" },
  coppaitalia: { foto: "https://thumb.wikimedia.org/wikipedia/commons/thumb/2/29/Coppa_Italia_trophy_icon.jpg/250px-Coppa_Italia_trophy_icon.jpg", autor: "RichiWarrior05", licencia: "CC BY-SA 4.0", pagina: "https://commons.wikimedia.org/wiki/File:Coppa_Italia_trophy_icon.jpg" },
  coupefrance: { foto: "https://thumb.wikimedia.org/wikipedia/commons/thumb/1/1f/Coupe_de_France_trophy.png/250px-Coupe_de_France_trophy.png", autor: "MacMoreno", licencia: "CC BY-SA 4.0", pagina: "https://commons.wikimedia.org/wiki/File:Coupe_de_France_trophy.png" },
  dfbpokal: { foto: "https://thumb.wikimedia.org/wikipedia/commons/thumb/d/d8/DFB_Pokal_Trophy.png/250px-DFB_Pokal_Trophy.png", autor: "MacMoreno", licencia: "CC BY-SA 4.0", pagina: "https://commons.wikimedia.org/wiki/File:DFB_Pokal_Trophy.png" },
  eredivisie: { foto: "https://thumb.wikimedia.org/wikipedia/commons/thumb/6/6b/Landskampioen_Schaal.png/250px-Landskampioen_Schaal.png", autor: "Forzaruvo94", licencia: "CC BY-SA 3.0", pagina: "https://commons.wikimedia.org/wiki/File:Landskampioen_Schaal.png" },
  eurocopa: { foto: "https://thumb.wikimedia.org/wikipedia/commons/thumb/8/81/Coupe_Henri_Delaunay_2017.jpg/250px-Coupe_Henri_Delaunay_2017.jpg", autor: "Кирилл Венедиктов", licencia: "CC BY-SA 3.0", pagina: "https://commons.wikimedia.org/wiki/File:Coupe_Henri_Delaunay_2017.jpg" },
  europa: { foto: "https://thumb.wikimedia.org/wikipedia/commons/thumb/4/42/Europa_league_trophy.jpg/250px-Europa_league_trophy.jpg", autor: "Damine178", licencia: "CC BY-SA 4.0", pagina: "https://commons.wikimedia.org/wiki/File:Europa_league_trophy.jpg" },
  facup: { foto: "https://thumb.wikimedia.org/wikipedia/commons/thumb/d/d2/FA_Cup_trophy_displayed_in_Liverpool_museum.jpg/250px-FA_Cup_trophy_displayed_in_Liverpool_museum.jpg", autor: "FYI2023", licencia: "CC0", pagina: "https://commons.wikimedia.org/wiki/File:FA_Cup_trophy_displayed_in_Liverpool_museum.jpg" },
  knvb: { foto: "https://thumb.wikimedia.org/wikipedia/commons/thumb/b/be/Knvbbeker_cropped.jpg/250px-Knvbbeker_cropped.jpg", autor: "Michiel Schipper from Amsterdam, The Netherlands", licencia: "CC BY 2.0", pagina: "https://commons.wikimedia.org/wiki/File:Knvbbeker_cropped.jpg" },
  laliga: { foto: "https://thumb.wikimedia.org/wikipedia/commons/thumb/d/d3/Trofeo_de_La_Liga_9900.jpg/250px-Trofeo_de_La_Liga_9900.jpg", autor: "Lisímaco de Egipto", licencia: "CC0", pagina: "https://commons.wikimedia.org/wiki/File:Trofeo_de_La_Liga_9900.jpg" },
  ligaportugal: { foto: "https://thumb.wikimedia.org/wikipedia/commons/thumb/0/0e/The_2016-17_Primeira_Liga_Trophy.jpg/250px-The_2016-17_Primeira_Liga_Trophy.jpg", autor: "Threeohsix", licencia: "CC BY-SA 4.0", pagina: "https://commons.wikimedia.org/wiki/File:The_2016-17_Primeira_Liga_Trophy.jpg" },
  ligue1: { foto: "https://thumb.wikimedia.org/wikipedia/commons/thumb/5/5a/Hexagoal.jpg/250px-Hexagoal.jpg", autor: "Gundan", licencia: "CC BY-SA 4.0", pagina: "https://commons.wikimedia.org/wiki/File:Hexagoal.jpg" },
  mundial: { foto: "https://thumb.wikimedia.org/wikipedia/commons/thumb/1/10/FIFA_World_Cup_Trophy_%28Ank_Kumar%2C_Infosys_Limited%29_04.jpg/250px-FIFA_World_Cup_Trophy_%28Ank_Kumar%2C_Infosys_Limited%29_04.jpg", autor: "Ank Kumar", licencia: "CC BY-SA 4.0", pagina: "https://commons.wikimedia.org/wiki/File:FIFA_World_Cup_Trophy_(Ank_Kumar,_Infosys_Limited)_04.jpg" },
  oro: { foto: "https://thumb.wikimedia.org/wikipedia/commons/thumb/f/fa/2012_Olympic_Gold_Medal.jpg/250px-2012_Olympic_Gold_Medal.jpg", autor: "carlinmack", licencia: "CC0", pagina: "https://commons.wikimedia.org/wiki/File:2012_Olympic_Gold_Medal.jpg" },
  premier: { foto: "https://thumb.wikimedia.org/wikipedia/commons/thumb/f/f2/Premier_League_Trophy_at_Manchester%27s_National_Football_Museum_%28Ank_Kumar%29_01.jpg/250px-Premier_League_Trophy_at_Manchester%27s_National_Football_Museum_%28Ank_Kumar%29_01.jpg", autor: "Ank Kumar", licencia: "CC BY-SA 4.0", pagina: "https://commons.wikimedia.org/wiki/File:Premier_League_Trophy_at_Manchester%27s_National_Football_Museum_(Ank_Kumar)_01.jpg" },
  seriea: { foto: "https://thumb.wikimedia.org/wikipedia/commons/thumb/d/d5/Coppa_Campioni_d%E2%80%99Italia.jpg/250px-Coppa_Campioni_d%E2%80%99Italia.jpg", autor: "RichiWarrior05", licencia: "CC BY-SA 4.0", pagina: "https://commons.wikimedia.org/wiki/File:Coppa_Campioni_d%E2%80%99Italia.jpg" },
  supercopa: { foto: "https://thumb.wikimedia.org/wikipedia/commons/thumb/b/b2/Supercopa_2016.jpg/250px-Supercopa_2016.jpg", autor: "Beta15", licencia: "CC BY-SA 4.0", pagina: "https://commons.wikimedia.org/wiki/File:Supercopa_2016.jpg" },
  taca: { foto: "https://thumb.wikimedia.org/wikipedia/commons/thumb/7/70/Ta%C3%A7a_de_Portugal_Trophy.png/250px-Ta%C3%A7a_de_Portugal_Trophy.png", autor: "MacMoreno", licencia: "CC BY-SA 4.0", pagina: "https://commons.wikimedia.org/wiki/File:Ta%C3%A7a_de_Portugal_Trophy.png" },
};

const POR_NOMBRE: [RegExp, string][] = [
  [/^Champions League$/, "champions"],
  [/^Europa League$/, "europa"],
  [/^Supercopa$/, "supercopa"],
  [/^LaLiga$/, "laliga"],
  [/^Premier League$/, "premier"],
  [/^Serie A$/, "seriea"],
  [/^Bundesliga$/, "bundesliga"],
  [/^Ligue 1$/, "ligue1"],
  [/^Liga Portugal$/, "ligaportugal"],
  [/^Eredivisie$/, "eredivisie"],
  [/^Copa del Rey$/, "copadelrey"],
  [/^FA Cup$/, "facup"],
  [/^DFB-Pokal$/, "dfbpokal"],
  [/^Coppa Italia$/, "coppaitalia"],
  [/^Copa de Francia$/, "coupefrance"],
  [/^Taça de Portugal$/, "taca"],
  [/^KNVB Beker$/, "knvb"],
  [/^Mundial \d/, "mundial"],
  [/^Eurocopa/, "eurocopa"],
  [/^Copa América/, "copaamerica"],
  [/^Copa Asiática/, "asia"],
  [/^Oro olímpico/, "oro"],
  [/^Balón de Oro$/, "balondeoro"],
  [/^Bota de Oro$/, "botadeoro"],
];

/** Foto del trofeo o premio, o null si no hay una libre. */
export function fotoTrofeo(nombre: string): FotoTrofeo | null {
  const clave = POR_NOMBRE.find(([re]) => re.test(nombre))?.[1];
  return clave ? FOTOS[clave] ?? null : null;
}

/** Club, selección o individual, para agrupar el palmarés. */
export function tipoTrofeo(nombre: string, esPremio: boolean): "club" | "seleccion" | "individual" {
  if (esPremio) return "individual";
  return /^(Mundial|Eurocopa|Copa América|Copa África|Copa Oro|Copa Asiática|Oro olímpico)/.test(nombre) ? "seleccion" : "club";
}
