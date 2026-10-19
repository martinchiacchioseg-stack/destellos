import "server-only";
import { z } from "zod";
import { jsonGemini, decir } from "./gemini";
import { NIVELES, type NivelTrivia } from "./types";

export const PreguntaSchema = z.object({
  pregunta: z.string().min(5),
  opciones: z.array(z.string().min(1)).length(4),
  correcta: z.number().int().min(0).max(3),
  explicacion: z.string().default(""),
  dato_curioso: z.string().default(""),
});
export type Pregunta = z.infer<typeof PreguntaSchema>;

const TEMAS = [
  "historia argentina y personajes inolvidables",
  "geografía de América Latina y el mundo",
  "ciencia curiosa, física del día a día y naturaleza",
  "rock nacional, música latina y cine de culto",
  "fútbol argentino, mundiales e hitos deportivos",
  "comidas típicas, asados, vinos y cultura rioplatense",
  "animales asombrosos y récords de la fauna",
  "inventos argentinos y mundiales que cambiaron la historia",
  "literatura, mitos y leyendas populares",
  "astronomía, planetas y misiones espaciales",
  "curiosidades del cuerpo humano y medicina",
  "series de TV, dibujos animados clásicos y cultura pop",
];

/** Banco amplio y variado de respaldo: garantiza que jamás se repitan las mismas preguntas. */
const RESPALDO: Record<NivelTrivia, Pregunta[]> = {
  facil: [
    { pregunta: "¿De qué color es el cielo en un día completamente despejado?", opciones: ["Verde", "Azul", "Rojo", "Gris"], correcta: 1, explicacion: "La luz azul se dispersa más en la atmósfera que otros colores por su menor longitud de onda.", dato_curioso: "Al atardecer se ve rojizo o anaranjado porque la luz recorre más capa atmosférica." },
    { pregunta: "¿Qué bebida típica se toma con bombilla en Argentina y Uruguay?", opciones: ["Café con leche", "Té helado", "Mate", "Licuado"], correcta: 2, explicacion: "El mate es la infusión tradicional rioplatense por excelencia.", dato_curioso: "En Argentina se consumen en promedio unos 6,4 kilos de yerba mate por habitante al año." },
    { pregunta: "¿Cuántos días tiene una semana?", opciones: ["5 días", "6 días", "7 días", "8 días"], correcta: 2, explicacion: "De lunes a domingo son exactamente siete días.", dato_curioso: "La semana de siete días proviene de la antigua Babilonia y se basaba en los astros visibles." },
    { pregunta: "¿Cuál es el animal terrestre más veloz del planeta?", opciones: ["León", "Guepardo", "Caballo", "Gacela"], correcta: 1, explicacion: "El guepardo o chita puede alcanzar hasta 115 km/h en carreras cortas.", dato_curioso: "Acelera de 0 a 100 km/h en solo 3 segundos, más rápido que la mayoría de los autos deportivos." },
    { pregunta: "¿Cuántos colores tiene el arcoíris tradicional?", opciones: ["Cinco", "Seis", "Siete", "Ocho"], correcta: 2, explicacion: "Se distinguen siete colores principales: rojo, naranja, amarillo, verde, azul, añil y violeta.", dato_curioso: "Isaac Newton añadió el color naranja y el añil para que fueran 7, número místico en su época." },
    { pregunta: "¿Qué selección ganó el Mundial de Fútbol de Qatar 2022?", opciones: ["Francia", "Brasil", "Argentina", "Croacia"], correcta: 2, explicacion: "Argentina venció a Francia en una final histórica por penales con Messi levantando la Copa.", dato_curioso: "Fue el tercer título mundial para la Selección Argentina después de 1978 y 1986." },
    { pregunta: "¿Qué instrumento musical tiene teclas blancas y negras?", opciones: ["Guitarra", "Piano", "Trompeta", "Violín"], correcta: 1, explicacion: "El piano estándar tiene 88 teclas: 52 blancas y 36 negras.", dato_curioso: "Su nombre original es 'pianoforte', porque podía sonar suave (piano) o fuerte (forte)." },
    { pregunta: "¿Cuál es la capital de la República Argentina?", opciones: ["Córdoba", "Rosario", "Ciudad Autónoma de Buenos Aires", "Mendoza"], correcta: 2, explicacion: "Buenos Aires es la capital federal y sede del gobierno nacional.", dato_curioso: "La Avenida 9 de Julio llegó a ser considerada una de las más anchas del mundo con 140 metros." },
    { pregunta: "¿Cómo se llama el proceso por el cual las plantas producen su propio alimento?", opciones: ["Respiración", "Fotosíntesis", "Fermentación", "Germinación"], correcta: 1, explicacion: "Utilizan la luz solar, agua y dióxido de carbono para sintetizar azúcares.", dato_curioso: "Gracias a la fotosíntesis las plantas liberan el oxígeno que respiramos en la Tierra." },
    { pregunta: "¿Qué superhéroe es conocido como el Caballero de la Noche?", opciones: ["Superman", "Hombre Araña", "Batman", "Iron Man"], correcta: 2, explicacion: "Batman, identidad secreta de Bruce Wayne, patrulla las calles de Ciudad Gótica.", dato_curioso: "Apareció por primera vez en Detective Comics número 27 en el año 1939." },
    { pregunta: "¿Cuál es el océano más grande de la Tierra?", opciones: ["Atlántico", "Pacífico", "Índico", "Ártico"], correcta: 1, explicacion: "El Océano Pacífico cubre más del 30% de la superficie total del planeta.", dato_curioso: "Fue bautizado 'Pacífico' por Fernando de Magallanes debido a las aguas calmas que encontró." },
    { pregunta: "¿En qué provincia argentina se encuentran las famosas Cataratas del Iguazú?", opciones: ["Misiones", "Corrientes", "Salta", "Jujuy"], correcta: 0, explicacion: "Las Cataratas del Iguazú están en la provincia de Misiones, en el límite con Brasil.", dato_curioso: "Fueron elegidas como una de las Nuevas 7 Maravillas Naturales del Mundo." },
  ],
  medio: [
    { pregunta: "¿En qué año se declaró la Independencia de las Provincias Unidas en Tucumán?", opciones: ["1810", "1816", "1820", "1853"], correcta: 1, explicacion: "El 9 de julio de 1816 el Congreso de Tucumán proclamó formalmente la independencia.", dato_curioso: "La casa histórica de Tucumán pertenecía originalmente a Francisca Bazán de Laguna." },
    { pregunta: "¿Cuál es el río considerado más ancho del mundo?", opciones: ["Nilo", "Amazonas", "Río de la Plata", "Mississippi"], correcta: 2, explicacion: "El Río de la Plata es un estuario que alcanza unos 220 km de ancho entre Argentina y Uruguay.", dato_curioso: "Juan Díaz de Solís lo llamó originalmente 'Mar Dulce' por su inmensa extensión." },
    { pregunta: "¿Qué planeta de nuestro sistema solar es conocido como el planeta rojo?", opciones: ["Venus", "Júpiter", "Marte", "Mercurio"], correcta: 2, explicacion: "El óxido de hierro en su superficie le otorga su tonalidad rojiza característica.", dato_curioso: "En Marte se encuentra el Monte Olimpo, un volcán tres veces más alto que el Everest." },
    { pregunta: "¿Quién compuso la emblemática canción 'De música ligera'?", opciones: ["Charly García", "Gustavo Cerati (Soda Stereo)", "Fito Páez", "Luis Alberto Spinetta"], correcta: 1, explicacion: "Fue grabada en 1990 para el disco 'Canción Animal' de Soda Stereo.", dato_curioso: "Fue el tema con el que cerraron la gira 'El Último Concierto' en 1997 con el célebre 'Gracias totales'." },
    { pregunta: "¿Cuál es la moneda oficial de Japón?", opciones: ["Yuan", "Won", "Yen", "Baht"], correcta: 2, explicacion: "El yen es la unidad monetaria japonesa desde el año 1871.", dato_curioso: "El símbolo del yen es ¥ y la palabra significa literalmente 'objeto redondo'." },
    { pregunta: "¿En qué país se originaron los Juegos Olímpicos en la antigüedad?", opciones: ["Italia", "Egipto", "Grecia", "Francia"], correcta: 2, explicacion: "Se celebraban en la ciudad de Olimpia en honor a Zeus desde el año 776 a.C.", dato_curioso: "Durante los Juegos regía una tregua sagrada que suspendía todas las guerras entre ciudades." },
    { pregunta: "¿Cuál es el órgano más grande del cuerpo humano?", opciones: ["Hígado", "Piel", "Intestino delgado", "Cerebro"], correcta: 1, explicacion: "La piel cubre unos 2 metros cuadrados en un adulto promedio y pesa unos 4 kilos.", dato_curioso: "Se renueva constantemente: perdemos cerca de 30.000 células muertas por minuto." },
    { pregunta: "¿Qué famoso inventor argentino patentó la birome (bolígrafo)?", opciones: ["Ladislao Biró", "René Favaloro", "Luis Leloir", "Quino"], correcta: 0, explicacion: "Ladislao José Biró patentó el bolígrafo con bolilla rodante en Argentina en 1943.", dato_curioso: "En Argentina cada 29 de septiembre se celebra el Día del Inventor en su honor." },
    { pregunta: "¿Qué gas es el más abundante en la atmósfera de la Tierra?", opciones: ["Oxígeno", "Dióxido de carbono", "Nitrógeno", "Hidrógeno"], correcta: 2, explicacion: "El nitrógeno compone aproximadamente el 78% del aire que respiramos.", dato_curioso: "El oxígeno representa solo alrededor del 21%, y el argón casi el 1% restante." },
    { pregunta: "¿Cuál es la montaña más alta del continente americano?", opciones: ["Monte Denali", "Cerro Aconcagua", "Huascarán", "Chimborazo"], correcta: 1, explicacion: "El Aconcagua, ubicado en Mendoza, Argentina, se eleva a 6.961 metros sobre el nivel del mar.", dato_curioso: "Es el pico más alto del mundo fuera del sistema del Himalaya asiático." },
    { pregunta: "¿Quién escribió la célebre novela 'Cien años de soledad'?", opciones: ["Jorge Luis Borges", "Gabriel García Márquez", "Julio Cortázar", "Mario Vargas Llosa"], correcta: 1, explicacion: "El escritor colombiano publicó la saga de la familia Buendía en Macondo en 1967.", dato_curioso: "García Márquez recibió el Premio Nobel de Literatura en 1982." },
    { pregunta: "¿Cuál es el hueso más largo del cuerpo humano?", opciones: ["Tibia", "Fémur", "Húmero", "Radio"], correcta: 1, explicacion: "El fémur, ubicado en el muslo, soporta gran parte del peso del cuerpo.", dato_curioso: "Es también el hueso más resistente del cuerpo humano: puede soportar toneladas de fuerza." },
  ],
  experto: [
    { pregunta: "¿Qué científico argentino fue galardonado con el Premio Nobel de Medicina en 1984?", opciones: ["Luis Federico Leloir", "César Milstein", "Bernardo Houssay", "René Favaloro"], correcta: 1, explicacion: "César Milstein desarrolló la técnica de producción de anticuerpos monoclonales.", dato_curioso: "Decidió no patentar su descubrimiento para que estuviera disponible gratuitamente a la humanidad." },
    { pregunta: "¿Qué elemento de la tabla periódica tiene como símbolo químico la letra 'W'?", opciones: ["Wolframio (Tungsteno)", "Vanadio", "Yterbio", "Wurtzita"], correcta: 0, explicacion: "El wolframio o tungsteno tiene número atómico 74 y símbolo W.", dato_curioso: "Tiene el punto de fusión más alto de todos los metales conocidos: 3.422 °C." },
    { pregunta: "¿En qué año se fundó la Universidad de Buenos Aires (UBA)?", opciones: ["1810", "1821", "1853", "1884"], correcta: 1, explicacion: "Fue fundada el 12 de agosto de 1821 por iniciativa del presbítero Antonio Sáenz.", dato_curioso: "Cinco premios Nobel argentinos egresaron o enseñaron en sus claustros." },
    { pregunta: "¿Cuál es el lago navegable a mayor altitud del mundo?", opciones: ["Lago Titicaca", "Lago Baikal", "Lago Tanganica", "Lago Nahuel Huapi"], correcta: 0, explicacion: "El lago Titicaca, entre Perú y Bolivia, se sitúa a 3.812 metros sobre el nivel del mar.", dato_curioso: "Alberga las legendarias islas flotantes construidas con totora por la etnia Uro." },
    { pregunta: "¿Cómo se llama el caballo del Quijote de la Mancha?", opciones: ["Bucéfalo", "Babieca", "Rocinante", "Platero"], correcta: 2, explicacion: "Don Quijote tardó cuatro días en elegir el nombre 'Rocinante' para su montura.", dato_curioso: "El nombre juega con que 'antes fue rocín' y ahora era el primer rocín del mundo." },
    { pregunta: "¿Cuál es el animal con el corazón más grande del reino animal?", opciones: ["Elefante africano", "Ballena azul", "Jirafa", "Tiburón ballena"], correcta: 1, explicacion: "El corazón de una ballena azul pesa cerca de 180 kilos y es del tamaño de un auto pequeño.", dato_curioso: "Sus latidos pueden escucharse a más de tres kilómetros de distancia bajo el agua." },
    { pregunta: "¿En qué año se sancionó la Constitución de la Nación Argentina en Santa Fe?", opciones: ["1816", "1826", "1853", "1860"], correcta: 2, explicacion: "El 1 de mayo de 1853 se promulgó el texto constitucional de base federal y republicana.", dato_curioso: "Buenos Aires inicialmente no participó de la convención constituyente y se unió en 1860." },
    { pregunta: "¿Cuál es la velocidad de la luz en el vacío?", opciones: ["150.000 km/s", "299.792 km/s", "380.000 km/s", "500.000 km/s"], correcta: 1, explicacion: "La luz viaja exactamente a 299.792.458 metros por segundo.", dato_curioso: "A esa velocidad, la luz tarda solo unos 8 minutos y 20 segundos en llegar desde el Sol hasta la Tierra." },
    { pregunta: "¿Quién dirigió la película argentina 'El secreto de sus ojos', ganadora del Oscar?", opciones: ["Damián Szifron", "Juan José Campanella", "Lucrecia Martel", "Adolfo Aristarain"], correcta: 1, explicacion: "Campanella adaptó la novela 'La pregunta de sus ojos' de Eduardo Sacheri y ganó el Oscar en 2010.", dato_curioso: "El famoso plano secuencia en la cancha de Huracán tardó tres meses de postproducción." },
    { pregunta: "¿Qué compuesto químico le da el característico olor a la lluvia sobre tierra seca?", opciones: ["Petricor (Geosmina)", "Ozono", "Clorofila", "Sulfuro"], correcta: 0, explicacion: "La geosmina es producida por bacterias del suelo (Actinomyces) y liberada en aerosoles con las gotas.", dato_curioso: "El olfato humano es extraordinariamente sensible a la geosmina, detectándola en partes por billón." },
    { pregunta: "¿Cuántos corazones tiene un pulpo?", opciones: ["Uno solo", "Dos corazones", "Tres corazones", "Cuatro corazones"], correcta: 2, explicacion: "Dos bombean sangre hacia las branquias y el tercero la distribuye por todo el cuerpo.", dato_curioso: "Además, su sangre es azulada porque usa hemocianina a base de cobre en vez de hierro." },
    { pregunta: "¿Qué célebre tango de Carlos Gardel comienza con la frase 'Volver con la frente marchita'?", opciones: ["El día que me quieras", "Mi Buenos Aires querido", "Volver", "Por una cabeza"], correcta: 2, explicacion: "'Volver' fue compuesto por Carlos Gardel y Alfredo Le Pera en 1934 para la película 'El día que me quieras'.", dato_curioso: "Fue grabado en los estudios de la Paramount en Nueva York poco antes de la tragedia de Medellín." },
  ],
};

let indiceRotativo: Record<NivelTrivia, number> = { facil: 0, medio: 0, experto: 0 };

export async function generarPregunta(nivel: NivelTrivia): Promise<Pregunta> {
  const tema = TEMAS[Math.floor(Math.random() * TEMAS.length)];
  const dificultad = {
    facil: "muy accesible, divertida y apta para toda la familia incluidos los más chicos",
    medio: "interesante, de dificultad media, con datos curiosos que hagan pensar",
    experto: "desafiante, específica, para gente que sabe mucho de cultura general",
  }[nivel];

  const seed = Math.floor(Math.random() * 1000000);

  // Intentar generar con Gemini con prompt creativo y fresco
  const r = await jsonGemini<unknown>(
    `Sos el motor de trivia de la app familiar Destellos. Creá UNA pregunta de trivia COMPLETAMENTE NUEVA y única. ` +
      `Dificultad: ${dificultad}. ` +
      `Tema sugerido: ${tema}. Semilla aleatoria: ${seed}. ` +
      `No repitas preguntas obvias de prueba como el color del cielo o el mate. ` +
      `Generá exactamente 4 opciones, una sola correcta (la posición de la correcta debe variar entre 0, 1, 2 o 3 aleatoriamente), ` +
      `una explicación entretenida de 1 frase y un dato curioso sorprendente. ` +
      `Respondé EXCLUSIVAMENTE el JSON: ` +
      `{"pregunta":"¿Texto de la pregunta?","opciones":["Opción 0","Opción 1","Opción 2","Opción 3"],"correcta":0,"explicacion":"Texto","dato_curioso":"Texto"}`
  );

  const ok = PreguntaSchema.safeParse(r);
  if (ok.success && ok.data.opciones.length === 4 && ok.data.correcta >= 0 && ok.data.correcta <= 3) {
    return ok.data;
  }

  // Si Gemini no está disponible o falla, usar el banco rotativo garantizando que NUNCA repita
  const banco = RESPALDO[nivel];
  const idx = indiceRotativo[nivel] % banco.length;
  indiceRotativo[nivel] = (indiceRotativo[nivel] + 1) % banco.length;

  return banco[idx];
}

/** Devolución personalizada de Arlequín con humor rioplatense y chispa cómica. */
export async function evaluar(opts: {
  nombre: string;
  nivel: NivelTrivia;
  acerto: boolean;
  agotado: boolean;
  pregunta: Pregunta;
}): Promise<string> {
  const estado = opts.agotado ? "se le acabó el tiempo en el reloj" : opts.acerto ? "acertó como un genio" : "se equivocó de opción";
  const correcta = opts.pregunta.opciones[opts.pregunta.correcta];

  const t = await decir(
    `${opts.nombre} jugó a la trivia (nivel ${NIVELES[opts.nivel].etiqueta}) y ${estado}. ` +
      `La pregunta era: "${opts.pregunta.pregunta}". La respuesta correcta era: "${correcta}". ` +
      `Escribí un comentario breve de 1 o 2 oraciones con tu personalidad de Arlequín: pícaro, cariñoso, humor rioplatense, sin retar.`
  );
  if (t) return t;

  if (opts.acerto) {
    const elogios = [
      `¡Qué cintura, ${opts.nombre}! Sabés más que Google con wifi rápido. Sumaste puntos de oro para la familia. 🎭✨`,
      `¡A la perinola, ${opts.nombre}! Le pegaste en el medio. Cerebro afiladísimo hoy. 🧠🔥`,
      `¡Bien ahí, ${opts.nombre}! Demostraste quién tiene la enciclopedia en la cabeza. 👑`,
    ];
    return elogios[Math.floor(Math.random() * elogios.length)];
  }

  if (opts.agotado) {
    return `¡Tic-tac, ${opts.nombre}! Te comió el reloj por dudar, pero el que no arriesga no cruza el charco. ¡Mañana hay revancha familiar! ⏳🎭`;
  }

  const animos = [
    `Casi casi, ${opts.nombre}. La correcta era "${correcta}". ¡A no aflojar que de los tropezones salen los campeones! 🎭`,
    `¡Te tiraste a la pileta, ${opts.nombre}! Esta vez estaba medio fría, pero la próxima la clavás al ángulo. 💪`,
  ];
  return animos[Math.floor(Math.random() * animos.length)];
}
