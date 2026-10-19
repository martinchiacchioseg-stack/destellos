import os
import sys
import docx
from docx import Document
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.oxml import OxmlElement, parse_xml
from docx.oxml.ns import nsdecls, qn

def set_cell_background(cell, fill_hex):
    tcPr = cell._tc.get_or_add_tcPr()
    shd = parse_xml(f'<w:shd {nsdecls("w")} w:fill="{fill_hex}"/>')
    tcPr.append(shd)

def set_cell_margins(cell, top=140, bottom=140, left=200, right=200):
    tcPr = cell._tc.get_or_add_tcPr()
    tcMar = parse_xml(f'<w:tcMar {nsdecls("w")}><w:top w:w="{top}" w:type="dxa"/><w:bottom w:w="{bottom}" w:type="dxa"/><w:left w:w="{left}" w:type="dxa"/><w:right w:w="{right}" w:type="dxa"/></w:tcMar>')
    tcPr.append(tcMar)

def create_manual_docx():
    doc = Document()
    
    # Page setup (A4 with 0.8 in margins)
    for section in doc.sections:
        section.top_margin = Inches(0.8)
        section.bottom_margin = Inches(0.8)
        section.left_margin = Inches(0.8)
        section.right_margin = Inches(0.8)
        
        # Header setup
        header = section.header
        hp = header.paragraphs[0]
        hp.alignment = WD_ALIGN_PARAGRAPH.RIGHT
        hrun = hp.add_run("TRIBOO 🌟 — Manual Oficial de Juegos y Reglas")
        hrun.font.name = "Arial"
        hrun.font.size = Pt(8.5)
        hrun.font.color.rgb = RGBColor(140, 150, 165)
        
        # Footer setup
        footer = section.footer
        fp = footer.paragraphs[0]
        fp.alignment = WD_ALIGN_PARAGRAPH.CENTER
        frun = fp.add_run("TRIBOO · Conexión, Juego y Familia · Anfitrión: Rolfi Arlequín")
        frun.font.name = "Arial"
        frun.font.size = Pt(8.5)
        frun.font.color.rgb = RGBColor(140, 150, 165)

    base_dir = r"C:\Users\marti\.gemini\antigravity\scratch\destellos"
    logo_triboo = os.path.join(base_dir, "public", "logos", "triboo-logo.jpg")
    logo_rolfi = os.path.join(base_dir, "public", "logos", "rolf.jpg")

    # Header Table with Logos
    header_table = doc.add_table(rows=1, cols=3)
    header_table.alignment = WD_TABLE_ALIGNMENT.CENTER
    header_table.autofit = False

    # Widths: 1.5 in, 3.8 in, 1.5 in
    header_table.columns[0].width = Inches(1.5)
    header_table.columns[1].width = Inches(3.8)
    header_table.columns[2].width = Inches(1.5)

    cell_left = header_table.cell(0, 0)
    cell_mid = header_table.cell(0, 1)
    cell_right = header_table.cell(0, 2)

    # Logo Rolfi left
    p_left = cell_left.paragraphs[0]
    p_left.alignment = WD_ALIGN_PARAGRAPH.CENTER
    if os.path.exists(logo_rolfi):
        p_left.add_run().add_picture(logo_rolfi, width=Inches(1.2))
    p_lbl = cell_left.add_paragraph()
    p_lbl.alignment = WD_ALIGN_PARAGRAPH.CENTER
    lbl_r = p_lbl.add_run("Rolfi Arlequín\n(Anfitrión con IA)")
    lbl_r.font.name = "Arial"
    lbl_r.font.size = Pt(8)
    lbl_r.font.bold = True
    lbl_r.font.color.rgb = RGBColor(100, 116, 139)

    # Center Title
    p_mid = cell_mid.paragraphs[0]
    p_mid.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r_sub = p_mid.add_run("TRIBOO · GUÍA MAESTRA\n")
    r_sub.font.name = "Arial"
    r_sub.font.size = Pt(10)
    r_sub.font.bold = True
    r_sub.font.color.rgb = RGBColor(234, 88, 12)

    r_title = p_mid.add_run("MANUAL OFICIAL DE JUEGOS\n")
    r_title.font.name = "Arial"
    r_title.font.size = Pt(17)
    r_title.font.bold = True
    r_title.font.color.rgb = RGBColor(15, 23, 42)

    r_desc = p_mid.add_run("Reglas, mecánicas de participación, horarios, puntajes y secretos de cada juego.")
    r_desc.font.name = "Arial"
    r_desc.font.size = Pt(9.5)
    r_desc.font.color.rgb = RGBColor(71, 85, 105)

    # Logo Triboo right
    p_right = cell_right.paragraphs[0]
    p_right.alignment = WD_ALIGN_PARAGRAPH.CENTER
    if os.path.exists(logo_triboo):
        p_right.add_run().add_picture(logo_triboo, width=Inches(1.2))
    p_lbl2 = cell_right.add_paragraph()
    p_lbl2.alignment = WD_ALIGN_PARAGRAPH.CENTER
    lbl_r2 = p_lbl2.add_run("TRIBOO 🌟\n(Tu Espacio Privado)")
    lbl_r2.font.name = "Arial"
    lbl_r2.font.size = Pt(8)
    lbl_r2.font.bold = True
    lbl_r2.font.color.rgb = RGBColor(100, 116, 139)

    doc.add_paragraph() # space

    # Callout Box: ¿Qué es Triboo?
    callout = doc.add_table(rows=1, cols=1)
    callout.alignment = WD_TABLE_ALIGNMENT.CENTER
    c_cell = callout.cell(0, 0)
    set_cell_background(c_cell, "FFF7ED") # light orange
    set_cell_margins(c_cell, 160, 160, 240, 240)
    cp = c_cell.paragraphs[0]
    c_run1 = cp.add_run("🌟 BIENVENIDOS A LA TRIBU — Filosofía de Conexión y Diversión\n")
    c_run1.font.name = "Arial"
    c_run1.font.bold = True
    c_run1.font.size = Pt(11)
    c_run1.font.color.rgb = RGBColor(194, 65, 12)
    c_run2 = cp.add_run(
        "TRIBOO no es una red social pública ni un chat caótico de WhatsApp. Es un oasis privado para tu familia o grupo de amigos, "
        "conducido por Rolfi (el Arlequín anfitrión con Inteligencia Artificial). Cada juego está diseñado para activar la memoria emotiva, "
        "el debate sano, las risas diarias y mantener viva la chispa cotidiana sin invadir tu tiempo."
    )
    c_run2.font.name = "Arial"
    c_run2.font.size = Pt(9.5)
    c_run2.font.color.rgb = RGBColor(67, 20, 7)

    doc.add_paragraph()

    # SECTION 1: FLASH GRUPAL (FOTOS A CIEGAS)
    p_s1 = doc.add_paragraph()
    r_s1 = p_s1.add_run("1. 📸 FLASH GRUPAL: FOTOS A CIEGAS (EL RITUAL DIARIO)")
    r_s1.font.name = "Arial"
    r_s1.font.bold = True
    r_s1.font.size = Pt(13)
    r_s1.font.color.rgb = RGBColor(234, 88, 12)

    doc.add_paragraph(
        "El corazón de TRIBOO. Un ritual diario que garantiza que todos los integrantes compartan un instante genuino de su día."
    )

    tbl1 = doc.add_table(rows=5, cols=2)
    tbl1.alignment = WD_TABLE_ALIGNMENT.CENTER
    tbl1.columns[0].width = Inches(2.0)
    tbl1.columns[1].width = Inches(4.8)

    t1_data = [
        ("Mecánica 'A Ciegas'", "Durante el día nadie puede ver las fotos de los demás hasta haber subido la propia. Esto evita la timidez y asegura participación espontánea sin poses artificiales."),
        ("Ventana Horaria", "Abierto desde las 00:00 hasta la hora de cierre fijada por el grupo (por defecto 22:00 hs). A esa hora se cierra el baúl."),
        ("El Veredicto de Rolfi", "Apenas cierra la ventana, Rolfi examina todas las fotos, redacta una devolución con humor cariñoso, elige la 'Foto Destacada del Día' y otorga un diploma honorífico."),
        ("Puntajes y Premios", "• +10 Puntos por subir tu foto del día.\n• +15 Puntos extra para la foto ganadora del veredicto.\n• +1 Punto por cada reacción y comentario en las fotos de tu tribu."),
        ("Regla de Oro", "Fotos 100% auténticas tomadas con la cámara o elegidas de la galería del día. ¡Nada de fotos de archivo de hace 5 años!")
    ]

    for i, (k, v) in enumerate(t1_data):
        c0 = tbl1.cell(i, 0)
        c1 = tbl1.cell(i, 1)
        set_cell_background(c0, "F8FAFC")
        set_cell_background(c1, "FFFFFF")
        set_cell_margins(c0, 100, 100, 140, 140)
        set_cell_margins(c1, 100, 100, 140, 140)
        p0 = c0.paragraphs[0]
        r0 = p0.add_run(k)
        r0.font.name = "Arial"
        r0.font.bold = True
        r0.font.size = Pt(9.5)
        r0.font.color.rgb = RGBColor(15, 23, 42)
        p1 = c1.paragraphs[0]
        r1 = p1.add_run(v)
        r1.font.name = "Arial"
        r1.font.size = Pt(9)
        r1.font.color.rgb = RGBColor(51, 65, 85)

    doc.add_paragraph()

    # SECTION 2: EL IMPOSTOR ASÍNCRONO
    p_s2 = doc.add_paragraph()
    r_s2 = p_s2.add_run("2. 🕵️ EL IMPOSTOR ASÍNCRONO (DEDUCCIÓN SOCIAL A CIEGAS)")
    r_s2.font.name = "Arial"
    r_s2.font.bold = True
    r_s2.font.size = Pt(13)
    r_s2.font.color.rgb = RGBColor(16, 185, 129)

    doc.add_paragraph(
        "El exitoso juego de deducción social llevado a un formato 100% asíncrono para jugar a lo largo del día sin necesidad de estar todos conectados a la misma hora."
    )

    tbl2 = doc.add_table(rows=6, cols=2)
    tbl2.alignment = WD_TABLE_ALIGNMENT.CENTER
    tbl2.columns[0].width = Inches(2.0)
    tbl2.columns[1].width = Inches(4.8)

    t2_data = [
        ("Asignación Secreta\n(00:00 a 19:00 hs)", "Rolfi elige una palabra secreta (ej: 'Mate') y selecciona a 1 Impostor al azar. Los Ciudadanos reciben la palabra real; el Impostor recibe '¡SOS EL IMPOSTOR!' y una pista de categoría (ej: 'Bebidas e infusiones')."),
        ("Pistas a Ciegas\n(Fase 1)", "Cada jugador escribe una pista sutil de 1 a 4 palabras. Nadie ve las pistas de los demás hasta que la fase 1 termina a las 19:00 hs. Esto impide que el Impostor copie a los otros."),
        ("La Gran Revelación y Debate\n(19:00 a 22:00 hs)", "A las 19:00 hs el cartelón se abre y TODAS las pistas quedan visibles. Se abre el muro de comentarios para debatir: ¿Quién puso una pista demasiado vaga? ¿Quién no parece saber de qué se habla?"),
        ("La Votación", "Cada miembro emite su voto secreto acusando a quien cree que es el Impostor. A las 22:00 hs se cuentan los votos."),
        ("El Tiro de Gracia", "Si el Impostor es descubierto por la mayoría, tiene una última oportunidad: adivinar la palabra exacta. Si acierta, ¡da vuelta la partida y gana él!"),
        ("Puntos en Juego", "• Inocentes ganan: +25 Pts c/u (+10 extra a quienes votaron al culpable).\n• Impostor no descubierto: +40 Puntos para el Impostor.\n• Impostor acierta Tiro de Gracia: +30 Puntos.")
    ]

    for i, (k, v) in enumerate(t2_data):
        c0 = tbl2.cell(i, 0)
        c1 = tbl2.cell(i, 1)
        set_cell_background(c0, "F0FDF4")
        set_cell_background(c1, "FFFFFF")
        set_cell_margins(c0, 100, 100, 140, 140)
        set_cell_margins(c1, 100, 100, 140, 140)
        p0 = c0.paragraphs[0]
        r0 = p0.add_run(k)
        r0.font.name = "Arial"
        r0.font.bold = True
        r0.font.size = Pt(9.5)
        r0.font.color.rgb = RGBColor(6, 95, 70)
        p1 = c1.paragraphs[0]
        r1 = p1.add_run(v)
        r1.font.name = "Arial"
        r1.font.size = Pt(9)
        r1.font.color.rgb = RGBColor(51, 65, 85)

    doc.add_paragraph()

    # SECTION 3: EL PRODE DE FÚTBOL
    p_s3 = doc.add_paragraph()
    r_s3 = p_s3.add_run("3. ⚽ EL PRODE DE FÚTBOL (LIGA PROFESIONAL AFA EN VIVO)")
    r_s3.font.name = "Arial"
    r_s3.font.bold = True
    r_s3.font.size = Pt(13)
    r_s3.font.color.rgb = RGBColor(2, 132, 199)

    doc.add_paragraph(
        "Pronósticos deportivos integrados en tiempo real con SportAPI7 (SofaScore). Resultados, tabla de posiciones oficial y goleadores en vivo."
    )

    tbl3 = doc.add_table(rows=4, cols=2)
    tbl3.alignment = WD_TABLE_ALIGNMENT.CENTER
    tbl3.columns[0].width = Inches(2.0)
    tbl3.columns[1].width = Inches(4.8)

    t3_data = [
        ("Mecánica de Pronóstico", "Para cada partido de la fecha, elegís: Local (L), Empate (E) o Visitante (V), y arriesgás el resultado exacto en goles (ej: 2 - 1). Podés cambiar tu pronóstico hasta 5 minutos antes del pitazo inicial."),
        ("Sistema de Puntos", "• +3 Puntos: Acierto del ganador o empate (tendencia).\n• +2 Puntos extra: Acierto del marcador exacto de goles (ej: dijiste 2-1 y terminó 2-1).\n• Total máximo por partido: 5 Puntos."),
        ("Sincronización Automática", "Los goles y partidos terminados se sincronizan automáticamente con la API oficial de SofaScore. El ranking del Prode se actualiza al instante."),
        ("Tabla de Posiciones AFA", "La pestaña 'Tabla AFA' muestra en vivo los puntos, diferencia de gol y goleadores reales del torneo argentino.")
    ]

    for i, (k, v) in enumerate(t3_data):
        c0 = tbl3.cell(i, 0)
        c1 = tbl3.cell(i, 1)
        set_cell_background(c0, "F0F9FF")
        set_cell_background(c1, "FFFFFF")
        set_cell_margins(c0, 100, 100, 140, 140)
        set_cell_margins(c1, 100, 100, 140, 140)
        p0 = c0.paragraphs[0]
        r0 = p0.add_run(k)
        r0.font.name = "Arial"
        r0.font.bold = True
        r0.font.size = Pt(9.5)
        r0.font.color.rgb = RGBColor(3, 105, 161)
        p1 = c1.paragraphs[0]
        r1 = p1.add_run(v)
        r1.font.name = "Arial"
        r1.font.size = Pt(9)
        r1.font.color.rgb = RGBColor(51, 65, 85)

    doc.add_paragraph()

    # SECTION 4: EL PICADO DE LA SEMANA
    p_s4 = doc.add_paragraph()
    r_s4 = p_s4.add_run("4. 🏃‍♂️ EL PICADO DE LA SEMANA (ORGANIZADOR DEPORTIVO)")
    r_s4.font.name = "Arial"
    r_s4.font.bold = True
    r_s4.font.size = Pt(13)
    r_s4.font.color.rgb = RGBColor(147, 51, 234)

    doc.add_paragraph(
        "Basta de listas confusas en WhatsApp. Convocatoria automática de 10 titulares, suplentes y logística de tercer tiempo."
    )

    tbl4 = doc.add_table(rows=4, cols=2)
    tbl4.alignment = WD_TABLE_ALIGNMENT.CENTER
    tbl4.columns[0].width = Inches(2.0)
    tbl4.columns[1].width = Inches(4.8)

    t4_data = [
        ("Anotarse / Bajarse", "Con 1 toque te anotás como titular. Al llenarse los 10 cupos, los siguientes entran automáticamente a la lista de 'Suplentes en Espera'. Si un titular se baja, el suplente sube solo."),
        ("Armado de Equipos", "Rolfi puede balancear los dos equipos (Camiseta Blanca vs Camiseta Negra) o el capitán puede asignarlos a mano."),
        ("Tercer Tiempo y Quincho", "Votación integrada de asado / pizzas, quién lleva la pelota, bebidas o hielo."),
        ("Votación de la Figura y Tronco", "Al terminar el partido, todos votan al Jugador del Partido (Premio Figura) y con humor al Tronco de la fecha. +10 Pts de honor.")
    ]

    for i, (k, v) in enumerate(t4_data):
        c0 = tbl4.cell(i, 0)
        c1 = tbl4.cell(i, 1)
        set_cell_background(c0, "FAF5FF")
        set_cell_background(c1, "FFFFFF")
        set_cell_margins(c0, 100, 100, 140, 140)
        set_cell_margins(c1, 100, 100, 140, 140)
        p0 = c0.paragraphs[0]
        r0 = p0.add_run(k)
        r0.font.name = "Arial"
        r0.font.bold = True
        r0.font.size = Pt(9.5)
        r0.font.color.rgb = RGBColor(107, 33, 168)
        p1 = c1.paragraphs[0]
        r1 = p1.add_run(v)
        r1.font.name = "Arial"
        r1.font.size = Pt(9)
        r1.font.color.rgb = RGBColor(51, 65, 85)

    doc.add_paragraph()

    # SECTION 5: CEREBRO FUGA, TRAZO LOCO Y TARAREO ARDILLA
    p_s5 = doc.add_paragraph()
    r_s5 = p_s5.add_run("5. 🧠 TRIVIA DIARIA, TRAZO LOCO Y TARAREO ARDILLA")
    r_s5.font.name = "Arial"
    r_s5.font.bold = True
    r_s5.font.size = Pt(13)
    r_s5.font.color.rgb = RGBColor(217, 119, 6)

    tbl5 = doc.add_table(rows=3, cols=2)
    tbl5.alignment = WD_TABLE_ALIGNMENT.CENTER
    tbl5.columns[0].width = Inches(2.0)
    tbl5.columns[1].width = Inches(4.8)

    t5_data = [
        ("🧠 Cerebro Fuga\n(Trivia Diaria)", "3 preguntas diarias de cultura general, curiosidades argentinas e historia familiar generadas por IA. Tienen tiempo límite. Por cada respuesta correcta sumás +5 puntos."),
        ("🎨 Trazo Loco\n(Pictionary / Pizarra)", "Un integrante dibuja una palabra en el lienzo táctil con el dedo o mouse. Los demás miembros adivinan en el chat en tiempo real. Primer acierto: +15 Pts."),
        ("🐿️ Tarareo Ardilla\n(Canción Acelerada)", "Rolfi desafía con un fragmento musical acelerado o tarareado con voz de ardilla. ¿Quién reconoce el clásico del rock, pop o folclore antes?")
    ]

    for i, (k, v) in enumerate(t5_data):
        c0 = tbl5.cell(i, 0)
        c1 = tbl5.cell(i, 1)
        set_cell_background(c0, "FFFBEB")
        set_cell_background(c1, "FFFFFF")
        set_cell_margins(c0, 100, 100, 140, 140)
        set_cell_margins(c1, 100, 100, 140, 140)
        p0 = c0.paragraphs[0]
        r0 = p0.add_run(k)
        r0.font.name = "Arial"
        r0.font.bold = True
        r0.font.size = Pt(9.5)
        r0.font.color.rgb = RGBColor(146, 64, 14)
        p1 = c1.paragraphs[0]
        r1 = p1.add_run(v)
        r1.font.name = "Arial"
        r1.font.size = Pt(9)
        r1.font.color.rgb = RGBColor(51, 65, 85)

    doc.add_paragraph()

    # SECTION 6: CONSEJOS Y CONTACTO
    p_s6 = doc.add_paragraph()
    r_s6 = p_s6.add_run("6. 🏆 EL RANKING GENERAL DE LA TRIBU Y TIPS DE ORO")
    r_s6.font.name = "Arial"
    r_s6.font.bold = True
    r_s6.font.size = Pt(13)
    r_s6.font.color.rgb = RGBColor(15, 23, 42)

    doc.add_paragraph(
        "Todos los puntos obtenidos en los juegos satélite (Flash, Impostor, Prode, Trivia, Dibujo) se acumulan en el Ranking Mensual de la Tribu. "
        "A fin de mes, Rolfi corona al Rey / Reina de la Tribu con diploma especial y celebración digital."
    )

    box_tips = doc.add_table(rows=1, cols=1)
    box_tips.alignment = WD_TABLE_ALIGNMENT.CENTER
    b_cell = box_tips.cell(0, 0)
    set_cell_background(b_cell, "F1F5F9")
    set_cell_margins(b_cell, 140, 140, 200, 200)
    bp = b_cell.paragraphs[0]
    b_run1 = bp.add_run("💡 TIPS DE PARTICIPACIÓN PARA EL ÉXITO DE TU TRIBU:\n")
    b_run1.font.name = "Arial"
    b_run1.font.bold = True
    b_run1.font.size = Pt(10)
    b_run1.font.color.rgb = RGBColor(15, 23, 42)
    b_run2 = bp.add_run(
        "1. No busques perfección: Una foto comiendo fideos o paseando al perro vale 100 veces más que una postal posada.\n"
        "2. En El Impostor, las mejores pistas son las anécdotas internas que solo la familia entiende.\n"
        "3. El Prode no perdona: Cargar los pronósticos antes de que empiece la fecha el viernes a la tarde.\n"
        "4. En Superadmin podés activar o pausar juegos según el gusto de tu comunidad."
    )
    b_run2.font.name = "Arial"
    b_run2.font.size = Pt(9)
    b_run2.font.color.rgb = RGBColor(51, 65, 85)

    output_path = os.path.join(base_dir, "public", "MANUAL_DE_JUEGOS_TRIBOO.docx")
    doc.save(output_path)
    print(f"DOCX created successfully at: {output_path}")

if __name__ == "__main__":
    create_manual_docx()
