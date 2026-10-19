import os
import base64

def get_base64_image(image_path):
    if os.path.exists(image_path):
        with open(image_path, "rb") as img_file:
            return "data:image/jpeg;base64," + base64.b64encode(img_file.read()).decode("utf-8")
    return ""

def generate_html_manual():
    base_dir = r"C:\Users\marti\.gemini\antigravity\scratch\destellos"
    logo_triboo_path = os.path.join(base_dir, "public", "logos", "triboo-logo.jpg")
    logo_rolfi_path = os.path.join(base_dir, "public", "logos", "rolf.jpg")
    
    b64_triboo = get_base64_image(logo_triboo_path)
    b64_rolfi = get_base64_image(logo_rolfi_path)

    html_content = f"""<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>TRIBOO 🌟 — Manual Oficial de Juegos y Reglas</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap');

    @page {{
      size: A4;
      margin: 1.5cm;
    }}

    * {{
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }}

    body {{
      font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      color: #1e293b;
      background: #f8fafc;
      line-height: 1.55;
      font-size: 13.5px;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }}

    .container {{
      max-width: 900px;
      margin: 30px auto;
      background: #ffffff;
      padding: 45px 50px;
      border-radius: 16px;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.06);
      border: 1px solid #e2e8f0;
    }}

    @media print {{
      body {{
        background: #ffffff;
      }}
      .container {{
        box-shadow: none;
        border: none;
        padding: 0;
        margin: 0;
        max-width: 100%;
      }}
      .no-print {{
        display: none !important;
      }}
      .page-break {{
        page-break-before: always;
      }}
    }}

    /* ACTION BAR */
    .action-bar {{
      display: flex;
      gap: 12px;
      margin-bottom: 25px;
      padding-bottom: 18px;
      border-bottom: 1px solid #e2e8f0;
    }}
    .btn {{
      padding: 10px 20px;
      border-radius: 10px;
      font-weight: 800;
      font-size: 13px;
      cursor: pointer;
      text-decoration: none;
      display: inline-flex;
      align-items: center;
      gap: 8px;
      transition: all 0.2s;
      border: none;
    }}
    .btn-primary {{
      background: linear-gradient(135deg, #ea580c, #f59e0b);
      color: white;
      box-shadow: 0 4px 14px rgba(234, 88, 12, 0.35);
    }}
    .btn-secondary {{
      background: #0284c7;
      color: white;
      box-shadow: 0 4px 14px rgba(2, 132, 199, 0.3);
    }}

    /* HEADER */
    .header-table {{
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 2px solid #ea580c;
      padding-bottom: 20px;
      margin-bottom: 25px;
    }}
    .logo-box {{
      text-align: center;
      width: 130px;
    }}
    .logo-box img {{
      width: 80px;
      height: 80px;
      object-fit: cover;
      border-radius: 50%;
      border: 3px solid #ea580c;
      box-shadow: 0 4px 10px rgba(0,0,0,0.1);
    }}
    .logo-caption {{
      font-size: 11px;
      font-weight: 800;
      color: #64748b;
      margin-top: 6px;
    }}
    .header-center {{
      text-align: center;
      flex: 1;
      padding: 0 20px;
    }}
    .tagline {{
      font-size: 11px;
      text-transform: uppercase;
      font-weight: 800;
      letter-spacing: 1.5px;
      color: #ea580c;
      margin-bottom: 4px;
    }}
    .main-title {{
      font-size: 26px;
      font-weight: 900;
      color: #0f172a;
      line-height: 1.15;
      letter-spacing: -0.5px;
      margin-bottom: 8px;
    }}
    .sub-title {{
      font-size: 13px;
      color: #64748b;
      font-weight: 500;
    }}

    /* INTRO BOX */
    .intro-card {{
      background: linear-gradient(135deg, #fff7ed 0%, #ffedd5 100%);
      border-left: 5px solid #ea580c;
      padding: 18px 22px;
      border-radius: 12px;
      margin-bottom: 30px;
    }}
    .intro-title {{
      font-size: 14px;
      font-weight: 800;
      color: #c2410c;
      margin-bottom: 6px;
      display: flex;
      align-items: center;
      gap: 6px;
    }}
    .intro-text {{
      font-size: 12.5px;
      color: #431407;
      line-height: 1.6;
    }}

    /* GAME SECTION */
    .game-section {{
      margin-bottom: 30px;
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 14px;
      overflow: hidden;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.02);
      break-inside: avoid;
    }}
    .game-header {{
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 14px 20px;
      border-bottom: 1px solid #e2e8f0;
    }}
    .game-header.orange {{ background: #fff7ed; }}
    .game-header.green  {{ background: #f0fdf4; }}
    .game-header.blue   {{ background: #f0f9ff; }}
    .game-header.purple {{ background: #faf5ff; }}
    .game-header.amber  {{ background: #fffbeb; }}

    .game-title {{
      font-size: 16px;
      font-weight: 800;
      color: #0f172a;
      display: flex;
      align-items: center;
      gap: 10px;
    }}
    .badge {{
      display: inline-block;
      font-size: 10.5px;
      font-weight: 800;
      padding: 4px 10px;
      border-radius: 20px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }}
    .badge-core {{ background: #ffedd5; color: #c2410c; }}
    .badge-game {{ background: #e0f2fe; color: #0369a1; }}

    .game-lead {{
      padding: 12px 20px;
      font-size: 12.5px;
      color: #475569;
      background: #fafafa;
      border-bottom: 1px solid #f1f5f9;
      font-style: italic;
    }}

    /* DATA TABLE */
    .game-table {{
      width: 100%;
      border-collapse: collapse;
    }}
    .game-table tr {{
      border-bottom: 1px solid #f1f5f9;
    }}
    .game-table tr:last-child {{
      border-bottom: none;
    }}
    .game-table td {{
      padding: 12px 20px;
      font-size: 12.5px;
      vertical-align: top;
    }}
    .key-col {{
      width: 28%;
      font-weight: 700;
      color: #0f172a;
      background: #f8fafc;
      border-right: 1px solid #f1f5f9;
    }}
    .val-col {{
      color: #334155;
      line-height: 1.55;
    }}
    .pts-pill {{
      display: inline-block;
      background: #dcfce7;
      color: #15803d;
      font-weight: 800;
      padding: 2px 8px;
      border-radius: 6px;
      font-size: 11px;
      margin: 2px 0;
    }}

    /* FOOTER */
    .doc-footer {{
      margin-top: 35px;
      padding-top: 18px;
      border-top: 1px solid #e2e8f0;
      text-align: center;
      font-size: 11px;
      color: #94a3b8;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }}
  </style>
</head>
<body>

<div class="container">
  <!-- ACTION BAR PARA DESCARGA DIRECTA -->
  <div class="action-bar no-print">
    <button class="btn btn-primary" onclick="window.print()">
      🖨️ Descargar en PDF / Imprimir
    </button>
    <a href="/MANUAL_DE_JUEGOS_TRIBOO.docx" class="btn btn-secondary" download>
      📄 Descargar en formato Word (.docx)
    </a>
  </div>

  <!-- HEADER OFICIAL CON LOGOTIPOS -->
  <div class="header-table">
    <div class="logo-box">
      <img src="{b64_rolfi}" alt="Rolfi Arlequín">
      <div class="logo-caption">ROLFI ARLEQUÍN<br><span style="font-weight:500; font-size:10px;">Anfitrión IA</span></div>
    </div>
    <div class="header-center">
      <div class="tagline">Guía Maestra y Manual de Operaciones</div>
      <h1 class="main-title">TRIBOO 🌟 MANUAL OFICIAL DE JUEGOS</h1>
      <p class="sub-title">Reglas, dinámicas de participación, horarios, puntajes y secretos de cada juego.</p>
    </div>
    <div class="logo-box">
      <img src="{b64_triboo}" alt="TRIBOO">
      <div class="logo-caption">TRIBOO 🌟<br><span style="font-weight:500; font-size:10px;">Tu Espacio Privado</span></div>
    </div>
  </div>

  <!-- BIENVENIDA -->
  <div class="intro-card">
    <div class="intro-title">🌟 BIENVENIDOS A LA TRIBU — Filosofía de Conexión y Entretenimiento</div>
    <p class="intro-text">
      TRIBOO es un oasis digital privado para tu familia o grupo de amigos, conducido por <strong>Rolfi</strong> (el Arlequín anfitrión con Inteligencia Artificial). Cada juego está diseñado para activar la memoria emotiva, el debate sano, las risas diarias y mantener viva la chispa cotidiana sin invadir tu tiempo ni llenarte de notificaciones innecesarias.
    </p>
  </div>

  <!-- JUEGO 1: FLASH GRUPAL -->
  <div class="game-section">
    <div class="game-header orange">
      <div class="game-title">
        <span>📸</span> 1. FLASH GRUPAL: FOTOS A CIEGAS
      </div>
      <span class="badge badge-core">Core Diario Obligatorio</span>
    </div>
    <div class="game-lead">
      El ritual diario de la Tribu. Un momento espontáneo donde todos comparten qué están haciendo sin poses forzadas.
    </div>
    <table class="game-table">
      <tr>
        <td class="key-col">Mecánica "A Ciegas"</td>
        <td class="val-col">
          Nadie puede ver las fotos de los demás hasta haber subido la suya propia. Esta regla fomenta la autenticidad y elimina la timidez: primero participás, luego descubrís en qué andan los tuyos.
        </td>
      </tr>
      <tr>
        <td class="key-col">Ventana Horaria</td>
        <td class="val-col">
          Abre a las <strong>00:00 hs</strong> y cierra a la hora límite configurada por el grupo (por defecto <strong>22:00 hs</strong>). Al cumplirse la hora, el baúl del día se cierra y ya no se pueden agregar fotos.
        </td>
      </tr>
      <tr>
        <td class="key-col">Veredicto de Rolfi</td>
        <td class="val-col">
          Inmediatamente al cierre, Rolfi analiza las fotos con humor inteligente y afectuoso. Otorga un diploma digital honorífico y proclama la <strong>Foto Ganadora del Día</strong>.
        </td>
      </tr>
      <tr>
        <td class="key-col">Sistema de Puntos</td>
        <td class="val-col">
          • <span class="pts-pill">+10 Pts</span> por subir tu foto del día.<br>
          • <span class="pts-pill">+15 Pts</span> adicionales para la foto ganadora del diploma de Rolfi.<br>
          • <span class="pts-pill">+1 Pt</span> por cada reacción o comentario que dejes en las fotos de tu tribu.
        </td>
      </tr>
      <tr>
        <td class="key-col">Regla de Oro</td>
        <td class="val-col">
          Fotos 100% reales capturadas en el día (el café de la mañana, el mate en la oficina, la cena o un paseo). ¡Nada de fotos de vacaciones del 2018!
        </td>
      </tr>
    </table>
  </div>

  <!-- JUEGO 2: EL IMPOSTOR -->
  <div class="game-section">
    <div class="game-header green">
      <div class="game-title">
        <span>🕵️</span> 2. EL IMPOSTOR ASÍNCRONO
      </div>
      <span class="badge badge-game">Deducción Social Diaria</span>
    </div>
    <div class="game-lead">
      El juego de intriga y sospecha donde nadie sabe quién es quién hasta que caen las máscaras.
    </div>
    <table class="game-table">
      <tr>
        <td class="key-col">Asignación Secreta<br><small style="color:#64748b;">00:00 a 19:00 hs</small></td>
        <td class="val-col">
          Rolfi elige una palabra secreta (ej: <em>"Milanesa"</em>). Los Inocentes ven la palabra real; el Impostor recibe <em>"¡SOS EL IMPOSTOR!"</em> y solo una categoría general (ej: <em>"Comidas típicas"</em>).
        </td>
      </tr>
      <tr>
        <td class="key-col">Pistas a Ciegas<br><small style="color:#64748b;">Fase 1</small></td>
        <td class="val-col">
          Cada jugador escribe una pista breve de 1 a 4 palabras. Las pistas permanecen ocultas para todo el grupo hasta las 19:00 hs, impidiendo que el impostor se copie de los inocentes.
        </td>
      </tr>
      <tr>
        <td class="key-col">La Revelación y Debate<br><small style="color:#64748b;">19:00 a 22:00 hs</small></td>
        <td class="val-col">
          A las 19:00 hs se destapan todas las pistas en el muro público. Se abre el debate con chat en vivo: ¿Quién puso una pista sospechosa? ¿Quién fue demasiado específico o demasiado ambiguo?
        </td>
      </tr>
      <tr>
        <td class="key-col">Votación Acusatoria</td>
        <td class="val-col">
          Cada jugador emite un voto secreto señalando al culpable. A las 22:00 hs se cuentan los votos.
        </td>
      </tr>
      <tr>
        <td class="key-col">El Tiro de Gracia</td>
        <td class="val-col">
          Si el Impostor es descubierto por la mayoría, tiene una última carta: adivinar la palabra secreta. Si acierta, da vuelta el resultado y se consagra campeón.
        </td>
      </tr>
      <tr>
        <td class="key-col">Puntajes del Juego</td>
        <td class="val-col">
          • Inocentes ganan: <span class="pts-pill">+25 Pts</span> cada uno (+10 pts extra a quienes votaron al Impostor).<br>
          • Impostor no descubierto: <span class="pts-pill">+40 Pts</span> para el Impostor.<br>
          • Impostor acierta el Tiro de Gracia: <span class="pts-pill">+30 Pts</span> para el Impostor.
        </td>
      </tr>
    </table>
  </div>

  <div class="page-break"></div>

  <!-- JUEGO 3: EL PRODE -->
  <div class="game-section">
    <div class="game-header blue">
      <div class="game-title">
        <span>⚽</span> 3. EL PRODE DE FÚTBOL (LIGA PROFESIONAL AFA)
      </div>
      <span class="badge badge-game">Fútbol Argentino en Vivo</span>
    </div>
    <div class="game-lead">
      Pronósticos fecha a fecha con resultados oficiales de SofaScore / SportAPI7 y tabla de posiciones en tiempo real.
    </div>
    <table class="game-table">
      <tr>
        <td class="key-col">Cómo Pronosticar</td>
        <td class="val-col">
          Para cada partido de la Liga Argentina, elegís tu tendencia: Local (L), Empate (E) o Visitante (V), y podés arriesgar el resultado exacto en goles (ej: 2 a 1). Se puede pronosticar hasta 5 minutos antes del comienzo de cada encuentro.
        </td>
      </tr>
      <tr>
        <td class="key-col">Puntaje por Partido</td>
        <td class="val-col">
          • <span class="pts-pill">+3 Pts</span> por acertar el ganador o empate.<br>
          • <span class="pts-pill">+2 Pts</span> extra por acertar el resultado exacto de goles (ej: pronosticaste 1-0 y terminó 1-0).<br>
          • <strong>Total máximo por partido: 5 Puntos.</strong>
        </td>
      </tr>
      <tr>
        <td class="key-col">En Vivo y Ranking</td>
        <td class="val-col">
          A medida que se juegan los partidos reales, el sistema toma los goles en vivo y actualiza la tabla de goleadores y el ranking del Prode de tu grupo automáticamente.
        </td>
      </tr>
    </table>
  </div>

  <!-- JUEGO 4: EL PICADO -->
  <div class="game-section">
    <div class="game-header purple">
      <div class="game-title">
        <span>🏃‍♂️</span> 4. EL PICADO DE LA SEMANA
      </div>
      <span class="badge badge-game">Organización de Partidos</span>
    </div>
    <div class="game-lead">
      El fin de las listas desordenadas en chats. Convocatoria clara de 10 titulares, banco de suplentes y tercer tiempo.
    </div>
    <table class="game-table">
      <tr>
        <td class="key-col">Lista de Convocados</td>
        <td class="val-col">
          Un clic para anotarte como titular. Los primeros 10 ingresan a la cancha. A partir del jugador 11, entran automáticamente como <em>Suplentes en Espera</em>. Si un titular se baja, el primer suplente asciende solo.
        </td>
      </tr>
      <tr>
        <td class="key-col">Armado de Equipos</td>
        <td class="val-col">
          Rolfi puede armar dos equipos equilibrados al azar (Equipo Blanco vs Equipo Negro) o el organizador puede mover los jugadores a mano.
        </td>
      </tr>
      <tr>
        <td class="key-col">Votación Post-Partido</td>
        <td class="val-col">
          Al finalizar la jornada, todos los que jugaron votan al <strong>Jugador del Partido (Premio Figura)</strong> y con picardía al <strong>Tronco de la Fecha</strong>. <span class="pts-pill">+10 Pts</span> de honor para la figura.
        </td>
      </tr>
    </table>
  </div>

  <!-- JUEGO 5: SATÉLITES -->
  <div class="game-section">
    <div class="game-header amber">
      <div class="game-title">
        <span>🧠</span> 5. TRIVIA DIARIA, TRAZO LOCO Y TARAREO ARDILLA
      </div>
      <span class="badge badge-game">Ingenio y Creatividad</span>
    </div>
    <table class="game-table">
      <tr>
        <td class="key-col">🧠 Cerebro Fuga<br><small style="color:#64748b;">Trivia Diaria</small></td>
        <td class="val-col">
          3 preguntas diarias con tiempo límite generadas por IA sobre anécdotas argentinas, cultura pop e historia. <span class="pts-pill">+5 Pts</span> por cada respuesta correcta.
        </td>
      </tr>
      <tr>
        <td class="key-col">🎨 Trazo Loco<br><small style="color:#64748b;">Pictionary</small></td>
        <td class="val-col">
          Un integrante dibuja en el lienzo digital y los demás adivinan en el chat en vivo. El primero en acertar se lleva <span class="pts-pill">+15 Pts</span>.
        </td>
      </tr>
      <tr>
        <td class="key-col">🐿️ Tarareo Ardilla<br><small style="color:#64748b;">Música Acelerada</small></td>
        <td class="val-col">
          Rolfi presenta una pista musical distorsionada o tarareada a alta velocidad. Quien reconozca la canción suma puntos de bonificación.
        </td>
      </tr>
    </table>
  </div>

  <!-- CONSEJOS SUPERADMIN -->
  <div class="intro-card" style="background:#f1f5f9; border-left-color: #0f172a;">
    <div class="intro-title" style="color: #0f172a;">⚙️ GESTIÓN EN SUPERADMIN PARA EL ADMINISTRADOR</div>
    <p class="intro-text" style="color: #334155;">
      Como Superadministrador podés activar, pausar o personalizar qué juegos satélite están habilitados para cada familia con un simple clic desde el panel <strong>/superadmin</strong>. Si una familia solo quiere fotos y trivia, o un grupo de amigos prefiere Prode y Picado, la plataforma se adapta a cada comunidad.
    </p>
  </div>

  <!-- FOOTER -->
  <div class="doc-footer">
    <div>TRIBOO 🌟 Plataforma Familiar y Comunitaria</div>
    <div>Anfitrión Oficial: Rolfi Arlequín · 2026</div>
  </div>
</div>

</body>
</html>
"""

    output_path = os.path.join(base_dir, "public", "MANUAL_DE_JUEGOS_TRIBOO.html")
    with open(output_path, "w", encoding="utf-8") as f:
        f.write(html_content)
    print(f"HTML created successfully at: {output_path}")

if __name__ == "__main__":
    generate_html_manual()
