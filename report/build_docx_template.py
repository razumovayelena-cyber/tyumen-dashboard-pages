# -*- coding: utf-8 -*-
"""Брендированный шаблон отчета Word по гайду «Тюмень 440. На правильном пути»."""

from __future__ import annotations

import re
import shutil
import zipfile
from pathlib import Path

from docx import Document
from docx.enum.table import WD_CELL_VERTICAL_ALIGNMENT, WD_TABLE_ALIGNMENT
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Mm, Pt, RGBColor

INK = "1F2D63"
MOSS = "144992"
SAND = "DDA13B"
RIVER = "5BA0D8"
FLOOD = "F15C28"
PAPER = "F1ECE3"
LEAF = "F2C682"
WHITE = "FAF8F4"
MUTE = "5A6480"
LINE = "C5CBD8"
FONT = "Montserrat"

HERE = Path(__file__).resolve().parent
DASHBOARD = HERE.parent
OUT = HERE / "Tyumen_440_shablon.docx"


def rgb(hex_color: str) -> RGBColor:
    return RGBColor.from_string(hex_color)


def set_run_font(run, name=FONT, size=11, bold=False, color=INK):
    run.font.name = name
    run.font.size = Pt(size)
    run.font.bold = bold
    run.font.color.rgb = rgb(color)
    rpr = run._element.get_or_add_rPr()
    rfonts = rpr.get_or_add_rFonts()
    for key in ("w:ascii", "w:hAnsi", "w:cs", "w:eastAsia"):
        rfonts.set(qn(key), name)


def shade(cell, fill: str) -> None:
    tc_pr = cell._tc.get_or_add_tcPr()
    for old in tc_pr.findall(qn("w:shd")):
        tc_pr.remove(old)
    shd = OxmlElement("w:shd")
    shd.set(qn("w:val"), "clear")
    shd.set(qn("w:color"), "auto")
    shd.set(qn("w:fill"), fill)
    tc_pr.append(shd)


def set_cell_borders(cell, color=LINE, size="4") -> None:
    tc_pr = cell._tc.get_or_add_tcPr()
    for old in tc_pr.findall(qn("w:tcBorders")):
        tc_pr.remove(old)
    borders = OxmlElement("w:tcBorders")
    for edge in ("top", "left", "bottom", "right"):
        el = OxmlElement(f"w:{edge}")
        el.set(qn("w:val"), "single")
        el.set(qn("w:sz"), size)
        el.set(qn("w:space"), "0")
        el.set(qn("w:color"), color)
        borders.append(el)
    tc_pr.append(borders)


def set_cell_margin(cell, **sides) -> None:
    tc_pr = cell._tc.get_or_add_tcPr()
    tc_mar = OxmlElement("w:tcMar")
    for side, twips in sides.items():
        el = OxmlElement(f"w:{side}")
        el.set(qn("w:w"), str(twips))
        el.set(qn("w:type"), "dxa")
        tc_mar.append(el)
    tc_pr.append(tc_mar)


def set_table_width(table, mm_width: float) -> None:
    tbl = table._tbl
    tbl_pr = tbl.tblPr
    tbl_w = tbl_pr.find(qn("w:tblW"))
    if tbl_w is None:
        tbl_w = OxmlElement("w:tblW")
        tbl_pr.append(tbl_w)
    tbl_w.set(qn("w:type"), "dxa")
    tbl_w.set(qn("w:w"), str(int(mm_width * 56.7)))


def prevent_row_split(row) -> None:
    tr = row._tr
    tr_pr = tr.get_or_add_trPr()
    cant = OxmlElement("w:cantSplit")
    tr_pr.append(cant)


def add_para(
    container,
    text,
    *,
    size=11,
    bold=False,
    color=INK,
    after=8,
    before=0,
    align=None,
    caps=False,
):
    p = container.add_paragraph()
    if align is not None:
        p.alignment = align
    p.paragraph_format.space_after = Pt(after)
    p.paragraph_format.space_before = Pt(before)
    p.paragraph_format.line_spacing = 1.25
    run = p.add_run(text)
    set_run_font(run, size=size, bold=bold, color=color)
    if caps:
        run.font.all_caps = True
    return p


def add_runs(container, parts, *, size=11, color=INK, after=8, before=0):
    p = container.add_paragraph()
    p.paragraph_format.space_after = Pt(after)
    p.paragraph_format.space_before = Pt(before)
    p.paragraph_format.line_spacing = 1.25
    for text, bold in parts:
        run = p.add_run(text)
        set_run_font(run, size=size, bold=bold, color=color)
    return p


def add_ph(container, name: str):
    p = container.add_paragraph()
    p.paragraph_format.space_after = Pt(8)
    p.paragraph_format.space_before = Pt(0)
    run = p.add_run("{{" + name + "}}")
    set_run_font(run, size=10, color=MUTE)
    return p


def gold_rule(container, width_mm=28) -> None:
    p = container.add_paragraph()
    p.paragraph_format.space_before = Pt(4)
    p.paragraph_format.space_after = Pt(10)
    p.paragraph_format.right_indent = Mm(174 - width_mm)
    p_pr = p._p.get_or_add_pPr()
    p_bdr = OxmlElement("w:pBdr")
    bottom = OxmlElement("w:bottom")
    bottom.set(qn("w:val"), "single")
    bottom.set(qn("w:sz"), "24")
    bottom.set(qn("w:space"), "1")
    bottom.set(qn("w:color"), SAND)
    p_bdr.append(bottom)
    p_pr.append(p_bdr)


def page_break(doc: Document) -> None:
    doc.add_page_break()


def style_document(doc: Document) -> None:
    section = doc.sections[0]
    section.page_width = Mm(210)
    section.page_height = Mm(297)
    section.left_margin = Mm(18)
    section.right_margin = Mm(18)
    section.top_margin = Mm(16)
    section.bottom_margin = Mm(16)
    section.header_distance = Mm(8)
    section.footer_distance = Mm(8)
    section.different_first_page_header_footer = True

    background = OxmlElement("w:background")
    background.set(qn("w:color"), PAPER)
    doc.element.insert(0, background)
    background_el = doc.settings.element
    display = OxmlElement("w:displayBackgroundShape")
    background_el.append(display)

    normal = doc.styles["Normal"]
    normal.font.name = FONT
    normal.font.size = Pt(11)
    normal.font.color.rgb = rgb(INK)
    normal.element.rPr.rFonts.set(qn("w:eastAsia"), FONT)

    for style_name, size, bold, color, before, after in (
        ("Title", 26, True, WHITE, 0, 8),
        ("Heading 1", 18, True, INK, 6, 6),
        ("Heading 2", 14, True, INK, 10, 4),
        ("Heading 3", 12, True, MOSS, 8, 4),
    ):
        st = doc.styles[style_name]
        st.font.name = FONT
        st.font.size = Pt(size)
        st.font.bold = bold
        st.font.color.rgb = rgb(color)
        st.element.rPr.rFonts.set(qn("w:eastAsia"), FONT)
        st.paragraph_format.space_before = Pt(before)
        st.paragraph_format.space_after = Pt(after)

    header = section.first_page_header.paragraphs[0]
    header.text = ""
    footer = section.first_page_footer.paragraphs[0]
    footer.alignment = WD_ALIGN_PARAGRAPH.LEFT
    run = footer.add_run("Сценарная оценка · {{report_date}}")
    set_run_font(run, size=8, color=MUTE)

    head = section.header.paragraphs[0]
    head.clear()
    run = head.add_run("Тюмень · Апробация Стандарта")
    set_run_font(run, size=8, bold=True, color=MUTE)
    run = head.add_run("\tОтчет по брендбуку «Тюмень 440»")
    set_run_font(run, size=8, color=MUTE)
    p_pr = head._p.get_or_add_pPr()
    tabs = OxmlElement("w:tabs")
    tab = OxmlElement("w:tab")
    tab.set(qn("w:val"), "right")
    tab.set(qn("w:pos"), "9862")
    tabs.append(tab)
    p_pr.append(tabs)
    p_bdr = OxmlElement("w:pBdr")
    bottom = OxmlElement("w:bottom")
    bottom.set(qn("w:val"), "single")
    bottom.set(qn("w:sz"), "6")
    bottom.set(qn("w:space"), "8")
    bottom.set(qn("w:color"), LINE)
    p_bdr.append(bottom)
    p_pr.append(p_bdr)

    foot = section.footer.paragraphs[0]
    foot.clear()
    run = foot.add_run("Сценарная оценка · {{report_date}}\t")
    set_run_font(run, size=8, color=MUTE)
    run = foot.add_run("стр. ")
    set_run_font(run, size=8, color=MUTE)
    fld1 = OxmlElement("w:fldChar")
    fld1.set(qn("w:fldCharType"), "begin")
    instr = OxmlElement("w:instrText")
    instr.set(qn("xml:space"), "preserve")
    instr.text = " PAGE "
    fld2 = OxmlElement("w:fldChar")
    fld2.set(qn("w:fldCharType"), "end")
    run2 = foot.add_run()
    run2._r.append(fld1)
    run2._r.append(instr)
    run2._r.append(fld2)
    set_run_font(run2, size=8, color=MUTE)


def cover(doc: Document) -> None:
    table = doc.add_table(rows=1, cols=1)
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    set_table_width(table, 174)
    cell = table.cell(0, 0)
    shade(cell, INK)
    set_cell_borders(cell, INK, "0")
    set_cell_margin(cell, top="200", bottom="200", left="220", right="220")
    cell.vertical_alignment = WD_CELL_VERTICAL_ALIGNMENT.CENTER
    add_ph(cell, "cover_logos")
    add_para(
        cell,
        "Апробация Стандарта здоровой среды в населенных пунктах",
        size=9,
        bold=True,
        color=LEAF,
        after=8,
        caps=True,
    )
    add_para(
        cell,
        "Результаты и проекты для внедрения в г. Тюмень",
        size=24,
        bold=True,
        color=WHITE,
        after=4,
    )
    gold_rule(cell, 32)
    add_para(
        cell,
        "Пилотные территории: мкрн Оброчное и мкрн ДОК.",
        size=11,
        color="D8D3C8",
        after=4,
    )
    add_ph(cell, "cover_formed")
    add_para(
        cell,
        "Горизонт оценки: 20 лет. Цены: 01.01.2026. Источник: «Расчет_эффектов_Тюмень_20лет_CAPEX_OPEX.xlsx».",
        size=10,
        color="B8B4AB",
        after=0,
    )

    add_para(doc, "", after=6)
    add_ph(doc, "cover_stats")
    add_para(doc, "Содержание", size=9, bold=True, color=SAND, after=4, caps=True)
    add_para(doc, "Состав отчета", size=18, bold=True, after=6)
    add_para(
        doc,
        "",
        size=10,
        color=MUTE,
        after=8,
    )
    for i, item in enumerate(
        (
            "Обзор пилотных территорий и обзорная карта",
            "Результаты апробации",
            "Контекст апробации Стандарта",
            "ПРК+Стандарт: решения для внедрения на пилотных территориях",
            "Эффекты от пилотов",
            "Структура вложений",
            "Потенциальные источники финансирования",
            "Сценарии эффектов",
            "Методология оценки",
        ),
        1,
    ):
        add_para(doc, f"{i}.  {item}", size=12, after=3)


def overview(doc: Document) -> None:
    page_break(doc)
    add_para(doc, "Обзор", size=9, bold=True, color=SAND, after=2, caps=True)
    add_para(doc, "Пилотные территории на карте города", size=18, bold=True, after=6)
    add_para(
        doc,
        "мкрн Оброчное — обеспечение пешего доступа к зеленой территории. мкрн ДОК — защита застройки от подтопления.",
        after=8,
    )
    add_ph(doc, "map_all")
    add_para(
        doc,
        "Контуры озеленения · берегоукрепление 5,05 км · пешеходный мост 303 м. Подложка: Esri, Maxar, Earthstar Geographics.",
        size=9,
        color=MUTE,
        after=6,
    )


def analysis(doc: Document) -> None:
    page_break(doc)
    add_para(doc, "Результаты апробации", size=9, bold=True, color=SAND, after=2, caps=True)
    add_para(doc, "Ключевые выводы по городу", size=18, bold=True, after=6)
    add_para(
        doc,
        "Результаты апробации основаны на анализе 231 показателя Стандарта. Период: 2016–2025 гг.",
        size=10,
        color=MUTE,
        after=8,
    )
    add_ph(doc, "analysis_cards")
    add_para(doc, "Сильные стороны города", size=12, bold=True, color=MOSS, before=8, after=4)
    add_ph(doc, "analysis_strong")
    add_para(doc, "Явные риски и проблемы", size=12, bold=True, color=SAND, before=8, after=4)
    add_ph(doc, "analysis_risks")
    add_para(doc, "Неустойчивая картина", size=12, bold=True, color=RIVER, before=8, after=4)
    add_ph(doc, "analysis_mixed")


def flood(doc: Document) -> None:
    page_break(doc)
    add_para(doc, "Контекст апробации Стандарта", size=9, bold=True, color=SAND, after=2, caps=True)
    add_para(doc, "Летнее наводнение 2026", size=18, bold=True, after=6)
    add_para(
        doc,
        "Летний подъём Туры — второй за историю наблюдений с 1891 года. Опасная отметка 850 см держалась около 17 суток.",
        size=10,
        color=MUTE,
        after=8,
    )
    add_ph(doc, "flood_timeline")
    add_para(doc, "Уровень Туры, лето 2026", size=14, bold=True, before=8, after=4)
    add_para(
        doc,
        "Оперативные отметки по открытым сводкам. Красная линия на графике — порог опасного явления (ОЯ).",
        size=10,
        color=MUTE,
        after=6,
    )
    add_ph(doc, "flood_chart")
    add_para(doc, "Ущерб от наводнения для г. Тюмени", size=14, bold=True, before=8, after=2)
    add_para(
        doc,
        "Сводка по открытым источникам на конец августа 2026.",
        size=10,
        color=MUTE,
        after=6,
    )
    add_ph(doc, "flood_damage")


def solutions(doc: Document) -> None:
    page_break(doc)
    add_para(doc, "Решения", size=9, bold=True, color=SAND, after=2, caps=True)
    add_para(doc, "Что пострадало", size=18, bold=True, after=4)
    add_para(
        doc,
        "Основной ущерб — имущество, участки, коммуникации и санитарное состояние. Погибших в открытых сводках по ЧС в Тюмени не сообщалось.",
        size=10,
        color=MUTE,
        after=6,
    )
    for line in (
        "Уязвимы Старая Зарека, Береговая, мкрн ДОК и Лесобаза, нижние ярусы набережной, СНТ «Родничок», «Дубрава», «Осень», «Березка».",
        "Метелевский водозабор (~60% сети) не справился с органикой; за 30 дней разобрано 3 378,5 м³ привозной воды.",
        "Замор рыбы ~400 т: кислород в Туре снизился до 0,8 мг/л при норме ~6 мг/л.",
        "Эвакуация на пике: 53 человека (9 детей) 1 августа, позже по Богандинскому / Пышме — 66 чел.",
    ):
        add_para(doc, "•  " + line, size=11, after=4)
    add_para(doc, "ПРК+Стандарт", size=9, bold=True, color=SAND, before=10, after=2, caps=True)
    add_para(doc, "ПРК+Стандарт: решения для внедрения на пилотных территориях", size=16, bold=True, after=4)
    add_runs(
        doc,
        [
            (
                "Результаты апробации Стандарта могут быть интегрированы в ПКР города в рамках пилотных территорий - ",
                False,
            ),
            ('мкрн "ДОК" и мкрн "Оброчное"', True),
            (".", False),
        ],
        size=10,
        color=MUTE,
        after=4,
    )
    add_para(
        doc,
        "Обе территории имеют схожий класс проблем - развитие жилой застройки, уязвимость к подтоплению и отсутствие пешего доступа к благоустроенным зеленым территориям.",
        size=10,
        color=MUTE,
        after=8,
    )
    add_ph(doc, "solutions_blocks")


def territories(doc: Document) -> None:
    page_break(doc)
    add_para(doc, "Эффекты от пилотов · часть 1", size=9, bold=True, color=SAND, after=2, caps=True)
    add_para(doc, "мкрн Оброчное", size=18, bold=True, after=4)
    add_para(
        doc,
        "Проблема: уязвимость к подтоплениям и недостаток обустроенных зеленых территорий для пеших прогулок (15-минутная доступность). Основная задача: обеспечение пешего доступа к зеленым территориям.",
        size=10,
        color=MUTE,
        after=8,
    )
    add_ph(doc, "map_p1")
    add_para(
        doc,
        "Контур озеленения · берегоукрепление 1 510 м · пешеходный мост 303 м. Подложка: Esri, Maxar, Earthstar Geographics.",
        size=9,
        color=MUTE,
        after=6,
    )
    add_ph(doc, "stats_p1")

    page_break(doc)
    add_para(doc, "Эффекты от пилотов · часть 2", size=9, bold=True, color=SAND, after=2, caps=True)
    add_para(doc, "мкрн ДОК", size=18, bold=True, after=4)
    add_para(doc, "Основная задача: защита застройки от подтопления.", size=10, color=MUTE, after=8)
    add_ph(doc, "map_p2")
    add_para(
        doc,
        "Контур озеленения · берегоукрепление 3 538 м. Подложка: Esri, Maxar, Earthstar Geographics.",
        size=9,
        color=MUTE,
        after=6,
    )
    add_ph(doc, "stats_p2")


def investments(doc: Document) -> None:
    page_break(doc)
    add_para(doc, "Инвестиции в пилоты", size=9, bold=True, color=SAND, after=2, caps=True)
    add_para(doc, "Структура вложений · мкрн ДОК", size=18, bold=True, after=4)
    add_para(
        doc,
        "Компонентный CAPEX — нижняя оценка, без НДС. Берегоукрепление по Туре 3 538 м · без моста.",
        size=10,
        color=MUTE,
        after=8,
    )
    add_ph(doc, "capex_dok")

    page_break(doc)
    add_para(doc, "Инвестиции в пилоты", size=9, bold=True, color=SAND, after=2, caps=True)
    add_para(doc, "Структура вложений · мкрн Оброчное", size=18, bold=True, after=4)
    add_para(
        doc,
        "Берегоукрепление 1 510 м · пешеходный мост 303 м. Без НДС.",
        size=10,
        color=MUTE,
        after=8,
    )
    add_ph(doc, "capex_ob")
    add_ph(doc, "capex_compare")
    add_ph(doc, "ncs_note")


def funding(doc: Document) -> None:
    page_break(doc)
    add_para(doc, "Финансирование", size=9, bold=True, color=SAND, after=2, caps=True)
    add_para(doc, "Потенциальные источники финансирования", size=18, bold=True, after=4)
    add_para(
        doc,
        "Потенциальные источники из федерального бюджета или внебюджетных средств.",
        size=10,
        color=MUTE,
        after=8,
    )
    add_ph(doc, "fund_stats")
    add_ph(doc, "fund_table")
    add_ph(doc, "fund_note")
    add_ph(doc, "fund_cards")


def scenarios(doc: Document) -> None:
    page_break(doc)
    add_para(doc, "Сценарии", size=9, bold=True, color=SAND, after=2, caps=True)
    add_para(doc, "Сравнение сценариев по контурам", size=18, bold=True, after=4)
    add_para(
        doc,
        "Базовый сценарий — абсолютное значение. Низкий и высокий — отклонение от базового: плюс означает больший эффект, минус — меньший.",
        size=10,
        color=MUTE,
        after=8,
    )
    add_ph(doc, "scenario_table")


def method(doc: Document) -> None:
    page_break(doc)
    add_para(doc, "Методология", size=9, bold=True, color=SAND, after=2, caps=True)
    add_para(doc, "Методология оценки эффектов", size=18, bold=True, after=6)
    add_para(
        doc,
        "Оценка выполнена по 2 пилотным территориям на горизонте 20 лет эксплуатации. Экономический, экологический и медико-социальный контуры рассматриваются раздельно. Суммирование разнородных показателей в единый интегральный эффект не применяется.",
        size=10,
        color=MUTE,
        after=8,
    )
    add_ph(doc, "method_cards")
    add_para(doc, "Ограничения", size=14, bold=True, before=8, after=4)
    add_para(
        doc,
        "Значения не заменяют проектно-сметную документацию, гидравлическое моделирование и эпидемиологическое исследование. Для инвестиционного расчета нужны состав работ, график строительства, параметры эксплуатации и подтверждение зоны подтопления.",
        size=10,
        color=MUTE,
        after=8,
    )
    add_ph(doc, "method_foot")


def set_theme_font(path: Path, font: str = FONT) -> None:
    tmp = path.with_suffix(".tmp.docx")
    with zipfile.ZipFile(path, "r") as zin, zipfile.ZipFile(tmp, "w", compression=zipfile.ZIP_DEFLATED) as zout:
        for item in zin.infolist():
            data = zin.read(item.filename)
            if item.filename == "word/theme/theme1.xml":
                text = data.decode("utf-8")
                text = re.sub(r'typeface="[^"]*"', f'typeface="{font}"', text)
                data = text.encode("utf-8")
            zout.writestr(item, data)
    shutil.move(tmp, path)


def main() -> None:
    doc = Document()
    style_document(doc)
    cover(doc)
    overview(doc)
    analysis(doc)
    flood(doc)
    solutions(doc)
    territories(doc)
    investments(doc)
    funding(doc)
    scenarios(doc)
    method(doc)
    doc.save(OUT)
    set_theme_font(OUT)
    print(OUT, OUT.stat().st_size)


if __name__ == "__main__":
    main()
